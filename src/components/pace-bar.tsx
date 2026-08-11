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
    <div className="space-y-2">
      {label ? (
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
          <p className="text-[12px] tabular-nums text-muted-foreground">
            {Math.round(pacePct * 100)}% through month
          </p>
        </div>
      ) : null}
      <div className="relative h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full transition-[width] duration-300',
            over
              ? 'bg-destructive/80'
              : aheadOfPace
                ? 'bg-amber-500/80'
                : 'bg-[var(--lagoon-deep)]',
          )}
          style={{ width: `${Math.min(100, spentPct * 100)}%` }}
        />
        <div
          className="absolute top-0 bottom-0 w-px bg-[var(--sea-ink)]/35"
          style={{ left: `${Math.min(100, pacePct * 100)}%` }}
          title="Today"
        />
      </div>
    </div>
  )
}
