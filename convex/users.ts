import { v } from 'convex/values'
import { authedMutation, authedQuery } from './lib/customFunctions'
import { seedCategoriesForUser } from './lib/categories'

export const me = authedQuery({
  args: {},
  returns: v.object({
    _id: v.id('users'),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
    categoriesSeeded: v.boolean(),
  }),
  handler: async (ctx) => {
    return {
      _id: ctx.user._id,
      name: ctx.user.name,
      email: ctx.user.email,
      imageUrl: ctx.user.imageUrl,
      categoriesSeeded: ctx.user.categoriesSeeded,
    }
  },
})

export const ensureReady = authedMutation({
  args: {},
  returns: v.id('users'),
  handler: async (ctx) => {
    if (!ctx.user.categoriesSeeded) {
      await seedCategoriesForUser(ctx, ctx.user._id)
      await ctx.db.patch(ctx.user._id, { categoriesSeeded: true })
    }
    return ctx.user._id
  },
})
