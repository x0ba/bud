const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com'

function readPublicEnv(
  name: 'VITE_PUBLIC_POSTHOG_PROJECT_TOKEN' | 'VITE_PUBLIC_POSTHOG_HOST',
): string {
  const fromVite = import.meta.env[name] as string | undefined
  const fromProcess =
    typeof process !== 'undefined' ? process.env[name] : undefined
  return (fromVite || fromProcess || '').trim()
}

export function getPostHogProjectToken(): string {
  return readPublicEnv('VITE_PUBLIC_POSTHOG_PROJECT_TOKEN')
}

export function getPostHogHost(): string {
  return readPublicEnv('VITE_PUBLIC_POSTHOG_HOST') || DEFAULT_POSTHOG_HOST
}

export function isPostHogConfigured(): boolean {
  return getPostHogProjectToken().length > 0
}
