/** Installed skills are local documents. Discovery never runs their scripts. */
import { createHash, randomUUID } from 'node:crypto'
import { existsSync, fstatSync, lstatSync, mkdirSync, openSync, opendirSync, closeSync, readSync, readFileSync, realpathSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { homedir } from 'node:os'
import { conflict, invalid, notFound } from './errors'
import type { InstructionSource, SkillInfo, SkillInventory, SkillOrigin, SkillSelection } from './protocol'

const FILE_LIMIT = 256 * 1024, SCAN_LIMIT = 8 * 1024 * 1024, ENTRY_LIMIT = 2000, SKILL_LIMIT = 500
const digest = (value: string) => createHash('sha256').update(value).digest('hex')
const canonicalKey = (file: string) => process.platform === 'win32' ? file.toLowerCase() : file
export function skillRoots(cwd: string, userHome: string) {
  const locations = [
    ['shared', '.agents/skills'], ['claude', '.claude/skills'], ['codex', '.codex/skills'], ['cursor', '.cursor/skills'],
    ['pi', '.pi/agent/skills'], ['oh-my-pi', '.omp/agent/skills'], ['amp', '.amp/skills'], ['grok', '.grok/skills'], ['fx', '.fx/skills'],
  ] as const
  return [
    ...locations.map(([source, location]) => ({ source, path: path.join(userHome, location), scope: 'user' as const, managed: false })),
    { source: 'codex', path: path.join(userHome, '.codex/skills/.system'), scope: 'user' as const, managed: true },
    ...locations.map(([source, location]) => ({ source, path: path.join(cwd, location), scope: 'project' as const, managed: false })),
  ]
}
function document(file: string) {
  if (!statSync(file).isFile()) throw new Error('SKILL.md must be a regular file.')
  const handle = openSync(file, 'r')
  try {
    const info = fstatSync(handle, { bigint: true })
    if (!info.isFile() || info.size > BigInt(FILE_LIMIT)) throw new Error('SKILL.md must be a regular file of at most 256 KiB.')
    const buffer = Buffer.alloc(Number(info.size) + 1), bytes = readSync(handle, buffer, 0, buffer.length, 0)
    if (bytes > Number(info.size)) throw new Error('SKILL.md grew while it was being read. Refresh the inventory.')
    const raw = new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, bytes)).replace(/^\uFEFF/, '')
    const header = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(raw)
    if (!header) throw new Error('SKILL.md needs YAML name and description frontmatter.')
    const metadata = Bun.YAML.parse(header[1]!) as { name?: unknown; description?: unknown } | null
    if (!metadata || typeof metadata.name !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(metadata.name) || typeof metadata.description !== 'string' || metadata.description.length > 8192) throw new Error('Skill name or description is missing or invalid.')
    return { name: metadata.name, description: metadata.description.trim(), raw, markdown: raw.slice(header[0].length), bytes, updatedAt: Number(info.mtimeMs), hash: digest(raw), identity: `${info.dev}:${info.ino}:${info.birthtimeNs}` }
  } finally { closeSync(handle) }
}
interface Settings { version: 1; revision: number; disabled: string[] }
export class Skills {
  readonly file: string
  constructor(readonly home: string, readonly userHome = process.env.HIROSHI_SKILLS_USER_HOME || homedir()) { this.file = path.join(home, 'skills.json') }
  #settings(): Settings {
    try {
      const info = statSync(this.file)
      if (info.size > 256 * 1024) throw new Error('size')
      const value = JSON.parse(readFileSync(this.file, 'utf8')) as Settings
      if (value.version !== 1 || !Number.isSafeInteger(value.revision) || value.revision < 0 || !Array.isArray(value.disabled) || value.disabled.length > 2048 || value.disabled.some((id) => typeof id !== 'string' || !/^[a-f0-9]{64}$/.test(id))) throw new Error('shape')
      return value
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return { version: 1, revision: 0, disabled: [] }
      throw invalid('skills_settings', 'Saved skill settings are invalid. The original file has been preserved.')
    }
  }
  #save(settings: Settings) {
    const temporary = `${this.file}.${randomUUID()}.tmp`
    try { writeFileSync(temporary, JSON.stringify(settings), { flag: 'wx', mode: 0o600 }); renameSync(temporary, this.file) }
    finally { try { unlinkSync(temporary) } catch {} }
  }
  scan(cwd: string): SkillInventory {
    const settings = this.#settings(), skills: SkillInfo[] = [], warnings: string[] = [], seen = new Map<string, SkillInfo>()
    let entries = 0, totalBytes = 0, truncated = false
    const warn = (message: string) => { if (warnings.length < 24) warnings.push(message) }
    for (const root of skillRoots(cwd, this.userHome)) {
      if (truncated) break
      let names: string[]
      try {
        names = []
        const directory = opendirSync(root.path)
        try { for (;;) {
          const entry = directory.readSync(); if (!entry) break
          if (++entries > ENTRY_LIMIT) { truncated = true; break }
          if (!entry.name.startsWith('.')) names.push(entry.name)
        } } finally { directory.closeSync() }
        names.sort()
      }
      catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') warn(`Cannot read ${root.path}.`); continue }
      for (const name of names) {
        if (name.startsWith('.')) continue
        if (skills.length >= SKILL_LIMIT || totalBytes >= SCAN_LIMIT) { truncated = true; break }
        const entry = path.join(root.path, name), requested = path.join(entry, 'SKILL.md')
        try {
          if (!existsSync(requested)) continue
          const file = realpathSync(requested)
          if (file.startsWith('\\\\')) { warn(`Network-linked skill skipped: ${entry}`); continue }
          const read = document(file); totalBytes += read.bytes
          const origin: SkillOrigin = { source: root.source, scope: root.scope, path: entry, managed: root.managed, linked: lstatSync(entry).isSymbolicLink() }
          const previous = seen.get(read.identity)
          if (previous) { if (!previous.origins.some((item) => item.path === entry)) previous.origins.push(origin); continue }
          const id = digest(canonicalKey(file))
          const skill: SkillInfo = { id, name: read.name, description: read.description, path: file, bytes: read.bytes, updatedAt: read.updatedAt, hash: read.hash, enabled: !settings.disabled.includes(id), invoke: `/${read.name}`, origins: [origin] }
          seen.set(read.identity, skill); skills.push(skill)
        } catch (e) { warn(`${requested}: ${e instanceof Error ? e.message : 'Cannot read this skill.'}`) }
      }
    }
    skills.sort((a, b) => a.name.localeCompare(b.name) || a.path.localeCompare(b.path))
    for (const skill of skills) if (skills.some((other) => other.id !== skill.id && other.name === skill.name)) skill.invoke += `@${skill.id.slice(0, 8)}`
    return { revision: settings.revision, skills, warnings, truncated, scannedAt: Date.now() }
  }
  #selected(cwd: string, input: SkillSelection) {
    if (!input || typeof input.skillID !== 'string' || typeof input.hash !== 'string') throw invalid('skill_selection', 'Select a skill from the current inventory.')
    const inventory = this.scan(cwd), skill = inventory.skills.find((item) => item.id === input.skillID)
    if (!skill) throw notFound('installed skill')
    if (skill.hash !== input.hash) throw conflict('skill_changed', 'SKILL.md changed. Refresh before continuing.')
    return { inventory, skill }
  }
  read(cwd: string, input: SkillSelection) {
    const { skill } = this.#selected(cwd, input), read = document(skill.path)
    if (read.hash !== input.hash) throw conflict('skill_changed', 'SKILL.md changed. Refresh before continuing.')
    return { skill, raw: read.raw, markdown: read.markdown }
  }
  update(cwd: string, input: SkillSelection & { revision: number; enabled: boolean }) {
    const { inventory } = this.#selected(cwd, input)
    if (input.revision !== inventory.revision) throw conflict('skills_revision', 'Skills changed in another window. Refresh before saving.')
    if (typeof input.enabled !== 'boolean') throw invalid('skills_enabled', 'Choose an explicit enabled state.')
    const saved = this.#settings(), disabled = new Set(saved.disabled)
    if (input.enabled) disabled.delete(input.skillID); else disabled.add(input.skillID)
    if (disabled.size > 2048) throw invalid('skills_limit', 'At most 2048 disabled skill settings can be saved.')
    this.#save({ version: 1, revision: saved.revision + 1, disabled: [...disabled] })
    return this.scan(cwd)
  }
  remove(cwd: string, input: SkillSelection & { revision: number; origin: string }) {
    const { inventory, skill } = this.#selected(cwd, input)
    if (input.revision !== inventory.revision) throw conflict('skills_revision', 'Skills changed. Refresh before removing this installation.')
    const origin = skill.origins.find((origin) => origin.path === input.origin)
    if (!origin || origin.managed) throw invalid('skill_managed', 'This managed skill cannot be removed here.')
    const trash = path.join(path.dirname(origin.path), '.hiroshi-skill-trash')
    if (existsSync(trash) && (!lstatSync(trash).isDirectory() || lstatSync(trash).isSymbolicLink())) throw invalid('skill_trash', 'The recovery folder must be a normal directory, not a link.')
    mkdirSync(trash, { recursive: true })
    // Project recovery files must not become accidental Git additions.
    try { writeFileSync(path.join(trash, '.gitignore'), '*\n', { flag: 'wx' }) } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e }
    const target = path.join(trash, randomUUID(), path.basename(origin.path))
    mkdirSync(path.dirname(target), { recursive: true })
    // Rename the installation entry, including a symlink itself. Never walk
    // or recursively delete its target, which may belong to another agent.
    renameSync(origin.path, target)
    return { inventory: this.scan(cwd), removedTo: target }
  }
  instructions(cwd: string, texts: string[]): InstructionSource[] {
    const commands = texts.flatMap((text) => { const match = /^\s*\/([a-zA-Z0-9_.:-]+(?:@[a-f0-9]{8})?)(?=\s|$)/.exec(text); return match ? [`/${match[1]}`] : [] })
    if (!commands.length) return []
    const inventory = this.scan(cwd), selected = new Map<string, SkillInfo>()
    const latest = /^\s*(\/[^\s]+)(?=\s|$)/.exec(texts.at(-1) ?? '')?.[1]
    for (const command of commands) {
      const skill = inventory.skills.find((item) => item.invoke === command)
      if (!skill && command === latest && inventory.skills.some((item) => `/${item.name}` === command)) throw invalid('skill_ambiguous', `Several installed skills use ${command}. Copy the unique invocation from Skills settings.`)
      if (skill?.enabled) selected.set(skill.id, skill)
      else if (skill && command === latest) throw invalid('skill_disabled', `${command} is disabled in Skills settings.`)
    }
    let bytes = 0
    return [...selected.values()].map((skill) => {
      const read = document(skill.path); bytes += read.bytes
      if (bytes > FILE_LIMIT) throw invalid('skills_context', 'Invoked skill documents exceed the 256 KiB context limit. Start a task with fewer skills.')
      return { source: `skill/${skill.id}`, text: `The operator invoked ${skill.invoke}. Follow this skill for this task:\n\n${read.markdown}` }
    })
  }
}
