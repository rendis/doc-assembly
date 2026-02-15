import { useQuery } from '@tanstack/react-query'
import { signingApi } from '../api/signing-api'
import { signingKeys } from './useSigningDocuments'

export function useDocumentEvents(docId: string) {
  return useQuery({
    queryKey: signingKeys.events(docId),
    queryFn: () => signingApi.getEvents(docId),
    enabled: !!docId,
  })
}
