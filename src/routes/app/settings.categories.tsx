import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { CategoryDot, DataList, EmptyState } from '#/components/dense'
import { Page, PageBody, PageSummary, Panel } from '#/components/panel'
import { AppShell } from '#/components/layout/app-shell'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { prewarmQueries } from '#/lib/prewarm'

export const Route = createFileRoute('/app/settings/categories')({
  loader: () => {
    prewarmQueries({ query: api.categories.list })
  },
  component: CategoriesPage,
})

type Category = FunctionReturnType<typeof api.categories.list>[number]
type BudgetType = Category['budgetType']
type Group = { parent: Category; children: Array<Category> }

/** One composer at a time — type/parent are implied by where it opens. */
type Composer =
  | { kind: 'root'; type: BudgetType }
  | {
      kind: 'child'
      parentId: Id<'categories'>
      type: BudgetType
      color: string
    }

/**
 * Budget type is the page's organizing axis, so it becomes a section instead of
 * a word repeated on every row. Order is what you spend first, then what comes
 * in, then account plumbing last.
 */
const SECTIONS: Array<{
  type: BudgetType
  title: string
  description: string
  /** Seed colour for new top-level categories in this section. */
  defaultColor: string
}> = [
  {
    type: 'flex',
    title: 'Flex',
    description:
      'Everyday spending that moves around. Budgeted together as one monthly pool.',
    defaultColor: '#c27803',
  },
  {
    type: 'fixed',
    title: 'Fixed',
    description: 'Roughly the same every month. Each gets its own budget line.',
    defaultColor: '#328f97',
  },
  {
    type: 'non_monthly',
    title: 'Non-monthly',
    description: 'Irregular and seasonal — travel, gifts, annual bills.',
    defaultColor: '#0d9488',
  },
  {
    type: 'income',
    title: 'Income',
    description: 'Money coming in. Never counted as spending.',
    defaultColor: '#2f6a4a',
  },
  {
    type: 'transfer',
    title: 'Transfers',
    description: 'Moves between your own accounts. Never counted as spending.',
    defaultColor: '#6b7280',
  },
]

function CategoriesPage() {
  const categories = useQuery(api.categories.list)
  const create = useMutation(api.categories.create)

  const [query, setQuery] = useState('')
  const [composer, setComposer] = useState<Composer | null>(null)

  /**
   * Parents carry their children so each block renders as one unit, and each
   * section carries its own total so the header answers "how big is this
   * chunk?" before you read any of it.
   */
  const model = useMemo(() => {
    if (!categories) return null
    const ids = new Set<string>(categories.map((c) => c._id))
    const childrenOf = new Map<string, Array<Category>>()
    const roots: Array<Category> = []

    for (const c of categories) {
      // A child whose parent is gone would otherwise vanish from the page.
      if (c.parentId && ids.has(c.parentId)) {
        const siblings = childrenOf.get(c.parentId)
        if (siblings) siblings.push(c)
        else childrenOf.set(c.parentId, [c])
      } else {
        roots.push(c)
      }
    }

    const q = query.trim().toLowerCase()
    const matches = (c: Category) => c.name.toLowerCase().includes(q)
    const filtering = q !== ''

    const sections = SECTIONS.map((section) => {
      const groups: Array<Group> = []
      for (const parent of roots) {
        if (parent.budgetType !== section.type) continue
        const all = childrenOf.get(parent._id) ?? []
        // Matching a parent keeps its whole group intact for context.
        const parentHit = !filtering || matches(parent)
        const children = parentHit ? all : all.filter(matches)
        if (!parentHit && children.length === 0) continue
        groups.push({ parent, children })
      }
      return { ...section, groups }
    }).filter((section) => !filtering || section.groups.length > 0)

    return { roots, sections, filtering }
  }, [categories, query])

  if (!categories || !model) {
    return <AppShell title="Categories" />
  }

  const submit = (name: string) => {
    if (!composer) return
    const trimmed = name.trim()
    if (!trimmed) return

    const parentId = composer.kind === 'child' ? composer.parentId : undefined
    const color =
      composer.kind === 'child' ? composer.color : sectionColor(composer.type)

    void create({
      name: trimmed,
      icon: 'tag',
      color,
      parentId,
      budgetType: composer.type,
    })
      .then(() => {
        setComposer(null)
        // A filter that excludes the new category would hide it on arrival.
        setQuery('')
        toast.success(`${trimmed} added`)
      })
      .catch((e: Error) => toast.error(e.message))
  }

  return (
    <AppShell title="Categories">
      <Page>
        <PageSummary className="sm:items-center">
          <p className="max-w-md text-[13px] text-muted-foreground text-pretty">
            Every category has a type, and the type decides how it’s budgeted.
          </p>
          <div className="relative sm:w-[220px]">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter categories"
              aria-label="Filter categories"
              className="pl-8"
            />
          </div>
        </PageSummary>

        {categories.length === 0 ? (
          <EmptyState
            title="No categories yet"
            description="Categories organize your spending and drive the budget. Add your first one in a section below."
          />
        ) : null}

        <PageBody>
          {model.sections.map((section) => {
            const rootOpen =
              composer?.kind === 'root' && composer.type === section.type
            return (
              <Panel
                key={section.type}
                id={`categories-${section.type}`}
                span={4}
                title={section.title}
                description={section.description}
                flush
                action={
                  <Button
                    variant="ghost"
                    size="xs"
                    aria-expanded={rootOpen}
                    onClick={() =>
                      setComposer(
                        rootOpen ? null : { kind: 'root', type: section.type },
                      )
                    }
                  >
                    <Plus />
                    Add
                  </Button>
                }
              >
                <DataList>
                  {rootOpen ? (
                    <li className="py-2">
                      <InlineComposer
                        placeholder={`New ${section.title.toLowerCase()} category`}
                        onSubmit={submit}
                        onCancel={() => setComposer(null)}
                      />
                    </li>
                  ) : null}

                  {section.groups.map((group) => {
                    const childOpen =
                      composer?.kind === 'child' &&
                      composer.parentId === group.parent._id
                    return (
                      <CategoryGroup
                        key={group.parent._id}
                        group={group}
                        childOpen={childOpen}
                        onAddChild={() =>
                          setComposer(
                            childOpen
                              ? null
                              : {
                                  kind: 'child',
                                  parentId: group.parent._id,
                                  type: group.parent.budgetType,
                                  color: group.parent.color,
                                },
                          )
                        }
                        onCancelChild={() => setComposer(null)}
                        onSubmitChild={submit}
                      />
                    )
                  })}

                  {section.groups.length === 0 && !rootOpen ? (
                    <li className="py-3 text-[13px] text-muted-foreground">
                      Nothing here yet — use Add above.
                    </li>
                  ) : null}
                </DataList>
              </Panel>
            )
          })}
        </PageBody>

        {categories.length > 0 && model.sections.length === 0 ? (
          <div className="border-t border-border/70 py-10 text-center">
            <p className="text-[13px] text-muted-foreground">
              Nothing matches “{query.trim()}”.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setQuery('')}
            >
              Clear filter
            </Button>
          </div>
        ) : null}
      </Page>
    </AppShell>
  )
}

