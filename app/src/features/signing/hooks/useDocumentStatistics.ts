import { useQuery } from '@tanstack/react-query'
import { signingApi } from '../api/signing-api'
import { signingKeys } from './useSigningDocuments'

export function useDocumentStatistics() {
  return useQuery({
    queryKey: signingKeys.statistics(),
    queryFn: () => signingApi.getStatistics(),
  })
}
