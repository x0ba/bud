import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../../convex/_generated/api'
import { CategoryDot, DataList, PageFrame } from '#/components/dense'
import { AppShell } from '#/components/layout/app-shell'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'

export const Route = createFileRoute('/_app/settings/categories')({
  component: CategoriesPage,
})

function CategoriesPage() {
  const categories = useQuery(api.categories.list)
  const create = useMutation(api.categories.create)
  const [name, setName] = useState('')
  const [budgetType, setBudgetType] = useState<
    'fixed' | 'flex' | 'non_monthly'
  >('flex')

  return (
    <AppShell title="Categories">
      {categories ? (
        <PageFrame width="sm" className="gap-6">
          <DataList>
            {categories.map((c) => (
              <li key={c._id} className="data-row">
                <span className="flex items-center gap-2">
                  <CategoryDot color={c.color} className="size-2.5" />
                  <span
                    className={
                      c.parentId
                        ? 'pl-3 text-muted-foreground'
                        : 'font-medium text-[var(--sea-ink)]'
                    }
                  >
                    {c.name}
                  </span>
                </span>
                <span className="text-[12px] text-muted-foreground capitalize">
                  {c.budgetType.replace('_', ' ')}
                </span>
              </li>
            ))}
          </DataList>

          <div className="toolbar">
            <Input
              placeholder="New category"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-[200px]"
            />
            <Select
              value={budgetType}
              onValueChange={(v) => setBudgetType(v as typeof budgetType)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed</SelectItem>
                <SelectItem value="flex">Flex</SelectItem>
                <SelectItem value="non_monthly">Non-monthly</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={() => {
                if (!name.trim()) return
                void create({
                  name: name.trim(),
                  icon: 'tag',
                  color: '#3d7a72',
                  budgetType,
                }).then(() => {
                  setName('')
                  toast.success('Category created')
                })
              }}
            >
              Add
            </Button>
          </div>
        </PageFrame>
      ) : null}
    </AppShell>
  )
}
