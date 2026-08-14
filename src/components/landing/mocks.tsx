/* Product shots built from the same pieces as the signed-in app — Page,
   Panel, HeroMetric, PaceBar, the ledger — so the landing page shows the
   screens as they actually are, not a restyled sketch of them. */

import { Fragment, type ComponentProps, type ReactNode } from 'react'
import {
  ArrowLeftRight,
  Landmark,
  LayoutDashboard,
  LineChart,
  List,
  PanelLeftClose,
  PieChart,
  Repeat,
  Settings2,
  Tags,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { CategoryDonut } from '#/components/category-donut'
import {
  CategoryDot,
  DataList,
  EmptyState,
  HeroMetric,
  Kicker,
  RowGroupHeader,
  RowMeta,
  RowTitle,
  ShareBar,
  Stat,
} from '#/components/dense'
import { Money } from '#/components/money'
import { PaceBar } from '#/components/pace-bar'
import { Page, PageSummary, Panel } from '#/components/panel'
import { SpendingChart } from '#/components/spending-chart'
import { SproutMark } from '#/components/sprout'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { formatDayLabel, formatUsdPlain } from '#/lib/money'
import { cn } from '#/lib/utils'

const MONTH = 'August'
const MONTH_KEY = '2026-08'
const THROUGH_DAY = 14
const DAYS_IN_MONTH = 31
const PACE = THROUGH_DAY / DAYS_IN_MONTH

const NAV = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Transactions', icon: List },
  { label: 'Budget', icon: Wallet },
  { label: 'Cash flow', icon: ArrowLeftRight },
  { label: 'Net worth', icon: LineChart },
  { label: 'Investments', icon: PieChart },
  { label: 'Accounts', icon: Landmark },
  { label: 'Recurring', icon: Repeat },
] as const

const SETTINGS = [
  { label: 'Categories', icon: Tags },
  { label: 'Rules', icon: Settings2 },
] as const

const COLORS = {
  housing: 'var(--chart-1)',
  groceries: 'var(--chart-2)',
  restaurants: 'var(--chart-3)',
  shopping: 'var(--chart-4)',
  coffee: 'var(--chart-5)',
  other: 'color-mix(in oklab, var(--sea-ink) 16%, transparent)',
}

function running(daily: Array<number>) {
  let sum = 0
  return daily.map((n, i) => {
    sum += n
    return { day: i + 1, cumulative: sum }
  })
}

const thisMonthSpend = running([
  2486, 42, 118, 0, 86, 0, 0, 312, 64, 156, 28, 94, 71, 390,
])
const lastMonthSpend = running([
  2400, 88, 156, 42, 210, 18, 0, 280, 94, 122, 66, 188, 54, 340, 90, 0, 0, 210,
  76, 144, 38, 0, 188, 92, 56, 210, 44, 0, 0, 168, 72,
])

const spentThisMonth = thisMonthSpend.at(-1)?.cumulative ?? 0
const incomeThisMonth = 8412
const kept = incomeThisMonth - spentThisMonth
const flexSpent = 1186
const flexPlanned = 2600
const fixedSpent = 2489
const fixedPlanned = 3814
const planned = flexPlanned + fixedPlanned
const left = planned - spentThisMonth

const spendMix = [
  { name: 'Housing', color: COLORS.housing, amount: 2400 },
  { name: 'Groceries', color: COLORS.groceries, amount: 412 },
  { name: 'Restaurants', color: COLORS.restaurants, amount: 218 },
  { name: 'Shopping', color: COLORS.shopping, amount: 280 },
  { name: 'Coffee', color: COLORS.coffee, amount: 96 },
  { name: 'Everything else', color: COLORS.other, amount: 441, muted: true },
]

