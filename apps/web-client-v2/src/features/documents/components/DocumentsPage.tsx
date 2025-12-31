import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DocumentsToolbar } from './DocumentsToolbar'
import { Breadcrumb } from './Breadcrumb'
import { FolderCard } from './FolderCard'
import { DocumentCard } from './DocumentCard'
import type { DocumentStatus } from '../types'

// Mock data
const mockFolders = [
  { id: '1', name: 'Contracts', itemCount: 12 },
  { id: '2', name: 'Invoices', itemCount: 8 },
  { id: '3', name: 'Archived', itemCount: 24 },
]

const mockDocuments: {
  name: string
  type: DocumentStatus
  size: string
  date: string
}[] = [
  { name: 'Acme_MSA_Executed.pdf', type: 'FINALIZED', size: '2.4 MB', date: 'Oct 24, 2023' },
  { name: 'Offer_Letter_Draft_v2.docx', type: 'DRAFT', size: '145 KB', date: '2 hours ago' },
  { name: 'NDA_Standard_Signed.pdf', type: 'FINALIZED', size: '890 KB', date: 'Yesterday' },
  { name: 'Memo_Internal_Policy.docx', type: 'DRAFT', size: '55 KB', date: 'Aug 15, 2023' },
]

export function DocumentsPage() {
  const { t } = useTranslation()
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid')
  const [searchQuery, setSearchQuery] = useState('')

  const breadcrumbItems = [
    { label: 'Documents' },
    { label: 'Client Matter' },
    { label: 'Acme Corp 2024', isActive: true },
  ]

  return (
    <div className="flex h-full flex-1 flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 px-8 pb-6 pt-12 md:px-16">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Repository
            </div>
            <h1 className="font-display text-4xl font-light leading-tight tracking-tight text-foreground md:text-5xl">
              {t('documents.title', 'Document Explorer')}
            </h1>
          </div>
          <button className="group flex h-12 items-center gap-2 rounded-none border border-foreground bg-background px-6 text-sm font-medium tracking-wide text-foreground shadow-none transition-colors hover:bg-foreground hover:text-background">
            <span className="text-xl leading-none">+</span>
            <span>NEW FOLDER</span>
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <DocumentsToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 pb-12 md:px-16">
        <Breadcrumb items={breadcrumbItems} />

        {/* Subfolders */}
        <div className="mb-10">
          <h2 className="mb-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Subfolders
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {mockFolders.map((folder) => (
              <FolderCard
                key={folder.id}
                name={folder.name}
                itemCount={folder.itemCount}
              />
            ))}
          </div>
        </div>

        {/* Documents */}
        <div>
          <h2 className="mb-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Documents
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {mockDocuments.map((doc, i) => (
              <DocumentCard
                key={i}
                name={doc.name}
                type={doc.type}
                size={doc.size}
                date={doc.date}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
