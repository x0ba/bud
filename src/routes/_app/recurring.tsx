import { createFileRoute } from '@tanstack/react-router'
import { EmptyState } from '#/components/dense'
import { Page } from '#/components/panel'
import { AppShell } from '#/components/layout/app-shell'

export const Route = createFileRoute('/_app/recurring')({
  component: RecurringPage,
})

function RecurringPage() {
  return (
    <AppShell title="Recurring">
      <Page>
        <EmptyState
          title="Subscriptions & bills"
          description="Recurring stream detection lands next — once you have a few months of transactions, Bud will surface subscriptions, cadence, and price changes here."
        />
      </Page>
    </AppShell>
  )
}
