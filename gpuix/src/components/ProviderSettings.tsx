import React, { useEffect, useState } from 'react'
import { Button } from '@gpuix/react'
import type { EngineHandle } from '../engine/use-engine'
import type { AgentInfo, ProviderUpdate } from '../../engine/src/protocol'
import { AgentIcon } from './AgentIcon'
import { CatalogPicker } from './CatalogPicker'

const ink = '#dddddd', muted = '#969696'
const input = { height: 30, fontSize: 12, color: ink, backgroundColor: '#191919', borderWidth: 1, borderColor: '#383838', borderRadius: 5, padding: 6, flexGrow: 1, minWidth: 0 }
const labels = { unchecked: 'Not checked', missing: 'Missing', unsupported: 'Unsupported', disabled: 'Disabled', installed: 'Installed · sign-in unknown', signed_out: 'Signed out', blocked: 'Policy required', ready: 'Ready · response only' }
function Action({ id, label, disabled, onClick }: { id: string; label: string; disabled?: boolean; onClick: () => void }) {
  return <Button testId={id} disabled={disabled} onClick={onClick} style={{ padding: 7, borderRadius: 5, backgroundColor: '#2c2c2c', flexShrink: 0, cursor: disabled ? undefined : 'pointer' }}>
    <text style={{ fontSize: 12, color: disabled ? '#777777' : ink, whiteSpace: 'nowrap' }}>{label}</text>
  </Button>
}
function AgentRow({ agent, busy, update }: { agent: AgentInfo; busy: boolean; update: (input: Omit<ProviderUpdate, 'revision'>) => Promise<void> }) {
  const [path, setPath] = useState(agent.command?.[0] ?? ''), [entry, setEntry] = useState(agent.command?.[1] ?? ''), [error, setError] = useState('')
  const [expanded, setExpanded] = useState(false)
  const signature = agent.command?.join('\0') ?? ''
  useEffect(() => { setPath(agent.command?.[0] ?? ''); setEntry(agent.command?.[1] ?? '') }, [signature])
  const save = (value: Omit<ProviderUpdate, 'revision'>) => { setError(''); void update({ agent: agent.id, ...value }).catch((error) => setError(error.message)) }
  const listed = agent.models.filter((model) => model.id !== 'default').length
  const executable = agent.command?.[1] ?? agent.command?.[0]
  const home = typeof process !== 'undefined' ? process.env.USERPROFILE ?? process.env.HOME : undefined
  const shortPath = executable && home && executable.toLowerCase().startsWith(home.toLowerCase()) ? `~${executable.slice(home.length)}` : executable
  const subtitle = agent.status === 'missing' ? agent.source === 'manual' ? `Executable not found: ${shortPath}` : `Not detected on PATH as ${agent.id === 'cursor' ? 'cursor-agent' : agent.id}`
    : shortPath ? `${shortPath}${listed ? ` · ${listed} listed models` : ''} · ${labels[agent.status]}` : `${labels[agent.status]}${agent.checkedAt ? ' · no executable found' : ''}`
  const dot = ['ready', 'installed'].includes(agent.status) ? '#79B88A' : ['blocked', 'signed_out', 'unsupported'].includes(agent.status) ? '#D8A568' : '#666666'
  return <div testId={`provider-${agent.id}`} style={{ display: 'flex', flexDirection: 'column', borderBottomWidth: 1, borderColor: '#303030' }}>
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', height: 66, gap: 12 }}>
      <Button testId={`provider-setup-${agent.id}`} aria-label={`Set up ${agent.name}`} onClick={() => setExpanded(!expanded)} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, flexGrow: 1, minWidth: 0, height: 64, cursor: 'pointer' }}>
        <div style={{ width: 30, height: 30, borderRadius: 7, backgroundColor: '#2c2c2c', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
          <AgentIcon id={agent.id} size={21} />
          <div style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: dot, borderWidth: 1, borderColor: '#242424', position: 'absolute', bottom: -1, right: -1 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flexGrow: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <text style={{ fontSize: 12.5, color: agent.status === 'missing' ? muted : ink, fontWeight: 600, whiteSpace: 'nowrap' }}>{agent.name}</text>
            {agent.version && <text style={{ fontSize: 11, color: '#888888', whiteSpace: 'nowrap' }}>{`v${agent.version}`}</text>}
          </div>
          <text testId={`provider-status-${agent.id}`} style={{ fontSize: 11.5, color: '#8e8e8e', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{subtitle}</text>
        </div>
        <AgentIcon id={expanded ? 'down' : 'chevron'} size={12} color="#888888" />
      </Button>
      {(agent.fingerprint || expanded || !agent.enabled) && <Button testId={`provider-enable-${agent.id}`} aria-label={`${agent.enabled ? 'Disable' : 'Enable'} ${agent.name}`} aria-checked={agent.enabled} disabled={busy} onClick={() => save({ enabled: !agent.enabled })}
        style={{ width: 36, height: 20, borderRadius: 10, backgroundColor: agent.enabled ? '#dedede' : '#494949', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: agent.enabled ? 'flex-end' : 'flex-start', paddingLeft: 3, paddingRight: 3, marginLeft: 5, opacity: busy ? 0.45 : 1, flexShrink: 0, cursor: 'pointer' }}>
        <div style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: agent.enabled ? '#2c2c2c' : '#b6b6b6', pointerEvents: 'none' }} />
      </Button>}
    </div>
    {expanded && <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 5, paddingBottom: 18, paddingLeft: 42 }}>
    <text style={{ fontSize: 12, color: muted }}>{agent.detail}</text>
    <text testId={`provider-evidence-${agent.id}`} style={{ fontSize: 11, color: muted }}>{`${agent.version ? `Version ${agent.version}` : 'Version unknown'} · ${agent.checkedAt ? `Checked ${new Date(agent.checkedAt).toLocaleString()}` : 'Never checked'} · ${agent.source ?? 'No executable'}`}</text>
    <text style={{ fontSize: 11, color: muted }}>Executable path</text>
    <input testId={`provider-path-${agent.id}`} value={path} placeholder="Absolute executable path" style={input} onChange={(event) => setPath(event.value ?? '')} />
    <text style={{ fontSize: 11, color: muted }}>Script entry point (optional, for Node installations)</text>
    <input testId={`provider-entry-${agent.id}`} value={entry} placeholder="Absolute JS entry point, or leave empty" style={input} onChange={(event) => setEntry(event.value ?? '')} />
    <div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
      <Action id={`provider-save-${agent.id}`} label="Save path" disabled={busy || !path.trim()} onClick={() => save({ command: [path.trim(), ...(entry.trim() ? [entry.trim()] : [])] })} />
      <Action id={`provider-auto-${agent.id}`} label="Use automatic discovery" disabled={busy} onClick={() => save({ command: null })} />
    </div>
    {agent.id === 'cursor' && <>
      <text style={{ fontSize: 11, color: muted }}>Cursor requires workspace trust before reading project context. Enable only for projects you trust.</text>
      <Action id="provider-trust-cursor" label={agent.trustWorkspace ? 'Workspace trust enabled · turn off' : 'Allow workspace trust'} disabled={busy} onClick={() => save({ trustWorkspace: !agent.trustWorkspace })} />
    </>}
    <text style={{ fontSize: 11, color: muted }}>{agent.capabilities.responses ? `Responses · cancellation · ${agent.capabilities.instructions === 'supplied-only' ? 'supplied instructions' : 'native and supplied instructions'}` : 'Response capability not verified'}</text>
    <text style={{ fontSize: 11, color: muted }}>{`${agent.capabilities.nativeContinuation ? 'Recorded native conversation continuation' : 'Native continuation not verified'} · Coding approvals are unavailable.`}</text>
    </div>}
    {error && <text testId={`provider-error-${agent.id}`} style={{ fontSize: 12, color: '#F87171' }}>{error}</text>}
  </div>
}
export function ProviderSettings({ engine }: { engine?: EngineHandle }) {
  const state = engine?.snapshot.providers
  const [error, setError] = useState(''), [saving, setSaving] = useState(false)
  const [now, setNow] = useState(Date.now)
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer) }, [])
  const update = async (value: Omit<ProviderUpdate, 'revision'>) => {
    if (!engine) throw new Error('Provider setup requires a connected desktop engine')
    setSaving(true)
    try { await engine.updateProviders(value) } finally { setSaving(false) }
  }
  const run = (action: () => Promise<void>) => { setError(''); void action().catch((error) => setError(error.message)) }
  const busy = saving || state?.refreshing || engine?.snapshot.status !== 'ready'
  const checked = Math.max(0, ...state?.agents.map((agent) => agent.checkedAt ?? 0) ?? [])
  const minutes = Math.max(0, Math.floor((now - checked) / 60000))
  return <div testId="provider-settings" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <text style={{ fontSize: 18, fontWeight: 600, color: ink, marginBottom: 4 }}>Providers</text>
    <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 13, backgroundColor: '#242424', paddingLeft: 20, paddingRight: 20, paddingBottom: 8 }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 16, paddingTop: 16, paddingBottom: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flexGrow: 1, minWidth: 0 }}>
          <text style={{ fontSize: 13, fontWeight: 600, color: ink }}>Coding agents</text>
          <text style={{ fontSize: 12, lineHeight: 18, color: '#a0a0a0' }}>Hiroshi uses CLIs installed on this computer. Sign in with each agent's own CLI, then refresh.</text>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
          <Button testId="providers-refresh" disabled={!!busy || !state} onClick={() => run(engine!.refreshProviders)} style={{ height: 28, paddingLeft: 10, paddingRight: 10, borderRadius: 7, borderWidth: 1, borderColor: '#3b3b3b', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6, opacity: busy ? 0.5 : 1, cursor: 'pointer' }}><AgentIcon id="refresh" size={12} color="#999999" /><text style={{ fontSize: 11.5, color: '#b7b7b7', whiteSpace: 'nowrap' }}>{state?.refreshing ? 'Checking…' : 'Refresh'}</text></Button>
          <text style={{ fontSize: 11, color: '#777777', whiteSpace: 'nowrap' }}>{checked ? minutes === 0 ? 'Checked just now' : `Checked ${minutes}m ago` : 'Not checked yet'}</text>
        </div>
      </div>
      {state?.refreshing && <Action id="providers-cancel" label="Cancel refresh" onClick={() => run(engine!.cancelProviderRefresh)} />}
      {state?.agents.map((agent) => <AgentRow key={agent.id} agent={agent} busy={!!busy} update={update} />)}
    </div>
    {!state && <text testId="providers-unavailable" style={{ fontSize: 13, color: muted }}>Provider setup requires a connected desktop engine. No installation or sign-in check has run.</text>}
    {(error || state?.error) && <text testId="providers-error" style={{ fontSize: 12, color: '#F87171' }}>{error || state!.error!}</text>}
    {state && <>
      <text style={{ fontSize: 15, color: ink, fontWeight: 600 }}>Default agent and model</text>
      <CatalogPicker triggerId="provider-choose-default" valueTestId="provider-default" itemPrefix="provider-default-" allowReselect disabled={!!busy} value={state.defaultModel}
        choices={state.models.map((model) => ({ id: model.id, label: `${model.label}${model.reason ? ` · ${model.reason}` : ''}`, group: model.provider, disabled: !!model.reason }))}
        onChange={(defaultModel) => run(() => update({ defaultModel }))} />
    </>}
  </div>
}
