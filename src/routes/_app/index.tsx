import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { AlertTriangle } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import {
  CategoryDot,
  DataList,
  HeroMetric,
  PageFrame,
  RowMeta,
  RowTitle,
  SectionHeader,
} from '#/components/dense'
import { AppShell } from '#/components/layout/app-shell'
import { CategoryDonut } from '#/components/category-donut'
import { Money } from '#/components/money'
import { PaceBar } from '#/components/pace-bar'
import { PlaidLinkButton } from '#/components/plaid-link-button'
import { daysUntil, formatUsdPlain } from '#/lib/money'

export const Route = createFileRoute('/_app/')({
  component: DashboardPage,
})

function DashboardPage() {
  const data = useQuery(api.dashboard.overview)
  const budget = useQuery(api.budgets.getMonth, {})

  return (
    <AppShell title="Dashboard" actions={<PlaidLinkButton variant="outline" />}>
      {data && budget ? (
        <PageFrame width="xl">
          {data.itemAlerts.length > 0 ? (
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/25 bg-amber-500/6 px-4 py-3 text-[13px]">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" />
              <div className="space-y-1">
                {data.itemAlerts.map((a) => (
                  <p key={a.itemId}>
                    <span className="font-medium text-[var(--sea-ink)]">
                      {a.institutionName}
                    </span>{' '}
                    <span className="text-muted-foreground">
                      needs attention —
                    </span>{' '}
                    <Link to="/accounts" className="font-medium">
                      reconnect
                    </Link>
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          <section className="grid gap-8 md:grid-cols-[1.25fr_0.75fr] md:items-end">
            <HeroMetric
              label="Net worth"
              value={formatUsdPlain(data.netWorth)}
              meta={
                <>
                  Spent {formatUsdPlain(data.spentThisMonth)} this month
                  {data.incomeThisMonth > 0
                    ? ` · earned ${formatUsdPlain(data.incomeThisMonth)}`
                    : ''}
                </>
              }
            />

            <div className="space-y-2.5">
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
                  {Math.round(
                    (budget.totals.flexSpent / budget.totals.flexPlanned) * 100,
                  )}
                  % spent
                </p>
              ) : (
                <p className="text-[12px] text-muted-foreground">
                  Set a flex budget to track pace against a target.
                </p>
              )}
            </div>
          </section>

          <section className="grid gap-10 lg:grid-cols-[200px_1fr]">
            <div className="flex flex-col items-start gap-4">
              <CategoryDonut segments={data.topCategories} />
              <ul className="w-full space-y-2">
                {data.topCategories.map((c) => (
                  <li
                    key={c.name}
                    className="flex items-center justify-between gap-3 text-[13px]"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <CategoryDot color={c.color} />
                      <span className="truncate text-[var(--sea-ink)]">
                        {c.name}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatUsdPlain(c.amount)}
                    </span>
                  </li>
                ))}
                {data.topCategories.length === 0 ? (
                  <li className="text-[13px] text-muted-foreground">
                    Connect a bank to see spending.
                  </li>
                ) : null}
              </ul>
            </div>

            <div className="space-y-8">
              {data.creditDue.length > 0 ? (
                <div>
                  <SectionHeader
                    title="Cards due"
                    action={
                      <Link
                        to="/accounts"
                        className="text-[12px] font-medium text-muted-foreground no-underline hover:text-foreground"
                      >
                        All accounts
                      </Link>
                    }
                  />
                  <DataList>
                    {data.creditDue.map((c) => {
                      const days = daysUntil(c.dueDate)
                      return (
                        <li key={c.accountId} className="data-row">
                          <div className="min-w-0">
                            <RowTitle>{c.name}</RowTitle>
                            <RowMeta>
                              {c.dueDate
                                ? days != null && days >= 0
                                  ? `Due in ${days} day${days === 1 ? '' : 's'}`
                                  : `Due ${c.dueDate}`
                                : 'No due date'}
                              {c.minimumPayment != null
                                ? ` · min ${formatUsdPlain(c.minimumPayment)}`
                                : ''}
                            </RowMeta>
                          </div>
                          <span className="amount-cell text-[var(--sea-ink)]">
                            {formatUsdPlain(c.balance)}
                          </span>
                        </li>
                      )
                    })}
                  </DataList>
                </div>
              ) : null}

              <div>
                <SectionHeader
                  title="Recent"
                  action={
                    <Link
                      to="/transactions"
                      className="text-[12px] font-medium text-muted-foreground no-underline hover:text-foreground"
                    >
                      View all
                    </Link>
                  }
                />
                <DataList>
                  {data.recent.map((tx) => (
                    <li key={tx._id} className="data-row">
                      <div className="min-w-0">
                        <RowTitle>
                          {tx.merchantName ?? 'Transaction'}
                        </RowTitle>
                        <RowMeta>
                          {tx.date}
                          {tx.categoryName ? ` · ${tx.categoryName}` : ''}
                        </RowMeta>
                      </div>
                      <Money amount={tx.amount} plaid />
                    </li>
                  ))}
                  {data.recent.length === 0 ? (
                    <li className="py-6 text-[13px] text-muted-foreground">
                      No transactions yet. Connect an account to get started.
                    </li>
                  ) : null}
                </DataList>
              </div>
            </div>
          </section>
        </PageFrame>
      ) : null}
    </AppShell>
  )
}
