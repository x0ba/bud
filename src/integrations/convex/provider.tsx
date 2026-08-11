import { useAuth } from '@clerk/tanstack-react-start'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { ConvexReactClient } from 'convex/react'

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string | undefined
if (!CONVEX_URL) {
  console.error('missing envar VITE_CONVEX_URL')
}

const convex = new ConvexReactClient(CONVEX_URL ?? '')

export default function AppConvexProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  )
}
