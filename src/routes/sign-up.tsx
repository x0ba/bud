import { auth } from '@clerk/tanstack-react-start/server'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as Sentry from '@sentry/tanstackstart-react'

import { AuthScreen } from '#/components/auth/screen'

const hasSession = createServerFn({ method: 'GET' }).handler(async () =>
  Sentry.startSpan({ name: 'Sign-up session check' }, async () => {
    const session = await auth()
    return { isAuthenticated: session.isAuthenticated }
  }),
)

export const Route = createFileRoute('/sign-up')({
  beforeLoad: async () => {
    if (typeof window === 'undefined') {
      const { isAuthenticated } = await hasSession()
      if (isAuthenticated) throw redirect({ to: '/app' })
      return
    }

    const clerk = (window as { Clerk?: { loaded: boolean; session: unknown } })
      .Clerk
    if (clerk?.loaded && clerk.session) throw redirect({ to: '/app' })
  },
  head: () => ({
    meta: [{ title: 'Sign up — Bud' }],
  }),
  component: SignUpPage,
})

function SignUpPage() {
  return <AuthScreen action="sign-up" />
}
