import { createFileRoute } from '@tanstack/react-router'
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { CategoryDot, Kicker, PageFrame, Stat } from '#/components/dense'
import { AppShell } from '#/components/layout/app-shell'
import { Money } from '#/components/money'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { expenseAmount } from '../../../convex/lib/money'
import { currentMonth, formatDayLabel, formatUsdPlain } from '#/lib/money'
import { cn } from '#/lib/utils'

const PAGE_SIZE = 40

export const Route = createFileRoute('/_app/transactions')({
  component: TransactionsPage,
})

function TransactionsPage() {
  const [search, setSearch] = useState('')
  const [month, setMonth] = useState(currentMonth())
  const [accountId, setAccountId] = useState<Id<'accounts'> | undefined>()
  const [selectedId, setSelectedId] = useState<Id<'transactions'> | null>(null)

  const accounts = useQuery(api.accounts.list)
  const categories = useQuery(api.categories.list)
  // Args must match the loader prewarm exactly when no account filter is set —
  // `{ month, accountId: undefined }` is a different cache key than `{ month }`.
  const summary = useQuery(
    api.transactions.flowSummary,
    accountId ? { month, accountId } : { month },
  )
  const { results, status, loadMore } = usePaginatedQuery(
    api.transactions.list,
    {
      search: search || undefined,
      month: month || undefined,
      accountId,
    },
    { initialNumItems: PAGE_SIZE },
  )

  const updateCategory = useMutation(api.transactions.updateCategory)
  const updateMeta = useMutation(api.transactions.updateMeta)

  const selected = results?.find((t) => t._id === selectedId) ?? null

  // Ledger rows still come from pagination (empty until first page). Stats use
  // flowSummary so hover-prewarm can deliver Out/In before the route mounts.
  const listReady = status !== 'LoadingFirstPage'

  // Chunk the ledger by day so the date drops out of every row, and total each
  // day — a run of 40 identical rows becomes a handful of scannable groups.
  const groups = useMemo(() => {
    const byDate = new Map<string, NonNullable<typeof results>>()
    for (const tx of results ?? []) {
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
      <PageFrame width="xl" className="gap-5">
        {summary ? (
          <section className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
            <div className="flex gap-10">
              <Stat label="Out" value={formatUsdPlain(summary.out)} />
              {summary.incoming > 0 ? (
                <Stat label="In" value={formatUsdPlain(summary.incoming)} />
              ) : null}
            </div>
            {listReady ? (
              <p className="text-[12px] tabular-nums text-muted-foreground">
                {results.length} shown
                {status === 'CanLoadMore' ? ' · more available' : ''}
              </p>
            ) : null}
          </section>
        ) : null}

        <div className="toolbar">
          <Input
            placeholder="Search merchants…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-[160px]"
          />
          <Select
            value={accountId ?? 'all'}
            onValueChange={(v) =>
              setAccountId(v === 'all' ? undefined : (v as Id<'accounts'>))
            }
          >
            <SelectTrigger className="w-[200px]">
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

        {listReady ? (
          <>
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Merchant</th>
                  <th className="w-[170px]">Category</th>
                  <th className="w-[150px]">Account</th>
                  <th className="w-[120px] text-right">Amount</th>
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
                        selectedId === tx._id && 'bg-muted/50',
                      )}
                      onClick={() => setSelectedId(tx._id)}
                    >
                      <td>
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-medium text-[var(--sea-ink)]">
                            {tx.merchantName ?? tx.originalDescription}
                          </span>
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
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadMore(PAGE_SIZE)}
                >
                  Load more
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
      </PageFrame>

      <Sheet
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
      >
        <SheetContent className="sm:max-w-md">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle>
                  {selected.merchantName ?? selected.originalDescription}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6 px-1">
                <div>
                  <Kicker>Amount</Kicker>
                  <p className="mt-1.5 text-[1.75rem] font-semibold tracking-tight">
                    <Money amount={selected.amount} plaid />
                  </p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    {selected.date} · {selected.accountName}
                  </p>
                </div>

                <div className="space-y-2">
                  <Kicker>Category</Kicker>
                  <Select
                    value={selected.categoryId ?? undefined}
                    onValueChange={(value) => {
                      void (async () => {
                        const merchant = selected.merchantName
                        const createRule = merchant
                          ? window.confirm(
                              `Always categorize “${merchant}” as this category?`,
                            )
                          : false
                        const applyRetroactively =
                          createRule &&
                          window.confirm(
                            'Apply this rule to existing matching transactions?',
                          )
                        const res = await updateCategory({
                          transactionId: selected._id,
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
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose category" />
                    </SelectTrigger>
                    <SelectContent>
                      {(categories ?? []).map((c) => (
                        <SelectItem key={c._id} value={c._id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void updateMeta({
                        transactionId: selected._id,
                        isHidden: !selected.isHidden,
                      }).then(() =>
                        toast.success(
                          selected.isHidden ? 'Unhidden' : 'Hidden from reports',
                        ),
                      )
                    }
                  >
                    {selected.isHidden ? 'Unhide' : 'Hide'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void updateMeta({
                        transactionId: selected._id,
                        isTransfer: !selected.isTransfer,
                      }).then(() =>
                        toast.success(
                          selected.isTransfer
                            ? 'Marked as spending'
                            : 'Marked as transfer',
                        ),
                      )
                    }
                  >
                    {selected.isTransfer ? 'Not a transfer' : 'Mark transfer'}
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </AppShell>
  )
}
