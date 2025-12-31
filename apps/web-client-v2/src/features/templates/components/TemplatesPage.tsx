import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAppContextStore } from '@/stores/app-context-store'
import { TemplatesToolbar } from './TemplatesToolbar'
import { TemplateRow } from './TemplateRow'
import type { Template } from '../types'

// Mock data
const mockTemplates: Template[] = [
  {
    id: '1',
    name: 'Master Service Agreement (MSA)',
    status: 'PUBLISHED',
    version: 'v12',
    tags: ['#legal', '#standard'],
    author: { id: '1', name: 'John Doe', initials: 'JD' },
    createdAt: '2023-10-24',
    updatedAt: 'Oct 24, 2023',
  },
  {
    id: '2',
    name: 'Non-Disclosure Agreement (Standard)',
    status: 'PUBLISHED',
    version: 'v3',
    tags: ['#nda'],
    author: { id: '2', name: 'Alice Smith', initials: 'AS' },
    createdAt: '2023-11-02',
    updatedAt: 'Nov 02, 2023',
  },
  {
    id: '3',
    name: 'Employee Offer Letter 2024',
    status: 'DRAFT',
    version: 'v1',
    tags: ['#hr', '#internal'],
    author: { id: '3', name: 'Me', initials: 'ME', isCurrentUser: true },
    createdAt: '2023-11-15',
    updatedAt: 'Today, 10:42 AM',
  },
  {
    id: '4',
    name: 'Vendor Contract - Software Licensing',
    status: 'DRAFT',
    version: 'v4',
    tags: ['#procurement'],
    author: { id: '1', name: 'John Doe', initials: 'JD' },
    createdAt: '2023-11-14',
    updatedAt: 'Yesterday',
  },
  {
    id: '5',
    name: 'Privacy Policy - Global',
    status: 'PUBLISHED',
    version: 'v8',
    tags: ['#compliance', '#public'],
    author: { id: '2', name: 'Alice Smith', initials: 'AS' },
    createdAt: '2023-08-15',
    updatedAt: 'Aug 15, 2023',
  },
]

export function TemplatesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentWorkspace } = useAppContextStore()
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [searchQuery, setSearchQuery] = useState('')

  const handleCreateTemplate = () => {
    if (currentWorkspace) {
      navigate({
        to: '/workspace/$workspaceId/editor/$versionId',
        params: { workspaceId: currentWorkspace.id, versionId: 'new' },
      })
    }
  }

  const handleEditTemplate = (templateId: string) => {
    if (currentWorkspace) {
      navigate({
        to: '/workspace/$workspaceId/editor/$versionId',
        params: { workspaceId: currentWorkspace.id, versionId: templateId },
      })
    }
  }

  return (
    <div className="flex h-full flex-1 flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 px-8 pb-6 pt-12 md:px-16">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Management
            </div>
            <h1 className="font-display text-4xl font-light leading-tight tracking-tight text-foreground md:text-5xl">
              {t('templates.title', 'Template List')}
            </h1>
          </div>
          <button
            onClick={handleCreateTemplate}
            className="group flex h-12 items-center gap-2 rounded-none bg-foreground px-6 text-sm font-medium tracking-wide text-background shadow-lg shadow-muted transition-colors hover:bg-foreground/90"
          >
            <Plus size={20} />
            <span>CREATE NEW TEMPLATE</span>
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <TemplatesToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 pb-12 md:px-16">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-background">
            <tr>
              <th className="w-[35%] border-b border-border py-4 font-mono text-[10px] font-normal uppercase tracking-widest text-muted-foreground">
                Template Name
              </th>
              <th className="w-[10%] border-b border-border py-4 font-mono text-[10px] font-normal uppercase tracking-widest text-muted-foreground">
                Versions
              </th>
              <th className="w-[15%] border-b border-border py-4 font-mono text-[10px] font-normal uppercase tracking-widest text-muted-foreground">
                Status
              </th>
              <th className="w-[20%] border-b border-border py-4 font-mono text-[10px] font-normal uppercase tracking-widest text-muted-foreground">
                Last Modified
              </th>
              <th className="w-[15%] border-b border-border py-4 font-mono text-[10px] font-normal uppercase tracking-widest text-muted-foreground">
                Author
              </th>
              <th className="w-[5%] border-b border-border py-4 text-right font-mono text-[10px] font-normal uppercase tracking-widest text-muted-foreground">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="font-light">
            {mockTemplates.map((template) => (
              <TemplateRow
                key={template.id}
                template={template}
                onClick={() => handleEditTemplate(template.id)}
              />
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between py-8">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Showing 5 of 24 templates
          </div>
          <div className="flex gap-2">
            <button className="flex h-8 w-8 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-foreground hover:text-foreground">
              <ChevronLeft size={16} />
            </button>
            <button className="flex h-8 w-8 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-foreground hover:text-foreground">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
