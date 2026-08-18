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

export function sameInstitution(
  left: InstitutionIdentity,
  right: InstitutionIdentity,
): boolean {
  if (left.institutionId && right.institutionId) {
    return left.institutionId === right.institutionId
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

/**
 * Plaid issues a new account_id every time Link creates a new Item. The same
 * Fidelity brokerage then looks brand new. Match on the stable bits instead:
 * last four, type/subtype, and name.
 */
export function findDuplicateAccount<T extends AccountIdentity>(
  incoming: AccountIdentity,
  candidates: Array<T>,
): T | undefined {
  const byPlaidId = candidates.find(
    (candidate) => candidate.plaidAccountId === incoming.plaidAccountId,
  )
  if (byPlaidId) return byPlaidId

  const incomingName = normalizeAccountName(displayName(incoming))
  const exact = candidates.filter((candidate) => {
    if (!sameKind(candidate, incoming)) return false
    if ((candidate.mask ?? '') !== (incoming.mask ?? '')) return false
    return normalizeAccountName(displayName(candidate)) === incomingName
  })
  if (exact.length > 0) return exact[0]

  if (incoming.mask) {
    const byMask = candidates.filter(
      (candidate) =>
        sameKind(candidate, incoming) && candidate.mask === incoming.mask,
    )
    if (byMask.length === 1) return byMask[0]
  }

  const byName = candidates.filter(
    (candidate) =>
      sameKind(candidate, incoming) &&
      normalizeAccountName(displayName(candidate)) === incomingName,
  )
  if (byName.length === 1) return byName[0]

  return undefined
}
