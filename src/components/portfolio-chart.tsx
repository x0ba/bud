import { useEffect, useMemo, useState } from 'react'
import { ChartHoverTip, svgPointToClient } from '#/components/chart-hover-tip'
import { EmptyState } from '#/components/dense'
import { formatDateShort, formatUsdPlain } from '#/lib/money'

type Point = { date: string; value: number }

/**
 * Same SVG contract as the net-worth trend: the line fills the panel width
 * (`preserveAspectRatio="none"`), strokes opt out, and the endpoint lives in
 * HTML so it stays a circle.
 */
export function PortfolioChart({
  points,
  emptyTitle,
  emptyDescription,
}: {
  points: Point[]
  emptyTitle: string
  emptyDescription: string
}) {
  const [hover, setHover] = useState<{
    x: number
    y: number
    date: string
    value: number
    clientX: number
    clientY: number
  } | null>(null)

  const chart = useMemo(() => {
    if (points.length === 0) return null
    const values = points.map((p) => p.value)
    const min = Math.min(...values)
    const span = Math.max(...values) - min
    const w = 640
    const h = 160
    const pad = 12
    const toY = (v: number) =>
      span <= 0 ? h / 2 : h - pad - ((v - min) / span) * (h - pad * 2)

    const plotted = points.map((point, i) => ({
      x: points.length === 1 ? w / 2 : (i / (points.length - 1)) * w,
      y: toY(point.value),
      date: point.date,
      value: point.value,
    }))
    const linePoints =
      plotted.length === 1
        ? [
            { x: 0, y: plotted[0].y },
            { x: w, y: plotted[0].y },
          ]
        : plotted
    const line = linePoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ')
    const first = points[0]
    const last = points[points.length - 1]

    return {
      w,
      h,
      line,
      points: plotted,
      area: `${line} L ${w} ${h} L 0 ${h} Z`,
      first,
      last,
      delta: last.value - first.value,
      endTopPct: (plotted[plotted.length - 1].y / h) * 100,
    }
  }, [points])

  useEffect(() => {
    setHover(null)
  }, [points])

  if (!chart) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  return (
    <div className="space-y-2 pt-1">
      <div
        className="relative border-b border-border/70"
        onPointerMove={(event) => {
          const svg = event.currentTarget.querySelector('svg')
          if (!svg) return
          const rect = svg.getBoundingClientRect()
          const first = chart.points[0]
          if (rect.width <= 0) return
          const svgX = ((event.clientX - rect.left) / rect.width) * chart.w
          const nearest = chart.points.reduce(
            (best, point) =>
              Math.abs(point.x - svgX) < Math.abs(best.x - svgX) ? point : best,
            first,
          )
          const client = svgPointToClient(svg, nearest.x, nearest.y)
          setHover({
            x: nearest.x,
            y: nearest.y,
            date: nearest.date,
            value: nearest.value,
            clientX: client.x,
            clientY: client.y,
          })
        }}
        onPointerLeave={() => setHover(null)}
      >
        <svg
          viewBox={`0 0 ${chart.w} ${chart.h}`}
          preserveAspectRatio="none"
          className="h-40 w-full"
          aria-hidden
        >
          <defs>
            <linearGradient id="pf-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--lagoon)" stopOpacity="0.26" />
              <stop offset="100%" stopColor="var(--lagoon)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={chart.area} fill="url(#pf-area)" />
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
        {hover ? (
          <>
            <span
              className="pointer-events-none absolute top-0 h-full w-px bg-[var(--lagoon-deep)]/25"
              style={{ left: `${(hover.x / chart.w) * 100}%` }}
              aria-hidden
            />
            <span
              className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--lagoon-deep)] ring-2 ring-background"
              style={{
                left: `${(hover.x / chart.w) * 100}%`,
                top: `${(hover.y / chart.h) * 100}%`,
              }}
              aria-hidden
            />
            <ChartHoverTip
              x={hover.clientX}
              y={hover.clientY}
              label={new Date(`${hover.date}T12:00:00`).toLocaleDateString(
                'en-US',
                {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                },
              )}
              value={formatUsdPlain(hover.value)}
            />
          </>
        ) : (
          <span
            className="absolute right-0 size-2 -translate-y-1/2 translate-x-1/2 rounded-full bg-[var(--lagoon-deep)] ring-2 ring-background"
            style={{ top: `${chart.endTopPct}%` }}
            aria-hidden
          />
        )}
      </div>
      <div className="flex items-baseline justify-between text-[11px] tabular-nums text-muted-foreground">
        <span>{formatDateShort(chart.first.date)}</span>
        <span>{formatDateShort(chart.last.date)}</span>
      </div>
    </div>
  )
}

export function historyDelta(points: Point[]): number | null {
  if (points.length < 2) return null
  return points[points.length - 1].value - points[0].value
}
