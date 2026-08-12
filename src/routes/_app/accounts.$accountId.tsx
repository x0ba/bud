import { createFileRoute } from '@tanstack/react-router'
import { usePaginatedQuery, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  DataList,
  HeroMetric,
  Kicker,
  PageFrame,
  RowMeta,
  RowTitle,
  SectionHeader,
} from '#/components/dense'
import { AppShell } from '#/components/layout/app-shell'
import { Money } from '#/components/money'
import { currentMonth, daysUntil, formatUsdPlain } from '#/lib/money'
import { prewarmQueries } from '#/lib/prewarm'

export const Route = createFileRoute('/_app/accounts/$accountId')({
  loader: ({ params }) => {
    const accountId = params.accountId as Id<'accounts'>
    const month = currentMonth()
    prewarmQueries(
      { query: api.accounts.get, args: { accountId } },
      { query: api.accounts.spendingThisMonth, args: { accountId, month } },
    )
  },
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
    return <AppShell title="Account" />
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
      <PageFrame>
        <HeroMetric
          label={account.institutionName ?? 'Balance'}
          value={formatUsdPlain(account.currentBalance)}
          meta={account.mask ? `···${account.mask}` : undefined}
        />

        {isCard ? (
          <section className="grid gap-5 sm:grid-cols-3">
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
          <SectionHeader title="Transactions" />
          <DataList>
            {(results ?? []).map((tx) => (
              <li key={tx._id} className="data-row">
                <div className="min-w-0">
                  <RowTitle>
                    {tx.merchantName ?? tx.originalDescription}
                  </RowTitle>
                  <RowMeta>
                    {tx.date}
                    {tx.categoryName ? ` · ${tx.categoryName}` : ''}
                  </RowMeta>
                </div>
                <Money amount={tx.amount} plaid />
              </li>
            ))}
          </DataList>
        </section>
      </PageFrame>
    </AppShell>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <Kicker>{label}</Kicker>
      <p className="text-[15px] font-semibold tracking-tight tabular-nums text-[var(--sea-ink)]">
        {value}
      </p>
    </div>
  )
}
