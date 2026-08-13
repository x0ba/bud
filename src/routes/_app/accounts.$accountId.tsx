import { createFileRoute } from '@tanstack/react-router'
import { usePaginatedQuery, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  DataList,
  HeroMetric,
  MiniStat,
  RowMeta,
  RowTitle,
} from '#/components/dense'
import { Page, PageBody, PageSummary, Panel } from '#/components/panel'
import { AppShell } from '#/components/layout/app-shell'
import { Money } from '#/components/money'
import { cardPaymentStatus, currentMonth, formatUsdPlain } from '#/lib/money'
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
  const { days, overdue } = cardPaymentStatus(account)
  const isCard = account.type === 'credit'

  return (
    <AppShell title={account.name}>
      <Page>
        <PageSummary>
          <HeroMetric
            label={account.institutionName ?? 'Balance'}
            value={formatUsdPlain(account.currentBalance)}
            meta={account.mask ? `···${account.mask}` : undefined}
          />
          <MiniStat
            label="Spend this month"
            value={formatUsdPlain(spending ?? 0)}
          />
        </PageSummary>

        <PageBody>
          {isCard ? (
            <Panel id="account-card-details" span={4} title="Card details">
              <div className="grid grid-cols-2 gap-x-6 gap-y-5 pt-2">
                <MiniStat
                  label="Statement balance"
                  value={
                    account.lastStatementBalance != null
                      ? formatUsdPlain(account.lastStatementBalance)
                      : '—'
                  }
                />
                <MiniStat
                  label="Due"
                  value={
                    overdue
                      ? `past due · ${account.nextPaymentDueDate}`
                      : days != null && days >= 0 && account.nextPaymentDueDate
                        ? days === 0
                          ? `today · ${account.nextPaymentDueDate}`
                          : `${days}d · ${account.nextPaymentDueDate}`
                        : '—'
                  }
                />
                <MiniStat
                  label="Utilization"
                  value={util != null ? `${Math.round(util * 100)}%` : '—'}
                />
                <MiniStat
                  label="Minimum"
                  value={
                    account.minimumPayment != null
                      ? formatUsdPlain(account.minimumPayment)
                      : '—'
                  }
                />
                <MiniStat
                  label="APR"
                  value={
                    account.aprs?.[0]
                      ? `${account.aprs[0].aprPercentage}%`
                      : '—'
                  }
                />
              </div>
            </Panel>
          ) : null}

          <Panel
            id="account-transactions"
            span={isCard ? 8 : 12}
            title="Transactions"
            hint={`${results.length} shown`}
            flush
          >
            <DataList>
              {results.map((tx) => (
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
              {results.length === 0 ? (
                <li className="py-6 text-[13px] text-muted-foreground">
                  No transactions on this account yet.
                </li>
              ) : null}
            </DataList>
          </Panel>
        </PageBody>
      </Page>
    </AppShell>
  )
}
