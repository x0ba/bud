import { useConvexAuth, useMutation } from 'convex/react'
import { useEffect, useState } from 'react'
import { api } from '../../convex/_generated/api'

export function EnsureUser({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const ensureReady = useMutation(api.users.ensureReady)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      setReady(false)
      return
    }
    let cancelled = false
    void ensureReady({})
      .then(() => {
        if (!cancelled) setReady(true)
      })
      .catch(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, ensureReady])

  if (isLoading || (isAuthenticated && !ready)) {
    return <div className="min-h-screen bg-background" />
  }

  return <>{children}</>
}
