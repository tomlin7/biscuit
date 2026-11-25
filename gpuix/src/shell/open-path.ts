/** Explicit desktop file actions use the OS association, never shell text. */
export async function openLocalPath(file: string) {
  if (typeof Bun === 'undefined') throw new Error('Local file actions are available in the desktop app.')
  const { stat } = await import('node:fs/promises')
  await stat(file)
  if (process.platform === 'win32') {
    const { dlopen, ptr } = await import('bun:ffi')
    const library = dlopen('shell32.dll', { ShellExecuteW: { args: ['ptr', 'ptr', 'ptr', 'ptr', 'ptr', 'i32'], returns: 'ptr' } })
    try {
      const verb = Buffer.from('open\0', 'utf16le'), target = Buffer.from(file + '\0', 'utf16le')
      const result = library.symbols.ShellExecuteW(null, ptr(verb), ptr(target), null, null, 1)
      if (!result || Number(result) <= 32) throw new Error('Windows could not open this path. Check its default application.')
    } finally { library.close() }
    return
  }
  const { spawnOwned } = await import('../../engine/src/process')
  const { DEFAULT_EXECUTION_LIMITS } = await import('../../engine/src/execution')
  const child = spawnOwned({ cmd: process.platform === 'darwin' ? ['/usr/bin/open', file] : ['xdg-open', file], cwd: process.cwd(),
    limits: { ...DEFAULT_EXECUTION_LIMITS, processMemoryMB: 128, maxProcesses: 2, timeoutMs: 5000 } })
  const timer = setTimeout(() => child.terminateTree(), 5000)
  try { await Promise.all([new Response(child.stdout).arrayBuffer(), new Response(child.stderr).arrayBuffer()]); if (await child.exited !== 0) throw new Error('No application could open this path.') }
  finally { clearTimeout(timer); child.terminateTree() }
}
