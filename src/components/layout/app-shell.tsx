import HeaderUser from '#/integrations/clerk/header-user'
import { AppSidebar } from './app-sidebar'

export function AppShell({
  children,
  title,
  actions,
}: {
  children?: React.ReactNode
  title?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <AppSidebar />
      <div className="min-w-0 flex-1 [view-transition-name:app-main]">
        <header className="app-shell-header">
          <div className="min-w-0">
            {title ? (
              <h1 className="truncate text-[15px] font-semibold tracking-tight text-[var(--sea-ink)]">
                {title}
              </h1>
            ) : null}
          </div>
          <div className="flex items-center gap-2.5">
            {actions}
            <HeaderUser />
          </div>
        </header>
        <main className="px-8 pt-4 pb-10">{children}</main>
      </div>
    </div>
  )
}
