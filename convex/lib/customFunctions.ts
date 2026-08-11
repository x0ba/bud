import {
  customAction,
  customMutation,
  customQuery,
} from 'convex-helpers/server/customFunctions'
import { action, mutation, query } from '../_generated/server'
import { ensureUser, getCurrentUser } from './auth'

export const authedQuery = customQuery(query, {
  args: {},
  input: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    return { ctx: { ...ctx, user }, args }
  },
})

export const authedMutation = customMutation(mutation, {
  args: {},
  input: async (ctx, args) => {
    const user = await ensureUser(ctx)
    return { ctx: { ...ctx, user }, args }
  },
})

export const authedAction = customAction(action, {
  args: {},
  input: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    return {
      ctx: { ...ctx, clerkId: identity.subject },
      args,
    }
  },
})
