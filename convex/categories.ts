import { v } from 'convex/values'
import { authedMutation, authedQuery } from './lib/customFunctions'

const budgetType = v.union(
  v.literal('fixed'),
  v.literal('flex'),
  v.literal('non_monthly'),
  v.literal('income'),
  v.literal('transfer'),
)

const categoryDoc = v.object({
  _id: v.id('categories'),
  name: v.string(),
  icon: v.string(),
  color: v.string(),
  parentId: v.optional(v.id('categories')),
  isSystem: v.boolean(),
  budgetType,
  excludeFromBudget: v.boolean(),
  sortOrder: v.number(),
})

export const list = authedQuery({
  args: {},
  returns: v.array(categoryDoc),
  handler: async (ctx) => {
    const cats = await ctx.db
      .query('categories')
      .withIndex('by_user', (q) => q.eq('userId', ctx.user._id))
      .collect()
    return cats
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => ({
        _id: c._id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        parentId: c.parentId,
        isSystem: c.isSystem,
        budgetType: c.budgetType,
        excludeFromBudget: c.excludeFromBudget,
        sortOrder: c.sortOrder,
      }))
  },
})

export const create = authedMutation({
  args: {
    name: v.string(),
    icon: v.string(),
    color: v.string(),
    parentId: v.optional(v.id('categories')),
    budgetType,
  },
  returns: v.id('categories'),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('categories')
      .withIndex('by_user', (q) => q.eq('userId', ctx.user._id))
      .collect()
    return await ctx.db.insert('categories', {
      userId: ctx.user._id,
      name: args.name,
      icon: args.icon,
      color: args.color,
      parentId: args.parentId,
      isSystem: false,
      budgetType: args.budgetType,
      excludeFromBudget:
        args.budgetType === 'income' || args.budgetType === 'transfer',
      sortOrder: existing.length,
    })
  },
})

export const update = authedMutation({
  args: {
    categoryId: v.id('categories'),
    name: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    budgetType: v.optional(budgetType),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const cat = await ctx.db.get(args.categoryId)
    if (!cat || cat.userId !== ctx.user._id) throw new Error('Not found')
    await ctx.db.patch(args.categoryId, {
      ...(args.name != null ? { name: args.name } : {}),
      ...(args.icon != null ? { icon: args.icon } : {}),
      ...(args.color != null ? { color: args.color } : {}),
      ...(args.budgetType != null
        ? {
            budgetType: args.budgetType,
            excludeFromBudget:
              args.budgetType === 'income' || args.budgetType === 'transfer',
          }
        : {}),
    })
    return null
  },
})
