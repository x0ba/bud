import { useUser } from '@clerk/tanstack-react-start'
import { PostHogProvider, usePostHog } from '@posthog/react'
import { useEffect } from 'react'
import {
  getPostHogHost,
  getPostHogProjectToken,
  isPostHogConfigured,
} from './env'

const posthogOptions = {
  api_host: getPostHogHost(),
  defaults: '2026-05-30',
  capture_exceptions: true,
} as const

function PostHogIdentify() {
  const posthog = usePostHog()
  const { user, isSignedIn } = useUser()
  const userId = user?.id
  const email = user?.primaryEmailAddress?.emailAddress

  useEffect(() => {
    if (!posthog) {
      return
    }

    if (isSignedIn && userId) {
      posthog.identify(userId, email ? { email } : undefined)
      return
    }

    if (isSignedIn === false) {
      posthog.reset()
    }
  }, [email, isSignedIn, posthog, userId])

  return null
}

export default function AppPostHogProvider({
  children,
}: {
  children: React.ReactNode
}) {
  if (!isPostHogConfigured()) {
    return children
  }

  return (
    <PostHogProvider apiKey={getPostHogProjectToken()} options={posthogOptions}>
      <PostHogIdentify />
      {children}
    </PostHogProvider>
  )
}
