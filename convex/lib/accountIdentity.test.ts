import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  findDuplicateAccount,
  sameInstitution,
  type AccountIdentity,
} from './accountIdentity.ts'

function account(
  partial: Partial<AccountIdentity> &
    Pick<AccountIdentity, 'plaidAccountId' | 'name'>,
): AccountIdentity {
  return {
    type: 'investment',
    ...partial,
  }
}

describe('sameInstitution', () => {
  it('matches on institution id when both sides have one', () => {
    assert.equal(
      sameInstitution(
        { institutionId: 'ins_12', institutionName: 'Fidelity' },
        { institutionId: 'ins_12', institutionName: 'Fidelity Investments' },
      ),
      true,
    )
    assert.equal(
      sameInstitution(
        { institutionId: 'ins_12', institutionName: 'Fidelity' },
        { institutionId: 'ins_3', institutionName: 'Fidelity' },
      ),
      false,
    )
  })

  it('falls back to institution name when an id is missing', () => {
    assert.equal(
      sameInstitution(
        { institutionName: 'Fidelity' },
        { institutionId: 'ins_12', institutionName: 'fidelity' },
      ),
      true,
    )
  })
})

describe('findDuplicateAccount', () => {
  const brokerage = account({
    plaidAccountId: 'old-brokerage',
    name: 'Individual',
    officialName: 'INDIVIDUAL BROKERAGE',
    mask: '1234',
    type: 'investment',
    subtype: 'brokerage',
  })
  const roth = account({
    plaidAccountId: 'old-roth',
    name: 'Roth IRA',
    mask: '5678',
    type: 'investment',
    subtype: 'roth',
  })
  const existing = [brokerage, roth]

  it('matches the same Plaid account id', () => {
    assert.equal(
      findDuplicateAccount(
        account({ plaidAccountId: 'old-brokerage', name: 'Individual' }),
        existing,
      ),
      brokerage,
    )
  })

  it('treats a new Item account as the same brokerage', () => {
    const relinked = account({
      plaidAccountId: 'new-brokerage',
      name: 'Individual',
      officialName: 'Individual Brokerage',
      mask: '1234',
      type: 'investment',
      subtype: 'brokerage',
    })
    assert.equal(findDuplicateAccount(relinked, existing), brokerage)
  })

  it('does not collapse a new cash account into investments', () => {
    const cash = account({
      plaidAccountId: 'new-cash',
      name: 'Cash Management',
      mask: '9999',
      type: 'depository',
      subtype: 'checking',
    })
    assert.equal(findDuplicateAccount(cash, existing), undefined)
  })

  it('does not merge two same-type accounts that only share a mask', () => {
    const checkingA = account({
      plaidAccountId: 'chk-a',
      name: 'Checking',
      mask: '0000',
      type: 'depository',
      subtype: 'checking',
    })
    const checkingB = account({
      plaidAccountId: 'chk-b',
      name: 'Everyday Checking',
      mask: '0000',
      type: 'depository',
      subtype: 'checking',
    })
    const incoming = account({
      plaidAccountId: 'chk-new',
      name: 'Joint Checking',
      mask: '0000',
      type: 'depository',
      subtype: 'checking',
    })
    assert.equal(
      findDuplicateAccount(incoming, [checkingA, checkingB]),
      undefined,
    )
  })

  it('matches by mask when that pair is unique at the institution', () => {
    const incoming = account({
      plaidAccountId: 'new-roth',
      name: 'Roth IRA - Fidelity',
      mask: '5678',
      type: 'investment',
      subtype: 'roth',
    })
    assert.equal(findDuplicateAccount(incoming, existing), roth)
  })

  it('matches by name when the mask is missing', () => {
    const noMask = account({
      plaidAccountId: 'old-401k',
      name: 'Workplace 401k',
      type: 'investment',
      subtype: '401k',
    })
    const incoming = account({
      plaidAccountId: 'new-401k',
      name: 'Workplace 401k',
      type: 'investment',
      subtype: '401k',
    })
    assert.equal(findDuplicateAccount(incoming, [noMask]), noMask)
  })
})
