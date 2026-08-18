import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isExcludedAccount, withExcludedAccount } from '../../convex/lib/purge'
import { accountRemovalCopy, institutionRemovalCopy } from './account-removal'

describe('accountRemovalCopy', () => {
  it('warns that the last account also disconnects the institution', () => {
    const copy = accountRemovalCopy({
      accountName: 'Checking',
      institutionName: 'Chase',
      isLastAtInstitution: true,
    })
    assert.equal(copy.title, 'Remove Checking?')
    assert.match(copy.description, /last account at Chase/)
    assert.match(copy.description, /disconnects Chase/)
  })

  it('keeps the institution when other accounts remain', () => {
    const copy = accountRemovalCopy({
      accountName: 'Sapphire',
      institutionName: 'Chase',
      isLastAtInstitution: false,
    })
    assert.match(copy.description, /will not come back/)
    assert.match(copy.description, /Chase syncs/)
  })
})

describe('institutionRemovalCopy', () => {
  it('uses a singular account count', () => {
    const copy = institutionRemovalCopy({
      institutionName: 'Fidelity',
      accountCount: 1,
    })
    assert.equal(copy.title, 'Disconnect Fidelity?')
    assert.match(copy.description, /1 account/)
  })

  it('uses a plural account count', () => {
    const copy = institutionRemovalCopy({
      institutionName: 'Fidelity',
      accountCount: 3,
    })
    assert.match(copy.description, /3 accounts/)
  })
})

describe('excluded Plaid accounts', () => {
  it('adds an id without duplicating it', () => {
    const once = withExcludedAccount(undefined, 'acc_1')
    const twice = withExcludedAccount(once, 'acc_1')
    assert.deepEqual(once, ['acc_1'])
    assert.deepEqual(twice, ['acc_1'])
    assert.equal(isExcludedAccount(twice, 'acc_1'), true)
    assert.equal(isExcludedAccount(twice, 'acc_2'), false)
  })
})
