import { appendFileSync, existsSync, readFileSync } from 'node:fs'
const id = process.env.HIROSHI_PROBE_AGENT ?? 'cursor'
const args = process.argv.slice(2)
const state = process.env.HIROSHI_PROBE_STATE && existsSync(process.env.HIROSHI_PROBE_STATE) ? JSON.parse(readFileSync(process.env.HIROSHI_PROBE_STATE, 'utf8')) : {}
if (process.env.HIROSHI_PROBE_LOG) appendFileSync(process.env.HIROSHI_PROBE_LOG, JSON.stringify({ id, args, cwd: process.cwd() }) + '\n')
if (args.includes('--help')) {
  if (state.hang) { await Bun.sleep(20000); process.exit(0) }
  if (state.noise) { console.log('x'.repeat(128 * 1024 + 1)); await Bun.sleep(20000); process.exit(0) }
  const help = state.unsupported ? 'Unsupported old CLI' : '--input-format --output-format --disable-slash-commands --print --stream-partial-output --mode ask --no-extensions --no-mcp --no-tools --no-session --session --no-approve --tools --deny --no-subagents --prompt-file --conversation --resume --session-id'
  if (id === 'agy') console.error(help); else console.log(help)
  process.exit(0)
}
if (args.includes('--version')) { console.log(id === 'cursor' ? '2026.10.19-fixture' : '1.0.4'); process.exit(0) }
if (args.includes('status')) { console.log(JSON.stringify({ isAuthenticated: state.auth !== false, userInfo: { email: 'private-fixture-secret@example.invalid' } })); process.exit(0) }
if (args.includes('models')) { console.log('model-one  First model\nmodel-two  Second model\nprivate-fixture-secret'); process.exit(0) }
if (state.auth === false) { console.error('authentication required private-fixture-secret'); process.exit(1) }
if (state.hangResponse) { await Bun.sleep(20000); process.exit(0) }
const emit = (value: object) => console.log(JSON.stringify(value))
if (id === 'pi') {
  if (!['--no-extensions', '--no-mcp', '--no-tools', '--no-approve', '--no-context-files'].every((flag) => args.includes(flag)) || (!args.includes('--no-session') && !args.includes('--session'))) process.exit(23)
  const input = await Bun.stdin.text(); if (!input.includes('conversation')) process.exit(24)
  const session = args.includes('--session') ? JSON.parse(readFileSync(args[args.indexOf('--session') + 1]!, 'utf8').split('\n')[0]!).id : 'pi-session'
  emit({ type: 'session', version: 3, id: session, cwd: process.cwd() })
  emit({ type: 'agent_start' }); emit({ type: 'turn_start' })
  emit({ type: 'message_start', message: { role: 'assistant', content: [] } })
  emit({ type: 'message_update', assistantMessageEvent: { type: 'text_delta', delta: 'Pi 漢🙂' } })
  emit({ type: 'message_end', message: { role: 'assistant', stopReason: state.length ? 'length' : 'stop', content: [{ type: 'text', text: 'Pi 漢🙂' }], usage: { input: 10, output: 3 } } })
  emit({ type: 'agent_end', willRetry: false })
  if (!state.truncated) emit({ type: 'agent_settled', aborted: false })
} else if (id === 'grok') {
  if (args[args.indexOf('--tools') + 1] !== '' || args[args.indexOf('--deny') + 1] !== '*' || !args.includes('--no-subagents')) process.exit(25)
  const file = args[args.indexOf('--prompt-file') + 1]!
  if (!readFileSync(file, 'utf8').includes('conversation')) process.exit(26)
  emit({ type: 'available_commands', tools: ['private-fixture-secret'], commands: [] })
  emit({ type: 'text', data: 'Grok 漢' }); emit({ type: 'thought', data: 'private-fixture-secret' })
  emit({ type: 'available_commands', tools: [], commands: ['private-fixture-secret'] })
  emit({ type: 'text', data: '🙂' })
  emit({ type: 'usage', usage: { input_tokens: 10, output_tokens: 3 }, signature: 'private-fixture-secret' })
  const session = args.includes('--resume') ? args[args.indexOf('--resume') + 1] : args.includes('--session-id') ? args[args.indexOf('--session-id') + 1] : 'grok-session'
  if (!state.truncated) emit({ type: 'end', stopReason: state.length ? 'max_tokens' : 'end_turn', sessionId: session, usage: { input_tokens: 10, output_tokens: 3 } })
} else {
  process.env.HIROSHI_CLI_FIXTURE = id
  await import('./cli-response')
}
