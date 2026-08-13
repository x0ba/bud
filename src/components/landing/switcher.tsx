import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const DESIGNS = [
  { id: 1, name: 'Ledger' },
  { id: 2, name: 'Chips' },
  { id: 3, name: 'Spotlight' },
  { id: 4, name: 'Flow' },
] as const

export type DesignId = (typeof DESIGNS)[number]['id']

export function DesignSwitcher({ active }: { active: DesignId }) {
  const navigate = useNavigate({ from: '/' })
  const [open, setOpen] = useState(true)

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target?.isContentEditable) return
      if (target && /^(input|textarea|select)$/i.test(target.tagName)) return

      const digit = Number(event.key)
      if (digit >= 1 && digit <= DESIGNS.length) {
        void navigate({ search: { d: digit as DesignId } })
        return
      }
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        const step = event.key === 'ArrowRight' ? 1 : -1
        const next = ((active - 1 + step + DESIGNS.length) % DESIGNS.length) + 1
        void navigate({ search: { d: next as DesignId } })
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, navigate])

  if (!open) {
    return (
      <div className="lps">
        <button
          type="button"
          className="lps-dot"
          onClick={() => setOpen(true)}
          aria-label="Show design switcher"
        >
          {active}
        </button>
      </div>
    )
  }

  return (
    <div className="lps">
      <div className="lps-bar" role="group" aria-label="Landing page design">
        {DESIGNS.map((design) => (
          <Link
            key={design.id}
            to="/"
            search={{ d: design.id }}
            className="lps-item"
            data-active={design.id === active}
            aria-current={design.id === active ? 'true' : undefined}
          >
            <span className="lps-num">{design.id}</span>
            <span className="lps-name">{design.name}</span>
          </Link>
        ))}
        <span className="lps-divider" aria-hidden="true" />
        <button
          type="button"
          className="lps-toggle"
          onClick={() => setOpen(false)}
          aria-label="Hide design switcher"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path
              d="M3.5 3.5l7 7M10.5 3.5l-7 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      <p className="lps-hint">Press 1–4 or ← → to compare</p>
    </div>
  )
}
