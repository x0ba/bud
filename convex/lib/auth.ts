import type { Doc } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'

type Ctx = QueryCtx | MutationCtx

export async function getIdentityOrThrow(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new Error('Not authenticated')
  }
  return identity
}

export async function getCurrentUserOrNull(
  ctx: Ctx,
): Promise<Doc<'users'> | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null

  return await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .unique()
}

export async function getCurrentUser(ctx: Ctx): Promise<Doc<'users'>> {
  const user = await getCurrentUserOrNull(ctx)
  if (!user) {
    throw new Error('User not found')
  }
  return user
}

export async function ensureUser(ctx: MutationCtx): Promise<Doc<'users'>> {
  const identity = await getIdentityOrThrow(ctx)
  const existing = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .unique()

  if (existing) {
    const name = identity.name ?? existing.name
    const email = identity.email ?? existing.email
    const imageUrl = identity.pictureUrl ?? existing.imageUrl
    if (
      name !== existing.name ||
      email !== existing.email ||
      imageUrl !== existing.imageUrl
    ) {
      await ctx.db.patch(existing._id, { name, email, imageUrl })
      return { ...existing, name, email, imageUrl }
    }
    return existing
  }

  const userId = await ctx.db.insert('users', {
    clerkId: identity.subject,
    name: identity.name ?? 'User',
    email: identity.email ?? '',
    imageUrl: identity.pictureUrl,
    categoriesSeeded: false,
  })

  const user = await ctx.db.get(userId)
  if (!user) throw new Error('Failed to create user')
  return user
}
