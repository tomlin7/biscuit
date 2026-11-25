import type { EngineClient } from '../../src/engine/client'
import type { InternetSettings } from './protocol'

type Client = Pick<EngineClient, 'internetSettings' | 'updateInternet' | 'createPairing'>
export async function internetCommand(client: Client, command: string): Promise<InternetSettings> {
  if (!['status', 'enable', 'disable', 'retry'].includes(command)) throw new Error('Use internet status, enable, disable or retry.')
  const state = await client.internetSettings()
  if (command === 'status' || command === 'disable' && !state.enabled || command === 'enable' && state.enabled && state.state !== 'failed') return state
  return client.updateInternet({ revision: state.revision, enabled: command !== 'disable' })
}
export async function remoteInvitation(client: Client, options: { timeoutMs?: number; onStatus?: (state: InternetSettings) => void } = {}) {
  const timeout = options.timeoutMs ?? 300000
  if (!Number.isFinite(timeout) || timeout < 1 || timeout > 300000) throw new Error('Pairing timeout must be between 1 and 300 seconds.')
  const deadline = Date.now() + timeout
  const expired = () => new Error('Timed out waiting for internet access. Setup remains owned by the daemon; check internet status or run internet disable.')
  const within = async <T>(effect: () => Promise<T>): Promise<T> => {
    const remaining = deadline - Date.now()
    if (remaining <= 0) throw expired()
    let timer: ReturnType<typeof setTimeout> | undefined
    try { return await Promise.race([effect(), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(expired()), remaining) })]) }
    finally { if (timer) clearTimeout(timer) }
  }
  let state = await within(() => client.internetSettings())
  if (!state.enabled) state = await within(() => client.updateInternet({ revision: state.revision, enabled: true }))
  for (;;) {
    options.onStatus?.(state)
    if (!state.enabled) throw new Error('Internet access was disabled while waiting for pairing.')
    if (state.state === 'failed') throw new Error(`${state.error ?? 'Internet access failed.'} Run internet retry to try again.`)
    if (state.state === 'connected' && state.url) return within(() => client.createPairing({ remote: true }))
    if (Date.now() >= deadline) throw expired()
    await Bun.sleep(Math.min(500, deadline - Date.now()))
    state = await within(() => client.internetSettings())
  }
}
