import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { api } from '../../../convex/_generated/api'
import { DataList, PageFrame } from '#/components/dense'
import { AppShell } from '#/components/layout/app-shell'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/_app/settings/rules')({
  component: RulesPage,
})

function RulesPage() {
  const rules = useQuery(api.rules.list)
  const remove = useMutation(api.rules.remove)
  const setActive = useMutation(api.rules.setActive)

  return (
    <AppShell title="Rules">
      {rules ? (
        <PageFrame width="sm">
          <p className="text-[13px] text-muted-foreground text-pretty">
            Rules are created when you recategorize a transaction and choose
            “Always categorize…”. Most-specific match wins.
          </p>
          <DataList>
            {rules.map((r) => (
              <li
                key={r._id}
                className="flex items-start justify-between gap-3 py-3 text-[13px]"
              >
                <div className="min-w-0 space-y-1.5">
                  <p className="font-medium text-[var(--sea-ink)] text-pretty">
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
                <div className="flex shrink-0 gap-1.5">
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
              <li className="py-8 text-center text-[13px] text-muted-foreground">
                No rules yet. Recategorize a transaction to create one.
              </li>
            ) : null}
          </DataList>
        </PageFrame>
      ) : null}
    </AppShell>
  )
}
