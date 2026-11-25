import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '@gpuix/react'
import type { EngineHandle } from '../engine/use-engine'
import type { PairingInvitation, PairingState, InternetSettings } from '../../engine/src/protocol'
import { clipboardAvailable, copyText } from '../shell/clipboard'

const ink = '#dddddd', muted = '#999999'
const action = { padding: 7, borderRadius: 6, borderWidth: 1, borderColor: '#3b3b3b', backgroundColor: '#252525', pointerEvents: 'auto' as const, cursor: 'pointer' as const, flexShrink: 0, alignSelf: 'flex-start' as const }
function Action({ id, label, disabled, onClick }: { id: string; label: string; disabled?: boolean; onClick: () => void }) { return <Button testId={id} disabled={disabled} onClick={onClick} style={action}><text style={{ fontSize: 12, color: disabled ? '#686868' : ink, whiteSpace: 'nowrap' }}>{label}</text></Button> }
export function DevicePairing({ engine, active, networkRevision, internet }: { engine?: EngineHandle; active: boolean; networkRevision: number; internet?: InternetSettings | null }) {
  const [state, setState] = useState<PairingState | null>(null), [invitation, setInvitation] = useState<PairingInvitation | null>(null)
  const [address, setAddress] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [now, setNow] = useState(Date.now())
  const pending = useRef(false), generation = useRef(0)
  const [route, setRoute] = useState<'auto' | 'lan' | 'internet'>('auto')
  const remote = route === 'internet' || route === 'auto' && internet?.enabled === true
  const canPair = route === 'auto' && engine?.internetSettings && !internet ? false : remote ? internet?.state === 'connected' && !!internet.url : active
  const connectionKey = remote ? `internet:${internet?.state}:${internet?.url}:${internet?.revision}` : 'lan'
  const ready = engine?.snapshot?.status === 'ready' && !!engine?.pairingState
  const receive = (next: PairingState) => setState((previous) => previous && previous.revision > next.revision ? previous : next)
  // Fence old requests before the changed route becomes interactive.
  useLayoutEffect(() => {
    const token = ++generation.current
    pending.current = false; setBusy(false); setInvitation(null); setState(null); setError(''); setNotice('')
    if (engine?.pairingState && ready) void engine.pairingState().then((next) => { if (token === generation.current) receive(next) }, (e) => { if (token === generation.current) setError(e.message) })
    return () => { generation.current++ }
  }, [engine?.pairingState, ready, networkRevision, connectionKey])
  useEffect(() => {
    if (!invitation || !engine || !ready || !canPair) return
    let stopped = false, reading = false, failures = 0
    const timer = setInterval(() => {
      const time = Date.now(); setNow(time)
      if (time >= invitation.expiresAt) { setInvitation(null); setNotice('The pairing code expired. Create a new one.'); return }
      if (reading || pending.current || failures >= 3) return
      reading = true
      void engine.pairingState().then((next) => {
        if (stopped) return
        receive(next); failures = 0
        const grant = next.grants.find((g) => g.id === invitation.id)
        if (!grant || grant.state !== 'pending') { setInvitation(null); setNotice(grant?.state === 'redeemed' ? 'Device paired.' : 'The invitation is no longer active. Create a new code.') }
      }, () => { if (!stopped && ++failures >= 3) setError('Could not refresh pairing status. Refresh to check the connection.') }).finally(() => { reading = false })
    }, 2000)
    return () => { stopped = true; clearInterval(timer) }
  }, [invitation?.id, invitation?.expiresAt, ready, canPair, engine?.pairingState])
  const run = async (effect: (live: () => boolean) => Promise<void>) => {
    if (pending.current) return
    const token = generation.current; pending.current = true; setBusy(true); setError(''); setNotice('')
    try { await effect(() => token === generation.current) } catch (e) { if (token === generation.current) setError(e instanceof Error ? e.message : String(e)) }
    finally { if (token === generation.current) { pending.current = false; setBusy(false) } }
  }
  const disabled = busy || !ready
  const remaining = invitation ? Math.max(0, Math.ceil((invitation.expiresAt - now) / 1000)) : 0
  return <div testId="device-pairing" style={{ padding: 20, borderRadius: 13, backgroundColor: '#222222', display: 'flex', flexDirection: 'column', gap: 12 }}>
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <div style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}><text style={{ fontSize: 14, color: ink, fontWeight: 600 }}>Pair a device</text><text style={{ fontSize: 12, color: muted }}>Scan a QR code or share a single-use link with a trusted device.</text></div>
      <Action id="pairing-create" label={invitation ? 'New code' : 'Pair device'} disabled={disabled || !canPair} onClick={() => void run(async (live) => { const next = await engine!.createPairing(remote ? undefined : address.trim() || undefined, remote); if (!live()) return; const state = await engine!.pairingState(); if (live()) { setNow(Date.now()); setInvitation(next); receive(state) } })} />
    </div>
    {!!engine?.internetSettings && <div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>{(['internet', 'lan'] as const).map((choice) => <Button key={choice} testId={`pairing-route-${choice}`} disabled={busy} aria-pressed={remote === (choice === 'internet')} onClick={() => setRoute(choice)} style={{ ...action, backgroundColor: remote === (choice === 'internet') ? '#373737' : '#252525' }}><text style={{ fontSize: 12, color: ink }}>{choice === 'internet' ? 'Internet' : 'LAN / HTTPS'}</text></Button>)}</div>}
    {!canPair && <text testId="pairing-unavailable" style={{ fontSize: 12, color: muted }}>{remote ? internet?.enabled ? 'Wait for internet access to connect before pairing.' : 'Enable internet access above to pair from other networks.' : 'Enable Expose managed daemon above to pair over your network.'}</text>}
    {remote ? <text style={{ fontSize: 12, color: muted }}>The QR code and links use your connected public HTTPS address.</text> : <><text style={{ fontSize: 12, color: muted }}>Leave the address blank for LAN/VPN addresses, or enter an HTTPS endpoint you already control.</text><input testId="pairing-address" value={address} readOnly={busy} placeholder="Optional HTTPS address" onChange={(e) => setAddress(e.value ?? '')} style={{ height: 32, padding: 8, borderRadius: 7, borderWidth: 1, borderColor: '#373737', backgroundColor: '#141414', color: ink, fontSize: 12 }} /></>}
    {invitation && remaining > 0 && canPair && <div testId="pairing-invitation" style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 18 }}>
      {/* GPUIX tints SVGs as a mask. Keep the white background outside that mask. */}
      <div style={{ padding: 8, borderRadius: 8, backgroundColor: '#ffffff', flexShrink: 0 }}><svg testId="pairing-qr" source={invitation.qr.replace(/<rect\b[^>]*\/>/g, '')} style={{ width: 224, height: 224, color: '#000000' }} /></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flexGrow: 1, flexBasis: 200, minWidth: 200 }}>
        <text testId="pairing-expiry" style={{ fontSize: 13, color: ink }}>{`Expires in ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`}</text>
        <text style={{ fontSize: 12, color: muted }}>The QR code contains a temporary invitation. The device exchanges it for its own credential.</text>
        {invitation.links.map((link, i) => <div key={link} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><text testId={`pairing-link-${i}`} style={{ fontSize: 11, color: '#bbbbbb', userSelect: 'text' }}>{link}</text><Action id={`pairing-copy-${i}`} label="Copy link" disabled={disabled || !clipboardAvailable()} onClick={() => void run(async (live) => { await copyText(link); if (live()) setNotice('Pairing link copied.') })} /></div>)}
        <Action id="pairing-cancel" label="Cancel invitation" disabled={disabled} onClick={() => void run(async (live) => { const id = invitation.id, next = await engine!.cancelPairing(id); if (live()) { receive(next); setInvitation(null); setNotice(next.grants.find((g) => g.id === id)?.state === 'redeemed' ? 'The device already paired. Revoke its access below if needed.' : 'Invitation canceled.') } })} />
      </div>
    </div>}
    <text style={{ fontSize: 12, color: '#d0aa79' }}>Paired devices can access tasks, files, and agents on this computer. Use a private network, VPN, or your trusted HTTPS endpoint.</text>
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}><text testId="pairing-device-count" style={{ fontSize: 12, fontWeight: 600, color: ink, flexGrow: 1 }}>{`Paired devices · ${state?.devices.length ?? 0}`}</text><Action id="pairing-refresh" label="Refresh" disabled={disabled} onClick={() => void run(async (live) => { const next = await engine!.pairingState(); if (live()) receive(next) })} /></div>
    {state?.devices.map((device) => <div key={device.id} testId={`paired-device-${device.id}`} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8, borderTopWidth: 1, borderColor: '#343434' }}>
      <div style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}><text style={{ fontSize: 12, color: ink }}>{device.name}</text><text style={{ fontSize: 11, color: muted }}>{`Paired ${new Date(device.createdAt).toLocaleDateString()} · expires ${new Date(device.expiresAt).toLocaleDateString()}`}</text></div>
      <Action id={`pairing-revoke-${device.id}`} label="Revoke" disabled={disabled} onClick={() => void run(async (live) => { const next = await engine!.revokePairedDevice(device.id, state.revision); if (live()) { receive(next); setNotice(`Access revoked for ${device.name}.`) } })} />
    </div>)}
    {notice && <text testId="pairing-notice" style={{ fontSize: 12, color: '#a5c8a1' }}>{notice}</text>}
    {error && <text testId="pairing-error" style={{ fontSize: 12, color: '#f38a8a' }}>{error}</text>}
  </div>
}
