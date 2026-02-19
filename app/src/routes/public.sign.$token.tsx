import { createFileRoute } from '@tanstack/react-router'
import { PublicSigningPage } from '@/features/public-signing/components/PublicSigningPage'

export const Route = createFileRoute('/public/sign/$token')({
  component: PublicSignRoute,
})

function PublicSignRoute() {
  const { token } = Route.useParams()
  return <PublicSigningPage token={token} />
}
