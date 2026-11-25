import { defineConfig } from 'vitest/config'

/**
 * The cockpit's integration tests run through the GPUIX native test renderer.
 *
 * The engine has its own suite (`bun test engine`): it needs `bun:sqlite` and
 * spawns a real daemon, neither of which vitest's node runner provides. Keeping
 * the two apart is what lets the engine tests run on a Linux box with no GPU.
 */
export default defineConfig({
  test: {
    // Each file owns a native renderer. Keep GPU contexts and worker RAM bounded.
    fileParallelism: false,
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', 'engine/**', 'dist/**'],
  },
})
