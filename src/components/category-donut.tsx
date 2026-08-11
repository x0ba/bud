/** Small custom SVG donut for category breakdown. */
export function CategoryDonut({
  segments,
  size = 120,
}: {
  segments: Array<{ name: string; color: string; amount: number }>
  size?: number
}) {
  const total = segments.reduce((s, x) => s + x.amount, 0)
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
  const circ = 2 * Math.PI * radius
  let offset = 0

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={r}
        cy={r}
        r={radius}
        fill="none"
        stroke="var(--muted)"
        strokeWidth={stroke}
      />
      {segments.map((seg) => {
        const len = (seg.amount / total) * circ
        const el = (
          <circle
            key={seg.name}
            cx={r}
            cy={r}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={stroke}
            strokeDasharray={`${len} ${circ - len}`}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${r} ${r})`}
            className="transition-[stroke-dasharray,stroke-dashoffset] duration-[250ms] ease-[cubic-bezier(0.23,1,0.32,1)]"
          />
        )
        offset += len
        return el
      })}
      <text
        x={r}
        y={r - 4}
        textAnchor="middle"
        className="fill-muted-foreground"
        style={{ fontSize: 10, fontWeight: 500 }}
      >
        spent
      </text>
      <text
        x={r}
        y={r + 12}
        textAnchor="middle"
        className="fill-foreground"
        style={{ fontSize: 13, fontWeight: 650 }}
      >
        {new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 0,
        }).format(total)}
      </text>
    </svg>
  )
}
