import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { auth } from '@clerk/tanstack-react-start/server'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { EnsureUser } from '#/components/ensure-user'
import { AppFrame } from '#/components/layout/app-shell'
import { currentMonth } from '#/lib/money'

const requireAuth = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await auth()
  if (!session.isAuthenticated) {
    throw redirect({ to: '/sign-in' })
  }
  return { userId: session.userId }
})

export const Route = createFileRoute('/_app')({
  beforeLoad: async () => {
    // The server round trip is only needed to gate the initial SSR request.
    // Client-side navigations and preloads check Clerk's local session state;
    // Convex independently enforces auth on every query.
    if (typeof window === 'undefined') {
      await requireAuth()
      return
    }
    const clerk = (window as { Clerk?: { loaded: boolean; session: unknown } })
      .Clerk
    if (clerk?.loaded && !clerk.session) {
      throw redirect({ to: '/sign-in' })
    }
  },
  component: AppLayout,
})

function AppLayout() {
  return (
    <EnsureUser>
      <WarmRouteData />
      <AppFrame>
        <Outlet />
      </AppFrame>
    </EnsureUser>
  )
}

/**
 * Live subscriptions for every sidebar route's queries, held for the whole
 * session so any sidebar click renders with data already in the Convex
 * client. Args must match the page's useQuery call exactly; a different
 * args object is a different cache entry.
 */
function WarmRouteData() {
  const month = currentMonth()
  useQuery(api.dashboard.overview)
  useQuery(api.budgets.getMonth, {})
  useQuery(api.budgets.getMonth, { month })
  useQuery(api.transactions.flowSummary, { month })
  useQuery(api.transactions.spendingByCategory, { month })
  useQuery(api.accounts.list)
  useQuery(api.accounts.listItems)
  useQuery(api.categories.list)
  useQuery(api.netWorth.summary)
  useQuery(api.netWorth.history, { range: '3M' })
  useQuery(api.investments.portfolio)
  useQuery(api.rules.list)
  return null
}
