import { useSignIn } from '@clerk/tanstack-react-start'
import { useState } from 'react'

import './auth.css'

export function AuthScreen({ action }: { action: 'sign-in' | 'sign-up' }) {
  const { signIn, fetchStatus } = useSignIn()
  const [error, setError] = useState<string | null>(null)
  const pending = fetchStatus === 'fetching'

  async function handleGoogle() {
    setError(null)

    const { error: ssoError } = await signIn.sso({
      strategy: 'oauth_google',
      redirectUrl: `${window.location.origin}/app`,
      redirectCallbackUrl: `${window.location.origin}/sso-callback`,
    })

    if (ssoError) {
      setError(ssoError.longMessage ?? ssoError.message)
    }
  }

  const label = action === 'sign-up' ? 'Sign up with Google' : 'Sign in with Google'

  return (
    <main className="auth">
      <div className="auth-brand">
        <h1 className="auth-wordmark">Bud</h1>
        <svg className="auth-mark" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 21.5V11"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            className="auth-mark-leaf"
            d="M12 12.5C12 7.9 8.9 4.6 4.2 4c-.4 4.8 2.6 8.5 7.8 8.5z"
          />
          <path
            d="M12 15c0-4.1 2.8-7.1 7-7.6.4 4.3-2.4 7.6-7 7.6z"
            fill="currentColor"
            opacity="0.88"
          />
        </svg>
      </div>
      <p className="sr-only">
        {action === 'sign-up' ? 'Create your Bud account' : 'Sign in to Bud'}
      </p>

      <div className="auth-action">
        {error ? <p className="auth-error">{error}</p> : null}
        <button
          type="button"
          className="auth-google"
          onClick={() => void handleGoogle()}
          disabled={pending || !signIn}
        >
          <GoogleMark />
          {pending ? 'Redirecting…' : label}
        </button>
      </div>
    </main>
  )
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.55-5.17 3.55-8.65Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.47 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.27A12 12 0 0 0 0 12c0 1.94.46 3.78 1.27 5.39l4-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.6 4.59 1.8l3.44-3.44C17.95 1.19 15.23 0 12 0 7.31 0 3.26 2.69 1.27 6.61l4 3.11C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  )
}
