export function clipboardAvailable() { return typeof navigator !== 'undefined' && !!navigator.clipboard }
export async function copyText(text: string) { await navigator.clipboard.writeText(text) }
