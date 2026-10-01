import { useEffect } from 'react'

/**
 * Ref-counted document scroll lock. Every fixed overlay must use it —
 * without it the page scrolls behind the overlay and lands somewhere else on close.
 */
let locks = 0

export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    locks += 1
    document.documentElement.classList.add('overlay-open')
    return () => {
      locks = Math.max(0, locks - 1)
      if (locks === 0) document.documentElement.classList.remove('overlay-open')
    }
  }, [active])
}
