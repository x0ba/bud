import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  CategoryDot,
  DataList,
  Kicker,
  PageFrame,
  SectionHeader,
} from '#/components/dense'
import { AppShell } from '#/components/layout/app-shell'
import { PaceBar } from '#/components/pace-bar'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { currentMonth, formatUsdPlain } from '#/lib/money'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/_app/budget')({
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
        <PageFrame>
          <div className="flex flex-wrap items-end gap-5">
            <div>
              <Kicker>Month</Kicker>
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="mt-1.5 w-[160px]"
              />
            </div>
            <div>
              <Kicker>Expected income</Kicker>
              <Input
                inputMode="decimal"
                value={expectedIncome}
                onChange={(e) => setExpectedIncome(e.target.value)}
                className="mt-1.5 w-[160px]"
                placeholder="0"
              />
            </div>
            <div className="ml-auto text-right">
              <Kicker>Spent</Kicker>
              <p className="mt-1.5 text-[1.75rem] font-semibold tracking-tight tabular-nums text-[var(--sea-ink)]">
                {formatUsdPlain(data.totals.spent)}
              </p>
            </div>
          </div>

          <section className="space-y-3">
            <div className="flex items-end justify-between gap-4">
              <SectionHeader
                title="Flex pool"
                description="Groceries, dining, shopping — one monthly number."
                className="mb-0"
              />
              <Input
                inputMode="decimal"
                value={flexBudget}
                onChange={(e) => setFlexBudget(e.target.value)}
                className="w-[120px] text-right tabular-nums"
                placeholder="Budget"
              />
            </div>
            <PaceBar
              spent={data.totals.flexSpent}
              budget={Number(flexBudget) || data.totals.flexPlanned || 1}
              pacePct={data.pace.pct}
              label={`${Math.round((data.totals.flexSpent / Math.max(Number(flexBudget) || data.totals.flexPlanned || 1, 1)) * 100)}% of flex spent`}
            />
            <DataList>
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
          </section>

          <section className="space-y-3">
            <SectionHeader
              title="Fixed"
              description="Rent, insurance, subscriptions — same every month."
            />
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
                      className="grid grid-cols-[1fr_auto_96px] items-center gap-3 py-2.5 text-[13px]"
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
                      <div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
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
                      />
                    </li>
                  )
                })}
            </DataList>
          </section>

          <section className="space-y-3">
            <SectionHeader
              title="Non-monthly"
              description="Travel and irregular expenses this month."
            />
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
          </section>
        </PageFrame>
      ) : null}
    </AppShell>
  )
}
