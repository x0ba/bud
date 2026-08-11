import { cn } from '#/lib/utils'

/** Signature element: spent vs month progress. */
export function PaceBar({
  spent,
  budget,
  pacePct,
  label,
}: {
  spent: number
  budget: number
  pacePct: number
  label?: string
}) {
  const spentPct = budget > 0 ? Math.min(1.2, spent / budget) : 0
  const over = budget > 0 && spent > budget
  const aheadOfPace = budget > 0 && spent / budget > pacePct + 0.08

  return (
    <div className="space-y-1.5">
      {label ? (
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[12px] font-medium text-[var(--sea-ink-soft)]">
            {label}
          </p>
          <p className="text-[11px] font-medium tabular-nums text-muted-foreground">
            {Math.round(pacePct * 100)}% through month
          </p>
        </div>
      ) : null}
      <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full transition-[width] duration-[250ms] ease-[cubic-bezier(0.23,1,0.32,1)]',
            over
              ? 'bg-destructive/80'
              : aheadOfPace
                ? 'bg-amber-500/85'
                : 'bg-[var(--lagoon-deep)]',
          )}
          style={{ width: `${Math.min(100, spentPct * 100)}%` }}
        />
        <div
          className="absolute top-0 bottom-0 w-px bg-[var(--sea-ink)]/40"
          style={{ left: `${Math.min(100, pacePct * 100)}%` }}
          title="Today"
        />
      </div>
    </div>
  )
}
