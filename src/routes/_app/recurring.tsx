import { createFileRoute } from '@tanstack/react-router'
import { EmptyState, PageFrame } from '#/components/dense'
import { AppShell } from '#/components/layout/app-shell'

export const Route = createFileRoute('/_app/recurring')({
  component: RecurringPage,
})

function RecurringPage() {
  return (
    <AppShell title="Recurring">
      <PageFrame width="sm">
        <EmptyState
          title="Subscriptions & bills"
          description="Recurring stream detection lands next — once you have a few months of transactions, Bud will surface subscriptions, cadence, and price changes here."
        />
      </PageFrame>
    </AppShell>
  )
}
