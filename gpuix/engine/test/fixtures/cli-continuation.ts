/** Controlled native-session CLI: real argv/stdin, files and process lifetime. */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
const args = process.argv.slice(2), adapter = process.env.HIROSHI_CONTINUATION_ADAPTER ?? 'cursor'
const root = process.env.HIROSHI_NATIVE_ROOT!
if (args.some((item) => ['--continue', '--force', '--restore-repo'].includes(item))) process.exit(90)
const get = (flag: string) => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined
const control = existsSync(join(root, 'control.json')) ? JSON.parse(readFileSync(join(root, 'control.json'), 'utf8')) : {}
let input = adapter === 'grok' ? readFileSync(get('--prompt-file')!, 'utf8') : await Bun.stdin.text()
if (adapter === 'agy') input = JSON.parse(input).message.content
const payload = JSON.parse(input.slice(input.indexOf('\n') + 1))
const sessionFile = get('--session')
const id = adapter === 'pi' ? JSON.parse(readFileSync(sessionFile!, 'utf8').split('\n')[0]!).id
  : get('--conversation') ?? get('--resume') ?? get('--session-id') ?? randomUUID()
const file = join(root, `${adapter}-${id}.json`)
const resumed = !!get('--conversation') || !!get('--resume') || adapter === 'pi' && readFileSync(sessionFile!, 'utf8').split('\n').filter(Boolean).length > 1
appendFileSync(join(root, 'calls.jsonl'), JSON.stringify({ id, adapter, resumed, args, input: payload, pid: process.pid, cwd: process.cwd() }) + '\n')
if (resumed && (control.missing || !existsSync(file))) { console.error('Session not found private-fixture-secret'); process.exit(1) }
const prior = resumed ? JSON.parse(readFileSync(file, 'utf8')) : { messages: [] }
prior.messages.push(...payload.conversation)
writeFileSync(file, JSON.stringify(prior))
if (sessionFile) appendFileSync(sessionFile, JSON.stringify({ type: 'message', role: 'user', text: payload.conversation.at(-1)?.text }) + '\n')
const reported = control.reuseID ?? (control.wrongID ? 'another-vendor-conversation' : id)
const emit = (event: object) => console.log(JSON.stringify(event))
if (control.beforeInit) { await Bun.sleep(20000); process.exit(0) }
if (adapter === 'cursor') emit({ type: 'system', subtype: 'init', session_id: reported, cwd: process.cwd() })
if (adapter === 'agy') emit({ event: 'init', conversation_id: reported, init: { cwd: process.cwd(), permission_mode: 'strict' } })
if (adapter === 'pi') emit({ type: 'session', version: 3, id: reported, cwd: process.cwd() })
if (control.hold) {
  const deadline = Date.now() + 20000
  while (!existsSync(join(root, 'release')) && Date.now() < deadline) await Bun.sleep(25)
  if (!existsSync(join(root, 'release'))) process.exit(0)
}
const text = control.wrongID || control.reuseID ? 'private-fixture-secret from another conversation' : `Native users ${prior.messages.filter((item: any) => item.role === 'user').length}; first ${prior.messages.find((item: any) => item.role === 'user')?.text}; latest ${payload.conversation.at(-1)?.text}`
if (adapter === 'cursor') {
  emit({ type: 'assistant', session_id: reported, timestamp_ms: 1, message: { content: [{ type: 'text', text }] } })
  emit({ type: 'result', session_id: reported, subtype: 'success', is_error: false, result: text })
} else if (adapter === 'agy') {
  emit({ event: 'step_update', step_update: { conversation_id: reported, step_type: 'agent_response', text_delta: text } })
  emit({ event: 'result', result: { conversation_id: reported, status: 'SUCCESS', response: text } })
} else if (adapter === 'pi') {
  emit({ type: 'message_update', assistantMessageEvent: { type: 'text_delta', delta: text } })
  emit({ type: 'message_end', message: { role: 'assistant', stopReason: 'stop', content: [{ type: 'text', text }] } })
  emit({ type: 'agent_settled', aborted: false })
} else {
  emit({ type: 'text', data: text })
  emit({ type: 'end', sessionId: reported, stopReason: 'EndTurn' })
}
