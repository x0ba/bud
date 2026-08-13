import { useSyncExternalStore } from 'react'

/**
 * Matches a media query, false during SSR and the first client render so the
 * markup hydrates identically on both sides. Layout that must be right on the
 * first paint belongs in CSS; this is for the cases where the *component*
 * differs — a drawer that comes from the bottom instead of the side.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Below `md` — where the sidebar gives way to the bottom tab bar. */
export const PHONE = '(width < 48rem)'

/** Touch-first input: no hover to reveal things behind, no fine pointer. */
export const COARSE_POINTER = '(hover: none)'
