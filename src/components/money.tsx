import { cn } from '#/lib/utils'
import { formatUsdPlain } from '#/lib/money'

/** Display a Plaid-signed amount (positive = out). */
export function Money({
  amount,
  plaid = false,
  className,
}: {
  amount: number
  plaid?: boolean
  className?: string
}) {
  const display = plaid ? -amount : amount
  const isOut = display < 0
  const isIn = display > 0

  return (
    <span
      className={cn(
        'font-medium tabular-nums tracking-tight',
        isOut && 'text-[var(--sea-ink)]',
        isIn && 'text-[var(--palm)]',
        className,
      )}
    >
      {isIn ? '+' : isOut ? '−' : ''}
      {formatUsdPlain(Math.abs(display))}
    </span>
  )
}
