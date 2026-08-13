import { SignIn } from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/sign-in')({
  component: SignInPage,
})

function SignInPage() {
  return (
    <div
      className="flex min-h-screen items-center justify-center p-6"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 80% 50% at 50% -10%, var(--hero-a), transparent), radial-gradient(ellipse 60% 40% at 80% 100%, var(--hero-b), transparent)',
      }}
    >
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <p className="display-title text-3xl tracking-tight text-[var(--sea-ink)]">
            Bud
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Where does your money go?
          </p>
        </div>
        <SignIn routing="hash" forceRedirectUrl="/app" />
      </div>
    </div>
  )
}
