/* DOM replicas of Bud's own screens. Real numbers from a plausible month, drawn
   with markup rather than screenshots so they stay sharp and legible when the
   cards scale down. */

import type { CSSProperties } from 'react'

const appNav = [
  'Dashboard',
  'Transactions',
  'Budget',
  'Cash flow',
  'Net worth',
  'Accounts',
]

const mix = [
  { name: 'Fixed', amount: '$3,980', color: '#3d7a72' },
  { name: 'Groceries', amount: '$612', color: '#4a6b52' },
  { name: 'Restaurants', amount: '$438', color: '#c27803' },
  { name: 'Travel', amount: '$305', color: '#b45309' },
]

const txns = [
  { merchant: 'Whole Foods', cat: 'Groceries', amount: '−$84.20' },
  { merchant: 'Amex payment', cat: 'Transfer', amount: '−$1,240.00' },
  { merchant: 'Blue Bottle', cat: 'Coffee', amount: '−$6.75' },
  { merchant: 'Payroll', cat: 'Income', amount: '+$4,206.00' },
]

/** The hero's product shot: the dashboard, sidebar and all. */
export function DashboardMock() {
  return (
    <div className="lp-app">
      <div className="lp-app-side">
        <p className="lp-app-brand">Bud</p>
        <div className="lp-app-nav">
          {appNav.map((item, i) => (
            <span key={item} data-active={i === 0}>
              <i aria-hidden="true" />
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="lp-app-main">
        <div className="lp-app-hero">
          <div>
            <p className="lp-app-kicker">Net worth</p>
            <p className="lp-app-figure">$184,320</p>
            <p className="lp-app-delta">+$2,140 since the start of the month</p>
          </div>
          <svg className="lp-spark" viewBox="0 0 190 52" aria-hidden="true">
            <path d="M2 44C18 40 26 42 38 34s18-6 30-12 20 2 32-6 22 4 34-4 20 2 32-6" />
          </svg>
        </div>

        <div className="lp-app-panels">
          <div className="lp-app-col">
            <div className="lp-app-panel">
              <div className="lp-app-panel-head">
                Flex pool <em>July</em>
              </div>
              <div className="lp-app-panel-body">
                <div className="lp-pace">
                  <span>
                    <b>$282</b> left
                  </span>
                  <span>2,318 of 2,600</span>
                </div>
                <div className="lp-pace-track">
                  <i style={{ '--w': '89%' } as CSSProperties} />
                </div>
              </div>
            </div>

            <div className="lp-app-panel">
              <div className="lp-app-panel-head">
                Recent <em>View all</em>
              </div>
              <div className="lp-txns">
                {txns.map((txn) => (
                  <div key={txn.merchant} className="lp-txn">
                    <span>{txn.merchant}</span>
                    <span className="lp-txn-cat">{txn.cat}</span>
                    <span className="lp-txn-amt">{txn.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lp-app-panel">
            <div className="lp-app-panel-head">
              Where it&rsquo;s going <em>$6,603</em>
            </div>
            <div className="lp-app-panel-body">
              <div className="lp-donut-row">
                <div className="lp-donut" aria-hidden="true" />
                <div className="lp-legend">
                  {mix.map((row) => (
                    <div key={row.name}>
                      <span>
                        <i style={{ '--c': row.color } as CSSProperties} />
                        {row.name}
                      </span>
                      <b>{row.amount}</b>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* The month the mocks share: $2,600 of flex with $282 left, $3,980 of fixed
   bills against $4,400 planned, and $305 of travel filed on its own. */
const flexSpend = [
  { name: 'Groceries', amount: '$612' },
  { name: 'Restaurants', amount: '$438' },
  { name: 'Coffee', amount: '$186' },
]

const fixedLines = [
  { name: 'Rent', spent: '$2,400', planned: '2,400', fill: '100%' },
  { name: 'Health insurance', spent: '$640', planned: '640', fill: '100%' },
  { name: 'Car payment', spent: '$465', planned: '465', fill: '100%' },
  { name: 'Utilities', spent: '$180', planned: '220', fill: '82%' },
  { name: 'Internet', spent: '$89', planned: '89', fill: '100%' },
]

/** The budget screen: one pool for everyday spending, fixed lines under it. */
export function BudgetMock() {
  return (
    <div className="lp-m">
      <div className="lp-m-head">
        Budget <em>July</em>
      </div>

      <div className="lp-m-body">
        <p className="lp-m-kicker">Left to spend</p>
        <p className="lp-m-figure">$397</p>
        <p className="lp-m-delta">$6,603 spent of $7,000 planned</p>
      </div>

      <div className="lp-m-pool">
        <div className="lp-m-pool-head">
          <span>
            Flex pool
            <em>Groceries, dining, shopping &mdash; one monthly number.</em>
          </span>
          <span className="lp-m-field">2,600</span>
        </div>

        <div className="lp-pace">
          <span>
            <b>$282</b> left
          </span>
          <span>2,318 of 2,600</span>
        </div>
        <div className="lp-pace-track">
          <i style={{ '--w': '89%' } as CSSProperties} />
          <span className="lp-m-today" style={{ left: '87%' }} />
        </div>
        <div className="lp-m-pace-note">
          <span>89% of flex spent</span>
          <span>87% through month</span>
        </div>
      </div>

      <div className="lp-m-rows">
        {flexSpend.map((row) => (
          <div key={row.name} className="lp-m-row">
            <span className="lp-m-name">{row.name}</span>
            <b className="lp-m-amt">{row.amount}</b>
          </div>
        ))}
      </div>

      <div className="lp-m-group">
        <span>Fixed</span>
        <b>$3,980 of $4,400</b>
      </div>
      {fixedLines.map((row) => (
        <div key={row.name} className="lp-m-fix">
          <span className="lp-m-name">
            {row.name} <em>{row.spent} spent</em>
          </span>
          <span className="lp-m-mini" aria-hidden="true">
            <i style={{ width: row.fill }} />
          </span>
          <span className="lp-m-field">{row.planned}</span>
        </div>
      ))}
    </div>
  )
}

type AccountRow = {
  inst: string
  name: string
  mask: string
  amount: string
  note?: string
}

const groups: Array<{ name: string; total: string; rows: Array<AccountRow> }> =
  [
    {
      name: 'Cash',
      total: '$12,480.19',
      rows: [
        {
          inst: 'Chase',
          name: 'Checking',
          mask: '••4021',
          amount: '$8,240.19',
        },
        { inst: 'Ally', name: 'Savings', mask: '••7788', amount: '$4,240.00' },
        {
          inst: 'Capital One',
          name: '360',
          mask: '••5514',
          amount: '$2,010.00',
        },
      ],
    },
    {
      name: 'Credit cards',
      total: '−$2,180.35',
      rows: [
        {
          inst: 'Amex',
          name: 'Platinum',
          mask: '••1009',
          amount: '−$1,240.55',
          note: '18% used',
        },
        {
          inst: 'Chase',
          name: 'Sapphire',
          mask: '••3312',
          amount: '−$939.80',
          note: 'due in 6 days',
        },
      ],
    },
    {
      name: 'Investments',
      total: '$174,020.00',
      rows: [
        {
          inst: 'Fidelity',
          name: 'Brokerage',
          mask: '••2210',
          amount: '$121,532.00',
        },
        {
          inst: 'Schwab',
          name: 'Roth IRA',
          mask: '••8830',
          amount: '$52,488.00',
        },
      ],
    },
  ]

export function AccountsMock() {
  return (
    <div className="lp-m">
      <div className="lp-m-head">
        Accounts <em>6 linked · synced 4m ago</em>
      </div>
      <div className="lp-m-groups">
        {groups.map((group) => (
          <div key={group.name}>
            <div className="lp-m-group">
              <span>{group.name}</span>
              <b>{group.total}</b>
            </div>
            {group.rows.map((row) => (
              <div key={row.mask} className="lp-m-row">
                <i className="lp-m-inst" aria-hidden="true">
                  {row.inst.slice(0, 1)}
                </i>
                <span className="lp-m-name">
                  {row.inst} {row.name} <em>{row.mask}</em>
                </span>
                {row.note ? (
                  <span className="lp-m-note">{row.note}</span>
                ) : null}
                <b className="lp-m-amt">{row.amount}</b>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function NetWorthMock() {
  return (
    <div className="lp-m">
      <div className="lp-m-head">
        Net worth <em>Last 12 months</em>
      </div>
      <div className="lp-m-body">
        <p className="lp-m-figure">$184,320</p>
        <p className="lp-m-delta">+$31,480 this year · snapshot taken daily</p>

        <svg className="lp-m-chart" viewBox="0 0 320 92" aria-hidden="true">
          <defs>
            <linearGradient id="lp-nw-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2f7d73" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#2f7d73" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            className="lp-m-area"
            d="M0 74C22 70 34 72 52 64s28-4 46-14 30 4 48-6 30 6 48-8 30 2 48-10 26 2 38-6v70H0z"
            fill="url(#lp-nw-fill)"
          />
          <path
            className="lp-m-line"
            d="M0 74C22 70 34 72 52 64s28-4 46-14 30 4 48-6 30 6 48-8 30 2 48-10 26 2 38-6"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div className="lp-m-splits">
          <div>
            <span>Assets</span>
            <b>$196,140</b>
          </div>
          <div>
            <span>Liabilities</span>
            <b>−$11,820</b>
          </div>
          <div>
            <span>Added by hand</span>
            <b>$18,400</b>
          </div>
        </div>
      </div>

      <div className="lp-m-rows">
        <div className="lp-m-group">
          <span>Biggest movers</span>
          <b>Since Jul 1</b>
        </div>
        {movers.map((row) => (
          <div key={row.name} className="lp-m-row">
            <span className="lp-m-name">{row.name}</span>
            <b className="lp-m-amt" data-up={row.up}>
              {row.change}
            </b>
          </div>
        ))}
      </div>
    </div>
  )
}

const movers = [
  { name: 'Fidelity Brokerage', change: '+$3,412', up: true },
  { name: 'Amex Platinum', change: '−$980', up: false },
  { name: 'House', change: '+$1,200', up: true },
]

const recurring = [
  {
    name: 'Rent',
    cadence: 'Monthly · 1st',
    amount: '$2,400.00',
    next: 'Aug 1',
  },
  {
    name: 'Car insurance',
    cadence: 'Every 6 months',
    amount: '$642.00',
    next: 'Sep 14',
  },
  {
    name: 'Netflix',
    cadence: 'Monthly · 22nd',
    amount: '$17.99',
    next: 'Aug 22',
    change: 'up $2.50',
  },
  {
    name: 'iCloud+',
    cadence: 'Monthly · 4th',
    amount: '$9.99',
    next: 'Aug 4',
  },
  {
    name: 'Climbing gym',
    cadence: 'Monthly · 8th',
    amount: '$78.50',
    next: 'Aug 8',
  },
  {
    name: 'Blue Bottle beans',
    cadence: 'Every 2 weeks',
    amount: '$22.00',
    next: 'Aug 5',
  },
  {
    name: 'Phone plan',
    cadence: 'Monthly · 17th',
    amount: '$65.00',
    next: 'Aug 17',
  },
  {
    name: 'Renters insurance',
    cadence: 'Yearly · March',
    amount: '$212.00',
    next: 'Mar 3',
  },
]

export function RecurringMock() {
  return (
    <div className="lp-m">
      <div className="lp-m-head">
        Recurring <em>9 found · $3,412 a month</em>
      </div>
      <div className="lp-m-rows">
        {recurring.map((row) => (
          <div key={row.name} className="lp-m-rec">
            <span className="lp-m-name">
              {row.name}
              {row.change ? (
                <span className="lp-m-flag">
                  <svg
                    width="9"
                    height="9"
                    viewBox="0 0 10 10"
                    aria-hidden="true"
                  >
                    <path
                      d="M5 8.5V2M5 2L2 5M5 2l3 3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                  {row.change}
                </span>
              ) : null}
              <em>{row.cadence}</em>
            </span>
            <span className="lp-m-next">next {row.next}</span>
            <b className="lp-m-amt">{row.amount}</b>
          </div>
        ))}
      </div>
    </div>
  )
}

export function CategoriesMock() {
  return (
    <div className="lp-m">
      <div className="lp-m-head">
        Transactions <em>August</em>
      </div>
      <div className="lp-m-rows">
        <div className="lp-m-cat">
          <span className="lp-m-name">Trader Joe&rsquo;s</span>
          <span className="lp-m-chip">Groceries</span>
          <b className="lp-m-amt">−$62.10</b>
        </div>
        <div className="lp-m-cat" data-editing="true">
          <span className="lp-m-name">Whole Foods Market</span>
          <span className="lp-m-chip" data-changed="true">
            Groceries
            <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
              <path
                d="M2 3.5L5 6.5 8 3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <b className="lp-m-amt">−$84.20</b>
        </div>
      </div>

      <div className="lp-m-learn">
        <p>
          Always file <b>Whole Foods Market</b> under Groceries?
        </p>
        <div className="lp-m-learn-row">
          <span className="lp-m-ghost">Just this one</span>
          <span className="lp-m-solid">Remember it</span>
          <em>fixes 14 already filed</em>
        </div>
      </div>

      <div className="lp-m-rows">
        {refiled.map((row) => (
          <div key={row.date} className="lp-m-cat">
            <span className="lp-m-name">
              Whole Foods Market <em>{row.date}</em>
            </span>
            <span className="lp-m-chip" data-changed="true">
              Groceries
            </span>
            <b className="lp-m-amt">{row.amount}</b>
          </div>
        ))}
      </div>
    </div>
  )
}

const refiled = [
  { date: 'Jul 28', amount: '−$112.40' },
  { date: 'Jul 19', amount: '−$56.08' },
  { date: 'Jul 11', amount: '−$93.15' },
]
