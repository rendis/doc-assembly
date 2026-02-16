import type { PortableDocument } from '../../types/document-format'

export type ImportTab = 'file' | 'paste'

export interface ImportDocumentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (doc: PortableDocument) => void
}

export interface TabProps {
  onDocumentReady: (doc: PortableDocument | null, error?: string) => void
}
