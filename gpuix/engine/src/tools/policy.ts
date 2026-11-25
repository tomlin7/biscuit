import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { PermissionAction } from '../protocol'

export interface ToolPolicy {
  rules?: { tool: string; action: PermissionAction }[]
  alwaysAsk?: boolean
}

export function readToolPolicy(file: string): ToolPolicy {
  try {
    const value = JSON.parse(readFileSync(file, 'utf8'))
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
      (value.alwaysAsk !== undefined && typeof value.alwaysAsk !== 'boolean') ||
      (value.rules !== undefined && !Array.isArray(value.rules))) throw new Error('shape')
    for (const rule of value.rules ?? []) {
      if (!rule || typeof rule.tool !== 'string' || !/^(\*|[a-zA-Z0-9_-]{1,64})$/.test(rule.tool) ||
        !['allow', 'ask', 'deny'].includes(rule.action)) throw new Error('rule')
    }
    return value
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}
    throw new Error('invalid tool policy; execution is blocked until it is corrected')
  }
}

/** Last matching rule wins inside each source. Repository policy can lower
 * permission, never grant more than the user's gate. Files are re-read before
 * every claim, including after an approval was answered. */
export function permissionPolicy(home: string, cwd: string, tool: string, fallback: PermissionAction = 'ask'): {
  action: PermissionAction; source: 'user' | 'repository'; alwaysAsk: boolean; fromMode: boolean
} {
  const user = readToolPolicy(join(home, 'tools.json'))
  const repository = readToolPolicy(join(cwd, '.hiroshi', 'tools.json'))
  const match = (policy: ToolPolicy, fallback: PermissionAction) => {
    let action = fallback
    for (const rule of policy.rules ?? []) if (rule.tool === '*' || rule.tool === tool) action = rule.action
    return action
  }
  const local = match(repository, 'allow')
  if (local === 'deny') return { action: 'deny', source: 'repository', alwaysAsk: false, fromMode: false }
  const action = match(user, fallback)
  const alwaysAsk = user.alwaysAsk === true || repository.alwaysAsk === true
  return { action: action !== 'deny' && (alwaysAsk || local === 'ask') ? 'ask' : action, source: 'user', alwaysAsk,
    fromMode: !alwaysAsk && local !== 'ask' && !(user.rules ?? []).some((rule) => rule.tool === '*' || rule.tool === tool) }
}
