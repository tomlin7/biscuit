import React from 'react'

export function agentName(id: string) {
  return ({ cli_agy: 'Agy', agy: 'Agy', cli_cursor: 'Cursor Agent', cursor: 'Cursor Agent', cli_pi: 'Pi', pi: 'Pi', cli_grok: 'Grok', grok: 'Grok', local: 'Local', anthropic: 'Anthropic', openai: 'OpenAI' } as Record<string, string>)[id] ?? id
}
/** Small vector marks shared by provider rows, the picker rail and model rows. */
export function AgentIcon({ id, size = 18, color }: { id: string; size?: number; color?: string }) {
  const kind = id.replace(/^cli_/, '')
  const stroke = color ?? (kind === 'agy' || kind === 'anthropic' ? '#D7845F' : '#D4D4D4')
  const content = kind === 'shared' || kind === 'skill' ? '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9M8 5.25l8 4.5v4.5"/>'
    : kind === 'cursor' ? '<path d="M20 3 4 11l7 2 2 7Z" fill="currentColor" stroke="none"/>'
    : kind === 'pi' ? '<path d="M4 7h16M8 7v12m8-12v12" stroke-width="3"/>'
    : kind === 'grok' ? '<path d="m4 20 16-16M6 7a8 8 0 0 1 12 10M18 5a8 8 0 0 0-12 12M3 21l5-1-4-4Z"/>'
    : kind === 'favorites' ? '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>'
    : kind === 'search' ? '<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>'
    : kind === 'chevron' ? '<path d="m9 5 7 7-7 7"/>'
    : kind === 'down' ? '<path d="m6 9 6 6 6-6"/>'
    : kind === 'refresh' ? '<path d="M20 10a8 8 0 1 0-2 8M20 3v7h-7"/>'
    : kind === 'agy' || kind === 'anthropic' ? '<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M5 3l14 18M5 21 19 3"/>'
    : '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8M8 15h8"/>'
  return <svg source={`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${content}</svg>`} style={{ width: size, height: size, color: stroke, flexShrink: 0 }} />
}
