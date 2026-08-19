import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  EXAMPLE_FUTURE_FLAG,
  evaluateBooleanFlag,
  resolveBooleanFlag,
} from '../src/integrations/posthog/flags.ts'
import type { FeatureFlagReader } from '../src/integrations/posthog/flags.ts'

function mockReader(
  impl: FeatureFlagReader['isFeatureEnabled'],
): FeatureFlagReader {
  return { isFeatureEnabled: impl }
}

describe('resolveBooleanFlag', () => {
  it('treats only explicit true as on', () => {
    assert.equal(resolveBooleanFlag(true), true)
    assert.equal(resolveBooleanFlag(false), false)
    assert.equal(resolveBooleanFlag(undefined), false)
    assert.equal(resolveBooleanFlag(null), false)
  })
})

describe('evaluateBooleanFlag', () => {
  it('returns false when PostHog is not configured', async () => {
    assert.equal(
      await evaluateBooleanFlag(null, EXAMPLE_FUTURE_FLAG, 'user_1'),
      false,
    )
    assert.equal(
      await evaluateBooleanFlag(undefined, EXAMPLE_FUTURE_FLAG, 'user_1'),
      false,
    )
  })

  it('returns false when the flag is missing or false', async () => {
    const missing = mockReader(async () => undefined)
    const off = mockReader(async () => false)

    assert.equal(
      await evaluateBooleanFlag(missing, EXAMPLE_FUTURE_FLAG, 'user_1'),
      false,
    )
    assert.equal(
      await evaluateBooleanFlag(off, EXAMPLE_FUTURE_FLAG, 'user_1'),
      false,
    )
  })

  it('returns true when posthog-node reports the flag is enabled', async () => {
    const on = mockReader(async (key, distinctId) => {
      assert.equal(key, EXAMPLE_FUTURE_FLAG)
      assert.equal(distinctId, 'user_1')
      return true
    })

    assert.equal(
      await evaluateBooleanFlag(on, EXAMPLE_FUTURE_FLAG, 'user_1'),
      true,
    )
  })

  it('returns false when the reader throws', async () => {
    const exploding = mockReader(async () => {
      throw new Error('posthog-node unavailable')
    })

    assert.equal(
      await evaluateBooleanFlag(exploding, EXAMPLE_FUTURE_FLAG, 'user_1'),
      false,
    )
  })
})
