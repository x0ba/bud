import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { auth } from '@clerk/tanstack-react-start/server'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { EnsureUser } from '#/components/ensure-user'
import { currentMonth } from '#/lib/money'

const requireAuth = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await auth()
  if (!session.isAuthenticated) {
    throw redirect({ to: '/sign-in' })
  }
  return { userId: session.userId }
})

export const Route = createFileRoute('/_app')({
  beforeLoad: async () => await requireAuth(),
  component: AppLayout,
})

function AppLayout() {
  return (
    <EnsureUser>
      <CurrentMonthFlowSummarySubscription />
      <Outlet />
    </EnsureUser>
  )
}

function CurrentMonthFlowSummarySubscription() {
  useQuery(api.transactions.flowSummary, { month: currentMonth() })
  return null
}
