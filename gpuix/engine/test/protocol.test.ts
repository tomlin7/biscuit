/**
 * The contract, tested as a contract.
 *
 * The interesting failures are drift, not behaviour: an operation that exists
 * in the table but not in the shapes, an event nobody decided how to draw, a
 * client method whose path is not the one the daemon routes. Half of this file
 * is compile-time (the exhaustive maps below) and half runs the matcher and
 * the generated client against exactly what the table says.
 */

import { describe, expect, test } from 'bun:test'

import { engineClient } from '../../src/engine/client'
import {
  FEED_PATH,
  matchOperation,
  operations,
  type EventType,
  type OperationName,
} from '../src/protocol'

/**
 * One name per shape and per event.
 *
 * These are mapped types, not arrays: adding an operation or an event to the
 * shape module makes this file fail to typecheck until its name is listed
 * here, which is what keeps the assertions below exhaustive.
 */
const everyOperation: { [Name in OperationName]: Name } = {
  pairingState: 'pairingState', createPairing: 'createPairing', cancelPairing: 'cancelPairing', revokePairedDevice: 'revokePairedDevice', internetSettings: 'internetSettings', updateInternet: 'updateInternet',
  updateAccess: 'updateAccess',
  freshCliConversation: 'freshCliConversation',
  usageReport: 'usageReport', updateUsagePricing: 'updateUsagePricing', networkSettings: 'networkSettings',
  updateNetwork: 'updateNetwork', networkToken: 'networkToken', rotateNetworkToken: 'rotateNetworkToken',
  providers: 'providers',
  projects: 'projects',
  openProject: 'openProject',
  refreshProviders: 'refreshProviders',
  cancelProviderRefresh: 'cancelProviderRefresh',
  updateProviders: 'updateProviders',
  workspaceList: 'workspaceList',
  workspaceFile: 'workspaceFile',
  workspaceReview: 'workspaceReview',
  skills: 'skills',
  skillDocument: 'skillDocument',
  updateSkill: 'updateSkill',
  removeSkill: 'removeSkill',
  workspaceCommit: 'workspaceCommit',
  browse: 'browse',
  rewind: 'rewind',
  answerPermission: 'answerPermission',
  toolOutput: 'toolOutput',
  models: 'models',
  health: 'health',
  listSessions: 'listSessions',
  createSession: 'createSession',
  session: 'session',
  prompt: 'prompt',
  interrupt: 'interrupt',
  startRun: 'startRun',
  run: 'run',
  cancelRun: 'cancelRun',
  shutdown: 'shutdown',
}

const everyEvent: { [Type in EventType]: Type } = {
  'access.updated': 'access.updated', 'access.reviewed': 'access.reviewed',
  'cli.updated': 'cli.updated',
  'providers.updated': 'providers.updated',
  'execution.updated': 'execution.updated',
  'session.created': 'session.created',
  'session.updated': 'session.updated',
  'prompt.admitted': 'prompt.admitted',
  'prompt.delivered': 'prompt.delivered',
  'context.compacted': 'context.compacted',
  'context.prepared': 'context.prepared',
  'checkpoint.created': 'checkpoint.created',
  'checkpoint.failed': 'checkpoint.failed',
  'rewind.started': 'rewind.started',
  'rewind.failed': 'rewind.failed',
  'rewind.completed': 'rewind.completed',
  'tool.updated': 'tool.updated',
  'permission.requested': 'permission.requested',
  'permission.answered': 'permission.answered',
  'step.part': 'step.part',
  'step.started': 'step.started',
  'step.resumed': 'step.resumed',
  'step.retry': 'step.retry',
  'step.output': 'step.output',
  'step.completed': 'step.completed',
  'step.failed': 'step.failed',
  'step.cancelled': 'step.cancelled',
  'run.started': 'run.started',
  'run.output': 'run.output',
  'run.truncated': 'run.truncated',
  'run.ended': 'run.ended',
}

/** A concrete path for a template, so the matcher can be pointed at it. */
function concrete(template: string): string {
  return template.replace(/:([a-zA-Z]+)/g, (_, name: string) => `value-${name}`)
}

