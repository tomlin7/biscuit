import React from 'react'
import { describe, expect, it } from 'vitest'
import { connectTest } from '@gpuix/react/automation'
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing'
import type { EngineHandle } from '../engine/use-engine'
import { initialSnapshot } from '../engine/reducer'
import { FilesSurface, ReviewSurface, BrowserSurface, WorkspaceCommitModal } from './WorkspaceSurfaces'
import type { WorkspaceReview } from '../../engine/src/protocol'

const review: WorkspaceReview = { available: true, reason: null, root: 'workspace', branch: 'feature', base: 'main', baseCommit: 'base', revision: 'revision',
  files: [{ path: 'changed.txt', status: 'M', staged: true, unstaged: false }], patch: 'diff --git a/changed.txt b/changed.txt\n--- a/changed.txt\n+++ b/changed.txt\n@@ -1 +1 @@\n-old\n+real change\n', stagedPatch: '', workingPatch: '', truncated: false }
function fixture() {
  return { snapshot: { ...initialSnapshot(), status: 'ready' },
    workspaceList: async () => ({ path: '', entries: [{ name: 'changed.txt', path: 'changed.txt', kind: 'file', bytes: 11 }], truncated: false }),
    workspaceFile: async () => ({ path: 'changed.txt', text: 'real content', binary: false, truncated: false, bytes: 12, digest: 'hash' }),
    workspaceReview: async () => review,
    browse: async (url: string) => ({ url, title: url.endsWith('/next') ? 'Next title' : 'First title', text: 'Fetched page text', links: [{ label: 'Next link', url: 'https://example.test/next' }], scripted: false, truncated: false }),
    workspaceCommit: async () => 'run',
  } as unknown as EngineHandle
}
;(hasNativeTestRenderer ? describe : describe.skip)('workspace surfaces', () => {
  it('opens a real file entry and marks engine-reported changes', async () => {
    const engine = fixture()
    const { render, renderer } = createTestRoot({ width: 700, height: 600 })
    render(<div style={{ width: 700, height: 600, display: 'flex', flexDirection: 'column' }}><FilesSurface engine={engine} active /></div>)
    const app = await connectTest(renderer)
    try {
      await app.getByTestId('files-open-changed.txt').waitFor()
      await app.getByTestId('files-changed-changed.txt').waitFor()
      await app.getByTestId('files-open-changed.txt').click()
      await app.getByTestId('workspace-file-content').waitFor()
      expect(renderer.getPaintedText().join(' ')).toContain('real content')
      engine.workspaceFile = async () => { throw new Error('workspace path not found') }
      await app.getByTestId('files-refresh').click()
      await new Promise((resolve) => setTimeout(resolve, 30))
      expect(renderer.getPaintedText().join(' ')).toContain('workspace path not found')
      expect(renderer.getPaintedText().join(' ')).not.toContain('real content')
    } finally { await app.close() }
  })
  it('renders real branch changes and diff', async () => {
    const { render, renderer } = createTestRoot({ width: 700, height: 600 })
    render(<div style={{ width: 700, height: 600, display: 'flex', flexDirection: 'column' }}><ReviewSurface engine={fixture()} active /></div>)
    const app = await connectTest(renderer)
    try {
      await app.getByTestId('review-file-changed.txt').waitFor()
      await app.getByTestId('workspace-diff').waitFor()
      expect(renderer.getPaintedText().join(' ')).toContain('feature against main')
      expect(renderer.getPaintedText().join(' ')).toContain('real change')
    } finally { await app.close() }
  })
  it('opens a fetched page, follows a link and navigates back and forward', async () => {
    const { render, renderer } = createTestRoot({ width: 700, height: 600 })
    render(<div style={{ width: 700, height: 600, display: 'flex', flexDirection: 'column' }}><BrowserSurface engine={fixture()} active /></div>)
    const app = await connectTest(renderer)
    try {
      await app.getByTestId('browser-address').fill('https://example.test/')
      await app.getByTestId('browser-go').click()
      await app.getByTestId('browser-link-0').waitFor()
      expect(renderer.getPaintedText().join(' ')).toContain('First title')
      await app.getByTestId('browser-link-0').click()
      await new Promise((resolve) => setTimeout(resolve, 20))
      expect(renderer.getPaintedText().join(' ')).toContain('Next title')
      await app.getByTestId('browser-back').click()
      expect(renderer.getPaintedText().join(' ')).toContain('First title')
      await app.getByTestId('browser-forward').click()
      expect(renderer.getPaintedText().join(' ')).toContain('Next title')
    } finally { await app.close() }
  })
  it('lists actual review files and submits a literal commit message with its revision', async () => {
    const engine = fixture(), calls: unknown[] = []
    engine.workspaceCommit = async (input) => { calls.push(input); return 'run' }
    const { render, renderer } = createTestRoot({ width: 1180, height: 820 })
    render(<WorkspaceCommitModal open onClose={() => {}} engine={engine} onTerminal={() => {}} />)
    const app = await connectTest(renderer)
    try {
      await app.getByTestId('commit-file-list').waitFor()
      await new Promise((resolve) => setTimeout(resolve, 30))
      expect(renderer.getPaintedText().join(' ')).toContain('changed.txt')
      await app.getByTestId('commit-message').fill('Real commit message')
      await app.getByTestId('commit-submit').click()
      expect(calls).toEqual([{ revision: 'revision', message: 'Real commit message', includeUnstaged: true, push: false, pushOnly: false }])
    } finally { await app.close() }
  })
})
