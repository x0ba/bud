import { createFileRoute, Link } from '@tanstack/react-router'
import { useAction, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { api } from '../../../convex/_generated/api'
import {
  DataList,
  EmptyState,
  PageFrame,
  RowMeta,
  RowTitle,
} from '#/components/dense'
import { AppShell } from '#/components/layout/app-shell'
import { PlaidLinkButton } from '#/components/plaid-link-button'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { daysUntil, formatUsdPlain } from '#/lib/money'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/_app/accounts')({
  component: AccountsPage,
})

function AccountsPage() {
  const accounts = useQuery(api.accounts.list)
  const items = useQuery(api.accounts.listItems)
  const syncItem = useAction(api.plaidActions.syncItemForUser)

  return (
    <AppShell
      title="Accounts"
      actions={<PlaidLinkButton label="Add institution" />}
    >
      {accounts && items ? (
        <PageFrame>
          {items.length === 0 ? (
            <EmptyState
              title="Connect your banks"
              description="Link checking, cards, and brokerages via Plaid sandbox to start answering where your money goes."
              action={<PlaidLinkButton />}
            />
          ) : null}

          {items.map((item) => {
            const itemAccounts = accounts.filter((a) => a.itemId === item._id)
            return (
              <section key={item._id} className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[13px] font-semibold tracking-tight text-[var(--sea-ink)]">
                      {item.institutionName}
                    </h2>
                    <Badge
                      variant={
                        item.status === 'ok' ? 'secondary' : 'destructive'
                      }
                    >
                      {item.status === 'ok' ? 'Connected' : item.status}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    {item.status === 'login_required' ? (
                      <PlaidLinkButton
                        label="Re-authenticate"
                        itemId={item._id}
                        variant="outline"
                      />
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void syncItem({ itemId: item._id })
                          .then(() => toast.success('Sync started'))
                          .catch((e: Error) => toast.error(e.message))
                      }
                    >
                      Sync
                    </Button>
                  </div>
                </div>
                {item.errorMessage ? (
                  <p className="text-[13px] text-destructive">
                    {item.errorMessage}
                  </p>
                ) : null}
                <DataList>
                  {itemAccounts.map((a) => {
                    const util =
                      a.limit && a.limit > 0
                        ? Math.min(1, a.currentBalance / a.limit)
                        : null
                    const days = daysUntil(a.nextPaymentDueDate)
                    return (
                      <li key={a._id}>
                        <Link
                          to="/accounts/$accountId"
                          params={{ accountId: a._id }}
                          className="data-row no-underline transition-[background-color,transform] duration-[150ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-muted/35 active:scale-[0.995]"
                        >
                          <div className="min-w-0">
                            <RowTitle>
                              {a.name}
                              {a.mask ? (
                                <span className="font-normal text-muted-foreground">
                                  {' '}
                                  ···{a.mask}
                                </span>
                              ) : null}
                            </RowTitle>
                            <RowMeta className="capitalize">
                              {a.type}
                              {a.subtype ? ` · ${a.subtype}` : ''}
                              {a.type === 'credit' && a.nextPaymentDueDate
                                ? days != null
                                  ? ` · due in ${days}d`
                                  : ` · due ${a.nextPaymentDueDate}`
                                : ''}
                            </RowMeta>
                          </div>
                          <div className="text-right">
                            <p className="amount-cell text-[var(--sea-ink)]">
                              {formatUsdPlain(a.currentBalance)}
                            </p>
                            {util != null ? (
                              <p
                                className={cn(
                                  'text-[11px] tabular-nums',
                                  util > 0.3
                                    ? 'text-amber-700'
                                    : 'text-muted-foreground',
                                )}
                              >
                                {Math.round(util * 100)}% utilized
                              </p>
                            ) : null}
                          </div>
                        </Link>
                      </li>
                    )
                  })}
                </DataList>
              </section>
            )
          })}
        </PageFrame>
      ) : null}
    </AppShell>
  )
}
