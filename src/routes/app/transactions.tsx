import { createFileRoute } from '@tanstack/react-router'
import type { RequestForQueries } from 'convex/react'
import { useMutation, useQueries, useQuery } from 'convex/react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { CategoryDot, Stat } from '#/components/dense'
import { Page, PageBody, PageSummary, Panel } from '#/components/panel'
import { AppShell } from '#/components/layout/app-shell'
import { Money } from '#/components/money'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { Switch } from '#/components/ui/switch'
import { expenseAmount } from '../../../convex/lib/money'
import { currentMonth, formatDayLabel, formatUsdPlain } from '#/lib/money'
import { prewarmQueries } from '#/lib/prewarm'
import { PHONE, useMediaQuery } from '#/lib/use-media-query'
import { cn } from '#/lib/utils'

const PAGE_SIZE = 40
const FIRST_PAGE_OPTS = { numItems: PAGE_SIZE, cursor: null }

export const Route = createFileRoute('/app/transactions')({
  loader: () => {
    prewarmQueries(
      { query: api.accounts.list },
      { query: api.categories.list },
      { query: api.transactions.flowSummary, args: { month: currentMonth() } },
      {
        query: api.transactions.list,
        args: { month: currentMonth(), paginationOpts: FIRST_PAGE_OPTS },
      },
    )
  },
  component: TransactionsPage,
})

type LedgerFilters = {
  search?: string
  month?: string
  accountId?: Id<'accounts'>
}

type LedgerPage = (typeof api.transactions.list)['_returnType']

const NO_CURSORS: string[] = []

/**
 * Cursor pagination with deterministic args. `usePaginatedQuery` stamps a
 * unique client id into its first-page args, so it can never hit the
 * subscription the loader prewarms on hover — which made the ledger pop in
 * after the rest of the page. Plain `useQueries` with the same args as the
 * loader gets the first page from the already-warm subscription instead.
 */
function useLedgerPages(filters: LedgerFilters) {
  const filterKey = JSON.stringify(filters)
  const [pages, setPages] = useState({ key: filterKey, cursors: NO_CURSORS })
  const cursors = pages.key === filterKey ? pages.cursors : NO_CURSORS

  const queries = useMemo(() => {
    const request: RequestForQueries = {}
    for (const [i, cursor] of [null, ...cursors].entries()) {
      request[i] = {
        query: api.transactions.list,
        args: {
          ...filters,
          paginationOpts: { numItems: PAGE_SIZE, cursor },
        },
      }
    }
    return request
    // filterKey stands in for `filters`, whose identity changes every render.
  }, [filterKey, cursors])

  const pageResults = useQueries(queries)

  const loaded: LedgerPage[] = []
  for (let i = 0; i <= cursors.length; i++) {
    const page = pageResults[i]
    if (page === undefined) break
    if (page instanceof Error) throw page
    loaded.push(page as LedgerPage)
  }

  const lastPage = loaded.at(-1)
  const status =
    loaded.length === 0
      ? ('LoadingFirstPage' as const)
      : loaded.length <= cursors.length
        ? ('LoadingMore' as const)
        : lastPage?.isDone
          ? ('Exhausted' as const)
          : ('CanLoadMore' as const)

  return {
    results: loaded.flatMap((page) => page.page),
    status,
    loadMore: () => {
      if (status !== 'CanLoadMore' || !lastPage) return
      setPages({
        key: filterKey,
        cursors: [...cursors, lastPage.continueCursor],
      })
    },
  }
}

