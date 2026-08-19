import { useFeatureFlagEnabled } from '@posthog/react'
import { useEffect, useState } from 'react'
import { Badge } from '#/components/ui/badge'
import { isPostHogConfigured } from './env'
import { getExampleFutureFlag } from './example-flag.functions'
import { EXAMPLE_FUTURE_FLAG } from './flags'

function FeatureFlagDemoView({
  clientEnabled,
  serverEnabled,
}: {
  clientEnabled: boolean
  serverEnabled: boolean | null
}) {
  const on = clientEnabled
  const serverLabel =
    serverEnabled === null ? '…' : serverEnabled ? 'ON' : 'OFF'

  return (
    <aside
      aria-label="Feature flag demo"
      className="mt-6 rounded-md border border-dashed border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-2 text-[12px] text-[var(--sea-ink-soft)]"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">Feature flag demo</Badge>
        <span>
          <code className="text-[11px]">{EXAMPLE_FUTURE_FLAG}</code>
          {' is '}
          <strong className="text-[var(--sea-ink)]">{on ? 'ON' : 'OFF'}</strong>
          <span className="text-muted-foreground">
            {' '}
            (client {on ? 'ON' : 'OFF'} · server {serverLabel})
          </span>
        </span>
      </div>
      {on ? (
        <p className="mt-1.5 text-[var(--sea-ink)]">
          Flag demo: {EXAMPLE_FUTURE_FLAG} is on
        </p>
      ) : null}
    </aside>
  )
}

function FeatureFlagDemoLive() {
  const clientEnabled = useFeatureFlagEnabled(EXAMPLE_FUTURE_FLAG, false)
  const [serverEnabled, setServerEnabled] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    void getExampleFutureFlag()
      .then((result) => {
        if (!cancelled) setServerEnabled(result.enabled)
      })
      .catch(() => {
        if (!cancelled) setServerEnabled(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <FeatureFlagDemoView
      clientEnabled={clientEnabled}
      serverEnabled={serverEnabled}
    />
  )
}

export function FeatureFlagDemo() {
  if (!isPostHogConfigured()) {
    return <FeatureFlagDemoView clientEnabled={false} serverEnabled={false} />
  }

  return <FeatureFlagDemoLive />
}
