import { auth } from '@clerk/tanstack-react-start/server'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as Sentry from '@sentry/tanstackstart-react'

import { Landing } from '#/components/landing/page'

import landingCss from '#/components/landing/landing.css?url'

const FONTS =
  'https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap'

const hasSession = createServerFn({ method: 'GET' }).handler(async () =>
  Sentry.startSpan({ name: 'Landing page session check' }, async () => {
    const session = await auth()
    return { isAuthenticated: session.isAuthenticated }
  }),
)

export const Route = createFileRoute('/')({
  // A signed-in visitor wants the app, not the pitch.
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
    meta: [
      { title: 'Bud — Where does your money go?' },
      {
        name: 'description',
        content:
          'Bud connects your banks, cards, and brokerages through Plaid, then keeps the month in order: one number for everyday spending, cards counted once, net worth updated daily.',
      },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      { rel: 'stylesheet', href: FONTS },
      { rel: 'stylesheet', href: landingCss },
    ],
  }),
  component: Landing,
})
