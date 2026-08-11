import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from '#/components/layout/app-shell'

export const Route = createFileRoute('/_app/recurring')({
  component: RecurringPage,
})

function RecurringPage() {
  return (
    <AppShell title="Recurring">
      <div className="mx-auto max-w-xl rounded-lg border border-dashed border-border px-6 py-12 text-center">
        <p className="display-title text-2xl text-[var(--sea-ink)]">
          Subscriptions & bills
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Recurring stream detection lands next — once you have a few months of
          transactions, Bud will surface subscriptions, cadence, and price
          changes here.
        </p>
      </div>
    </AppShell>
  )
}
