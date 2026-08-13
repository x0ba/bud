import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  DataList,
  HeroMetric,
  PageFrame,
  RowMeta,
  RowTitle,
  SectionHeader,
} from '#/components/dense'
import { AppShell } from '#/components/layout/app-shell'
import { CategoryDonut } from '#/components/category-donut'
import { formatUsdPlain } from '#/lib/money'

const TYPE_COLORS: Record<string, string> = {
  equity: '#3d7a72',
  etf: '#4a6b52',
  'mutual fund': '#c27803',
  cash: '#78716c',
  other: '#a8a29e',
}

export const Route = createFileRoute('/_app/investments')({
  component: InvestmentsPage,
})

function InvestmentsPage() {
  const data = useQuery(api.investments.portfolio)

  return (
    <AppShell title="Investments">
      {data ? (
        <PageFrame width="lg">
          <HeroMetric
            label="Portfolio value"
            value={formatUsdPlain(data.totalValue)}
          />

          {data.holdings.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/80 px-4 py-10 text-center text-[13px] text-muted-foreground">
              Connect an investment account via Plaid to see holdings.
            </p>
          ) : (
            <section className="grid gap-8 lg:grid-cols-[200px_1fr] lg:items-start">
              <CategoryDonut
                segments={data.byType.map((t) => ({
                  name: t.type,
                  amount: t.value,
                  color: TYPE_COLORS[t.type.toLowerCase()] ?? TYPE_COLORS.other!,
                }))}
              />
              <div>
                <SectionHeader title="Holdings" />
                <DataList>
                  {data.holdings.map((h) => (
                    <li key={h._id} className="data-row">
                      <div className="min-w-0">
                        <RowTitle>
                          {h.symbol ? `${h.symbol} · ` : ''}
                          {h.name}
                        </RowTitle>
                        <RowMeta>
                          {h.quantity} shares
                          {h.accountName ? ` · ${h.accountName}` : ''}
                        </RowMeta>
                      </div>
                      <div className="text-right">
                        <p className="amount-cell text-[var(--sea-ink)]">
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
                </DataList>
              </div>
            </section>
          )}
        </PageFrame>
      ) : null}
    </AppShell>
  )
}
