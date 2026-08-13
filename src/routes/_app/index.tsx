import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { Fragment, useMemo } from 'react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  CategoryDot,
  DataList,
  EmptyState,
  HeroMetric,
  RowGroupHeader,
  RowMeta,
  RowTitle,
} from '#/components/dense'
import { Page, PageBody, PageSummary, Panel } from '#/components/panel'
import { CategoryDonut } from '#/components/category-donut'
import { AppShell } from '#/components/layout/app-shell'
import { Money } from '#/components/money'
import { PaceBar } from '#/components/pace-bar'
import { PlaidLinkButton } from '#/components/plaid-link-button'
import {
  cardPaymentStatus,
  formatDayLabel,
  formatMonthLabel,
  formatUsdPlain,
} from '#/lib/money'
import { prewarmQueries } from '#/lib/prewarm'

export const Route = createFileRoute('/_app/')({
  loader: () => {
    prewarmQueries(
      { query: api.dashboard.overview },
      { query: api.budgets.getMonth },
    )
  },
  component: DashboardPage,
})

/** A card earns dashboard space once payment lands inside a statement cycle. */
const DUE_SOON_DAYS = 14

/** Remainder slice — quiet enough that the named categories still lead. */
const OTHER_COLOR = 'color-mix(in oklab, var(--sea-ink) 16%, transparent)'

/**
 * A stale connection and a card due Friday are the same thing to the person
 * reading — something to act on — so they share one band instead of living in
 * a banner and a side column with different visual languages.
 */
type AttentionItem = {
  key: string
  severity?: 'urgent'
  title: string
  detail: string
  itemId?: Id<'plaidItems'>
  amount?: number
}

type MixRow = {
  name: string
  color: string
  amount: number
  muted?: boolean
}

