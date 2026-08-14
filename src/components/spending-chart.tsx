import { useId, useMemo, useState } from 'react'
import { ChartHoverTip, svgPointToClient } from '#/components/chart-hover-tip'
import { formatUsdPlain } from '#/lib/money'
import { cn } from '#/lib/utils'

type Point = { day: number; cumulative: number }

const W = 640
const H = 192
const PAD_TOP = 8
const PAD_BOTTOM = 4

function niceCeiling(value: number): number {
  if (value <= 0) return 100
  const exp = Math.floor(Math.log10(value))
  const mag = 10 ** exp
  const n = value / mag
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10
  return nice * mag
}

function yTicks(max: number, count = 5): Array<number> {
  const top = niceCeiling(max * 1.08)
  const step = top / (count - 1)
  return Array.from({ length: count }, (_, i) => i * step)
}

function xTicks(days: number): Array<number> {
  const ticks = [1]
  for (let d = 5; d < days; d += 4) ticks.push(d)
  const last = ticks.at(-1) ?? 1
  if (last === days) return ticks
  if (days - last < 3) {
    ticks[ticks.length - 1] = days
    return ticks
  }
  ticks.push(days)
  return ticks
}

function formatAxisUsd(n: number): string {
  if (n === 0) return '$0'
  if (n >= 1000) {
    const k = n / 1000
    return `$${Number.isInteger(k) ? k : k.toFixed(1)}k`
  }
  return `$${n % 1 === 0 ? n : n.toFixed(0)}`
}

function dayX(day: number, axisDays: number): number {
  if (axisDays <= 1) return 0
  return ((day - 1) / (axisDays - 1)) * W
}

function toY(value: number, max: number): number {
  if (max <= 0) return H - PAD_BOTTOM
  return H - PAD_BOTTOM - (value / max) * (H - PAD_TOP - PAD_BOTTOM)
}

function linePath(points: Array<Point>, axisDays: number, max: number): string {
  return points
    .map(
      (p, i) =>
        `${i === 0 ? 'M' : 'L'} ${dayX(p.day, axisDays)} ${toY(p.cumulative, max)}`,
    )
    .join(' ')
}

function areaPath(points: Array<Point>, axisDays: number, max: number): string {
  if (points.length === 0) return ''
  const line = linePath(points, axisDays, max)
  const last = points[points.length - 1]
  const first = points[0]
  if (!last || !first) return ''
  return `${line} L ${dayX(last.day, axisDays)} ${H} L ${dayX(first.day, axisDays)} ${H} Z`
}

function atDay(points: Array<Point>, day: number): Point | undefined {
  return points.find((p) => p.day === day)
}

