import {
  Children,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import HeaderUser from '#/integrations/clerk/header-user'
import { FeatureFlagDemo } from '#/integrations/posthog/demo'
import { cn } from '#/lib/utils'
import { AppSidebar } from './app-sidebar'
import { MobileNav } from './mobile-nav'

/** Where AppShell portals each page's title and actions. */
const HeaderSlotContext = createContext<HTMLElement | null>(null)

function useEnterActive(shouldEnter: boolean) {
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!shouldEnter) {
      setActive(false)
      return
    }
    let cancelled = false
    let raf2 = 0
    // From-state must paint first; a busy commit could otherwise finish the
    // enter transition before the first frame.
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (!cancelled) setActive(true)
      })
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [shouldEnter])

  return active
}

/**
 * Persistent chrome, mounted once per session by the `_app` layout. The
 * sidebar and the Clerk user button live here so navigation only swaps page
 * content — when every page owned its own copy of the shell, each sidebar
 * click remounted all of it (sidebar links, tooltips, Clerk button), which
 * made navigation feel sluggish.
 */
export function AppFrame({ children }: { children: React.ReactNode }) {
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null)
  const enterActive = useEnterActive(true)

  return (
    <div
      className={cn(
        'flex min-h-dvh bg-background text-foreground',
        'content-enter',
        enterActive && 'content-enter-active',
      )}
    >
      <AppSidebar />
      <div className="min-w-0 flex-1">
        <header className="app-shell-header gap-2.5">
          <div
            ref={setHeaderSlot}
            className="flex min-w-0 flex-1 items-center justify-between gap-2.5"
          />
          <HeaderUser />
        </header>
        <main className="app-shell-main">
          <HeaderSlotContext.Provider value={headerSlot}>
            {children}
          </HeaderSlotContext.Provider>
          <FeatureFlagDemo />
        </main>
      </div>
      <MobileNav />
    </div>
  )
}

/**
 * Per-page wrapper. Renders only the page's header content (into the
 * persistent AppFrame header) and its main content, so it stays cheap to
 * mount on navigation. Content that first paints empty (waiting on data)
 * fades in when it arrives; content available immediately paints instantly.
 */
export function AppShell({
  children,
  title,
  actions,
}: {
  children?: React.ReactNode
  title?: string
  actions?: React.ReactNode
}) {
  const headerSlot = useContext(HeaderSlotContext)
  const sawEmpty = useRef(false)
  const contentFadeRef = useRef<boolean | null>(null)
  const hasContent = Children.toArray(children).length > 0

  if (!hasContent) {
    sawEmpty.current = true
  }
  if (contentFadeRef.current === null && hasContent) {
    contentFadeRef.current = sawEmpty.current
  }

  const contentFade = contentFadeRef.current === true
  const contentEnterActive = useEnterActive(contentFade)

  return (
    <>
      {headerSlot
        ? createPortal(
            <>
              <div className="min-w-0">
                {title ? (
                  <h1 className="truncate text-[15px] font-semibold tracking-tight text-[var(--sea-ink)]">
                    {title}
                  </h1>
                ) : null}
              </div>
              {actions ? (
                <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
                  {actions}
                </div>
              ) : null}
            </>,
            headerSlot,
          )
        : null}
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
    </>
  )
}
