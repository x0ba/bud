export const EXAMPLE_FUTURE_FLAG = 'example-future-flag' as const

export type FeatureFlagKey = typeof EXAMPLE_FUTURE_FLAG

export type FeatureFlagReader = {
  isFeatureEnabled: (
    key: string,
    distinctId: string,
  ) => Promise<boolean | undefined>
}

/** Missing / undefined / thrown eval is off. Only an explicit true is on. */
export function resolveBooleanFlag(value: boolean | undefined | null): boolean {
  return value === true
}

export async function evaluateBooleanFlag(
  reader: FeatureFlagReader | null | undefined,
  key: FeatureFlagKey,
  distinctId: string,
): Promise<boolean> {
  if (!reader) {
    return false
  }

  try {
    return resolveBooleanFlag(await reader.isFeatureEnabled(key, distinctId))
  } catch {
    return false
  }
}
