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
    <div className="flex min-h-screen bg-background text-foreground">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col [view-transition-name:app-main]">
        <header className="sticky top-0 z-10 flex h-12 items-center justify-between bg-background/85 px-8 backdrop-blur-md">
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
        <main className="flex-1 overflow-auto px-8 pt-1 pb-10">{children}</main>
      </div>
    </div>
  )
}
