import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { Plus, X } from 'lucide-react'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  DataList,
  EmptyState,
  HeroMetric,
  Kicker,
  RowGroupHeader,
  ShareBar,
  Stat,
} from '#/components/dense'
import { Page, PageBody, PageSummary, Panel } from '#/components/panel'
import { AppShell } from '#/components/layout/app-shell'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { formatDateShort, formatUsdPlain } from '#/lib/money'
import { prewarmQueries } from '#/lib/prewarm'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/_app/net-worth')({
  loader: () => {
    prewarmQueries(
      { query: api.netWorth.summary },
      { query: api.netWorth.history, args: { range: '3M' } },
    )
  },
  component: NetWorthPage,
})

const RANGES = ['1M', '3M', 'YTD', '1Y', 'ALL'] as const
type Range = (typeof RANGES)[number]

type Holding = {
  id: string
  name: string
  meta: string
  amount: number
  onRemove?: () => void
}

function NetWorthPage() {
  const [range, setRange] = useState<Range>('3M')
  const [adding, setAdding] = useState(false)
  const summary = useQuery(api.netWorth.summary)
  const history = useQuery(api.netWorth.history, { range })
  const snapshotNow = useMutation(api.netWorth.snapshotNow)
  const addManual = useMutation(api.netWorth.addManualAsset)
  const removeManual = useMutation(api.netWorth.removeManualAsset)

  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [type, setType] = useState<
    'property' | 'vehicle' | 'cash' | 'other' | 'debt'
  >('property')

  const ensuredToday = useRef(false)
  useEffect(() => {
    if (!summary || history === undefined) return
    const hasHoldings =
      summary.accounts.length > 0 || summary.manualAssets.length > 0
    if (!hasHoldings) return
    const today = new Date().toISOString().slice(0, 10)
    const last = history.at(-1)?.date
    if (last === today || ensuredToday.current) return
    ensuredToday.current = true
    void snapshotNow({})
  }, [summary, history, snapshotNow])

  /**
   * Drawn with `preserveAspectRatio="none"` so the line fills the full width at
   * any container size; strokes opt out of that scaling, and the endpoint dot is
   * positioned in HTML rather than SVG so it stays a circle.
   */
  const chart = useMemo(() => {
    if (!history || history.length === 0) return null
    const values = history.map((h) => h.netWorth)
    const min = Math.min(...values)
    const span = Math.max(...values) - min
    const w = 640
    const h = 160
    const pad = 12
    const toY = (v: number) =>
      span <= 0 ? h / 2 : h - pad - ((v - min) / span) * (h - pad * 2)

    const points =
      history.length === 1
        ? [
            { x: 0, y: toY(values[0]) },
            { x: w, y: toY(values[0]) },
          ]
        : history.map((point, i) => ({
            x: (i / (history.length - 1)) * w,
            y: toY(point.netWorth),
          }))

    const line = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ')
    const first = history[0]
    const last = history[history.length - 1]

    return {
      w,
      h,
      line,
      area: `${line} L ${w} ${h} L 0 ${h} Z`,
      first,
      last,
      delta: last.netWorth - first.netWorth,
      endTopPct: (points[points.length - 1].y / h) * 100,
    }
  }, [history])

  const holdings = useMemo(() => {
    if (!summary) return null
    const isDebtAccount = (t: string) => t === 'credit' || t === 'loan'
    const byAmount = (a: Holding, b: Holding) => b.amount - a.amount
    const remove = (id: Id<'manualAssets'>) => () =>
      void removeManual({ id })
        .then(() => toast.success('Removed'))
        .catch((e: Error) => toast.error(e.message))

    return {
      assetAccounts: summary.accounts
        .filter((a) => !isDebtAccount(a.type))
        .map((a) => ({
          id: a.accountId,
          name: a.name,
          meta: a.type,
          amount: a.balance,
        }))
        .sort(byAmount),
      debtAccounts: summary.accounts
        .filter((a) => isDebtAccount(a.type))
        .map((a) => ({
          id: a.accountId,
          name: a.name,
          meta: a.type,
          amount: Math.abs(a.balance),
        }))
        .sort(byAmount),
      manualAssets: summary.manualAssets
        .filter((m) => m.type !== 'debt')
        .map((m) => ({
          id: m._id,
          name: m.name,
          meta: m.type,
          amount: m.value,
          onRemove: remove(m._id),
        }))
        .sort(byAmount),
      manualDebts: summary.manualAssets
        .filter((m) => m.type === 'debt')
        .map((m) => ({
          id: m._id,
          name: m.name,
          meta: m.type,
          amount: Math.abs(m.value),
          onRemove: remove(m._id),
        }))
        .sort(byAmount),
    }
  }, [summary, removeManual])

  if (!summary || !holdings) {
    return <AppShell title="Net worth" />
  }

  const submitAsset = () => {
    if (!name || !value) return
    void addManual({ name, type, value: Number(value) }).then(() => {
      setName('')
      setValue('')
      setAdding(false)
      toast.success('Added')
    })
  }

  const largestAsset = Math.max(
    ...holdings.assetAccounts.map((a) => a.amount),
    ...holdings.manualAssets.map((a) => a.amount),
    1,
  )
  const largestDebt = Math.max(
    ...holdings.debtAccounts.map((d) => d.amount),
    ...holdings.manualDebts.map((d) => d.amount),
    1,
  )
  const debtShare =
    summary.assets > 0
      ? Math.round((summary.liabilities / summary.assets) * 100)
      : null
  const hasDebts =
    holdings.debtAccounts.length + holdings.manualDebts.length > 0

  return (
    <AppShell title="Net worth">
      <Page>
        <PageSummary>
          <HeroMetric
            label="Net worth"
            value={formatUsdPlain(summary.netWorth)}
            meta={
              chart
                ? chart.delta === 0
                  ? `Unchanged since ${formatDateShort(chart.first.date)}`
                  : `${chart.delta > 0 ? 'Up' : 'Down'} ${formatUsdPlain(Math.abs(chart.delta))} since ${formatDateShort(chart.first.date)}`
                : summary.accounts.length + summary.manualAssets.length > 0
                  ? 'Balances are recorded each day automatically.'
                  : 'Connect an account or add an asset to start the trend.'
            }
          />
          <div className="flex items-end gap-8">
            {debtShare != null ? (
              <div className="hidden w-[220px] space-y-2 sm:block">
                <ShareBar
                  value={summary.liabilities}
                  total={summary.assets}
                  color="color-mix(in oklab, var(--sea-ink) 34%, transparent)"
                  className="h-2"
                />
                <p className="text-[11px] font-medium text-muted-foreground">
                  Debts are {debtShare}% of what you own
                </p>
              </div>
            ) : null}
            <Stat
              label="Assets"
              value={formatUsdPlain(summary.assets)}
              tone="positive"
            />
            <Stat
              label="Debts"
              value={formatUsdPlain(summary.liabilities)}
              tone={summary.liabilities > 0 ? 'default' : 'muted'}
            />
          </div>
        </PageSummary>

        <PageBody>
          <Panel
            id="net-worth-trend"
            title="Trend"
            value={
              chart
                ? `${chart.delta >= 0 ? '↑' : '↓'} ${formatUsdPlain(Math.abs(chart.delta))}`
                : undefined
            }
            tone={chart && chart.delta < 0 ? 'over' : 'positive'}
            action={
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
            }
          >
            {chart ? (
              <div className="space-y-2 pt-1">
                <div className="relative border-b border-border/70">
                  <svg
                    viewBox={`0 0 ${chart.w} ${chart.h}`}
                    preserveAspectRatio="none"
                    className="h-40 w-full"
                    aria-hidden
                  >
                    <defs>
                      <linearGradient id="nw-area" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="var(--lagoon)"
                          stopOpacity="0.26"
                        />
                        <stop
                          offset="100%"
                          stopColor="var(--lagoon)"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>
                    <path d={chart.area} fill="url(#nw-area)" />
                    <path
                      d={chart.line}
                      fill="none"
                      stroke="var(--lagoon-deep)"
                      strokeWidth="2"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                  <span
                    className="absolute right-0 size-2 -translate-y-1/2 translate-x-1/2 rounded-full bg-[var(--lagoon-deep)] ring-2 ring-background"
                    style={{ top: `${chart.endTopPct}%` }}
                    aria-hidden
                  />
                </div>
                <div className="flex items-baseline justify-between text-[11px] tabular-nums text-muted-foreground">
                  <span>{formatDateShort(chart.first.date)}</span>
                  <span>{formatDateShort(chart.last.date)}</span>
                </div>
              </div>
            ) : (
              <EmptyState
                title="No history yet"
                description={
                  summary.accounts.length + summary.manualAssets.length > 0
                    ? "Today's balances are being recorded. The line grows as days pass."
                    : 'Connect an account or add an asset — a point is recorded each day from there.'
                }
              />
            )}
          </Panel>

          <Panel
            id="net-worth-assets"
            span={6}
            title="Assets"
            description="Accounts and anything you've valued by hand."
            value={formatUsdPlain(summary.assets)}
            action={
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setAdding((v) => !v)}
                aria-expanded={adding}
              >
                <Plus />
                Add
              </Button>
            }
          >
            <DataList className="mt-1">
              {holdings.assetAccounts.length > 0 ? (
                <Fragment>
                  {holdings.manualAssets.length > 0 ? (
                    <RowGroupHeader label="Accounts" />
                  ) : null}
                  {holdings.assetAccounts.map((row) => (
                    <HoldingRow
                      key={row.id}
                      holding={row}
                      max={largestAsset}
                      reserveAction={holdings.manualAssets.length > 0}
                    />
                  ))}
                </Fragment>
              ) : null}
              {holdings.manualAssets.length > 0 ? (
                <Fragment>
                  {holdings.assetAccounts.length > 0 ? (
                    <RowGroupHeader label="Manual" />
                  ) : null}
                  {holdings.manualAssets.map((row) => (
                    <HoldingRow
                      key={row.id}
                      holding={row}
                      max={largestAsset}
                      reserveAction
                    />
                  ))}
                </Fragment>
              ) : null}
              {holdings.assetAccounts.length + holdings.manualAssets.length ===
              0 ? (
                <li className="py-3 text-[13px] text-muted-foreground">
                  Nothing here yet — connect an account, or add a home or car by
                  hand.
                </li>
              ) : null}
            </DataList>

            {adding ? (
              <div className="rise-in flex flex-wrap items-end gap-2 rounded-lg border border-border/70 bg-muted/25 p-3">
                <div>
                  <Kicker>Name</Kicker>
                  <Input
                    placeholder="Home"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5 w-[150px]"
                    aria-label="Asset name"
                  />
                </div>
                <div>
                  <Kicker>Type</Kicker>
                  <Select
                    value={type}
                    onValueChange={(v) => setType(v as typeof type)}
                  >
                    <SelectTrigger className="mt-1.5 w-[124px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="property">Property</SelectItem>
                      <SelectItem value="vehicle">Vehicle</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="debt">Debt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Kicker>Value</Kicker>
                  <Input
                    placeholder="0"
                    inputMode="decimal"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="mt-1.5 w-[124px] text-right tabular-nums"
                    aria-label="Asset value"
                  />
                </div>
                <Button size="sm" onClick={submitAsset}>
                  Add
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAdding(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : null}
          </Panel>

          {hasDebts ? (
            <Panel
              id="net-worth-debts"
              span={6}
              title="Debts"
              description="Balances that subtract from what you own."
              value={formatUsdPlain(summary.liabilities)}
              tone="muted"
            >
              <DataList className="mt-1">
                {holdings.debtAccounts.length > 0 ? (
                  <Fragment>
                    {holdings.manualDebts.length > 0 ? (
                      <RowGroupHeader label="Accounts" />
                    ) : null}
                    {holdings.debtAccounts.map((row) => (
                      <HoldingRow
                        key={row.id}
                        holding={row}
                        max={largestDebt}
                        reserveAction={holdings.manualDebts.length > 0}
                        debt
                      />
                    ))}
                  </Fragment>
                ) : null}
                {holdings.manualDebts.length > 0 ? (
                  <Fragment>
                    {holdings.debtAccounts.length > 0 ? (
                      <RowGroupHeader label="Manual" />
                    ) : null}
                    {holdings.manualDebts.map((row) => (
                      <HoldingRow
                        key={row.id}
                        holding={row}
                        max={largestDebt}
                        reserveAction
                        debt
                      />
                    ))}
                  </Fragment>
                ) : null}
              </DataList>
            </Panel>
          ) : null}
        </PageBody>
      </Page>
    </AppShell>
  )
}

function HoldingRow({
  holding,
  max,
  debt = false,
  reserveAction = false,
}: {
  holding: Holding
  max: number
  debt?: boolean
  reserveAction?: boolean
}) {
  return (
    <li className="group grid grid-cols-[1fr_auto] items-center gap-4 py-2.5 text-[13px] sm:grid-cols-[1fr_56px_auto]">
      <span className="flex min-w-0 items-baseline gap-2">
        <span className="truncate font-medium text-[var(--sea-ink)]">
          {holding.name}
        </span>
        <span className="shrink-0 text-[12px] capitalize text-muted-foreground">
          {holding.meta}
        </span>
      </span>
      <ShareBar
        value={holding.amount}
        total={max}
        color={
          debt
            ? 'color-mix(in oklab, var(--sea-ink) 34%, transparent)'
            : 'var(--lagoon-deep)'
        }
        className="hidden sm:block"
      />
      <span className="flex items-center justify-end gap-1">
        <span
          className={cn(
            'amount-cell',
            debt ? 'text-[var(--sea-ink-soft)]' : 'text-[var(--sea-ink)]',
          )}
        >
          {formatUsdPlain(holding.amount)}
        </span>
        {holding.onRemove ? (
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Remove ${holding.name}`}
            onClick={holding.onRemove}
            // Hit area expands past the 24px glyph to clear the 40px minimum.
            className="relative text-muted-foreground opacity-0 after:absolute after:-inset-2 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
          >
            <X />
          </Button>
        ) : reserveAction ? (
          <span className="size-6" aria-hidden />
        ) : null}
      </span>
    </li>
  )
}