const recentDays = [
  {
    date: '2026-08-14',
    spent: 90.95,
    rows: [
      {
        merchant: 'Whole Foods',
        category: 'Groceries',
        color: COLORS.groceries,
        amount: 84.2,
      },
      {
        merchant: 'Blue Bottle',
        category: 'Coffee',
        color: COLORS.coffee,
        amount: 6.75,
      },
    ],
  },
  {
    date: '2026-08-13',
    spent: 62.1,
    rows: [
      {
        merchant: 'Trader Joe’s',
        category: 'Groceries',
        color: COLORS.groceries,
        amount: 62.1,
      },
    ],
  },
  {
    date: '2026-08-12',
    spent: 0,
    rows: [
      {
        merchant: 'Payroll',
        category: 'Income',
        color: COLORS.housing,
        amount: -4206,
      },
    ],
  },
  {
    date: '2026-08-11',
    spent: 390,
    rows: [
      {
        merchant: 'Amex payment',
        category: 'Transfer',
        color: COLORS.other,
        amount: 1240,
        transfer: true,
      },
      {
        merchant: 'REI',
        category: 'Shopping',
        color: COLORS.shopping,
        amount: 86.4,
      },
    ],
  },
]

const cashAccounts = [
  {
    name: 'Checking',
    meta: 'checking · Chase',
    mask: '4021',
    amount: 8240.19,
    available: 7912.4,
  },
  {
    name: 'Savings',
    meta: 'savings · Ally',
    mask: '7788',
    amount: 4240,
  },
]

const cards = [
  {
    name: 'Platinum',
    meta: 'credit · Amex',
    mask: '1009',
    amount: 1240.55,
    limit: 6800,
  },
  {
    name: 'Sapphire',
    meta: 'credit · Chase',
    mask: '3312',
    amount: 939.8,
    limit: 12000,
    due: 'due in 6d',
  },
]

const investments = [
  {
    name: 'Brokerage',
    meta: 'brokerage · Fidelity',
    mask: '2210',
    amount: 121532,
  },
  {
    name: 'Roth IRA',
    meta: 'ira · Schwab',
    mask: '8830',
    amount: 52488,
  },
]

const cashTotal = cashAccounts.reduce((sum, a) => sum + a.amount, 0)
const cardTotal = cards.reduce((sum, a) => sum + a.amount, 0)
const cardLimit = cards.reduce((sum, a) => sum + a.limit, 0)
const investedTotal = investments.reduce((sum, a) => sum + a.amount, 0)
const netWorth = cashTotal + investedTotal - cardTotal
const assets = cashTotal + investedTotal
const debts = cardTotal

const nwHistory = [
  { date: '2026-05-14', netWorth: 168420 },
  { date: '2026-05-28', netWorth: 169880 },
  { date: '2026-06-11', netWorth: 171240 },
  { date: '2026-06-25', netWorth: 173010 },
  { date: '2026-07-09', netWorth: 174660 },
  { date: '2026-07-23', netWorth: 178420 },
  { date: '2026-08-06', netWorth: 181890 },
  { date: '2026-08-14', netWorth },
]

const flexRows = [
  { name: 'Groceries', color: COLORS.groceries, spent: 412 },
  { name: 'Restaurants', color: COLORS.restaurants, spent: 218 },
  { name: 'Shopping', color: COLORS.shopping, spent: 280 },
  { name: 'Coffee', color: COLORS.coffee, spent: 96 },
  { name: 'Transit', color: COLORS.housing, spent: 180 },
]

const fixedRows = [
  { name: 'Rent', spent: 2400, planned: 2400 },
  { name: 'Health insurance', spent: 0, planned: 640 },
  { name: 'Car payment', spent: 0, planned: 465 },
  { name: 'Utilities', spent: 0, planned: 220 },
  { name: 'Internet', spent: 89, planned: 89 },
]

const ledger = [
  {
    date: '2026-08-14',
    spent: 90.95,
    rows: [
      {
        merchant: 'Whole Foods',
        category: 'Groceries',
        color: COLORS.groceries,
        account: 'Checking ···4021',
        amount: 84.2,
      },
      {
        merchant: 'Blue Bottle',
        category: 'Coffee',
        color: COLORS.coffee,
        account: 'Platinum ···1009',
        amount: 6.75,
      },
    ],
  },
  {
    date: '2026-08-13',
    spent: 62.1,
    rows: [
      {
        merchant: 'Trader Joe’s',
        category: 'Groceries',
        color: COLORS.groceries,
        account: 'Checking ···4021',
        amount: 62.1,
      },
    ],
  },
  {
    date: '2026-08-12',
    spent: 0,
    rows: [
      {
        merchant: 'Payroll',
        category: 'Income',
        color: COLORS.housing,
        account: 'Checking ···4021',
        amount: -4206,
      },
    ],
  },
  {
    date: '2026-08-11',
    spent: 86.4,
    rows: [
      {
        merchant: 'Amex payment',
        category: 'Transfer',
        color: COLORS.other,
        account: 'Checking ···4021',
        amount: 1240,
        transfer: true,
      },
      {
        merchant: 'REI',
        category: 'Shopping',
        color: COLORS.shopping,
        account: 'Sapphire ···3312',
        amount: 86.4,
      },
    ],
  },
]

