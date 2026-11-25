import React, { useEffect, useRef, useState } from 'react'
import { Button } from '@gpuix/react'
import type { EngineHandle } from '../engine/use-engine'
import type { InternetSettings as Settings } from '../../engine/src/protocol'
import { clipboardAvailable, copyText } from '../shell/clipboard'

const action = { padding: 7, borderRadius: 6, borderWidth: 1, borderColor: '#3b3b3b', backgroundColor: '#252525', pointerEvents: 'auto' as const, flexShrink: 0 }
const labels = { disabled: 'Off', starting: 'Setting up…', connected: 'Connected', reconnecting: 'Reconnecting…', failed: 'Unavailable' }
export function InternetSettings({ engine, onChange }: { engine?: EngineHandle; onChange: (state: Settings | null) => void }) {
  const [state, setState] = useState<Settings | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const pending = useRef(false), generation = useRef(0), failures = useRef(0), reading = useRef(false), latest = useRef(state)
  const ready = engine?.snapshot?.status === 'ready' && !!engine?.internetSettings
  const receive = (next: Settings | null) => { latest.current = next; setState(next); onChange(next) }
  useEffect(() => {
    const token = ++generation.current; pending.current = false; reading.current = false; failures.current = 0
    setBusy(false); setError(''); setNotice(''); receive(null)
    if (!ready || !engine) return () => { generation.current++ }
    const refresh = async () => {
      if (reading.current || pending.current || failures.current >= 3) return
      reading.current = true
      try {
        const next = await engine.internetSettings()
        if (token !== generation.current || pending.current) return
        if (!latest.current || next.revision >= latest.current.revision) receive(next)
        failures.current = 0; setError('')
      } catch (e) {
        if (token === generation.current && ++failures.current >= 3) { if (latest.current) receive({ ...latest.current, state: 'failed', url: null }); setError('Could not refresh internet access. Refresh to check the connection.') }
      } finally { if (token === generation.current) reading.current = false }
    }
    void refresh()
    const timer = setInterval(() => void refresh(), 2000)
    return () => { generation.current++; clearInterval(timer) }
  }, [ready, engine?.internetSettings, onChange])
  const run = async (effect: (live: () => boolean) => Promise<Settings | undefined>) => {
    if (pending.current || !ready) return
    const token = generation.current; pending.current = true; setBusy(true); setError(''); setNotice('')
    try { const next = await effect(() => token === generation.current); if (token === generation.current) { if (next) receive(next); failures.current = 0 } }
    catch (e) { if (token === generation.current) setError(e instanceof Error ? e.message : 'Could not change internet access.') }
    finally { if (token === generation.current) { pending.current = false; setBusy(false) } }
  }
  if (!engine?.internetSettings) return null
  return <div testId="internet-settings" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20, borderRadius: 13, backgroundColor: '#222222' }}>
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, gap: 6 }}>
        <text testId="internet-status" style={{ fontSize: 14, fontWeight: 600, color: '#dddddd' }}>{`Internet access · ${state ? labels[state.state] : ready ? 'Loading…' : 'Disconnected'}`}</text>
        <text style={{ fontSize: 12, color: '#999999' }}>Connect paired devices from other networks through an encrypted OpenTunnel address. Your PC and daemon must stay running.</text>
      </div>
      <Button testId="internet-toggle" aria-label="Allow internet access" aria-pressed={state?.enabled ?? false} disabled={!ready || !state || busy} onClick={() => void run(() => engine.updateInternet({ revision: state!.revision, enabled: !state!.enabled }))}
        style={{ width: 38, height: 22, borderRadius: 11, backgroundColor: state?.enabled ? '#dddddd' : '#505050', padding: 3, display: 'flex', alignItems: 'center', justifyContent: state?.enabled ? 'flex-end' : 'flex-start', flexShrink: 0 }}>
        <div style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#222222', pointerEvents: 'none' }} />
      </Button>
    </div>
    <text style={{ fontSize: 12, color: '#999999' }}>{state?.enabled ? 'Only trusted paired devices can use the daemon. Disable internet access to close the public connection; local tasks keep running.' : 'Enabling creates a public HTTPS endpoint. Device authentication stays required. LAN exposure can remain off.'}</text>
    {state?.state === 'connected' && state.url && <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <text testId="internet-url" style={{ fontSize: 12, color: '#dddddd', flexGrow: 1, minWidth: 0, userSelect: 'text' }}>{state.url}</text>
      <Button testId="internet-copy" style={action} disabled={busy || !clipboardAvailable()} onClick={() => void run(async (live) => { await copyText(state.url!); if (live()) setNotice('Internet address copied.'); return undefined })}><text style={{ fontSize: 12, color: '#dddddd' }}>Copy</text></Button>
    </div>}
    <div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
      <Button testId="internet-refresh" style={action} disabled={busy || !ready} onClick={() => void run(() => engine.internetSettings())}><text style={{ fontSize: 12, color: '#dddddd' }}>Refresh</text></Button>
      {state?.enabled && (state.state === 'failed' || state.state === 'reconnecting') && <Button testId="internet-retry" style={action} disabled={busy || !ready} onClick={() => void run(() => engine.updateInternet({ revision: state.revision, enabled: true }))}><text style={{ fontSize: 12, color: '#dddddd' }}>Retry</text></Button>}
    </div>
    {(error || state?.error) && <text testId="internet-error" style={{ fontSize: 12, color: '#f38a8a' }}>{error || state?.error}</text>}
    {notice && <text testId="internet-notice" style={{ fontSize: 12, color: '#a5c8a1' }}>{notice}</text>}
  </div>
}
