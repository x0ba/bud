import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid'

export function getPlaidClient() {
  const env = (process.env.PLAID_ENV ?? 'sandbox') as keyof typeof PlaidEnvironments
  const clientId = process.env.PLAID_CLIENT_ID
  const secret = process.env.PLAID_SECRET

  if (!clientId || !secret) {
    throw new Error('Missing PLAID_CLIENT_ID or PLAID_SECRET')
  }

  const configuration = new Configuration({
    basePath: PlaidEnvironments[env] ?? PlaidEnvironments.sandbox,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': clientId,
        'PLAID-SECRET': secret,
      },
    },
  })

  return new PlaidApi(configuration)
}

export function getPlaidWebhookUrl(): string | undefined {
  const site = process.env.CONVEX_SITE_URL ?? process.env.PLAID_WEBHOOK_URL
  if (!site) return undefined
  return `${site.replace(/\/$/, '')}/plaid/webhook`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Plaid's Node SDK wraps API errors in Axios; the code lives on `response.data`. */
export function plaidErrorCode(err: unknown): string | undefined {
  if (!isRecord(err)) return undefined
  if (typeof err.error_code === 'string') return err.error_code
  if (!isRecord(err.response) || !isRecord(err.response.data)) return undefined
  const code = err.response.data.error_code
  return typeof code === 'string' ? code : undefined
}

export function isPlaidLoginRequired(err: unknown): boolean {
  const code = plaidErrorCode(err)
  if (code === 'ITEM_LOGIN_REQUIRED') return true
  const message = err instanceof Error ? err.message : ''
  return message.includes('ITEM_LOGIN_REQUIRED')
}
