import { Button } from '@/components/ui/button';
import { Editor } from '@/features/editor/components/Editor';
import { SaveStatusIndicator } from '@/features/editor/components/SaveStatusIndicator';
import { SignerRolesPanel } from '@/features/editor/components/SignerRolesPanel';
import { SignerRolesProvider } from '@/features/editor/context/SignerRolesContext';
import { useAutoSave } from '@/features/editor/hooks/useAutoSave';
import { useInjectables } from '@/features/editor/hooks/useInjectables';
import { createFileRoute, Link } from '@tanstack/react-router';
import type { Editor as TiptapEditor } from '@tiptap/core';
import { ArrowLeft, Save } from 'lucide-react';
import { useState, useCallback } from 'react';
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

  // TODO: Fetch version details here to get content and status
  // const { data: version } = useVersion(versionId);
  const status = 'DRAFT'; // Mock
  const [content, setContent] = useState('<p>Contrato de prueba...</p>'); // Mock

  const isEditable = status === 'DRAFT';

  // Auto-save hook
  const autoSave = useAutoSave({
    editor,
    templateId,
    versionId,
    enabled: isEditable,
    debounceMs: 2000,
    meta: {
      title: 'Contrato', // TODO: Get from version data
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
              <h1 className="text-sm font-semibold">Diseño de Contrato</h1>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">v{versionId}</span>
                {isEditable ? (
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">Editable</span>
                ) : (
                  <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Solo lectura</span>
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
              content={content}
              editable={isEditable}
              onChange={isEditable ? setContent : undefined}
              onEditorReady={handleEditorReady}
            />
          </div>

          {isEditable && (
            <SignerRolesPanel variables={variables} />
          )}
        </div>
      </div>
    </SignerRolesProvider>
  );
}
