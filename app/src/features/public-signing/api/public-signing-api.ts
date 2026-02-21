import axios from 'axios'
import type {
  PublicSigningResponse,
  FieldResponsePayload,
  DocumentAccessInfo,
} from '../types'

/**
 * Standalone Axios instance for public endpoints.
 * No auth interceptor -- these endpoints require no JWT.
 * Base path does NOT include /api/v1 since public signing routes are at /public/sign/:token.
 */
const BASE_PATH = (import.meta.env.VITE_BASE_PATH || '').replace(/\/$/, '')

const publicApi = axios.create({
  baseURL: BASE_PATH,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60_000,
})

export async function getPublicSigningPage(
  token: string,
): Promise<PublicSigningResponse> {
  const { data } = await publicApi.get<PublicSigningResponse>(
    `/public/sign/${token}`,
  )
  return data
}

export async function submitPreSigningForm(
  token: string,
  responses: FieldResponsePayload[],
): Promise<PublicSigningResponse> {
  const { data } = await publicApi.post<PublicSigningResponse>(
    `/public/sign/${token}`,
    { responses },
  )
  return data
}

export async function proceedToSigning(
  token: string,
): Promise<PublicSigningResponse> {
  const { data } = await publicApi.post<PublicSigningResponse>(
    `/public/sign/${token}/proceed`,
  )
  return data
}

export async function completeEmbeddedSigning(
  token: string,
): Promise<void> {
  await publicApi.post(`/public/sign/${token}/complete`)
}

export async function fetchPreviewPDF(
  token: string,
): Promise<ArrayBuffer> {
  const { data } = await publicApi.get(`/public/sign/${token}/pdf`, {
    responseType: 'arraybuffer',
  })
  return data
}

export async function refreshEmbeddedUrl(
  token: string,
): Promise<PublicSigningResponse> {
  const { data } = await publicApi.get<PublicSigningResponse>(
    `/public/sign/${token}/refresh`,
  )
  return data
}

export async function getDocumentAccessInfo(
  documentId: string,
): Promise<DocumentAccessInfo> {
  const { data } = await publicApi.get<DocumentAccessInfo>(
    `/public/doc/${documentId}`,
  )
  return data
}

export async function requestDocumentAccess(
  documentId: string,
  email: string,
): Promise<{ message: string }> {
  const { data } = await publicApi.post<{ message: string }>(
    `/public/doc/${documentId}/request-access`,
    { email },
  )
  return data
}
