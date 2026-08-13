import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  CategoryDot,
  DataList,
  HeroMetric,
  RowMeta,
  RowTitle,
} from '#/components/dense'
import { Page, PageBody, PageSummary, Panel } from '#/components/panel'
import { AppShell } from '#/components/layout/app-shell'
import { CategoryDonut } from '#/components/category-donut'
import { formatUsdPlain } from '#/lib/money'
import { prewarmQueries } from '#/lib/prewarm'

const OTHER_TYPE_COLOR = '#a8a29e'

const TYPE_COLORS: Record<string, string | undefined> = {
  equity: '#3d7a72',
  etf: '#4a6b52',
  'mutual fund': '#c27803',
  cash: '#78716c',
}

function typeColor(type: string): string {
  return TYPE_COLORS[type.toLowerCase()] ?? OTHER_TYPE_COLOR
}

export const Route = createFileRoute('/_app/investments')({
  loader: () => {
    prewarmQueries({ query: api.investments.portfolio })
  },
  component: InvestmentsPage,
})

function InvestmentsPage() {
  const data = useQuery(api.investments.portfolio)

  return (
    <AppShell title="Investments">
      {data ? (
        <Page>
          <PageSummary>
            <HeroMetric
              label="Portfolio value"
              value={formatUsdPlain(data.totalValue)}
              meta={
                data.holdings.length > 0
                  ? `${data.holdings.length} holding${data.holdings.length === 1 ? '' : 's'} across ${data.byType.length} asset ${data.byType.length === 1 ? 'type' : 'types'}`
                  : undefined
              }
            />
          </PageSummary>

          {data.holdings.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/80 px-4 py-10 text-center text-[13px] text-muted-foreground">
              Connect an investment account via Plaid to see holdings.
            </p>
          ) : (
            <PageBody>
              <Panel
                id="investments-allocation"
                span={4}
                title="Allocation"
                value={formatUsdPlain(data.totalValue)}
              >
                <div className="grid gap-5 pt-1 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-center xl:grid-cols-1 xl:justify-items-center">
                  <CategoryDonut
                    segments={data.byType.map((t) => ({
                      name: t.type,
                      amount: t.value,
                      color: typeColor(t.type),
                    }))}
                    size={140}
                  />
                  <DataList className="w-full">
                    {data.byType.map((t) => (
                      <li key={t.type} className="data-row">
                        <span className="flex min-w-0 items-center gap-2">
                          <CategoryDot color={typeColor(t.type)} />
                          <span className="truncate font-medium capitalize text-[var(--sea-ink)]">
                            {t.type}
                          </span>
                        </span>
                        <span className="amount-cell text-[var(--sea-ink)]">
                          {formatUsdPlain(t.value)}
                        </span>
                      </li>
                    ))}
                  </DataList>
                </div>
              </Panel>

              <Panel
                id="investments-holdings"
                span={8}
                title="Holdings"
                hint={`${data.holdings.length} positions`}
                flush
              >
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
              </Panel>
            </PageBody>
          )}
        </Page>
      ) : null}
    </AppShell>
  )
}
