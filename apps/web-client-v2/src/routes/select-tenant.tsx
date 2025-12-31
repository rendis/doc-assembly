import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Search, Box, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useAppContextStore, type TenantWithRole, type WorkspaceWithRole } from '@/stores/app-context-store'
import { useMyTenants, useSearchTenants } from '@/features/tenants'
import { useWorkspaces } from '@/features/workspaces'
import { recordAccess } from '@/features/auth'

export const Route = createFileRoute('/select-tenant')({
  component: SelectTenantPage,
})

const containerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 },
  },
}

const itemVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 },
  },
}

const ITEMS_PER_PAGE = 5
const LIST_MIN_HEIGHT = 400 // Fixed height to prevent layout shifts

function PaginationControls({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between py-6">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground/50 transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronLeft size={14} />
        <span>Previous</span>
      </button>

      <span className="font-mono text-xs text-muted-foreground/50">
        Page {page} / {totalPages}
      </span>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground/50 transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
      >
        <span>Next</span>
        <ChevronRight size={14} />
      </button>
    </div>
  )
}

function LoadingDots() {
  const [dots, setDots] = useState('')

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'))
    }, 400)
    return () => clearInterval(interval)
  }, [])

  return <span className="inline-block w-6 text-left">{dots}</span>
}

