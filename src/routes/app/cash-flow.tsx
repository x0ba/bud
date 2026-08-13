import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { useMemo, useState } from 'react'
import { api } from '../../../convex/_generated/api'
import {
  CategoryDot,
  DataList,
  EmptyState,
  HeroMetric,
  ShareBar,
  Stat,
} from '#/components/dense'
import { Page, PageBody, PageSummary, Panel } from '#/components/panel'
import { FlowBar } from '#/components/flow-bar'
import { AppShell } from '#/components/layout/app-shell'
import { Input } from '#/components/ui/input'
import { currentMonth, formatMonthLabel, formatUsdPlain } from '#/lib/money'
import { prewarmQueries } from '#/lib/prewarm'

export const Route = createFileRoute('/app/cash-flow')({
  loader: () => {
    const month = currentMonth()
    prewarmQueries(
      { query: api.budgets.getMonth, args: { month } },
      { query: api.transactions.spendingByCategory, args: { month } },
    )
  },
  component: CashFlowPage,
})

type GroupKey = 'fixed' | 'flex' | 'non_monthly' | 'other'

const GROUPS: Array<{ key: GroupKey; label: string }> = [
  { key: 'fixed', label: 'Fixed' },
  { key: 'flex', label: 'Flex' },
  { key: 'non_monthly', label: 'Non-monthly' },
  { key: 'other', label: 'Other' },
]

function CashFlowPage() {
  const [month, setMonth] = useState(currentMonth())
  const budget = useQuery(api.budgets.getMonth, { month })
  const byCategory = useQuery(api.transactions.spendingByCategory, { month })

  /**
   * Spending is chunked by budget type so the breakdown reads as a few labelled
   * blocks with subtotals instead of one long run of category rows. Bars scale
   * against the single largest category, which keeps magnitude comparable
   * across groups.
   */
  const breakdown = useMemo(() => {
    if (!budget || !byCategory) return null
    const typeByCategory = new Map(
      budget.items.map((i) => [i.categoryId as string, i.budgetType]),
    )
    const rowsByGroup = new Map<
      GroupKey,
      Array<{ name: string; color: string; amount: number }>
    >()

    for (const row of byCategory) {
      const type = row.categoryId
        ? typeByCategory.get(row.categoryId)
        : undefined
      const key: GroupKey =
        type === 'fixed' || type === 'flex' || type === 'non_monthly'
          ? type
          : 'other'
      const rows = rowsByGroup.get(key) ?? []
      rows.push({ name: row.name, color: row.color, amount: row.amount })
      rowsByGroup.set(key, rows)
    }

    return {
      max: Math.max(...byCategory.map((r) => r.amount), 1),
      groups: GROUPS.flatMap(({ key, label }) => {
        const rows = rowsByGroup.get(key)
        if (!rows || rows.length === 0) return []
        return [
          {
            key,
            label,
            rows,
            total: rows.reduce((sum, r) => sum + r.amount, 0),
          },
        ]
      }),
    }
  }, [budget, byCategory])

  if (!budget || !byCategory || !breakdown) {
    return <AppShell title="Cash flow" />
  }

  const { income, spent } = budget.totals
  const kept = income - spent
  const keptRate = income > 0 ? Math.round((kept / income) * 100) : null

  return (
    <AppShell
      title="Cash flow"
      actions={
        <Input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="h-8 w-[142px]"
          aria-label="Month"
        />
      }
    >
      <Page>
        <PageSummary className="flex-col items-stretch sm:flex-row sm:items-end">
          <HeroMetric
            label={`${kept < 0 ? 'Overspent' : 'Kept'} in ${formatMonthLabel(month)}`}
            value={formatUsdPlain(Math.abs(kept))}
            tone={kept < 0 ? 'over' : 'default'}
            meta={
              income > 0
                ? kept < 0
                  ? `Spent ${formatUsdPlain(spent)} against ${formatUsdPlain(income)} of income`
                  : `${keptRate}% of ${formatUsdPlain(income)} income kept`
                : 'No income recorded this month.'
            }
          />
          <div className="flex min-w-0 flex-1 items-end justify-end gap-8">
            <div className="hidden min-w-0 max-w-[420px] flex-1 lg:block">
              <FlowBar income={income} spent={spent} />
            </div>
            <Stat
              label="Money in"
              value={formatUsdPlain(income)}
              tone={income > 0 ? 'positive' : 'muted'}
            />
            <Stat label="Money out" value={formatUsdPlain(spent)} />
          </div>
        </PageSummary>

        <div className="lg:hidden">
          <FlowBar income={income} spent={spent} />
        </div>

        {/* One panel per budget type: the grouping was a subhead buried in a
            single list, and it's the axis people actually compare across. */}
        <PageBody>
          {breakdown.groups.length > 0 ? (
            breakdown.groups.map((group) => (
              <Panel
                key={group.key}
                id={`cash-flow-${group.key}`}
                span={4}
                title={group.label}
                value={formatUsdPlain(group.total)}
                hint={
                  spent > 0
                    ? `${Math.round((group.total / spent) * 100)}%`
                    : undefined
                }
                flush
              >
                <DataList>
                  {group.rows.map((row) => (
                    <li
                      key={`${group.key}-${row.name}`}
                      className="grid grid-cols-[1fr_56px_auto] items-center gap-4 py-2.5 text-[13px]"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <CategoryDot color={row.color} />
                        <span className="truncate font-medium text-[var(--sea-ink)]">
                          {row.name}
                        </span>
                      </span>
                      <ShareBar
                        value={row.amount}
                        total={breakdown.max}
                        color={row.color}
                      />
                      <span className="amount-cell text-[var(--sea-ink)]">
                        {formatUsdPlain(row.amount)}
                      </span>
                    </li>
                  ))}
                </DataList>
              </Panel>
            ))
          ) : (
            <Panel
              id="cash-flow-empty"
              title="Where it went"
              collapsible={false}
            >
              <EmptyState
                title="Nothing spent yet"
                description={`No spending recorded for ${formatMonthLabel(month)}. Connect an account or pick another month.`}
              />
            </Panel>
          )}
        </PageBody>

        <p className="text-[12px] text-muted-foreground text-pretty">
          Transfers between your own accounts are excluded from money out.
        </p>
      </Page>
    </AppShell>
  )
}