function PreviewShell({
  title,
  active,
  actions,
  sidebar = false,
  children,
}: {
  title: string
  active: string
  actions?: ReactNode
  sidebar?: boolean
  children: ReactNode
}) {
  return (
    <div className="lp-preview" aria-hidden="true">
      <div className={sidebar ? 'lp-preview-shell' : undefined}>
        {sidebar ? <PreviewSidebar active={active} /> : null}
        <div className="min-w-0 flex-1">
          <header className="app-shell-header gap-2.5">
            <div className="flex min-w-0 flex-1 items-center justify-between gap-2.5">
              <h1 className="truncate text-[15px] font-semibold tracking-tight text-[var(--sea-ink)]">
                {title}
              </h1>
              {actions ? (
                <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
                  {actions}
                </div>
              ) : null}
            </div>
            <span className="size-7 shrink-0 rounded-full bg-muted ring-1 ring-border" />
          </header>
          <div className="app-shell-main">{children}</div>
        </div>
      </div>
    </div>
  )
}

function PreviewSidebar({ active }: { active: string }) {
  return (
    <aside className="lp-preview-side">
      <div className="flex h-12 items-center">
        <div className="flex w-14 shrink-0 items-center justify-center">
          <SproutMark className="size-[22px] text-[var(--sea-ink)]" />
        </div>
        <span className="display-title shrink-0 text-[19px] font-semibold leading-none tracking-tight text-[var(--sea-ink)]">
          Bud
        </span>
        <span className="mr-2 ml-auto flex size-6 items-center justify-center text-[var(--sea-ink-soft)]">
          <PanelLeftClose className="size-3.5" />
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-7 pt-0.5 pb-3">
        <div className="flex flex-col gap-px">
          {NAV.map((item) => (
            <PreviewNavLink
              key={item.label}
              {...item}
              active={item.label === active}
            />
          ))}
        </div>
        <div className="flex flex-col gap-px">
          <p className="kicker shrink-0 pr-3 pl-14 pb-1.5 whitespace-nowrap">
            Settings
          </p>
          {SETTINGS.map((item) => (
            <PreviewNavLink key={item.label} {...item} active={false} />
          ))}
        </div>
      </nav>
    </aside>
  )
}

function PreviewNavLink({
  label,
  icon: Icon,
  active,
}: {
  label: string
  icon: LucideIcon
  active: boolean
}) {
  return (
    <span className="group flex w-full items-center overflow-hidden text-[13px] font-medium">
      <span className="flex w-14 shrink-0 items-center justify-center">
        <span
          className={cn(
            'flex size-8 items-center justify-center rounded-md',
            active
              ? 'bg-muted text-[var(--sea-ink)]'
              : 'text-[var(--sea-ink-soft)]',
          )}
        >
          <Icon
            className={cn('size-4', active ? 'opacity-90' : 'opacity-70')}
            strokeWidth={active ? 2 : 1.75}
          />
        </span>
      </span>
      <span
        className={cn(
          'shrink-0 pr-3 whitespace-nowrap',
          active ? 'text-[var(--sea-ink)]' : 'text-[var(--sea-ink-soft)]',
        )}
      >
        {label}
      </span>
    </span>
  )
}

function PreviewPanel({
  id,
  children,
  ...props
}: ComponentProps<typeof Panel>) {
  return (
    <Panel id={id} {...props} collapsible={false}>
      {children}
    </Panel>
  )
}

/** Stacked page body — skips the app's viewport masonry, which would pack
    these cards as if they owned the whole window. */
function PreviewStack({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-3 md:gap-4">
      {children}
    </div>
  )
}

