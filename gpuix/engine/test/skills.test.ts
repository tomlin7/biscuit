import { expect, test } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Skills } from '../src/skills'
import { startDaemon, tempHome, until } from './harness'

function fixture() {
  const home = tempHome(), user = join(home, 'user'), cwd = join(home, 'project')
  mkdirSync(user); mkdirSync(cwd)
  const install = (root: string, name: string, body = `# ${name}\n\nActual skill content.`, metadata = `name: ${name}\ndescription: >-\n  A real ${name} skill\n  with folded description.`) => {
    const folder = join(root, name); mkdirSync(folder, { recursive: true }); writeFileSync(join(folder, 'SKILL.md'), `---\n${metadata}\n---\n\n${body}\n`); return folder
  }
  return { home, user, cwd, install, skills: new Skills(home, user) }
}
test('bounded discovery reads real YAML and Markdown, groups sources/scopes, and tolerates malformed and oversized files', () => {
  const f = fixture()
  try {
    f.install(join(f.user, '.agents/skills'), 'find-skills')
    f.install(join(f.user, '.cursor/skills'), 'cursor-guide')
    f.install(join(f.cwd, '.agents/skills'), 'project-guide')
    f.install(join(f.user, '.codex/skills/.system'), 'managed')
    f.install(join(f.user, '.agents/skills'), 'invalid', 'body', 'name: [invalid\ndescription: broken')
    f.install(join(f.user, '.agents/skills'), 'huge', 'x'.repeat(300000))
    const result = f.skills.scan(f.cwd)
    expect(result.skills.map((s) => s.name)).toEqual(['cursor-guide', 'find-skills', 'managed', 'project-guide'])
    expect(result.warnings).toHaveLength(2)
    const shared = result.skills.find((s) => s.name === 'find-skills')!
    expect(shared.description).toBe('A real find-skills skill with folded description.')
    expect(shared.origins[0]).toMatchObject({ source: 'shared', scope: 'user' })
    expect(result.skills.find((s) => s.name === 'project-guide')!.origins[0]!.scope).toBe('project')
    expect(result.skills.find((s) => s.name === 'managed')!.origins[0]!.managed).toBe(true)
    const document = f.skills.read(f.cwd, { skillID: shared.id, hash: shared.hash })
    expect(document.markdown).toContain('# find-skills'); expect(document.markdown).not.toContain('description:')
    expect(document.raw).toContain('description:')
    expect(result.skills.every((s) => s.bytes > 0 && s.updatedAt > 0)).toBe(true)
  } finally { rmSync(f.home, { recursive: true, force: true }) }
})
test('linked installations deduplicate physical skills and reversible removal moves only the selected link', () => {
  const f = fixture()
  try {
    const target = f.install(join(f.home, 'external'), 'linked-skill'), root = join(f.user, '.agents/skills')
    mkdirSync(root, { recursive: true }); mkdirSync(join(f.user, '.cursor/skills'), { recursive: true })
    const linked = join(root, 'alias')
    symlinkSync(target, linked, process.platform === 'win32' ? 'junction' : 'dir')
    symlinkSync(target, join(f.user, '.cursor/skills', 'alias'), process.platform === 'win32' ? 'junction' : 'dir')
    const view = f.skills.scan(f.cwd), skill = view.skills[0]!
    expect(view.skills).toHaveLength(1); expect(skill.origins).toHaveLength(2)
    expect(skill.origins.every((o) => o.linked)).toBe(true)
    const result = f.skills.remove(f.cwd, { skillID: skill.id, hash: skill.hash, revision: view.revision, origin: linked })
    expect(existsSync(linked)).toBe(false); expect(existsSync(join(target, 'SKILL.md'))).toBe(true)
    expect(existsSync(result.removedTo)).toBe(true); expect(result.inventory.skills).toHaveLength(1)
  } finally { rmSync(f.home, { recursive: true, force: true }) }
})
test('duplicate names receive unique invocations; enabling, hashes, managed removal and saved settings fail honestly', () => {
  const f = fixture()
  try {
    const first = f.install(join(f.user, '.agents/skills'), 'same')
    f.install(join(f.cwd, '.agents/skills'), 'same')
    f.install(join(f.user, '.codex/skills/.system'), 'managed')
    const view = f.skills.scan(f.cwd), duplicates = view.skills.filter((s) => s.name === 'same'), chosen = duplicates[0]!
    expect(new Set(duplicates.map((s) => s.invoke)).size).toBe(2)
    expect(() => f.skills.instructions(f.cwd, ['/same do work'])).toThrow('Several installed skills')
    const disabled = f.skills.update(f.cwd, { skillID: chosen.id, hash: chosen.hash, revision: 0, enabled: false })
    expect(disabled.revision).toBe(1)
    expect(new Skills(f.home, f.user).scan(f.cwd).skills.find((s) => s.id === chosen.id)!.enabled).toBe(false)
    expect(() => f.skills.update(f.cwd, { skillID: chosen.id, hash: chosen.hash, revision: 0, enabled: true })).toThrow('another window')
    expect(() => f.skills.instructions(f.cwd, [`${chosen.invoke} do work`])).toThrow('disabled')
    expect(f.skills.instructions(f.cwd, [`${chosen.invoke} earlier`, 'continue'])).toEqual([])
    const managed = view.skills.find((s) => s.name === 'managed')!
    expect(() => f.skills.remove(f.cwd, { skillID: managed.id, hash: managed.hash, revision: 1, origin: managed.origins[0]!.path })).toThrow('managed')
    writeFileSync(join(first, 'SKILL.md'), '---\nname: same\ndescription: changed\n---\nNew content')
    const old = view.skills.find((s) => s.origins.some((origin) => origin.path === first))!
    expect(() => f.skills.read(f.cwd, { skillID: old.id, hash: old.hash })).toThrow('changed')
    writeFileSync(join(f.home, 'skills.json'), '{ invalid settings')
    expect(() => f.skills.scan(f.cwd)).toThrow('preserved')
    expect(readFileSync(join(f.home, 'skills.json'), 'utf8')).toBe('{ invalid settings')
  } finally { rmSync(f.home, { recursive: true, force: true }) }
})
test('real daemon discovers skills, persists toggles through restart, and sends invoked documents to a real model transport', async () => {
  const f = fixture(), requests: any[] = []
  f.install(join(f.user, '.agents/skills'), 'find-skills', '# Discovery instructions\n\nUnique skill evidence: BLUE_SKILL_MARKER')
  const server = Bun.serve({ hostname: '127.0.0.1', port: 0, async fetch(request) {
    requests.push(await request.json())
    const frame = (value: object) => `data: ${JSON.stringify(value)}\n\n`
    return new Response(frame({ type: 'response.output_text.delta', delta: 'Skill instructions received.' }) + frame({ type: 'response.completed', response: { usage: { input_tokens: 10, output_tokens: 4 } } }), { headers: { 'content-type': 'text/event-stream' } })
  } })
  writeFileSync(join(f.home, 'providers.json'), JSON.stringify({ defaultModel: 'fixture/chat', providers: [{ id: 'fixture', adapter: 'openai', apiKeyEnv: 'HIROSHI_SKILLS_TEST_KEY', baseURL: server.url.href, models: [{ id: 'chat', model: 'fixture', label: 'Skill fixture', contextWindow: 32768, reservedOutput: 1024 }] }] }))
  const env = { HIROSHI_SKILLS_USER_HOME: f.user, HIROSHI_SKILLS_TEST_KEY: 'fixture-key' }
  let daemon = await startDaemon({ home: f.home, workspace: f.cwd, env })
  try {
    const { session } = await daemon.client.createSession({ cwd: f.cwd })
    const view = await daemon.client.skills({ id: session.id }), skill = view.skills[0]!
    expect(view.skills).toHaveLength(1)
    expect((await daemon.client.skillDocument({ id: session.id, skillID: skill.id, hash: skill.hash })).markdown).toContain('BLUE_SKILL_MARKER')
    await daemon.client.prompt({ id: session.id, text: '/find-skills help me' })
    await until(async () => (await daemon.client.session({ id: session.id })).steps.at(-1)?.status === 'succeeded')
    expect(requests[0].instructions).toContain('BLUE_SKILL_MARKER')
    await daemon.client.prompt({ id: session.id, text: 'continue' })
    await until(async () => (await daemon.client.session({ id: session.id })).steps.filter((s) => s.status === 'succeeded').length === 2)
    expect(requests[1].instructions).toContain('BLUE_SKILL_MARKER')
    await daemon.client.updateSkill({ id: session.id, skillID: skill.id, hash: skill.hash, revision: 0, enabled: false })
    await daemon.crash(); daemon = await startDaemon({ home: f.home, workspace: f.cwd, env })
    expect((await daemon.client.skills({ id: session.id })).skills[0]!.enabled).toBe(false)
    const { session: other } = await daemon.client.createSession({ cwd: f.cwd })
    await daemon.client.prompt({ id: other.id, text: 'unrelated task' })
    await until(async () => (await daemon.client.session({ id: other.id })).steps.at(-1)?.status === 'succeeded')
    expect(requests.at(-1).instructions).not.toContain('BLUE_SKILL_MARKER')
    await expect(daemon.client.updateSkill({ id: session.id, skillID: skill.id, hash: skill.hash, revision: 0, enabled: true })).rejects.toMatchObject({ code: 'skills_revision' })
    const removed = await daemon.client.removeSkill({ id: session.id, skillID: skill.id, hash: skill.hash, revision: 1, origin: skill.origins[0]!.path })
    expect(removed.inventory.skills).toHaveLength(0); expect(existsSync(join(removed.removedTo, 'SKILL.md'))).toBe(true)
  } finally { await daemon.stop(); server.stop(true) }
}, 45000)
