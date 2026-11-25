/**
 * Titlebar dragging.
 *
 * The window has no native caption, so the drag is a custom titlebar press
 * that hands the move to the OS. These tests drive the press through the real
 * GPUI hit test, which is where the drag used to break: an unfilled in-flow
 * div gets no hitbox, so the press never reached the handler.
 *
 *   bun run test
 */

import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { connectTest } from '@gpuix/react/automation'
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing'

import { HiroshiApp } from './app'
import { resetTitlebarPress, setWindowDragStarter } from './src/window-drag'

const describeNative = hasNativeTestRenderer ? describe : describe.skip

/** macOS uses the native traffic lights, so there are no window controls. */
const isDarwin = typeof process !== 'undefined' && process.platform === 'darwin'

async function pressAt(app: any, testId: string, offsetX = 0) {
  const target = app.getByTestId(testId)
  await target.waitFor({ timeoutMs: 10_000 })
  const bounds = await target.bounds()
  const x = bounds.x + bounds.width / 2 + offsetX
  const y = bounds.y + bounds.height / 2
  await app.mouse.down({ x, y })
  await app.mouse.up({ x, y })
  return { x, y }
}

describeNative('Hiroshi titlebar dragging', () => {
  afterEach(() => {
    setWindowDragStarter(null)
    resetTitlebarPress()
  })

  it('starts a window drag when the header titlebar is pressed', async () => {
    const { render, renderer } = createTestRoot({ width: 1200, height: 800 })
    render(<HiroshiApp />)
    const app = await connectTest(renderer)

    let drags = 0
    setWindowDragStarter(() => {
      drags += 1
      return true
    })

    await pressAt(app, 'titlebar-drag-header')
    expect(drags).toBe(1)

    await app.close()
  })

  it('starts a window drag when the sidebar titlebar is pressed', async () => {
    const { render, renderer } = createTestRoot({ width: 1200, height: 800 })
    render(<HiroshiApp />)
    const app = await connectTest(renderer)

    let drags = 0
    setWindowDragStarter(() => {
      drags += 1
      return true
    })

    await pressAt(app, 'titlebar-drag-sidebar')
    expect(drags).toBe(1)

    await app.close()
  })

  it('zooms the window on a double click instead of dragging it', async () => {
    const { render, renderer } = createTestRoot({ width: 1200, height: 800 })
    render(<HiroshiApp />)
    const app = await connectTest(renderer)

    let drags = 0
    let zooms = 0
    setWindowDragStarter(() => {
      drags += 1
      return true
    })
    ;(renderer as any).zoomWindow = () => {
      zooms += 1
    }

    const first = await pressAt(app, 'titlebar-drag-header')
    await pressAt(app, 'titlebar-drag-header')
    expect(drags).toBe(1)
    expect(zooms).toBe(1)
    expect(first).toBeTruthy()

    await app.close()
  })

  it.skipIf(isDarwin)('zooms the window from the maximize button', async () => {
    const { render, renderer } = createTestRoot({ width: 1200, height: 800 })
    render(<HiroshiApp />)
    const app = await connectTest(renderer)

    let zooms = 0
    ;(renderer as any).zoomWindow = () => {
      zooms += 1
    }

    await app.getByTestId('window-maximize').click()
    expect(zooms).toBe(1)

    await app.close()
  })

  it('starts a drag from the settings titlebar', async () => {
    const { render, renderer } = createTestRoot({ width: 1200, height: 800 })
    render(<HiroshiApp />)
    const app = await connectTest(renderer)
    let drags = 0
    setWindowDragStarter(() => { drags++; return true })
    await app.getByTestId('settings').click()
    await pressAt(app, 'titlebar-drag-settings')
    expect(drags).toBe(1)
    await app.close()
  })

  it('starts a drag from the surface drawer titlebar', async () => {
    // Keep the entire drawer visible beside the transcript's minimum width.
    const { render, renderer } = createTestRoot({ width: 1800, height: 800 })
    render(<HiroshiApp />)
    const app = await connectTest(renderer)
    let drags = 0
    setWindowDragStarter(() => { drags++; return true })
    await app.clock.pause()
    await app.getByTestId('panel-right-open').click()
    const target = app.getByTestId('titlebar-drag-surface')
    await target.waitFor({ timeoutMs: 10_000 })
    await app.clock.fastForward(300)
    await app.clock.resume()
    let previous = '', stable = 0
    for (let frame = 0; frame < 60; frame++) {
      const bounds = await target.bounds()
      const key = JSON.stringify(bounds)
      stable = bounds.width > 0 && bounds.x >= 0 && bounds.x + bounds.width <= 1801 && key === previous ? stable + 1 : 0
      if (stable >= 3) break
      previous = key
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
    expect(stable).toBeGreaterThanOrEqual(3)
    await pressAt(app, 'titlebar-drag-surface')
    expect(drags).toBe(1)
    await app.close()
  })

  it('ignores presses that are not on the titlebar', async () => {
    const { render, renderer } = createTestRoot({ width: 1200, height: 800 })
    render(<HiroshiApp />)
    const app = await connectTest(renderer)

    let drags = 0
    setWindowDragStarter(() => {
      drags += 1
      return true
    })

    // The composer sits far below the titlebar.
    const composer = app.getByTestId('composer')
    await composer.waitFor({ timeoutMs: 10_000 })
    const bounds = await composer.bounds()
    await app.mouse.down({ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 })
    await app.mouse.up({ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 })
    expect(drags).toBe(0)

    await app.close()
  })
})