/** The hero's product shot: the dashboard, sidebar and all. */
export function DashboardMock() {
  const thisThrough = thisMonthSpend.at(-1)?.cumulative ?? 0
  const priorThrough =
    lastMonthSpend.find((p) => p.day === THROUGH_DAY)?.cumulative ?? 0
  const delta = thisThrough - priorThrough

  return (
    <div className="lp-app">
      <PreviewShell
        title="Dashboard"
        active="Dashboard"
        sidebar
        actions={
          <Button variant="outline" size="sm" tabIndex={-1}>
            Connect account
          </Button>
        }
      >
        <Page>
          <PageSummary>
            <HeroMetric
              label="Net worth"
              value={formatUsdPlain(netWorth)}
              meta={`Kept ${formatUsdPlain(kept)} of ${formatUsdPlain(incomeThisMonth)} earned in ${MONTH}`}
            />
            <div className="w-full max-w-[320px] space-y-2">
              <PaceBar
                label="Flex budget pace"
                spent={flexSpent}
                budget={flexPlanned}
                pacePct={PACE}
              />
              <p className="text-[12px] text-muted-foreground text-pretty">
                <span className="tabular-nums">
                  {formatUsdPlain(flexSpent)} of {formatUsdPlain(flexPlanned)}{' '}
                  flex
                </span>
              </p>
            </div>
          </PageSummary>

          <PreviewStack>
            <PreviewPanel
              id="lp-dashboard-spending"
              title="Spending"
              value={formatUsdPlain(spentThisMonth)}
              hint={`${formatUsdPlain(Math.abs(delta))} ${delta > 0 ? 'more' : 'less'} than last month`}
              action={
                <span className="inline-flex h-7 items-center rounded-md border border-border/70 px-2.5 text-[12px] text-muted-foreground">
                  vs last month
                </span>
              }
            >
              <SpendingChart
                thisMonth={thisMonthSpend}
                compare={lastMonthSpend}
                compareLabel="Last month"
                throughDay={THROUGH_DAY}
                daysInMonth={DAYS_IN_MONTH}
              />
            </PreviewPanel>

            <div className="lp-preview-split">
              <PreviewPanel
                id="lp-dashboard-mix"
                span={5}
                title="Where it's going"
                description={`Biggest categories in ${MONTH}.`}
                value={formatUsdPlain(spentThisMonth)}
                action={<span className="section-link">Cash flow</span>}
              >
                <div className="grid justify-items-center gap-5 pt-1 sm:grid-cols-[120px_minmax(0,1fr)] sm:items-center sm:justify-items-stretch">
                  <CategoryDonut segments={spendMix} />
                  <DataList className="w-full">
                    {spendMix.map((row) => (
                      <li key={row.name} className="data-row">
                        <span className="flex min-w-0 items-center gap-2">
                          <CategoryDot color={row.color} />
                          <span
                            className={
                              row.muted
                                ? 'truncate text-muted-foreground'
                                : 'truncate font-medium text-[var(--sea-ink)]'
                            }
                          >
                            {row.name}
                          </span>
                        </span>
                        <span
                          className={
                            row.muted
                              ? 'amount-cell font-medium text-muted-foreground'
                              : 'amount-cell text-[var(--sea-ink)]'
                          }
                        >
                          {formatUsdPlain(row.amount)}
                        </span>
                      </li>
                    ))}
                  </DataList>
                </div>
              </PreviewPanel>

              <PreviewPanel
                id="lp-dashboard-recent"
                span={7}
                title="Recent"
                hint="7 transactions"
                action={<span className="section-link">View all</span>}
                flush
              >
                <DataList>
                  {recentDays.map((day) => (
                    <Fragment key={day.date}>
                      <RowGroupHeader
                        label={formatDayLabel(day.date)}
                        value={
                          day.spent > 0 ? formatUsdPlain(day.spent) : undefined
                        }
                      />
                      {day.rows.map((tx) => (
                        <li key={tx.merchant} className="recent-tx">
                          <div className="recent-tx-main">
                            <span className="inline-pick-title truncate">
                              {tx.merchant}
                            </span>
                            <span className="inline-pick-meta inline-flex items-center gap-1.5">
                              <CategoryDot
                                color={tx.color}
                                className="size-1.5"
                              />
                              <span className="truncate">{tx.category}</span>
                            </span>
                          </div>
                          <Money
                            amount={tx.amount}
                            plaid
                            className="shrink-0"
                          />
                        </li>
                      ))}
                    </Fragment>
                  ))}
                </DataList>
              </PreviewPanel>
            </div>
          </PreviewStack>
        </Page>
      </PreviewShell>
    </div>
  )
}

