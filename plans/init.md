# Bud — Personal Finance App: Initial Plan

A self-hosted personal finance app in the spirit of Monarch Money and Copilot Money: connect your banks, credit cards, and brokerages via Plaid, then understand where your money goes through budgeting, automated categorization, net worth tracking, and investment monitoring.

## Guiding principles

- **"Where does my money go?" is the core question.** Every screen should help answer it: spending by category, by merchant, over time, versus budget.
- **Credit cards are first-class.** Most day-to-day spending happens on cards. Card transactions are spending; card _payments_ are transfers (never double-counted). Balances, statement cycles, due dates, APRs, and utilization get dedicated UI.
- **Trust the data.** Sync should be reliable and idempotent; corrections the user makes (categories, merchant names, hidden transactions) must never be clobbered by a re-sync.
- **Learn from the user.** Manual categorization corrections feed a rules engine so the same fix never has to be made twice.

## Existing stack (already scaffolded)

| Layer         | Choice                                                         |
| ------------- | -------------------------------------------------------------- |
| Framework     | TanStack Start (React 19, file-based routes, server functions) |
| Backend/DB    | Convex (reactive queries, actions, crons, HTTP actions)        |
| Auth          | Clerk (`@clerk/tanstack-react-start`)                          |
| Styling/UI    | Tailwind v4 + shadcn/ui (`components.json` present)            |
| Observability | Sentry (server functions wrapped in `Sentry.startSpan`)        |

## To add

- **Plaid** (`plaid` Node SDK) — bank/credit/investment/liability data. Runs inside Convex actions (`"use node"`) and a Convex HTTP action for webhooks.
- **TanStack React Charts** (`@tanstack/react-charts`) — line/area/bar charts (net worth, spending trends, budget burn-down). Note: it's beta and covers axis-based charts only; donut/treemap/Sankey visualizations (category breakdown, cash flow) will be small custom SVG components styled to match shadcn.
- **convex-helpers** — `customQuery`/`customMutation` wrappers for auth (`authedQuery`, `authedMutation`).

## Architecture overview

```
Browser (TanStack Start + shadcn + charts)
   │  Convex reactive queries / mutations (live UI updates)
   ▼
Convex
   ├─ queries/mutations: transactions, budgets, categories, rules, snapshots
   ├─ actions ("use node"): Plaid API calls (link token, token exchange, sync)
   ├─ http action: /plaid/webhook  ← Plaid webhooks (SYNC_UPDATES_AVAILABLE, etc.)
   └─ crons: nightly net worth snapshot, periodic sync fallback, recurring detection
   ▲
Plaid (Link on client; API + webhooks on server)
```

- Plaid Link runs in the browser (`react-plaid-link`); the public token is exchanged for an access token inside a Convex action and stored server-side only (never returned to the client).
- Transaction ingest uses **`/transactions/sync`** (cursor-based, incremental, handles added/modified/removed) — not the legacy `/transactions/get`.
- Webhooks trigger syncs; a nightly cron is the fallback. Every sync is idempotent keyed on `plaidTransactionId`.
- All user-facing Convex functions use `authedQuery`/`authedMutation` wrappers keyed to the Clerk identity; every table row is scoped by `userId`.

## Data model (Convex schema)

