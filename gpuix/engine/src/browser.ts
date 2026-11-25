/** Native page-reader transport: no scripts, cookies, credentials or forms. */
import { Parser } from 'htmlparser2'
import { invalid } from './errors'
import type { BrowserPage } from './protocol'
const LIMIT = 512 * 1024
function address(value: string, base?: string): URL {
  let url: URL
  try { url = new URL(value, base) } catch { throw invalid('browser_url', 'enter a complete HTTP or HTTPS URL') }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw invalid('browser_url', 'only HTTP and HTTPS URLs without embedded credentials can be opened')
  return url
}
export async function browsePage(value: string): Promise<BrowserPage> {
  if (typeof value !== 'string' || value.length > 8192) throw invalid('browser_url', 'enter a valid URL up to 8192 characters')
  let url = address(value)
  const signal = AbortSignal.timeout(10000)
  for (let redirects = 0; redirects <= 5; redirects++) {
    const response = await fetch(url, { signal, redirect: 'manual', credentials: 'omit', headers: { accept: 'text/html,text/plain;q=0.9', 'user-agent': 'Hiroshi-Page-Reader' } })
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel()
      const location = response.headers.get('location')
      if (!location || redirects === 5) throw invalid('browser_redirect', 'the page redirected too many times or omitted its destination')
      url = address(location, url.href); continue
    }
    if (!response.ok) { await response.body?.cancel(); throw invalid('browser_http', `the page returned HTTP ${response.status}`) }
    const type = response.headers.get('content-type')?.split(';')[0]?.trim() ?? ''
    if (!['text/html', 'application/xhtml+xml', 'text/plain', 'text/markdown'].includes(type)) { await response.body?.cancel(); throw invalid('browser_content', 'this pane supports HTML and text pages') }
    const chunks: Uint8Array[] = []; let size = 0, truncated = false
    const reader = response.body?.getReader()
    try {
      if (reader) for (;;) {
        const next = await reader.read(); if (next.done) break
        const room = LIMIT - size
        chunks.push(next.value.subarray(0, room)); size += Math.min(room, next.value.length)
        if (size >= LIMIT) { truncated = true; await reader.cancel(); break }
      }
    } finally { reader?.releaseLock() }
    const source = Buffer.concat(chunks).toString('utf8')
    if (type !== 'text/html' && type !== 'application/xhtml+xml') return { url: url.href, title: url.hostname, text: source, links: [], scripted: false, truncated }
    const links: BrowserPage['links'] = []
    let text = '', title = '', inTitle = false, hidden = 0, scripted = false, link: { label: string; url: string } | null = null
    const hiddenTags = new Set(['script', 'style', 'template', 'svg'])
    const parser = new Parser({
      onopentag(name, attrs) {
        if (name === 'script') scripted = true
        if (hiddenTags.has(name)) hidden++
        if (name === 'title') inTitle = true
        if (!hidden && name === 'a' && attrs.href) {
          try { link = { label: '', url: address(attrs.href, url.href).href } } catch { link = null }
        }
        if (!hidden && /^(p|div|h[1-6]|li|br|pre|article|section|tr)$/.test(name)) text += '\n'
      },
      ontext(value) {
        if (hidden) return
        if (inTitle) { title += value; return }
        text += value
        if (link) link.label += value
      },
      onclosetag(name) {
        if (hiddenTags.has(name)) hidden = Math.max(0, hidden - 1)
        if (name === 'title') inTitle = false
        if (name === 'a' && link) { if (links.length < 100) links.push({ ...link, label: link.label.trim() || link.url }); link = null }
        if (!hidden && /^(p|div|h[1-6]|li|pre|article|section|tr)$/.test(name)) text += '\n'
      },
    }, { decodeEntities: true })
    parser.end(source)
    return { url: url.href, title: title.trim().slice(0, 300) || url.hostname, text: text.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n\n').trim(), links, scripted, truncated }
  }
  throw invalid('browser_redirect', 'the page could not be opened')
}
