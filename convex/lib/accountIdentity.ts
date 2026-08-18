export type AccountType =
  'depository' | 'credit' | 'investment' | 'loan' | 'other'

export type AccountIdentity = {
  plaidAccountId: string
  name: string
  officialName?: string
  mask?: string
  type: AccountType
  subtype?: string
}

export type InstitutionIdentity = {
  institutionId?: string
  institutionName: string
}

export function normalizeAccountName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function displayName(account: AccountIdentity): string {
  return account.officialName || account.name
}

function isGenericInstitutionName(name: string): boolean {
  const normalized = normalizeAccountName(name)
  return normalized.length === 0 || normalized === 'institution'
}

export function sameInstitution(
  left: InstitutionIdentity,
  right: InstitutionIdentity,
): boolean {
  if (left.institutionId && right.institutionId) {
    return left.institutionId === right.institutionId
  }
  if (
    isGenericInstitutionName(left.institutionName) ||
    isGenericInstitutionName(right.institutionName)
  ) {
    return false
  }
  return (
    normalizeAccountName(left.institutionName) ===
    normalizeAccountName(right.institutionName)
  )
}

function subtypeKey(account: AccountIdentity): string {
  return account.subtype ?? ''
}

function sameKind(left: AccountIdentity, right: AccountIdentity): boolean {
  return left.type === right.type && subtypeKey(left) === subtypeKey(right)
}

function accountMask(account: AccountIdentity): string {
  return account.mask?.trim() ?? ''
}

/**
 * Plaid issues a new account_id every time Link creates a new Item. The same
 * Fidelity brokerage then looks brand new. Match on last four plus type/subtype.
 * Name is a tie-breaker when two accounts share a mask. Unmasked accounts are
 * only matched by Plaid account id, since "Savings" is not unique.
 */
export function findDuplicateAccount<T extends AccountIdentity>(
  incoming: AccountIdentity,
  candidates: Array<T>,
): T | undefined {
  const byPlaidId = candidates.find(
    (candidate) => candidate.plaidAccountId === incoming.plaidAccountId,
  )
  if (byPlaidId) return byPlaidId

  const incomingMask = accountMask(incoming)
  if (!incomingMask) return undefined

  const incomingName = normalizeAccountName(displayName(incoming))
  const exact = candidates.filter((candidate) => {
    if (!sameKind(candidate, incoming)) return false
    if (accountMask(candidate) !== incomingMask) return false
    return normalizeAccountName(displayName(candidate)) === incomingName
  })
  if (exact.length > 0) return exact[0]

  const byMask = candidates.filter(
    (candidate) =>
      sameKind(candidate, incoming) && accountMask(candidate) === incomingMask,
  )
  if (byMask.length === 1) return byMask[0]

  return undefined
}
