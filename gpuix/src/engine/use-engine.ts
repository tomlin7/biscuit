/**
 * The cockpit's one engine connection.
 *
 * Mount it once. It ensures a daemon, reads the session snapshot at the
 * engine's watermark, then follows the feed forever, reattaching with backoff
 * when the daemon restarts. Everything the cockpit shows about a run comes
 * through here: there is no local run state to fall out of step with.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'

import type { CliConversation, DeliveryMode, WorkspaceDirectory, WorkspaceFile, WorkspaceReview, BrowserPage, OperationRequest, ProviderUpdate, ProviderState, NetworkSettings, NetworkUpdate, UsageQuery, UsageReport, UsagePricingUpdate } from '../../engine/src/protocol'
import { EngineRequestError, engineClient, type EngineClient } from './client'
import { apply, hydrate, initialSnapshot, type Snapshot } from './reducer'
import { ensureEngine, stopEngine } from './supervisor'
import { readWindowState } from '../shell/state'
import { createPromptStore } from '../shell/prompt-store'
import { PromptDraftController, type DraftView } from './prompt-draft'

export interface EngineHandle {
  pairingState: () => Promise<import('../../engine/src/protocol').PairingState>
  createPairing: (address?: string, remote?: boolean) => Promise<import('../../engine/src/protocol').PairingInvitation>
  internetSettings: () => Promise<import('../../engine/src/protocol').InternetSettings>
  updateInternet: (input: { revision: number; enabled: boolean }) => Promise<import('../../engine/src/protocol').InternetSettings>
  cancelPairing: (grantID: string) => Promise<import('../../engine/src/protocol').PairingState>
  revokePairedDevice: (deviceID: string, revision: number) => Promise<import('../../engine/src/protocol').PairingState>
  skills: () => Promise<import('../../engine/src/protocol').SkillInventory>
  skillDocument: (input: import('../../engine/src/protocol').SkillSelection) => Promise<import('../../engine/src/protocol').SkillDocument>
  updateSkill: (input: Omit<OperationRequest<'updateSkill'>, 'id'>) => Promise<import('../../engine/src/protocol').SkillInventory>
  removeSkill: (input: Omit<OperationRequest<'removeSkill'>, 'id'>) => Promise<import('../../engine/src/protocol').OperationResponse<'removeSkill'>>
  updateAccess: (id: string, mode: import('../../engine/src/protocol').AccessMode, revision: number) => Promise<void>
  freshCliConversation: (conversation: CliConversation, key: string) => Promise<void>
  usageReport: (input: UsageQuery) => Promise<UsageReport>
  updateUsagePricing: (input: UsagePricingUpdate) => Promise<void>
  networkSettings: () => Promise<NetworkSettings>
  updateNetwork: (input: NetworkUpdate) => Promise<NetworkSettings>
  networkToken: () => Promise<string>
  rotateNetworkToken: (revision: number) => Promise<NetworkSettings>
  openProject: (cwd: string) => Promise<void>
  refreshProjects: () => Promise<void>
  refreshProviders: () => Promise<void>
  cancelProviderRefresh: () => Promise<void>
  updateProviders: (input: Omit<ProviderUpdate, 'revision'>) => Promise<void>
  selectSession: (id: string) => void
  newSession: (projectless?: boolean) => Promise<void>
  workspaceList: (path?: string) => Promise<WorkspaceDirectory>
  workspaceFile: (path: string) => Promise<WorkspaceFile>
  workspaceReview: (base?: string) => Promise<WorkspaceReview>
  workspaceCommit: (input: Omit<OperationRequest<'workspaceCommit'>, 'id'>) => Promise<string>
  browse: (url: string) => Promise<BrowserPage>
  rewind: (checkpointID: string, key: string) => Promise<void>
  snapshot: Snapshot
  answerPermission: (id: string, decision: 'allow' | 'deny', remember: boolean) => Promise<void>
  toolOutput: (id: string) => Promise<{ path: string; text: string }>
  /** Run a command in the engine's session for this workspace. */
  exec: (command: string) => void
  /** Admit a prompt to the session's inbox; it is delivered at a boundary. */
  prompt: (text: string, mode?: DeliveryMode, model?: string) => Promise<boolean>
  draft: DraftView
  editDraft: (text: string) => void
  retryPrompt: () => void
  forgetPrompt: () => void
  discardDraft: () => void
  reloadDraft: () => void
  /** Stop every run the session is holding, keeping the pending inbox. */
  interrupt: () => void
  cancel: (runID: string) => void
  restart: () => void
}

