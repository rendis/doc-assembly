/**
 * Types for the public pre-signing page.
 *
 * These mirror the backend DTO returned by GET /public/sign/:token
 * and the request body for POST /public/sign/:token.
 */

export interface InteractiveFieldOption {
  id: string
  label: string
}

export interface InteractiveFieldDefinition {
  id: string
  fieldType: 'checkbox' | 'radio' | 'text'
  roleId: string
  label: string
  required: boolean
  options: InteractiveFieldOption[]
  placeholder: string
  maxLength: number
}

export interface SignerInfo {
  name: string
  email: string
  roleId: string
  roleName: string
}

export interface PreSigningFormData {
  documentTitle: string
  operatorName: string
  signer: SignerInfo
  /** ProseMirror JSON document content with injectors already resolved */
  content: Record<string, unknown>
  /** Interactive field definitions that belong to THIS signer */
  fields: InteractiveFieldDefinition[]
  /** All interactive field definitions (including other roles) */
  allFields: InteractiveFieldDefinition[]
}

export interface FieldResponsePayload {
  fieldId: string
  fieldType: string
  response: {
    selectedOptionIds?: string[]
    text?: string
  }
}

export interface SubmitPreSigningResponse {
  signingUrl: string
}

/**
 * Local form state: tracks the user's responses to each field.
 */
export type FieldResponses = Record<
  string,
  {
    fieldType: string
    response: { selectedOptionIds?: string[]; text?: string }
  }
>
