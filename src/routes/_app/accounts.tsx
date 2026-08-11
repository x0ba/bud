import { createFileRoute, Link } from '@tanstack/react-router'
import { useAction, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { api } from '../../../convex/_generated/api'
import { AppShell } from '#/components/layout/app-shell'
import { PlaidLinkButton } from '#/components/plaid-link-button'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
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
      {!accounts || !items ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="mx-auto flex max-w-3xl flex-col gap-8">
          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
              <p className="display-title text-2xl text-[var(--sea-ink)]">
                Connect your banks
              </p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                Link checking, cards, and brokerages via Plaid sandbox to start
                answering where your money goes.
              </p>
              <div className="mt-5">
                <PlaidLinkButton />
              </div>
            </div>
          ) : null}

          {items.map((item) => {
            const itemAccounts = accounts.filter((a) => a.itemId === item._id)
            return (
              <section key={item._id} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[15px] font-semibold">
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
                  <p className="text-sm text-destructive">{item.errorMessage}</p>
                ) : null}
                <ul className="divide-y divide-border/70 border-y border-border/70">
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
                          className="flex items-center justify-between gap-3 py-3 no-underline hover:bg-muted/30"
                        >
                          <div>
                            <p className="text-[13px] font-medium text-foreground">
                              {a.name}
                              {a.mask ? (
                                <span className="text-muted-foreground">
                                  {' '}
                                  ···{a.mask}
                                </span>
                              ) : null}
                            </p>
                            <p className="text-[12px] text-muted-foreground capitalize">
                              {a.type}
                              {a.subtype ? ` · ${a.subtype}` : ''}
                              {a.type === 'credit' && a.nextPaymentDueDate
                                ? days != null
                                  ? ` · due in ${days}d`
                                  : ` · due ${a.nextPaymentDueDate}`
                                : ''}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[13px] font-medium tabular-nums">
                              {formatUsdPlain(a.currentBalance)}
                            </p>
                            {util != null ? (
                              <p
                                className={cn(
                                  'text-[11px] tabular-nums',
                                  util > 0.3
                                    ? 'text-amber-600'
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
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </AppShell>
  )
}