/** The budget screen: one pool for everyday spending, fixed lines under it. */
export function BudgetMock() {
  return (
    <div className="lp-m">
      <PreviewShell
        title="Budget"
        active="Budget"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" tabIndex={-1}>
              Copy last month
            </Button>
            <Button size="sm" tabIndex={-1}>
              Save
            </Button>
          </div>
        }
      >
        <Page>
          <PageSummary>
            <HeroMetric
              label="Left to spend"
              value={formatUsdPlain(left)}
              meta={
                <>
                  {formatUsdPlain(spentThisMonth)} spent of{' '}
                  {formatUsdPlain(planned)} planned
                </>
              }
            />
            <div className="flex w-full min-w-0 flex-wrap items-end gap-3">
              <div className="min-w-0 flex-1 basis-full sm:flex-none sm:basis-auto">
                <Kicker>Month</Kicker>
                <Input
                  type="month"
                  value={MONTH_KEY}
                  readOnly
                  tabIndex={-1}
                  className="mt-1.5 w-full sm:w-44"
                  aria-label="Month"
                />
              </div>
              <div className="min-w-0 flex-1 basis-full sm:flex-none sm:basis-auto">
                <Kicker>Expected income</Kicker>
                <Input
                  inputMode="decimal"
                  value="8412"
                  readOnly
                  tabIndex={-1}
                  className="mt-1.5 w-full text-right tabular-nums sm:w-[130px]"
                  aria-label="Expected income"
                />
              </div>
            </div>
          </PageSummary>

          <PreviewStack>
            <PreviewPanel
              id="lp-budget-flex"
              span={6}
              title="Flex pool"
              description="Groceries, dining, shopping — one monthly number."
              value={formatUsdPlain(flexSpent)}
              hint={`of ${formatUsdPlain(flexPlanned)}`}
              action={
                <Input
                  inputMode="decimal"
                  value="2600"
                  readOnly
                  tabIndex={-1}
                  className="w-[104px] text-right tabular-nums"
                  aria-label="Flex budget"
                />
              }
            >
              <PaceBar
                spent={flexSpent}
                budget={flexPlanned}
                pacePct={PACE}
                label={`${Math.round((flexSpent / flexPlanned) * 100)}% of flex spent`}
              />
              <DataList className="mt-3">
                {flexRows.map((row) => (
                  <li key={row.name} className="data-row">
                    <span className="flex min-w-0 items-center gap-2">
                      <CategoryDot color={row.color} />
                      <span className="truncate font-medium text-[var(--sea-ink)]">
                        {row.name}
                      </span>
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatUsdPlain(row.spent)}
                    </span>
                  </li>
                ))}
              </DataList>
            </PreviewPanel>

            <PreviewPanel
              id="lp-budget-fixed"
              span={6}
              title="Fixed"
              description="Rent, insurance, subscriptions — same every month."
              value={formatUsdPlain(fixedSpent)}
              hint={`of ${formatUsdPlain(fixedPlanned)}`}
              flush
            >
              <DataList>
                {fixedRows.map((row) => {
                  const pct = row.planned > 0 ? row.spent / row.planned : 0
                  return (
                    <li
                      key={row.name}
                      className="grid grid-cols-[minmax(0,1fr)_40px_88px] items-center gap-2.5 py-2.5 text-[13px] sm:grid-cols-[minmax(0,1fr)_64px_104px] sm:gap-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--sea-ink)]">
                          {row.name}
                        </p>
                        <p className="text-[12px] tabular-nums text-muted-foreground">
                          {formatUsdPlain(row.spent)} spent
                          {row.planned > 0
                            ? ` · ${Math.round(pct * 100)}%`
                            : ''}
                        </p>
                      </div>
                      <div
                        className="h-1 w-10 overflow-hidden rounded-full bg-muted sm:w-16"
                        aria-hidden
                      >
                        <div
                          className="h-full rounded-full bg-[var(--lagoon-deep)]"
                          style={{ width: `${Math.min(100, pct * 100)}%` }}
                        />
                      </div>
                      <Input
                        inputMode="decimal"
                        value={String(row.planned)}
                        readOnly
                        tabIndex={-1}
                        className="text-right tabular-nums"
                        aria-label={`Planned amount for ${row.name}`}
                      />
                    </li>
                  )
                })}
              </DataList>
            </PreviewPanel>
          </PreviewStack>
        </Page>
      </PreviewShell>
    </div>
  )
}

