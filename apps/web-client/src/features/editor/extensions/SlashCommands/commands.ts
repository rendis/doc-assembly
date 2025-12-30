import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Image,
  PenTool,
  GitBranch,
  Variable,
  Scissors,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
// @ts-expect-error - TipTap types compatibility
import type { Editor } from '@tiptap/core';

export interface SlashCommand {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  group: string;
  aliases?: string[];
  action: (editor: Editor) => void;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  // Básico
  {
    id: 'text',
    title: 'Texto',
    description: 'Párrafo de texto normal',
    icon: Type,
    group: 'Básico',
    aliases: ['p', 'paragraph'],
    action: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    id: 'heading1',
    title: 'Título 1',
    description: 'Título grande',
    icon: Heading1,
    group: 'Básico',
    aliases: ['h1', 'title'],
    action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: 'heading2',
    title: 'Título 2',
    description: 'Título mediano',
    icon: Heading2,
    group: 'Básico',
    aliases: ['h2', 'subtitle'],
    action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: 'heading3',
    title: 'Título 3',
    description: 'Título pequeño',
    icon: Heading3,
    group: 'Básico',
    aliases: ['h3'],
    action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },

  // Listas
  {
    id: 'bulletList',
    title: 'Lista',
    description: 'Lista con viñetas',
    icon: List,
    group: 'Listas',
    aliases: ['ul', 'bullet', 'unordered'],
    action: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'orderedList',
    title: 'Lista numerada',
    description: 'Lista con números',
    icon: ListOrdered,
    group: 'Listas',
    aliases: ['ol', 'numbered', 'ordered'],
    action: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },

  // Bloques
  {
    id: 'blockquote',
    title: 'Cita',
    description: 'Bloque de cita',
    icon: Quote,
    group: 'Bloques',
    aliases: ['quote', 'citation'],
    action: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'codeBlock',
    title: 'Código',
    description: 'Bloque de código',
    icon: Code,
    group: 'Bloques',
    aliases: ['code', 'pre'],
    action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: 'divider',
    title: 'Divisor',
    description: 'Línea horizontal',
    icon: Minus,
    group: 'Bloques',
    aliases: ['hr', 'separator', 'line'],
    action: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },

  // Media
  {
    id: 'image',
    title: 'Imagen',
    description: 'Insertar imagen',
    icon: Image,
    group: 'Media',
    aliases: ['img', 'picture', 'photo'],
    action: (editor) => {
      // Dispatch custom event to open the image modal
      editor.view.dom.dispatchEvent(
        new CustomEvent('editor:open-image-modal', { bubbles: true })
      );
    },
  },

  // Documentos
  {
    id: 'pageBreak',
    title: 'Salto de página',
    description: 'Insertar salto de página',
    icon: Scissors,
    group: 'Documentos',
    aliases: ['page', 'break', 'salto', 'nueva pagina'],
    action: (editor) => {
      editor.chain().focus().setPageBreak().run();
    },
  },
  {
    id: 'signature',
    title: 'Firma',
    description: 'Bloque de firma configurable',
    icon: PenTool,
    group: 'Documentos',
    aliases: ['sign', 'firmar'],
    action: (editor) => {
      editor.chain().focus().setSignature().run();
    },
  },
  {
    id: 'conditional',
    title: 'Condicional',
    description: 'Contenido condicional',
    icon: GitBranch,
    group: 'Documentos',
    aliases: ['if', 'condition', 'logic'],
    action: (editor) => {
      editor.chain().focus().setConditional({ expression: 'Configurar lógica' }).run();
    },
  },
  {
    id: 'variable',
    title: 'Variable',
    description: 'Insertar variable',
    icon: Variable,
    group: 'Documentos',
    aliases: ['var', 'placeholder', 'field'],
    action: (editor) => {
      // Insertar @ para disparar el menú de menciones con las variables disponibles
      editor.chain().focus().insertContent('@').run();
    },
  },
];

export const filterCommands = (query: string): SlashCommand[] => {
  if (!query) return SLASH_COMMANDS;

  const lowerQuery = query.toLowerCase();
  return SLASH_COMMANDS.filter((command) => {
    const matchesTitle = command.title.toLowerCase().includes(lowerQuery);
    const matchesDescription = command.description.toLowerCase().includes(lowerQuery);
    const matchesAliases = command.aliases?.some((alias) => alias.includes(lowerQuery));
    return matchesTitle || matchesDescription || matchesAliases;
  });
};

export const groupCommands = (commands: SlashCommand[]): Record<string, SlashCommand[]> => {
  return commands.reduce((groups, command) => {
    const group = command.group;
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(command);
    return groups;
  }, {} as Record<string, SlashCommand[]>);
};
