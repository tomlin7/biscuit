import { expect, test } from 'bun:test'
import { rmSync } from 'node:fs'
import { NetworkAccess } from '../src/network-access'
import { InternetAccess, type TunnelFactory } from '../src/internet-access'
import { Store } from '../src/store'
import { Sessions } from '../src/sessions'
import { Feed } from '../src/feed'
import { silentLogger } from '../src/log'
import { engineClient, type EngineClient } from '../../src/engine/client'
import { daemonFetch } from '../src/local-transport'
import { tempHome, until } from './harness'
import type { EngineEvent } from '../src/protocol'

test('controlled tunnel loss resumes real durable events; revocation and disable close only their own gateway streams', async () => {
  const home = tempHome(), store = Store.open(':memory:'); store.migrate()
  const sessions = new Sessions(store, silentLogger(), { cwd: home }), feed = new Feed(store)
  const network = new NetworkAccess(home, async (request) => {
    const url = new URL(request.url)
    if (url.pathname === '/v1/events') {
      const connection = feed.open(Number(url.searchParams.get('after') ?? 0))
      request.signal.addEventListener('abort', () => connection.close(), { once: true })
      return new Response(connection.stream, { headers: { 'content-type': 'text/event-stream' } })
    }
    return Response.json({ ok: true })
  }, 'private-owner')
  let target = '', emit: Parameters<Awaited<ReturnType<TunnelFactory>>['connect']>[0]['onEvent'] = () => {}
  const factory: TunnelFactory = async () => ({ connect: async (input) => {
    const route = Object.keys(input.routes)[0]!; target = input.routes[route]!; emit = input.onEvent
    return { urls: { [route]: `https://${route}.example.invalid` }, closed: new Promise<void>((resolve) => input.signal.addEventListener('abort', () => resolve(), { once: true })) }
  }, dispose: async () => {} })
  const internet = new InternetAccess(home, network, { factory })
  const streams: { controller: AbortController; done: Promise<void> }[] = []
  const listen = (client: EngineClient, after: number) => {
    const controller = new AbortController(), events: EngineEvent[] = []; let opened = false, ended = false
    const done = client.feed({ after, signal: controller.signal, onOpen: () => { opened = true }, onEvent: (event) => events.push(event) }).then(() => { ended = true }, () => { ended = true })
    streams.push({ controller, done }); return { controller, done, events, opened: () => opened, ended: () => ended }
  }
  try {
    await internet.update({ revision: 0, enabled: true }); await until(() => internet.snapshot().state === 'connected')
    const base = `http://${target}`
    const pair = async (name: string) => {
      const invitation = internet.invite(), response = await daemonFetch(base + '/v1/pairing/redeem', { method: 'POST', body: JSON.stringify({ code: JSON.parse(invitation.payload).code, name }) })
      expect(response.status).toBe(200); return await response.json() as { token: string; device: { id: string } }
    }
    const phone = await pair('Phone'), tablet = await pair('Tablet')
    const phoneClient = engineClient({ url: base, token: phone.token }), tabletClient = engineClient({ url: base, token: tablet.token })
    const first = listen(phoneClient, store.lastSeq()), other = listen(tabletClient, store.lastSeq())
    await until(() => first.opened() && other.opened())
    sessions.create({}); await until(() => first.events.length === 1 && other.events.length === 1)
    const cursor = first.events[0]!.seq
    first.controller.abort(); await first.done
    emit({ type: 'disconnected', reason: 'controlled network interruption' })
    expect(() => internet.invite()).toThrow('Wait for internet access')
    sessions.create({}); sessions.create({})
    emit({ type: 'connected', session: 'reconnected', routes: [] })
    const resumed = listen(phoneClient, cursor)
    await until(() => resumed.events.length === 2)
    expect(resumed.events.map((event) => event.seq)).toEqual(store.eventsSince(cursor).map((event) => event.seq))
    network.revokeDevice(phone.device.id, network.pairing.state().revision)
    await until(resumed.ended)
    expect((await daemonFetch(base + '/v1/health', { headers: { authorization: `Bearer ${phone.token}` } })).status).toBe(401)
    sessions.create({}); await until(() => other.events.length === 4)
    expect(other.ended()).toBe(false)
    await internet.update({ revision: 1, enabled: false }); await until(other.ended)
    expect(internet.snapshot()).toMatchObject({ state: 'disabled', url: null })
    expect(network.pairing.authenticate(tablet.token)?.id).toBe(tablet.device.id)
  } finally {
    for (const stream of streams) stream.controller.abort()
    await Promise.all(streams.map((stream) => stream.done)); await internet.close(); network.close(); feed.close(); store.close(); rmSync(home, { recursive: true, force: true })
  }
}, 15000)
