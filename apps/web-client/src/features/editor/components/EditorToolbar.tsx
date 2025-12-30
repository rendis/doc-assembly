import {
  Bold, Italic, List, ListOrdered, Quote,
  Undo, Redo, Heading1, Heading2, Download, Upload,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { EditorToolbarProps } from '../types';
import { usePaginationStore } from '../stores/pagination-store';
import { useSignerRolesStore } from '../stores/signer-roles-store';
import { exportDocument, downloadAsJson } from '../services/document-export';
import { importFromFile } from '../services/document-import';

export const EditorToolbar = ({ editor }: EditorToolbarProps) => {
  const { t } = useTranslation();
  const { config: paginationConfig } = usePaginationStore();
  const setPaginationConfig = usePaginationStore((s) => s.setPaginationConfig);
  const { roles: signerRoles, workflowConfig, setRoles, setWorkflowConfig } = useSignerRolesStore();

  const handleExport = () => {
    if (!editor) return;
    const doc = exportDocument(
      editor,
      { paginationConfig, signerRoles, workflowConfig },
      { title: 'Test Document', language: 'es' },
      { includeChecksum: true }
    );
    downloadAsJson(doc, `document-${Date.now()}.json`);
  };

  const handleImport = async () => {
    if (!editor) return;
    const result = await importFromFile(
      editor,
      {
        setPaginationConfig,
        setSignerRoles: setRoles,
        setWorkflowConfig,
      },
      [] // backendVariables vacío para testing
    );

    if (result?.success) {
      console.log('Documento importado:', result.document);
    } else {
      console.error('Error al importar:', result?.validation.errors);
    }
  };

  if (!editor) return null

  return (
    <div className="flex flex-wrap gap-1 border-b bg-muted/50 border-border p-2 sticky top-0 z-10">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`p-2 rounded hover:bg-accent ${editor.isActive('bold') ? 'bg-accent' : ''}`}
        title={t('editor.bold')}
      >
        <Bold className="h-4 w-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`p-2 rounded hover:bg-accent ${editor.isActive('italic') ? 'bg-accent' : ''}`}
        title={t('editor.italic')}
      >
        <Italic className="h-4 w-4" />
      </button>
      <div className="w-px h-6 bg-border mx-1 self-center" />
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`p-2 rounded hover:bg-accent ${editor.isActive('heading', { level: 1 }) ? 'bg-accent' : ''}`}
        title={t('editor.heading1')}
      >
        <Heading1 className="h-4 w-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`p-2 rounded hover:bg-accent ${editor.isActive('heading', { level: 2 }) ? 'bg-accent' : ''}`}
        title={t('editor.heading2')}
      >
        <Heading2 className="h-4 w-4" />
      </button>
      <div className="w-px h-6 bg-border mx-1 self-center" />
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-2 rounded hover:bg-accent ${editor.isActive('bulletList') ? 'bg-accent' : ''}`}
        title={t('editor.bulletList')}
      >
        <List className="h-4 w-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-2 rounded hover:bg-accent ${editor.isActive('orderedList') ? 'bg-accent' : ''}`}
        title={t('editor.orderedList')}
      >
        <ListOrdered className="h-4 w-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`p-2 rounded hover:bg-accent ${editor.isActive('blockquote') ? 'bg-accent' : ''}`}
        title={t('editor.quote')}
      >
        <Quote className="h-4 w-4" />
      </button>
      <div className="w-px h-6 bg-border mx-1 self-center" />
      <button
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={`p-2 rounded hover:bg-accent ${editor.isActive({ textAlign: 'left' }) ? 'bg-accent' : ''}`}
        title={t('editor.alignLeft')}
      >
        <AlignLeft className="h-4 w-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={`p-2 rounded hover:bg-accent ${editor.isActive({ textAlign: 'center' }) ? 'bg-accent' : ''}`}
        title={t('editor.alignCenter')}
      >
        <AlignCenter className="h-4 w-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={`p-2 rounded hover:bg-accent ${editor.isActive({ textAlign: 'right' }) ? 'bg-accent' : ''}`}
        title={t('editor.alignRight')}
      >
        <AlignRight className="h-4 w-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        className={`p-2 rounded hover:bg-accent ${editor.isActive({ textAlign: 'justify' }) ? 'bg-accent' : ''}`}
        title={t('editor.alignJustify')}
      >
        <AlignJustify className="h-4 w-4" />
      </button>
      <div className="flex-1" />
      <button
        onClick={handleExport}
        className="p-2 rounded hover:bg-accent"
        title="Exportar JSON"
      >
        <Download className="h-4 w-4" />
      </button>
      <button
        onClick={handleImport}
        className="p-2 rounded hover:bg-accent"
        title="Importar JSON"
      >
        <Upload className="h-4 w-4" />
      </button>
      <div className="w-px h-6 bg-border mx-1 self-center" />
      <button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        className="p-2 rounded hover:bg-accent"
        title={t('editor.undo')}
      >
        <Undo className="h-4 w-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        className="p-2 rounded hover:bg-accent"
        title={t('editor.redo')}
      >
        <Redo className="h-4 w-4" />
      </button>
    </div>
  )
}
