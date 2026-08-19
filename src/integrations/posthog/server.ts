import { PostHog } from 'posthog-node'
import { getPostHogHost, getPostHogProjectToken } from './env'
import { evaluateBooleanFlag } from './flags'
import type { FeatureFlagKey } from './flags'

let posthogClient: PostHog | null | undefined

export function getPostHogClient(): PostHog | null {
  if (posthogClient !== undefined) {
    return posthogClient
  }

  const token = getPostHogProjectToken()
  if (!token) {
    posthogClient = null
    return posthogClient
  }

  posthogClient = new PostHog(token, {
    host: getPostHogHost(),
    flushAt: 1,
    flushInterval: 0,
  })
  return posthogClient
}

export async function isFeatureFlagEnabled(
  key: FeatureFlagKey,
  distinctId: string,
): Promise<boolean> {
  return evaluateBooleanFlag(getPostHogClient(), key, distinctId)
}
