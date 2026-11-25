/** Browser previews have no native window placement or OS URL events. */
export function trackWindow(..._args: unknown[]): () => void { return () => {} }
export function nextNativeLink(): null { return null }
