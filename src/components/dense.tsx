import { cn } from '#/lib/utils'

/** Shared semantic tones for figures and section values. */
export type Tone = 'default' | 'positive' | 'warning' | 'over' | 'muted'

function toneClass(tone: Tone): string {
  switch (tone) {
    case 'positive':
      return 'text-[var(--palm)]'
    case 'warning':
      return 'text-amber-700'
    case 'over':
      return 'text-destructive'
    case 'muted':
      return 'text-muted-foreground'
    default:
      return 'text-[var(--sea-ink)]'
  }
}

/** Uppercase meta label — demoted tier in the type hierarchy. */
export function Kicker({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <p className={cn('kicker', className)}>{children}</p>
}

/** Page-leading figure: muted kicker → bold tabular hero → optional meta. */
export function HeroMetric({
  label,
  value,
  meta,
  tone = 'default',
  className,
}: {
  label: string
  value: React.ReactNode
  meta?: React.ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <Kicker>{label}</Kicker>
      <p className="hero-figure" data-tone={tone === 'default' ? undefined : tone}>
        {value}
      </p>
      {meta ? (
        <div className="pt-1 text-[13px] text-muted-foreground text-pretty">
          {meta}
        </div>
      ) : null}
    </div>
  )
}

/** Compact secondary metric (cash-flow stats, card details). */
export function Stat({
  label,
  value,
  tone = 'default',
  className,
}: {
  label: string
  value: React.ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <Kicker>{label}</Kicker>
      <p
        className={cn(
          'text-[22px] font-semibold leading-none tracking-tight tabular-nums',
          toneClass(tone),
        )}
      >
        {value}
      </p>
    </div>
  )
}

/**
 * Section landmark. Sits a full tier above row text (15/600 vs 13/500) so the
 * eye can skip between sections without reading them, and carries an optional
 * `value` so the header itself answers "how am I doing here?" — the rows below
 * become detail you can choose to skip.
 */
export function SectionHeader({
  title,
  description,
  value,
  hint,
  tone = 'default',
  action,
  sticky = false,
  className,
}: {
  title: string
  description?: React.ReactNode
  value?: React.ReactNode
  hint?: React.ReactNode
  tone?: Tone
  action?: React.ReactNode
  sticky?: boolean
  className?: string
}) {
  const hasTrailing = value != null || hint != null || action != null
  return (
    <div
      className={cn('section-header', className)}
      data-sticky={sticky || undefined}
    >
      <div className="min-w-0">
        <h2 className="section-title text-balance">{title}</h2>
        {description ? (
          <p className="mt-1 text-[12px] leading-snug text-muted-foreground text-pretty">
            {description}
          </p>
        ) : null}
      </div>
      {hasTrailing ? (
        <div className="flex shrink-0 items-baseline gap-2">
          {value != null ? (
            <span
              className={cn(
                'text-[13px] font-semibold tabular-nums',
                toneClass(tone),
              )}
            >
              {value}
            </span>
          ) : null}
          {hint != null ? (
            <span className="text-[12px] tabular-nums text-muted-foreground">
              {hint}
            </span>
          ) : null}
          {action}
        </div>
      ) : null}
    </div>
  )
}

/**
 * Owns section rhythm so pages stop hand-rolling `space-y-*`: the header hugs
 * its content (8px) while `PageFrame` pushes sections far apart (40px). The
 * 5:1 ratio is what makes grouping unambiguous when scanning.
 */
export function Section({
  title,
  description,
  value,
  hint,
  tone,
  action,
  sticky,
  children,
  className,
}: {
  title?: string
  description?: React.ReactNode
  value?: React.ReactNode
  hint?: React.ReactNode
  tone?: Tone
  action?: React.ReactNode
  sticky?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('flex flex-col gap-2', className)}>
      {title ? (
        <SectionHeader
          title={title}
          description={description}
          value={value}
          hint={hint}
          tone={tone}
          action={action}
          sticky={sticky}
        />
      ) : null}
      {children}
    </section>
  )
}

/** Hairline list container — structure without card chrome. */
export function DataList({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <ul className={cn('data-list', className)}>{children}</ul>
}

/**
 * Quiet subhead inside a long list (dates, groups). Turns an undifferentiated
 * run of rows into scannable chunks and lets the grouped field drop out of
 * every row.
 */
export function RowGroupHeader({
  label,
  value,
  className,
}: {
  label: React.ReactNode
  value?: React.ReactNode
  className?: string
}) {
  return (
    <li className={cn('row-group-header', className)}>
      <span>{label}</span>
      {value != null ? (
        <span className="tabular-nums text-muted-foreground/80">{value}</span>
      ) : null}
    </li>
  )
}


export function DataRow({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  const interactive = Boolean(onClick)
  return (
    <li
      className={cn(
        'data-row',
        interactive &&
          'cursor-pointer transition-[background-color,transform] duration-[150ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-muted/35 active:scale-[0.995]',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </li>
  )
}

/** Primary line in a dense row (merchant, account name). */
export function RowTitle({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <p className={cn('truncate text-[13px] font-medium text-[var(--sea-ink)]', className)}>
      {children}
    </p>
  )
}

/** Secondary line in a dense row (date · category). */
export function RowMeta({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <p className={cn('truncate text-[12px] text-muted-foreground', className)}>
      {children}
    </p>
  )
}

/**
 * Compact metric for grids (card details). Smaller than `Stat` so a 3-up or
 * 6-up grid reads as one grouped block rather than competing figures.
 */
export function MiniStat({
  label,
  value,
  tone = 'default',
  className,
}: {
  label: string
  value: React.ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <Kicker>{label}</Kicker>
      <p
        className={cn(
          'text-[15px] font-semibold leading-none tracking-tight tabular-nums',
          toneClass(tone),
        )}
      >
        {value}
      </p>
    </div>
  )
}

/**
 * Hairline magnitude bar for a dense row. Scales against the largest row in the
 * list rather than the total, so relative size is legible at a glance and the
 * amount column stops being the only way to compare rows.
 */
export function ShareBar({
  value,
  total,
  color = 'var(--lagoon-deep)',
  className,
}: {
  value: number
  total: number
  color?: string
  className?: string
}) {
  const pct = total > 0 ? Math.min(1, Math.abs(value) / total) : 0
  return (
    <span
      className={cn('block h-1 overflow-hidden rounded-full bg-muted', className)}
      aria-hidden
    >
      <span
        className="block h-full rounded-full transition-[width] duration-[250ms] ease-[cubic-bezier(0.23,1,0.32,1)]"
        style={{
          width: pct > 0 ? `max(2px, ${pct * 100}%)` : 0,
          background: color,
        }}
      />
    </span>
  )
}

export function PageFrame({
  children,
  width = 'md',
  className,
}: {
  children: React.ReactNode
  width?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}) {
  return (
    <div
      className={cn(
        'mx-auto flex w-full flex-col gap-10',
        width === 'sm' && 'max-w-xl',
        width === 'md' && 'max-w-3xl',
        width === 'lg' && 'max-w-4xl',
        width === 'xl' && 'max-w-5xl',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-dashed border-border/80 px-6 py-12 text-center">
      <p className="display-title text-[1.5rem] leading-tight tracking-tight text-[var(--sea-ink)] text-balance">
        {title}
      </p>
      <p className="mx-auto mt-2 max-w-sm text-[13px] text-muted-foreground text-pretty">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export function CategoryDot({
  color,
  className,
}: {
  color: string
  className?: string
}) {
  return (
    <span
      className={cn('size-2 shrink-0 rounded-full', className)}
      style={{ background: color }}
      aria-hidden
    />
  )
}
