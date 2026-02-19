import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle, FontFamily, FontSize } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import TextAlign from '@tiptap/extension-text-align'
import { Box, Loader2, AlertCircle, CheckCircle2, Send } from 'lucide-react'
import { ReactNodeViewRenderer } from '@tiptap/react'
import axios from 'axios'
import { cn } from '@/lib/utils'
import { LanguageSelector } from '@/components/common/LanguageSelector'
import { ThemeToggle } from '@/components/common/ThemeToggle'

import { InjectorExtension } from '@/features/editor/extensions/Injector'
import { SignatureExtension } from '@/features/editor/extensions/Signature'
import { ConditionalExtension } from '@/features/editor/extensions/Conditional'
import { ImageExtension } from '@/features/editor/extensions/Image'
import { PageBreakHR } from '@/features/editor/extensions/PageBreak'
import {
  TableExtension,
  TableRowExtension,
  TableHeaderExtension,
  TableCellExtension,
} from '@/features/editor/extensions/Table'
import { TableInjectorExtension } from '@/features/editor/extensions/TableInjector'
import { ListInjectorExtension } from '@/features/editor/extensions/ListInjector'
import { InteractiveFieldExtension } from '@/features/editor/extensions/InteractiveField'

import {
  getPreSigningForm,
  submitPreSigningForm,
} from '../api/public-signing-api'
import { createPublicInteractiveFieldComponent } from './PublicInteractiveField'
import { PublicSignatureBlock } from './PublicSignatureBlock'
import type {
  PreSigningFormData,
  FieldResponses,
  FieldResponsePayload,
} from '../types'

type PageState =
  | { status: 'loading' }
  | { status: 'loaded'; data: PreSigningFormData }
  | { status: 'submitting'; data: PreSigningFormData }
  | { status: 'success'; signingUrl: string }
  | { status: 'error'; code: string; message: string }

interface PublicSigningPageProps {
  token: string
}

