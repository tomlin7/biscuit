/** Installed skill settings against a real source/packaged window and daemon. */
import { mkdirSync, mkdtempSync, existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { openWindow, waitUntil, stopTheDaemon, treeText } from './integration'
import { engineClient } from './src/engine/client'
import { localPaths, readRegistry } from './src/engine/discovery'

const root = mkdtempSync(path.join(tmpdir(), 'hiroshi-skills-window-')), home = path.join(root, 'engine'), user = path.join(root, 'user'), cwd = path.join(root, 'project')
for (const folder of [home, user, cwd]) mkdirSync(folder)
function install(source: string, name: string) {
  const folder = path.join(user, source, name); mkdirSync(folder, { recursive: true })
  writeFileSync(path.join(folder, 'SKILL.md'), `---\nname: ${name}\ndescription: A real installed ${name} skill for the window test.\n---\n\n# ${name}\n\nThis document is read from disk.\n\n## Instructions\n\n- Use the selected workspace.\n- Keep changes reviewable.\n\n**Actual Markdown content.**\n`)
  return folder
}
const shared = install('.agents/skills', 'find-skills'); install('.cursor/skills', 'terminal-guide')
const env = { HIROSHI_HOME: home, HIROSHI_SKILLS_USER_HOME: user, GPUIX_BACKGROUND: '1' }, suffix = process.env.HIROSHI_TEST_PACKAGED ? 'packaged' : 'source'
const check = (value: unknown, message: string) => { if (!value) throw new Error(message) }
let stage = 'open skills'
try {
  const window = await openWindow(env, cwd)
  let selectedID = ''
  try {
    const app = window.app
    await waitUntil(async () => !(await app.getByTestId('engine-run-status').textContent()).includes('Connecting'), 'the engine connection')
    const client = engineClient((await waitUntil(async () => readRegistry(localPaths(home).registry), 'the daemon registry')))
    const session = (await client.listSessions()).sessions.find((s) => s.cwd === cwd)!
    const inventory = await client.skills({ id: session.id }), skill = inventory.skills.find((s) => s.name === 'find-skills')!; selectedID = skill.id
    await app.getByTestId('settings').click(); await app.getByTestId('settings-section-skills').waitFor(); await app.getByTestId('settings-section-skills').click()
    await app.getByTestId('skill-document').waitFor(); check((await app.getByTestId('skill-document').textContent()).includes('read from disk'), 'Skills did not render the actual document')
    mkdirSync('screenshots', { recursive: true }); await app.screenshot({ path: path.resolve(`screenshots/windowed-skills-${suffix}.png`) })
    stage = 'search and source filtering'
    await app.getByTestId('skills-search').fill('terminal')
    await waitUntil(async () => (await app.getByTestId('skill-name').textContent()) === 'terminal-guide', 'search results')
    await app.getByTestId('skills-search').fill('')
    await app.getByTestId('skills-filter').click(); await app.getByTestId('skills-filter-cursor').waitFor(); await app.getByTestId('skills-filter-cursor').click()
    await waitUntil(async () => (await app.getByTestId('skills-count').textContent()) === '1 skill', 'the Cursor source filter')
    await app.getByTestId('skills-filter').click(); await app.getByTestId('skills-filter-all').waitFor(); await app.getByTestId('skills-filter-all').click()
    await app.getByTestId(`skill-${skill.id}`).click(); await waitUntil(async () => (await app.getByTestId('skill-name').textContent()) === 'find-skills', 'the shared skill selection')
    stage = 'persistent disable'
    await app.getByTestId('skill-enabled').click()
    await waitUntil(async () => !(await client.skills({ id: session.id })).skills.find((s) => s.id === skill.id)!.enabled && (await app.getByTestId('skill-status').textContent()) === 'Disabled', 'the persisted disabled setting')
    await app.getByTestId('settings-back').click(); await app.getByTestId('settings').click(); await app.getByTestId('settings-section-skills').waitFor(); await app.getByTestId('settings-section-skills').click()
    await waitUntil(async () => (await app.getByTestId('skill-status').textContent()) === 'Disabled', 'disabled state after reopening Settings')
    stage = 'confirmed reversible removal'
    await app.getByTestId('skill-delete').click(); await app.getByTestId('skill-delete-dialog').waitFor(); await app.getByTestId('skill-delete-cancel').click()
    check(existsSync(path.join(shared, 'SKILL.md')), 'Cancelling removal changed the installation')
    await app.getByTestId('skill-delete').click(); await app.getByTestId('skill-delete-confirm').waitFor(); await app.getByTestId('skill-delete-confirm').click()
    await waitUntil(async () => !(await client.skills({ id: session.id })).skills.some((s) => s.id === skill.id), 'the installation to move to trash')
    check(!existsSync(shared), 'The removed installation remained in discovery')
    await app.getByTestId('skills-notice').waitFor(); check((await app.getByTestId('skills-notice').textContent()).includes('.hiroshi-skill-trash'), 'Removal did not expose its recovery location')
    console.log('Skills window passed: actual files, Markdown, search, source filters, persistent toggles, cancellation and reversible removal.')
  } catch (error) {
    console.error(`Skills window failed during ${stage}; selected ${selectedID}`)
    mkdirSync('screenshots', { recursive: true })
    try { writeFileSync(`screenshots/skills-failure-${suffix}.json`, JSON.stringify(await window.app.call('getTree', {}), null, 2)); await window.app.screenshot({ path: path.resolve(`screenshots/skills-failure-${suffix}.png`) }); console.error((await treeText(window.app)).slice(-3000)) } catch {}
    throw error
  } finally { await window.close() }
} finally { await stopTheDaemon(home) }
