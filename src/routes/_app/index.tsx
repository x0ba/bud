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
  PageFrame,
  RowGroupHeader,
  RowMeta,
  RowTitle,
  Section,
} from '#/components/dense'
import { CategoryDonut } from '#/components/category-donut'
import { AppShell } from '#/components/layout/app-shell'
import { Money } from '#/components/money'
import { PaceBar } from '#/components/pace-bar'
import { PlaidLinkButton } from '#/components/plaid-link-button'
import {
  daysUntil,
  formatDayLabel,
  formatMonthLabel,
  formatUsdPlain,
} from '#/lib/money'

export const Route = createFileRoute('/_app/')({
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
      const days = daysUntil(card.dueDate)
      if (days == null || days > DUE_SOON_DAYS) continue
      const minimum =
        card.minimumPayment != null
          ? ` · min ${formatUsdPlain(card.minimumPayment)}`
          : ''
      items.push({
        key: card.accountId,
        severity: days < 0 ? 'urgent' : undefined,
        title: card.name,
        detail:
          (days < 0
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
      { name: 'Everything else', color: OTHER_COLOR, amount: rest, muted: true },
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

  return (
    <AppShell
      title="Dashboard"
      actions={<PlaidLinkButton variant="outline" size="sm" />}
    >
      <PageFrame>
        {isNew ? (
          <EmptyState
            title="Nothing connected yet"
            description="Link a bank and Bud fills in your net worth, where the money went, and what's due next."
            action={<PlaidLinkButton />}
          />
        ) : (
          <Fragment>
            <section className="grid gap-8 md:grid-cols-[1fr_260px] md:items-end">
              <HeroMetric
                label="Net worth"
                value={formatUsdPlain(data.netWorth)}
                meta={heroMeta}
              />
              <div className="space-y-2">
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
            </section>

            {attention.length > 0 ? (
              <Section
                title="Needs you"
                action={
                  <Link to="/accounts" className="section-link">
                    All accounts
                  </Link>
                }
              >
                <ul className="flex flex-col gap-2">
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
              </Section>
            ) : null}

            <Section
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
                <div className="grid gap-6 sm:grid-cols-[120px_minmax(0,1fr)] sm:items-center">
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
                <p className="py-3 text-[13px] text-muted-foreground">
                  No spending recorded in {monthLabel} yet.
                </p>
              )}
            </Section>

            <Section
              title="Recent"
              action={
                <Link to="/transactions" className="section-link">
                  View all
                </Link>
              }
            >
              <DataList>
                {recentDays.map((day) => (
                  <Fragment key={day.date}>
                    <RowGroupHeader
                      label={formatDayLabel(day.date)}
                      value={day.spent > 0 ? formatUsdPlain(day.spent) : undefined}
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
                  <li className="py-3 text-[13px] text-muted-foreground">
                    No transactions yet.
                  </li>
                ) : null}
              </DataList>
            </Section>
          </Fragment>
        )}
      </PageFrame>
    </AppShell>
  )
}
