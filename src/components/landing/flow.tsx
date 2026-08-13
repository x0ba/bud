import { Link } from '@tanstack/react-router'
import type { CSSProperties } from 'react'
import { useInView, useLandingCta } from './shared'

const INCOME = 8412

const flows = [
  {
    name: 'Fixed',
    value: 3980,
    color: '#6b4dff',
    note: 'Rent, insurance, daycare',
  },
  {
    name: 'Flex',
    value: 2318,
    color: '#ff5c2b',
    note: '2,600 planned for the month',
  },
  {
    name: 'Non-monthly',
    value: 642,
    color: '#f5c518',
    note: 'Flights and a car service',
  },
  { name: 'Kept', value: 1472, color: '#12a878', note: '17% of what came in' },
] as const

/* Sankey geometry: one column of income on the left, four destinations on the
   right, each ribbon as thick as its share of the month. */
const SPAN = 280
const LEFT_TOP = 90
const RIGHT_TOP = 30
const RIGHT_GAP = 34
const scale = SPAN / INCOME

const ribbons = (() => {
  let leftCursor = LEFT_TOP
  let rightCursor = RIGHT_TOP

  return flows.map((flow) => {
    const thickness = flow.value * scale
    const leftCenter = leftCursor + thickness / 2
    const rightCenter = rightCursor + thickness / 2
    leftCursor += thickness
    rightCursor += thickness + RIGHT_GAP
    return { ...flow, thickness, leftCenter, rightCenter }
  })
})()

const surfaces = [
  'Dashboard',
  'Transactions',
  'Budget',
  'Cash flow',
  'Net worth',
  'Investments',
  'Accounts',
  'Categories',
  'Rules',
]