export function AccountsMock() {
  const cashMax = Math.max(...cashAccounts.map((a) => a.amount))
  const cardUtil = cardTotal / cardLimit
  const investMax = Math.max(...investments.map((a) => a.amount))

  return (
    <div className="lp-m">
      <PreviewShell
        title="Accounts"
        active="Accounts"
        actions={
          <Button size="sm" tabIndex={-1}>
            Add institution
          </Button>
        }
      >
        <Page>
          <PageSummary>
            <HeroMetric
              label="Cash"
              value={formatUsdPlain(cashTotal)}
              meta={`${formatUsdPlain(7912.4)} available now · 2 accounts`}
            />
            <div className="flex flex-wrap gap-8">
              <Stat label="Owed" value={formatUsdPlain(cardTotal)} />
              <Stat label="Invested" value={formatUsdPlain(investedTotal)} />
            </div>
          </PageSummary>

          <PreviewStack>
            <PreviewPanel
              id="lp-accounts-cash"
              span={6}
              title="Cash"
              value={formatUsdPlain(cashTotal)}
              flush
            >
              <DataList>
                {cashAccounts.map((account) => (
                  <AccountPreviewRow
                    key={account.mask}
                    account={account}
                    max={cashMax}
                  />
                ))}
              </DataList>
            </PreviewPanel>

            <PreviewPanel
              id="lp-accounts-credit"
              span={6}
              title="Credit cards"
              value={formatUsdPlain(cardTotal)}
              hint={`of ${formatUsdPlain(cardLimit)} limit`}
              tone="muted"
              flush
            >
              <div className="space-y-1.5 px-3 pt-2.5">
                <ShareBar
                  value={cardTotal}
                  total={cardLimit}
                  color={
                    cardUtil > 0.3 ? 'var(--chart-3)' : 'var(--lagoon-deep)'
                  }
                  className="h-1.5"
                />
                <p className="text-[11px] font-medium tabular-nums text-muted-foreground">
                  {Math.round(cardUtil * 100)}% of your available credit is in
                  use
                </p>
              </div>
              <DataList>
                {cards.map((account) => (
                  <AccountPreviewRow
                    key={account.mask}
                    account={account}
                    max={0}
                    debt
                  />
                ))}
              </DataList>
            </PreviewPanel>

            <PreviewPanel
              id="lp-accounts-invest"
              span={6}
              title="Investments"
              value={formatUsdPlain(investedTotal)}
              flush
            >
              <DataList>
                {investments.map((account) => (
                  <AccountPreviewRow
                    key={account.mask}
                    account={account}
                    max={investMax}
                  />
                ))}
              </DataList>
            </PreviewPanel>
          </PreviewStack>
        </Page>
      </PreviewShell>
    </div>
  )
}

function AccountPreviewRow({
  account,
  max,
  debt = false,
}: {
  account: {
    name: string
    meta: string
    mask: string
    amount: number
    available?: number
    limit?: number
    due?: string
  }
  max: number
  debt?: boolean
}) {
  const utilization =
    account.limit && account.limit > 0
      ? Math.min(1, account.amount / account.limit)
      : null
  const hot = utilization != null && utilization > 0.3

  return (
    <li>
      <div className="data-row">
        <span className="min-w-0 flex-1">
          <RowTitle>
            {account.name}
            <span className="font-normal text-muted-foreground">
              {' '}
              ···{account.mask}
            </span>
          </RowTitle>
          <RowMeta className="capitalize">
            {account.meta}
            {account.due ? (
              <span className="font-medium text-amber-700 normal-case">
                {' · '}
                {account.due}
              </span>
            ) : null}
          </RowMeta>
        </span>
        {max > 0 || utilization != null ? (
          <ShareBar
            value={account.amount}
            total={utilization != null ? account.limit! : max}
            color={
              hot
                ? 'var(--chart-3)'
                : debt
                  ? 'color-mix(in oklab, var(--sea-ink) 34%, transparent)'
                  : 'var(--lagoon-deep)'
            }
            className="hidden w-14 shrink-0 sm:block"
          />
        ) : null}
        <span className="shrink-0 text-right">
          <span
            className={cn(
              'amount-cell block',
              debt ? 'text-[var(--sea-ink-soft)]' : 'text-[var(--sea-ink)]',
            )}
          >
            {formatUsdPlain(account.amount)}
          </span>
          {utilization != null ? (
            <span
              className={cn(
                'block text-[11px] tabular-nums',
                hot ? 'text-amber-700' : 'text-muted-foreground',
              )}
            >
              {Math.round(utilization * 100)}% of{' '}
              {formatUsdPlain(account.limit!)}
            </span>
          ) : account.available != null ? (
            <span className="block text-[11px] tabular-nums text-muted-foreground">
              {formatUsdPlain(account.available)} available
            </span>
          ) : null}
        </span>
      </div>
    </li>
  )
}

