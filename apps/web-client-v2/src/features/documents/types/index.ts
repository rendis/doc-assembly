export type DocumentStatus = 'DRAFT' | 'FINALIZED' | 'ARCHIVED'

export interface Document {
  id: string
  name: string
  type: DocumentStatus
  size: string
  createdAt: string
  updatedAt: string
  folderId?: string
}

export interface Folder {
  id: string
  name: string
  parentId?: string
  itemCount: number
  createdAt: string
}
