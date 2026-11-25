/** A tool is a value. Built-ins, plugins and external adapters register here. */
import Ajv, { type ValidateFunction } from 'ajv'
import { createHash } from 'node:crypto'
import type { ToolDefinition } from '../protocol'

export interface ToolContext {
  cwd: string
  sessionID: string
  callID: string
  signal: AbortSignal
}

export interface Tool extends ToolDefinition {
  accessKind?: 'read' | 'edit' | 'command'
  version: string
  run: (input: any, context: ToolContext) => Promise<unknown>
}

export interface RegisteredTool {
  accessKind?: Tool['accessKind']
  definition: ToolDefinition
  revision: string
  input: ValidateFunction
  output: ValidateFunction
  run: Tool['run']
}

/** Canonical JSON prevents property order from changing an approval's scope. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

export function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function freeze(value: any): void {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return
  for (const child of Object.values(value)) freeze(child)
  Object.freeze(value)
}

export class ToolRegistry {
  readonly #ajv = new Ajv({ strict: true, allErrors: false, coerceTypes: false, useDefaults: false })
  readonly #entries = new Map<string, RegisteredTool>()
  readonly #generations = new Map<string, number>()

  register(tool: Tool): void {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(tool.name) || !tool.description || !tool.version || typeof tool.run !== 'function') {
      throw new Error('a tool needs a valid name, description, version and runner')
    }
    const definition = structuredClone({ name: tool.name, description: tool.description,
      inputSchema: tool.inputSchema, outputSchema: tool.outputSchema })
    // Compile before replacing the old registration. An invalid replacement
    // cannot remove a working tool or mutate the schemas already advertised.
    const input = this.#ajv.compile(definition.inputSchema)
    const output = this.#ajv.compile(definition.outputSchema)
    freeze(definition)
    const generation = (this.#generations.get(tool.name) ?? 0) + 1
    const revision = digest(canonical(definition) + tool.version + tool.run.toString() + generation + (tool.accessKind ?? 'unknown'))
    this.#generations.set(tool.name, generation)
    this.#entries.set(tool.name, Object.freeze({ definition, revision, input, output, run: tool.run, accessKind: tool.accessKind }))
  }

  get(name: string): RegisteredTool | undefined { return this.#entries.get(name) }
  definitions(): ToolDefinition[] { return [...this.#entries.values()].map((entry) => structuredClone(entry.definition)) }
}
