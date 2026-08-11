import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { AlertTriangle } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { AppShell } from '#/components/layout/app-shell'
import { CategoryDonut } from '#/components/category-donut'
import { Money } from '#/components/money'
import { PaceBar } from '#/components/pace-bar'
import { PlaidLinkButton } from '#/components/plaid-link-button'
import { Skeleton } from '#/components/ui/skeleton'
import { daysUntil, formatUsdPlain } from '#/lib/money'

export const Route = createFileRoute('/_app/')({
  component: DashboardPage,
})

function DashboardPage() {
  const data = useQuery(api.dashboard.overview)
  const budget = useQuery(api.budgets.getMonth, {})

  return (
    <AppShell title="Dashboard" actions={<PlaidLinkButton variant="outline" />}>
      {!data || !budget ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <div className="mx-auto flex max-w-5xl flex-col gap-8">
          {data.itemAlerts.length > 0 ? (
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/8 px-4 py-3 text-sm">
              <AlertTriangle className="mt-0.5 size-4 text-amber-600" />
              <div className="space-y-1">
                {data.itemAlerts.map((a) => (
                  <p key={a.itemId}>
                    <span className="font-medium">{a.institutionName}</span> needs
                    attention —{' '}
                    <Link to="/accounts" className="underline">
                      reconnect
                    </Link>
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          <section className="grid gap-8 md:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Net worth
              </p>
              <p className="display-title text-[2.75rem] leading-none tracking-tight text-[var(--sea-ink)] tabular-nums">
                {formatUsdPlain(data.netWorth)}
              </p>
              <p className="pt-2 text-sm text-muted-foreground">
                Spent {formatUsdPlain(data.spentThisMonth)} this month
                {data.incomeThisMonth > 0
                  ? ` · earned ${formatUsdPlain(data.incomeThisMonth)}`
                  : ''}
              </p>
            </div>

            <div className="space-y-3 self-end">
              <PaceBar
                label={
                  budget.totals.flexPlanned > 0
                    ? 'Flex budget pace'
                    : 'Spending pace'
                }
                spent={
                  budget.totals.flexPlanned > 0
                    ? budget.totals.flexSpent
                    : data.spentThisMonth
                }
                budget={
                  budget.totals.flexPlanned > 0
                    ? budget.totals.flexPlanned
                    : Math.max(data.spentThisMonth, 1)
                }
                pacePct={budget.pace.pct}
              />
              {budget.totals.flexPlanned > 0 ? (
                <p className="text-[12px] tabular-nums text-muted-foreground">
                  {formatUsdPlain(budget.totals.flexSpent)} of{' '}
                  {formatUsdPlain(budget.totals.flexPlanned)} flex ·{' '}
                  {Math.round((budget.totals.flexSpent / budget.totals.flexPlanned) * 100)}
                  % spent
                </p>
              ) : (
                <p className="text-[12px] text-muted-foreground">
                  Set a flex budget to track pace against a target.
                </p>
              )}
            </div>
          </section>

          <section className="grid gap-8 lg:grid-cols-[220px_1fr]">
            <div className="flex flex-col items-start gap-4">
              <CategoryDonut segments={data.topCategories} />
              <ul className="w-full space-y-1.5">
                {data.topCategories.map((c) => (
                  <li
                    key={c.name}
                    className="flex items-center justify-between gap-3 text-[13px]"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: c.color }}
                      />
                      <span className="truncate">{c.name}</span>
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatUsdPlain(c.amount)}
                    </span>
                  </li>
                ))}
                {data.topCategories.length === 0 ? (
                  <li className="text-sm text-muted-foreground">
                    Connect a bank to see spending.
                  </li>
                ) : null}
              </ul>
            </div>

            <div className="space-y-6">
              {data.creditDue.length > 0 ? (
                <div>
                  <div className="mb-2 flex items-baseline justify-between">
                    <h2 className="text-[13px] font-semibold text-[var(--sea-ink)]">
                      Cards due
                    </h2>
                    <Link
                      to="/accounts"
                      className="text-[12px] text-muted-foreground no-underline hover:text-foreground"
                    >
                      All accounts
                    </Link>
                  </div>
                  <ul className="divide-y divide-border/70 border-y border-border/70">
                    {data.creditDue.map((c) => {
                      const days = daysUntil(c.dueDate)
                      return (
                        <li
                          key={c.accountId}
                          className="flex items-center justify-between gap-3 py-2.5 text-[13px]"
                        >
                          <div>
                            <p className="font-medium">{c.name}</p>
                            <p className="text-[12px] text-muted-foreground">
                              {c.dueDate
                                ? days != null && days >= 0
                                  ? `Due in ${days} day${days === 1 ? '' : 's'}`
                                  : `Due ${c.dueDate}`
                                : 'No due date'}
                              {c.minimumPayment != null
                                ? ` · min ${formatUsdPlain(c.minimumPayment)}`
                                : ''}
                            </p>
                          </div>
                          <span className="tabular-nums font-medium">
                            {formatUsdPlain(c.balance)}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ) : null}

              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <h2 className="text-[13px] font-semibold text-[var(--sea-ink)]">
                    Recent
                  </h2>
                  <Link
                    to="/transactions"
                    className="text-[12px] text-muted-foreground no-underline hover:text-foreground"
                  >
                    View all
                  </Link>
                </div>
                <ul className="divide-y divide-border/70 border-y border-border/70">
                  {data.recent.map((tx) => (
                    <li
                      key={tx._id}
                      className="flex items-center justify-between gap-3 py-2.5 text-[13px]"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {tx.merchantName ?? 'Transaction'}
                        </p>
                        <p className="truncate text-[12px] text-muted-foreground">
                          {tx.date}
                          {tx.categoryName ? ` · ${tx.categoryName}` : ''}
                        </p>
                      </div>
                      <Money amount={tx.amount} plaid />
                    </li>
                  ))}
                  {data.recent.length === 0 ? (
                    <li className="py-6 text-sm text-muted-foreground">
                      No transactions yet. Connect an account to get started.
                    </li>
                  ) : null}
                </ul>
              </div>
            </div>
          </section>
        </div>
      )}
    </AppShell>
  )
}
