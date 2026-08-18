import { createFileRoute, Link } from '@tanstack/react-router'
import { useAction, useQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  DataList,
  EmptyState,
  HeroMetric,
  RowMeta,
  RowTitle,
  ShareBar,
  Stat,
} from '#/components/dense'
import { Page, PageBody, PageSummary, Panel } from '#/components/panel'
import { AppShell } from '#/components/layout/app-shell'
import { PlaidLinkButton } from '#/components/plaid-link-button'
import { Button } from '#/components/ui/button'
import { cardPaymentStatus, formatSyncedAgo, formatUsdPlain } from '#/lib/money'
import { prewarmQueries } from '#/lib/prewarm'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/app/accounts')({
  loader: () => {
    prewarmQueries(
      { query: api.accounts.list },
      { query: api.accounts.listItems },
    )
  },
  component: AccountsPage,
})

type Account = FunctionReturnType<typeof api.accounts.list>[number]
type Item = FunctionReturnType<typeof api.accounts.listItems>[number]
type SyncItemResult = FunctionReturnType<
  typeof api.plaidActions.syncItemForUser
>

/**
 * Sections follow what the money *is*, not which institution holds it. A person
 * scanning this page asks "how much can I spend" and "what do I owe" — the
 * institution is a maintenance detail, so it drops to row meta and the
 * Connections section at the bottom.
 */
const GROUPS = [
  { type: 'depository', title: 'Cash' },
  { type: 'credit', title: 'Credit cards' },
  { type: 'investment', title: 'Investments' },
  { type: 'loan', title: 'Loans' },
  { type: 'other', title: 'Other' },
] as const

const DEBT_TYPES = new Set(['credit', 'loan'])
const HIGH_UTILIZATION = 0.3

type Alert = {
  id: string
  severity: 'urgent' | 'warn'
  title: string
  detail: string
  itemId?: Id<'plaidItems'>
}

