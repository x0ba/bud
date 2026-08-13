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
        secondaryTo: '/app',
        secondaryLabel: 'Dashboard',
      } as const)
    : ({
        signedIn: false,
        primaryTo: '/sign-up',
        primaryLabel: 'Start free',
        secondaryTo: '/sign-in',
        secondaryLabel: 'Sign in',
      } as const)
}

/** True once the element has been scrolled into view — used to trigger the
 *  one-shot reveals that carry each design's signature moment. */
export function useInView<T extends Element>(rootMargin = '-15% 0px') {
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

export function usd(value: number) {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
}
