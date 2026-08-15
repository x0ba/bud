import { useEffect, useMemo, useState } from 'react'
import { ChartHoverTip, svgPointToClient } from '#/components/chart-hover-tip'
import { formatDateShort, formatUsdPlain } from '#/lib/money'

export type TrendPoint = {
  date: string
  value: number
}

export function trendExtent(points: Array<TrendPoint>) {
  if (points.length === 0) return null
  const first = points[0]
  const last = points[points.length - 1]
  return { first, last, delta: last.value - first.value }
}

/**
 * Drawn with `preserveAspectRatio="none"` so the line fills the full width at
 * any container size; strokes opt out of that scaling, and the endpoint dot is
 * positioned in HTML rather than SVG so it stays a circle.
 */
export function TrendLineChart({
  points,
  gradientId,
}: {
  points: Array<TrendPoint>
  gradientId: string
}) {
  const [hover, setHover] = useState<{
    x: number
    y: number
    date: string
    value: number
    clientX: number
    clientY: number
  } | null>(null)

  useEffect(() => {
    setHover(null)
  }, [points])

  const chart = useMemo(() => {
    if (points.length === 0) return null
    const values = points.map((point) => point.value)
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
    const start = plotted[0]
    const end = plotted[plotted.length - 1]
    const linePoints =
      plotted.length === 1
        ? [
            { x: 0, y: start.y },
            { x: w, y: start.y },
          ]
        : plotted

    const line = linePoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ')

    return {
      w,
      h,
      line,
      points: plotted,
      area: `${line} L ${w} ${h} L 0 ${h} Z`,
      first: points[0],
      last: points[points.length - 1],
      endTopPct: (end.y / h) * 100,
    }
  }, [points])

  if (!chart) return null

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
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--lagoon)" stopOpacity="0.26" />
              <stop offset="100%" stopColor="var(--lagoon)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={chart.area} fill={`url(#${gradientId})`} />
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
