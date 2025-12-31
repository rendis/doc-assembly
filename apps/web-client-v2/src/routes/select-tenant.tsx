import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Search, Plus, ChevronLeft, ChevronRight, Box } from 'lucide-react'
import { useState, useEffect } from 'react'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { LanguageSelector } from '@/components/common/LanguageSelector'
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

  // Animation orchestration states
  const [selectedWorkspaceForAnim, setSelectedWorkspaceForAnim] = useState<WorkspaceWithRole | null>(null)
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'toCenter' | 'toSidebar'>('idle')
  const [selectedPosition, setSelectedPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null)

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

  const handleWorkspaceSelect = async (workspace: WorkspaceWithRole, event: React.MouseEvent) => {
    // Capture full button dimensions
    const button = event.currentTarget as HTMLElement
    const rect = button.getBoundingClientRect()
    setSelectedPosition({
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    })

    // Phase 1: Everything happens together - fade + move to center + text centers
    setSelectedWorkspaceForAnim(workspace)
    setAnimationPhase('toCenter')
    await new Promise(r => setTimeout(r, 800)) // includes pause at center

    // Phase 2: Move to sidebar
    setAnimationPhase('toSidebar')
    setCurrentWorkspace(workspace as WorkspaceWithRole)
    recordAccess('WORKSPACE', workspace.id).catch(() => {})
    await new Promise(r => setTimeout(r, 500))

    // Phase 3: Navigate
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
      {/* Logo pequeño en posición original con layoutId para animación */}
      <motion.div
        layoutId="app-logo"
        className="absolute left-6 top-8 flex items-center gap-3 md:left-12 lg:left-32"
      >
        <motion.div
          layoutId="app-logo-icon"
          className="flex h-6 w-6 items-center justify-center border-2 border-foreground"
        >
          <Box size={12} fill="currentColor" className="text-foreground" />
        </motion.div>
        <motion.span
          layoutId="app-logo-text"
          className="font-display text-sm font-bold uppercase tracking-tight text-foreground"
        >
          Doc-Assembly
        </motion.span>
      </motion.div>

      {/* Iconos arriba derecha con layoutId para animación */}
      <motion.div
        layoutId="app-controls"
        className="absolute right-6 top-8 flex items-center gap-1 md:right-12 lg:right-32"
      >
        <LanguageSelector />
        <ThemeToggle />
      </motion.div>

      {/* Main content - fades out when workspace is selected */}
      <motion.div
        animate={{
          opacity: selectedWorkspaceForAnim ? 0 : 1,
        }}
        transition={{ duration: 0.3 }}
        className="mx-auto grid w-full max-w-7xl grid-cols-1 items-start gap-16 px-6 py-24 md:px-12 lg:grid-cols-12 lg:gap-24 lg:px-32"
      >
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
                        onClick={(e) => handleWorkspaceSelect(ws, e)}
                        disabled={!!selectedWorkspaceForAnim}
                        className={cn(
                          'group relative -mb-px flex w-full items-center justify-between rounded-sm border border-transparent border-b-border px-4 py-6 outline-none transition-all duration-200 hover:z-10 hover:border-foreground hover:bg-accent',
                          selectedWorkspaceForAnim && 'pointer-events-none'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <h3 className="text-left font-display text-xl font-medium tracking-tight text-foreground md:text-2xl">
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
      </motion.div>

      {/* Transition overlay - lines and floating card */}
      <AnimatePresence>
        {selectedWorkspaceForAnim && selectedPosition && (
          <>
            {/* Header bottom line - slides from left (during toSidebar) */}
            {animationPhase === 'toSidebar' && (
              <motion.div
                key="header-line"
                className="fixed left-0 right-0 top-16 z-50 h-px bg-border"
                style={{ transformOrigin: 'left' }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              />
            )}

            {/* Sidebar right line - slides from top (during toSidebar) */}
            {animationPhase === 'toSidebar' && (
              <motion.div
                key="sidebar-line"
                className="fixed bottom-0 left-64 top-16 z-50 w-px bg-border"
                style={{ transformOrigin: 'top' }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              />
            )}

            {/* Floating card - moves to center then to sidebar */}
            <motion.div
              key="floating-card"
              className="pointer-events-none fixed z-50 bg-background"
              style={{ transformOrigin: 'center center', borderStyle: 'solid' }}
              initial={{
                left: selectedPosition.x,
                top: selectedPosition.y,
                width: selectedPosition.width,
                scale: 1,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderLeftWidth: 0,
                borderRightWidth: 0,
                borderColor: 'hsl(var(--border))',
                boxShadow: '0 0 0 rgba(0,0,0,0)',
              }}
              animate={{
                // Position: original -> center of CONTENT AREA (excluding sidebar) -> sidebar
                // Sidebar width = 256px, so content area starts at 256px
                left: animationPhase === 'toCenter'
                  ? (typeof window !== 'undefined' ? 256 + (window.innerWidth - 256) / 2 - selectedPosition.width / 2 : selectedPosition.x)
                  : animationPhase === 'toSidebar'
                    ? 16
                    : selectedPosition.x,
                top: animationPhase === 'toCenter'
                  ? (typeof window !== 'undefined' ? window.innerHeight / 2 - 40 : selectedPosition.y)
                  : animationPhase === 'toSidebar'
                    ? 64 + 24
                    : selectedPosition.y,
                width: animationPhase === 'toSidebar' ? 256 - 32 : selectedPosition.width,
                // Scale: grows at center, back to 1 at sidebar
                scale: animationPhase === 'toCenter' ? 1.1 : 1,
                // Borders fade out during toSidebar
                borderColor: animationPhase === 'toSidebar' ? 'transparent' : 'hsl(var(--border))',
                // Shadow appears during toSidebar (floating effect)
                boxShadow: animationPhase === 'toSidebar'
                  ? '0 8px 30px rgba(0,0,0,0.12)'
                  : '0 0 0 rgba(0,0,0,0)',
              }}
              transition={{
                type: 'spring',
                damping: 25,
                stiffness: 200,
                borderColor: { duration: 0.5, ease: 'easeInOut' },
                boxShadow: { duration: 0.4, ease: 'easeOut' },
              }}
            >
              {/* Container - ROW layout, changes to column during toSidebar */}
              <motion.div
                className="flex items-center justify-between relative"
                initial={{ padding: '1.5rem 1rem' }}
                animate={{
                  flexDirection: animationPhase === 'toSidebar' ? 'column' : 'row',
                  justifyContent: animationPhase === 'toSidebar' ? 'flex-start' : 'space-between',
                  alignItems: animationPhase === 'toSidebar' ? 'flex-start' : 'center',
                  padding: animationPhase === 'toSidebar' ? '0 0.5rem' : '1.5rem 1rem',
                }}
                transition={{ duration: 0.3 }}
              >
                {/* Label "Workspace" - only appears during toSidebar */}
                <motion.label
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{
                    opacity: animationPhase === 'toSidebar' ? 1 : 0,
                    height: animationPhase === 'toSidebar' ? 'auto' : 0,
                    marginBottom: animationPhase === 'toSidebar' ? 8 : 0
                  }}
                  transition={{ duration: 0.3 }}
                  className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground"
                >
                  Workspace
                </motion.label>

                {/* Name - slides to center during toCenter, back to left during toSidebar */}
                <motion.h3
                  initial={{ fontSize: '1.5rem', x: 0 }}
                  animate={{
                    fontSize: animationPhase === 'toSidebar' ? '1.125rem' : '1.5rem',
                    // Slide to center during toCenter, back to 0 during toSidebar
                    x: animationPhase === 'toCenter' ? 120 : 0,
                  }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="text-left font-display font-medium tracking-tight text-foreground"
                >
                  {selectedWorkspaceForAnim.name}
                </motion.h3>

                {/* Metadata - fades out during toCenter */}
                <motion.div
                  initial={{ opacity: 1 }}
                  animate={{
                    opacity: animationPhase === 'idle' ? 1 : 0,
                  }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-6"
                >
                  <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                    Last accessed: {formatRelativeTime(selectedWorkspaceForAnim.lastAccessedAt)}
                  </span>
                  <ArrowRight className="text-muted-foreground" size={24} />
                </motion.div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
