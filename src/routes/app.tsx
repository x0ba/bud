import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { auth } from '@clerk/tanstack-react-start/server'
import { EnsureUser } from '#/components/ensure-user'
import { AppFrame } from '#/components/layout/app-shell'

const requireAuth = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await auth()
  if (!session.isAuthenticated) {
    throw redirect({ to: '/sign-in' })
  }
  return { userId: session.userId }
})

export const Route = createFileRoute('/app')({
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
      <AppFrame>
        <Outlet />
      </AppFrame>
    </EnsureUser>
  )
}
