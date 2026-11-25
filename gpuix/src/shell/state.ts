import { currentEngineHome } from '../../engine/src/home'

export interface Bounds { x: number; y: number; width: number; height: number }
export interface WindowState {
  width: number; height: number; x?: number; y?: number; display?: string; maximized?: boolean
  sessionID?: string; surface: 'none' | 'terminal' | 'browser' | 'review' | 'files' | 'editor'; panelOpen: boolean
  sidebarWidth: number; panelWidth: number; sidebarCollapsed: boolean
}
const defaults: WindowState = { width: 1180, height: 820, surface: 'none', panelOpen: false, sidebarWidth: 260, panelWidth: 480, sidebarCollapsed: false }
export function clampBounds(bounds: Bounds, area: Bounds): Bounds {
  const width = Math.min(Math.max(700, bounds.width), area.width)
  const height = Math.min(Math.max(500, bounds.height), area.height)
  return { width, height, x: Math.min(Math.max(bounds.x, area.x), area.x + area.width - width), y: Math.min(Math.max(bounds.y, area.y), area.y + area.height - height) }
}
function valid(value: unknown): WindowState {
  if (!value || typeof value !== 'object') return { ...defaults }
  const input = value as Record<string, unknown>, state = { ...defaults }
  for (const key of ['width', 'height', 'sidebarWidth', 'panelWidth'] as const) if (typeof input[key] === 'number' && Number.isFinite(input[key])) {
    const [min, max] = key === 'sidebarWidth' ? [180, 460] : key === 'panelWidth' ? [460, 960] : key === 'width' ? [700, 16384] : [500, 16384]
    state[key] = Math.min(max, Math.max(min, input[key]))
  }
  for (const key of ['x', 'y'] as const) if (typeof input[key] === 'number' && Number.isFinite(input[key]) && Math.abs(input[key]) < 100000) state[key] = input[key]
  for (const key of ['panelOpen', 'sidebarCollapsed', 'maximized'] as const) if (typeof input[key] === 'boolean') state[key] = input[key]
  if (typeof input.display === 'string') state.display = input.display
  if (typeof input.sessionID === 'string' && /^ses_[\w-]+$/.test(input.sessionID)) state.sessionID = input.sessionID
  if (['none', 'terminal', 'browser', 'review', 'files', 'editor'].includes(String(input.surface))) state.surface = input.surface as WindowState['surface']
  return state
}
function location(home: string) { return require('node:path').join(home, 'shell.json') as string }
export function readProjectSelection(launcher: string, home = currentEngineHome()): { cwd: string; sessionID: string } | null {
  try {
    const value = JSON.parse(require('node:fs').readFileSync(location(home), 'utf8')).selections?.[launcher]
    return value && typeof value.cwd === 'string' && typeof value.sessionID === 'string' && /^ses_[\w-]+$/.test(value.sessionID) ? value : null
  } catch { return null }
}
export function saveProjectSelection(launcher: string, cwd: string, sessionID: string, home = currentEngineHome()): void {
  const fs = require('node:fs') as typeof import('node:fs')
  let data: any = { version: 1, workspaces: {} }
  try { const saved = JSON.parse(fs.readFileSync(location(home), 'utf8')); if (saved.version === 1 && saved.workspaces) data = saved } catch {}
  data.selections = { ...data.selections, [launcher]: { cwd, sessionID } }
  fs.mkdirSync(home, { recursive: true })
  const temporary = `${location(home)}.${process.pid}.tmp`
  fs.writeFileSync(temporary, JSON.stringify(data), { mode: 0o600 }); fs.renameSync(temporary, location(home))
}
export function readWindowState(workspace: string, home = currentEngineHome()): WindowState {
  try { const data = JSON.parse(require('node:fs').readFileSync(location(home), 'utf8')); return valid(data.version === 1 ? data.workspaces?.[workspace]?.current : null) }
  catch { return { ...defaults } }
}
/** Preferences only: engine messages and run state never enter this file. */
export function saveWindowState(workspace: string, patch: Partial<WindowState>, home = currentEngineHome()): void {
  const fs = require('node:fs') as typeof import('node:fs')
  let data: any = { version: 1, workspaces: {} }
  try { const saved = JSON.parse(fs.readFileSync(location(home), 'utf8')); if (saved.version === 1 && saved.workspaces) data = saved } catch {}
  const previous = data.workspaces[workspace] ?? { displays: {} }
  const next = valid({ ...previous.current, ...patch })
  data.workspaces[workspace] = { current: next, displays: { ...previous.displays, ...(next.display ? { [next.display]: next } : {}) } }
  fs.mkdirSync(home, { recursive: true })
  const temporary = `${location(home)}.${process.pid}.tmp`
  fs.writeFileSync(temporary, JSON.stringify(data), { mode: 0o600 })
  fs.renameSync(temporary, location(home))
}
