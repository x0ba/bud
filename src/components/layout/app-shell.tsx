import HeaderUser from '#/integrations/clerk/header-user'
import { AppSidebar } from './app-sidebar'

export function AppShell({
  children,
  title,
  actions,
}: {
  children: React.ReactNode
  title?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border/80 px-6">
          <div className="min-w-0">
            {title ? (
              <h1 className="truncate text-[15px] font-semibold tracking-tight text-[var(--sea-ink)]">
                {title}
              </h1>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            {actions}
            <HeaderUser />
          </div>
        </header>
        <main className="flex-1 overflow-auto px-6 py-5">{children}</main>
      </div>
    </div>
  )
}
