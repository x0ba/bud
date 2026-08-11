import { SignIn } from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/sign-in')({
  component: SignInPage,
})

function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <p className="display-title text-3xl text-[var(--sea-ink)]">Bud</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Where does your money go?
          </p>
        </div>
        <SignIn routing="hash" forceRedirectUrl="/" />
      </div>
    </div>
  )
}
