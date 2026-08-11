import { createFileRoute } from '@tanstack/react-router'
import { usePaginatedQuery, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { AppShell } from '#/components/layout/app-shell'
import { Money } from '#/components/money'
import { Skeleton } from '#/components/ui/skeleton'
import { currentMonth, daysUntil, formatUsdPlain } from '#/lib/money'

export const Route = createFileRoute('/_app/accounts/$accountId')({
  component: AccountDetailPage,
})

function AccountDetailPage() {
  const { accountId } = Route.useParams()
  const account = useQuery(api.accounts.get, {
    accountId: accountId as Id<'accounts'>,
  })
  const month = currentMonth()
  const spending = useQuery(api.accounts.spendingThisMonth, {
    accountId: accountId as Id<'accounts'>,
    month,
  })
  const { results } = usePaginatedQuery(
    api.transactions.list,
    { accountId: accountId as Id<'accounts'>, includeTransfers: true },
    { initialNumItems: 30 },
  )

  if (account === undefined) {
    return (
      <AppShell title="Account">
        <Skeleton className="h-40 w-full" />
      </AppShell>
    )
  }

  if (account === null) {
    return (
      <AppShell title="Account">
        <p className="text-muted-foreground">Account not found.</p>
      </AppShell>
    )
  }

  const util =
    account.limit && account.limit > 0
      ? account.currentBalance / account.limit
      : null
  const days = daysUntil(account.nextPaymentDueDate)
  const isCard = account.type === 'credit'

  return (
    <AppShell title={account.name}>
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <section className="space-y-1">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            {account.institutionName ?? 'Balance'}
          </p>
          <p className="display-title text-[2.5rem] leading-none tabular-nums tracking-tight">
            {formatUsdPlain(account.currentBalance)}
          </p>
          {account.mask ? (
            <p className="text-sm text-muted-foreground">···{account.mask}</p>
          ) : null}
        </section>

        {isCard ? (
          <section className="grid gap-4 sm:grid-cols-3">
            <Metric
              label="Statement balance"
              value={
                account.lastStatementBalance != null
                  ? formatUsdPlain(account.lastStatementBalance)
                  : '—'
              }
            />
            <Metric
              label="Due"
              value={
                account.nextPaymentDueDate
                  ? days != null
                    ? `${days}d · ${account.nextPaymentDueDate}`
                    : account.nextPaymentDueDate
                  : '—'
              }
            />
            <Metric
              label="Utilization"
              value={util != null ? `${Math.round(util * 100)}%` : '—'}
            />
            <Metric
              label="Minimum"
              value={
                account.minimumPayment != null
                  ? formatUsdPlain(account.minimumPayment)
                  : '—'
              }
            />
            <Metric
              label="APR"
              value={
                account.aprs?.[0]
                  ? `${account.aprs[0].aprPercentage}%`
                  : '—'
              }
            />
            <Metric
              label="Spend this month"
              value={formatUsdPlain(spending ?? 0)}
            />
          </section>
        ) : (
          <section>
            <Metric
              label="Spend this month"
              value={formatUsdPlain(spending ?? 0)}
            />
          </section>
        )}

        <section>
          <h2 className="mb-2 text-[13px] font-semibold">Transactions</h2>
          <ul className="divide-y divide-border/70 border-y border-border/70">
            {(results ?? []).map((tx) => (
              <li
                key={tx._id}
                className="flex items-center justify-between gap-3 py-2.5 text-[13px]"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {tx.merchantName ?? tx.originalDescription}
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    {tx.date}
                    {tx.categoryName ? ` · ${tx.categoryName}` : ''}
                  </p>
                </div>
                <Money amount={tx.amount} plaid />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="text-[15px] font-medium tabular-nums">{value}</p>
    </div>
  )
}
