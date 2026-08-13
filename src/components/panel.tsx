import { ChevronRight } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import type { Tone } from '#/components/dense'
import { toneClass } from '#/components/dense'
import { cn } from '#/lib/utils'

const XL = '(min-width: 80rem)'
const TRACKS = 12

type Pin = { start: number; span: number }

function columnSpan(el: HTMLElement): number {
  const fromData = Number.parseInt(el.dataset.span ?? '', 10)
  if (fromData) return Math.min(TRACKS, Math.max(1, fromData))
  const start = getComputedStyle(el).gridColumnStart
  if (start.startsWith('span ')) {
    return Math.min(
      TRACKS,
      Math.max(1, Number.parseInt(start.slice(5), 10) || TRACKS),
    )
  }
  return TRACKS
}

function shortestStart(heights: Array<number>, span: number): number {
  let best = 0
  let bestY = Number.POSITIVE_INFINITY
  for (let start = 0; start <= TRACKS - span; start++) {
    let y = 0
    for (let i = start; i < start + span; i++) {
      y = Math.max(y, heights[i] ?? 0)
    }
    if (y < bestY) {
      bestY = y
      best = start
    }
  }
  return best
}

function clearPlacement(el: HTMLElement) {
  el.style.gridColumn = ''
  el.style.gridRowStart = ''
  el.style.gridRowEnd = ''
}

/**
 * Packs PageBody at `xl` so a short card doesn't hold a hole open for the rest
 * of its grid row. Each card is pinned to the column it first landed in, so
 * collapsing only lifts the cards below it — native masonry would re-pack
 * across columns on every height change.
 */
function usePageMasonry() {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return

    let pins = new WeakMap<HTMLElement, Pin>()

    const pack = (reassign: boolean) => {
      if (!window.matchMedia(XL).matches) {
        delete root.dataset.masonry
        pins = new WeakMap()
        for (const child of root.children) {
          if (child instanceof HTMLElement) clearPlacement(child)
        }
        return
      }

      if (reassign) pins = new WeakMap()

      root.dataset.masonry = 'polyfill'
      const styles = getComputedStyle(root)
      const row = parseFloat(styles.gridAutoRows) || 1
      const gap = parseFloat(styles.columnGap) || 16
      const heights = Array<number>(TRACKS).fill(0)

      for (const child of root.children) {
        if (!(child instanceof HTMLElement)) continue

        const span = Math.min(TRACKS, Math.max(1, columnSpan(child)))
        const pinned = pins.get(child)
        const start =
          span >= TRACKS
            ? 0
            : pinned && pinned.span === span && pinned.start + span <= TRACKS
              ? pinned.start
              : shortestStart(heights, span)
        pins.set(child, { start, span })

        let y = 0
        for (let i = start; i < start + span; i++) {
          y = Math.max(y, heights[i] ?? 0)
        }
        const rowSpan = Math.max(
          1,
          Math.ceil((child.getBoundingClientRect().height + gap) / row),
        )
        const column = `${start + 1} / ${start + span + 1}`
        const rowStart = String(y + 1)
        const rowEnd = `span ${rowSpan}`
        if (child.style.gridColumn !== column) child.style.gridColumn = column
        if (child.style.gridRowStart !== rowStart) {
          child.style.gridRowStart = rowStart
        }
        if (child.style.gridRowEnd !== rowEnd) child.style.gridRowEnd = rowEnd

        for (let i = start; i < start + span; i++) heights[i] = y + rowSpan
      }
    }

    let frame = 0
    const schedule = (reassign = false) => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        pack(reassign)
      })
    }

    pack(true)

    const ro = new ResizeObserver(() => schedule(false))
    ro.observe(root)
    const observeKids = () => {
      for (const child of root.children) {
        if (child instanceof HTMLElement) ro.observe(child)
      }
    }
    observeKids()

    const mo = new MutationObserver(() => {
      observeKids()
      schedule(false)
    })
    mo.observe(root, { childList: true })

    const mq = window.matchMedia(XL)
    const onBreakpoint = () => pack(true)
    mq.addEventListener('change', onBreakpoint)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      ro.disconnect()
      mo.disconnect()
      mq.removeEventListener('change', onBreakpoint)
      delete root.dataset.masonry
      for (const child of root.children) {
        if (child instanceof HTMLElement) clearPlacement(child)
      }
    }
  }, [])

  return ref
}

const PANEL_STATE_PREFIX = 'bud.panel.'

/**
 * Pages compose on a 12-column grid at `xl`; below that every panel stacks to
 * full width. Spans are written out so Tailwind can see the class names.
 */
const SPAN_CLASS = {
  3: 'xl:col-span-3',
  4: 'xl:col-span-4',
  5: 'xl:col-span-5',
  6: 'xl:col-span-6',
  7: 'xl:col-span-7',
  8: 'xl:col-span-8',
  12: 'xl:col-span-12',
} as const

export type PanelSpan = keyof typeof SPAN_CLASS

