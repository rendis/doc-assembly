import { Button } from '@/components/ui/button';
import { Editor } from '@/features/editor/components/Editor';
import { SignerRolesPanel } from '@/features/editor/components/SignerRolesPanel';
import { SignerRolesProvider } from '@/features/editor/context/SignerRolesContext';
import { SYSTEM_VARIABLES } from '@/features/editor/data/variables';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Save } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export const Route = createFileRoute(
  '/_app/workspace/$workspaceId/templates/$templateId/version/$versionId/design',
)({
  component: VersionDesignPage,
});

function VersionDesignPage() {
  const { workspaceId, versionId } = Route.useParams();
  const { t } = useTranslation();
  
  // TODO: Fetch version details here to get content and status
  // const { data: version } = useVersion(versionId);
  const status = 'DRAFT'; // Mock
  const [content, setContent] = useState('<p>Contrato de prueba...</p>'); // Mock
  
  const handleSave = (html: string) => {
    setContent(html);
    console.log('Saving...', html);
  };

  const isEditable = status === 'DRAFT';

  return (
    <SignerRolesProvider variables={SYSTEM_VARIABLES}>
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

          <div className="flex items-center gap-2">
            {isEditable && (
              <Button size="sm" onClick={() => handleSave(content)}>
                <Save className="h-4 w-4 mr-2" />
                {t('common.save') || 'Guardar'}
              </Button>
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
            />
          </div>

          {isEditable && (
            <SignerRolesPanel variables={SYSTEM_VARIABLES} />
          )}
        </div>
      </div>
    </SignerRolesProvider>
  );
}
