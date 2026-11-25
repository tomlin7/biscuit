// `import icon from './x.svg' with { type: 'text' }` gives the file contents as
// a string. Bun's bundler embeds it, so the icon ships inside the binary.
declare module "*.svg" {
  const source: string
  export default source
}
