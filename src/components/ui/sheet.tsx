import * as React from 'react'
import { XIcon } from 'lucide-react'
import { Dialog as SheetPrimitive } from 'radix-ui'

import { cn } from '#/lib/utils.ts'

/** Past this much travel the sheet goes rather than springs back. */
const DISMISS_PX = 88

/**
 * Drag-to-dismiss for the bottom sheet. Radix already owns focus, escape, and
 * the overlay click; this only adds the gesture the grab handle promises —
 * showing a handle you can't pull is worse than showing no handle at all.
 *
 * The handlers live on the handle, not the sheet. A downward drag that starts
 * on a switch or a select is operating that control, not dismissing.
 *
 * `touch-action: none` keeps the browser from stealing the pointer for pan,
 * which would cancel the gesture before it reaches DISMISS_PX. Pulling up
 * meets resistance and never travels far, so the sheet stays anchored.
 */
function useDragDismiss(enabled: boolean) {
  const sheetRef = React.useRef<HTMLDivElement>(null)
  const closeRef = React.useRef<HTMLButtonElement>(null)
  const start = React.useRef<number | null>(null)
  const offset = React.useRef(0)

  const move = (y: number) => {
    const el = sheetRef.current
    if (!el) return
    offset.current = y > 0 ? y : y / 4
    el.style.transition = 'none'
    el.style.transform = `translate3d(0, ${offset.current}px, 0)`
  }

  const release = () => {
    const el = sheetRef.current
    if (!el) return
    start.current = null
    if (offset.current > DISMISS_PX) closeRef.current?.click()
    el.style.transition = 'transform 260ms cubic-bezier(0.32, 0.72, 0, 1)'
    el.style.transform = ''
    offset.current = 0
  }

  const handleProps = enabled
    ? {
        onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
          if (event.pointerType === 'mouse') return
          start.current = event.clientY
          event.currentTarget.setPointerCapture(event.pointerId)
        },
        onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => {
          if (start.current === null) return
          move(event.clientY - start.current)
        },
        onPointerUp: release,
        onPointerCancel: release,
      }
    : {}

  return { closeRef, sheetRef, handleProps }
}

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-[color-mix(in_oklab,var(--sea-ink)_22%,transparent)] duration-[280ms] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-200 data-[state=open]:animate-in data-[state=open]:fade-in-0',
        className,
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = 'right',
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: 'top' | 'right' | 'bottom' | 'left'
  showCloseButton?: boolean
}) {
  const { closeRef, sheetRef, handleProps } = useDragDismiss(side === 'bottom')

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          'fixed z-50 flex flex-col gap-0 overflow-hidden bg-card text-card-foreground shadow-none transition ease-[cubic-bezier(0.32,0.72,0,1)] data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:animate-in data-[state=open]:duration-[280ms]',
          side === 'right' &&
            'inset-y-0 right-0 h-full w-[min(100%,22.5rem)] border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
          side === 'left' &&
            'inset-y-0 left-0 h-full w-[min(100%,22.5rem)] border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
          side === 'top' &&
            'inset-x-0 top-0 h-auto border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
          // Rises from the thumb, stops short of the status bar, and rounds its
          // top corners so it reads as a sheet over the page rather than a new
          // screen. The grab handle says which edge it came from.
          side === 'bottom' &&
            'inset-x-0 bottom-0 max-h-[88dvh] rounded-t-2xl border-t pb-[env(safe-area-inset-bottom)] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
          className,
        )}
        {...props}
        ref={sheetRef}
      >
        {side === 'bottom' ? (
          <>
            <div
              className="flex min-h-11 shrink-0 touch-none items-center justify-center"
              {...handleProps}
            >
              <span
                className="h-1 w-9 rounded-full bg-[color-mix(in_oklab,var(--sea-ink)_18%,transparent)]"
                aria-hidden
              />
            </div>
            <SheetPrimitive.Close ref={closeRef} className="sr-only">
              Close
            </SheetPrimitive.Close>
            <div
              data-sheet-scroll
              className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain"
            >
              {children}
            </div>
          </>
        ) : (
          children
        )}
        {showCloseButton && side !== 'bottom' && (
          <SheetPrimitive.Close className="absolute top-3 right-3 flex size-10 items-center justify-center rounded-md text-muted-foreground transition-[color,background-color,transform] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-muted hover:text-foreground active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden">
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-header"
      className={cn('flex flex-col gap-1.5 p-4', className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn('mt-auto flex flex-col gap-2 p-4', className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn('font-semibold text-foreground', className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
