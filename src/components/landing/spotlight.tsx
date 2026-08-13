import { Link } from '@tanstack/react-router'
import type { CSSProperties } from 'react'
import { useLandingCta } from './shared'

const institutions = [
  'Chase',
  'Amex',
  'Fidelity',
  'Schwab',
  'Ally',
  'Capital One',
]

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

const cards = [
  {
    title: 'One flex number',
    body: 'Everyday spending shares a single pool, so the only question each week is how much of it is left.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <circle
          cx="9"
          cy="9"
          r="7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="M9 4.5v4.6l3 1.9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: 'Cards counted once',
    body: 'Charges on a card count as spending. Paying that card off is a transfer, not a second expense.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <rect
          x="2"
          y="4"
          width="14"
          height="10"
          rx="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path d="M2 8h14" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    title: 'Corrections that stick',
    body: 'Recategorise once, and Bud offers to remember the merchant and clean up the transactions it already filed.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path
          d="M3 9.5l3.4 3.2L15 4.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
]

const steps = [
  {
    title: 'Connect an account',
    body: 'Plaid handles the bank login. Balances and transactions start arriving within a minute.',
  },
  {
    title: 'Set one flex number',
    body: 'Name the fixed bills, then pick a single amount for everything else you spend day to day.',
  },
  {
    title: 'Check in weekly',
    body: 'Open the dashboard for pace, cards coming due, and what you kept. Two minutes, not an evening.',
  },
]

export function SpotlightLanding() {
  const cta = useLandingCta()

  return (
    <div className="lp3">
      <div className="lp3-wrap">
        <nav className="lp3-nav">
          <span className="lp3-mark">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 21.5V11"
                stroke="#0d1117"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M12 12.5C12 7.9 8.9 4.6 4.2 4c-.4 4.8 2.6 8.5 7.8 8.5z"
                fill="#2f7d73"
              />
              <path
                d="M12 15c0-4.1 2.8-7.1 7-7.6.4 4.3-2.4 7.6-7 7.6z"
                fill="#0d1117"
                opacity="0.82"
              />
            </svg>
            Bud
          </span>
          <div className="lp3-nav-links">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
          </div>
          <div className="lp3-nav-actions">
            {cta.signedIn ? null : (
              <Link
                to="/sign-in"
                className="lp3-btn lp3-btn-outline lp3-btn-sm"
              >
                Sign in
              </Link>
            )}
            <Link to={cta.primaryTo} className="lp3-btn lp3-btn-sm">
              {cta.primaryLabel}
            </Link>
          </div>
        </nav>

        <header className="lp3-hero">
          <h1 className="lp3-h1">
            A clear account of where your <em>money</em> goes
          </h1>
          <div className="lp3-hero-row">
            <p className="lp3-lede">
              Bud connects your banks, cards, and brokerages through Plaid, then
              keeps the month in order: one number for everyday spending, cards
              counted once, net worth updated every day.
            </p>
            <div className="lp3-hero-actions">
              <Link to={cta.primaryTo} className="lp3-btn">
                {cta.primaryLabel}
              </Link>
              {cta.signedIn ? null : (
                <Link to="/sign-in" className="lp3-btn lp3-btn-outline">
                  Sign in
                </Link>
              )}
              <p className="lp3-actions-note">
                Free while it is just you · no card required
              </p>
            </div>
          </div>

          <div className="lp3-logos">
            <p className="lp3-logos-note">
              Connects to 12,000+ institutions through Plaid
            </p>
            {institutions.map((name) => (
              <span key={name} className="lp3-logo">
                {name}
              </span>
            ))}
          </div>

          <div className="lp3-stage">
            <div className="lp3-app">
              <div className="lp3-app-side">
                <p className="lp3-app-brand">Bud</p>
                <div className="lp3-app-nav">
                  {appNav.map((item, i) => (
                    <span key={item} data-active={i === 0}>
                      <i aria-hidden="true" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="lp3-app-main">
                <div className="lp3-app-hero">
                  <div>
                    <p className="lp3-app-kicker">Net worth</p>
                    <p className="lp3-app-figure">$184,320</p>
                    <p className="lp3-app-delta">
                      +$2,140 since the start of the month
                    </p>
                  </div>
                  <svg
                    className="lp3-spark"
                    viewBox="0 0 190 52"
                    aria-hidden="true"
                  >
                    <path d="M2 44C18 40 26 42 38 34s18-6 30-12 20 2 32-6 22 4 34-4 20 2 32-6" />
                  </svg>
                </div>

                <div className="lp3-app-panels">
                  <div className="lp3-app-col">
                    <div className="lp3-app-panel">
                      <div className="lp3-app-panel-head">
                        Flex pool <em>July</em>
                      </div>
                      <div className="lp3-app-panel-body">
                        <div className="lp3-pace">
                          <span>
                            <b>$282</b> left
                          </span>
                          <span>2,318 of 2,600</span>
                        </div>
                        <div className="lp3-pace-track">
                          <i style={{ '--w': '89%' } as CSSProperties} />
                        </div>
                      </div>
                    </div>

                    <div className="lp3-app-panel">
                      <div className="lp3-app-panel-head">
                        Recent <em>View all</em>
                      </div>
                      <div className="lp3-txns">
                        {txns.map((txn) => (
                          <div key={txn.merchant} className="lp3-txn">
                            <span>{txn.merchant}</span>
                            <span className="lp3-txn-cat">{txn.cat}</span>
                            <span className="lp3-txn-amt">{txn.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="lp3-app-panel">
                    <div className="lp3-app-panel-head">
                      Where it&rsquo;s going <em>$6,412</em>
                    </div>
                    <div className="lp3-app-panel-body">
                      <div className="lp3-donut-row">
                        <div className="lp3-donut" aria-hidden="true" />
                        <div className="lp3-legend">
                          {mix.map((row) => (
                            <div key={row.name}>
                              <span>
                                <i
                                  style={{ '--c': row.color } as CSSProperties}
                                />
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
          </div>
        </header>

        <section className="lp3-section" id="features">
          <div className="lp3-section-head">
            <p className="lp3-eyebrow">What you get</p>
            <h2 className="lp3-h2">
              Built around the three questions worth asking
            </h2>
            <p className="lp3-sub">
              Not a spreadsheet with a login. Bud takes a position on how the
              month should be read.
            </p>
          </div>
          <div className="lp3-cards">
            {cards.map((card) => (
              <article key={card.title} className="lp3-card">
                <span className="lp3-card-icon">{card.icon}</span>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="lp3-strip" id="how">
        <div className="lp3-wrap">
          <div className="lp3-section-head">
            <p className="lp3-eyebrow">How it works</p>
            <h2 className="lp3-h2">Set up once, then check in</h2>
          </div>
          <div className="lp3-steps">
            {steps.map((step) => (
              <div key={step.title} className="lp3-step">
                <span className="lp3-step-rule" aria-hidden="true" />
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="lp3-wrap">
        <section className="lp3-close">
          <h2>Start with one account</h2>
          <p>
            Connect a checking account and the month fills in on its own. Add
            cards and brokerages when you are ready.
          </p>
          <div className="lp3-close-cta">
            <Link to={cta.primaryTo} className="lp3-btn">
              {cta.primaryLabel}
            </Link>
            {cta.signedIn ? null : (
              <Link to="/sign-in" className="lp3-btn lp3-btn-outline">
                Sign in
              </Link>
            )}
          </div>
        </section>

        <footer className="lp3-foot">
          <span>Bud</span>
          <span>Bank data by Plaid · sign-in by Clerk · data in Convex</span>
        </footer>
      </div>
    </div>
  )
}
