import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { auth } from '@clerk/tanstack-react-start/server'
import { EnsureUser } from '#/components/ensure-user'

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
      <Outlet />
    </EnsureUser>
  )
}
