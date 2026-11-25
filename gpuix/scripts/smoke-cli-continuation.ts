/** Explicit opt-in: this uses the installed CLI's account and may incur charges.
 * Run sequentially through run-guarded.ps1, never as part of the default suite. */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { startDaemon, tempHome, until } from '../engine/test/harness'
import { discoverCommand } from '../engine/src/providers/discovery'
import type { AgentID } from '../engine/src/protocol'

const agent = process.argv[process.argv.indexOf('--agent') + 1] as AgentID
if (!process.argv.includes('--allow-live') || !['cursor', 'agy', 'grok', 'pi'].includes(agent)) {
  throw new Error('Explicit opt-in required: --agent cursor|agy|grok|pi --allow-live (uses your CLI account)')
}
const command = discoverCommand(agent, process.env)
if (!command) throw new Error(`No supported ${agent} executable discovered`)
const home = tempHome(), cwd = join(home, 'project')
mkdirSync(cwd)
if (Bun.spawnSync(['git', '-C', cwd, 'init', '-b', 'main']).exitCode) throw new Error('Could not initialize the temporary repository')
writeFileSync(join(cwd, 'AGENTS.md'), 'This is a response-only acceptance check. Do not use tools, edit files, run commands or delegate.')
writeFileSync(join(home, 'providers.json'), JSON.stringify({ defaultModel: 'live/chat', providers: [{ id: 'live', adapter: `${agent}-cli`, command, trustWorkspace: true,
  models: [{ id: 'chat', model: 'default', label: 'Installed CLI acceptance', contextWindow: 32768, reservedOutput: 1024 }] }] }))
writeFileSync(join(home, 'execution.json'), JSON.stringify({ maxActive: 1, minFreeMemoryMB: 4096, processMemoryMB: 1536, maxProcesses: 6, timeoutMs: 60000 }))
let daemon = await startDaemon({ home, workspace: cwd })
try {
  const { session } = await daemon.client.createSession({})
  const nonce = `hiroshi-${randomUUID()}`
  const turn = async (text: string) => {
    const before = (await daemon.client.session({ id: session.id })).steps.length
    await daemon.client.prompt({ id: session.id, text })
    await until(async () => { const detail = await daemon.client.session({ id: session.id }); return detail.steps.length > before && !detail.steps.some((step) => step.status === 'running') }, 65000)
    const detail = await daemon.client.session({ id: session.id }), step = detail.steps.at(-1)!
    if (step.status !== 'succeeded' || detail.cliConversation?.status !== 'ready') throw new Error(`${agent}: ${step.error?.code ?? 'unconfirmed native result'}`)
    return detail
  }
  const first = await turn(`Remember the private test nonce ${nonce}. Reply only SAVED. Do not use any tools.`)
  await daemon.crash(); daemon = await startDaemon({ home, workspace: cwd })
  const second = await turn('Reply only with the private test nonce from my previous turn. Do not use any tools.')
  if (!second.steps.at(-1)!.output.includes(nonce) || second.cliConversation!.vendorSessionID !== first.cliConversation!.vendorSessionID) throw new Error(`${agent}: native context was not retained across restart`)
  console.log(`${agent}: authenticated native follow-up retained the nonce across daemon restart; same vendor ID; two submissions, no replay.`)
} finally { await daemon.stop() }
