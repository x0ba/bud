import { useConvexAuth, useMutation } from 'convex/react'
import { useEffect, useState } from 'react'
import { api } from '../../convex/_generated/api'
import { Skeleton } from '#/components/ui/skeleton'

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
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-64 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-3/4" />
        </div>
      </div>
    )
  }

  return <>{children}</>
}