```
users             clerkId, name, email
plaidItems        userId, plaidItemId, accessToken, institutionId, institutionName,
                  status (ok | login_required | error), syncCursor, lastSyncedAt,
                  consentExpiresAt?          .index("by_user"), .index("by_plaid_item_id")
accounts          userId, itemId, plaidAccountId, name, officialName?, mask?,
                  type (depository|credit|investment|loan), subtype,
                  currentBalance, availableBalance?, limit?, isoCurrency,
                  isHidden, isClosed
                  // credit-card fields (from /liabilities/get):
                  lastStatementBalance?, lastStatementDate?, nextPaymentDueDate?,
                  minimumPayment?, aprs?, isOverdue?
transactions      userId, accountId, plaidTransactionId, date, authorizedDate?,
                  amount, isoCurrency, merchantName?, originalDescription,
                  pending, pendingTransactionId?,
                  categoryId, categorySource (plaid|rule|user),
                  isTransfer, isHidden, isSplit?, parentTransactionId?,
                  notes?, tags?                .index("by_user_date"),
                  .index("by_account_date"), .index("by_plaid_transaction_id"),
                  .index("by_user_category_date")
categories        userId?, name, icon, color, parentId?, isSystem,
                  budgetType (fixed | flex | non_monthly | income | transfer),
                  excludeFromBudget
categoryRules     userId, matcher { merchantName? | descriptionContains? |
                  plaidCategory? | accountId? , amountMin?, amountMax? },
                  categoryId, priority, createdFrom (correction | manual),
                  timesApplied                 .index("by_user")
budgets           userId, month ("YYYY-MM"), expectedIncome?,
                  flexBudget?                  .index("by_user_month")
budgetItems       budgetId, categoryId, amount, rollover?  .index("by_budget")
netWorthSnapshots userId, date, netWorth, assets, liabilities,
                  byAccount: [{accountId, balance}]   .index("by_user_date")
manualAssets      userId, name, type (property|vehicle|cash|other|debt), value,
                  valueUpdatedAt
securities        plaidSecurityId, symbol?, name, type, closePrice?, closePriceAt?
holdings          userId, accountId, securityId, quantity, costBasis?,
                  institutionValue, institutionPrice     .index("by_user"), .index("by_account")
investmentTxns    userId, accountId, plaidInvestmentTransactionId, date, type,
                  subtype, quantity?, price?, amount, securityId?
recurringStreams  userId, merchantName, categoryId?, cadence (weekly|monthly|yearly|...),
                  averageAmount, lastDate, nextExpectedDate, isActive,
                  isSubscription, mutedByUser
```

Notes:

- `amount` convention: positive = money out (spending), negative = money in (matches Plaid). All aggregation code lives in one shared lib so sign handling is consistent.
- Category corrections set `categorySource: "user"`; sync never overwrites user-sourced fields (category, notes, tags, hidden, splits) when a transaction is "modified" by Plaid.
- Default category tree is seeded per user on signup (editable), mapped from Plaid's personal finance categories.

## Feature plan

### 1. Plaid connection & sync

- Link flow: Convex action creates `link_token` → `react-plaid-link` modal → exchange `public_token` → store item + accounts.
- Products: `transactions`, `liabilities`, `investments` (as supported per institution).
- `/transactions/sync` with stored cursor; upsert added/modified, soft-handle removed; reconcile pending → posted via `pendingTransactionId`.
- Webhook HTTP action verifies Plaid signature (JWT) and schedules an internal sync action for the item.
- Item health surfaced in UI (re-auth banner + Link update mode when `login_required`).
- Sandbox mode first; environment switch via Convex env vars.

### 2. Automated categorization (learning)

Deterministic, inspectable rules — no black box:

1. On ingest, apply the first matching `categoryRule` (priority-ordered, most-specific-first: exact merchant+account > exact merchant > description-contains > Plaid category mapping).
2. If no rule matches, fall back to the mapped Plaid personal-finance category (`categorySource: "plaid"`).
3. **Learning loop:** when the user re-categorizes a transaction, prompt inline — "Always categorize _Blue Bottle Coffee_ as Coffee?" — accepting creates a merchant rule and offers to retroactively apply it to existing matching transactions.
4. Rules management screen: view/edit/delete rules, see how often each fired.

- Same loop for merchant-name cleanup (rename "SQ *BLUE BOTTLE #442" → "Blue Bottle").
- Future (post-MVP): LLM-assisted suggestion for unmatched merchants, still surfaced as a rule the user confirms.

### 3. Category & flex budgeting

Support both budgeting styles, Copilot-style:

- Every expense category has a `budgetType`: **fixed** (rent, insurance — same every month), **flex** (groceries, dining, shopping — one pooled monthly number), or **non-monthly** (annual/irregular — amortized with rollover).
- Budget screen shows: income vs. planned, fixed categories with individual targets, one flex pool with per-category drill-down, non-monthly accruals.
- Progress bars with pace indicators ("62% spent, 55% through the month"), month-over-month copy-forward, rollover support for non-monthly.
- Transfers, CC payments, and hidden transactions are excluded from budget math automatically.

### 4. Credit cards (first-class)

- **Cards overview page:** each card shows current vs. statement balance, payment due date + minimum, utilization vs. limit, APR; sorted by next due date.
- **Payment handling:** paired transfer detection (payment out of checking + payment onto card) auto-marks both `isTransfer` — spending reports count the original purchases, never the payment.
- **Statement awareness:** spending-this-cycle per card, projected statement balance.
- Due-date awareness on the dashboard ("Chase due in 5 days — $1,240").
- Interest/fee transactions auto-categorized to a visible "Interest & Fees" category (this is real spend, not a transfer).

### 5. Net worth tracking

