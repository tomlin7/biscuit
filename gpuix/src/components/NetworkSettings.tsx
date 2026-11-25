import React, { useEffect, useRef, useState } from 'react'
import { Button } from '@gpuix/react'
import type { EngineHandle } from '../engine/use-engine'
import type { NetworkSettings as Settings } from '../../engine/src/protocol'
import { clipboardAvailable, copyText } from '../shell/clipboard'
import { DevicePairing } from './DevicePairing'
import { InternetSettings } from './InternetSettings'
import type { InternetSettings as InternetState } from '../../engine/src/protocol'

const card = { display: 'flex' as const, flexDirection: 'column' as const, gap: 12, padding: 20, borderRadius: 13, backgroundColor: '#222222' }
const field = { height: 32, padding: 8, borderRadius: 7, borderWidth: 1, borderColor: '#373737', backgroundColor: '#141414', color: '#dddddd', fontSize: 12 }
const action = { padding: 7, borderRadius: 6, borderWidth: 1, borderColor: '#3b3b3b', hover: { backgroundColor: '#303030' } }
export function NetworkSettings({ engine }: { engine?: EngineHandle }) {
  const [state, setState] = useState<Settings | null>(null), [port, setPort] = useState(''), [origins, setOrigins] = useState('')
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [token, setToken] = useState<string | null>(null), [copied, setCopied] = useState('')
  const pending = useRef(false)
  const [internet, setInternet] = useState<InternetState | null>(null)
  const receive = (next: Settings) => { setState(next); setPort(String(next.port)); setOrigins(next.origins.join(', ')) }
  useEffect(() => {
    let stopped = false
    if (engine) void engine.networkSettings().then((next) => { if (!stopped) receive(next) }).catch((error) => { if (!stopped) setError(error.message) })
    return () => { stopped = true }
  }, [engine?.networkSettings])
  const run = async (effect: () => Promise<void>) => {
    if (pending.current) return
    pending.current = true; setBusy(true); setError(''); setCopied('')
    try { await effect() } catch (error) { setError(error instanceof Error ? error.message : 'Could not update network settings') }
    finally { pending.current = false; setBusy(false) }
  }
  const apply = (enabled: boolean) => void run(async () => {
    if (!engine || !state) return
    if (!/^\d{4,5}$/.test(port) || Number(port) < 1024 || Number(port) > 65535) throw new Error('Port must be between 1024 and 65535.')
    receive(await engine.updateNetwork({ revision: state.revision, enabled, port: Number(port), origins: origins.split(',').map((value) => value.trim()).filter(Boolean) }))
  })
  return <div testId="network-settings" style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 820 }}>
    <div style={{ ...card, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <text testId="network-status" style={{ fontSize: 14, fontWeight: 600, color: '#dddddd' }}>{`Expose managed daemon${!state ? ' · Loading…' : state.active ? ' · Exposed' : state.enabled ? ' · Unavailable' : ' · Local only'}`}</text>
        <text style={{ fontSize: 13, color: '#999999' }}>Allow trusted clients on your network. Changes restart only the network listener.</text>
      </div>
      <Button testId="network-toggle" disabled={busy || !state} onClick={() => apply(!state?.enabled)} aria-label="Expose managed daemon" aria-pressed={state?.enabled ?? false}
        style={{ width: 38, height: 22, borderRadius: 11, backgroundColor: state?.enabled ? '#dddddd' : '#505050', padding: 3, display: 'flex', alignItems: 'center', justifyContent: state?.enabled ? 'flex-end' : 'flex-start', flexShrink: 0 }}>
        <div style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#222222', pointerEvents: 'none' }} />
      </Button>
    </div>
    <div style={card}>
      <text style={{ fontSize: 14, fontWeight: 600, color: '#dddddd' }}>Listener access</text>
      <text style={{ fontSize: 13, color: '#999999' }}>Browser origins must match exactly. Separate multiple origins with commas.</text>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 24 }}>
        <div style={{ flexGrow: 1 }}><text style={{ fontSize: 13, color: '#dddddd' }}>Port</text><text style={{ fontSize: 12, color: '#999999' }}>Hiroshi listens on all IPv4 interfaces at this port when enabled.</text></div>
        <input testId="network-port" readOnly={busy || !state} value={port} onChange={(event) => setPort(event.value ?? '')} style={{ ...field, width: 150 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 24 }}>
        <div style={{ width: 250 }}><text style={{ fontSize: 13, color: '#dddddd' }}>Allowed browser origins</text><text style={{ fontSize: 12, color: '#999999' }}>Exact HTTP or HTTPS origins. An empty list blocks browsers.</text></div>
        <input testId="network-origins" readOnly={busy || !state} value={origins} placeholder="http://localhost:3001" onChange={(event) => setOrigins(event.value ?? '')} style={{ ...field, flexGrow: 1 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
        <Button testId="network-refresh" disabled={busy || !engine} onClick={() => void run(async () => receive(await engine!.networkSettings()))} style={action}><text style={{ fontSize: 12, color: '#bbbbbb' }}>Refresh</text></Button>
        <Button testId="network-apply" disabled={busy || !state} onClick={() => apply(state!.enabled)} style={action}><text style={{ fontSize: 12, color: '#dddddd' }}>{busy ? 'Applying…' : !state ? 'Loading…' : 'Apply'}</text></Button>
      </div>
    </div>
    <div style={card}>
      <text style={{ fontSize: 14, fontWeight: 600, color: '#dddddd' }}>LAN connection details</text>
      <text style={{ fontSize: 13, color: '#999999' }}>{`Use these in a compatible Hiroshi client. Transport: ${state?.transport ?? 'HTTP / Server-Sent Events'}.`}</text>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <text style={{ width: 80, fontSize: 12, color: '#999999' }}>LAN URL</text>
        <text testId="network-url" style={{ flexGrow: 1, fontSize: 12, color: '#dddddd', whiteSpace: 'nowrap' }}>{state?.urls[0] ?? 'LAN exposure is off'}</text>
        <Button testId="network-copy-url" disabled={busy || !state?.active || !clipboardAvailable()} onClick={() => void run(async () => { await copyText(state!.urls[0]!); setCopied('URL copied') })} style={action}><text style={{ fontSize: 12, color: '#bbbbbb' }}>Copy</text></Button>
      </div>
      <div style={{ height: 1, backgroundColor: '#333333' }} />
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <text style={{ width: 80, fontSize: 12, color: '#999999' }}>Token</text>
        <text testId="network-token" style={{ flexGrow: 1, fontSize: 12, color: '#dddddd', whiteSpace: 'nowrap', textOverflow: 'ellipsis', userSelect: 'text' }}>{token ?? '••••••••••••••••••••••••'}</text>
        <Button testId="network-show-token" disabled={busy || !state} onClick={() => void run(async () => setToken(token ? null : await engine!.networkToken()))} style={action}><text style={{ fontSize: 12, color: '#bbbbbb' }}>{token ? 'Hide' : 'Show'}</text></Button>
        <Button testId="network-copy-token" disabled={busy || !state || !clipboardAvailable()} onClick={() => void run(async () => { await copyText(await engine!.networkToken()); setCopied('Token copied') })} style={action}><text style={{ fontSize: 12, color: '#bbbbbb' }}>Copy</text></Button>
        <Button testId="network-rotate" disabled={busy || !state} onClick={() => void run(async () => { receive(await engine!.rotateNetworkToken(state!.revision)); setToken(null) })} style={action}><text style={{ fontSize: 12, color: '#bbbbbb' }}>Regenerate</text></Button>
      </div>
      <text style={{ fontSize: 12, lineHeight: 18, color: '#d0aa79', padding: 10, backgroundColor: '#171717', borderRadius: 8 }}>This token grants access to tasks, files, Git and agents on this machine. Use a trusted HTTPS proxy outside a private network. Existing network connections close when settings or the token change.</text>
      {copied && <text testId="network-copied" style={{ fontSize: 12, color: '#a5c8a1' }}>{copied}</text>}
    </div>
    <InternetSettings engine={engine} onChange={setInternet} />
    <DevicePairing engine={engine} active={state?.active ?? false} networkRevision={state?.revision ?? -1} internet={internet} />
    {(error || state?.error) && <text testId="network-error" style={{ fontSize: 12, color: '#F87171' }}>{error || state?.error}</text>}
  </div>
}
