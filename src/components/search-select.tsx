import { CheckIcon, Plus } from 'lucide-react'
import { useState } from 'react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '#/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import { cn } from '#/lib/utils'

export type SearchSelectOption = {
  value: string
  label: string
  keywords?: string
  icon?: React.ReactNode
  muted?: boolean
  indent?: boolean
}

/**
 * A ledger-row select: the trigger is the current label, the menu is a
 * searchable list that can mint a new value from whatever you typed.
 */
export function SearchSelect({
  value,
  options,
  onSelect,
  onCreate,
  placeholder = 'Select',
  searchPlaceholder = 'Search…',
  emptyText = 'Nothing matches.',
  createLabel,
  disabled,
  align = 'start',
  className,
  children,
  'aria-label': ariaLabel,
}: {
  value?: string
  options: Array<SearchSelectOption>
  onSelect: (value: string) => void
  onCreate?: (name: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  createLabel?: (query: string) => string
  disabled?: boolean
  align?: 'start' | 'center' | 'end'
  className?: string
  children?: React.ReactNode
  'aria-label': string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const trimmed = query.trim()
  const canCreate =
    !!onCreate &&
    trimmed.length > 0 &&
    !options.some((o) => o.label.toLowerCase() === trimmed.toLowerCase())

  const close = () => {
    setOpen(false)
    setQuery('')
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery('')
      }}
    >
      <PopoverTrigger
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn('inline-pick', className)}
      >
        {children ?? (
          <span className="truncate text-muted-foreground">{placeholder}</span>
        )}
      </PopoverTrigger>
      <PopoverContent align={align} className="w-64 p-0 shadow-none">
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {canCreate ? null : <CommandEmpty>{emptyText}</CommandEmpty>}
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={`${opt.label} ${opt.keywords ?? ''} ${opt.value}`}
                  className={cn(
                    'text-[13px]',
                    opt.indent && 'pl-6',
                    opt.muted && 'text-muted-foreground',
                  )}
                  onSelect={() => {
                    if (opt.value !== value) onSelect(opt.value)
                    close()
                  }}
                >
                  {opt.icon}
                  <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                  {opt.value === value ? (
                    <CheckIcon className="size-3.5 text-muted-foreground" />
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
            {canCreate ? (
              <CommandGroup className="border-t border-border/70">
                <CommandItem
                  value={`${trimmed} create`}
                  className="text-[13px] text-[var(--sea-ink)]"
                  onSelect={() => {
                    onCreate?.(trimmed)
                    close()
                  }}
                >
                  <Plus className="size-3.5 text-muted-foreground" />
                  {createLabel?.(trimmed) ?? `Create “${trimmed}”`}
                </CommandItem>
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
