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
