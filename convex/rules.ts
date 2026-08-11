import { v } from 'convex/values'
import { authedMutation, authedQuery } from './lib/customFunctions'

const matcher = v.object({
  merchantName: v.optional(v.string()),
  descriptionContains: v.optional(v.string()),
  plaidCategory: v.optional(v.string()),
  accountId: v.optional(v.id('accounts')),
  amountMin: v.optional(v.number()),
  amountMax: v.optional(v.number()),
})

export const list = authedQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('categoryRules'),
      matcher,
      categoryId: v.id('categories'),
      categoryName: v.optional(v.string()),
      merchantRename: v.optional(v.string()),
      priority: v.number(),
      createdFrom: v.union(v.literal('correction'), v.literal('manual')),
      timesApplied: v.number(),
      isActive: v.boolean(),
    }),
  ),
  handler: async (ctx) => {
    const rules = await ctx.db
      .query('categoryRules')
      .withIndex('by_user', (q) => q.eq('userId', ctx.user._id))
      .collect()
    const categories = await ctx.db
      .query('categories')
      .withIndex('by_user', (q) => q.eq('userId', ctx.user._id))
      .collect()
    const map = new Map(categories.map((c) => [c._id, c.name]))
    return rules
      .sort((a, b) => b.priority - a.priority)
      .map((r) => ({
        _id: r._id,
        matcher: r.matcher,
        categoryId: r.categoryId,
        categoryName: map.get(r.categoryId),
        merchantRename: r.merchantRename,
        priority: r.priority,
        createdFrom: r.createdFrom,
        timesApplied: r.timesApplied,
        isActive: r.isActive,
      }))
  },
})

export const create = authedMutation({
  args: {
    matcher,
    categoryId: v.id('categories'),
    merchantRename: v.optional(v.string()),
    priority: v.optional(v.number()),
  },
  returns: v.id('categoryRules'),
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId)
    if (!category || category.userId !== ctx.user._id)
      throw new Error('Category not found')
    return await ctx.db.insert('categoryRules', {
      userId: ctx.user._id,
      matcher: args.matcher,
      categoryId: args.categoryId,
      merchantRename: args.merchantRename,
      priority: args.priority ?? 0,
      createdFrom: 'manual',
      timesApplied: 0,
      isActive: true,
    })
  },
})

export const remove = authedMutation({
  args: { ruleId: v.id('categoryRules') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const rule = await ctx.db.get(args.ruleId)
    if (!rule || rule.userId !== ctx.user._id) throw new Error('Not found')
    await ctx.db.delete(args.ruleId)
    return null
  },
})

export const setActive = authedMutation({
  args: { ruleId: v.id('categoryRules'), isActive: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const rule = await ctx.db.get(args.ruleId)
    if (!rule || rule.userId !== ctx.user._id) throw new Error('Not found')
    await ctx.db.patch(args.ruleId, { isActive: args.isActive })
    return null
  },
})
