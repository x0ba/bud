import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { api } from '../../../convex/_generated/api'
import { AppShell } from '#/components/layout/app-shell'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'

export const Route = createFileRoute('/_app/settings/rules')({
  component: RulesPage,
})

function RulesPage() {
  const rules = useQuery(api.rules.list)
  const remove = useMutation(api.rules.remove)
  const setActive = useMutation(api.rules.setActive)

  return (
    <AppShell title="Rules">
      {!rules ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="mx-auto max-w-2xl">
          <p className="mb-4 text-sm text-muted-foreground">
            Rules are created when you recategorize a transaction and choose
            “Always categorize…”. Most-specific match wins.
          </p>
          <ul className="divide-y divide-border/70 border-y border-border/70">
            {rules.map((r) => (
              <li
                key={r._id}
                className="flex items-start justify-between gap-3 py-3 text-[13px]"
              >
                <div className="space-y-1">
                  <p className="font-medium">
                    {r.matcher.merchantName
                      ? `Merchant is “${r.matcher.merchantName}”`
                      : r.matcher.descriptionContains
                        ? `Description contains “${r.matcher.descriptionContains}”`
                        : 'Custom matcher'}
                    {' → '}
                    {r.categoryName}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{r.createdFrom}</Badge>
                    <Badge variant="outline">
                      applied {r.timesApplied}×
                    </Badge>
                    {!r.isActive ? (
                      <Badge variant="destructive">paused</Badge>
                    ) : null}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void setActive({
                        ruleId: r._id,
                        isActive: !r.isActive,
                      })
                    }
                  >
                    {r.isActive ? 'Pause' : 'Resume'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void remove({ ruleId: r._id }).then(() =>
                        toast.success('Rule deleted'),
                      )
                    }
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
            {rules.length === 0 ? (
              <li className="py-8 text-center text-sm text-muted-foreground">
                No rules yet. Recategorize a transaction to create one.
              </li>
            ) : null}
          </ul>
        </div>
      )}
    </AppShell>
  )
}
