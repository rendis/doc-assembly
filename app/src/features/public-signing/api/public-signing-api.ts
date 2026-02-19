import axios from 'axios'
import type {
  PreSigningFormData,
  FieldResponsePayload,
  SubmitPreSigningResponse,
} from '../types'

/**
 * Standalone Axios instance for public endpoints.
 * No auth interceptor -- these endpoints require no JWT.
 */
const BASE_PATH = (import.meta.env.VITE_BASE_PATH || '').replace(/\/$/, '')

const publicApi = axios.create({
  baseURL: `${BASE_PATH}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60_000,
})

export async function getPreSigningForm(
  token: string,
): Promise<PreSigningFormData> {
  const { data } = await publicApi.get<PreSigningFormData>(
    `/public/sign/${token}`,
  )
  return data
}

export async function submitPreSigningForm(
  token: string,
  responses: FieldResponsePayload[],
): Promise<SubmitPreSigningResponse> {
  const { data } = await publicApi.post<SubmitPreSigningResponse>(
    `/public/sign/${token}`,
    { responses },
  )
  return data
}
