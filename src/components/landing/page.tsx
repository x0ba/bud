import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import {
  AccountsMock,
  CategoriesMock,
  DashboardMock,
  NetWorthMock,
  RecurringMock,
} from './mocks'
import { useInView, useLandingCta, useNavState } from './shared'

const institutions = [
  'Chase',
  'Amex',
  'Fidelity',
  'Schwab',
  'Ally',
  'Capital One',
]

const features = [
  {
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
    title: 'Your own deployment',
    body: 'Bud runs on your Convex project with your Plaid keys. No ads, no data sold, no one else reading the ledger.',
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

export function Landing() {
  const cta = useLandingCta()
  const navState = useNavState()

  return (
    <div className="lp">
      <nav className="lp-nav" data-state={navState}>
        <div className="lp-nav-inner">
          <span className="lp-mark">
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

      <div className="lp-wrap">
        <header className="lp-hero">
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
            {institutions.map((name) => (
              <span key={name} className="lp-logo">
                {name}
              </span>
            ))}
          </div>

          <div className="lp-stage">
            <DashboardMock />
          </div>
        </header>

        <section className="lp-section" id="features">
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

          <div className="lp-positions">
            {positions.map((position) => (
              <article key={position.title}>
                <h3>{position.title}</h3>
                <p>{position.body}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="lp-strip" id="how">
        <div className="lp-wrap">
          <div className="lp-head">
            <p className="lp-eyebrow">How it works</p>
            <h2 className="lp-h2">Set up once, then check in</h2>
          </div>
          <div className="lp-steps">
            {steps.map((step) => (
              <div key={step.title} className="lp-step">
                <span className="lp-step-rule" aria-hidden="true" />
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="lp-wrap">
        <section className="lp-close">
          <h2>Start with one account</h2>
          <p>
            Connect a checking account and the month fills in on its own. Add
            cards and brokerages when you are ready.
          </p>
          <div className="lp-close-cta">
            <Link to={cta.primaryTo} className="lp-btn">
              {cta.primaryLabel}
            </Link>
            {cta.signedIn ? null : (
              <Link to="/sign-in" className="lp-btn lp-btn-outline">
                Sign in
              </Link>
            )}
          </div>
        </section>

        <footer className="lp-foot">
          <span>Bud</span>
          <span>Bank data by Plaid · sign-in by Clerk · data in Convex</span>
        </footer>
      </div>
    </div>
  )
}

function Feature({
  tone,
  title,
  body,
  badge,
  icon,
  visual,
}: {
  tone: string
  title: string
  body: string
  badge?: string
  icon: ReactNode
  visual: ReactNode
}) {
  const { ref, inView } = useInView<HTMLElement>()

  return (
    <article ref={ref} className="lp-feature" data-in={inView}>
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