function formatRelativeTime(isoDate: string | null | undefined): string {
  if (!isoDate) return 'Never'

  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  const diffWeeks = Math.floor(diffDays / 7)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`
}

function SelectTenantPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { setCurrentTenant, setCurrentWorkspace, currentTenant } = useAppContextStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTenant, setSelectedTenant] = useState<TenantWithRole | null>(
    currentTenant as TenantWithRole | null
  )
  const [tenantPage, setTenantPage] = useState(1)
  const [workspacePage, setWorkspacePage] = useState(1)
  const [tenantTotalPages, setTenantTotalPages] = useState(1)
  const [workspaceTotalPages, setWorkspaceTotalPages] = useState(1)

  // Fetch tenants
  const { data: tenantsData, isLoading: isLoadingTenants } = useMyTenants(tenantPage, ITEMS_PER_PAGE)
  const { data: searchData, isLoading: isSearching } = useSearchTenants(searchQuery)

  // Fetch workspaces for selected tenant (only when a tenant is selected)
  const { data: workspacesData, isLoading: isLoadingWorkspaces } = useWorkspaces(selectedTenant?.id ?? null, workspacePage, ITEMS_PER_PAGE)

  // Pagination metadata
  const tenantPagination = tenantsData?.pagination
  const workspacePagination = workspacesData?.pagination

  // Minimum loading time state
  const [minLoadingComplete, setMinLoadingComplete] = useState(false)

  // Start minimum loading timer on mount and when context changes
  useEffect(() => {
    setMinLoadingComplete(false)
    const timer = setTimeout(() => setMinLoadingComplete(true), 1000)
    return () => clearTimeout(timer)
  }, [selectedTenant])

  // Reset workspace page and total pages when tenant changes
  useEffect(() => {
    setWorkspacePage(1)
    setWorkspaceTotalPages(1)
  }, [selectedTenant?.id])

  // Reset tenant page when search changes
  useEffect(() => {
    setTenantPage(1)
  }, [searchQuery])

  // Update total pages when data arrives
  useEffect(() => {
    if (tenantPagination?.totalPages) {
      setTenantTotalPages(tenantPagination.totalPages)
    }
  }, [tenantPagination?.totalPages])

  useEffect(() => {
    if (workspacePagination?.totalPages) {
      setWorkspaceTotalPages(workspacePagination.totalPages)
    }
  }, [workspacePagination?.totalPages])

  // Combined loading conditions
  const showTenantLoading = !minLoadingComplete || isLoadingTenants || isSearching
  const showWorkspaceLoading = !minLoadingComplete || isLoadingWorkspaces

  const tenants = searchQuery ? searchData?.data : tenantsData?.data
  const workspaces = workspacesData?.data || []

  // Mock data for demo
  const mockTenants: TenantWithRole[] = [
    { id: '1', name: 'Acme Legal Corp', code: 'ACME', createdAt: new Date().toISOString(), role: 'ADMIN', lastAccessedAt: new Date(Date.now() - 2 * 60000).toISOString() },
    { id: '2', name: 'Global Finance Ltd', code: 'GFL', createdAt: new Date().toISOString(), role: 'MEMBER', lastAccessedAt: new Date(Date.now() - 3 * 86400000).toISOString() },
    { id: '3', name: 'Northeast Litigation', code: 'NEL', createdAt: new Date().toISOString(), role: 'OWNER', lastAccessedAt: new Date(Date.now() - 7 * 86400000).toISOString() },
    { id: '4', name: 'Orion Properties', code: 'ORION', createdAt: new Date().toISOString(), role: 'MEMBER', lastAccessedAt: null },
  ]

  const mockWorkspaces: WorkspaceWithRole[] = [
    { id: 'ws-1', name: 'Legal Documents', type: 'CLIENT', status: 'ACTIVE', createdAt: new Date().toISOString(), role: 'ADMIN', lastAccessedAt: new Date(Date.now() - 5 * 60000).toISOString() },
    { id: 'ws-2', name: 'HR Templates', type: 'CLIENT', status: 'ACTIVE', createdAt: new Date().toISOString(), role: 'EDITOR', lastAccessedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
    { id: 'ws-3', name: 'System Templates', type: 'SYSTEM', status: 'ACTIVE', createdAt: new Date().toISOString(), role: 'VIEWER', lastAccessedAt: null },
  ]

  const displayTenants: TenantWithRole[] = (tenants?.length ? tenants : mockTenants) as TenantWithRole[]
  const displayWorkspaces: WorkspaceWithRole[] = (workspaces.length ? workspaces : mockWorkspaces) as WorkspaceWithRole[]

  const handleTenantSelect = (tenant: TenantWithRole) => {
    setCurrentTenant(tenant as TenantWithRole)
    setSelectedTenant(tenant)
    recordAccess('TENANT', tenant.id).catch(() => {})
  }

  const handleWorkspaceSelect = (workspace: WorkspaceWithRole) => {
    setCurrentWorkspace(workspace as WorkspaceWithRole)
    recordAccess('WORKSPACE', workspace.id).catch(() => {})
    navigate({ to: '/workspace/$workspaceId', params: { workspaceId: workspace.id } })
  }

  const handleBack = () => {
    if (selectedTenant) {
      setSelectedTenant(null)
      setCurrentTenant(null)
    } else {
      navigate({ to: '/login' })
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center bg-background pt-32 lg:pt-40">
      {/* Logo */}
      <div className="absolute left-6 top-8 flex items-center gap-3 md:left-12 lg:left-32">
        <div className="flex h-6 w-6 items-center justify-center border-2 border-foreground text-foreground">
          <Box size={12} fill="currentColor" />
        </div>
        <span className="font-display text-sm font-bold uppercase tracking-tight text-foreground">
          Doc-Assembly
        </span>
      </div>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-start gap-16 px-6 py-24 md:px-12 lg:grid-cols-12 lg:gap-24 lg:px-32">
        {/* Left column */}
        <div className="lg:sticky lg:top-32 lg:col-span-4">
          <h1 className="mb-8 font-display text-5xl font-light leading-[1.05] tracking-tighter text-foreground md:text-6xl">
            {selectedTenant ? (
              <>
                Select your
                <br />
                <span className="font-semibold">Workspace.</span>
              </>
            ) : (
              <>
                {t('selectTenant.title', 'Select your')}
                <br />
                <span className="font-semibold">{t('selectTenant.subtitle', 'Organization.')}</span>
              </>
            )}
          </h1>
          <p className="mb-12 max-w-sm text-lg font-light leading-relaxed text-muted-foreground">
            {selectedTenant
              ? 'Choose a workspace to access document templates and assembly tools.'
              : t(
                  'selectTenant.description',
                  'Choose a tenant environment to access your document templates and assembly tools.'
                )}
          </p>
          <button
            onClick={handleBack}
            className="group inline-flex items-center gap-2 font-mono text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
            <span>{selectedTenant ? 'Back to organizations' : t('selectTenant.back', 'Back to login')}</span>
          </button>
        </div>

        {/* Right column */}
        <div className="flex flex-col justify-center lg:col-span-8">
          {/* Search */}
          <div className="group relative mb-8 w-full">
            <Search
              className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors group-focus-within:text-foreground"
              size={20}
            />
            <input
              type="text"
              placeholder={selectedTenant ? 'Filter by workspace...' : t('selectTenant.filter', 'Filter by organization...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-none border-b border-border bg-transparent py-3 pl-10 pr-4 font-display text-xl text-foreground outline-none transition-colors placeholder:text-muted-foreground/30 focus:border-foreground focus:ring-0"
            />
          </div>

          {/* List */}
          <div className="flex w-full flex-col justify-start" style={{ height: `${LIST_MIN_HEIGHT}px` }}>
            <AnimatePresence mode="wait">
              {selectedTenant ? (
                // Workspaces list
                showWorkspaceLoading ? (
                  <motion.div
                    key="loading-workspaces"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.3 } }}
                    className="flex h-full items-start justify-center py-8 text-muted-foreground"
                  >
                    <span>Loading workspaces<LoadingDots /></span>
                  </motion.div>
                ) : (
                  <motion.div
                    key={`workspaces-page-${workspacePage}`}
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="flex h-full w-full flex-col justify-start"
                  >
                    {displayWorkspaces.map((ws: WorkspaceWithRole) => (
                      <motion.button
                        key={ws.id}
                        variants={itemVariants}
                        onClick={() => handleWorkspaceSelect(ws)}
                        className={cn(
                          'group relative -mb-px flex w-full items-center justify-between rounded-sm border border-transparent border-b-border px-4 py-6 outline-none transition-all duration-200 hover:z-10 hover:border-foreground hover:bg-accent'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <h3 className="text-left font-display text-xl font-medium tracking-tight text-foreground transition-transform duration-300 group-hover:translate-x-2 md:text-2xl">
                            {ws.name}
                          </h3>
                          {ws.type === 'SYSTEM' && (
                            <span className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                              System
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-6 md:gap-8">
                          <span className="whitespace-nowrap font-mono text-[10px] text-muted-foreground transition-colors group-hover:text-foreground md:text-xs">
                            Last accessed: {formatRelativeTime(ws.lastAccessedAt)}
                          </span>
                          <ArrowRight
                            className="text-muted-foreground transition-all duration-300 group-hover:translate-x-1 group-hover:text-foreground"
                            size={24}
                          />
                        </div>
                      </motion.button>
                    ))}
                  </motion.div>
                )
              ) : // Tenants list
              showTenantLoading ? (
                <motion.div
                  key="loading-tenants"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.3 } }}
                  className="flex h-full items-start justify-center py-8 text-muted-foreground"
                >
                  <span>Loading organizations<LoadingDots /></span>
                </motion.div>
              ) : (
                <motion.div
                  key={`tenants-page-${tenantPage}`}
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="flex h-full w-full flex-col justify-start"
                >
                  {displayTenants.map((tenant: TenantWithRole) => (
                    <motion.button
                      key={tenant.id}
                      variants={itemVariants}
                      onClick={() => handleTenantSelect(tenant)}
                      className={cn(
                        'group relative -mb-px flex w-full items-center justify-between rounded-sm border border-transparent border-b-border px-4 py-6 outline-none transition-all duration-200 hover:z-10 hover:border-foreground hover:bg-accent'
                      )}
                    >
                      <h3 className="text-left font-display text-xl font-medium tracking-tight text-foreground transition-transform duration-300 group-hover:translate-x-2 md:text-2xl">
                        {tenant.name}
                      </h3>
                      <div className="flex items-center gap-6 md:gap-8">
                        <span className="whitespace-nowrap font-mono text-[10px] text-muted-foreground transition-colors group-hover:text-foreground md:text-xs">
                          Last accessed: {formatRelativeTime(tenant.lastAccessedAt)}
                        </span>
                        <ArrowRight
                          className="text-muted-foreground transition-all duration-300 group-hover:translate-x-1 group-hover:text-foreground"
                          size={24}
                        />
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Pagination */}
          {!selectedTenant && tenantTotalPages > 1 && (
            <PaginationControls
              page={tenantPage}
              totalPages={tenantTotalPages}
              onPageChange={setTenantPage}
            />
          )}
          {selectedTenant && workspaceTotalPages > 1 && (
            <PaginationControls
              page={workspacePage}
              totalPages={workspaceTotalPages}
              onPageChange={setWorkspacePage}
            />
          )}

          {/* Join new button */}
          <div className="mt-12 border-t border-border pt-8">
            <button className="group flex w-full items-center gap-4 rounded-sm border border-dashed border-border px-6 py-4 opacity-60 outline-none transition-all duration-200 hover:border-foreground hover:bg-accent hover:opacity-100">
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-muted-foreground pb-0.5 text-lg font-light transition-colors group-hover:border-foreground">
                <Plus size={14} />
              </div>
              <span className="font-display text-lg font-medium tracking-tight text-muted-foreground transition-colors group-hover:text-foreground">
                {selectedTenant ? 'Create New Workspace' : t('selectTenant.join', 'Join New Organization')}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
