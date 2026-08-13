import { useAction, useMutation } from 'convex/react'
import { useCallback, useEffect, useState } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { toast } from 'sonner'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { Button } from '#/components/ui/button'

export function PlaidLinkButton({
  label = 'Connect account',
  itemId,
  variant = 'default',
  size = 'default',
}: {
  label?: string
  itemId?: Id<'plaidItems'>
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  size?: 'default' | 'sm' | 'xs'
}) {
  const ensureReady = useMutation(api.users.ensureReady)
  const createLinkToken = useAction(api.plaidActions.createLinkToken)
  const createUpdateLinkToken = useAction(api.plaidActions.createUpdateLinkToken)
  const exchangePublicToken = useAction(api.plaidActions.exchangePublicToken)
  const syncItem = useAction(api.plaidActions.syncItemForUser)
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSuccess = useCallback(
    async (
      publicToken: string | null,
      metadata: {
        institution: { institution_id: string; name: string } | null
      },
    ) => {
      try {
        if (itemId) {
          // Update mode (re-auth / extra products) often returns a null token.
          await syncItem({ itemId })
          toast.success('Connection updated — syncing…')
          return
        }
        if (!publicToken) {
          toast.error('Plaid did not return a token')
          return
        }
        await exchangePublicToken({
          publicToken,
          institutionId: metadata.institution?.institution_id,
          institutionName: metadata.institution?.name ?? 'Institution',
        })
        toast.success('Accounts connected — syncing…')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to connect')
      } finally {
        setLinkToken(null)
      }
    },
    [exchangePublicToken, itemId, syncItem],
  )

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit: () => setLinkToken(null),
  })

  useEffect(() => {
    if (linkToken && ready) open()
  }, [linkToken, ready, open])

  const start = async () => {
    setLoading(true)
    try {
      await ensureReady({})
      const res = itemId
        ? await createUpdateLinkToken({ itemId })
        : await createLinkToken({})
      setLinkToken(res.linkToken)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not start Plaid Link',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      disabled={loading}
      onClick={() => void start()}
    >
      {loading ? 'Starting…' : label}
    </Button>
  )
}