export function FlowLanding() {
  const cta = useLandingCta()
  const diagram = useInView<SVGSVGElement>('-20% 0px')

  return (
    <div className="lp4">
      <div className="lp4-top">
        <div className="lp4-wrap">
          <nav className="lp4-nav">
            <span className="lp4-mark">
              <span className="lp4-mark-box" aria-hidden="true" />
              Bud
            </span>
            <div className="lp4-nav-links">
              <a href="#flow">The month</a>
              <a href="#rules">How it counts</a>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {cta.signedIn ? null : (
                <Link to="/sign-in" className="lp4-btn lp4-btn-line">
                  Sign in
                </Link>
              )}
              <Link to={cta.primaryTo} className="lp4-btn">
                {cta.primaryLabel}
              </Link>
            </div>
          </nav>

          <header className="lp4-hero">
            <svg
              className="lp4-hero-stripes"
              viewBox="0 0 1200 150"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d="M-60 176C420 176 470 28 1260 28"
                stroke="#6b4dff"
                style={{ animationDelay: '120ms' }}
              />
              <path
                d="M-60 202C440 202 490 54 1260 54"
                stroke="#ff5c2b"
                style={{ animationDelay: '240ms' }}
              />
              <path
                d="M-60 228C460 228 510 80 1260 80"
                stroke="#f5c518"
                style={{ animationDelay: '360ms' }}
              />
              <path
                d="M-60 254C480 254 530 106 1260 106"
                stroke="#12a878"
                style={{ animationDelay: '480ms' }}
              />
            </svg>

            <h1 className="lp4-h1 lp4-display">
              <span>Every dollar</span>
              <em>accounted for</em>
            </h1>

            <div className="lp4-hero-body">
              <div>
                <p className="lp4-lede">
                  Bud pulls every account you have through Plaid and splits the
                  month four ways: what is fixed, what is everyday, what only
                  happens now and then, and what you got to keep.
                </p>
                <div className="lp4-cta">
                  <Link to={cta.primaryTo} className="lp4-btn">
                    {cta.primaryLabel}
                  </Link>
                  {cta.signedIn ? null : (
                    <Link to="/sign-in" className="lp4-btn lp4-btn-invert">
                      Sign in
                    </Link>
                  )}
                </div>
                <p className="lp4-cta-note">
                  Your Plaid keys · your Convex deployment · no ads, ever
                </p>
              </div>

              <div className="lp4-slab">
                <div className="lp4-slab-head">
                  <span>July</span>
                  <span>8,412 in</span>
                </div>
                <div className="lp4-slab-rows">
                  {ribbons.map((flow) => (
                    <div key={flow.name} className="lp4-slab-row">
                      <span>
                        <i
                          className="lp4-swatch"
                          style={{ '--c': flow.color } as CSSProperties}
                        />
                        {flow.name}
                      </span>
                      <b>{flow.value.toLocaleString('en-US')}</b>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </header>
        </div>
      </div>

      <section className="lp4-flow" id="flow">
        <div className="lp4-wrap">
          <div className="lp4-flow-head">
            <h2 className="lp4-h2 lp4-display">
              July, start to finish, in one picture
            </h2>
            <p className="lp4-flow-note">
              Transfers between your own accounts never show up here, so paying
              a credit card cannot make a month look twice as expensive as it
              was.
            </p>
          </div>

          <svg
            className="lp4-diagram"
            viewBox="0 0 1000 440"
            ref={diagram.ref}
            data-drawn={diagram.inView}
            role="img"
            aria-label="July: 8,412 in, split into 3,980 fixed, 2,318 flex, 642 non-monthly, and 1,472 kept."
          >
            {ribbons.map((flow, i) => (
              <path
                key={flow.name}
                className="lp4-ribbon"
                d={`M 46 ${flow.leftCenter} C 330 ${flow.leftCenter}, 420 ${flow.rightCenter}, 700 ${flow.rightCenter}`}
                stroke={flow.color}
                strokeWidth={flow.thickness}
                style={{ '--i': i } as CSSProperties}
              />
            ))}

            <rect
              className="lp4-node"
              x="30"
              y={LEFT_TOP}
              width="16"
              height={SPAN}
            />
            <text className="lp4-node-label" x="30" y="52">
              Money in
            </text>
            <text className="lp4-node-value" x="30" y="78">
              8,412
            </text>

            {ribbons.map((flow) => (
              <g key={flow.name}>
                <rect
                  className="lp4-node"
                  x="700"
                  y={flow.rightCenter - flow.thickness / 2}
                  width="16"
                  height={flow.thickness}
                />
                <text
                  className="lp4-node-label"
                  x="730"
                  y={flow.rightCenter - 6}
                >
                  {flow.name}
                </text>
                <text
                  className="lp4-node-value"
                  x="730"
                  y={flow.rightCenter + 18}
                >
                  {flow.value.toLocaleString('en-US')}
                </text>
                <text
                  className="lp4-node-muted"
                  x="730"
                  y={flow.rightCenter + 34}
                >
                  {flow.note}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </section>

      <section id="rules">
        <div className="lp4-wrap">
          <div className="lp4-blocks">
            <article className="lp4-block" data-tint="orange">
              <span className="lp4-block-tag">Flex</span>
              <h3>One number to watch</h3>
              <p>
                Everyday categories share a single pool. No envelopes to
                rebalance, no fourteen little budgets to blow through.
              </p>
              <p className="lp4-block-figure">
                $282 left
                <small>12 days to cover</small>
              </p>
            </article>

            <article className="lp4-block" data-tint="violet">
              <span className="lp4-block-tag">Cards</span>
              <h3>Counted once</h3>
              <p>
                A charge on a card is spending. Paying that card off is a
                transfer. Due dates and utilisation show on the dashboard.
              </p>
              <p className="lp4-block-figure">
                18% used
                <small>Amex due in 6 days</small>
              </p>
            </article>

            <article className="lp4-block" data-tint="green">
              <span className="lp4-block-tag">Rules</span>
              <h3>Fix it once</h3>
              <p>
                Recategorise a charge and Bud offers to remember the merchant,
                then clean up the ones it already filed wrong.
              </p>
              <p className="lp4-block-figure">
                41 applied
                <small>Most-specific match wins</small>
              </p>
            </article>
          </div>
        </div>
      </section>

      <div className="lp4-ticker" aria-hidden="true">
        <div className="lp4-ticker-track">
          {[...surfaces, ...surfaces].map((surface, i) => (
            <span key={`${surface}-${i}`}>{surface}</span>
          ))}
        </div>
      </div>

      <section className="lp4-close">
        <div className="lp4-wrap">
          <h2>Stop guessing at the end of the month</h2>
          <p>
            Connect one account and the picture starts drawing itself. Add cards
            and brokerages when you feel like it.
          </p>
          <div className="lp4-close-cta">
            <Link to={cta.primaryTo} className="lp4-btn lp4-btn-dark">
              {cta.primaryLabel}
            </Link>
            {cta.signedIn ? null : (
              <Link to="/sign-in" className="lp4-btn">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="lp4-wrap">
        <footer className="lp4-foot">
          <span>Bud</span>
          <span>Plaid · Clerk · Convex</span>
        </footer>
      </div>
    </div>
  )
}