describe('the operation table', () => {
  test('has exactly one row for every operation shape', () => {
    const rows = operations.map((operation) => operation.name).sort()
    expect(rows).toEqual(Object.values(everyOperation).sort())
    expect(new Set(rows).size).toBe(rows.length)
  })

  test('does not declare the same method and path twice', () => {
    const routes = operations.map((operation) => `${operation.method} ${operation.path}`)
    expect(new Set(routes).size).toBe(routes.length)
  })

  test('matches every row it declares, and hands back the path fields', () => {
    for (const operation of operations) {
      const matched = matchOperation(operation.method, concrete(operation.path))
      expect(matched?.operation.name).toBe(operation.name)

      for (const [, name] of operation.path.matchAll(/:([a-zA-Z]+)/g)) {
        expect(matched?.params[name!]).toBe(`value-${name}`)
      }
    }
  })

  test('reads the method without caring about its case', () => {
    expect(matchOperation('get', '/v1/health')?.operation.name).toBe('health')
    expect(matchOperation('pOsT', '/v1/sessions')?.operation.name).toBe('createSession')
  })

  test('decodes a path field, so an id may contain a slash', () => {
    expect(matchOperation('GET', '/v1/sessions/ses%2Fone')?.params.id).toBe('ses/one')
  })

  test('refuses a path, a method or a segment it does not declare', () => {
    expect(matchOperation('GET', '/v1/nope')).toBeNull()
    expect(matchOperation('GET', '/v2/health')).toBeNull()
    expect(matchOperation('DELETE', '/v1/sessions')).toBeNull()
    // The row is `POST /v1/sessions/:id/runs`; a GET is not a run.
    expect(matchOperation('GET', '/v1/sessions/one/runs')).toBeNull()
    // A path field that is not valid percent-encoding is not a route either.
    expect(matchOperation('GET', '/v1/sessions/%zz')).toBeNull()
  })

  test('keeps the feed out of the command table', () => {
    // The feed answers with a stream, not a body: it is routed on its own, and
    // the client builds its URL from the same constant.
    expect(operations.some((operation) => operation.path === FEED_PATH)).toBe(false)
    expect(matchOperation('GET', FEED_PATH)).toBeNull()
  })
})

describe('the event table', () => {
  test('names every event `resource.action`, so a filter can read it', () => {
    for (const type of Object.values(everyEvent)) {
      expect(type).toMatch(/^[a-z]+\.[a-z]+$/)
    }
  })
})

describe('the generated client', () => {
  test('has a method for every row, without one being written by hand', () => {
    const client = engineClient({ url: 'http://127.0.0.1:1', token: 'test' })
    for (const name of Object.values(everyOperation)) {
      expect(typeof client[name]).toBe('function')
    }
    expect(typeof client.feed).toBe('function')
  })

  test('sends the method and path its row declares, and only the rest as the body', async () => {
    const calls: Array<{ method: string; url: string; body: string | undefined }> = []
    const fake = (async (url: string, init: RequestInit) => {
      calls.push({ method: init.method!, url: String(url), body: init.body as string | undefined })
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }) as unknown as typeof fetch

    const client = engineClient({ url: 'http://engine.test/', token: 'test' }, fake)
    await client.prompt({ id: 'ses_1', text: 'hello', mode: 'steer', key: 'k1' })
    await client.interrupt({ id: 'ses_1', reason: 'the build is broken' })
    await client.session({ id: 'ses_1' })
    await client.health()
    await client.shutdown()

    expect(calls).toEqual([
      {
        method: 'POST',
        url: 'http://engine.test/v1/sessions/ses_1/messages',
        body: JSON.stringify({ text: 'hello', mode: 'steer', key: 'k1' }),
      },
      {
        method: 'POST',
        url: 'http://engine.test/v1/sessions/ses_1/interrupt',
        body: JSON.stringify({ reason: 'the build is broken' }),
      },
      { method: 'GET', url: 'http://engine.test/v1/sessions/ses_1', body: undefined },
      { method: 'GET', url: 'http://engine.test/v1/health', body: undefined },
      { method: 'POST', url: 'http://engine.test/v1/shutdown', body: JSON.stringify({}) },
    ])
  })
})
