import { cn } from '#/lib/utils'

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
  className,
}: {
  label: string
  value: React.ReactNode
  meta?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <Kicker>{label}</Kicker>
      <p className="hero-figure">{value}</p>
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
  className,
}: {
  label: string
  value: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <Kicker>{label}</Kicker>
      <p className="text-[22px] font-semibold leading-none tracking-tight tabular-nums text-[var(--sea-ink)]">
        {value}
      </p>
    </div>
  )
}

export function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'mb-2 flex items-baseline justify-between gap-3',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-[13px] font-semibold tracking-tight text-[var(--sea-ink)] text-balance">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-[13px] text-muted-foreground text-pretty">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
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
        'mx-auto flex w-full flex-col gap-8',
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
