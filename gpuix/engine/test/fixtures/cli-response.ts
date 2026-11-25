/** Controlled executable, not an adapter mock: uses actual stdin, argv and pipes. */
import { appendFileSync, existsSync, writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
const mode = process.env.HIROSHI_CLI_FIXTURE ?? 'cursor'
if (process.argv.includes('--force') || process.argv.includes('--dangerously-skip-permissions')) process.exit(19)
const input = await Bun.stdin.text()
if (process.env.HIROSHI_CLI_MARKER) appendFileSync(process.env.HIROSHI_CLI_MARKER, JSON.stringify({ cwd: process.cwd(), input, args: process.argv.slice(2), pid: process.pid }) + '\n')
if (mode === 'auth') { console.error('authentication required private-fixture-secret'); process.exit(1) }
if (mode === 'trust') { console.error('Workspace Trust Required private-fixture-secret'); process.exit(1) }
if (mode === 'exit') { console.error('private-fixture-secret'); process.exit(7) }
if (mode === 'noise') { process.stderr.write('x'.repeat(1024 * 1024 + 1)); await Bun.sleep(10000); process.exit(0) }
if (mode === 'malformed') { console.log('not JSON private-fixture-secret'); process.exit(0) }
if (mode === 'huge-line') { console.log(JSON.stringify({ type: 'x', value: '漢'.repeat(128 * 1024) })); process.exit(0) }
if (mode === 'invalid-utf8') { process.stdout.write(Buffer.from([0xff])); process.exit(0) }
const emit = async (event: object) => {
  const bytes = Buffer.from(JSON.stringify(event) + '\r\n')
  // Deliberately split a UTF-8 character and JSON tokens across OS writes.
  const point = Math.max(1, bytes.indexOf(Buffer.from('漢')) + 1)
  process.stdout.write(bytes.subarray(0, point)); await Bun.sleep(15); process.stdout.write(bytes.subarray(point))
}
const resumeFlag = process.argv.includes('--conversation') ? '--conversation' : '--resume'
const session = process.argv.includes(resumeFlag) ? process.argv[process.argv.indexOf(resumeFlag) + 1]! : `fixture-${randomUUID()}`
if (mode === 'agy') {
  if (!process.argv.includes('--input-format') || JSON.parse(input).event !== 'user') process.exit(20)
  await emit({ event: 'init', conversation_id: session, init: { permission_mode: 'strict', cwd: process.cwd() } })
  await emit({ event: 'step_update', step_update: { conversation_id: session, step_type: 'user_input', state: 'DONE', step_index: 0 } })
  await emit({ event: 'step_update', step_update: { conversation_id: session, step_type: 'agent_response', state: 'ACTIVE', step_index: 1, text_delta: 'Hello 漢' } })
  await emit({ event: 'step_update', step_update: { conversation_id: session, step_type: 'agent_response', state: 'DONE', step_index: 1, text_delta: '🙂' } })
  await emit({ event: 'result', result: { conversation_id: session, status: 'SUCCESS', response: 'Hello 漢🙂', usage: { input_tokens: 21, output_tokens: 4 } } })
} else {
  if (!process.argv.includes('--mode') || !process.argv.includes('ask') || !input.includes('conversation')) process.exit(21)
  if (mode === 'hang-before-init') { await Bun.sleep(20000); process.exit(0) }
  await emit({ type: 'system', subtype: 'init', session_id: session, permissionMode: 'default', cwd: mode === 'wrong-workspace' ? import.meta.dir : process.cwd() })
  await emit({ type: 'thinking', subtype: 'delta', text: 'private thinking must not enter transcript', session_id: session })
  await emit({ type: 'thinking', subtype: 'completed', session_id: session })
  if (mode === 'hang') {
    if (process.env.HIROSHI_CLI_CHILD_PID) {
      const child = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { detached: process.platform === 'win32', stdio: 'ignore' })
      writeFileSync(process.env.HIROSHI_CLI_CHILD_PID, String(child.pid)); child.unref()
    }
    await Bun.sleep(20000); process.exit(0)
  }
  if (mode === 'mutation') { await emit({ type: 'tool_call', subtype: 'started', tool_call: { writeToolCall: { args: { fileText: 'do not execute' } } } }); process.exit(0) }
  await emit({ type: 'tool_call', subtype: 'started', tool_call: { readToolCall: { args: { path: 'input.txt' } } }, call_id: 'read-1' })
  await emit({ type: 'tool_call', subtype: 'completed', tool_call: { readToolCall: { result: { content: 'tool output must not become assistant text' } } }, call_id: 'read-1' })
  await emit({ type: 'assistant', timestamp_ms: 1, message: { content: [{ type: 'text', text: 'Hello 漢' }] } })
  if (process.env.HIROSHI_CLI_RELEASE) {
    const deadline = Date.now() + 5000
    while (!existsSync(process.env.HIROSHI_CLI_RELEASE) && Date.now() < deadline) await Bun.sleep(25)
    if (!existsSync(process.env.HIROSHI_CLI_RELEASE)) process.exit(23)
  }
  if (mode === 'truncated') process.exit(0)
  if (mode === 'session-change') { await emit({ type: 'assistant', session_id: 'different', timestamp_ms: 2, message: { content: [{ type: 'text', text: 'wrong' }] } }); process.exit(0) }
  await emit({ type: 'assistant', timestamp_ms: 2, message: { content: [{ type: 'text', text: '🙂' }] } })
  await emit({ type: 'assistant', timestamp_ms: 3, model_call_id: 'buffer-flush', message: { content: [{ type: 'text', text: 'Hello 漢🙂' }] } })
  await emit({ type: 'assistant', message: { content: [{ type: 'text', text: 'Hello 漢🙂' }] } })
  if (mode === 'incomplete-line') { process.stdout.write('{'); process.exit(0) }
  await emit({ type: 'result', subtype: mode === 'failed-result' ? 'error' : 'success', is_error: mode === 'failed-result', session_id: session,
    result: mode === 'mismatch' ? 'different' : 'Hello 漢🙂', usage: { inputTokens: 21, outputTokens: 4 } })
  if (mode === 'post-result') await emit({ type: 'assistant', timestamp_ms: 4, message: { content: [{ type: 'text', text: 'after result' }] } })
}
