import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  accountRemovalCopy,
  institutionRemovalCopy,
  isLastAccountAtInstitution,
} from './account-removal.ts'

describe('isLastAccountAtInstitution', () => {
  it('treats an unknown count as not last so loading does not warn', () => {
    assert.equal(isLastAccountAtInstitution(undefined), false)
  })

  it('is last only when the known count is one or zero', () => {
    assert.equal(isLastAccountAtInstitution(0), true)
    assert.equal(isLastAccountAtInstitution(1), true)
    assert.equal(isLastAccountAtInstitution(2), false)
  })
})

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
