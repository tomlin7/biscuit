/** An error the HTTP layer can serialise without leaking a stack. */
export class EngineError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'EngineError'
  }
}

export function invalid(code: string, message: string): EngineError {
  return new EngineError(400, code, message)
}

export function notFound(what: string): EngineError {
  return new EngineError(404, 'not_found', `${what} not found`)
}

export function conflict(code: string, message: string): EngineError {
  return new EngineError(409, code, message)
}
