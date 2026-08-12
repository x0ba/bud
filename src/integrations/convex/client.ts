import { ConvexReactClient } from 'convex/react'

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string | undefined
if (!CONVEX_URL) {
  console.error('missing envar VITE_CONVEX_URL')
}

export const convex = new ConvexReactClient(CONVEX_URL ?? '')
