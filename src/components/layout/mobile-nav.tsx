import { Link, useRouterState } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeftRight,
  Landmark,
  LayoutDashboard,
  LineChart,
  List,
  MoreHorizontal,
  PieChart,
  Repeat,
  Settings2,
  Tags,
  Wallet,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { PHONE, useMediaQuery } from '#/lib/use-media-query'
import { cn } from '#/lib/utils'

/**
 * The four a phone actually opens, plus the drawer for the rest. Dashboard
 * answers "how am I doing", the ledger answers "what just hit", and budget and
 * accounts are the two places you go to act. Everything else is a sit-down
 * task that can afford one more tap.
 */
const TABS = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/app/transactions', label: 'Transactions', icon: List },
  { to: '/app/budget', label: 'Budget', icon: Wallet },
  { to: '/app/accounts', label: 'Accounts', icon: Landmark },
] as const

const MORE = [
  { to: '/app/cash-flow', label: 'Cash flow', icon: ArrowLeftRight },
  { to: '/app/net-worth', label: 'Net worth', icon: LineChart },
  { to: '/app/investments', label: 'Investments', icon: PieChart },
  { to: '/app/recurring', label: 'Recurring', icon: Repeat },
] as const

const MORE_SETTINGS = [
  { to: '/app/settings/categories', label: 'Categories', icon: Tags },
  { to: '/app/settings/rules', label: 'Rules', icon: Settings2 },
] as const

const IN_MORE = [...MORE, ...MORE_SETTINGS].map((item) => item.to)

function isActive(pathname: string, to: string, exact = false) {
  return exact ? pathname === to : pathname.startsWith(to)
}

function Tab({
  label,
  icon: Icon,
  active,
  ...rest
}: {
  label: string
  icon: LucideIcon
  active: boolean
} & ({ to: string } | { onClick: () => void; 'aria-expanded': boolean })) {
  const body = (
    <>
      <Icon
        className="size-[1.125rem] shrink-0"
        strokeWidth={active ? 2 : 1.75}
        aria-hidden
      />
      <span className="mobile-tab-label">{label}</span>
    </>
  )

  if ('to' in rest) {
    return (
      <Link
        to={rest.to}
        className="mobile-tab"
        data-active={active || undefined}
        aria-current={active ? 'page' : undefined}
      >
        {body}
      </Link>
    )
  }

  return (
    <button
      type="button"
      className="mobile-tab"
      data-active={active || undefined}
      {...rest}
    >
      {body}
    </button>
  )
}

/**
 * Bottom tab bar — the phone's whole navigation. It sits on the canvas with a
 * single hairline, the same deal the sidebar makes: chrome you can find, never
 * chrome you look at. Active is the sidebar's muted fill, so the two navs speak
 * one language.
 */
export function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const phone = useMediaQuery(PHONE)
  const [moreOpen, setMoreOpen] = useState(false)

  // A destination reached from the drawer should close it behind you — and so
  // should a window that grew past the tab bar's reach.
  useEffect(() => {
    setMoreOpen(false)
  }, [pathname, phone])

  const moreActive = IN_MORE.some((to) => pathname.startsWith(to))

  return (
    <>
      <nav className="mobile-tabbar" aria-label="Sections">
        {TABS.map((tab) => (
          <Tab
            key={tab.to}
            to={tab.to}
            label={tab.label}
            icon={tab.icon}
            active={isActive(pathname, tab.to, 'exact' in tab && tab.exact)}
          />
        ))}
        <Tab
          label="More"
          icon={MoreHorizontal}
          active={moreActive}
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
        />
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom">
          <SheetHeader className="px-4 pt-1 pb-2">
            <SheetTitle className="kicker">More</SheetTitle>
          </SheetHeader>
          <div className="px-2 pb-4">
            <MoreGroup items={MORE} pathname={pathname} />
            <p className="kicker px-3 pt-5 pb-1.5">Settings</p>
            <MoreGroup items={MORE_SETTINGS} pathname={pathname} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

function MoreGroup({
  items,
  pathname,
}: {
  items: ReadonlyArray<{ to: string; label: string; icon: LucideIcon }>
  pathname: string
}) {
  return (
    <ul className="flex flex-col">
      {items.map(({ to, label, icon: Icon }) => {
        const active = pathname.startsWith(to)
        return (
          <li key={to}>
            <Link
              to={to}
              className={cn(
                'flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-medium no-underline transition-[background-color,transform] duration-[150ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.99]',
                active && 'bg-muted',
              )}
            >
              <span
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-3',
                  active
                    ? 'text-[var(--sea-ink)]'
                    : 'text-[var(--sea-ink-soft)]',
                )}
              >
                <Icon
                  className="size-[1.125rem] shrink-0 opacity-80"
                  strokeWidth={active ? 2 : 1.75}
                  aria-hidden
                />
                {label}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
