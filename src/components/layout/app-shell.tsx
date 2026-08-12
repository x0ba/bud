import { Children, useEffect, useRef, useState } from 'react'
import { useRouterState } from '@tanstack/react-router'
import HeaderUser from '#/integrations/clerk/header-user'
import { cn } from '#/lib/utils'
import { AppSidebar } from './app-sidebar'

/** First real content in the tab — covers EnsureUser blank → page ready. */
let sessionEnterPending = true

/**
 * Paths that should still fade on the next content paint.
 * Kept briefly so React Strict Mode remounts still animate in dev.
 */
const enterPendingByPath = new Set<string>()

function useEnterActive(shouldEnter: boolean, pathname: string) {
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!shouldEnter) {
      setActive(false)
      return
    }
    let cancelled = false
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (!cancelled) setActive(true)
      })
    })
    const id = window.setTimeout(() => {
      enterPendingByPath.delete(pathname)
    }, 350)
    return () => {
      cancelled = true
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      window.clearTimeout(id)
    }
  }, [shouldEnter, pathname])

  return active
}

export function AppShell({
  children,
  title,
  actions,
}: {
  children?: React.ReactNode
  title?: string
  actions?: React.ReactNode
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const sawEmpty = useRef(false)
  const shellFadeRef = useRef<boolean | null>(null)
  const contentFadeRef = useRef<boolean | null>(null)
  const hasContent = Children.toArray(children).length > 0

  if (shellFadeRef.current === null) {
    shellFadeRef.current = sessionEnterPending
    if (sessionEnterPending) {
      sessionEnterPending = false
      enterPendingByPath.add(pathname)
    }
  }

  if (!hasContent) {
    sawEmpty.current = true
    enterPendingByPath.add(pathname)
  }

  if (contentFadeRef.current === null && hasContent) {
    // Session shell fade already covers first paint with content. Otherwise
    // fade main only after an empty wait (sidebar stays put on route changes).
    const shellCoversThisPaint =
      shellFadeRef.current === true && !sawEmpty.current
    contentFadeRef.current = shellCoversThisPaint
      ? false
      : sawEmpty.current || enterPendingByPath.has(pathname)
    if (contentFadeRef.current) {
      enterPendingByPath.add(pathname)
    }
  }

  const shellFade = shellFadeRef.current === true
  const contentFade = contentFadeRef.current === true
  const shellEnterActive = useEnterActive(shellFade, pathname)
  const contentEnterActive = useEnterActive(contentFade, pathname)

  return (
    <div
      className={cn(
        'flex min-h-dvh bg-background text-foreground',
        shellFade && 'content-enter',
        shellFade && shellEnterActive && 'content-enter-active',
      )}
    >
      <AppSidebar />
      <div className="min-w-0 flex-1">
        <header className="app-shell-header">
          <div className="min-w-0">
            {title ? (
              <h1 className="truncate text-[15px] font-semibold tracking-tight text-[var(--sea-ink)]">
                {title}
              </h1>
            ) : null}
          </div>
          <div className="flex items-center gap-2.5">
            {actions}
            <HeaderUser />
          </div>
        </header>
        <main className="px-8 pt-4 pb-10">
          {hasContent ? (
            <div
              className={cn(
                contentFade && 'content-enter',
                contentFade && contentEnterActive && 'content-enter-active',
              )}
            >
              {children}
            </div>
          ) : null}
        </main>
      </div>
    </div>
  )
}
