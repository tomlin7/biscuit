/** Directory identity belongs to a session, independently of the active window. */
import { accessSync, constants, opendirSync, realpathSync, statSync } from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { invalid, notFound } from './errors'
import type { Session, ProjectInfo } from './protocol'
import type { Store } from './store'

export function directory(cwd: string) {
  if (typeof cwd !== 'string' || !cwd || cwd.length > 8192 || cwd.includes('\0')) throw invalid('workspace_path', 'Choose an existing project folder.')
  const canonical = realpathSync(cwd), stat = statSync(canonical, { bigint: true })
  if (!stat.isDirectory()) throw invalid('workspace_directory', 'Choose a folder, rather than a file.')
  accessSync(canonical, constants.R_OK)
  if (process.platform !== 'win32') accessSync(canonical, constants.X_OK)
  const handle = opendirSync(canonical); handle.closeSync()
  return { cwd: canonical, identity: `${stat.dev}:${stat.ino}:${stat.birthtimeNs}` }
}
export function project(session: Pick<Session, 'id' | 'cwd' | 'workspaceIdentity'>): ProjectInfo {
  const base = { cwd: session.cwd, name: path.basename(session.cwd) || session.cwd, sessionID: session.id,
    id: createHash('sha256').update(`${session.cwd}\0${session.workspaceIdentity ?? ''}`).digest('hex').slice(0, 24) }
  try {
    const current = directory(session.cwd)
    if (session.workspaceIdentity ? current.identity !== session.workspaceIdentity : current.cwd !== session.cwd) return { ...base,
      status: 'changed', detail: 'This path now identifies a different folder. Open the folder explicitly to start a new task; earlier history retains its original workspace.' }
    return { ...base, status: 'ready', detail: null }
  } catch (error) {
    const missing = ['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? '')
    return { ...base, status: missing ? 'missing' : 'inaccessible', detail: missing
      ? 'Project folder was moved or removed. Open its current folder to start a new task; this history remains available.'
      : 'Project folder cannot be read. Restore folder access or open another project.' }
  }
}
export function assertWorkspace(store: Store, id: string): Session {
  const session = store.session(id)
  if (!session) throw notFound('session')
  const info = project(session)
  if (info.status !== 'ready') throw invalid(`workspace_${info.status}`, info.detail!)
  return session
}
