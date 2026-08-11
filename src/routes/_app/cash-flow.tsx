import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { AppShell } from '#/components/layout/app-shell'
import { CategoryDonut } from '#/components/category-donut'
import { Skeleton } from '#/components/ui/skeleton'
import { currentMonth, formatUsdPlain } from '#/lib/money'

export const Route = createFileRoute('/_app/cash-flow')({
  component: CashFlowPage,
})

function CashFlowPage() {
  const month = currentMonth()
  const budget = useQuery(api.budgets.getMonth, { month })
  const byCategory = useQuery(api.transactions.spendingByCategory, { month })

  return (
    <AppShell title="Cash flow">
      {!budget || !byCategory ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="mx-auto flex max-w-3xl flex-col gap-8">
          <section className="grid gap-6 sm:grid-cols-3">
            <Stat label="Income" value={formatUsdPlain(budget.totals.income)} />
            <Stat label="Expenses" value={formatUsdPlain(budget.totals.spent)} />
            <Stat
              label="Savings rate"
              value={
                budget.totals.income > 0
                  ? `${Math.round(((budget.totals.income - budget.totals.spent) / budget.totals.income) * 100)}%`
                  : '—'
              }
            />
          </section>

          <section className="grid gap-8 sm:grid-cols-[180px_1fr]">
            <CategoryDonut
              segments={byCategory.slice(0, 8).map((c) => ({
                name: c.name,
                color: c.color,
                amount: c.amount,
              }))}
            />
            <div>
              <h2 className="mb-2 text-[13px] font-semibold">
                Where money went · {month}
              </h2>
              <ul className="divide-y divide-border/70 border-y border-border/70">
                {byCategory.map((c) => (
                  <li
                    key={c.name}
                    className="flex items-center justify-between py-2 text-[13px]"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="size-2 rounded-full"
                        style={{ background: c.color }}
                      />
                      {c.name}
                    </span>
                    <span className="tabular-nums">
                      {formatUsdPlain(c.amount)}
                    </span>
                  </li>
                ))}
                {byCategory.length === 0 ? (
                  <li className="py-6 text-sm text-muted-foreground">
                    No spending this month yet.
                  </li>
                ) : null}
              </ul>
            </div>
          </section>
        </div>
      )}
    </AppShell>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
    </div>
  )
}
