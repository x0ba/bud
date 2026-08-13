import { Link } from '@tanstack/react-router'
import { useCallback, useRef } from 'react'
import type { CSSProperties } from 'react'
import { useInView, useLandingCta } from './shared'

const floating = [
  {
    label: 'Groceries',
    amount: '412',
    color: '#4fe0a8',
    side: 'left',
    x: '0%',
    y: '128px',
    r: '-8deg',
    depth: 1.6,
    delay: '0s',
  },
  {
    label: 'Rent',
    amount: '2,400',
    color: '#8f7dff',
    side: 'right',
    x: '1%',
    y: '96px',
    r: '7deg',
    depth: 1.1,
    delay: '1.4s',
  },
  {
    label: 'Daycare',
    amount: '980',
    color: '#5ab8ff',
    side: 'left',
    x: '3%',
    y: '244px',
    r: '4deg',
    depth: 2.2,
    delay: '0.7s',
  },
  {
    label: 'Flights',
    amount: '610',
    color: '#ffb457',
    side: 'right',
    x: '4%',
    y: '262px',
    r: '-5deg',
    depth: 1.9,
    delay: '2.1s',
  },
  {
    label: 'Coffee',
    amount: '38',
    color: '#ff7fb2',
    side: 'left',
    x: '6%',
    y: '366px',
    r: '6deg',
    depth: 2.6,
    delay: '1s',
  },
  {
    label: 'Amex payment',
    amount: 'transfer',
    color: '#c9d2df',
    side: 'right',
    x: '0%',
    y: '384px',
    r: '-3deg',
    depth: 1.4,
    delay: '2.6s',
  },
] as const

const buckets = [
  {
    name: 'Flex',
    hint: 'One pool for everyday spending. Spend it however you like.',
    total: '2,318 of 2,600',
    chips: [
      { label: 'Groceries', color: '#4fe0a8' },
      { label: 'Coffee', color: '#4fe0a8' },
      { label: 'Restaurants', color: '#4fe0a8' },
      { label: 'Rideshare', color: '#4fe0a8' },
      { label: 'Pharmacy', color: '#4fe0a8' },
    ],
  },
  {
    name: 'Fixed',
    hint: 'Same number every month, so it never needs a decision.',
    total: '3,980 planned',
    chips: [
      { label: 'Rent', color: '#8f7dff' },
      { label: 'Insurance', color: '#8f7dff' },
      { label: 'Daycare', color: '#8f7dff' },
      { label: 'Internet', color: '#8f7dff' },
    ],
  },
  {
    name: 'Non-monthly',
    hint: 'Lands a few times a year and wrecks an average.',
    total: '642 this month',
    chips: [
      { label: 'Flights', color: '#ffb457' },
      { label: 'Gifts', color: '#ffb457' },
      { label: 'Car service', color: '#ffb457' },
    ],
  },
] as const

const scatter = [
  { dx: '-180px', dy: '-90px', dr: '-14deg' },
  { dx: '140px', dy: '-120px', dr: '10deg' },
  { dx: '-90px', dy: '140px', dr: '8deg' },
  { dx: '200px', dy: '90px', dr: '-9deg' },
  { dx: '-210px', dy: '40px', dr: '12deg' },
]

function Chip({
  label,
  amount,
  color,
  className,
  style,
}: {
  label: string
  amount?: string
  color: string
  className?: string
  style?: CSSProperties
}) {
  return (
    <span
      className={className ? `lp2-chip ${className}` : 'lp2-chip'}
      style={{ '--chip': color, ...style } as CSSProperties}
    >
      {label}
      {amount ? <span className="lp2-chip-amount">{amount}</span> : null}
    </span>
  )
}

