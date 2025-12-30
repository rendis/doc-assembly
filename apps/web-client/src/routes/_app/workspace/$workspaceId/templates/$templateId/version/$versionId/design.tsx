import { Button } from '@/components/ui/button';
import { Editor } from '@/features/editor/components/Editor';
import { SaveStatusIndicator } from '@/features/editor/components/SaveStatusIndicator';
import { SignerRolesPanel } from '@/features/editor/components/SignerRolesPanel';
import { SignerRolesProvider } from '@/features/editor/context/SignerRolesContext';
import { useAutoSave } from '@/features/editor/hooks/useAutoSave';
import { useInjectables } from '@/features/editor/hooks/useInjectables';
import { usePagination } from '@/features/editor/hooks/usePagination';
import { deserializeContent, importDocument } from '@/features/editor/services/document-import';
import { usePaginationStore } from '@/features/editor/stores/pagination-store';
import { useSignerRolesStore } from '@/features/editor/stores/signer-roles-store';
import { versionsApi } from '@/features/templates/api/versions-api';
import type { TemplateVersionDetail } from '@/features/templates/types';
import { createFileRoute, Link } from '@tanstack/react-router';
// @ts-expect-error - tiptap types incompatible with moduleResolution: bundler
import type { Editor as TiptapEditor } from '@tiptap/core';
import { AlertCircle, ArrowLeft, Loader2, RefreshCw, Save } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const Route = createFileRoute(
  '/_app/workspace/$workspaceId/templates/$templateId/version/$versionId/design',
)({
  component: VersionDesignPage,
});

function VersionDesignPage() {
  const { workspaceId, templateId, versionId } = Route.useParams();
  const { t } = useTranslation();
  const { variables } = useInjectables();

  // Editor instance state
  const [editor, setEditor] = useState<TiptapEditor | null>(null);
  const contentLoadedRef = useRef(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Pagination state
  const pagination = usePagination(editor);

  // Version data state
  const [version, setVersion] = useState<TemplateVersionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<Error | null>(null);

  // Fetch version details
  const fetchVersion = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const data = await versionsApi.get(templateId, versionId);
      setVersion(data);
    } catch (error) {
      console.error('Failed to fetch version:', error);
      setFetchError(error instanceof Error ? error : new Error('Error al cargar'));
    } finally {
      setIsLoading(false);
    }
  }, [templateId, versionId]);

  useEffect(() => {
    fetchVersion();
  }, [fetchVersion]);

  const status = version?.status ?? 'DRAFT';
  const isEditable = status === 'DRAFT';

  // Load content into editor when both are ready
  useEffect(() => {
    if (!editor || !version || contentLoadedRef.current) return;

    // If no content, leave editor empty (new document)
    const hasContent = version.contentStructure && (
      Array.isArray(version.contentStructure)
        ? version.contentStructure.length > 0
        : Object.keys(version.contentStructure).length > 0
    );
    if (!hasContent) {
      contentLoadedRef.current = true;
      return;
    }

    // Deserialize content (supports both legacy byte array and new JSON object format)
    const portableDoc = deserializeContent(version.contentStructure!);
    if (!portableDoc) {
      setImportError('Error al deserializar el contenido');
      contentLoadedRef.current = true;
      return;
    }

    // Create store actions adapter
    const storeActions = {
      setPaginationConfig: usePaginationStore.getState().setPaginationConfig,
      setSignerRoles: useSignerRolesStore.getState().setRoles,
      setWorkflowConfig: useSignerRolesStore.getState().setWorkflowConfig,
    };

    // Import document
    const result = importDocument(
      portableDoc,
      editor,
      storeActions,
      variables.map((v) => ({
        id: v.id,
        variableId: v.variableId,
        type: v.type,
        label: v.label,
      }))
    );

    if (!result.success) {
      const errorMessages = result.validation.errors
        .map((e) => e.message)
        .join(', ');
      setImportError(errorMessages || 'Error al importar el contenido');
      console.error('Import failed:', result.validation.errors);
    }

    contentLoadedRef.current = true;
  }, [editor, version, variables]);

  // Auto-save hook
  const autoSave = useAutoSave({
    editor,
    templateId,
    versionId,
    enabled: isEditable && contentLoadedRef.current,
    debounceMs: 2000,
    meta: {
      title: version?.name || 'Documento',
      language: 'es',
    },
  });

  // Editor ready callback
  const handleEditorReady = useCallback((editorInstance: TiptapEditor) => {
    setEditor(editorInstance);
  }, []);

  // Force save handler
  const handleForceSave = useCallback(() => {
    autoSave.save();
  }, [autoSave]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-background items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">
          {t('common.loading') || 'Cargando...'}
        </p>
      </div>
    );
  }

  // Error state
  if (fetchError || importError) {
    return (
      <div className="flex flex-col h-full bg-background items-center justify-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="mt-4 text-sm text-destructive">
          {fetchError?.message || importError || 'Error al cargar la versión'}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => {
            setImportError(null);
            contentLoadedRef.current = false;
            fetchVersion();
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('common.retry') || 'Reintentar'}
        </Button>
      </div>
    );
  }

  return (
    <SignerRolesProvider variables={variables}>
      <div className="flex flex-col h-full bg-background">
        {/* Header */}
        <div className="border-b px-4 py-2 flex items-center justify-between bg-card shrink-0 h-14">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/workspace/$workspaceId/templates" params={{ workspaceId }}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-sm font-semibold">{version?.name || 'Diseño'}</h1>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  v{version?.versionNumber || versionId}
                </span>
                {isEditable ? (
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                    Editable
                  </span>
                ) : (
                  <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                    Solo lectura
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isEditable && (
              <>
                <SaveStatusIndicator
                  status={autoSave.status}
                  lastSavedAt={autoSave.lastSavedAt}
                  error={autoSave.error}
                  onRetry={handleForceSave}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleForceSave}
                  disabled={autoSave.status === 'saving'}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {t('common.save') || 'Guardar'}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Editor + Roles Panel */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-hidden relative">
            <Editor
              content=""
              editable={isEditable}
              onEditorReady={handleEditorReady}
              templateId={templateId}
              versionId={versionId}
            />
          </div>

          {isEditable && <SignerRolesPanel variables={variables} />}
        </div>
      </div>
    </SignerRolesProvider>
  );
}
