import React from 'react'
import { describe, expect, it } from 'vitest'
import { connectTest } from '@gpuix/react/automation'
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing'
import { ThemeProvider } from './ThemeContext'
import { SettingsDockPanel } from './SettingsDockPanel'

const describeNative = hasNativeTestRenderer ? describe : describe.skip

describeNative('SettingsDockPanel & Theme Tokens', () => {
  it('renders preferences header and default settings', async () => {
    const { render, renderer } = createTestRoot({ width: 800, height: 600 })
    render(
      <ThemeProvider>
        <SettingsDockPanel />
      </ThemeProvider>
    )
    const app = await connectTest(renderer)

    const panel = app.getByTestId('dock-panel-settings')
    await panel.waitFor({ timeoutMs: 5_000 })
    expect(await panel.bounds()).toBeDefined()

    const text = renderer.getPaintedText()
    expect(text).toContain('Preferences & Settings')
    expect(text).toContain('Color Theme')
    expect(text).toContain('Font Size')
    expect(text).toContain('Tab Size')

    await app.close()
  })

  it('switches between Dark and Light theme', async () => {
    const { render, renderer } = createTestRoot({ width: 800, height: 600 })
    render(
      <ThemeProvider initialTheme="dark">
        <SettingsDockPanel />
      </ThemeProvider>
    )
    const app = await connectTest(renderer)

    const lightBtn = app.getByTestId('settings-theme-light-btn')
    await lightBtn.waitFor({ timeoutMs: 5_000 })
    await lightBtn.click()

    const darkBtn = app.getByTestId('settings-theme-dark-btn')
    await darkBtn.waitFor({ timeoutMs: 5_000 })
    await darkBtn.click()

    await app.close()
  })

  it('increments and decrements font size and toggles options', async () => {
    const { render, renderer } = createTestRoot({ width: 800, height: 600 })
    render(
      <ThemeProvider>
        <SettingsDockPanel />
      </ThemeProvider>
    )
    const app = await connectTest(renderer)

    const plusBtn = app.getByTestId('settings-font-size-plus')
    await plusBtn.waitFor({ timeoutMs: 5_000 })
    await plusBtn.click()

    const fontSizeVal = app.getByTestId('settings-font-size-val')
    await fontSizeVal.waitFor({ timeoutMs: 5_000 })
    expect(await fontSizeVal.textContent()).toBe('13')

    const tab4Btn = app.getByTestId('settings-tab-size-4')
    await tab4Btn.waitFor({ timeoutMs: 5_000 })
    await tab4Btn.click()

    const wrapToggle = app.getByTestId('settings-word-wrap-toggle')
    await wrapToggle.waitFor({ timeoutMs: 5_000 })
    await wrapToggle.click()

    await app.close()
  })
})
