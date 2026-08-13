import { useState } from 'react'
import type { PointerEvent } from 'react'
import { ChartHoverTip, svgPointToClient } from '#/components/chart-hover-tip'
import { formatUsdPlain } from '#/lib/money'
import { cn } from '#/lib/utils'

function arcPath(
  cx: number,
  cy: number,
  radius: number,
  start: number,
  end: number,
) {
  const large = end - start > Math.PI ? 1 : 0
  const sx = cx + radius * Math.cos(start)
  const sy = cy + radius * Math.sin(start)
  const ex = cx + radius * Math.cos(end)
  const ey = cy + radius * Math.sin(end)
  return `M ${sx} ${sy} A ${radius} ${radius} 0 ${large} 1 ${ex} ${ey}`
}

/** Small custom SVG donut for category breakdown. */
export function CategoryDonut({
  segments,
  size = 120,
  centerLabel = 'spent',
}: {
  segments: Array<{ name: string; color: string; amount: number }>
  size?: number
  centerLabel?: string
}) {
  const total = segments.reduce((s, x) => s + x.amount, 0)
  const [hover, setHover] = useState<{
    name: string
    amount: number
    x: number
    y: number
  } | null>(null)

  if (total <= 0) {
    return (
      <div
        className="flex items-center justify-center rounded-full border border-dashed border-border text-[12px] text-muted-foreground"
        style={{ width: size, height: size }}
      >
        No spend
      </div>
    )
  }

  const r = size / 2
  const stroke = size * 0.14
  const radius = r - stroke / 2
  const hitStroke = Math.max(stroke, 18)

  const slices: Array<{
    name: string
    color: string
    amount: number
    start: number
    end: number
    midX: number
    midY: number
    full: boolean
  }> = []
  let angle = -Math.PI / 2
  for (const seg of segments) {
    const sweep = (seg.amount / total) * Math.PI * 2
    const start = angle
    const end = angle + sweep
    const mid = start + sweep / 2
    slices.push({
      name: seg.name,
      color: seg.color,
      amount: seg.amount,
      start,
      end,
      midX: r + radius * Math.cos(mid),
      midY: r + radius * Math.sin(mid),
      full: sweep >= Math.PI * 2 - 1e-6,
    })
    angle = end
  }

  function showSlice(
    event: PointerEvent<SVGElement>,
    slice: (typeof slices)[number],
  ) {
    const svg = event.currentTarget.ownerSVGElement
    if (!svg) return
    const point = svgPointToClient(svg, slice.midX, slice.midY)
    setHover({
      name: slice.name,
      amount: slice.amount,
      x: point.x,
      y: point.y,
    })
  }

  return (
    <div className="relative">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        onPointerLeave={() => setHover(null)}
      >
        <circle
          cx={r}
          cy={r}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
          className="pointer-events-none"
        />
        {slices.map((slice) => {
          const dimmed = hover !== null && hover.name !== slice.name
          const arc = slice.full
            ? null
            : arcPath(r, r, radius, slice.start, slice.end)
          return (
            <g
              key={slice.name}
              className={cn(
                'transition-opacity duration-[150ms] ease-[cubic-bezier(0.23,1,0.32,1)]',
                dimmed && 'opacity-45',
              )}
            >
              {slice.full ? (
                <circle
                  cx={r}
                  cy={r}
                  r={radius}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={stroke}
                  className="pointer-events-none"
                />
              ) : (
                <path
                  d={arc!}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={stroke}
                  strokeLinecap="butt"
                  className="pointer-events-none"
                />
              )}
              {slice.full ? (
                <circle
                  cx={r}
                  cy={r}
                  r={radius}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={hitStroke}
                  className="cursor-default"
                  onPointerEnter={(event) => showSlice(event, slice)}
                />
              ) : (
                <path
                  d={arc!}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={hitStroke}
                  strokeLinecap="butt"
                  className="cursor-default"
                  onPointerEnter={(event) => showSlice(event, slice)}
                />
              )}
            </g>
          )
        })}
        <circle
          cx={r}
          cy={r}
          r={Math.max(radius - hitStroke / 2, 0)}
          fill="transparent"
          onPointerEnter={() => setHover(null)}
        />
        <text
          x={r}
          y={r - 4}
          textAnchor="middle"
          className="pointer-events-none fill-muted-foreground"
          style={{ fontSize: 10, fontWeight: 500 }}
        >
          {centerLabel}
        </text>
        <text
          x={r}
          y={r + 12}
          textAnchor="middle"
          className="pointer-events-none fill-foreground"
          style={{ fontSize: 13, fontWeight: 650 }}
        >
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
          }).format(total)}
        </text>
      </svg>
      {hover ? (
        <ChartHoverTip
          x={hover.x}
          y={hover.y}
          label={hover.name}
          value={formatUsdPlain(hover.amount)}
          detail={
            hover.amount / total < 0.01
              ? '<1%'
              : `${Math.round((hover.amount / total) * 100)}%`
          }
        />
      ) : null}
    </div>
  )
}
