import { auth } from '@clerk/tanstack-react-start/server'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as Sentry from '@sentry/tanstackstart-react'

import { ChipsLanding } from '#/components/landing/chips'
import { FlowLanding } from '#/components/landing/flow'
import { LedgerLanding } from '#/components/landing/ledger'
import { SpotlightLanding } from '#/components/landing/spotlight'
import { DESIGNS, DesignSwitcher } from '#/components/landing/switcher'
import type { DesignId } from '#/components/landing/switcher'

import landingCss from '#/components/landing/landing.css?url'

const FONTS =
  'https://fonts.googleapis.com/css2?family=Anton&family=Instrument+Sans:wght@400;500;600&family=Inter:wght@400;500;600&family=Inter+Tight:wght@600;700&family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@400;500;700&display=swap'

const designs = {
  1: LedgerLanding,
  2: ChipsLanding,
  3: SpotlightLanding,
  4: FlowLanding,
} satisfies Record<DesignId, () => React.JSX.Element>

const hasSession = createServerFn({ method: 'GET' }).handler(async () =>
  Sentry.startSpan({ name: 'Landing page session check' }, async () => {
    const session = await auth()
    return { isAuthenticated: session.isAuthenticated }
  }),
)

export const Route = createFileRoute('/')({
  // The key has to be returned even when it is invalid: search the route does
  // not claim is inherited from the parent match unvalidated.
  validateSearch: (
    search: Record<string, unknown>,
  ): { d: DesignId | undefined } => {
    const match = DESIGNS.find((design) => design.id === Number(search.d))
    return { d: match?.id }
  },
  beforeLoad: async ({ search }) => {
    // A signed-in visitor wants the app, not the pitch. The one exception is an
    // explicit ?d= — that is how the designs stay reviewable while signed in.
    if (search.d) return

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
  component: LandingPage,
})

function LandingPage() {
  const { d } = Route.useSearch()
  const active: DesignId = d ?? 1
  const Design = designs[active]

  return (
    <>
      <Design />
      <DesignSwitcher active={active} />
    </>
  )
}
