import { galleryApi } from '../api/gallery-api'

const storageImageSrcCache = new Map<string, string>()
const storageImagePendingCache = new Map<string, Promise<string>>()

export function isStorageImageSrc(src: string | null | undefined): src is string {
  return typeof src === 'string' && src.startsWith('storage://')
}

export function storageImageKeyFromSrc(src: string): string {
  return src.slice('storage://'.length)
}

export function resolveStorageImageSrc(src: string): Promise<string> {
  if (!isStorageImageSrc(src)) {
    return Promise.resolve(src)
  }

  const key = storageImageKeyFromSrc(src)
  const cached = storageImageSrcCache.get(key)
  if (cached) {
    return Promise.resolve(cached)
  }

  const pending = storageImagePendingCache.get(key)
  if (pending) {
    return pending
  }

  const request = galleryApi.getSrc(key)
    .then((url) => {
      storageImageSrcCache.set(key, url)
      storageImagePendingCache.delete(key)
      return url
    })
    .catch((error) => {
      storageImagePendingCache.delete(key)
      throw error
    })

  storageImagePendingCache.set(key, request)
  return request
}
