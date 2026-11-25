/**
 * The engine's log.
 *
 * One line per fact, appended to a file next to the database and echoed on
 * stderr so a foreground `serve` is readable. The file is rotated once per
 * launch instead of per write: the previous run stays readable as
 * `engine.log.1`, which is what a bug report needs and what a streaming
 * command must not be able to grow without bound.
 */

import { appendFileSync, existsSync, mkdirSync, renameSync, statSync } from 'node:fs'
import path from 'node:path'

const MAX_BYTES = 4 * 1024 * 1024

export interface Logger {
  info(message: string, fields?: Record<string, unknown>): void
  warn(message: string, fields?: Record<string, unknown>): void
  error(message: string, fields?: Record<string, unknown>): void
  child(scope: string): Logger
}

function format(message: string, fields?: Record<string, unknown>): string {
  const stamp = new Date().toISOString()
  if (!fields || Object.keys(fields).length === 0) return `[${stamp}] ${message}`
  return `[${stamp}] ${message} ${JSON.stringify(fields)}`
}

export function createLogger(file: string | null, scope?: string): Logger {
  if (file) {
    mkdirSync(path.dirname(file), { recursive: true })
    try {
      if (existsSync(file) && statSync(file).size > MAX_BYTES) renameSync(file, `${file}.1`)
    } catch {
      // A log that cannot rotate must not stop the daemon.
    }
  }

  const write = (level: string, message: string, fields?: Record<string, unknown>) => {
    const line = format(`${scope ? `[${scope}] ` : ''}${level} ${message}`, fields)
    try {
      if (file) appendFileSync(file, `${line}\n`)
    } catch {
      // The file is a convenience; stderr is the contract.
    }
    if (level === 'error') console.error(line)
    else console.log(line)
  }

  return {
    info: (message, fields) => write('info', message, fields),
    warn: (message, fields) => write('warn', message, fields),
    error: (message, fields) => write('error', message, fields),
    child: (childScope) => createLogger(file, scope ? `${scope}:${childScope}` : childScope),
  }
}

export function silentLogger(): Logger {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
    child: () => silentLogger(),
  }
}
