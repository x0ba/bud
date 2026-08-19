export function isLastAccountAtInstitution(
  accountCount: number | undefined,
): boolean {
  return accountCount != null && accountCount <= 1
}

export function accountRemovalCopy(args: {
  accountName: string
  institutionName?: string
  isLastAtInstitution: boolean
}): { title: string; description: string } {
  const institution = args.institutionName ?? 'this institution'
  if (args.isLastAtInstitution) {
    return {
      title: `Remove ${args.accountName}?`,
      description: `This is the last account at ${institution}. Removing it also disconnects ${institution} and deletes its history from Bud.`,
    }
  }
  return {
    title: `Remove ${args.accountName}?`,
    description: `This deletes the account and its transactions from Bud. It will not come back when ${institution} syncs.`,
  }
}

export function institutionRemovalCopy(args: {
  institutionName: string
  accountCount: number
}): { title: string; description: string } {
  const accounts =
    args.accountCount === 1
      ? '1 account'
      : `${args.accountCount} accounts`
  return {
    title: `Disconnect ${args.institutionName}?`,
    description: `This removes ${accounts} and their transactions, and unlinks ${args.institutionName} from Bud.`,
  }
}
