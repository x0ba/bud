# Bud

Personal finance app — connect banks via Plaid, then answer **where does my money go?** through transactions, flex budgeting, credit cards, and net worth.

Stack: TanStack Start · Convex · Clerk · Plaid · Tailwind + shadcn

## Quick start

```bash
pnpm install
pnpm dev          # Vite on :3000
npx convex dev    # keep running for backend sync
```

## Required setup

### 1. Clerk ↔ Convex JWT

In the [Clerk dashboard](https://dashboard.clerk.com) → JWT Templates → New template → **Convex**.

Set Convex env (already set for this project's dev deployment if you used the agent):

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://YOUR_INSTANCE.clerk.accounts.dev
```

Local `.env.local` needs:

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
VITE_CONVEX_URL=https://….convex.cloud
VITE_CONVEX_SITE_URL=https://….convex.site
```

### 2. Plaid (sandbox)

1. Create a [Plaid](https://dashboard.plaid.com) sandbox app.
2. Set Convex env vars (not Vite — Plaid secrets stay server-side):

```bash
npx convex env set PLAID_CLIENT_ID ...
npx convex env set PLAID_SECRET ...
npx convex env set PLAID_ENV sandbox
```

3. Optional webhook URL (auto-derived from `CONVEX_SITE_URL`):  
   `https://YOUR_DEPLOYMENT.convex.site/plaid/webhook`

### 3. Alpaca (live marks + history)

Investments can mark holdings to the market and backfill daily bars without
waiting on a Plaid brokerage sync. Paper keys work. Set these on Convex (not
Vite):

```bash
npx convex env set ALPACA_API_KEY ...
npx convex env set ALPACA_API_SECRET ...
# optional — IEX is the free feed
npx convex env set ALPACA_FEED iex
```

When Plaid later resyncs a brokerage account, quantity and cost basis come
from Plaid and any gap versus the Alpaca mark is recorded on the holding.

## App routes

| Route                      | Purpose                                            |
| -------------------------- | -------------------------------------------------- |
| `/`                        | Landing page; redirects to `/app` when signed in   |
| `/app`                     | Dashboard — net worth, pace, cards due, recent txs |
| `/app/transactions`        | Filterable table + category learning loop          |
| `/app/budget`              | Fixed / flex / non-monthly budgets                 |
| `/app/accounts`            | Plaid Link, sync, card utilization                 |
| `/app/net-worth`           | Chart + manual assets                              |
| `/app/investments`         | Holdings (when institution supports)               |
| `/app/cash-flow`           | Income vs expenses this month                      |
| `/app/settings/categories` | Category tree                                      |
| `/app/settings/rules`      | Categorization rules                               |

Four landing designs live behind `?d=1`–`?d=4` with an on-page switcher, which
also lets you review them while signed in. Signed out, `/` shows design 1.

## Scripts

```bash
pnpm dev
pnpm build
pnpm generate-routes
pnpm lint
pnpm format
```

See `plans/init.md` for the full product plan and later phases (recurring detection, Sankey, CSV export, webhook JWT verification).
