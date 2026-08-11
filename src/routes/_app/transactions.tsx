import { createFileRoute } from '@tanstack/react-router'
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { CategoryDot, Kicker, PageFrame } from '#/components/dense'
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
import { currentMonth } from '#/lib/money'
import { cn } from '#/lib/utils'

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
  const { results, status, loadMore } = usePaginatedQuery(
    api.transactions.list,
    {
      search: search || undefined,
      month: month || undefined,
      accountId,
    },
    { initialNumItems: 40 },
  )

  const updateCategory = useMutation(api.transactions.updateCategory)
  const updateMeta = useMutation(api.transactions.updateMeta)

  const selected = results?.find((t) => t._id === selectedId) ?? null

  return (
    <AppShell title="Transactions">
      <PageFrame width="xl" className="gap-4">
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

        <div className="overflow-hidden rounded-lg border border-border/70">
          <table className="ledger-table">
            <thead>
              <tr>
                <th className="w-[108px]">Date</th>
                <th>Merchant</th>
                <th className="w-[160px]">Category</th>
                <th className="w-[140px]">Account</th>
                <th className="w-[110px] text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(results ?? []).map((tx) => (
                <tr
                  key={tx._id}
                  className={cn(
                    'cursor-pointer',
                    selectedId === tx._id && 'bg-muted/50',
                  )}
                  onClick={() => setSelectedId(tx._id)}
                >
                  <td className="tabular-nums text-muted-foreground">
                    {tx.date}
                  </td>
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
                        <CategoryDot color={tx.categoryColor} className="size-1.5" />
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
              {(results ?? []).length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-12 text-center text-muted-foreground"
                  >
                    No transactions match these filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {status === 'CanLoadMore' ? (
          <Button variant="outline" size="sm" onClick={() => loadMore(40)}>
            Load more
          </Button>
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
