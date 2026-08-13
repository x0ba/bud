import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import {
  AccountsMock,
  BudgetMock,
  CategoriesMock,
  DashboardMock,
  NetWorthMock,
  RecurringMock,
} from './mocks'
import { useInView, useLandingCta, useNavState } from './shared'

const institutions: Array<{
  name: string
  src: string
  shape?: 'mark'
}> = [
  { name: 'Chase', src: '/landing/logos/chase.svg' },
  { name: 'American Express', src: '/landing/logos/amex.svg', shape: 'mark' },
  { name: 'Fidelity', src: '/landing/logos/fidelity.svg' },
  { name: 'Charles Schwab', src: '/landing/logos/schwab.svg' },
  { name: 'Ally', src: '/landing/logos/ally.svg' },
  { name: 'Capital One', src: '/landing/logos/capitalone.svg' },
  { name: 'Bank of America', src: '/landing/logos/bofa.svg' },
  { name: 'Citi', src: '/landing/logos/citi.svg' },
  { name: 'Discover', src: '/landing/logos/discover.svg' },
  { name: 'Visa', src: '/landing/logos/visa.svg' },
  { name: 'Mastercard', src: '/landing/logos/mastercard.svg', shape: 'mark' },
  { name: 'PayPal', src: '/landing/logos/paypal.svg' },
  { name: 'SoFi', src: '/landing/logos/sofi.svg' },
  { name: 'PNC', src: '/landing/logos/pnc.svg' },
  { name: 'Vanguard', src: '/landing/logos/vanguard.svg' },
  { name: 'Robinhood', src: '/landing/logos/robinhood.svg' },
  { name: 'Morgan Stanley', src: '/landing/logos/morgan.svg' },
]

