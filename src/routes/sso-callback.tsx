import { AuthenticateWithRedirectCallback } from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'

import '#/components/auth/auth.css'

export const Route = createFileRoute('/sso-callback')({
  head: () => ({
    meta: [{ title: 'Signing in — Bud' }],
  }),
  component: SSOCallbackPage,
})

function SSOCallbackPage() {
  return (
    <main className="auth" aria-busy="true" aria-live="polite">
      <p className="sr-only">Finishing sign-in</p>
      <AuthenticateWithRedirectCallback
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
        signInFallbackRedirectUrl="/app"
        signUpFallbackRedirectUrl="/app"
      />
    </main>
  )
}
