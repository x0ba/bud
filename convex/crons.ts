import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

crons.daily(
  'sync all plaid items',
  { hourUTC: 10, minuteUTC: 0 },
  internal.plaidActions.syncAllItems,
)

// After the 10:00 Plaid sync so the daily point uses fresh balances.
crons.daily(
  'net worth snapshot',
  { hourUTC: 11, minuteUTC: 0 },
  internal.netWorth.snapshotAllUsers,
)

export default crons
