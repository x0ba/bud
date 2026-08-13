import { Link, useRouterState } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeftRight,
  Landmark,
  LayoutDashboard,
  LineChart,
  List,
  PanelLeft,
  PanelLeftClose,
  PieChart,
  Repeat,
  Settings2,
  Tags,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '#/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { cn } from '#/lib/utils'

const SIDEBAR_COLLAPSED_KEY = 'bud.sidebar-collapsed'

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
        'flex items-center gap-2.5 rounded-md text-[13px] font-medium no-underline transition-[color,background-color,transform] duration-[150ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98]',
        collapsed ? 'justify-center px-0 py-2' : 'px-2.5 py-[7px]',
        active
          ? 'bg-muted text-[var(--sea-ink)]'
          : 'text-[var(--sea-ink-soft)] hover:bg-muted/60 hover:text-[var(--sea-ink)]',
      )}
    >
      <Icon
        className={cn('size-4 shrink-0', active ? 'opacity-90' : 'opacity-70')}
        strokeWidth={active ? 2 : 1.75}
      />
      <span
        className={cn(
          'truncate transition-opacity duration-[150ms] ease-[cubic-bezier(0.23,1,0.32,1)]',
          collapsed ? 'sr-only' : 'opacity-100',
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
        'sticky top-0 hidden h-dvh shrink-0 flex-col overflow-y-auto bg-background md:flex',
        'transition-[width] duration-[200ms] ease-[cubic-bezier(0.23,1,0.32,1)]',
        'motion-reduce:transition-none',
        collapsed ? 'w-14' : 'w-[212px]',
      )}
    >
      <div
        className={cn(
          'flex h-12 items-center',
          collapsed
            ? 'justify-center px-1.5'
            : 'justify-between gap-2 px-3 pl-5',
        )}
      >
        {!collapsed ? (
          <span className="display-title text-[1.3rem] leading-none tracking-tight text-[var(--sea-ink)]">
            Bud
          </span>
        ) : null}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
              className="text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
            >
              {collapsed ? <PanelLeft /> : <PanelLeftClose />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          </TooltipContent>
        </Tooltip>
      </div>

      <nav
        className={cn(
          'flex flex-1 flex-col gap-7 pt-0.5 pb-3',
          collapsed ? 'px-1.5' : 'px-2.5',
        )}
      >
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
          {!collapsed ? <p className="kicker px-2.5 pb-1.5">Settings</p> : null}
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