function AccountsPage() {
  const accounts = useQuery(api.accounts.list)
  const items = useQuery(api.accounts.listItems)
  const syncItem = useAction(api.plaidActions.syncItemForUser)

  const sync = (item: Item) => {
    const toastId = toast.loading(`Syncing ${item.institutionName}…`)
    void syncItem({ itemId: item._id })
      .then((result) =>
        finishItemSyncToast(toastId, item.institutionName, result),
      )
      .catch((error: unknown) =>
        toast.error(syncErrorMessage(error), { id: toastId }),
      )
  }

  const syncAll = (connections: Array<Item>) => {
    const toastId = toast.loading('Syncing all…')
    void Promise.allSettled(
      connections.map((item) => syncItem({ itemId: item._id })),
    ).then((settlements) => finishAllSyncToast(toastId, settlements))
  }

  const view = useMemo(
    () => (accounts && items ? buildView(accounts, items) : null),
    [accounts, items],
  )

  return (
    <AppShell
      title="Accounts"
      actions={<PlaidLinkButton label="Add institution" size="sm" />}
    >
      {view ? (
        <Page>
          {view.items.length === 0 ? (
            <EmptyState
              title="Connect your banks"
              description="Link checking, cards, and brokerages via Plaid sandbox to start answering where your money goes."
              action={<PlaidLinkButton />}
            />
          ) : null}

          {view.hero ? (
            <PageSummary>
              <HeroMetric
                label={view.hero.label}
                value={formatUsdPlain(view.hero.value)}
                meta={view.hero.meta}
              />
              {view.stats.length > 0 ? (
                <div className="flex flex-wrap gap-8">
                  {view.stats.map((stat) => (
                    <Stat
                      key={stat.label}
                      label={stat.label}
                      value={formatUsdPlain(stat.value)}
                    />
                  ))}
                </div>
              ) : null}
            </PageSummary>
          ) : null}

          <PageBody>
            {view.alerts.length > 0 ? (
              <Panel
                id="accounts-alerts"
                title="Needs attention"
                hint={`${view.alerts.length} ${view.alerts.length === 1 ? 'item' : 'items'}`}
                flush
              >
                <ul className="flex flex-col">
                  {view.alerts.map((alert) => (
                    <li
                      key={alert.id}
                      className="attention-band"
                      data-severity={alert.severity}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-[var(--sea-ink)]">
                          {alert.title}
                        </p>
                        <p className="truncate text-[12px] text-muted-foreground">
                          {alert.detail}
                        </p>
                      </div>
                      {alert.itemId ? (
                        <PlaidLinkButton
                          label="Re-authenticate"
                          itemId={alert.itemId}
                          variant="outline"
                          size="sm"
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              </Panel>
            ) : null}

            {view.groups.map((group) => {
              const utilization =
                group.type === 'credit' && group.limit > 0
                  ? group.total / group.limit
                  : null
              return (
                <Panel
                  key={group.type}
                  id={`accounts-${group.type}`}
                  span={6}
                  title={group.title}
                  value={formatUsdPlain(group.total)}
                  hint={
                    group.limit > 0
                      ? `of ${formatUsdPlain(group.limit)} limit`
                      : undefined
                  }
                  tone={group.debt ? 'muted' : 'default'}
                  flush
                >
                  {utilization != null ? (
                    <div className="space-y-1.5 px-3 pt-2.5">
                      <ShareBar
                        value={group.total}
                        total={group.limit}
                        color={
                          utilization > HIGH_UTILIZATION
                            ? 'var(--chart-3)'
                            : 'var(--lagoon-deep)'
                        }
                        className="h-1.5"
                      />
                      <p className="text-[11px] font-medium tabular-nums text-muted-foreground">
                        {Math.round(utilization * 100)}% of your available
                        credit is in use
                      </p>
                    </div>
                  ) : null}
                  <DataList>
                    {group.rows.map((account) => (
                      <AccountRow
                        key={account._id}
                        account={account}
                        max={group.max}
                        debt={group.debt}
                      />
                    ))}
                  </DataList>
                </Panel>
              )
            })}

            {view.archived.length > 0 ? (
              <Panel
                id="accounts-archived"
                span={6}
                title="Hidden & closed"
                hint={`${view.archived.length} ${view.archived.length === 1 ? 'account' : 'accounts'}`}
                defaultCollapsed
                flush
              >
                <DataList>
                  {view.archived.map((account) => (
                    <AccountRow
                      key={account._id}
                      account={account}
                      max={0}
                      debt
                      quiet
                    />
                  ))}
                </DataList>
              </Panel>
            ) : null}

            {view.items.length > 0 ? (
              <Panel
                id="accounts-connections"
                span={6}
                title="Connections"
                description="Institutions linked through Plaid. Balances update when these sync."
                action={
                  view.items.length > 1 ? (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => syncAll(view.items)}
                    >
                      Sync all
                    </Button>
                  ) : undefined
                }
                flush
              >
                <DataList>
                  {view.items.map((item) => {
                    const healthy = item.status === 'ok'
                    const ago = formatSyncedAgo(item.lastSyncedAt)
                    return (
                      <li key={item._id} className="data-row">
                        <div className="flex min-w-0 flex-1 items-center gap-2.5">
                          <span
                            className={cn(
                              'size-1.5 shrink-0 rounded-full',
                              healthy
                                ? 'bg-[var(--lagoon-deep)]'
                                : 'bg-destructive',
                            )}
                            aria-hidden
                          />
                          <div className="min-w-0">
                            <RowTitle>{item.institutionName}</RowTitle>
                            <RowMeta
                              className={
                                healthy ? undefined : 'text-destructive'
                              }
                            >
                              {healthy
                                ? [
                                    `${item.accountCount} ${item.accountCount === 1 ? 'account' : 'accounts'}`,
                                    ago ? `synced ${ago}` : null,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')
                                : (item.errorMessage ??
                                  'Needs re-authentication to keep syncing')}
                            </RowMeta>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {healthy ? (
                            <PlaidLinkButton
                              label="Add accounts"
                              itemId={item._id}
                              accountSelectionEnabled
                              variant="ghost"
                              size="sm"
                            />
                          ) : (
                            <PlaidLinkButton
                              label="Re-authenticate"
                              itemId={item._id}
                              variant="outline"
                              size="sm"
                            />
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => sync(item)}
                          >
                            Sync
                          </Button>
                        </div>
                      </li>
                    )
                  })}
                </DataList>
              </Panel>
            ) : null}
          </PageBody>
        </Page>
      ) : null}
    </AppShell>
  )
}

/**
 * A row earns at most three tiers: name (+ mask), one meta line, and the
 * amount. The bar carries comparison so the eye doesn't have to read every
 * figure — utilization against the card's own limit, magnitude against the
 * largest row in the group everywhere else.
 */
function AccountRow({
  account,
  max,
  debt,
  quiet = false,
}: {
  account: Account
  max: number
  debt: boolean
  quiet?: boolean
}) {
  const limit = account.limit ?? 0
  const utilization =
    limit > 0 ? Math.min(1, account.currentBalance / limit) : null
  const { days, overdue, dueSoon } = cardPaymentStatus(account)
  const hot = utilization != null && utilization > HIGH_UTILIZATION

  const available =
    account.type === 'depository' &&
    account.availableBalance != null &&
    Math.abs(account.availableBalance - account.currentBalance) >= 1
      ? account.availableBalance
      : null

  const kind = [account.subtype ?? account.type, account.institutionName]
    .filter(Boolean)
    .join(' · ')

  return (
    <li>
      <Link
        to="/app/accounts/$accountId"
        params={{ accountId: account._id }}
        className="data-row no-underline transition-[background-color,transform] duration-[150ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-muted/70 active:scale-[0.995]"
      >
        <span className="min-w-0 flex-1">
          <RowTitle className={quiet ? 'text-muted-foreground' : undefined}>
            {account.name}
            {account.mask ? (
              <span className="font-normal text-muted-foreground">
                {' '}
                ···{account.mask}
              </span>
            ) : null}
          </RowTitle>
          <RowMeta className="capitalize">
            {kind}
            {account.nextPaymentDueDate &&
            (overdue || (days != null && days >= 0)) ? (
              <span
                className={cn(
                  'normal-case',
                  overdue
                    ? 'font-medium text-destructive'
                    : dueSoon
                      ? 'font-medium text-amber-700'
                      : undefined,
                )}
              >
                {' · '}
                {overdue
                  ? 'past due'
                  : days === 0
                    ? 'due today'
                    : `due in ${days}d`}
              </span>
            ) : null}
          </RowMeta>
        </span>

        {max > 0 || utilization != null ? (
          <ShareBar
            value={account.currentBalance}
            total={utilization != null ? limit : max}
            color={
              hot
                ? 'var(--chart-3)'
                : debt
                  ? 'color-mix(in oklab, var(--sea-ink) 34%, transparent)'
                  : 'var(--lagoon-deep)'
            }
            className="hidden w-14 shrink-0 sm:block"
          />
        ) : null}

        <span className="shrink-0 text-right">
          <span
            className={cn(
              'amount-cell block',
              quiet
                ? 'text-muted-foreground'
                : debt
                  ? 'text-[var(--sea-ink-soft)]'
                  : 'text-[var(--sea-ink)]',
            )}
          >
            {formatUsdPlain(account.currentBalance)}
          </span>
          {utilization != null ? (
            <span
              className={cn(
                'block text-[11px] tabular-nums',
                hot ? 'text-amber-700' : 'text-muted-foreground',
              )}
            >
              {Math.round(utilization * 100)}% of {formatUsdPlain(limit)}
            </span>
          ) : available != null ? (
            <span className="block text-[11px] tabular-nums text-muted-foreground">
              {formatUsdPlain(available)} available
            </span>
          ) : null}
        </span>
      </Link>
    </li>
  )
}

function buildView(accounts: Array<Account>, items: Array<Item>) {
  const live = accounts.filter((a) => !a.isHidden && !a.isClosed)
  const archived = accounts.filter((a) => a.isHidden || a.isClosed)

  const groups = GROUPS.map(({ type, title }) => {
    const rows = live
      .filter((a) => a.type === type)
      .sort((a, b) => b.currentBalance - a.currentBalance)
    return {
      type,
      title,
      rows,
      debt: DEBT_TYPES.has(type),
      total: rows.reduce((sum, a) => sum + a.currentBalance, 0),
      limit: rows.reduce((sum, a) => sum + (a.limit ?? 0), 0),
      max: Math.max(...rows.map((a) => Math.abs(a.currentBalance)), 0),
    }
  }).filter((group) => group.rows.length > 0)

  const totalFor = (type: string) =>
    groups.find((g) => g.type === type)?.total ?? 0
  const cash = groups.find((g) => g.type === 'depository')
  const owed = totalFor('credit') + totalFor('loan')
  const invested = totalFor('investment')

  const cashAvailable = cash
    ? cash.rows.reduce(
        (sum, a) => sum + (a.availableBalance ?? a.currentBalance),
        0,
      )
    : 0

  return {
    items,
    groups,
    archived,
    alerts: buildAlerts(live, items),
    hero: buildHero({ cash, cashAvailable, owed, groups }),
    // Only the counterweights that exist — an empty "$0.00 invested" is noise.
    stats: [
      { label: 'Owed', value: owed },
      { label: 'Invested', value: invested },
    ].filter((stat) => stat.value > 0 && cash != null),
  }
}

function buildHero({
  cash,
  cashAvailable,
  owed,
  groups,
}: {
  cash?: { total: number; rows: Array<Account> }
  cashAvailable: number
  owed: number
  groups: Array<{ rows: Array<Account> }>
}) {
  if (cash) {
    const count = cash.rows.length
    const parts = [`${count} ${count === 1 ? 'account' : 'accounts'}`]
    if (Math.abs(cashAvailable - cash.total) >= 1) {
      parts.unshift(`${formatUsdPlain(cashAvailable)} available now`)
    }
    return { label: 'Cash', value: cash.total, meta: parts.join(' · ') }
  }
  if (owed > 0) {
    return {
      label: 'Total owed',
      value: owed,
      meta: 'Connect a checking account to track spendable cash.',
    }
  }
  const total = groups.reduce(
    (sum, g) => sum + g.rows.reduce((s, a) => s + a.currentBalance, 0),
    0,
  )
  return total > 0
    ? { label: 'Tracked balance', value: total, meta: undefined }
    : null
}

/**
 * Everything urgent gets pulled out of the rows and stacked once at the top, so
 * a broken connection can't hide inside a section you weren't planning to read.
 */
function buildAlerts(live: Array<Account>, items: Array<Item>): Array<Alert> {
  const alerts: Array<Alert> = []

  for (const item of items) {
    if (item.status === 'ok') continue
    alerts.push({
      id: item._id,
      severity: 'urgent',
      title: `${item.institutionName} stopped syncing`,
      detail:
        item.errorMessage ??
        'Balances and transactions are frozen until you re-authenticate.',
      itemId: item._id,
    })
  }

  for (const account of live) {
    if (account.type !== 'credit') continue
    const { days, overdue, dueSoon } = cardPaymentStatus(account)
    const minimum =
      account.minimumPayment != null
        ? `${formatUsdPlain(account.minimumPayment)} minimum`
        : null

    if (overdue) {
      alerts.push({
        id: account._id,
        severity: 'urgent',
        title: `${account.name} is past due`,
        detail: [formatUsdPlain(account.currentBalance), minimum]
          .filter(Boolean)
          .join(' balance · '),
      })
    } else if (dueSoon && days != null) {
      alerts.push({
        id: account._id,
        severity: 'warn',
        title:
          days === 0
            ? `${account.name} due today`
            : `${account.name} due in ${days} ${days === 1 ? 'day' : 'days'}`,
        detail: [formatUsdPlain(account.currentBalance), minimum]
          .filter(Boolean)
          .join(' balance · '),
      })
    }
  }

  return alerts.sort((a, b) =>
    a.severity === b.severity ? 0 : a.severity === 'urgent' ? -1 : 1,
  )
}

function isCompleteSync(result: SyncItemResult) {
  return result.failed.length === 0 && result.deferred.length === 0
}

function finishItemSyncToast(
  toastId: string | number,
  name: string,
  result: SyncItemResult,
) {
  if (isCompleteSync(result)) {
    toast.success(`Synced ${name}`, { id: toastId })
    return
  }
  toast.warning(incompleteItemSyncMessage(name, result), { id: toastId })
}

function finishAllSyncToast(
  toastId: string | number,
  settlements: Array<PromiseSettledResult<SyncItemResult>>,
) {
  const results = settlements.flatMap((settlement) =>
    settlement.status === 'fulfilled' ? [settlement.value] : [],
  )
  const rejected = settlements.filter(
    (settlement): settlement is PromiseRejectedResult =>
      settlement.status === 'rejected',
  )
  if (rejected.length > 0 && rejected.length === settlements.length) {
    toast.error(syncErrorMessage(rejected[0].reason), { id: toastId })
    return
  }
  if (rejected.length === 0 && results.every(isCompleteSync)) {
    toast.success('Synced', { id: toastId })
    return
  }
  if (
    rejected.length === 0 &&
    results.every((result) => result.failed.length === 0)
  ) {
    toast.warning("Synced. Some holdings aren't ready yet.", { id: toastId })
    return
  }
  toast.warning("Couldn't finish syncing some institutions", { id: toastId })
}

function syncErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Sync failed'
}

function incompleteItemSyncMessage(name: string, result: SyncItemResult) {
  if (result.failed.length === 0) {
    return `${name} synced. Holdings aren't ready yet.`
  }
  if (result.failed.length === 1 && result.failed[0] === 'transactions') {
    return `Couldn't refresh ${name} transactions`
  }
  if (result.failed.length === 1 && result.failed[0] === 'holdings') {
    return `Couldn't refresh ${name} holdings`
  }
  if (result.failed.length === 1 && result.failed[0] === 'liabilities') {
    return `Couldn't refresh ${name} payments`
  }
  return `Couldn't finish syncing ${name}`
}