function DashboardPage() {
  const data = useQuery(api.dashboard.overview)
  const budget = useQuery(api.budgets.getMonth, {})

  const attention = useMemo<Array<AttentionItem>>(() => {
    if (!data) return []

    const items: Array<AttentionItem> = data.itemAlerts.map((alert) => ({
      key: alert.itemId,
      severity: 'urgent',
      title: alert.institutionName,
      detail:
        alert.status === 'login_required'
          ? 'Reconnect to resume syncing'
          : (alert.errorMessage ?? 'Last sync failed'),
      itemId: alert.itemId,
    }))

    for (const card of data.creditDue) {
      const { days, overdue, dueSoon } = cardPaymentStatus(
        {
          nextPaymentDueDate: card.dueDate,
          isOverdue: card.isOverdue,
          minimumPayment: card.minimumPayment,
        },
        DUE_SOON_DAYS,
      )
      if (!overdue && !dueSoon) continue
      const minimum =
        card.minimumPayment != null
          ? ` · min ${formatUsdPlain(card.minimumPayment)}`
          : ''
      items.push({
        key: card.accountId,
        severity: overdue ? 'urgent' : undefined,
        title: card.name,
        detail:
          (overdue
            ? 'Payment overdue'
            : days === 0
              ? 'Due today'
              : `Due in ${days} day${days === 1 ? '' : 's'}`) + minimum,
        amount: card.balance,
      })
    }

    return items
  }, [data])

  /**
   * The ring reads as all of this month's spending, not just the top five, so
   * the section total and the figure in the donut agree.
   */
  const spendMix = useMemo<Array<MixRow>>(() => {
    if (!data) return []
    const named = data.topCategories.reduce((sum, c) => sum + c.amount, 0)
    const rest = data.spentThisMonth - named
    if (rest <= 0.5) return data.topCategories
    return [
      ...data.topCategories,
      {
        name: 'Everything else',
        color: OTHER_COLOR,
        amount: rest,
        muted: true,
      },
    ]
  }, [data])

  /** Chunking by day lets the date drop out of every row. */
  const recentDays = useMemo(() => {
    if (!data) return []
    const days: Array<{
      date: string
      spent: number
      rows: Array<(typeof data.recent)[number]>
    }> = []
    for (const tx of data.recent) {
      let day = days.at(-1)
      if (!day || day.date !== tx.date) {
        day = { date: tx.date, spent: 0, rows: [] }
        days.push(day)
      }
      day.rows.push(tx)
      if (tx.amount > 0) day.spent += tx.amount
    }
    return days
  }, [data])

  if (!data || !budget) {
    return (
      <AppShell
        title="Dashboard"
        actions={<PlaidLinkButton variant="outline" size="sm" />}
      />
    )
  }

  const monthLabel = formatMonthLabel(data.month)
  const kept = data.incomeThisMonth - data.spentThisMonth
  const flexPlanned = budget.totals.flexPlanned
  const hasFlexTarget = flexPlanned > 0

  const heroMeta =
    data.incomeThisMonth > 0
      ? kept >= 0
        ? `Kept ${formatUsdPlain(kept)} of ${formatUsdPlain(data.incomeThisMonth)} earned in ${monthLabel}`
        : `Spent ${formatUsdPlain(Math.abs(kept))} more than you earned in ${monthLabel}`
      : data.spentThisMonth > 0
        ? `${formatUsdPlain(data.spentThisMonth)} spent in ${monthLabel} · no income recorded yet`
        : `Nothing recorded in ${monthLabel} yet`

  const isNew =
    data.netWorth === 0 &&
    data.recent.length === 0 &&
    data.topCategories.length === 0 &&
    attention.length === 0

  if (isNew) {
    return (
      <AppShell
        title="Dashboard"
        actions={<PlaidLinkButton variant="outline" size="sm" />}
      >
        <Page>
          <EmptyState
            title="Nothing connected yet"
            description="Link a bank and Bud fills in your net worth, where the money went, and what's due next."
            action={<PlaidLinkButton />}
          />
        </Page>
      </AppShell>
    )
  }

  return (
    <AppShell
      title="Dashboard"
      actions={<PlaidLinkButton variant="outline" size="sm" />}
    >
      <Page>
        <PageSummary>
          <HeroMetric
            label="Net worth"
            value={formatUsdPlain(data.netWorth)}
            meta={heroMeta}
          />
          <div className="w-full max-w-[320px] space-y-2">
            <PaceBar
              label={hasFlexTarget ? 'Flex budget pace' : 'Spending pace'}
              spent={
                hasFlexTarget ? budget.totals.flexSpent : data.spentThisMonth
              }
              budget={
                hasFlexTarget ? flexPlanned : Math.max(data.spentThisMonth, 1)
              }
              pacePct={budget.pace.pct}
            />
            <p className="text-[12px] text-muted-foreground text-pretty">
              {hasFlexTarget ? (
                <span className="tabular-nums">
                  {formatUsdPlain(budget.totals.flexSpent)} of{' '}
                  {formatUsdPlain(flexPlanned)} flex
                </span>
              ) : (
                <Fragment>
                  <Link to="/budget" className="font-medium">
                    Set a flex budget
                  </Link>{' '}
                  to track against a target.
                </Fragment>
              )}
            </p>
          </div>
        </PageSummary>

        <PageBody>
          {attention.length > 0 ? (
            <Panel
              id="dashboard-attention"
              title="Needs you"
              hint={`${attention.length} ${attention.length === 1 ? 'item' : 'items'}`}
              action={
                <Link to="/accounts" className="section-link">
                  All accounts
                </Link>
              }
              flush
            >
              <ul className="flex flex-col">
                {attention.map((item) => (
                  <li
                    key={item.key}
                    className="attention-band"
                    data-severity={item.severity}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-[var(--sea-ink)]">
                        {item.title}
                      </p>
                      <p className="truncate text-[12px] text-muted-foreground">
                        {item.detail}
                      </p>
                    </div>
                    {item.itemId ? (
                      <PlaidLinkButton
                        label="Reconnect"
                        itemId={item.itemId}
                        variant="outline"
                        size="sm"
                      />
                    ) : item.amount != null ? (
                      <span className="amount-cell shrink-0 text-[13px] text-[var(--sea-ink)]">
                        {formatUsdPlain(item.amount)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          <Panel
            id="dashboard-mix"
            span={5}
            title="Where it's going"
            description={`Biggest categories in ${monthLabel}.`}
            value={formatUsdPlain(data.spentThisMonth)}
            action={
              <Link to="/cash-flow" className="section-link">
                Cash flow
              </Link>
            }
          >
            {spendMix.length > 0 ? (
              <div className="grid gap-5 pt-1 sm:grid-cols-[120px_minmax(0,1fr)] sm:items-center">
                <CategoryDonut segments={spendMix} />
                <DataList>
                  {spendMix.map((row) => (
                    <li key={row.name} className="data-row">
                      <span className="flex min-w-0 items-center gap-2">
                        <CategoryDot color={row.color} />
                        <span
                          className={
                            row.muted
                              ? 'truncate text-muted-foreground'
                              : 'truncate font-medium text-[var(--sea-ink)]'
                          }
                        >
                          {row.name}
                        </span>
                      </span>
                      <span
                        className={
                          row.muted
                            ? 'amount-cell font-medium text-muted-foreground'
                            : 'amount-cell text-[var(--sea-ink)]'
                        }
                      >
                        {formatUsdPlain(row.amount)}
                      </span>
                    </li>
                  ))}
                </DataList>
              </div>
            ) : (
              <p className="py-4 text-[13px] text-muted-foreground">
                No spending recorded in {monthLabel} yet.
              </p>
            )}
          </Panel>

          <Panel
            id="dashboard-recent"
            span={7}
            title="Recent"
            hint={
              recentDays.length > 0
                ? `${data.recent.length} transactions`
                : undefined
            }
            action={
              <Link to="/transactions" className="section-link">
                View all
              </Link>
            }
            flush
          >
            <DataList>
              {recentDays.map((day) => (
                <Fragment key={day.date}>
                  <RowGroupHeader
                    label={formatDayLabel(day.date)}
                    value={
                      day.spent > 0 ? formatUsdPlain(day.spent) : undefined
                    }
                  />
                  {day.rows.map((tx) => (
                    <li key={tx._id} className="data-row">
                      <div className="min-w-0">
                        <RowTitle>{tx.merchantName}</RowTitle>
                        {tx.categoryName ? (
                          <RowMeta>{tx.categoryName}</RowMeta>
                        ) : null}
                      </div>
                      <Money amount={tx.amount} plaid />
                    </li>
                  ))}
                </Fragment>
              ))}
              {recentDays.length === 0 ? (
                <li className="py-6 text-[13px] text-muted-foreground">
                  No transactions yet.
                </li>
              ) : null}
            </DataList>
          </Panel>
        </PageBody>
      </Page>
    </AppShell>
  )
}
