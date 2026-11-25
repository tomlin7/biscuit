import path from 'node:path'

import { currentEngineHome } from './home'

export interface EnginePaths {
  home: string
  database: string
  registry: string
  lock: string
  logs: string
  log: string
}

export function enginePaths(home: string = currentEngineHome()): EnginePaths {
  const logs = path.join(home, 'logs')
  return {
    home,
    database: path.join(home, 'engine.db'),
    registry: path.join(home, 'engine.json'),
    lock: path.join(home, 'engine.lock'),
    logs,
    log: path.join(logs, 'engine.log'),
  }
}
