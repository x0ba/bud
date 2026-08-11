import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { AppShell } from '#/components/layout/app-shell'
import { CategoryDonut } from '#/components/category-donut'
import { Skeleton } from '#/components/ui/skeleton'
import { formatUsdPlain } from '#/lib/money'

const TYPE_COLORS: Record<string, string> = {
  equity: '#328f97',
  etf: '#2f6a4a',
  'mutual fund': '#c27803',
  cash: '#6b7280',
  other: '#94a3b8',
}

export const Route = createFileRoute('/_app/investments')({
  component: InvestmentsPage,
})

function InvestmentsPage() {
  const data = useQuery(api.investments.portfolio)

  return (
    <AppShell title="Investments">
      {!data ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="mx-auto flex max-w-4xl flex-col gap-8">
          <section className="space-y-1">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Portfolio value
            </p>
            <p className="display-title text-[2.75rem] leading-none tabular-nums tracking-tight">
              {formatUsdPlain(data.totalValue)}
            </p>
          </section>

          {data.holdings.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              Connect an investment account via Plaid to see holdings.
            </p>
          ) : (
            <section className="grid gap-8 lg:grid-cols-[200px_1fr]">
              <CategoryDonut
                segments={data.byType.map((t) => ({
                  name: t.type,
                  amount: t.value,
                  color: TYPE_COLORS[t.type.toLowerCase()] ?? TYPE_COLORS.other!,
                }))}
              />
              <div>
                <h2 className="mb-2 text-[13px] font-semibold">Holdings</h2>
                <ul className="divide-y divide-border/70 border-y border-border/70">
                  {data.holdings.map((h) => (
                    <li
                      key={h._id}
                      className="flex items-center justify-between gap-3 py-2.5 text-[13px]"
                    >
                      <div>
                        <p className="font-medium">
                          {h.symbol ? `${h.symbol} · ` : ''}
                          {h.name}
                        </p>
                        <p className="text-[12px] text-muted-foreground">
                          {h.quantity} shares
                          {h.accountName ? ` · ${h.accountName}` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="tabular-nums font-medium">
                          {formatUsdPlain(h.institutionValue)}
                        </p>
                        {h.costBasis != null ? (
                          <p className="text-[11px] tabular-nums text-muted-foreground">
                            cost {formatUsdPlain(h.costBasis)}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </div>
      )}
    </AppShell>
  )
}
