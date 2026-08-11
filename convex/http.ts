import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { internal } from './_generated/api'

const http = httpRouter()

http.route({
  path: '/plaid/webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    let body: {
      webhook_type?: string
      webhook_code?: string
      item_id?: string
    }
    try {
      body = await request.json()
    } catch {
      return new Response('Invalid JSON', { status: 400 })
    }

    const webhookType = body.webhook_type
    const webhookCode = body.webhook_code
    const itemId = body.item_id

    if (!webhookType || !webhookCode || !itemId) {
      return new Response('Missing fields', { status: 400 })
    }

    // MVP: accept webhooks; production should verify Plaid JWT signature
    // via Plaid-Verification header once PLAID_WEBHOOK_VERIFICATION is set.
    await ctx.runAction(internal.plaidActions.handleWebhook, {
      webhookType,
      webhookCode,
      itemId,
    })

    return new Response(null, { status: 200 })
  }),
})

export default http
