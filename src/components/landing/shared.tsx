import { useAuth } from '@clerk/tanstack-react-start'
import { useEffect, useRef, useState } from 'react'

/** What the primary button does depends on whether there's a session: a visitor
 *  signs up, someone already signed in goes straight to the app. */
export function useLandingCta() {
  const { isSignedIn } = useAuth()

  return isSignedIn
    ? ({
        signedIn: true,
        primaryTo: '/app',
        primaryLabel: 'Open Bud',
      } as const)
    : ({
        signedIn: false,
        primaryTo: '/sign-up',
        primaryLabel: 'Start free',
      } as const)
}

export type NavState = 'top' | 'hidden' | 'pinned'

/** Reading direction, not position: the header stays out of the way while you
 *  read down the page and comes back the moment you head up. */
export function useNavState(): NavState {
  const [state, setState] = useState<NavState>('top')

  useEffect(() => {
    let last = window.scrollY
    let frame = 0

    function read() {
      frame = 0
      const y = window.scrollY

      if (y <= 24) {
        last = y
        setState('top')
        return
      }

      // Small movements are trackpad noise, and reversing on every one of them
      // would make the header flicker.
      const delta = y - last
      if (Math.abs(delta) < 8) return

      last = y
      setState(delta > 0 ? 'hidden' : 'pinned')
    }

    function onScroll() {
      frame ||= requestAnimationFrame(read)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return state
}

/** True once the element has been scrolled into view — used for the one-shot
 *  reveals on the feature cards. */
export function useInView<T extends Element>(rootMargin = '-12% 0px') {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [rootMargin])

  return { ref, inView }
}