function sectionColor(type: BudgetType): string {
  return SECTIONS.find((s) => s.type === type)?.defaultColor ?? '#3d7a72'
}

/**
 * One list item = one category family. Parent and children share a single
 * hairline so the eye jumps family → family, not past every subcategory.
 * Nesting is weight + indent only — no rails.
 */
function CategoryGroup({
  group,
  childOpen,
  onAddChild,
  onCancelChild,
  onSubmitChild,
}: {
  group: Group
  childOpen: boolean
  onAddChild: () => void
  onCancelChild: () => void
  onSubmitChild: (name: string) => void
}) {
  const { parent, children } = group
  return (
    <li className="group py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <CategoryDot color={parent.color} />
          <span className="truncate text-[13px] font-medium text-[var(--sea-ink)]">
            {parent.name}
          </span>
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Add under ${parent.name}`}
          aria-expanded={childOpen}
          onClick={onAddChild}
          data-visible={childOpen || undefined}
          className="row-action text-muted-foreground"
        >
          <Plus />
        </Button>
      </div>
      {children.length > 0 ? (
        <ul className="mt-1 space-y-0.5 pl-5">
          {children.map((child) => (
            <li
              key={child._id}
              className="truncate text-[12px] leading-5 text-muted-foreground"
            >
              {child.name}
            </li>
          ))}
        </ul>
      ) : null}
      {childOpen ? (
        <div className="mt-2 pl-5">
          <InlineComposer
            placeholder={`Under ${parent.name}`}
            onSubmit={onSubmitChild}
            onCancel={onCancelChild}
          />
        </div>
      ) : null}
    </li>
  )
}

/** Name-only composer — type and parent are decided by where it opened. */
function InlineComposer({
  placeholder,
  onSubmit,
  onCancel,
}: {
  placeholder: string
  onSubmit: (name: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ref.current?.focus()
  }, [])

  return (
    <div className="rise-in flex flex-wrap items-center gap-2">
      <Input
        ref={ref}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 sm:w-[200px] sm:flex-none"
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit(name)
          if (e.key === 'Escape') onCancel()
        }}
      />
      <Button
        size="sm"
        disabled={name.trim() === ''}
        onClick={() => onSubmit(name)}
      >
        Add
      </Button>
      <Button variant="ghost" size="sm" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  )
}
