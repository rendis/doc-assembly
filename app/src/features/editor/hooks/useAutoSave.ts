/**
 * Auto-Save Hook
 *
 * Implements Google Docs-style auto-saving with debounce,
 * retry logic, and status indication.
 *
 * Copied from legacy system (../web-client) and adapted for v2 stores.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Editor } from '@tiptap/core'
import { versionsApi } from '@/features/templates/api/templates-api'
import { exportDocument } from '../services/document-export'
import { useDocumentHeaderStore } from '../stores/document-header-store'
import { usePaginationStore } from '../stores/pagination-store'
import { useSignerRolesStore } from '../stores/signer-roles-store'
import type { DocumentMeta } from '../types/document-format'

// =============================================================================
// Types
// =============================================================================

export type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

export interface AutoSaveState {
  status: AutoSaveStatus
  lastSavedAt: Date | null
  error: Error | null
  isDirty: boolean
}

export interface UseAutoSaveOptions {
  editor: Editor | null
  templateId: string
  versionId: string
  enabled: boolean
  debounceMs?: number
  meta?: Partial<DocumentMeta>
}

export interface UseAutoSaveReturn extends AutoSaveState {
  save: () => Promise<void>
  ensureSaved: () => Promise<void>
  resetError: () => void
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_DEBOUNCE_MS = 2000
const MAX_RETRIES = 2
const SAVED_DISPLAY_MS = 3000

// =============================================================================
// Hook Implementation
// =============================================================================

export function useAutoSave({
  editor,
  templateId,
  versionId,
  enabled,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  meta,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  // State
  const [status, setStatus] = useState<AutoSaveStatus>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  // Refs
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryCountRef = useRef(0)
  const isSavingRef = useRef(false)
  const isInitializedRef = useRef(false)
  const savePromiseRef = useRef<Promise<void> | null>(null)
  const prevRolesRef = useRef<string | null>(null)
  const prevWorkflowRef = useRef<string | null>(null)
  const prevHeaderRef = useRef<string | null>(null)

  // Store data - v2 has individual properties, not a `config` object
  const pageSize = usePaginationStore((s) => s.pageSize)
  const margins = usePaginationStore((s) => s.margins)
  const signerRoles = useSignerRolesStore((s) => s.roles)
  const workflowConfig = useSignerRolesStore((s) => s.workflowConfig)
  const headerLayout = useDocumentHeaderStore((s) => s.layout)
  const headerImageUrl = useDocumentHeaderStore((s) => s.imageUrl)
  const headerImageAlt = useDocumentHeaderStore((s) => s.imageAlt)
  const headerImageInjectableId = useDocumentHeaderStore((s) => s.imageInjectableId)
  const headerImageInjectableLabel = useDocumentHeaderStore((s) => s.imageInjectableLabel)
  const headerImageWidth = useDocumentHeaderStore((s) => s.imageWidth)
  const headerImageHeight = useDocumentHeaderStore((s) => s.imageHeight)
  const headerContent = useDocumentHeaderStore((s) => s.content)

  const headerSnapshot = useMemo(
    () =>
      JSON.stringify({
        layout: headerLayout,
        imageUrl: headerImageUrl,
        imageAlt: headerImageAlt,
        imageInjectableId: headerImageInjectableId,
        imageInjectableLabel: headerImageInjectableLabel,
        imageWidth: headerImageWidth,
        imageHeight: headerImageHeight,
        content: headerContent,
      }),
    [
      headerContent,
      headerImageAlt,
      headerImageHeight,
      headerImageInjectableId,
      headerImageInjectableLabel,
      headerImageUrl,
      headerImageWidth,
      headerLayout,
    ]
  )

  // Build pagination config in the format expected by exportDocument
  const pagination = useMemo(() => ({
    pageSize,
    margins,
  }), [pageSize, margins])

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  // Mark as initialized once enabled becomes true and capture baseline values
  useEffect(() => {
    if (!enabled || isInitializedRef.current) return

    // Small delay to ensure store values are fully hydrated after document load
    const timer = setTimeout(() => {
      // Capture current values as baseline before marking initialized
      prevRolesRef.current = JSON.stringify(signerRoles)
      prevWorkflowRef.current = JSON.stringify(workflowConfig)
      prevHeaderRef.current = headerSnapshot
      isInitializedRef.current = true
    }, 100)

    return () => clearTimeout(timer)
  }, [enabled, headerSnapshot, signerRoles, workflowConfig])

  /**
   * Core save function
   */
  const performSave = useCallback(() => {
    if (!editor || !enabled) {
      return Promise.resolve()
    }

    if (savePromiseRef.current) {
      return savePromiseRef.current
    }

    const savePromise = (async () => {
      isSavingRef.current = true
      setStatus('saving')
      setError(null)

      try {
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          try {
            // Build document meta
            const documentMeta: DocumentMeta = {
              title: meta?.title || 'Untitled',
              description: meta?.description,
              language: meta?.language || 'es',
              customFields: meta?.customFields,
            }

            // Export document
            const portableDoc = exportDocument(
              editor,
              { pagination, signerRoles, workflowConfig },
              documentMeta,
              { includeChecksum: true }
            )

            // Send document directly as JSON object
            const contentStructure = portableDoc

            // Call API
            await versionsApi.update(templateId, versionId, { contentStructure })

            // Success
            setStatus('saved')
            setLastSavedAt(new Date())
            setIsDirty(false)
            retryCountRef.current = 0

            // Reset to idle after display time
            if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
            savedTimerRef.current = setTimeout(() => {
              setStatus('idle')
            }, SAVED_DISPLAY_MS)

            return
          } catch (err) {
            const error = err instanceof Error ? err : new Error('Save failed')

            if (attempt < MAX_RETRIES) {
              retryCountRef.current = attempt + 1
              await new Promise((resolve) => setTimeout(resolve, 1000))
              continue
            }

            setStatus('error')
            setError(error)
            retryCountRef.current = 0
            throw error
          }
        }
      } finally {
        isSavingRef.current = false
      }
    })()

    const trackedPromise = savePromise.finally(() => {
      if (savePromiseRef.current === trackedPromise) {
        savePromiseRef.current = null
      }
    })
    savePromiseRef.current = trackedPromise

    return trackedPromise
  }, [
    editor,
    enabled,
    templateId,
    versionId,
    meta,
    pagination,
    signerRoles,
    workflowConfig,
  ])

  /**
   * Manual save (force, no debounce)
   */
  const save = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    try {
      await performSave()
    } catch {
      // Error state is already reflected by performSave; manual save keeps the UI responsive.
    }
  }, [performSave])

  /**
   * Ensures the current document state is persisted before dependent actions (e.g. preview).
   */
  const ensureSaved = useCallback(async () => {
    if (!enabled || !editor) return

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    if (savePromiseRef.current) {
      await savePromiseRef.current
      return
    }

    if (isDirty || status === 'pending') {
      await performSave()
    }
  }, [editor, enabled, isDirty, performSave, status])

  /**
   * Reset error state
   */
  const resetError = useCallback(() => {
    setError(null)
    setStatus(isDirty ? 'pending' : 'idle')
  }, [isDirty])

  /**
   * Schedule debounced save
   */
  const scheduleSave = useCallback(() => {
    if (!enabled) return

    setIsDirty(true)
    setStatus('pending')

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null
      void performSave().catch(() => {
        // Error state is already tracked in the hook; avoid unhandled promise rejections.
      })
    }, debounceMs)
  }, [enabled, debounceMs, performSave])

  /**
   * Listen to editor updates
   */
  useEffect(() => {
    if (!editor || !enabled) return

    const handleUpdate = () => {
      scheduleSave()
    }

    editor.on('update', handleUpdate)

    return () => {
      editor.off('update', handleUpdate)
    }
  }, [editor, enabled, scheduleSave])

  /**
   * Listen to store changes (roles and notifications)
   */
  useEffect(() => {
    // Skip if not enabled or not initialized
    if (!enabled || !isInitializedRef.current) return

    // Serialize current values for comparison
    const rolesJson = JSON.stringify(signerRoles)
    const workflowJson = JSON.stringify(workflowConfig)

    // Check if values actually changed from baseline
    const rolesChanged = prevRolesRef.current !== rolesJson
    const workflowChanged = prevWorkflowRef.current !== workflowJson

    if (rolesChanged || workflowChanged) {
      // Update refs
      prevRolesRef.current = rolesJson
      prevWorkflowRef.current = workflowJson

      // Schedule save
      setIsDirty(true)
      setStatus('pending')

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null
        void performSave().catch(() => {
          // Error state is already tracked in the hook; avoid unhandled promise rejections.
        })
      }, debounceMs)
    }
  }, [signerRoles, workflowConfig, enabled, debounceMs, performSave])

  /**
   * Listen to header changes (layout, logo, dimensions, content).
   */
  useEffect(() => {
    if (!enabled || !isInitializedRef.current) return

    if (prevHeaderRef.current !== headerSnapshot) {
      prevHeaderRef.current = headerSnapshot
      scheduleSave()
    }
  }, [enabled, headerSnapshot, scheduleSave])

  return {
    status,
    lastSavedAt,
    error,
    isDirty,
    save,
    ensureSaved,
    resetError,
  }
}
