import { createPortal } from 'react-dom'
import { cn } from '#/lib/utils'

/** Map a point in an SVG viewBox to viewport coordinates. */
export function svgPointToClient(
  svg: SVGSVGElement,
  x: number,
  y: number,
): { x: number; y: number } {
  const rect = svg.getBoundingClientRect()
  const viewBox = svg.viewBox.baseVal
  const vw = viewBox.width || rect.width
  const vh = viewBox.height || rect.height
  return {
    x: rect.left + (x / vw) * rect.width,
    y: rect.top + (y / vh) * rect.height,
  }
}

/**
 * Chart readout — portaled so panel `overflow: clip` can't eat it.
 * Anchored to a data point, not the cursor, so it stays put on a slice.
 */
export function ChartHoverTip({
  x,
  y,
  label,
  value,
  detail,
}: {
  x: number
  y: number
  label: string
  value: string
  detail?: string
}) {
  const flip = y < 56
  const left = Math.min(Math.max(x, 72), window.innerWidth - 72)

  return createPortal(
    <div
      role="tooltip"
      className={cn(
        'pointer-events-none fixed z-50 w-fit rounded-md bg-foreground px-2.5 py-1.5 text-background',
        'origin-bottom animate-in fade-in-0 zoom-in-95 duration-[125ms] ease-[cubic-bezier(0.23,1,0.32,1)]',
        flip && 'origin-top',
      )}
      style={{
        left,
        top: y,
        transform: flip
          ? 'translate(-50%, 10px)'
          : 'translate(-50%, calc(-100% - 10px))',
      }}
    >
      <p className="text-[11px] leading-none font-medium text-background/65">
        {label}
      </p>
      <p className="mt-1 text-[13px] leading-none font-semibold tabular-nums">
        {value}
        {detail ? (
          <span className="ml-1.5 font-medium text-background/65">{detail}</span>
        ) : null}
      </p>
    </div>,
    document.body,
  )
}
