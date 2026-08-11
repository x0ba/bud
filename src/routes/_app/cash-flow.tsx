import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  CategoryDot,
  DataList,
  PageFrame,
  SectionHeader,
  Stat,
} from '#/components/dense'
import { AppShell } from '#/components/layout/app-shell'
import { CategoryDonut } from '#/components/category-donut'
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
      {budget && byCategory ? (
        <PageFrame>
          <section className="grid gap-6 sm:grid-cols-3">
            <Stat label="Income" value={formatUsdPlain(budget.totals.income)} />
            <Stat
              label="Expenses"
              value={formatUsdPlain(budget.totals.spent)}
            />
            <Stat
              label="Savings rate"
              value={
                budget.totals.income > 0
                  ? `${Math.round(((budget.totals.income - budget.totals.spent) / budget.totals.income) * 100)}%`
                  : '—'
              }
            />
          </section>

          <section className="grid gap-8 sm:grid-cols-[180px_1fr] sm:items-start">
            <CategoryDonut
              segments={byCategory.slice(0, 8).map((c) => ({
                name: c.name,
                color: c.color,
                amount: c.amount,
              }))}
            />
            <div>
              <SectionHeader title={`Where money went · ${month}`} />
              <DataList>
                {byCategory.map((c) => (
                  <li key={c.name} className="data-row">
                    <span className="flex min-w-0 items-center gap-2">
                      <CategoryDot color={c.color} />
                      <span className="truncate font-medium text-[var(--sea-ink)]">
                        {c.name}
                      </span>
                    </span>
                    <span className="amount-cell text-[var(--sea-ink)]">
                      {formatUsdPlain(c.amount)}
                    </span>
                  </li>
                ))}
                {byCategory.length === 0 ? (
                  <li className="py-6 text-[13px] text-muted-foreground">
                    No spending this month yet.
                  </li>
                ) : null}
              </DataList>
            </div>
          </section>
        </PageFrame>
      ) : null}
    </AppShell>
  )
}
