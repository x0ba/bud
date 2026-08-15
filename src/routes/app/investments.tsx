import { createFileRoute } from '@tanstack/react-router'
import { useAction, useMutation, useQuery } from 'convex/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  CategoryDot,
  DataList,
  EmptyState,
  HeroMetric,
  RowMeta,
  RowTitle,
} from '#/components/dense'
import { Page, PageBody, PageSummary, Panel } from '#/components/panel'
import { AppShell } from '#/components/layout/app-shell'
import { PlaidLinkButton } from '#/components/plaid-link-button'
import { CategoryDonut } from '#/components/category-donut'
import { SearchSelect } from '#/components/search-select'
import type { SearchSelectOption } from '#/components/search-select'
import { TrendLineChart, trendExtent } from '#/components/trend-line-chart'
import { Button } from '#/components/ui/button'
import { formatDateShort, formatSyncedAgo, formatUsdPlain } from '#/lib/money'
import { prewarmQueries } from '#/lib/prewarm'
import { cn } from '#/lib/utils'

const OTHER_TYPE_COLOR = '#a8a29e'

const TYPE_COLORS: Record<string, string | undefined> = {
  equity: '#3d7a72',
  etf: '#4a6b52',
  'mutual fund': '#c27803',
  cash: '#78716c',
}

const RANGES = ['1M', '3M', 'YTD', '1Y', 'ALL'] as const
type Range = (typeof RANGES)[number]

const ALL_FILTER = 'all'

function typeColor(type: string): string {
  return TYPE_COLORS[type.toLowerCase()] ?? OTHER_TYPE_COLOR
}

function utcDay(): string {
  return new Date().toISOString().slice(0, 10)
}

function accountFilter(id: Id<'accounts'>): string {
  return `account:${id}`
}

function holdingFilter(id: Id<'holdings'>): string {
  return `holding:${id}`
}

function formatPct(n: number): string {
  const pct = n * 100
  const abs = Math.abs(pct).toFixed(2)
  if (pct > 0) return `+${abs}%`
  if (pct < 0) return `−${abs}%`
  return `${abs}%`
}

export const Route = createFileRoute('/app/investments')({
  loader: () => {
    prewarmQueries(
      { query: api.investments.portfolio },
      { query: api.investments.marketStatus },
      {
        query: api.investments.history,
        args: { range: '3M', today: utcDay() },
      },
    )
  },
  component: InvestmentsPage,
})