export function NetWorthMock() {
  const values = nwHistory.map((h) => h.netWorth)
  const min = Math.min(...values)
  const span = Math.max(...values) - min
  const w = 640
  const h = 160
  const pad = 12
  const toY = (v: number) =>
    span <= 0 ? h / 2 : h - pad - ((v - min) / span) * (h - pad * 2)
  const points = nwHistory.map((point, i) => ({
    x: (i / (nwHistory.length - 1)) * w,
    y: toY(point.netWorth),
  }))
  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')
  const area = `${line} L ${w} ${h} L 0 ${h} Z`
  const first = nwHistory[0]
  const last = nwHistory[nwHistory.length - 1]
  const delta = last.netWorth - first.netWorth
  const endTopPct = (points[points.length - 1].y / h) * 100
  const debtShare = Math.round((debts / assets) * 100)
  const largestAsset = Math.max(
    ...cashAccounts.map((a) => a.amount),
    ...investments.map((a) => a.amount),
  )

  return (
    <div className="lp-m">
      <PreviewShell title="Net worth" active="Net worth">
        <Page>
          <PageSummary>
            <HeroMetric
              label="Net worth"
              value={formatUsdPlain(netWorth)}
              meta={`Up ${formatUsdPlain(delta)} since May 14`}
            />
            <div className="flex flex-wrap items-end gap-8">
              <div className="lp-preview-debt-share w-[220px] space-y-2">
                <ShareBar
                  value={debts}
                  total={assets}
                  color="color-mix(in oklab, var(--sea-ink) 34%, transparent)"
                  className="h-2"
                />
                <p className="text-[11px] font-medium text-muted-foreground">
                  Debts are {debtShare}% of what you own
                </p>
              </div>
              <Stat
                label="Assets"
                value={formatUsdPlain(assets)}
                tone="positive"
              />
              <Stat label="Debts" value={formatUsdPlain(debts)} />
            </div>
          </PageSummary>

          <PreviewStack>
            <PreviewPanel
              id="lp-net-worth-trend"
              title="Trend"
              value={`↑ ${formatUsdPlain(delta)}`}
              tone="positive"
              action={
                <div className="flex gap-0.5">
                  {['1M', '3M', 'YTD', '1Y', 'ALL'].map((range) => (
                    <span
                      key={range}
                      className="range-pill"
                      data-active={range === '3M'}
                    >
                      {range}
                    </span>
                  ))}
                </div>
              }
            >
              <div className="space-y-2 pt-1">
                <div className="relative border-b border-border/70">
                  <svg
                    viewBox={`0 0 ${w} ${h}`}
                    preserveAspectRatio="none"
                    className="h-40 w-full"
                    aria-hidden
                  >
                    <defs>
                      <linearGradient
                        id="lp-nw-area"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="var(--lagoon)"
                          stopOpacity="0.26"
                        />
                        <stop
                          offset="100%"
                          stopColor="var(--lagoon)"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>
                    <path d={area} fill="url(#lp-nw-area)" />
                    <path
                      d={line}
                      fill="none"
                      stroke="var(--lagoon-deep)"
                      strokeWidth="2"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                  <span
                    className="absolute right-0 size-2 -translate-y-1/2 translate-x-1/2 rounded-full bg-[var(--lagoon-deep)] ring-2 ring-background"
                    style={{ top: `${endTopPct}%` }}
                    aria-hidden
                  />
                </div>
                <div className="flex items-baseline justify-between text-[11px] tabular-nums text-muted-foreground">
                  <span>May 14</span>
                  <span>Aug 14</span>
                </div>
              </div>
            </PreviewPanel>

            <PreviewPanel
              id="lp-net-worth-assets"
              span={6}
              title="Assets"
              description="Accounts and anything you've valued by hand."
              value={formatUsdPlain(assets)}
              action={
                <Button variant="ghost" size="xs" tabIndex={-1}>
                  Add
                </Button>
              }
            >
              <DataList className="mt-1">
                {[...cashAccounts, ...investments].map((row) => (
                  <li
                    key={row.mask}
                    className="grid grid-cols-[1fr_auto] items-center gap-4 py-2.5 text-[13px] sm:grid-cols-[1fr_56px_auto]"
                  >
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span className="truncate font-medium text-[var(--sea-ink)]">
                        {row.name}
                      </span>
                      <span className="shrink-0 text-[12px] capitalize text-muted-foreground">
                        {row.meta.split(' · ')[0]}
                      </span>
                    </span>
                    <ShareBar
                      value={row.amount}
                      total={largestAsset}
                      className="hidden sm:block"
                    />
                    <span className="amount-cell text-[var(--sea-ink)]">
                      {formatUsdPlain(row.amount)}
                    </span>
                  </li>
                ))}
              </DataList>
            </PreviewPanel>
          </PreviewStack>
        </Page>
      </PreviewShell>
    </div>
  )
}

