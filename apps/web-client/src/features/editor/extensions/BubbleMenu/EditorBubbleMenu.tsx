import { BubbleMenu } from '@tiptap/react/menus';
import { NodeSelection } from '@tiptap/pm/state';
import { Bold, Italic, Strikethrough, Code, Link, Highlighter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditorBubbleMenuProps {
  editor: any;
}

interface MenuButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}

const MenuButton = ({ onClick, isActive, disabled, children, title }: MenuButtonProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={cn(
      'p-1.5 rounded transition-colors',
      isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-muted',
      disabled && 'opacity-50 cursor-not-allowed'
    )}
  >
    {children}
  </button>
);

export const EditorBubbleMenu = ({ editor }: EditorBubbleMenuProps) => {
  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL del enlace:', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  // Don't show bubble menu for atomic nodes (injector, signature, conditional)
  const shouldShow = ({ state }: { state: any }) => {
    const { selection } = state;
    const { empty } = selection;

    // Don't show if selection is empty
    if (empty) return false;

    // Don't show for NodeSelection (atomic nodes)
    if (selection instanceof NodeSelection) {
      return false;
    }

    return true;
  };

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={shouldShow}
      className="bg-popover border rounded-lg shadow-lg flex items-center gap-0.5 p-1"
    >
      <MenuButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        title="Negrita (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </MenuButton>

      <MenuButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        title="Cursiva (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </MenuButton>

      <MenuButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        title="Tachado"
      >
        <Strikethrough className="h-4 w-4" />
      </MenuButton>

      <MenuButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        disabled={!editor.can().chain().focus().toggleCode().run()}
        title="Código"
      >
        <Code className="h-4 w-4" />
      </MenuButton>

      <div className="w-px h-5 bg-border mx-1" />

      <MenuButton
        onClick={setLink}
        isActive={editor.isActive('link')}
        title="Enlace (Ctrl+K)"
      >
        <Link className="h-4 w-4" />
      </MenuButton>

      <MenuButton
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        isActive={editor.isActive('highlight')}
        disabled={!editor.can().chain().focus().toggleHighlight().run()}
        title="Resaltar"
      >
        <Highlighter className="h-4 w-4" />
      </MenuButton>
    </BubbleMenu>
  );
};
