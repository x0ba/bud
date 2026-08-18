import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Id } from '../../convex/_generated/dataModel'
import type { MutationCtx } from '../../convex/_generated/server'
import {
  isExcludedAccount,
  PURGE_BATCH,
  purgeAccountChildren,
  withExcludedAccount,
} from '../../convex/lib/purge.ts'

const accountId = 'accounts:checking' as Id<'accounts'>
const userId = 'users:pat' as Id<'users'>

function docs(prefix: string, count: number) {
  return Array.from({ length: count }, (_, i) => ({ _id: `${prefix}:${i}` }))
}

function mockCtx(tables: {
  transactions?: Array<{ _id: string }>
  holdings?: Array<{ _id: string }>
  investmentTxns?: Array<{ _id: string }>
  categoryRules?: Array<{
    _id: string
    matcher: { accountId?: Id<'accounts'> }
  }>
  account?: { _id: Id<'accounts'> } | null
}) {
  const deleted: Array<string> = []
  const data = {
    transactions: tables.transactions ?? [],
    holdings: tables.holdings ?? [],
    investmentTxns: tables.investmentTxns ?? [],
    categoryRules: tables.categoryRules ?? [],
  }

  const ctx = {
    db: {
      query(table: keyof typeof data) {
        const rows = data[table]
        return {
          withIndex() {
            return {
              take: async (n: number) => rows.slice(0, n),
              collect: async () => rows,
            }
          },
        }
      },
      async delete(id: string) {
        deleted.push(id)
      },
      async get(id: string) {
        return tables.account && tables.account._id === id
          ? tables.account
          : null
      },
    },
  } as unknown as MutationCtx

  return { ctx, deleted }
}

describe('excluded Plaid accounts', () => {
  it('adds an id without duplicating it', () => {
    const once = withExcludedAccount(undefined, 'acc_1')
    const twice = withExcludedAccount(once, 'acc_1')
    assert.deepEqual(once, ['acc_1'])
    assert.deepEqual(twice, ['acc_1'])
    assert.equal(isExcludedAccount(twice, 'acc_1'), true)
    assert.equal(isExcludedAccount(twice, 'acc_2'), false)
    assert.equal(isExcludedAccount(undefined, 'acc_1'), false)
  })
})

describe('purgeAccountChildren', () => {
  it('stops after a full transaction batch so the caller can reschedule', async () => {
    const { ctx, deleted } = mockCtx({
      transactions: docs('tx', PURGE_BATCH),
      account: { _id: accountId },
    })

    const done = await purgeAccountChildren(ctx, { accountId, userId })

    assert.equal(done, false)
    assert.equal(deleted.length, PURGE_BATCH)
    assert.equal(deleted.includes(accountId), false)
  })

  it('deletes holdings, investment activity, matching rules, and the account', async () => {
    const { ctx, deleted } = mockCtx({
      transactions: docs('tx', 2),
      holdings: docs('hold', 1),
      investmentTxns: docs('inv', 1),
      categoryRules: [
        { _id: 'rule:keep', matcher: {} },
        { _id: 'rule:drop', matcher: { accountId } },
      ],
      account: { _id: accountId },
    })

    const done = await purgeAccountChildren(ctx, { accountId, userId })

    assert.equal(done, true)
    assert.deepEqual(deleted, [
      'tx:0',
      'tx:1',
      'hold:0',
      'inv:0',
      'rule:drop',
      accountId,
    ])
  })
})