export interface EngineOptions {
  initialSessionID?: string
  initialWorkspace?: string
  enabled: boolean
  workspace: string
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function describe(error: unknown): string {
  if (error instanceof EngineRequestError) return error.message
  if (error instanceof Error) return error.message
  return String(error)
}

export function useEngine({ enabled, workspace, initialSessionID, initialWorkspace }: EngineOptions): EngineHandle {
  const [snapshot, setSnapshot] = useState<Snapshot>(initialSnapshot)
  const [attempt, setAttempt] = useState(0)
  const [selected, setSelected] = useState<string | null>(initialSessionID ?? null)
  // Remembered input scope is a local preference, not invented engine state.
  // It remains usable when a previously selected engine cannot start.
  const [draftTarget, setDraftTarget] = useState(() => initialSessionID ? { id: initialSessionID, cwd: initialWorkspace ?? workspace } : null)
  const knownSessions = useRef(snapshot.sessions)
  knownSessions.current = snapshot.sessions
  const client = useRef<EngineClient | null>(null)
  const session = useRef<string | null>(null)
  const sessionWorkspace = useRef(workspace)
  const generation = useRef(0)

  useEffect(() => {
    if (!enabled) return

    if (typeof Bun === 'undefined') {
      setSnapshot((current) =>
        current.status === 'unavailable'
          ? current
          : { ...current, status: 'unavailable', error: 'this build cannot start a local engine' },
      )
      return
    }

    let stopped = false
    const epoch = generation.current
    const abort = new AbortController()
    const update = (next: (snapshot: Snapshot) => Snapshot) => {
      if (!stopped && epoch === generation.current) setSnapshot((current) => !stopped && epoch === generation.current ? next(current) : current)
    }

    const loop = async () => {
      while (!stopped) {
        update((current) => ({
          ...current,
          status: current.status === 'ready' ? 'ready' : 'starting',
          error: null,
        }))

        const attached = await ensureEngine({ workspace })
        if (stopped) return

        if (attached.status === 'mismatch') {
          update((current) => ({
            ...current,
            status: 'mismatch',
            error: `the engine at ${attached.url} is ${attached.health.version} (protocol ${attached.health.protocol}); this cockpit needs ${attached.expectedVersion} (protocol ${attached.expected})`,
          }))
          return
        }
        if (attached.status === 'unavailable') {
          update((current) => ({ ...current, status: 'unavailable', error: attached.reason }))
          return
        }
        if (attached.status === 'failed') {
          update((current) => ({ ...current, status: 'failed', error: attached.reason }))
          return
        }

        const connection = engineClient(attached)
        client.current = connection
        update((current) => ({ ...current, health: attached.health, error: null }))

        let after = 0
        try {
          const { sessions } = await connection.listSessions()
          const existing = selected ? sessions.find((candidate) => candidate.id === selected) : sessions.find((candidate) => candidate.cwd === workspace)
          if (selected && !existing) throw new Error(`Session ${selected} was not found in this local engine`)
          const chosen =
            existing ?? (await connection.createSession({ cwd: workspace, reuseWorkspace: true })).session
          const detail = await connection.session({ id: chosen.id })
          // Read global provider state after the session watermark. Feed replay
          // then fills later changes; revision ordering ignores older replay.
          const providers = await connection.providers()
          const { projects } = await connection.projects()
          if (stopped || epoch !== generation.current) return
          session.current = chosen.id
          sessionWorkspace.current = detail.session.cwd
          setDraftTarget({ id: chosen.id, cwd: detail.session.cwd })
          after = detail.seq
          update((current) =>
            hydrate({ ...current, status: 'ready', health: attached.health, sessions, providers, projects, models: providers.models, defaultModel: providers.defaultModel }, detail),
          )
        } catch (error) {
          update((current) => ({ ...current, status: 'unreachable', error: describe(error) }))
          await sleep(800)
          continue
        }

        let dropped = ''
        try {
          await connection.feed({
            after,
            signal: abort.signal,
            onEvent: (event) => {
              after = event.seq
              update((current) => apply(current, event))
            },
            onOverflow: (reason) => {
              // Only this window lost its place. The loop below reconnects
              // from `after` and the replay fills the gap from the log.
              dropped = reason
              update((current) => ({
                ...current,
                error: `the engine dropped this window's feed (${reason}); resuming from ${after}`,
              }))
            },
          })
          if (stopped) return
          update((current) => ({
            ...current,
            status: 'unreachable',
            error: dropped
              ? `the engine dropped this window's feed (${dropped}); resuming from ${after}`
              : 'the engine closed the event feed',
          }))
        } catch (error) {
          if (stopped) return
          update((current) => ({ ...current, status: 'unreachable', error: describe(error) }))
        }

        await sleep(800)
      }
    }

    void loop()

    return () => {
      stopped = true
      abort.abort()
      client.current = null
    }
  }, [enabled, workspace, attempt, selected])

  const selectSession = useCallback((id: string, cwd?: string) => {
    generation.current++
    client.current = null
    session.current = null
    const target = cwd ?? knownSessions.current.find((row) => row.id === id)?.cwd
    setDraftTarget(target ? { id, cwd: target } : null)
    setSnapshot((current) => ({ ...initialSnapshot(), sessions: current.sessions, projects: current.projects, status: 'starting' }))
    setSelected(id)
    setAttempt((value) => value + 1)
  }, [])
  const newSession = useCallback(async (projectless?: boolean) => {
    if (!client.current) throw new Error('the engine is not connected')
    const epoch = generation.current
    const scratch = projectless ?? knownSessions.current.find((row) => row.id === session.current)?.projectless ?? false
    const { session: created } = await client.current.createSession({ ...(scratch ? { projectless: true } : { cwd: sessionWorkspace.current }), title: 'New task' })
    if (epoch === generation.current) selectSession(created.id, created.cwd)
  }, [workspace, selectSession])

  const openProject = useCallback(async (cwd: string) => {
    if (!client.current) throw new Error('The engine is not connected')
    const epoch = generation.current, connection = client.current
    const { session: opened } = await connection.openProject({ cwd })
    let id = opened.id
    const remembered = readWindowState(opened.cwd).sessionID
    if (remembered) {
      try { const saved = (await connection.session({ id: remembered })).session
        if (saved.cwd === opened.cwd && saved.workspaceIdentity === opened.workspaceIdentity) id = saved.id
      } catch { /* Removed local preference: use the validated project task. */ }
    }
    if (epoch === generation.current) selectSession(id, opened.cwd)
  }, [selectSession])
  const refreshProjects = useCallback(async () => {
    if (!client.current) throw new Error('The engine is not connected')
    const epoch = generation.current, { projects } = await client.current.projects()
    if (epoch === generation.current) setSnapshot((current) => ({ ...current, projects }))
  }, [])

  const exec = useCallback((command: string) => {
    const connection = client.current
    const sessionID = session.current
    if (!connection || !sessionID) return
    void connection.startRun({ id: sessionID, command }).catch((error) => {
      setSnapshot((current) => ({ ...current, error: describe(error) }))
    })
  }, [])

  const cancel = useCallback((runID: string) => {
    const connection = client.current
    if (!connection) return
    void connection.cancelRun({ id: runID }).catch((error) => {
      setSnapshot((current) => ({ ...current, error: describe(error) }))
    })
  }, [])

  const draftController = useMemo(() => enabled && typeof Bun !== 'undefined' && draftTarget
    ? new PromptDraftController(createPromptStore(draftTarget)) : null,
  [enabled, draftTarget?.id, draftTarget?.cwd])
  useEffect(() => () => draftController?.dispose(), [draftController])
  const draft = useSyncExternalStore(draftController?.subscribe ?? emptySubscribe, draftController?.getSnapshot ?? emptyDraftView)
  const editDraft = useCallback((text: string) => draftController?.edit(text), [draftController])
  const prompt = useCallback(async (text: string, mode: DeliveryMode = 'queue', model?: string) => {
    if (!draftController) return false
    // onSubmit carries the latest native textarea value, which can precede a
    // React render. Persist it synchronously before staging the operation.
    if (text !== draftController.getSnapshot().text) draftController.edit(text)
    return draftController.submit(client.current, mode, model)
  }, [draftController])
  const retryPrompt = useCallback(() => { void draftController?.retry(client.current) }, [draftController])
  const forgetPrompt = useCallback(() => draftController?.forget(), [draftController])
  const discardDraft = useCallback(() => draftController?.discard(), [draftController])
  const reloadDraft = useCallback(() => draftController?.reload(), [draftController])

  const interrupt = useCallback(() => {
    const connection = client.current
    const sessionID = session.current
    if (!connection || !sessionID) return
    void connection.interrupt({ id: sessionID }).catch((error) => {
      setSnapshot((current) => ({ ...current, error: describe(error) }))
    })
  }, [])

  const restart = useCallback(() => {
    void (async () => {
      const connection = client.current
      if (connection) await connection.shutdown().catch(() => {})
      await stopEngine().catch(() => {})
      setAttempt((value) => value + 1)
    })()
  }, [])

  const answerPermission = useCallback(async (id: string, decision: 'allow' | 'deny', remember: boolean) => {
    if (!client.current) throw new Error('the engine is not connected')
    await client.current.answerPermission({ id, decision, remember })
  }, [])
  const toolOutput = useCallback(async (id: string) => {
    if (!client.current) throw new Error('the engine is not connected')
    return client.current.toolOutput({ id })
  }, [])

  const rewind = useCallback(async (checkpointID: string, key: string) => {
    if (!client.current || !session.current) throw new Error('the engine is not connected')
    await client.current.rewind({ id: session.current, checkpointID, key })
  }, [])

  const workspaceList = useCallback(async (path = '') => {
    if (!client.current || !session.current) throw new Error('the engine is not connected')
    return client.current.workspaceList({ id: session.current, path })
  }, [])
  const workspaceFile = useCallback(async (path: string) => {
    if (!client.current || !session.current) throw new Error('the engine is not connected')
    return client.current.workspaceFile({ id: session.current, path })
  }, [])
  const workspaceReview = useCallback(async (base?: string) => {
    if (!client.current || !session.current) throw new Error('the engine is not connected')
    return client.current.workspaceReview({ id: session.current, ...(base ? { base } : {}) })
  }, [])
  const workspaceCommit = useCallback(async (input: Omit<OperationRequest<'workspaceCommit'>, 'id'>) => {
    if (!client.current || !session.current) throw new Error('the engine is not connected')
    return (await client.current.workspaceCommit({ id: session.current, ...input })).run.id
  }, [])
  const skills = useCallback(async () => {
    if (!client.current || !session.current) throw new Error('Connect the Hiroshi daemon to discover skills.')
    return client.current.skills({ id: session.current })
  }, [])
  const skillDocument = useCallback(async (input: import('../../engine/src/protocol').SkillSelection) => {
    if (!client.current || !session.current) throw new Error('Connect the Hiroshi daemon to read this skill.')
    return client.current.skillDocument({ id: session.current, ...input })
  }, [])
  const updateSkill = useCallback(async (input: Omit<OperationRequest<'updateSkill'>, 'id'>) => {
    if (!client.current || !session.current) throw new Error('Connect the Hiroshi daemon to save skills.')
    return client.current.updateSkill({ id: session.current, ...input })
  }, [])
  const removeSkill = useCallback(async (input: Omit<OperationRequest<'removeSkill'>, 'id'>) => {
    if (!client.current || !session.current) throw new Error('Connect the Hiroshi daemon to remove this skill.')
    return client.current.removeSkill({ id: session.current, ...input })
  }, [])
  const pairingState = useCallback(async () => {
    if (!client.current) throw new Error('Connect the Hiroshi daemon to manage pairing.')
    return client.current.pairingState()
  }, [])
  const internetSettings = useCallback(async () => {
    if (!client.current) throw new Error('Connect the Hiroshi daemon to manage internet access.')
    return client.current.internetSettings()
  }, [])
  const updateInternet = useCallback(async (input: { revision: number; enabled: boolean }) => {
    if (!client.current) throw new Error('Connect the Hiroshi daemon to manage internet access.')
    return client.current.updateInternet(input)
  }, [])
  const createPairing = useCallback(async (address?: string, remote?: boolean) => {
    if (!client.current) throw new Error('Connect the Hiroshi daemon to pair a device.')
    return client.current.createPairing(remote ? { remote: true } : address ? { address } : {})
  }, [])
  const cancelPairing = useCallback(async (grantID: string) => {
    if (!client.current) throw new Error('Connect the Hiroshi daemon to cancel pairing.')
    return client.current.cancelPairing({ grantID })
  }, [])
  const revokePairedDevice = useCallback(async (deviceID: string, revision: number) => {
    if (!client.current) throw new Error('Connect the Hiroshi daemon to revoke device access.')
    return client.current.revokePairedDevice({ deviceID, revision })
  }, [])
  const browse = useCallback(async (url: string) => {
    if (!client.current || !session.current) throw new Error('the engine is not connected')
    return client.current.browse({ id: session.current, url })
  }, [])

  const revision = useRef(0)
  revision.current = snapshot.providers?.revision ?? 0
  const receiveProviders = useCallback((providers: ProviderState) => {
    setSnapshot((current) => providers.revision < (current.providers?.revision ?? 0) ? current : { ...current, providers, models: providers.models, defaultModel: current.configuration?.settings.defaultModel ?? providers.defaultModel })
  }, [])
  const refreshProviders = useCallback(async () => {
    if (!client.current || !session.current) throw new Error('The engine is not connected')
    receiveProviders(await client.current.refreshProviders({ id: session.current }))
  }, [])
  const cancelProviderRefresh = useCallback(async () => {
    if (!client.current) throw new Error('The engine is not connected')
    receiveProviders(await client.current.cancelProviderRefresh())
  }, [])
  const updateProviders = useCallback(async (input: Omit<ProviderUpdate, 'revision'>) => {
    if (!client.current) throw new Error('The engine is not connected')
    try { receiveProviders(await client.current.updateProviders({ ...input, revision: revision.current })) }
    catch (error) { receiveProviders(await client.current.providers()); setSnapshot((current) => ({ ...current, error: describe(error) })); throw error }
  }, [])

  const networkSettings = useCallback(async () => {
    if (!client.current) throw new Error('The engine is not connected')
    return client.current.networkSettings()
  }, [])
  const updateNetwork = useCallback(async (input: NetworkUpdate) => {
    if (!client.current) throw new Error('The engine is not connected')
    return client.current.updateNetwork(input)
  }, [])
  const networkToken = useCallback(async () => {
    if (!client.current) throw new Error('The engine is not connected')
    return (await client.current.networkToken()).token
  }, [])
  const rotateNetworkToken = useCallback(async (revision: number) => {
    if (!client.current) throw new Error('The engine is not connected')
    return client.current.rotateNetworkToken({ revision })
  }, [])
  const usageReport = useCallback(async (input: UsageQuery) => {
    if (!client.current || !session.current) throw new Error('The engine is not connected')
    return client.current.usageReport({ ...input, id: session.current })
  }, [])
  const updateUsagePricing = useCallback(async (input: UsagePricingUpdate) => {
    if (!client.current) throw new Error('The engine is not connected')
    await client.current.updateUsagePricing(input)
  }, [])
  const updateAccess = useCallback(async (id: string, mode: import('../../engine/src/protocol').AccessMode, revision: number) => {
    if (!client.current || session.current !== id) throw new Error('The selected task changed. Return to the original task before changing its permissions.')
    await client.current.updateAccess({ id, mode, revision })
  }, [])
  const freshCliConversation = useCallback(async (conversation: CliConversation, key: string) => {
    if (!client.current || session.current !== conversation.sessionID) throw new Error('The selected task changed. Return to the original task before recovering its CLI conversation.')
    await client.current.freshCliConversation({ id: conversation.sessionID, conversationID: conversation.id, revision: conversation.revision, key })
  }, [])
  return { internetSettings, updateInternet, pairingState, createPairing, cancelPairing, revokePairedDevice, skills, skillDocument, updateSkill, removeSkill, updateAccess, freshCliConversation, usageReport, updateUsagePricing, networkSettings, updateNetwork, networkToken, rotateNetworkToken, openProject, refreshProjects, refreshProviders, cancelProviderRefresh, updateProviders, selectSession, newSession, workspaceList, workspaceFile, workspaceReview, workspaceCommit, browse, rewind, snapshot, exec, prompt, draft, editDraft, retryPrompt, forgetPrompt, discardDraft, reloadDraft, interrupt, cancel, restart, answerPermission, toolOutput }
}

const blankDraft: DraftView = { revision: 0, draftRevision: 0, text: '', pending: null, busy: false, error: null, unsaved: false }
const emptyDraftView = () => blankDraft
const emptySubscribe = () => () => {}
