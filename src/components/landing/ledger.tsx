import { Link } from '@tanstack/react-router'
import { useLandingCta } from './shared'

const receipt = [
  { label: 'Income', value: '8,412.00', tone: 'credit' },
  { label: 'Fixed', value: '−3,980.00', tone: 'debit' },
  { label: 'Flex', value: '−2,318.44', tone: 'debit' },
  { label: 'Non-monthly', value: '−642.00', tone: 'debit' },
  { label: 'Card payment', value: 'transfer', tone: 'none' },
] as const

const steps = [
  {
    name: 'Connect',
    body: 'Link checking, savings, credit cards, and brokerages through Plaid. Balances and transactions arrive on their own, and keep arriving.',
  },
  {
    name: 'Correct',
    body: 'Move a charge to the right category once. Bud offers to remember the merchant and to fix the transactions it already got wrong.',
  },
  {
    name: 'Know',
    body: 'Open the dashboard and read one number: what is left of the flex pool, which cards are due, and what you kept this month.',
  },
] as const

const features = [
  {
    name: 'Flex pool',
    tag: 'Budget',
    body: 'One number for everyday spending instead of nineteen envelopes. Fixed bills and non-monthly costs get their own lines.',
  },
  {
    name: 'Cards counted once',
    tag: 'Accounts',
    body: 'Card charges are spending. Paying the card off is a transfer. Utilisation and due dates sit on the dashboard.',
  },
  {
    name: 'Rules that stick',
    tag: 'Settings',
    body: 'Every correction can become a rule. Most-specific match wins, and you can pause any rule without losing it.',
  },
  {
    name: 'Net worth, daily',
    tag: 'Net worth',
    body: 'A snapshot every day across accounts, plus the things banks do not know about: the house, the car, cash in a drawer.',
  },
  {
    name: 'Cash flow',
    tag: 'Cash flow',
    body: 'Money in against money out for any month, with transfers between your own accounts left out of the total.',
  },
  {
    name: 'Holdings',
    tag: 'Investments',
    body: 'Positions and allocation for the brokerages that share them, folded into the same net worth line.',
  },
] as const

export function LedgerLanding() {
  const cta = useLandingCta()

  return (
    <div className="lp1">
      <div className="lp1-wrap">
        <nav className="lp1-nav">
          <span className="lp1-mark">
            <span className="lp1-mark-box" aria-hidden="true">
              B
            </span>
            Bud
          </span>
          <div className="lp1-nav-meta">
            <a href="#loop">The loop</a>
            <a href="#inside">Inside</a>
            {cta.signedIn ? null : <Link to="/sign-in">Sign in</Link>}
          </div>
        </nav>

        <header className="lp1-hero">
          <div>
            <p className="lp1-kicker">Personal finance, self-hosted</p>
            <h1 className="lp1-h1">
              Where does your <em>money</em> go?
            </h1>
            <p className="lp1-lede">
              Bud reads your banks, cards, and brokerages through Plaid and
              keeps a plain account of the month: what came in, what went out,
              what is left. One flex number for everyday spending. Nothing typed
              in by hand.
            </p>
            <div className="lp1-cta">
              <Link to={cta.primaryTo} className="lp1-btn">
                {cta.primaryLabel}
              </Link>
              {cta.signedIn ? null : (
                <Link to="/sign-in" className="lp1-btn lp1-btn-ghost">
                  Sign in
                </Link>
              )}
            </div>
            <p className="lp1-note">
              Plaid for bank data · Clerk for sign-in · your own Convex
              deployment
            </p>
          </div>

          <figure className="lp1-receipt-holder">
            <div className="lp1-receipt">
              <div className="lp1-receipt-head">
                <p className="lp1-receipt-title">Bud</p>
                <p className="lp1-receipt-sub">Statement · July</p>
              </div>
              <ul className="lp1-rows">
                {receipt.map((row, i) => (
                  <li
                    key={row.label}
                    className="lp1-row"
                    data-tone={row.tone}
                    style={{ '--i': i } as React.CSSProperties}
                  >
                    <span className="lp1-row-label">{row.label}</span>
                    <i className="lp1-leader" aria-hidden="true" />
                    <span className="lp1-row-value">{row.value}</span>
                  </li>
                ))}
              </ul>
              <div className="lp1-receipt-total">
                <span>Kept</span>
                <span>1,471.56</span>
              </div>
              <figcaption className="lp1-receipt-foot">
                Snapshot taken daily · no manual entry
              </figcaption>
            </div>
            <span className="lp1-stamp" aria-hidden="true">
              On pace
              <br />
              12 days left
            </span>
          </figure>
        </header>

        <section className="lp1-section" id="loop">
          <div className="lp1-section-head">
            <h2 className="lp1-h2">The loop</h2>
            <p className="lp1-section-note">
              Three moves, then it runs on its own. Your corrections are never
              overwritten by a later sync.
            </p>
          </div>
          <ol className="lp1-steps">
            {steps.map((step, i) => (
              <li key={step.name} className="lp1-step">
                <span className="lp1-step-num">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="lp1-step-name">{step.name}</span>
                <span className="lp1-step-body">{step.body}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="lp1-section" id="inside">
          <div className="lp1-section-head">
            <h2 className="lp1-h2">What is inside</h2>
            <p className="lp1-section-note">
              Nine screens, no upsells. Every line below is something you can
              open today.
            </p>
          </div>
          <div className="lp1-features">
            {features.map((feature) => (
              <div key={feature.name} className="lp1-feature">
                <div className="lp1-feature-top">
                  <span className="lp1-feature-name">{feature.name}</span>
                  <i className="lp1-leader" aria-hidden="true" />
                  <span className="lp1-feature-tag">{feature.tag}</span>
                </div>
                <p className="lp1-feature-body">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="lp1-close">
          <h2 className="lp1-close-title">Open a clean ledger</h2>
          <p className="lp1-close-note">
            Connect one account and the month starts filling in. Add the rest
            when you feel like it.
          </p>
          <div className="lp1-cta">
            <Link to={cta.primaryTo} className="lp1-btn">
              {cta.primaryLabel}
            </Link>
            {cta.signedIn ? null : (
              <Link to="/sign-in" className="lp1-btn lp1-btn-ghost">
                Sign in
              </Link>
            )}
          </div>
        </section>

        <footer className="lp1-foot">
          <span>Bud</span>
          <span>Plaid · Clerk · Convex</span>
          <span>Built for one person&rsquo;s money</span>
        </footer>
      </div>
    </div>
  )
}