/** Page column: summary band, optional toolbar, then the panel grid. */
export function Page({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn('flex w-full min-w-0 flex-col gap-3 md:gap-4', className)}
    >
      {children}
    </div>
  )
}

/**
 * The band above the panels: the page's one focal figure on the left,
 * counterweights on the right, closed with a hairline. Deliberately *not* a
 * panel — a hero inside a card would read as a peer of the data areas instead
 * of leading them.
 *
 * On a phone there is no "right", so the counterweights fall under the figure
 * and stretch to the full width — the hierarchy becomes vertical rather than
 * disappearing into a wrap.
 */
export function PageSummary({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'flex w-full min-w-0 flex-col items-stretch gap-4 pb-4',
        'sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-x-10 sm:gap-y-5 sm:pb-5',
        'border-b border-border/70',
        className,
      )}
    >
      {children}
    </section>
  )
}

/**
 * The 12-column field the panels sit in. At `xl` cards pack into the shortest
 * column they fit, then stay there — collapsing only lifts the cards below.
 */
export function PageBody({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const ref = usePageMasonry()
  return (
    <div ref={ref} className={cn('page-body', className)}>
      {children}
    </div>
  )
}

function usePanelOpen(id: string, defaultCollapsed: boolean) {
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return !defaultCollapsed
    try {
      const stored = localStorage.getItem(PANEL_STATE_PREFIX + id)
      if (stored === '0') return false
      if (stored === '1') return true
    } catch {
      // ignore storage access errors
    }
    return !defaultCollapsed
  })

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev
      try {
        localStorage.setItem(PANEL_STATE_PREFIX + id, next ? '1' : '0')
      } catch {
        // ignore storage access errors
      }
      return next
    })
  }, [id])

  return [open, toggle] as const
}

/**
 * A data area with its own walls. The page background stays the canvas and
 * panels lift one step onto `--card` — a ~3% shift you feel rather than see,
 * so the boundaries do the separating without the borders shouting.
 *
 * Collapsing is the point: a folded panel is a 40px row of title + figure, so
 * a dashboard can be squeezed down to an index of answers. The choice sticks
 * per panel in `localStorage`, keyed by `id`.
 */
export function Panel({
  id,
  title,
  description,
  value,
  hint,
  tone = 'default',
  action,
  span = 12,
  collapsible = true,
  defaultCollapsed = false,
  flush = false,
  children,
  className,
}: {
  id: string
  title: string
  description?: React.ReactNode
  value?: React.ReactNode
  hint?: React.ReactNode
  tone?: Tone
  action?: React.ReactNode
  span?: PanelSpan
  collapsible?: boolean
  defaultCollapsed?: boolean
  /** Content runs to the panel walls — hairline lists and ledger tables. */
  flush?: boolean
  children: React.ReactNode
  className?: string
}) {
  const [stored, toggle] = usePanelOpen(id, defaultCollapsed)
  const open = collapsible ? stored : true
  const bodyId = useId()

  // `overflow: clip` while folding keeps the row height animation honest, but
  // it would also clip the ledger's sticky header once the panel is open, so
  // it lifts again after the transition settles.
  const [settled, setSettled] = useState(open)
  useEffect(() => {
    if (!open) {
      setSettled(false)
      return
    }
    const timer = setTimeout(() => setSettled(true), 240)
    return () => clearTimeout(timer)
  }, [open])

  const heading = (
    <>
      {collapsible ? (
        <ChevronRight className="panel-chevron" aria-hidden />
      ) : null}
      <span className="min-w-0">
        <span className="panel-title">{title}</span>
        {description ? (
          <span className="panel-description">{description}</span>
        ) : null}
      </span>
    </>
  )

  return (
    <section
      className={cn('panel', SPAN_CLASS[span], className)}
      data-open={open || undefined}
      data-span={span}
    >
      <div className="panel-head">
        {collapsible ? (
          <button
            type="button"
            className="panel-trigger"
            onClick={toggle}
            aria-expanded={open}
            aria-controls={bodyId}
          >
            {heading}
          </button>
        ) : (
          <div className="panel-trigger" data-static>
            {heading}
          </div>
        )}
        {value != null || hint != null || action != null ? (
          <div className="panel-trailing">
            {value != null ? (
              <span
                className={cn(
                  'text-[13px] font-semibold tabular-nums',
                  toneClass(tone),
                )}
              >
                {value}
              </span>
            ) : null}
            {hint != null ? (
              <span className="text-[12px] tabular-nums text-muted-foreground">
                {hint}
              </span>
            ) : null}
            {action}
          </div>
        ) : null}
      </div>

      <div
        id={bodyId}
        className="panel-body"
        data-open={open || undefined}
        data-settled={settled || undefined}
        inert={!open}
      >
        <div className="panel-body-inner">
          <div className={cn('panel-content', flush && 'panel-content-flush')}>
            {children}
          </div>
        </div>
      </div>
    </section>
  )
}
