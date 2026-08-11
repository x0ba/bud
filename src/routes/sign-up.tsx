import { SignUp } from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/sign-up')({
  component: SignUpPage,
})

function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <p className="display-title text-3xl text-[var(--sea-ink)]">Bud</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Start tracking with clarity.
          </p>
        </div>
        <SignUp routing="hash" forceRedirectUrl="/" />
      </div>
    </div>
  )
}
