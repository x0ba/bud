import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../../convex/_generated/api'
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
import { Skeleton } from '#/components/ui/skeleton'

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
      {!categories ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          <ul className="divide-y divide-border/70 border-y border-border/70">
            {categories.map((c) => (
              <li
                key={c._id}
                className="flex items-center justify-between py-2.5 text-[13px]"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: c.color }}
                  />
                  <span className={c.parentId ? 'pl-3 text-muted-foreground' : 'font-medium'}>
                    {c.name}
                  </span>
                </span>
                <span className="text-[12px] text-muted-foreground capitalize">
                  {c.budgetType.replace('_', ' ')}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2">
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
              onClick={() => {
                if (!name.trim()) return
                void create({
                  name: name.trim(),
                  icon: 'tag',
                  color: '#328f97',
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
        </div>
      )}
    </AppShell>
  )
}
