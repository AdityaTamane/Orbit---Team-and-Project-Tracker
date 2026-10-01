import { useEffect } from 'react'

export interface Hotkey {
  combo: string // 'mod+k', 'c', 'g then p'
  handler: (e: KeyboardEvent) => void
  /** Allow the key even while typing in an input */
  allowInInput?: boolean
}

const isTyping = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null
  if (!el) return false
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable
}

function matches(combo: string, e: KeyboardEvent): boolean {
  const parts = combo.toLowerCase().split('+')
  const key = parts.pop() ?? ''
  const needMod = parts.includes('mod')
  const needShift = parts.includes('shift')
  const needAlt = parts.includes('alt')
  const mod = e.metaKey || e.ctrlKey
  if (needMod !== mod) return false
  if (needShift !== e.shiftKey) return false
  if (needAlt !== e.altKey) return false
  return e.key.toLowerCase() === key
}

export function useHotkeys(hotkeys: Hotkey[], deps: unknown[] = []): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      for (const hk of hotkeys) {
        if (!hk.allowInInput && isTyping(e.target)) continue
        if (matches(hk.combo, e)) {
          e.preventDefault()
          hk.handler(e)
          return
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

/** Sequence hotkeys like "g then p" for navigation. */
export function useSequenceHotkeys(sequences: Record<string, () => void>, deps: unknown[] = []): void {
  useEffect(() => {
    let buffer = ''
    let timer: number | undefined
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      buffer += e.key.toLowerCase()
      window.clearTimeout(timer)
      timer = window.setTimeout(() => { buffer = '' }, 900)
      for (const [seq, fn] of Object.entries(sequences)) {
        if (buffer.endsWith(seq)) {
          e.preventDefault()
          buffer = ''
          fn()
          return
        }
      }
      if (buffer.length > 4) buffer = buffer.slice(-4)
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); window.clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
