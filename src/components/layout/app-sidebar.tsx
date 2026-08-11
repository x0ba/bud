import { Link, useRouterState } from '@tanstack/react-router'
import {
  ArrowLeftRight,
  CreditCard,
  Landmark,
  LayoutDashboard,
  LineChart,
  List,
  PieChart,
  Repeat,
  Settings2,
  Tags,
  Wallet,
} from 'lucide-react'
import { cn } from '#/lib/utils'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: List },
  { to: '/budget', label: 'Budget', icon: Wallet },
  { to: '/cash-flow', label: 'Cash flow', icon: ArrowLeftRight },
  { to: '/net-worth', label: 'Net worth', icon: LineChart },
  { to: '/investments', label: 'Investments', icon: PieChart },
  { to: '/accounts', label: 'Accounts', icon: Landmark },
  { to: '/recurring', label: 'Recurring', icon: Repeat },
] as const

const settings = [
  { to: '/settings/categories', label: 'Categories', icon: Tags },
  { to: '/settings/rules', label: 'Rules', icon: Settings2 },
] as const

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col border-r border-border/80 bg-background">
      <div className="flex h-14 items-center gap-2.5 px-5">
        <div className="flex size-7 items-center justify-center rounded-md bg-[var(--lagoon-deep)] text-white">
          <CreditCard className="size-3.5" strokeWidth={2.25} />
        </div>
        <span className="display-title text-[1.35rem] leading-none tracking-tight text-[var(--sea-ink)]">
          Bud
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-6 px-3 py-3">
        <div className="flex flex-col gap-0.5">
          {nav.map((item) => {
            const active =
              item.to === '/'
                ? pathname === '/'
                : pathname.startsWith(item.to)
            const Icon = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors duration-150',
                  active
                    ? 'bg-[color-mix(in_oklab,var(--lagoon)_18%,transparent)] text-[var(--sea-ink)]'
                    : 'text-[var(--sea-ink-soft)] hover:bg-muted/70 hover:text-[var(--sea-ink)]',
                )}
              >
                <Icon className="size-4 opacity-80" strokeWidth={1.75} />
                {item.label}
              </Link>
            )
          })}
        </div>

        <div className="flex flex-col gap-0.5">
          <p className="px-2.5 pb-1 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Settings
          </p>
          {settings.map((item) => {
            const active = pathname.startsWith(item.to)
            const Icon = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors duration-150',
                  active
                    ? 'bg-[color-mix(in_oklab,var(--lagoon)_18%,transparent)] text-[var(--sea-ink)]'
                    : 'text-[var(--sea-ink-soft)] hover:bg-muted/70 hover:text-[var(--sea-ink)]',
                )}
              >
                <Icon className="size-4 opacity-80" strokeWidth={1.75} />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </aside>
  )
}
