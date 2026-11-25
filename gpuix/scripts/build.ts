import { appendFileSync, cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { buildMacWindow } from './build-window-macos'

const root = path.resolve(import.meta.dir, '..')
const out = path.join(root, 'dist')
mkdirSync(out, { recursive: true })
const suffix = process.platform === 'win32' ? '.exe' : ''
const target = process.platform === 'win32' ? `win32-${process.arch}-msvc` : process.platform === 'darwin' ? `darwin-${process.arch}` : `linux-${process.arch}-gnu`
const binding = path.join(root, 'node_modules', '@gpuix', `native-${target}`, `gpuix-native.${target}.node`)
if (!(await Bun.file(binding).exists())) throw new Error(`GPUIX has no installed native artifact for ${target}`)
// Select the installed, lockfile-pinned binding at build time. Bun embeds this
// N-API addon; the generated multi-platform loader would require absent packages.
const shim = `const binding = require(${JSON.stringify(binding)});\n` +
  ['AvailableUpdate', 'GpuixRenderer', 'TestGpuixRenderer', 'checkUpdate', 'hasTestGpuixRenderer', 'isTerminal'].map((name) => `export const ${name} = binding.${name};`).join('\n') + '\nexport const __napiBindingTarget = "native";'
const define = { 'process.env.HIROSHI_PACKAGED_BUILD': '"1"' }
const app = await Bun.build({ define, entrypoints: [path.join(root, 'desktop.ts')], compile: { outfile: path.join(out, `hiroshi${suffix}`) }, target: 'bun', plugins: [{ name: 'hiroshi-native-binding', setup(build) {
  build.onLoad({ filter: /[\\/]@gpuix[\\/]native[\\/]index\.(?:js|cjs)$/ }, () => ({ contents: shim, loader: 'js' }))
} }] })
if (!app.success) throw new Error(app.logs.join('\n'))
const engine = await Bun.build({ define, entrypoints: [path.join(root, 'engine/src/index.ts')], target: 'bun', compile: { outfile: path.join(out, `hiroshi-engine${suffix}`) } })
if (!engine.success) throw new Error(engine.logs.join('\n'))
buildMacWindow()
const version = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).version
writeFileSync(path.join(out, 'VERSION'), `${version}\n`)
writeFileSync(path.join(out, 'LICENSES.txt'), `Hiroshi ${version}\nIncludes Bun (MIT), React (MIT), GPUIX (Apache-2.0), Ajv (MIT), htmlparser2 (MIT), safe-mdx (MIT), uqr (MIT), and their dependencies.\n\n${readFileSync(path.join(root, 'node_modules/@gpuix/native/LICENSE'), 'utf8')}\n\nuqr\n${readFileSync(path.join(root, 'node_modules/uqr/LICENSE'), 'utf8')}`)
for (const [name, file] of [["OpenTunnel", "docs/opentunnel-LICENSE.txt"], ["Effect", "node_modules/effect/LICENSE"]]) appendFileSync(path.join(out, "LICENSES.txt"), `\n\n${name}\n${readFileSync(path.join(root, file), "utf8")}`)
console.log(`Built Hiroshi ${version} and its engine sidecar for ${target}`)
if (process.platform === 'darwin') {
  const info = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>CFBundleName</key><string>Hiroshi</string><key>CFBundleDisplayName</key><string>Hiroshi</string><key>CFBundleIdentifier</key><string>os.hiroshi.desktop</string><key>CFBundleExecutable</key><string>hiroshi</string><key>CFBundlePackageType</key><string>APPL</string><key>CFBundleShortVersionString</key><string>${version}</string><key>CFBundleVersion</key><string>${version}</string><key>NSHighResolutionCapable</key><true/><key>CFBundleURLTypes</key><array><dict><key>CFBundleURLName</key><string>Hiroshi session</string><key>CFBundleURLSchemes</key><array><string>hiroshi</string></array></dict></array></dict></plist>`
  writeFileSync(path.join(out, 'Info.plist'), info)
  const contents = path.join(out, 'Hiroshi.app', 'Contents'), bin = path.join(contents, 'MacOS')
  mkdirSync(bin, { recursive: true })
  writeFileSync(path.join(contents, 'Info.plist'), info)
  for (const file of ['hiroshi', 'hiroshi-engine', 'libhiroshi-window.dylib', 'VERSION', 'LICENSES.txt']) cpSync(path.join(out, file), path.join(bin, file))
}