export function RecurringMock() {
  return (
    <div className="lp-m">
      <PreviewShell title="Recurring" active="Recurring">
        <Page>
          <EmptyState
            title="Subscriptions & bills"
            description="Recurring stream detection lands next — once you have a few months of transactions, Bud will surface subscriptions, cadence, and price changes here."
          />
        </Page>
      </PreviewShell>
    </div>
  )
}

export function CategoriesMock() {
  return (
    <div className="lp-m">
      <PreviewShell title="Transactions" active="Transactions">
        <Page>
          <PageSummary>
            <div className="flex gap-8 sm:gap-10">
              <Stat label="Out" value={formatUsdPlain(spentThisMonth)} />
              <Stat label="In" value={formatUsdPlain(incomeThisMonth)} />
            </div>
            <div className="toolbar">
              <Input
                placeholder="Search merchants…"
                readOnly
                tabIndex={-1}
                className="w-full sm:w-[220px]"
              />
              <Input
                type="month"
                value={MONTH_KEY}
                readOnly
                tabIndex={-1}
                className="min-w-0 flex-1 sm:w-44 sm:flex-none"
              />
              <Select value="all">
                <SelectTrigger
                  className="min-w-0 flex-1 sm:w-[200px] sm:flex-none"
                  tabIndex={-1}
                >
                  <SelectValue placeholder="All accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All accounts</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </PageSummary>

          <PreviewStack>
            <PreviewPanel
              id="lp-transactions-ledger"
              title="Ledger"
              hint="6 shown"
              flush
            >
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th className="w-[42%]">Merchant</th>
                    <th className="w-[24%]">Category</th>
                    <th className="w-[20%]">Account</th>
                    <th className="w-[14%] text-right">Amount</th>
                  </tr>
                </thead>
                {ledger.map((group) => (
                  <tbody key={group.date}>
                    <tr className="ledger-group">
                      <td colSpan={3}>{formatDayLabel(group.date)}</td>
                      <td className="text-right">
                        {group.spent > 0 ? formatUsdPlain(group.spent) : null}
                      </td>
                    </tr>
                    {group.rows.map((tx) => (
                      <tr
                        key={tx.merchant}
                        className={
                          tx.merchant === 'Whole Foods' ? 'bg-muted' : undefined
                        }
                      >
                        <td>
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate font-medium text-[var(--sea-ink)]">
                              {tx.merchant}
                            </span>
                            {tx.transfer ? (
                              <Badge variant="outline" className="text-[10px]">
                                Transfer
                              </Badge>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                            <CategoryDot
                              color={tx.color}
                              className="size-1.5"
                            />
                            <span className="truncate">{tx.category}</span>
                          </span>
                        </td>
                        <td className="truncate text-muted-foreground">
                          {tx.account}
                        </td>
                        <td className="text-right">
                          <Money amount={tx.amount} plaid />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </PreviewPanel>
          </PreviewStack>
        </Page>
      </PreviewShell>
    </div>
  )
}
