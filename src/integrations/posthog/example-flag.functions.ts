import { auth } from '@clerk/tanstack-react-start/server'
import * as Sentry from '@sentry/tanstackstart-react'
import { createServerFn } from '@tanstack/react-start'
import { EXAMPLE_FUTURE_FLAG } from './flags'
import { isFeatureFlagEnabled } from './server'

export const getExampleFutureFlag = createServerFn({ method: 'GET' }).handler(
  async () =>
    Sentry.startSpan({ name: 'Evaluating example-future-flag' }, async () => {
      const session = await auth()
      if (!session.isAuthenticated || !session.userId) {
        return { enabled: false }
      }

      const enabled = await isFeatureFlagEnabled(
        EXAMPLE_FUTURE_FLAG,
        session.userId,
      )
      return { enabled }
    }),
)
