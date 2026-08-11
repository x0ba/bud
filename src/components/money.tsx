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
        'amount-cell',
        isOut && 'text-[var(--sea-ink)]',
        isIn && 'text-[var(--palm)]',
        !isOut && !isIn && 'text-muted-foreground',
        className,
      )}
    >
      {isIn ? '+' : isOut ? '−' : ''}
      {formatUsdPlain(Math.abs(display))}
    </span>
  )
}