const features = [
  {
    id: 'accounts',
    tone: 'mint',
    title: 'All your accounts in one place',
    body: 'Checking, savings, credit cards, and brokerages from 12,000+ institutions, side by side. Balances refresh on their own, so the total is the total.',
    visual: <AccountsMock />,
    icon: (
      <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
        <rect
          x="2"
          y="3.5"
          width="14"
          height="5"
          rx="1.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <rect
          x="2"
          y="10.5"
          width="14"
          height="4"
          rx="1.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.55"
        />
      </svg>
    ),
  },
  {
    id: 'net-worth',
    tone: 'lavender',
    title: 'Net worth tracking',
    body: 'A snapshot every day across every account, plus the things a bank cannot see: the house, the car, the cash in a drawer.',
    visual: <NetWorthMock />,
    icon: (
      <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
        <path
          d="M2 13.5l4.2-4.6 3.1 2.6L16 4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'recurring',
    tone: 'peach',
    title: 'Recurring transactions',
    badge: 'In progress',
    body: 'Bud picks out the charges that repeat, says when each one lands next, and flags the ones that quietly went up.',
    visual: <RecurringMock />,
    icon: (
      <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
        <path
          d="M3 7.5a6 6 0 019.9-2.7L15 7M15 10.5a6 6 0 01-9.9 2.7L3 11"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'categories',
    tone: 'sky',
    title: 'Automatic categorization',
    body: 'Everything arrives sorted. Move one charge to the right category and Bud offers to remember the merchant, then fixes the ones it already filed wrong.',
    visual: <CategoriesMock />,
    icon: (
      <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
        <path
          d="M2.5 5.5h13M2.5 9h9M2.5 12.5h5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
]

const positions = [
  {
    title: 'One flex number',
    body: 'Everyday spending shares a single pool, so the only question each week is how much of it is left.',
  },
  {
    title: 'Cards counted once',
    body: 'A charge on a card is spending. Paying that card off is a transfer, not a second expense.',
  },
  {
    title: 'Seasonal bills sit apart',
    body: 'Travel, gifts, and the annual renewals keep their own line, so one trip does not read as a bad month.',
  },
]

export function Landing() {
  const cta = useLandingCta()
  const navState = useNavState()

  return (
    <div className="lp">
      <nav className="lp-nav" data-state={navState}>
        <div className="lp-nav-inner">
          <Mark />
          <div className="lp-nav-actions">
            {cta.signedIn ? null : (
              <Link to="/sign-in" className="lp-btn lp-btn-outline lp-btn-sm">
                Sign in
              </Link>
            )}
            <Link to={cta.primaryTo} className="lp-btn lp-btn-sm">
              {cta.primaryLabel}
            </Link>
          </div>
        </div>
      </nav>

      <div className="lp-frame">
        <header className="lp-slab lp-hero">
          <h1 className="lp-h1">
            A clear account of where your <em>money</em> goes
          </h1>
          <p className="lp-lede">
            Bud connects your banks, cards, and brokerages through Plaid, then
            keeps the month in order: one number for everyday spending, cards
            counted once, net worth updated every day.
          </p>

          <div className="lp-logos">
            <p className="lp-logos-note">
              Connects to 12,000+ institutions through Plaid
            </p>
            <div className="lp-logos-marquee">
              <div className="lp-logos-track">
                <LogoSet />
                <LogoSet duplicate />
              </div>
            </div>
          </div>

          <div className="lp-stage">
            <DashboardMock />
          </div>
        </header>

        <section className="lp-slab lp-slab-ink lp-section" id="features">
          <div className="lp-head">
            <p className="lp-eyebrow">What Bud keeps current</p>
            <h2 className="lp-display">Upkeep</h2>
            <p className="lp-sub">
              Connect an account and these four look after themselves.
            </p>
          </div>

          <div className="lp-features">
            {features.map((feature) => (
              <Feature key={feature.title} {...feature} />
            ))}
          </div>
        </section>

        <section className="lp-slab lp-section" id="budget">
          <div className="lp-head">
            <p className="lp-eyebrow">What you decide</p>
            <h2 className="lp-display">Budget</h2>
            <p className="lp-sub">
              Name the fixed bills once. Everything else you spend shares a
              single pool.
            </p>
          </div>

          <div className="lp-budget">
            <div className="lp-positions">
              {positions.map((position) => (
                <article key={position.title}>
                  <span className="lp-positions-rule" aria-hidden="true" />
                  <h3>{position.title}</h3>
                  <p>{position.body}</p>
                </article>
              ))}
            </div>

            <div className="lp-feature-visual" data-tone="mint">
              <BudgetMock />
            </div>
          </div>
        </section>
      </div>

      <footer className="lp-foot">
        <div className="lp-frame lp-foot-bar">
          <Link to="/" className="lp-foot-brand" aria-label="Bud home">
            <Mark />
          </Link>

          <div className="lp-foot-cols">
            <nav className="lp-foot-col" aria-label="Product">
              <p>Product</p>
              <a href="#accounts">Accounts</a>
              <a href="#net-worth">Net worth</a>
              <a href="#recurring">Recurring</a>
              <a href="#budget">Budget</a>
            </nav>
            <nav className="lp-foot-col" aria-label="Stack">
              <p>Stack</p>
              <a href="https://plaid.com" target="_blank" rel="noreferrer">
                Plaid
              </a>
              <a href="https://clerk.com" target="_blank" rel="noreferrer">
                Clerk
              </a>
              <a href="https://www.convex.dev" target="_blank" rel="noreferrer">
                Convex
              </a>
            </nav>
          </div>

          <div className="lp-foot-cta">
            {cta.signedIn ? null : (
              <Link to="/sign-in" className="lp-btn lp-btn-outline lp-btn-sm">
                Sign in
              </Link>
            )}
            <Link to={cta.primaryTo} className="lp-btn lp-btn-outline lp-btn-sm">
              {cta.primaryLabel}
            </Link>
          </div>
        </div>

        <div className="lp-foot-well" aria-hidden="true">
          <svg className="lp-foot-watermark" viewBox="0 0 24 24">
            <path
              d="M12 21.5V11"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <path
              d="M12 12.5C12 7.9 8.9 4.6 4.2 4c-.4 4.8 2.6 8.5 7.8 8.5z"
              fill="currentColor"
              opacity="0.55"
            />
            <path
              d="M12 15c0-4.1 2.8-7.1 7-7.6.4 4.3-2.4 7.6-7 7.6z"
              fill="currentColor"
            />
          </svg>
        </div>
      </footer>
    </div>
  )
}

function LogoSet({ duplicate = false }: { duplicate?: boolean }) {
  return (
    <ul className="lp-logos-set" aria-hidden={duplicate || undefined}>
      {institutions.map((institution) => (
        <li
          key={institution.name}
          className="lp-logo"
          data-shape={institution.shape}
        >
          <img
            src={institution.src}
            alt={duplicate ? '' : institution.name}
            height={institution.shape === 'mark' ? 30 : 24}
            draggable={false}
          />
        </li>
      ))}
    </ul>
  )
}

function Mark() {
  return (
    <span className="lp-mark">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 21.5V11"
          stroke="#1c1917"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M12 12.5C12 7.9 8.9 4.6 4.2 4c-.4 4.8 2.6 8.5 7.8 8.5z"
          fill="#3d7a72"
        />
        <path
          d="M12 15c0-4.1 2.8-7.1 7-7.6.4 4.3-2.4 7.6-7 7.6z"
          fill="#1c1917"
          opacity="0.82"
        />
      </svg>
      Bud
    </span>
  )
}

function Feature({
  id,
  tone,
  title,
  body,
  badge,
  icon,
  visual,
}: {
  id: string
  tone: string
  title: string
  body: string
  badge?: string
  icon: ReactNode
  visual: ReactNode
}) {
  const { ref, inView } = useInView<HTMLElement>()

  return (
    <article ref={ref} id={id} className="lp-feature" data-in={inView}>
      <h3>
        <span className="lp-feature-icon">{icon}</span>
        {title}
        {badge ? <em className="lp-badge">{badge}</em> : null}
      </h3>
      <p>{body}</p>
      <div className="lp-feature-visual" data-tone={tone}>
        {visual}
      </div>
    </article>
  )
}