function TransactionsPage() {
  const [search, setSearch] = useState('')
  const [month, setMonth] = useState(currentMonth())
  const [accountId, setAccountId] = useState<Id<'accounts'> | undefined>()
  const [selectedId, setSelectedId] = useState<Id<'transactions'> | null>(null)
  const phone = useMediaQuery(PHONE)

  const accounts = useQuery(api.accounts.list)
  const categories = useQuery(api.categories.list)
  // Args must match the loader prewarm exactly when no account filter is set —
  // `{ month, accountId: undefined }` is a different cache key than `{ month }`.
  const summary = useQuery(
    api.transactions.flowSummary,
    accountId ? { month, accountId } : { month },
  )
  const { results, status, loadMore } = useLedgerPages({
    ...(search ? { search } : {}),
    ...(month ? { month } : {}),
    ...(accountId ? { accountId } : {}),
  })

  const selected = results.find((t) => t._id === selectedId) ?? null

  const listReady = status !== 'LoadingFirstPage'

  // Chunk the ledger by day so the date drops out of every row, and total each
  // day — a run of 40 identical rows becomes a handful of scannable groups.
  const groups = useMemo(() => {
    const byDate = new Map<string, typeof results>()
    for (const tx of results) {
      const bucket = byDate.get(tx.date)
      if (bucket) bucket.push(tx)
      else byDate.set(tx.date, [tx])
    }
    return [...byDate.entries()].map(([date, rows]) => ({
      date,
      rows,
      spent: rows.reduce((sum, r) => sum + expenseAmount(r.amount), 0),
    }))
  }, [results])

  return (
    <AppShell title="Transactions">
      <Page>
        <PageSummary>
          <div className="flex gap-8 sm:gap-10">
            <Stat label="Out" value={formatUsdPlain(summary?.out ?? 0)} />
            {summary && summary.incoming > 0 ? (
              <Stat label="In" value={formatUsdPlain(summary.incoming)} />
            ) : null}
          </div>
          {/* Search takes the whole first line on a phone; month and account
              split the next one, so three filters cost two rows, not three. */}
          <div className="toolbar">
            <Input
              placeholder="Search merchants…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-[220px]"
            />
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="min-w-0 flex-1 sm:w-[160px] sm:flex-none"
            />
            <Select
              value={accountId ?? 'all'}
              onValueChange={(v) =>
                setAccountId(v === 'all' ? undefined : (v as Id<'accounts'>))
              }
            >
              <SelectTrigger className="min-w-0 flex-1 sm:w-[200px] sm:flex-none">
                <SelectValue placeholder="All accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All accounts</SelectItem>
                {(accounts ?? []).map((a) => (
                  <SelectItem key={a._id} value={a._id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PageSummary>

        {listReady ? (
          <PageBody>
            <Panel
              id="transactions-ledger"
              title="Ledger"
              hint={`${results.length} shown${status === 'CanLoadMore' ? ' · more available' : ''}`}
              flush
            >
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th className="w-[42%]">Merchant</th>
                    <th className="w-[24%]">Category</th>
                    <th className="w-[20%]">Account</th>
                    <th className="w-[14%] text-right">Amount</th>
                  </tr>
                </thead>
                {groups.map((group) => (
                  <tbody key={group.date}>
                    <tr className="ledger-group">
                      <td colSpan={3}>{formatDayLabel(group.date)}</td>
                      <td className="text-right">
                        {group.spent > 0 ? formatUsdPlain(group.spent) : null}
                      </td>
                    </tr>
                    {group.rows.map((tx) => (
                      <tr
                        key={tx._id}
                        className={cn(
                          'cursor-pointer',
                          selectedId === tx._id && 'bg-muted',
                        )}
                        onClick={() => setSelectedId(tx._id)}
                      >
                        <td>
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate font-medium text-[var(--sea-ink)]">
                              {tx.merchantName ?? tx.originalDescription}
                            </span>
                            {tx.pending ? (
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                              >
                                Pending
                              </Badge>
                            ) : null}
                            {tx.isTransfer ? (
                              <Badge variant="outline" className="text-[10px]">
                                Transfer
                              </Badge>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                            {tx.categoryColor ? (
                              <CategoryDot
                                color={tx.categoryColor}
                                className="size-1.5"
                              />
                            ) : null}
                            <span className="truncate">
                              {tx.categoryName ?? '—'}
                            </span>
                          </span>
                        </td>
                        <td className="truncate text-muted-foreground">
                          {tx.accountName}
                        </td>
                        <td className="text-right">
                          <Money amount={tx.amount} plaid />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                ))}
                {groups.length === 0 ? (
                  <tbody>
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-12 text-center text-muted-foreground"
                      >
                        No transactions match these filters.
                      </td>
                    </tr>
                  </tbody>
                ) : null}
              </table>

              {status === 'CanLoadMore' ? (
                <div className="px-3 py-3">
                  <Button variant="outline" size="sm" onClick={loadMore}>
                    Load more
                  </Button>
                </div>
              ) : null}
            </Panel>
          </PageBody>
        ) : null}
      </Page>

      <Sheet
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
      >
        {/* The slip comes from the side of a desk and from the bottom of a
            phone — where the thumb is, and where a sheet is expected to be. */}
        <SheetContent side={phone ? 'bottom' : 'right'} className="p-0">
          {selected ? (
            <TransactionSlip tx={selected} categories={categories} />
          ) : null}
        </SheetContent>
      </Sheet>
    </AppShell>
  )
}

type LedgerTx = LedgerPage['page'][number]
type CategoryList = NonNullable<(typeof api.categories.list)['_returnType']>

function categoryFamilies(categories: CategoryList) {
  const ids = new Set(categories.map((c) => c._id))
  const childrenOf = new Map<string, CategoryList>()
  const roots: CategoryList = []
  for (const c of categories) {
    if (c.parentId && ids.has(c.parentId)) {
      const siblings = childrenOf.get(c.parentId)
      if (siblings) siblings.push(c)
      else childrenOf.set(c.parentId, [c])
    } else {
      roots.push(c)
    }
  }
  return { roots, childrenOf }
}

function TransactionSlip({
  tx,
  categories,
}: {
  tx: LedgerTx
  categories: CategoryList | undefined
}) {
  const updateCategory = useMutation(api.transactions.updateCategory)
  const updateMeta = useMutation(api.transactions.updateMeta)

  const merchant = tx.merchantName ?? tx.originalDescription
  const postedAs =
    tx.merchantName && tx.originalDescription !== tx.merchantName
      ? tx.originalDescription
      : null
  const selectedCategory = categories?.find((c) => c._id === tx.categoryId)
  const families = useMemo(
    () => (categories ? categoryFamilies(categories) : null),
    [categories],
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SheetHeader className="gap-0 p-0">
        <div className="flex flex-col gap-4 p-4 pt-2 sm:gap-5 sm:p-6 sm:pr-14">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <SheetTitle className="min-w-0 truncate text-left text-[13px] font-semibold tracking-[0.08em] text-[var(--sea-ink)] uppercase">
                {merchant}
              </SheetTitle>
              {tx.pending ? (
                <Badge variant="secondary" className="text-[10px]">
                  Pending
                </Badge>
              ) : null}
              {tx.isTransfer ? (
                <Badge variant="outline" className="text-[10px]">
                  Transfer
                </Badge>
              ) : null}
            </div>
            {postedAs ? (
              <p className="mt-1 truncate text-[12px] text-muted-foreground">
                {postedAs}
              </p>
            ) : null}
          </div>
          <div>
            <p className="hero-figure">
              <Money amount={tx.amount} plaid />
            </p>
            <SheetDescription className="mt-2 text-[13px] text-muted-foreground">
              {formatDayLabel(tx.date)} · {tx.accountName}
            </SheetDescription>
          </div>
        </div>
        <ul className="border-t border-border/70 px-4 sm:px-6">
          <li className="data-row">
            <span className="shrink-0 text-muted-foreground">Category</span>
            <Select
              value={tx.categoryId ?? undefined}
              onValueChange={(value) => {
                void (async () => {
                  const createRule = tx.merchantName
                    ? window.confirm(
                        `Always categorize “${tx.merchantName}” as this category?`,
                      )
                    : false
                  const applyRetroactively =
                    createRule &&
                    window.confirm(
                      'Apply this rule to existing matching transactions?',
                    )
                  const res = await updateCategory({
                    transactionId: tx._id,
                    categoryId: value as Id<'categories'>,
                    createRule,
                    applyRetroactively,
                  })
                  toast.success(
                    createRule
                      ? `Updated ${res.updatedCount} transaction${res.updatedCount === 1 ? '' : 's'} + rule saved`
                      : 'Category updated',
                  )
                })()
              }}
            >
              <SelectTrigger
                size="sm"
                className="h-8 min-w-0 max-w-[220px] justify-end border-0 bg-transparent px-0 shadow-none font-medium text-[13px] text-[var(--sea-ink)] hover:bg-transparent focus-visible:bg-transparent dark:bg-transparent"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  {selectedCategory ? (
                    <CategoryDot
                      color={selectedCategory.color}
                      className="size-1.5"
                    />
                  ) : null}
                  <SelectValue placeholder="Choose" />
                </span>
              </SelectTrigger>
              <SelectContent position="popper" align="end">
                {families
                  ? families.roots.map((parent) => {
                      const children = families.childrenOf.get(parent._id) ?? []
                      return (
                        <SelectGroup key={parent._id}>
                          <SelectItem value={parent._id}>
                            <CategoryDot
                              color={parent.color}
                              className="size-1.5"
                            />
                            {parent.name}
                          </SelectItem>
                          {children.map((child) => (
                            <SelectItem
                              key={child._id}
                              value={child._id}
                              className="pl-6 text-muted-foreground"
                            >
                              {child.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )
                    })
                  : null}
              </SelectContent>
            </Select>
          </li>
        </ul>
      </SheetHeader>

      <div className="min-h-0 flex-1" />

      <SheetFooter className="gap-0 border-t border-border/70 px-4 pt-2 pb-4 sm:px-6">
        <label className="data-row min-h-10 cursor-pointer">
          <span className="text-[13px] font-medium text-[var(--sea-ink)]">
            Hide from reports
          </span>
          <Switch
            className="shadow-none"
            checked={tx.isHidden}
            onCheckedChange={(checked) =>
              void updateMeta({
                transactionId: tx._id,
                isHidden: checked,
              }).then(() =>
                toast.success(
                  checked ? 'Hidden from reports' : 'Shown in reports',
                ),
              )
            }
          />
        </label>
        <label className="data-row min-h-10 cursor-pointer border-t border-border/70">
          <span className="text-[13px] font-medium text-[var(--sea-ink)]">
            Treat as transfer
          </span>
          <Switch
            className="shadow-none"
            checked={tx.isTransfer}
            onCheckedChange={(checked) =>
              void updateMeta({
                transactionId: tx._id,
                isTransfer: checked,
              }).then(() =>
                toast.success(
                  checked ? 'Marked as transfer' : 'Marked as spending',
                ),
              )
            }
          />
        </label>
      </SheetFooter>
    </div>
  )
}
