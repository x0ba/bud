import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  CategoryDot,
  DataList,
  HeroMetric,
  Kicker,
} from '#/components/dense'
import { Page, PageBody, PageSummary, Panel } from '#/components/panel'
import { AppShell } from '#/components/layout/app-shell'
import { PaceBar } from '#/components/pace-bar'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { currentMonth, formatUsdPlain } from '#/lib/money'
import { prewarmQueries } from '#/lib/prewarm'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/_app/budget')({
  loader: () => {
    prewarmQueries({
      query: api.budgets.getMonth,
      args: { month: currentMonth() },
    })
  },
  component: BudgetPage,
})

function BudgetPage() {
  const [month, setMonth] = useState(currentMonth())
  const data = useQuery(api.budgets.getMonth, { month })
  const upsert = useMutation(api.budgets.upsert)
  const copyFromPrevious = useMutation(api.budgets.copyFromPrevious)

  const [flexBudget, setFlexBudget] = useState('')
  const [expectedIncome, setExpectedIncome] = useState('')
  const [fixedAmounts, setFixedAmounts] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!data) return
    setFlexBudget(
      data.flexBudget != null ? String(data.flexBudget) : String(data.totals.flexPlanned || ''),
    )
    setExpectedIncome(
      data.expectedIncome != null ? String(data.expectedIncome) : '',
    )
    const next: Record<string, string> = {}
    for (const item of data.items.filter((i) => i.budgetType === 'fixed')) {
      next[item.categoryId] = item.planned ? String(item.planned) : ''
    }
    setFixedAmounts(next)
  }, [data])

  // Section subtotals feed the headers, so each section answers "how am I
  // doing here?" before you read a single row.
  const rollup = useMemo(() => {
    const flexPlanned = Number(flexBudget) || data?.totals.flexPlanned || 0
    const fixed = (data?.items ?? []).filter((i) => i.budgetType === 'fixed')
    const nonMonthly = (data?.items ?? []).filter(
      (i) => i.budgetType === 'non_monthly',
    )
    const fixedPlanned = fixed.reduce(
      (sum, i) => sum + (Number(fixedAmounts[i.categoryId]) || 0),
      0,
    )
    const fixedSpent = fixed.reduce((sum, i) => sum + i.spent, 0)
    const nonMonthlySpent = nonMonthly.reduce((sum, i) => sum + i.spent, 0)
    const planned = flexPlanned + fixedPlanned
    return {
      flexPlanned,
      fixedPlanned,
      fixedSpent,
      nonMonthlySpent,
      planned,
      left: planned - (data?.totals.spent ?? 0),
    }
  }, [data, flexBudget, fixedAmounts])

  const save = async () => {
    if (!data) return
    const items = Object.entries(fixedAmounts)
      .filter(([, v]) => v !== '')
      .map(([categoryId, amount]) => ({
        categoryId: categoryId as Id<'categories'>,
        amount: Number(amount),
      }))
    await upsert({
      month,
      flexBudget: flexBudget === '' ? undefined : Number(flexBudget),
      expectedIncome:
        expectedIncome === '' ? undefined : Number(expectedIncome),
      items,
    })
    toast.success('Budget saved')
  }

  return (
    <AppShell
      title="Budget"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              void copyFromPrevious({ month }).then((id) =>
                toast.success(id ? 'Copied from last month' : 'No previous budget'),
              )
            }
          >
            Copy last month
          </Button>
          <Button size="sm" onClick={() => void save()}>
            Save
          </Button>
        </div>
      }
    >
      {data ? (
        <Page>
          <PageSummary>
            <HeroMetric
              label={rollup.planned > 0 ? 'Left to spend' : 'Spent this month'}
              value={formatUsdPlain(
                rollup.planned > 0 ? rollup.left : data.totals.spent,
              )}
              meta={
                rollup.planned > 0 ? (
                  <>
                    {formatUsdPlain(data.totals.spent)} spent of{' '}
                    {formatUsdPlain(rollup.planned)} planned
                  </>
                ) : (
                  'Set a flex budget below to track what’s left.'
                )
              }
            />
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Kicker>Month</Kicker>
                <Input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="mt-1.5 w-[150px]"
                />
              </div>
              <div>
                <Kicker>Expected income</Kicker>
                <Input
                  inputMode="decimal"
                  value={expectedIncome}
                  onChange={(e) => setExpectedIncome(e.target.value)}
                  className="mt-1.5 w-[130px] text-right tabular-nums"
                  placeholder="0"
                />
              </div>
            </div>
          </PageSummary>

          <PageBody>
          <Panel
            id="budget-flex"
            span={5}
            title="Flex pool"
            description="Groceries, dining, shopping — one monthly number."
            value={formatUsdPlain(data.totals.flexSpent)}
            hint={
              rollup.flexPlanned > 0
                ? `of ${formatUsdPlain(rollup.flexPlanned)}`
                : undefined
            }
            tone={
              rollup.flexPlanned > 0 && data.totals.flexSpent > rollup.flexPlanned
                ? 'over'
                : 'default'
            }
            action={
              <Input
                inputMode="decimal"
                value={flexBudget}
                onChange={(e) => setFlexBudget(e.target.value)}
                className="h-8 w-[104px] text-right tabular-nums"
                placeholder="Budget"
                aria-label="Flex budget"
              />
            }
          >
            <PaceBar
              spent={data.totals.flexSpent}
              budget={rollup.flexPlanned || 1}
              pacePct={data.pace.pct}
              label={`${Math.round((data.totals.flexSpent / Math.max(rollup.flexPlanned, 1)) * 100)}% of flex spent`}
            />
            <DataList className="mt-3">
              {data.items
                .filter((i) => i.budgetType === 'flex' && i.spent > 0)
                .map((i) => (
                  <li key={i.categoryId} className="data-row">
                    <span className="flex min-w-0 items-center gap-2">
                      <CategoryDot color={i.color} />
                      <span className="truncate font-medium text-[var(--sea-ink)]">
                        {i.name}
                      </span>
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatUsdPlain(i.spent)}
                    </span>
                  </li>
                ))}
            </DataList>
          </Panel>

          <Panel
            id="budget-fixed"
            span={7}
            title="Fixed"
            description="Rent, insurance, subscriptions — same every month."
            value={formatUsdPlain(rollup.fixedSpent)}
            hint={
              rollup.fixedPlanned > 0
                ? `of ${formatUsdPlain(rollup.fixedPlanned)}`
                : undefined
            }
            tone={
              rollup.fixedPlanned > 0 && rollup.fixedSpent > rollup.fixedPlanned
                ? 'over'
                : 'default'
            }
            flush
          >
            <DataList>
              {data.items
                .filter((i) => i.budgetType === 'fixed')
                .map((i) => {
                  const planned = Number(fixedAmounts[i.categoryId] || 0)
                  const pct = planned > 0 ? i.spent / planned : 0
                  const over = planned > 0 && i.spent > planned
                  return (
                    <li
                      key={i.categoryId}
                      className="grid grid-cols-[1fr_64px_104px] items-center gap-4 py-2.5 text-[13px]"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--sea-ink)]">
                          {i.name}
                        </p>
                        <p
                          className={cn(
                            'text-[12px] tabular-nums',
                            over ? 'text-amber-700' : 'text-muted-foreground',
                          )}
                        >
                          {formatUsdPlain(i.spent)} spent
                          {planned > 0 ? ` · ${Math.round(pct * 100)}%` : ''}
                        </p>
                      </div>
                      <div
                        className="h-1 w-16 overflow-hidden rounded-full bg-muted"
                        aria-hidden
                      >
                        <div
                          className={cn(
                            'h-full rounded-full',
                            over
                              ? 'bg-destructive/80'
                              : 'bg-[var(--lagoon-deep)]',
                          )}
                          style={{ width: `${Math.min(100, pct * 100)}%` }}
                        />
                      </div>
                      <Input
                        inputMode="decimal"
                        value={fixedAmounts[i.categoryId] ?? ''}
                        onChange={(e) =>
                          setFixedAmounts((prev) => ({
                            ...prev,
                            [i.categoryId]: e.target.value,
                          }))
                        }
                        className="h-8 text-right tabular-nums"
                        placeholder="0"
                        aria-label={`Planned amount for ${i.name}`}
                      />
                    </li>
                  )
                })}
            </DataList>
          </Panel>

          <Panel
            id="budget-non-monthly"
            span={5}
            title="Non-monthly"
            description="Travel and irregular expenses this month."
            value={formatUsdPlain(rollup.nonMonthlySpent)}
            flush
          >
            <DataList>
              {data.items
                .filter((i) => i.budgetType === 'non_monthly')
                .map((i) => (
                  <li key={i.categoryId} className="data-row">
                    <span className="font-medium text-[var(--sea-ink)]">
                      {i.name}
                    </span>
                    <span className="amount-cell text-[var(--sea-ink)]">
                      {formatUsdPlain(i.spent)}
                    </span>
                  </li>
                ))}
            </DataList>
          </Panel>
          </PageBody>
        </Page>
      ) : null}
    </AppShell>
  )
}
