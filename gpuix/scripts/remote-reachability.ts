/** External-network check. Receives a public origin, never a device credential. */
export {}
const raw = process.env.HIROSHI_PROBE_URL ?? ''
const url = new URL(raw)
if (url.protocol !== 'https:' || url.origin !== raw || !url.hostname.endsWith('.opentunnel.xyz') || url.username || url.password) throw new Error('Provide an exact hosted OpenTunnel HTTPS origin.')
for (const [path, status, code] of [['/v1/health', 401, 'network_access'], ['/v1/internet', 403, 'network_access'], ['/v1/sessions', 401, 'network_access']] as const) {
  const response = await fetch(url.origin + path, { signal: AbortSignal.timeout(15000), redirect: 'error' })
  const body = await response.json() as { error?: { code?: string } }
  if (response.status !== status || body.error?.code !== code) throw new Error(`Unexpected public gateway response for ${path}: ${response.status}`)
}
console.log('Independent network passed: public HTTPS is reachable; authentication is required and owner controls are denied. No device credential was supplied.')