- Nightly cron snapshots all account balances + manual assets into `netWorthSnapshots`.
- Net worth page: line/area chart over time (1M/3M/YTD/1Y/All), assets vs. liabilities split, per-account contribution breakdown, deltas.
- Manual assets/liabilities (home, car, private assets) with periodic value updates.

### 6. Investment monitoring

- Holdings synced via `/investments/holdings/get`; investment transactions for activity feed.
- Portfolio page: total value + day/period change, allocation by account and security type (donut), top holdings table, cost basis vs. market value where available.
- Investment accounts contribute to net worth but are excluded from spending/budget math.

### 7. Cash flow & insights

- **Cash flow page:** income vs. expenses by month (bar chart), savings rate, Sankey-style income → categories flow diagram.
- **Recurring & subscriptions:** detect recurring streams from transaction history (same merchant, regular cadence, similar amount); calendar of upcoming bills; "price increased" alerts (e.g. Netflix went from $15.49 → $17.99).
- **Spending insights on dashboard:** top categories and merchants this month, month-over-month comparison, largest transactions, unusual-spend callouts.

### 8. Transactions experience

- Fast, filterable, paginated table (account, category, date range, amount, search, pending, tags).
- Inline category editing (the primary correction surface for the learning loop), notes, tags, hide, and transaction splitting.
- Bulk actions: select many → recategorize/tag/hide.
- CSV export.

## UI / routes

```
/                     Dashboard: net worth sparkline, budget status, upcoming bills,
                      CC due dates, recent transactions, top categories this month
/transactions         Full transaction table + filters + bulk edit
/budget               Monthly budget (fixed / flex / non-monthly views)
/cash-flow            Income vs expenses, savings rate, Sankey
/net-worth            Net worth chart + account breakdown + manual assets
/investments          Portfolio value, allocation, holdings
/accounts             All connected accounts, item health, add/re-auth via Plaid Link
/accounts/$accountId  Single account detail (for cards: statement/due/utilization view)
/recurring            Subscriptions & recurring bills calendar
/settings/categories  Category tree management
/settings/rules       Categorization rules management
```

Layout: authenticated app shell (sidebar nav + topbar) behind a Clerk-protected layout route; sign-in/up pages public. shadcn components throughout (data-table, dialog, command palette for quick category assignment, sheet for transaction detail, sonner for toasts).

## Build phases

**Phase 0 — Foundation**
Convex schema + auth wrappers (`authedQuery`/`authedMutation`), Clerk-protected app shell + sidebar, seed default category tree, shadcn component installs.

**Phase 1 — Plaid ingest (sandbox)**
Link flow, token exchange, accounts + `/transactions/sync`, webhook endpoint, item health handling. Deliverable: connected sandbox institutions with live transaction data in the table.

**Phase 2 — Transactions & categorization**
Transactions table with filters/inline edit, rules engine + correction learning loop + retroactive apply, merchant cleanup, transfer/CC-payment pairing.

**Phase 3 — Budgeting**
Category/flex/non-monthly budgets, budget screen with pace indicators, month rollover/copy-forward.

**Phase 4 — Credit cards & net worth**
`/liabilities/get` sync, cards overview + card detail, nightly snapshot cron, net worth page + manual assets.

**Phase 5 — Investments & cash flow**
Holdings/investment transactions sync, portfolio page, cash flow page, recurring detection + subscriptions.

**Phase 6 — Polish**
Dashboard insights, CSV export, bulk actions, Sankey diagram, empty/loading states, Sentry spans on all server functions, production Plaid migration checklist.

## Security & reliability notes

- Plaid `access_token`s live only in Convex, only touched by internal actions; never sent to the client. Client gets `plaidItems` metadata minus the token via explicit field selection.
- Webhook signature verification (Plaid JWT) on the HTTP action.
- All syncs idempotent; cursor persisted only after a page is fully processed (Plaid sync pagination contract).
- All monetary aggregation logic centralized in `convex/lib/money.ts` (sign conventions, transfer exclusion, currency) and unit-tested.
- Sentry spans around Plaid actions and server functions per repo convention.

## Open questions (defaults chosen, flag if wrong)

1. **Single-user vs. multi-user/household?** Planning for single user per account (with schema that scopes by `userId` so household sharing can come later).
2. **Plaid environment/pricing:** starting in Sandbox; production requires Plaid approval and per-item costs — fine to defer.
3. **Currency:** assuming USD-primary with `isoCurrency` stored per row; no FX conversion in v1.
4. **Historical data:** Plaid typically provides up to 24 months on first sync; CSV import for older history is a possible later addition.
