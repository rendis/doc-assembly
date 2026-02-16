// Document statuses matching backend
export const SigningDocumentStatus = {
  DRAFT: 'DRAFT',
  PENDING_PROVIDER: 'PENDING_PROVIDER',
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  DECLINED: 'DECLINED',
  VOIDED: 'VOIDED',
  EXPIRED: 'EXPIRED',
  ERROR: 'ERROR',
} as const
export type SigningDocumentStatus = (typeof SigningDocumentStatus)[keyof typeof SigningDocumentStatus]

// Recipient statuses
export const RecipientStatus = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  SIGNED: 'SIGNED',
  DECLINED: 'DECLINED',
} as const
export type RecipientStatus = (typeof RecipientStatus)[keyof typeof RecipientStatus]

export interface SigningRecipient {
  id: string
  roleId: string
  roleName: string
  name: string
  email: string
  status: RecipientStatus
  signerOrder?: number
  signedAt?: string
  createdAt: string
  updatedAt: string
}

export interface SigningDocumentListItem {
  id: string
  workspaceId: string
  templateVersionId: string
  title: string
  clientExternalReferenceId?: string
  signerProvider?: string
  status: SigningDocumentStatus
  createdAt: string
  updatedAt: string
}

export interface SigningDocumentDetail extends SigningDocumentListItem {
  recipients: SigningRecipient[]
}

export interface CreateDocumentRequest {
  templateVersionId: string
  title: string
  clientExternalReferenceId?: string
  injectedValues: Record<string, unknown>
  recipients: DocumentRecipientCommand[]
}

export interface DocumentRecipientCommand {
  roleId: string
  name: string
  email: string
}

export interface DocumentStatistics {
  total: number
  pending: number
  inProgress: number
  completed: number
  declined: number
  byStatus: Record<string, number>
}

export interface DocumentEvent {
  id: string
  documentId: string
  eventType: string
  actorType: string
  actorId?: string
  oldStatus?: string
  newStatus?: string
  recipientId?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface SigningURLResponse {
  signingUrl: string
  expiresAt?: string
}

export interface DocumentListFilters {
  status?: string
  search?: string
  page?: number
  pageSize?: number
}
