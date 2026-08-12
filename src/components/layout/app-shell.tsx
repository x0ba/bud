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
  const fadeRef = useRef<boolean | null>(null)
  const [enterActive, setEnterActive] = useState(false)
  const hasContent = Children.toArray(children).length > 0

  if (!hasContent) {
    sawEmpty.current = true
    enterPendingByPath.add(pathname)
  }

  if (fadeRef.current === null && hasContent) {
    const shouldFade =
      sessionEnterPending ||
      sawEmpty.current ||
      enterPendingByPath.has(pathname)
    fadeRef.current = shouldFade
    if (shouldFade) {
      sessionEnterPending = false
      // Stay pending for this path until after paint (Strict Mode remount).
      enterPendingByPath.add(pathname)
    }
  }

  const fadeIn = fadeRef.current === true

  useEffect(() => {
    if (!fadeIn) return
    // After paint: from-state is already on screen, then ease to full opacity.
    setEnterActive(true)
    const id = window.setTimeout(() => {
      enterPendingByPath.delete(pathname)
    }, 350)
    return () => window.clearTimeout(id)
  }, [fadeIn, pathname])

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
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
                fadeIn && 'content-enter',
                fadeIn && enterActive && 'content-enter-active',
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
