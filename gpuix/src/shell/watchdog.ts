export interface WatchOptions { timeoutMs?: number; startupMs?: number; maxRestarts?: number; onRestart?: (reason: string) => void; signal?: AbortSignal }

/** Only owns a window child. The detached engine is never killed or restarted
 * by a window watchdog. Intentional window closure (exit 0) ends supervision. */
export async function supervise(command: string[], options: WatchOptions = {}): Promise<number> {
  if (process.env.HIROSHI_SUPERVISED === '1') throw new Error('Blocked nested window supervisor')
  let restarts = 0
  while (!options.signal?.aborted) {
    let lastBeat = Date.now(), ready = false, reason = ''
    const child = Bun.spawn({ cmd: command, stdin: 'inherit', stdout: 'inherit', stderr: 'inherit', windowsHide: true,
      env: { ...process.env, HIROSHI_SUPERVISED: '1' },
      ipc(message) { if (message?.type === 'hiroshi.window.alive') { ready = true; lastBeat = Date.now() } },
    })
    const stop = () => { reason = 'stopped'; child.kill('SIGKILL') }
    options.signal?.addEventListener('abort', stop, { once: true })
    const timer = setInterval(() => {
      if (Date.now() - lastBeat > (ready ? options.timeoutMs ?? 15000 : options.startupMs ?? 90000)) { reason = 'window heartbeat timed out'; child.kill('SIGKILL') }
    }, 250)
    let code: number
    try { code = await child.exited }
    finally { clearInterval(timer); options.signal?.removeEventListener('abort', stop) }
    if (options.signal?.aborted || (!reason && code === 0)) return code
    if (restarts++ >= (options.maxRestarts ?? 3)) throw new Error(`Hiroshi window recovery stopped after ${restarts} failures: ${reason || `exit ${code}`}`)
    options.onRestart?.(reason || `window exited with code ${code}`)
    await Bun.sleep(250)
  }
  return 0
}
