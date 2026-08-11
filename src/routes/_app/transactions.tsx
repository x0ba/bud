import { createFileRoute } from '@tanstack/react-router'
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
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
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
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

        <div className="overflow-hidden rounded-lg border border-border/80">
          <table className="w-full text-[13px]">
            <thead className="bg-muted/40 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-3 py-2 font-semibold">Date</th>
                <th className="px-3 py-2 font-semibold">Merchant</th>
                <th className="px-3 py-2 font-semibold">Category</th>
                <th className="px-3 py-2 font-semibold">Account</th>
                <th className="px-3 py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {(results ?? []).map((tx) => (
                <tr
                  key={tx._id}
                  className="cursor-pointer transition-colors hover:bg-muted/40"
                  onClick={() => setSelectedId(tx._id)}
                >
                  <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
                    {tx.date}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
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
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1.5">
                      {tx.categoryColor ? (
                        <span
                          className="size-1.5 rounded-full"
                          style={{ background: tx.categoryColor }}
                        />
                      ) : null}
                      {tx.categoryName ?? '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {tx.accountName}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Money amount={tx.amount} plaid />
                  </td>
                </tr>
              ))}
              {(results ?? []).length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-10 text-center text-muted-foreground"
                  >
                    No transactions match these filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {status === 'CanLoadMore' ? (
          <Button variant="outline" onClick={() => loadMore(40)}>
            Load more
          </Button>
        ) : null}
      </div>

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
              <div className="mt-6 space-y-5 px-1">
                <div>
                  <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Amount
                  </p>
                  <p className="mt-1 text-2xl">
                    <Money amount={selected.amount} plaid />
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selected.date} · {selected.accountName}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Category
                  </p>
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
                    <SelectTrigger>
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
