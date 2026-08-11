import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { AppShell } from '#/components/layout/app-shell'
import { PaceBar } from '#/components/pace-bar'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Skeleton } from '#/components/ui/skeleton'
import { currentMonth, formatUsdPlain } from '#/lib/money'

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
      {!data ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="mx-auto flex max-w-3xl flex-col gap-8">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Month
              </label>
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="mt-1 w-[160px]"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Expected income
              </label>
              <Input
                inputMode="decimal"
                value={expectedIncome}
                onChange={(e) => setExpectedIncome(e.target.value)}
                className="mt-1 w-[160px]"
                placeholder="0"
              />
            </div>
            <div className="ml-auto text-right">
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Spent
              </p>
              <p className="text-2xl font-semibold tabular-nums tracking-tight">
                {formatUsdPlain(data.totals.spent)}
              </p>
            </div>
          </div>

          <section className="space-y-3">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-[15px] font-semibold">Flex pool</h2>
                <p className="text-sm text-muted-foreground">
                  Groceries, dining, shopping — one monthly number.
                </p>
              </div>
              <Input
                inputMode="decimal"
                value={flexBudget}
                onChange={(e) => setFlexBudget(e.target.value)}
                className="w-[140px]"
                placeholder="Budget"
              />
            </div>
            <PaceBar
              spent={data.totals.flexSpent}
              budget={Number(flexBudget) || data.totals.flexPlanned || 1}
              pacePct={data.pace.pct}
              label={`${Math.round((data.totals.flexSpent / Math.max(Number(flexBudget) || data.totals.flexPlanned || 1, 1)) * 100)}% spent · ${Math.round(data.pace.pct * 100)}% through month`}
            />
            <ul className="divide-y divide-border/70 border-y border-border/70">
              {data.items
                .filter((i) => i.budgetType === 'flex' && i.spent > 0)
                .map((i) => (
                  <li
                    key={i.categoryId}
                    className="flex items-center justify-between py-2 text-[13px]"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="size-2 rounded-full"
                        style={{ background: i.color }}
                      />
                      {i.name}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatUsdPlain(i.spent)}
                    </span>
                  </li>
                ))}
            </ul>
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="text-[15px] font-semibold">Fixed</h2>
              <p className="text-sm text-muted-foreground">
                Rent, insurance, subscriptions — same every month.
              </p>
            </div>
            <ul className="divide-y divide-border/70 border-y border-border/70">
              {data.items
                .filter((i) => i.budgetType === 'fixed')
                .map((i) => {
                  const planned = Number(fixedAmounts[i.categoryId] || 0)
                  const pct = planned > 0 ? i.spent / planned : 0
                  return (
                    <li
                      key={i.categoryId}
                      className="grid grid-cols-[1fr_auto_100px] items-center gap-3 py-2.5 text-[13px]"
                    >
                      <div>
                        <p className="font-medium">{i.name}</p>
                        <p className="text-[12px] text-muted-foreground tabular-nums">
                          {formatUsdPlain(i.spent)} spent
                          {planned > 0 ? ` · ${Math.round(pct * 100)}%` : ''}
                        </p>
                      </div>
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-[var(--lagoon-deep)]"
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
                        className="h-8"
                        placeholder="0"
                      />
                    </li>
                  )
                })}
            </ul>
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="text-[15px] font-semibold">Non-monthly</h2>
              <p className="text-sm text-muted-foreground">
                Travel and irregular expenses this month.
              </p>
            </div>
            <ul className="divide-y divide-border/70 border-y border-border/70">
              {data.items
                .filter((i) => i.budgetType === 'non_monthly')
                .map((i) => (
                  <li
                    key={i.categoryId}
                    className="flex items-center justify-between py-2.5 text-[13px]"
                  >
                    <span>{i.name}</span>
                    <span className="tabular-nums">
                      {formatUsdPlain(i.spent)}
                    </span>
                  </li>
                ))}
            </ul>
          </section>
        </div>
      )}
    </AppShell>
  )
}