export function ChipsLanding() {
  const cta = useLandingCta()
  const heroRef = useRef<HTMLElement | null>(null)
  const sortRef = useInView<HTMLDivElement>('-25% 0px')

  const onPointerMove = useCallback((event: React.PointerEvent) => {
    const hero = heroRef.current
    if (!hero) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const box = hero.getBoundingClientRect()
    const x = (event.clientX - box.left) / box.width - 0.5
    const y = (event.clientY - box.top) / box.height - 0.5
    hero.style.setProperty('--mx', `${(x * -22).toFixed(2)}px`)
    hero.style.setProperty('--my', `${(y * -18).toFixed(2)}px`)
  }, [])

  return (
    <div className="lp2">
      <div className="lp2-wrap">
        <nav className="lp2-nav">
          <span className="lp2-mark">
            <span className="lp2-mark-dot" aria-hidden="true" />
            Bud
          </span>
          <div className="lp2-nav-links">
            <a href="#sorting">How it sorts</a>
            <a href="#built">What it tracks</a>
          </div>
          <div className="lp2-cta" style={{ margin: 0 }}>
            {cta.signedIn ? null : (
              <Link to="/sign-in" className="lp2-btn lp2-btn-quiet lp2-btn-sm">
                Sign in
              </Link>
            )}
            <Link to={cta.primaryTo} className="lp2-btn lp2-btn-sm">
              {cta.primaryLabel}
            </Link>
          </div>
        </nav>

        <header
          className="lp2-hero"
          ref={heroRef}
          onPointerMove={onPointerMove}
        >
          <div className="lp2-glow" aria-hidden="true" />

          {floating.map((chip) => (
            <span
              key={chip.label}
              className="lp2-float"
              data-side={chip.side}
              aria-hidden="true"
              style={
                {
                  '--x': chip.x,
                  '--y': chip.y,
                  '--r': chip.r,
                  '--depth': chip.depth,
                  '--d': chip.delay,
                } as CSSProperties
              }
            >
              <Chip
                label={chip.label}
                amount={chip.amount}
                color={chip.color}
              />
            </span>
          ))}

          <p className="lp2-eyebrow">
            <b>
              <i className="lp2-pulse" aria-hidden="true" />
              Live
            </b>
            Balances and charges arrive on their own
          </p>
          <h1 className="lp2-h1">
            Every charge, <span>in its place</span>
          </h1>
          <p className="lp2-lede">
            Bud connects your banks, cards, and brokerages, sorts what arrives,
            and gives everyday spending a single number to watch. Fix a category
            once and it stays fixed.
          </p>
          <div className="lp2-cta">
            <Link to={cta.primaryTo} className="lp2-btn">
              {cta.primaryLabel}
            </Link>
            {cta.signedIn ? null : (
              <Link to="/sign-in" className="lp2-btn lp2-btn-quiet">
                Sign in
              </Link>
            )}
          </div>
          <p className="lp2-cta-note">
            Bring your own Plaid keys. Your data stays in your deployment.
          </p>
        </header>

        <section className="lp2-sort" id="sorting">
          <div className="lp2-sort-head">
            <h2 className="lp2-h2">Three buckets, and that is the system</h2>
            <p className="lp2-sub">
              Most budgets fail because they ask for twenty decisions a month.
              Bud asks for three: what is everyday, what is fixed, and what only
              shows up now and then.
            </p>
          </div>
          <div
            className="lp2-buckets lp2-sorting"
            ref={sortRef.ref}
            data-sorted={sortRef.inView}
          >
            {buckets.map((bucket) => (
              <div key={bucket.name} className="lp2-bucket">
                <p className="lp2-bucket-name">
                  {bucket.name}
                  <span>{bucket.total}</span>
                </p>
                <p className="lp2-bucket-rule">{bucket.hint}</p>
                <div className="lp2-bucket-chips">
                  {bucket.chips.map((chip, i) => (
                    <Chip
                      key={chip.label}
                      label={chip.label}
                      color={chip.color}
                      style={
                        {
                          '--i': i,
                          '--dx': scatter[i % scatter.length].dx,
                          '--dy': scatter[i % scatter.length].dy,
                          '--dr': scatter[i % scatter.length].dr,
                        } as CSSProperties
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="lp2-grid" id="built">
          <article
            className="lp2-card"
            style={{ '--edge': '#4fe0a8' } as CSSProperties}
          >
            <div className="lp2-card-figure">
              <div className="lp2-meter-row">
                <span>Left to spend</span>
                <b>$282</b>
              </div>
              <div className="lp2-meter">
                <i style={{ width: '89%' }} />
              </div>
            </div>
            <h3>Pace, not guesswork</h3>
            <p>
              The dashboard opens on how much of the flex pool is gone and how
              many days are left to cover.
            </p>
          </article>

          <article
            className="lp2-card"
            style={{ '--edge': '#8f7dff' } as CSSProperties}
          >
            <div className="lp2-card-figure">
              <div className="lp2-stack">
                <span className="lp2-stack-row">
                  <span>Amex · dinner</span>
                  <span>spending</span>
                </span>
                <span className="lp2-stack-row">
                  <span>Amex payment</span>
                  <span className="lp2-tick">transfer</span>
                </span>
                <span className="lp2-stack-row">
                  <span>Utilisation</span>
                  <span>18%</span>
                </span>
              </div>
            </div>
            <h3>Cards counted once</h3>
            <p>
              Card charges are spending. Paying the card is a transfer. Due
              dates and utilisation ride along.
            </p>
          </article>

          <article
            className="lp2-card"
            style={{ '--edge': '#5ab8ff' } as CSSProperties}
          >
            <div className="lp2-card-figure">
              <div className="lp2-bars">
                {[38, 52, 47, 63, 71, 66, 84, 92].map((h, i) => (
                  <i
                    key={i}
                    className="lp2-bar"
                    style={
                      {
                        '--h': `${h}%`,
                        '--bar': i > 5 ? '#5ab8ff' : '#8f7dff',
                      } as CSSProperties
                    }
                  />
                ))}
              </div>
            </div>
            <h3>Net worth, daily</h3>
            <p>
              A snapshot every day across every account, plus the house, the
              car, and anything else a bank cannot see.
            </p>
          </article>
        </section>

        <section className="lp2-close">
          <h2>Know where it went</h2>
          <p>
            Connect one account and this month starts filling in. Add the rest
            whenever.
          </p>
          <div className="lp2-cta">
            <Link to={cta.primaryTo} className="lp2-btn">
              {cta.primaryLabel}
            </Link>
            {cta.signedIn ? null : (
              <Link to="/sign-in" className="lp2-btn lp2-btn-quiet">
                Sign in
              </Link>
            )}
          </div>
        </section>

        <footer className="lp2-foot">
          <span>Bud — where does your money go?</span>
          <span>Plaid · Clerk · Convex</span>
        </footer>
      </div>
    </div>
  )
}