function InvestmentsPage() {
  const [range, setRange] = useState<Range>('3M')
  const [filter, setFilter] = useState(ALL_FILTER)
  const [refreshing, setRefreshing] = useState(false)
  const today = utcDay()
  const data = useQuery(api.investments.portfolio)
  const status = useQuery(api.investments.marketStatus)
  const refresh = useAction(api.alpacaActions.refreshMarketData)
  const selectedAccountId = filter.startsWith('account:')
    ? (filter.slice('account:'.length) as Id<'accounts'>)
    : undefined
  const selectedHoldingId = filter.startsWith('holding:')
    ? (filter.slice('holding:'.length) as Id<'holdings'>)
    : undefined
  const accountId =
    selectedAccountId &&
    data?.accounts.some((account) => account._id === selectedAccountId)
      ? selectedAccountId
      : undefined
  const holdingId =
    selectedHoldingId &&
    data?.holdings.some((holding) => holding._id === selectedHoldingId)
      ? selectedHoldingId
      : undefined
  const history = useQuery(api.investments.history, {
    range,
    today,
    accountId,
    holdingId,
  })
  const snapshotNow = useMutation(api.investments.snapshotNow)
  const autoRefreshed = useRef(false)

  const ensuredDay = useRef<string | null>(null)
  useEffect(() => {
    if (!data || history === undefined) return
    if (data.accounts.length === 0 && data.holdings.length === 0) return
    const last = history.at(-1)?.date
    if (last === today || ensuredDay.current === today) return
    ensuredDay.current = today
    void snapshotNow({}).catch(() => {
      if (ensuredDay.current === today) ensuredDay.current = null
    })
  }, [data, history, snapshotNow, today])

  useEffect(() => {
    if (!data || !status?.configured || autoRefreshed.current) return
    if (data.holdings.length === 0) return
    const stale =
      data.quotedAt == null || Date.now() - data.quotedAt > 15 * 60 * 1000
    if (!stale && data.historyReady) return
    autoRefreshed.current = true
    void refresh({ backfill: true, asOf: today }).catch(() => {
      autoRefreshed.current = false
    })
  }, [data, refresh, status, today])

  const runRefresh = () => {
    setRefreshing(true)
    void refresh({ backfill: true, asOf: today })
      .then((result) => {
        if (!result.configured) {
          toast.error('Add Alpaca API keys to refresh prices')
          return
        }
        if (result.error) {
          toast.error(result.error)
          return
        }
        toast.success(
          result.quotesUpdated > 0
            ? 'Prices updated from the market'
            : 'No market quotes for these holdings',
        )
      })
      .catch((e: Error) => toast.error(e.message))
      .finally(() => setRefreshing(false))
  }

  const filterOptions = useMemo((): Array<SearchSelectOption> => {
    if (!data) return [{ value: ALL_FILTER, label: 'All investments' }]
    const options: Array<SearchSelectOption> = [
      { value: ALL_FILTER, label: 'All investments' },
    ]
    for (const account of data.accounts) {
      options.push({
        value: accountFilter(account._id),
        label: account.name,
        keywords: [account.subtype, account.institutionName, 'account']
          .filter(Boolean)
          .join(' '),
        group: 'Accounts',
      })
    }
    for (const holding of data.holdings) {
      const title = holding.symbol
        ? `${holding.symbol} · ${holding.name}`
        : holding.name
      options.push({
        value: holdingFilter(holding._id),
        label: holding.accountName
          ? `${title} · ${holding.accountName}`
          : title,
        keywords: [
          holding.symbol,
          holding.name,
          holding.accountName,
          'position',
        ]
          .filter(Boolean)
          .join(' '),
        group: 'Positions',
      })
    }
    return options
  }, [data])

  useEffect(() => {
    if (!data || filter === ALL_FILTER) return
    if (!filterOptions.some((option) => option.value === filter)) {
      setFilter(ALL_FILTER)
    }
  }, [data, filter, filterOptions])

  const filterLabel =
    filterOptions.find((option) => option.value === filter)?.label ??
    'All investments'
  const chart = trendExtent(history ?? [])
  const viewingAll = filter === ALL_FILTER
  const quotedAgo = formatSyncedAgo(data?.quotedAt)

  const toggleFilter = (next: string) => {
    setFilter((current) => (current === next ? ALL_FILTER : next))
  }

  const heroMeta = (() => {
    if (viewingAll && data?.dayChange != null) {
      const label =
        data.dayChange === 0
          ? 'Unchanged today'
          : `${data.dayChange > 0 ? 'Up' : 'Down'} ${formatUsdPlain(Math.abs(data.dayChange))} today`
      return quotedAgo ? `${label} · ${quotedAgo}` : label
    }
    if (viewingAll && chart) {
      return chart.delta === 0
        ? `Unchanged since ${formatDateShort(chart.first.date)}`
        : `${chart.delta > 0 ? 'Up' : 'Down'} ${formatUsdPlain(Math.abs(chart.delta))} since ${formatDateShort(chart.first.date)}`
    }
    if (data && data.holdings.length > 0) {
      return `${data.holdings.length} holding${data.holdings.length === 1 ? '' : 's'} across ${data.byType.length} asset ${data.byType.length === 1 ? 'type' : 'types'}`
    }
    if (data) {
      return `${data.accounts.length} ${data.accounts.length === 1 ? 'account' : 'accounts'} connected · positions need access`
    }
    return undefined
  })()

  return (
    <AppShell title="Investments">
      {data ? (
        <Page>
          {data.accounts.length === 0 && data.holdings.length === 0 ? (
            <EmptyState
              title="No investment accounts"
              description="Connect a brokerage or IRA through Plaid to see holdings here."
              action={<PlaidLinkButton />}
            />
          ) : (
            <>
              <PageSummary>
                <HeroMetric
                  label="Portfolio value"
                  value={formatUsdPlain(data.totalValue)}
                  meta={heroMeta}
                />
              </PageSummary>

              <PageBody>
                <Panel
                  id="investments-trend"
                  title="Trend"
                  value={
                    chart
                      ? `${chart.delta >= 0 ? '↑' : '↓'} ${formatUsdPlain(Math.abs(chart.delta))}`
                      : undefined
                  }
                  tone={chart && chart.delta < 0 ? 'over' : 'positive'}
                  action={
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      {filterOptions.length > 1 ? (
                        <SearchSelect
                          value={filter}
                          options={filterOptions}
                          onSelect={setFilter}
                          aria-label="Filter trend by account or position"
                          searchPlaceholder="Account or position"
                          emptyText="Nothing matches."
                          align="end"
                        >
                          <span className="max-w-[11rem] truncate text-[12px] font-medium text-[var(--sea-ink)]">
                            {filterLabel}
                          </span>
                        </SearchSelect>
                      ) : null}
                      <div className="flex gap-0.5">
                        {RANGES.map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setRange(r)}
                            className="range-pill"
                            data-active={range === r}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                      {data.holdings.length > 0 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[12px]"
                          disabled={refreshing}
                          onClick={runRefresh}
                        >
                          {refreshing ? 'Refreshing' : 'Refresh prices'}
                        </Button>
                      ) : null}
                    </div>
                  }
                >
                  {chart && history && history.length > 0 ? (
                    <TrendLineChart points={history} gradientId="inv-area" />
                  ) : (
                    <EmptyState
                      title="No history yet"
                      description={
                        filter.startsWith('holding:')
                          ? data.historyReady
                            ? 'This position is recorded each day from here. The line grows as days pass.'
                            : 'Market history is still filling in for this ticker.'
                          : data.accounts.length + data.holdings.length > 0
                            ? "Today's value is being recorded. The line grows as days pass."
                            : 'Connect a brokerage — a point is recorded each day from there.'
                      }
                    />
                  )}
                </Panel>

                {data.holdings.length === 0 ? (
                  <>
                    <Panel
                      id="investments-accounts"
                      span={4}
                      title="Accounts"
                      hint={`${data.accounts.length} ${data.accounts.length === 1 ? 'account' : 'accounts'}`}
                      flush
                    >
                      <DataList>
                        {data.accounts.map((account) => (
                          <li key={account._id}>
                            <button
                              type="button"
                              className={cn(
                                'data-row cursor-pointer border-0 bg-transparent text-left transition-[background-color,transform] duration-[150ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-muted/70 active:scale-[0.995]',
                                filter === accountFilter(account._id) &&
                                  'bg-muted/70',
                              )}
                              aria-pressed={
                                filter === accountFilter(account._id)
                              }
                              onClick={() =>
                                toggleFilter(accountFilter(account._id))
                              }
                            >
                              <div className="min-w-0">
                                <RowTitle>{account.name}</RowTitle>
                                <RowMeta className="capitalize">
                                  {[account.subtype, account.institutionName]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </RowMeta>
                              </div>
                              <p className="amount-cell text-[var(--sea-ink)]">
                                {formatUsdPlain(account.currentBalance)}
                              </p>
                            </button>
                          </li>
                        ))}
                      </DataList>
                    </Panel>

                    <Panel
                      id="investments-holdings-access"
                      span={8}
                      title="Holdings"
                      collapsible={false}
                    >
                      <EmptyState
                        title="Positions aren't on this connection yet"
                        description="These accounts are linked, but holdings weren't included when you connected them. Grant access once to see what you own."
                        action={
                          <div className="flex flex-wrap justify-center gap-2">
                            {data.accessItems.length > 0 ? (
                              data.accessItems.map((item) => (
                                <PlaidLinkButton
                                  key={item.itemId}
                                  itemId={item.itemId}
                                  label={`Enable ${item.institutionName} holdings`}
                                />
                              ))
                            ) : (
                              <PlaidLinkButton label="Connect holdings" />
                            )}
                          </div>
                        }
                      />
                    </Panel>
                  </>
                ) : (
                  <>
                    <Panel
                      id="investments-allocation"
                      span={4}
                      title="Allocation"
                      value={formatUsdPlain(data.totalValue)}
                    >
                      <div className="grid justify-items-center gap-5 pt-1 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-center sm:justify-items-stretch xl:grid-cols-1 xl:justify-items-center">
                        <CategoryDonut
                          segments={data.byType.map((t) => ({
                            name: t.type,
                            amount: t.value,
                            color: typeColor(t.type),
                          }))}
                          size={140}
                          centerLabel="held"
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
                          <li key={h._id}>
                            <button
                              type="button"
                              className={cn(
                                'data-row cursor-pointer border-0 bg-transparent text-left transition-[background-color,transform] duration-[150ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-muted/70 active:scale-[0.995]',
                                filter === holdingFilter(h._id) &&
                                  'bg-muted/70',
                              )}
                              aria-pressed={filter === holdingFilter(h._id)}
                              onClick={() => toggleFilter(holdingFilter(h._id))}
                            >
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
                                  {formatUsdPlain(h.markValue)}
                                </p>
                                {h.dayChange != null &&
                                h.dayChangePct != null ? (
                                  <p
                                    className={cn(
                                      'text-[11px] tabular-nums',
                                      h.dayChange > 0
                                        ? 'text-[var(--lagoon)]'
                                        : h.dayChange < 0
                                          ? 'text-destructive'
                                          : 'text-muted-foreground',
                                    )}
                                  >
                                    {h.dayChange > 0
                                      ? '+'
                                      : h.dayChange < 0
                                        ? '−'
                                        : ''}
                                    {formatUsdPlain(Math.abs(h.dayChange))} ·{' '}
                                    {formatPct(h.dayChangePct)}
                                  </p>
                                ) : h.costBasis != null ? (
                                  <p className="text-[11px] tabular-nums text-muted-foreground">
                                    cost {formatUsdPlain(h.costBasis)}
                                  </p>
                                ) : null}
                              </div>
                            </button>
                          </li>
                        ))}
                      </DataList>
                    </Panel>
                  </>
                )}
              </PageBody>
            </>
          )}
        </Page>
      ) : null}
    </AppShell>
  )
}
