import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
const home = mkdtempSync(path.join(os.tmpdir(), 'hiroshi-browser-'))
const reserve = Bun.serve({ port: 0, fetch: () => new Response('') }), port = reserve.port
reserve.stop(true)
const server = Bun.spawn([process.execPath, path.resolve('web.ts')], { env: { ...process.env, PORT: String(port) }, stdout: 'ignore', stderr: 'inherit', windowsHide: true })
let browser: ReturnType<typeof Bun.spawn> | undefined, socket: WebSocket | undefined
const errors: string[] = []
const until = async (check: () => Promise<boolean>, label: string) => { for (let i = 0; i < 200; i++) { if (await check()) return; await Bun.sleep(100) } throw new Error(`${label}: ${errors.join('\n')}`) }
try {
 await until(async () => { try { return (await fetch(`http://127.0.0.1:${port}`, { signal: AbortSignal.timeout(500) })).ok } catch { return false } }, 'Preview server did not start')
 const chrome = process.env.HIROSHI_CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
 browser = Bun.spawn([chrome, '--headless=new', `--user-data-dir=${home}`, '--remote-debugging-port=0', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--no-proxy-server', '--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--use-angle=swiftshader', '--window-size=1180,820', 'about:blank'], { stdout: 'ignore', stderr: 'ignore', windowsHide: true })
 let debugPort = 0
 await until(async () => { try { debugPort = Number(readFileSync(path.join(home, 'DevToolsActivePort'), 'utf8').split('\n')[0]); return !!debugPort } catch { return false } }, 'Headless browser did not start')
 const pages: any[] = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json()
 socket = new WebSocket(pages.find((page) => page.type === 'page').webSocketDebuggerUrl)
 const pending = new Map<number, { resolve: (value: any) => void; reject: (reason: any) => void }>(); let id = 0
 socket.onmessage = (event) => { const value = JSON.parse(String(event.data)); if (value.id) { const waiter = pending.get(value.id); pending.delete(value.id); if (value.error) waiter?.reject(value.error); else waiter?.resolve(value.result) } if (value.method === 'Runtime.exceptionThrown') errors.push(JSON.stringify(value.params.exceptionDetails)) }
 await new Promise<void>((resolve, reject) => { socket!.onopen = () => resolve(); socket!.onerror = reject })
 const call = (method: string, params: unknown = {}) => new Promise<any>((resolve, reject) => { const number = ++id; pending.set(number, { resolve, reject }); socket!.send(JSON.stringify({ id: number, method, params })) })
 const evaluate = async (expression: string) => { const result = await call('Runtime.evaluate', { expression: `(async () => (${expression}))()`, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails)); return result.result?.value }
 await call('Runtime.enable'); await call('Page.enable'); await call('Page.navigate', { url: `http://127.0.0.1:${port}` })
 await until(async () => !!await evaluate('globalThis.gpuix && (await globalThis.gpuix.getByTestId("composer").all()).length === 1'), 'The Wasm cockpit did not mount')
 await until(async () => !!await evaluate('document.querySelector("[data-gpui-input]") !== null'), 'The Wasm keyboard target did not mount')
 await evaluate('await globalThis.gpuix.getByTestId("composer").fill("browser-preview-check")')
 await evaluate('await globalThis.gpuix.getByTestId("send").click()')
 await until(async () => !!await evaluate('JSON.stringify(await globalThis.gpuix.call("getTree",{})).includes("No model ran. You wrote")'), 'The preview did not render a demo reply')
 if (errors.length) throw new Error(errors.join('\n'))
 mkdirSync('screenshots', { recursive: true })
 const screenshot = await call('Page.captureScreenshot', { format: 'png' })
 await Bun.write('screenshots/browser-preview.png', Buffer.from(screenshot.data, 'base64'))
 console.log('Browser preview mounted and accepted a composer send without runtime exceptions; native dragging is disabled')
} finally {
 socket?.close(); browser?.kill(); server.kill()
 await browser?.exited; await server.exited
 for (let i = 0; i < 20; i++) { try { rmSync(home, { recursive: true, force: true }); break } catch { await Bun.sleep(100) } }
}
