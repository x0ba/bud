import { createCsrfMiddleware, createStart } from '@tanstack/react-start'
import {
  sentryGlobalFunctionMiddleware,
  sentryGlobalRequestMiddleware,
} from '@sentry/tanstackstart-react'

import { clerkMiddleware } from '@clerk/tanstack-react-start/server'

const csrfMiddleware = createCsrfMiddleware({
  filter: (context) => context.handlerType === 'serverFn',
})

export const startInstance = createStart(() => ({
  requestMiddleware: [
    sentryGlobalRequestMiddleware,
    csrfMiddleware,
    clerkMiddleware(),
  ],
  functionMiddleware: [sentryGlobalFunctionMiddleware],
}))
