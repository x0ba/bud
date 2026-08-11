import { cn } from '#/lib/utils'

/**
 * Signature element: the month as one whole. Income is the track, spending and
 * what's left are its two segments — so the answer ("did I keep anything?") is
 * visible before any figure is read.
 */
export function FlowBar({
  income,
  spent,
  className,
}: {
  income: number
  spent: number
  className?: string
}) {
  const over = spent > income
  const outPct =
    income > 0 ? Math.min(100, (spent / income) * 100) : spent > 0 ? 100 : 0
  const keptPct = Math.max(0, 100 - outPct)

  return (
    <div className={cn('space-y-2', className)}>
      <div
        className="flex h-2 gap-px overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={
          over
            ? 'Spending exceeded income this month'
            : `${Math.round(outPct)}% of income spent`
        }
      >
        <span
          className={cn(
            'h-full transition-[flex-basis] duration-[250ms] ease-[cubic-bezier(0.23,1,0.32,1)]',
            over ? 'bg-destructive/75' : 'bg-[var(--lagoon-deep)]',
          )}
          style={{ flexBasis: `${outPct}%` }}
        />
        {keptPct > 0 ? (
          <span
            className="h-full bg-[var(--palm)]/70 transition-[flex-basis] duration-[250ms] ease-[cubic-bezier(0.23,1,0.32,1)]"
            style={{ flexBasis: `${keptPct}%` }}
          />
        ) : null}
      </div>
      <div className="flex items-center gap-4">
        <Legend
          color={over ? 'bg-destructive/75' : 'bg-[var(--lagoon-deep)]'}
          label="Spent"
        />
        {over ? (
          <span className="text-[11px] font-medium text-destructive">
            Over income
          </span>
        ) : (
          <Legend color="bg-[var(--palm)]/70" label="Kept" />
        )}
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
      <span className={cn('size-1.5 rounded-full', color)} aria-hidden />
      {label}
    </span>
  )
}
