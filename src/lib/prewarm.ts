import type { FunctionReference } from 'convex/server'
import { convex } from '#/integrations/convex/client'

/** Keep prewarmed subscriptions alive long enough to cover hover → click. */
const EXTEND_MS = 30_000

type PrewarmEntry<T extends FunctionReference<'query'>> = {
  query: T
  args?: T['_args']
}

/** Start Convex subscriptions for a route's queries (runs on Link hover preload). */
export function prewarmQueries(
  ...entries: Array<PrewarmEntry<FunctionReference<'query'>>>
): void {
  if (typeof window === 'undefined') return

  for (const entry of entries) {
    convex.prewarmQuery({
      query: entry.query,
      args: entry.args ?? {},
      extendSubscriptionFor: EXTEND_MS,
    })
  }
}
