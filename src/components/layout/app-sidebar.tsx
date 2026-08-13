import { Link, useRouterState } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeftRight,
  Landmark,
  LayoutDashboard,
  LineChart,
  List,
  PanelLeftClose,
  PieChart,
  Repeat,
  Settings2,
  Tags,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '#/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { SproutMark } from '#/components/sprout'
import { cn } from '#/lib/utils'

const SIDEBAR_COLLAPSED_KEY = 'bud.sidebar-collapsed'
const ICON_RAIL = 'flex w-14 shrink-0 items-center justify-center'
const EASE = 'ease-[cubic-bezier(0.23,1,0.32,1)]'

const nav = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/transactions', label: 'Transactions', icon: List },
  { to: '/app/budget', label: 'Budget', icon: Wallet },
  { to: '/app/cash-flow', label: 'Cash flow', icon: ArrowLeftRight },
  { to: '/app/net-worth', label: 'Net worth', icon: LineChart },
  { to: '/app/investments', label: 'Investments', icon: PieChart },
  { to: '/app/accounts', label: 'Accounts', icon: Landmark },
  { to: '/app/recurring', label: 'Recurring', icon: Repeat },
] as const

const settings = [
  { to: '/app/settings/categories', label: 'Categories', icon: Tags },
  { to: '/app/settings/rules', label: 'Rules', icon: Settings2 },
] as const

function IconSquare({
  active,
  children,
}: {
  active: boolean
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'flex size-8 items-center justify-center rounded-md transition-[color,background-color] duration-[150ms]',
        EASE,
        active
          ? 'bg-muted text-[var(--sea-ink)]'
          : 'text-[var(--sea-ink-soft)] group-hover:bg-muted/60 group-hover:text-[var(--sea-ink)]',
      )}
    >
      {children}
    </span>
  )
}

function NavLink({
  to,
  label,
  icon: Icon,
  active,
  collapsed,
}: {
  to: string
  label: string
  icon: LucideIcon
  active: boolean
  collapsed: boolean
}) {
  const link = (
    <Link
      to={to}
      aria-label={collapsed ? label : undefined}
      className={cn(
        'group flex w-full items-center overflow-hidden text-[13px] font-medium no-underline',
        'transition-transform duration-[150ms]',
        EASE,
        'active:scale-[0.98]',
      )}
    >
      <span className={ICON_RAIL}>
        <IconSquare active={active}>
          <Icon
            className={cn('size-4', active ? 'opacity-90' : 'opacity-70')}
            strokeWidth={active ? 2 : 1.75}
          />
        </IconSquare>
      </span>
      <span
        aria-hidden={collapsed || undefined}
        className={cn(
          'shrink-0 pr-3 whitespace-nowrap transition-[opacity,color] duration-[200ms] motion-reduce:transition-none',
          EASE,
          collapsed ? 'opacity-0' : 'opacity-100',
          active
            ? 'text-[var(--sea-ink)]'
            : 'text-[var(--sea-ink-soft)] group-hover:text-[var(--sea-ink)]',
        )}
      >
        {label}
      </span>
    </Link>
  )

  if (!collapsed) return link

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  // Only rendered client-side (behind EnsureUser), so reading storage in the
  // initializer is safe and avoids a expanded→collapsed flash on mount.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return (
        typeof window !== 'undefined' &&
        localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
      )
    } catch {
      return false
    }
  })

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        // ignore storage access errors
      }
      return next
    })
  }

  return (
    <aside
      data-collapsed={collapsed || undefined}
      className={cn(
        // Phones navigate from the bottom bar instead — a 212px rail would eat
        // half of a 390px viewport.
        'sticky top-0 hidden h-dvh min-w-0 shrink-0 flex-col overflow-x-hidden overflow-y-auto bg-background md:flex',
        'transition-[width] duration-[200ms] motion-reduce:transition-none',
        EASE,
        collapsed ? 'w-14' : 'w-[212px]',
      )}
    >
      <div className="flex h-12 items-center">
        <div className={ICON_RAIL}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleCollapsed}
                  aria-label="Expand sidebar"
                  aria-expanded={false}
                  className="flex size-8 items-center justify-center rounded-md text-[var(--sea-ink)] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <SproutMark className="size-[22px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Expand sidebar
              </TooltipContent>
            </Tooltip>
          ) : (
            <SproutMark className="size-[22px] text-[var(--sea-ink)]" />
          )}
        </div>
        <span
          className={cn(
            'display-title shrink-0 text-[19px] font-semibold leading-none tracking-tight text-[var(--sea-ink)] transition-opacity duration-[200ms] motion-reduce:transition-none',
            EASE,
            collapsed ? 'pointer-events-none opacity-0' : 'opacity-100',
          )}
        >
          Bud
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={toggleCollapsed}
              aria-label="Collapse sidebar"
              aria-expanded
              tabIndex={collapsed ? -1 : 0}
              aria-hidden={collapsed || undefined}
              className={cn(
                'mr-2 ml-auto shrink-0 text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]',
                collapsed && 'pointer-events-none',
              )}
            >
              <PanelLeftClose />
            </Button>
          </TooltipTrigger>
          {collapsed ? null : (
            <TooltipContent side="right" sideOffset={8}>
              Collapse sidebar
            </TooltipContent>
          )}
        </Tooltip>
      </div>

      <nav className="flex flex-1 flex-col gap-7 pt-0.5 pb-3">
        <div className="flex flex-col gap-px">
          {nav.map((item) => {
            const active =
              item.to === '/app'
                ? pathname === '/app'
                : pathname.startsWith(item.to)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                label={item.label}
                icon={item.icon}
                active={active}
                collapsed={collapsed}
              />
            )
          })}
        </div>

        <div className="flex flex-col gap-px">
          <p
            aria-hidden={collapsed || undefined}
            className={cn(
              'kicker shrink-0 pr-3 pl-14 whitespace-nowrap transition-opacity duration-[200ms] motion-reduce:transition-none',
              EASE,
              collapsed
                ? 'h-0 overflow-hidden pb-0 opacity-0'
                : 'pb-1.5 opacity-100',
            )}
          >
            Settings
          </p>
          {settings.map((item) => {
            const active = pathname.startsWith(item.to)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                label={item.label}
                icon={item.icon}
                active={active}
                collapsed={collapsed}
              />
            )
          })}
        </div>
      </nav>
    </aside>
  )
}
