export type TemplateStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export interface Template {
  id: string
  name: string
  description?: string
  status: TemplateStatus
  version: string
  folderId?: string
  tags: string[]
  author: {
    id: string
    name: string
    initials: string
    isCurrentUser?: boolean
  }
  createdAt: string
  updatedAt: string
}

export interface TemplateVersion {
  id: string
  templateId: string
  version: string
  content: string
  createdAt: string
  createdBy: string
}

export interface TemplateFolder {
  id: string
  name: string
  parentId?: string
  createdAt: string
}

export interface TemplateTag {
  id: string
  name: string
  color?: string
}
