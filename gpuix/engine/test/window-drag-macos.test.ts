import { expect, test } from 'bun:test'
import { createMacDrag } from '../../src/window-drag-macos'

test('macOS adapter forwards valid GPUI press coordinates and reads native tracking state', () => {
  let installed = 0, active = false
  const presses: number[][] = []
  const drag = createMacDrag(() => ({
    hiroshi_drag_install() { installed++ },
    hiroshi_drag_start(x, y) { presses.push([x, y]); active = true; return true },
    hiroshi_drag_active() { return active },
  }))
  drag.install()
  expect(installed).toBe(1)
  expect(drag.start({ button: 0, x: 24.5, y: 17 })).toBe(true)
  expect(presses).toEqual([[24.5, 17]])
  expect(drag.active()).toBe(true)
  active = false
  expect(drag.active()).toBe(false)
  for (const event of [undefined, {}, { button: 2, x: 1, y: 2 }, { button: 0, x: NaN, y: 1 }, { button: 0, x: 1, y: Infinity }]) expect(drag.start(event)).toBe(false)
  expect(presses).toHaveLength(1)
})
test('a missing native macOS helper fails safely without pretending a drag started', () => {
  const drag = createMacDrag(() => null)
  expect(() => drag.install()).not.toThrow()
  expect(drag.start({ button: 0, x: 10, y: 10 })).toBe(false)
  expect(drag.active()).toBe(false)
})
