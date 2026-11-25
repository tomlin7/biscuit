import { expect, test, setDefaultTimeout } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Store } from '../src/store'
import { Sessions } from '../src/sessions'
import { Inbox } from '../src/inbox'
import { Checkpoints, WorkspaceTrees } from '../src/checkpoints'
import { silentLogger } from '../src/log'
import { tempHome } from './harness'
import { apply, hydrate, initialSnapshot } from '../../src/engine/reducer'

setDefaultTimeout(30000)

function setup() {
  const home = tempHome(), cwd = join(home, 'workspace')
  mkdirSync(cwd)
  const store = Store.open(join(home, 'engine.db')); store.migrate()
  const checkpoints = new Checkpoints(store, home)
  const inbox = new Inbox(store, silentLogger())
  inbox.beforeDeliver = (id, item) => checkpoints.prepare(id, item)
  const sessions = new Sessions(store, silentLogger(), { cwd, inbox })
  const session = sessions.create({})
  const close = () => { store.close(); try { rmSync(home, { recursive: true, force: true }) } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EBUSY') throw error } }
  return { home, cwd, store, checkpoints, inbox, sessions, session, close }
}

test('each delivered prompt commits a pre-prompt tree and rewind preserves the old history and current work', () => {
  const f = setup()
  try {
    writeFileSync(join(f.cwd, 'file.txt'), 'original')
    writeFileSync(join(f.cwd, '.gitignore'), 'ignored.txt\n')
    writeFileSync(join(f.cwd, 'ignored.txt'), 'private')
    f.sessions.prompt(f.session.id, { text: 'first task', key: 'one' })
    const first = f.store.checkpoints(f.session.id)[0]!
    expect(first.messageIDs).toEqual([])
    expect(first.promptID).toBe(f.store.inbox(f.session.id)[0]!.id)
    writeFileSync(join(f.cwd, 'file.txt'), 'first change')
    f.sessions.prompt(f.session.id, { text: 'second task', key: 'two' })
    const second = f.store.checkpoints(f.session.id)[1]!
    expect(second.messageIDs).toHaveLength(1)
    writeFileSync(join(f.cwd, 'file.txt'), 'latest change')
    writeFileSync(join(f.cwd, 'created.txt'), 'new work')
    const rewind = f.checkpoints.restore(f.session.id, second.id, 'rewind-once')
    expect(rewind.state).toBe('completed')
    expect(readFileSync(join(f.cwd, 'file.txt'), 'utf8')).toBe('first change')
    expect(existsSync(join(f.cwd, 'created.txt'))).toBe(false)
    expect(readFileSync(join(f.cwd, 'ignored.txt'), 'utf8')).toBe('private')
    expect(f.store.messages(f.session.id).map((message) => message.text)).toContain('second task')
    expect(f.store.activeMessages(f.session.id).map((message) => message.text)).not.toContain('second task')
    expect(f.store.activeMessages(f.session.id).at(-1)?.rewindID).toBe(rewind.id)
    expect(f.checkpoints.restore(f.session.id, second.id, 'rewind-once')).toEqual(rewind)
    const safety = f.store.checkpoint(rewind.safetyCheckpointID)!
    f.checkpoints.restore(f.session.id, safety.id, 'undo')
    expect(readFileSync(join(f.cwd, 'file.txt'), 'utf8')).toBe('latest change')
    expect(readFileSync(join(f.cwd, 'created.txt'), 'utf8')).toBe('new work')
    expect(f.store.activeMessages(f.session.id).some((message) => message.text === 'second task')).toBe(true)
    const live = f.store.eventsSince(0).reduce(apply, { ...initialSnapshot(), sessionID: f.session.id })
    const snapshot = hydrate(initialSnapshot(), f.store.snapshot(f.session.id)!)
    expect(live.checkpoints).toEqual(snapshot.checkpoints)
    expect(live.rewinds).toEqual(snapshot.rewinds)
    expect(live.activeMessageIDs).toEqual(snapshot.activeMessageIDs)
    expect(live.messages).toEqual(snapshot.messages)
  } finally { f.close() }
})

test('queued prompts snapshot at delivery, and repeated admission creates no extra checkpoint', () => {
  const f = setup()
  try {
    f.inbox.busy = () => true
    f.sessions.prompt(f.session.id, { text: 'wait', key: 'same' })
    expect(f.store.checkpoints(f.session.id)).toHaveLength(0)
    writeFileSync(join(f.cwd, 'late.txt'), 'boundary state')
    f.inbox.busy = () => false
    f.inbox.deliver(f.session.id)
    f.sessions.prompt(f.session.id, { text: 'changed retry', key: 'same' })
    expect(f.store.checkpoints(f.session.id)).toHaveLength(1)
    const checkpoint = f.store.checkpoints(f.session.id)[0]!
    const trees = new WorkspaceTrees(f.home, f.cwd)
    expect(trees.entries(checkpoint.tree).has('late.txt')).toBe(true)
  } finally { f.close() }
})

test('a crash after rewind intent recovers files and conversation once; later edits stop recovery', () => {
  const f = setup()
  try {
    writeFileSync(join(f.cwd, 'file.txt'), 'before')
    f.sessions.prompt(f.session.id, { text: 'change' })
    const target = f.store.checkpoints(f.session.id)[0]!
    writeFileSync(join(f.cwd, 'file.txt'), 'after')
    // Stop just after the durable intent: this is the process boundary, before any file effect.
    let intent: any
    const unsubscribe = f.store.subscribe((event) => {
      if (event.type === 'rewind.started') { intent = event.data.rewind; writeFileSync(join(f.cwd, 'file.txt'), 'later external edit') }
    })
    expect(() => f.checkpoints.restore(f.session.id, target.id, 'recover')).toThrow('incomplete')
    unsubscribe()
    expect(f.checkpoints.blocked(f.session.id)).toBe(true)
    expect(readFileSync(join(f.cwd, 'file.txt'), 'utf8')).toBe('later external edit')
    expect(f.store.activeMessages(f.session.id)[0]!.text).toBe('change')
    writeFileSync(join(f.cwd, 'file.txt'), 'after')
    const recovered = new Checkpoints(f.store, f.home)
    recovered.recover(); recovered.recover()
    expect(readFileSync(join(f.cwd, 'file.txt'), 'utf8')).toBe('before')
    expect(f.store.rewinds()[0]!.id).toBe(intent.id)
    expect(f.store.rewinds()[0]!.state).toBe('completed')
    expect(f.store.messages(f.session.id).filter((message) => message.rewindID)).toHaveLength(1)
    expect(f.store.activeMessages(f.session.id)).toHaveLength(1)
  } finally { f.close() }
})

test('ignored obstructions are preserved and snapshot failure keeps the prompt pending without a message', () => {
  const f = setup()
  try {
    writeFileSync(join(f.cwd, 'file.txt'), 'before')
    f.sessions.prompt(f.session.id, { text: 'change' })
    const checkpoint = f.store.checkpoints(f.session.id)[0]!
    writeFileSync(join(f.cwd, '.gitignore'), 'file.txt\n')
    writeFileSync(join(f.cwd, 'file.txt'), 'ignored edit')
    expect(() => f.checkpoints.restore(f.session.id, checkpoint.id, 'blocked')).toThrow('later edits')
    expect(readFileSync(join(f.cwd, 'file.txt'), 'utf8')).toBe('ignored edit')
    expect(f.store.rewinds()).toHaveLength(0)
    f.inbox.beforeDeliver = () => { throw new Error('Git snapshot unavailable') }
    f.sessions.prompt(f.session.id, { text: 'pending snapshot' })
    expect(f.store.inbox(f.session.id, 'pending')).toHaveLength(1)
    expect(f.store.messages(f.session.id)).toHaveLength(1)
    expect(f.store.checkpointError(f.session.id)).toContain('Git snapshot unavailable')
  } finally { f.close() }
})


test('file-directory transitions restore without removing ignored obstructions or following parent links', () => {
  const f = setup()
  try {
    writeFileSync(join(f.cwd, 'shape'), 'old file')
    f.sessions.prompt(f.session.id, { text: 'change shape' })
    const checkpoint = f.store.checkpoints(f.session.id)[0]!
    rmSync(join(f.cwd, 'shape'))
    mkdirSync(join(f.cwd, 'shape'))
    writeFileSync(join(f.cwd, 'shape', 'child'), 'new file')
    writeFileSync(join(f.cwd, '.gitignore'), 'shape/private\n')
    writeFileSync(join(f.cwd, 'shape', 'private'), 'keep ignored')
    expect(() => f.checkpoints.restore(f.session.id, checkpoint.id, 'obstructed')).toThrow('unsnapshotted')
    expect(readFileSync(join(f.cwd, 'shape', 'private'), 'utf8')).toBe('keep ignored')
    rmSync(join(f.cwd, 'shape', 'private'))
    const rewind = f.checkpoints.restore(f.session.id, checkpoint.id, 'transition')
    expect(readFileSync(join(f.cwd, 'shape'), 'utf8')).toBe('old file')
    f.checkpoints.restore(f.session.id, rewind.safetyCheckpointID, 'undo-transition')
    expect(readFileSync(join(f.cwd, 'shape', 'child'), 'utf8')).toBe('new file')
    const outside = join(f.home, 'outside')
    mkdirSync(outside); writeFileSync(join(outside, 'child'), 'outside data')
    rmSync(join(f.cwd, 'shape'), { recursive: true })
    symlinkSync(outside, join(f.cwd, 'shape'), process.platform === 'win32' ? 'junction' : 'dir')
    // A junction must never turn a restore into a write outside the workspace.
    try { f.checkpoints.restore(f.session.id, checkpoint.id, 'junction') } catch {}
    expect(readFileSync(join(outside, 'child'), 'utf8')).toBe('outside data')
  } finally { f.close() }
})

test('checkpoint blobs preserve CRLF and binary bytes despite project clean attributes', () => {
  const f = setup()
  try {
    writeFileSync(join(f.cwd, '.gitattributes'), '* text eol=lf ident\n')
    const original = Buffer.from('line one\r\nline two\r\n$Id$\r\n')
    writeFileSync(join(f.cwd, 'crlf.txt'), original)
    f.sessions.prompt(f.session.id, { text: 'normalize nothing' })
    const checkpoint = f.store.checkpoints(f.session.id)[0]!
    writeFileSync(join(f.cwd, 'crlf.txt'), 'different')
    f.checkpoints.restore(f.session.id, checkpoint.id, 'raw-bytes')
    expect(readFileSync(join(f.cwd, 'crlf.txt'))).toEqual(original)
  } finally { f.close() }
})


test('recovery accepts an already restored directory and cleans its journal-owned partial temporary file', () => {
  const f = setup()
  try {
    mkdirSync(join(f.cwd, 'shape'))
    writeFileSync(join(f.cwd, 'shape', 'child'), 'target child')
    f.sessions.prompt(f.session.id, { text: 'before directory change' })
    const target = f.store.checkpoints(f.session.id)[0]!
    rmSync(join(f.cwd, 'shape'), { recursive: true })
    writeFileSync(join(f.cwd, 'shape'), 'flattened file')
    const trees = new WorkspaceTrees(f.home, f.cwd)
    let temporary = ''
    const unsubscribe = f.store.subscribe((event) => {
      if (event.type !== 'rewind.started') return
      rmSync(join(f.cwd, 'shape'))
      mkdirSync(join(f.cwd, 'shape'))
      writeFileSync(join(f.cwd, 'shape', 'child'), 'target child')
      temporary = trees.temporary('shape/child', event.data.rewind.id)
      writeFileSync(temporary, 'partial write from the interrupted attempt')
    })
    const rewind = f.checkpoints.restore(f.session.id, target.id, 'directory-recovery')
    unsubscribe()
    expect(rewind.state).toBe('completed')
    expect(readFileSync(join(f.cwd, 'shape', 'child'), 'utf8')).toBe('target child')
    expect(existsSync(temporary)).toBe(false)
  } finally { f.close() }
})