export function PublicSigningPage({ token }: PublicSigningPageProps) {
  const { t } = useTranslation()
  const [pageState, setPageState] = useState<PageState>({ status: 'loading' })
  const [responses, setResponses] = useState<FieldResponses>({})
  const [agreed, setAgreed] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Set<string>>(
    new Set(),
  )

  // Load form data
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await getPreSigningForm(token)
        if (!cancelled) {
          setPageState({ status: 'loaded', data })
        }
      } catch (err) {
        if (cancelled) return
        if (axios.isAxiosError(err)) {
          const status = err.response?.status
          const body = err.response?.data as
            | { code?: string; message?: string }
            | undefined
          if (status === 404) {
            setPageState({
              status: 'error',
              code: 'NOT_FOUND',
              message:
                body?.message ||
                t('publicSigning.errors.invalidToken'),
            })
          } else if (status === 410) {
            setPageState({
              status: 'error',
              code: 'EXPIRED',
              message:
                body?.message || t('publicSigning.errors.expired'),
            })
          } else if (status === 409) {
            setPageState({
              status: 'error',
              code: 'ALREADY_USED',
              message:
                body?.message ||
                t('publicSigning.errors.alreadyUsed'),
            })
          } else {
            setPageState({
              status: 'error',
              code: 'SERVER_ERROR',
              message:
                body?.message ||
                t('publicSigning.errors.serverError'),
            })
          }
        } else {
          setPageState({
            status: 'error',
            code: 'UNKNOWN',
            message: t('publicSigning.errors.serverError'),
          })
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [token, t])

  // Handle response changes
  const handleResponseChange = useCallback(
    (
      fieldId: string,
      fieldType: string,
      response: { selectedOptionIds?: string[]; text?: string },
    ) => {
      setResponses((prev) => ({
        ...prev,
        [fieldId]: { fieldType, response },
      }))
      // Clear validation error for this field when user interacts
      setValidationErrors((prev) => {
        if (!prev.has(fieldId)) return prev
        const next = new Set(prev)
        next.delete(fieldId)
        return next
      })
    },
    [],
  )

  // Validate fields
  const validate = useCallback(
    (data: PreSigningFormData): Set<string> => {
      const errors = new Set<string>()
      for (const field of data.fields) {
        if (!field.required) continue
        const resp = responses[field.id]
        if (!resp) {
          errors.add(field.id)
          continue
        }
        if (field.fieldType === 'text') {
          if (!resp.response.text || resp.response.text.trim() === '') {
            errors.add(field.id)
          } else if (
            field.maxLength > 0 &&
            resp.response.text.length > field.maxLength
          ) {
            errors.add(field.id)
          }
        } else {
          // checkbox or radio
          if (
            !resp.response.selectedOptionIds ||
            resp.response.selectedOptionIds.length === 0
          ) {
            errors.add(field.id)
          }
        }
      }
      return errors
    },
    [responses],
  )

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (pageState.status !== 'loaded') return
    const data = pageState.data

    setSubmitted(true)
    const errors = validate(data)
    if (errors.size > 0) {
      setValidationErrors(errors)
      return
    }

    if (!agreed) return

    setPageState({ status: 'submitting', data })

    try {
      const payload: FieldResponsePayload[] = data.fields.map((field) => {
        const resp = responses[field.id]
        return {
          fieldId: field.id,
          fieldType: field.fieldType,
          response: resp?.response ?? {},
        }
      })

      const result = await submitPreSigningForm(token, payload)
      setPageState({ status: 'success', signingUrl: result.signingUrl })

      // Redirect to signing provider
      window.location.href = result.signingUrl
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const body = err.response?.data as
          | { message?: string }
          | undefined
        setPageState({
          status: 'error',
          code: 'SUBMIT_ERROR',
          message:
            body?.message || t('publicSigning.errors.submitFailed'),
        })
      } else {
        setPageState({
          status: 'error',
          code: 'UNKNOWN',
          message: t('publicSigning.errors.submitFailed'),
        })
      }
    }
  }, [pageState, agreed, responses, token, validate, t])

  // --- RENDER ---

  if (pageState.status === 'loading') {
    return <LoadingScreen />
  }

  if (pageState.status === 'error') {
    return <ErrorScreen code={pageState.code} message={pageState.message} />
  }

  if (pageState.status === 'success') {
    return <SuccessScreen signingUrl={pageState.signingUrl} />
  }

  const data = pageState.data
  const isSubmitting = pageState.status === 'submitting'
  const hasFields = data.fields.length > 0

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center border-2 border-foreground text-foreground">
              <Box size={14} fill="currentColor" />
            </div>
            <span className="font-display text-sm font-bold uppercase tracking-tight text-foreground">
              Doc-Assembly
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Document header */}
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-8 space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">
            {data.documentTitle}
          </h1>
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <span>
              {t('publicSigning.from')}: {data.operatorName}
            </span>
            <span>
              {t('publicSigning.to')}: {data.signer.name} (
              {data.signer.email})
            </span>
          </div>
        </div>

        {/* Document content (TipTap read-only editor) */}
        <div className="mb-8 rounded-lg border border-border bg-card shadow-sm">
          <div className="p-8">
            <DocumentViewer
              content={data.content}
              signerRoleId={data.signer.roleId}
              responses={responses}
              onResponseChange={handleResponseChange}
              validationErrors={validationErrors}
              submitted={submitted}
            />
          </div>
        </div>

        {/* Agreement + Submit */}
        {hasFields && (
          <div className="mb-12 space-y-6 rounded-lg border border-border bg-card p-6 shadow-sm">
            {/* Agreement checkbox */}
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                disabled={isSubmitting}
                className="mt-0.5 h-4 w-4 rounded border-border text-primary accent-primary focus:ring-primary"
              />
              <span className="text-sm text-foreground">
                {t('publicSigning.agreement')}
              </span>
            </label>

            {/* Validation summary */}
            {submitted && validationErrors.size > 0 && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle size={16} />
                <span>
                  {t('publicSigning.validationSummary', {
                    count: validationErrors.size,
                  })}
                </span>
              </div>
            )}

            {/* Submit button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !agreed}
              className={cn(
                'flex w-full items-center justify-center gap-3 rounded-none py-3.5',
                'font-mono text-sm uppercase tracking-wider transition-colors',
                'bg-foreground text-background hover:bg-foreground/90',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>{t('publicSigning.submitting')}</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>{t('publicSigning.submit')}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">
          Doc-Assembly — {t('footer.secureEnvironment')}
        </span>
      </footer>
    </div>
  )
}

// --- Sub-components ---

function LoadingScreen() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 size={32} className="animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          {t('publicSigning.loading')}
        </p>
      </div>
    </div>
  )
}

function ErrorScreen({ code, message }: { code: string; message: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="mx-auto max-w-md text-center space-y-4">
        <AlertCircle size={48} className="mx-auto text-destructive" />
        <h1 className="text-xl font-semibold text-foreground">
          {code === 'EXPIRED'
            ? t('publicSigning.errors.expiredTitle')
            : code === 'ALREADY_USED'
              ? t('publicSigning.errors.alreadyUsedTitle')
              : code === 'NOT_FOUND'
                ? t('publicSigning.errors.invalidTokenTitle')
                : t('publicSigning.errors.errorTitle')}
        </h1>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

function SuccessScreen({ signingUrl }: { signingUrl: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="mx-auto max-w-md text-center space-y-4">
        <CheckCircle2 size={48} className="mx-auto text-green-600" />
        <h1 className="text-xl font-semibold text-foreground">
          {t('publicSigning.success.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('publicSigning.success.message')}
        </p>
        <a
          href={signingUrl}
          className="inline-block rounded-none bg-foreground px-8 py-3 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-foreground/90"
        >
          {t('publicSigning.success.goToSigning')}
        </a>
      </div>
    </div>
  )
}

// --- Document Viewer (TipTap read-only) ---

interface DocumentViewerProps {
  content: Record<string, unknown>
  signerRoleId: string
  responses: FieldResponses
  onResponseChange: (
    fieldId: string,
    fieldType: string,
    response: { selectedOptionIds?: string[]; text?: string },
  ) => void
  validationErrors: Set<string>
  submitted: boolean
}

function DocumentViewer({
  content,
  signerRoleId,
  responses,
  onResponseChange,
  validationErrors,
  submitted,
}: DocumentViewerProps) {
  const editorContainerRef = useRef<HTMLDivElement>(null)

  // Create the public interactive field component with the context baked in
  const PublicFieldComponent = useMemo(
    () =>
      createPublicInteractiveFieldComponent({
        signerRoleId,
        responses,
        onResponseChange,
        validationErrors,
        submitted,
      }),
    [signerRoleId, responses, onResponseChange, validationErrors, submitted],
  )

  // Create a custom InteractiveField extension that uses our public component
  const PublicInteractiveFieldExtension = useMemo(
    () =>
      InteractiveFieldExtension.extend({
        addNodeView() {
          return ReactNodeViewRenderer(PublicFieldComponent, {
            stopEvent: () => true, // Stop all events — we handle inputs ourselves
          })
        },
        // Remove keyboard shortcuts and commands not needed in read-only
        addKeyboardShortcuts() {
          return {}
        },
        addCommands() {
          return {}
        },
      }),
    [PublicFieldComponent],
  )

  // Create a custom Signature extension that uses our read-only component
  const PublicSignatureExtension = useMemo(
    () =>
      SignatureExtension.extend({
        addNodeView() {
          return ReactNodeViewRenderer(PublicSignatureBlock, {
            stopEvent: () => true,
          })
        },
        addKeyboardShortcuts() {
          return {}
        },
        addCommands() {
          return {}
        },
      }),
    [],
  )

  const editor = useEditor(
    {
      immediatelyRender: false,
      editable: false,
      content: content as Record<string, unknown>,
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
        }),
        TextStyle,
        Color,
        FontFamily.configure({ types: ['textStyle'] }),
        FontSize.configure({ types: ['textStyle'] }),
        TextAlign.configure({
          types: ['heading', 'paragraph', 'tableCell', 'tableHeader'],
        }),
        InjectorExtension,
        PublicSignatureExtension,
        ConditionalExtension,
        ImageExtension,
        PageBreakHR,
        TableExtension.configure({
          resizable: false,
          lastColumnResizable: false,
        }),
        TableRowExtension,
        TableHeaderExtension,
        TableCellExtension,
        TableInjectorExtension,
        ListInjectorExtension,
        PublicInteractiveFieldExtension,
      ],
      editorProps: {
        attributes: {
          class:
            'prose prose-sm dark:prose-invert max-w-none focus:outline-none',
        },
      },
    },
    // Recreate editor when the public field component changes (responses update)
    [PublicInteractiveFieldExtension],
  )

  // Update editor content without recreating when responses change
  // The node views are reactive through the baked-in context
  useEffect(() => {
    if (!editor) return
    // Re-render node views by triggering a no-op update
    editor.view.updateState(editor.view.state)
  }, [editor, responses, validationErrors, submitted])

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div ref={editorContainerRef}>
      <EditorContent editor={editor} />
    </div>
  )
}