export function SpendingChart({
  thisMonth,
  compare,
  compareLabel,
  throughDay,
  daysInMonth,
}: {
  thisMonth: Array<Point>
  compare: Array<Point>
  compareLabel: string
  throughDay: number
  daysInMonth: number
}) {
  const rawId = useId()
  const gid = `spend-area-${rawId.replace(/:/g, '')}`
  const [hover, setHover] = useState<{
    day: number
    thisValue?: number
    compareValue?: number
    clientX: number
    clientY: number
    x: number
    thisY?: number
    compareY?: number
  } | null>(null)

  const chart = useMemo(() => {
    const axisDays = Math.max(
      daysInMonth,
      thisMonth.at(-1)?.day ?? 1,
      compare.at(-1)?.day ?? 1,
    )
    const max = Math.max(
      ...thisMonth.map((p) => p.cumulative),
      ...compare.map((p) => p.cumulative),
      0,
    )
    const ticksY = yTicks(max)
    const top = ticksY.at(-1) ?? 100
    const end = thisMonth.at(-1)

    return {
      axisDays,
      max: top,
      ticksY,
      ticksX: xTicks(axisDays),
      thisLine: linePath(thisMonth, axisDays, top),
      thisArea: areaPath(thisMonth, axisDays, top),
      compareLine: linePath(compare, axisDays, top),
      end,
      endX: end ? dayX(end.day, axisDays) : 0,
      endY: end ? toY(end.cumulative, top) : 0,
    }
  }, [thisMonth, compare, daysInMonth])

  return (
    <div className="space-y-3 pt-1">
      <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-2">
        <div className="relative h-48" aria-hidden>
          {chart.ticksY.map((tick) => (
            <span
              key={tick}
              className={cn(
                'absolute right-0 text-[11px] tabular-nums text-muted-foreground',
                tick === 0
                  ? '-translate-y-full'
                  : tick === chart.max
                    ? null
                    : '-translate-y-1/2',
              )}
              style={{ top: `${(toY(tick, chart.max) / H) * 100}%` }}
            >
              {formatAxisUsd(tick)}
            </span>
          ))}
        </div>

        <div
          className="relative h-48"
          onPointerMove={(event) => {
            const svg = event.currentTarget.querySelector('svg')
            if (!svg) return
            const rect = svg.getBoundingClientRect()
            if (rect.width <= 0) return
            const svgX = ((event.clientX - rect.left) / rect.width) * W
            const day = Math.min(
              chart.axisDays,
              Math.max(1, Math.round((svgX / W) * (chart.axisDays - 1) + 1)),
            )
            const current = atDay(thisMonth, day)
            const prior = atDay(compare, day)
            if (!current && !prior) {
              setHover(null)
              return
            }
            const x = dayX(day, chart.axisDays)
            const thisY = current
              ? toY(current.cumulative, chart.max)
              : undefined
            const compareY = prior
              ? toY(prior.cumulative, chart.max)
              : undefined
            const client = svgPointToClient(svg, x, thisY ?? compareY ?? 0)
            setHover({
              day,
              thisValue: current?.cumulative,
              compareValue: prior?.cumulative,
              clientX: client.x,
              clientY: client.y,
              x,
              thisY,
              compareY,
            })
          }}
          onPointerLeave={() => setHover(null)}
        >
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="h-full w-full"
            aria-hidden
          >
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--lagoon)"
                  stopOpacity="0.28"
                />
                <stop offset="100%" stopColor="var(--lagoon)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {chart.ticksY.map((tick) => (
              <line
                key={tick}
                x1="0"
                x2={W}
                y1={toY(tick, chart.max)}
                y2={toY(tick, chart.max)}
                stroke="var(--border)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {chart.compareLine ? (
              <path
                d={chart.compareLine}
                fill="none"
                stroke="color-mix(in oklab, var(--sea-ink) 28%, transparent)"
                strokeWidth="1.75"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
            {chart.thisArea ? (
              <path d={chart.thisArea} fill={`url(#${gid})`} />
            ) : null}
            {chart.thisLine ? (
              <path
                d={chart.thisLine}
                fill="none"
                stroke="var(--lagoon-deep)"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
          </svg>

          {hover ? (
            <>
              <span
                className="pointer-events-none absolute top-0 h-full w-px bg-[var(--lagoon-deep)]/25"
                style={{ left: `${(hover.x / W) * 100}%` }}
                aria-hidden
              />
              {hover.compareY != null ? (
                <span
                  className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color-mix(in_oklab,var(--sea-ink)_40%,transparent)] ring-2 ring-[var(--card)]"
                  style={{
                    left: `${(hover.x / W) * 100}%`,
                    top: `${(hover.compareY / H) * 100}%`,
                  }}
                  aria-hidden
                />
              ) : null}
              {hover.thisY != null ? (
                <span
                  className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--lagoon-deep)] ring-2 ring-[var(--card)]"
                  style={{
                    left: `${(hover.x / W) * 100}%`,
                    top: `${(hover.thisY / H) * 100}%`,
                  }}
                  aria-hidden
                />
              ) : null}
              <ChartHoverTip
                x={hover.clientX}
                y={hover.clientY}
                label={`Day ${hover.day}`}
                rows={[
                  ...(hover.thisValue != null
                    ? [
                        {
                          value: formatUsdPlain(hover.thisValue),
                          detail: 'this month',
                        },
                      ]
                    : []),
                  ...(hover.compareValue != null
                    ? [
                        {
                          value: formatUsdPlain(hover.compareValue),
                          detail: compareLabel.toLowerCase(),
                        },
                      ]
                    : []),
                ]}
              />
            </>
          ) : chart.end ? (
            <span
              className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--lagoon-deep)] ring-2 ring-[var(--card)]"
              style={{
                left: `${(chart.endX / W) * 100}%`,
                top: `${(chart.endY / H) * 100}%`,
              }}
              aria-hidden
            />
          ) : null}
        </div>

        <div />
        <div className="relative h-4 text-[11px] tabular-nums text-muted-foreground">
          {chart.ticksX.map((day) => (
            <span
              key={day}
              className="absolute -translate-x-1/2 first:translate-x-0 last:translate-x-[-100%]"
              style={{ left: `${(dayX(day, chart.axisDays) / W) * 100}%` }}
            >
              Day {day}
            </span>
          ))}
        </div>
      </div>

      <ul className="flex items-center justify-center gap-5 text-[12px]">
        <li className="flex items-center gap-1.5 text-muted-foreground">
          <span
            className="h-px w-3.5 bg-[color-mix(in_oklab,var(--sea-ink)_34%,transparent)]"
            aria-hidden
          />
          {compareLabel}
        </li>
        <li className="flex items-center gap-1.5 font-medium text-[var(--lagoon-deep)]">
          <span className="h-px w-3.5 bg-[var(--lagoon-deep)]" aria-hidden />
          This month
        </li>
      </ul>

      <p className="sr-only">
        Cumulative spending through day {throughDay}
        {chart.end
          ? `, ${formatUsdPlain(chart.end.cumulative)} this month`
          : ''}
        .
      </p>
    </div>
  )
}
