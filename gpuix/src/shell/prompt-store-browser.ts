export function createPromptStore(): never { throw new Error('Local draft storage requires the desktop app.') }
export const emptyDraft = () => ({ revision: 0, draftRevision: 0, text: '', pending: null })
