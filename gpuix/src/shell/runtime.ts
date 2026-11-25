/** Set by our compiler; Bun 1.3.5 has no isStandaloneExecutable property. */
export const packagedBuild = typeof process !== 'undefined' && process.env.HIROSHI_PACKAGED_BUILD === '1'

export function allowSourceRuntime(name: string): void {
  if (!/^bun(?:-debug)?(?:\.exe)?$/i.test(name)) throw new Error('Unrecognized compiled runtime; use the Hiroshi build script')
}

export function allowEngineSpawn(depth: string | undefined): void {
  if (Number(depth ?? 0) !== 0) throw new Error('Blocked recursive engine launch')
}
