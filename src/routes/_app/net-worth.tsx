import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../../convex/_generated/api'
import {
  DataList,
  HeroMetric,
  PageFrame,
  SectionHeader,
} from '#/components/dense'
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
import { formatUsdPlain } from '#/lib/money'

export const Route = createFileRoute('/_app/net-worth')({
  component: NetWorthPage,
})

function NetWorthPage() {
  const [range, setRange] = useState<'1M' | '3M' | 'YTD' | '1Y' | 'ALL'>('3M')
  const summary = useQuery(api.netWorth.summary)
  const history = useQuery(api.netWorth.history, { range })
  const snapshotNow = useMutation(api.netWorth.snapshotNow)
  const addManual = useMutation(api.netWorth.addManualAsset)
  const removeManual = useMutation(api.netWorth.removeManualAsset)

  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [type, setType] = useState<'property' | 'vehicle' | 'cash' | 'other' | 'debt'>('property')

  const chart = useMemo(() => {
    if (!history || history.length === 0) return null
    const values = history.map((h) => h.netWorth)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const span = Math.max(max - min, 1)
    const w = 640
    const h = 160
    const pts = history.map((point, i) => {
      const x = (i / Math.max(history.length - 1, 1)) * w
      const y = h - ((point.netWorth - min) / span) * (h - 16) - 8
      return `${x},${y}`
    })
    return { w, h, points: pts.join(' '), last: history[history.length - 1] }
  }, [history])

  return (
    <AppShell
      title="Net worth"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            void snapshotNow({})
              .then(() => toast.success('Snapshot saved'))
              .catch((e: Error) => toast.error(e.message))
          }
        >
          Snapshot today
        </Button>
      }
    >
      {summary ? (
        <PageFrame width="lg">
          <HeroMetric
            label="Net worth"
            value={formatUsdPlain(summary.netWorth)}
            meta={
              <>
                Assets {formatUsdPlain(summary.assets)} · Liabilities{' '}
                {formatUsdPlain(summary.liabilities)}
              </>
            }
          />

          <section className="space-y-3">
            <div className="flex gap-0.5">
              {(['1M', '3M', 'YTD', '1Y', 'ALL'] as const).map((r) => (
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
            {chart ? (
              <svg
                viewBox={`0 0 ${chart.w} ${chart.h}`}
                className="h-44 w-full overflow-visible"
              >
                <polyline
                  fill="none"
                  stroke="var(--lagoon-deep)"
                  strokeWidth="2.5"
                  points={chart.points}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <p className="rounded-lg border border-dashed border-border/80 px-4 py-10 text-center text-[13px] text-muted-foreground">
                No snapshots yet. Sync accounts and click “Snapshot today”.
              </p>
            )}
          </section>

          <section className="grid gap-8 md:grid-cols-2">
            <div>
              <SectionHeader title="Accounts" />
              <DataList>
                {summary.accounts.map((a) => (
                  <li key={a.accountId} className="data-row">
                    <span>
                      <span className="font-medium text-[var(--sea-ink)]">
                        {a.name}
                      </span>
                      <span className="text-muted-foreground capitalize">
                        {' '}
                        · {a.type}
                      </span>
                    </span>
                    <span className="amount-cell text-[var(--sea-ink)]">
                      {formatUsdPlain(a.balance)}
                    </span>
                  </li>
                ))}
              </DataList>
            </div>

            <div className="space-y-3">
              <SectionHeader title="Manual assets" />
              <DataList>
                {summary.manualAssets.map((m) => (
                  <li key={m._id} className="data-row">
                    <span>
                      <span className="font-medium text-[var(--sea-ink)]">
                        {m.name}
                      </span>
                      <span className="text-muted-foreground"> · {m.type}</span>
                    </span>
                    <span className="flex items-center gap-2.5">
                      <span className="amount-cell text-[var(--sea-ink)]">
                        {formatUsdPlain(m.value)}
                      </span>
                      <button
                        type="button"
                        className="text-[12px] text-muted-foreground hover:text-destructive"
                        onClick={() => void removeManual({ id: m._id })}
                      >
                        Remove
                      </button>
                    </span>
                  </li>
                ))}
                {summary.manualAssets.length === 0 ? (
                  <li className="py-3 text-[13px] text-muted-foreground">
                    Add home, car, or other assets.
                  </li>
                ) : null}
              </DataList>

              <div className="toolbar">
                <Input
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-[140px]"
                />
                <Select
                  value={type}
                  onValueChange={(v) => setType(v as typeof type)}
                >
                  <SelectTrigger className="w-[120px]">
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
                <Input
                  placeholder="Value"
                  inputMode="decimal"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-[120px] tabular-nums"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (!name || !value) return
                    void addManual({
                      name,
                      type,
                      value: Number(value),
                    }).then(() => {
                      setName('')
                      setValue('')
                      toast.success('Added')
                    })
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
          </section>
        </PageFrame>
      ) : null}
    </AppShell>
  )
}
