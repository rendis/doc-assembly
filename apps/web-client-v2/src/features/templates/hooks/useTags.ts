import { useQuery } from '@tanstack/react-query'
import { fetchTags } from '../api/tags-api'

export const tagKeys = {
  all: ['tags'] as const,
  list: () => [...tagKeys.all, 'list'] as const,
}

export function useTags() {
  return useQuery({
    queryKey: tagKeys.list(),
    queryFn: fetchTags,
    staleTime: 5 * 60 * 1000, // 5 min cache (tags don't change frequently)
  })
}
