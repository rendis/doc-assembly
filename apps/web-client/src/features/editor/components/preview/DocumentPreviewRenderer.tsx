import { useEffect, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
// @ts-expect-error - TipTap types are not fully compatible with strict mode
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
// @ts-expect-error - TipTap types export issue in strict mode
import type { NodeViewProps } from '@tiptap/react';
import { cn } from '@/lib/utils';
import type { VariableValue } from '../../types/preview';
import { evaluateCondition } from '../../services/preview-service';
import type { LogicGroup } from '../../extensions/Conditional/ConditionalExtension';
import { usePaginationStore } from '../../stores/pagination-store';

// Type for TipTap HTMLAttributes in renderHTML
type TiptapHTMLAttributes = Record<string, unknown>;

interface DocumentPreviewRendererProps {
  content: unknown;
  values: Record<string, VariableValue>;
  className?: string;
}

// ============================================
// Preview Injector Component
// ============================================

const PreviewInjectorComponent = ({ node }: NodeViewProps) => {
  const { resolvedValue, hasValue, label, type } = node.attrs;

  return (
    <NodeViewWrapper as="span" className="inline">
      <span
        className={cn(
          'inline-flex items-center px-1.5 py-0.5 rounded font-medium text-sm',
          hasValue
            ? 'bg-primary/10 text-primary'
            : 'bg-muted text-muted-foreground border border-dashed'
        )}
      >
        {resolvedValue || `[${label || type}]`}
      </span>
    </NodeViewWrapper>
  );
};


// ============================================
// Preview Signature Component
// ============================================

const PreviewSignatureComponent = ({ node }: NodeViewProps) => {
  const { signatures, layout, lineWidth } = node.attrs;

  const lineWidthClass = {
    sm: 'w-32',
    md: 'w-48',
    lg: 'w-64',
  }[lineWidth as string] || 'w-48';

  const getLayoutClass = () => {
    if (layout?.startsWith('single')) return 'justify-center';
    if (layout === 'dual-sides') return 'justify-between';
    if (layout === 'dual-center') return 'justify-center gap-16';
    return 'justify-center gap-8';
  };

  return (
    <NodeViewWrapper className="my-6">
      <div className={cn('flex flex-wrap', getLayoutClass())}>
        {(signatures as { id: string; label: string; subtitle?: string; roleId?: string }[])?.map(
          (sig) => (
            <div
              key={sig.id}
              className="flex flex-col items-center gap-2 min-w-[160px]"
            >
              {/* Signature line placeholder */}
              <div className={cn('h-16 border-b-2 border-gray-400', lineWidthClass)} />
              <div className="text-center">
                <div className="text-sm font-medium">{sig.label}</div>
                {sig.subtitle && (
                  <div className="text-xs text-muted-foreground">{sig.subtitle}</div>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </NodeViewWrapper>
  );
};

// ============================================
// Preview Page Break Component
// ============================================

const PreviewPageBreakComponent = () => {
  return (
    <NodeViewWrapper className="my-8">
      <div className="relative border-t-2 border-dashed border-muted-foreground/30">
        <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-white dark:bg-gray-900 px-3 text-xs text-muted-foreground">
          Salto de Página
        </span>
      </div>
    </NodeViewWrapper>
  );
};

// ============================================
// Preview Extensions
// ============================================

const PreviewInjectorExtension = Node.create({
  name: 'injector',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      type: { default: 'TEXT' },
      label: { default: 'Variable' },
      variableId: { default: null },
      format: { default: null },
      resolvedValue: { default: null },
      hasValue: { default: false },
      isRoleVariable: { default: false },
      roleId: { default: null },
      roleLabel: { default: null },
      propertyKey: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="injector"]' }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: TiptapHTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'injector' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PreviewInjectorComponent);
  },
});

const PreviewConditionalExtension = Node.create({
  name: 'conditional',
  group: 'block',
  content: 'block+',

  addAttributes() {
    return {
      conditions: { default: null },
      expression: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="conditional"]' }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: TiptapHTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'conditional' }), 0];
  },
});

const PreviewSignatureExtension = Node.create({
  name: 'signature',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      count: { default: 1 },
      layout: { default: 'single-center' },
      lineWidth: { default: 'md' },
      signatures: { default: [] },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="signature"]' }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: TiptapHTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'signature' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PreviewSignatureComponent);
  },
});

const PreviewPageBreakExtension = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      id: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="page-break"]' }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: TiptapHTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'page-break' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PreviewPageBreakComponent);
  },
});

const PreviewImageExtension = Node.create({
  name: 'image',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: { default: null },
      height: { default: null },
      displayMode: { default: 'block' },
      align: { default: 'center' },
      shape: { default: 'square' },
    };
  },

  parseHTML() {
    return [{ tag: 'img' }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: TiptapHTMLAttributes }) {
    const { align, shape, ...attrs } = HTMLAttributes as { align?: string; shape?: string; [key: string]: unknown };
    return [
      'div',
      {
        class: cn(
          'my-4',
          align === 'center' && 'text-center',
          align === 'right' && 'text-right',
          align === 'left' && 'text-left'
        ),
      },
      [
        'img',
        mergeAttributes(attrs, {
          class: cn(
            'inline-block max-w-full',
            shape === 'circle' && 'rounded-full'
          ),
        }),
      ],
    ];
  },
});

// ============================================
// Document Preview Renderer Component
// ============================================

export const DocumentPreviewRenderer = ({
  content,
  values,
  className,
}: DocumentPreviewRendererProps) => {
  const { config: pageConfig } = usePaginationStore();

  // Transform content with resolved values
  const transformedContent = useMemo(() => {
    if (!content) return { type: 'doc', content: [] };

    // Type for TipTap JSON nodes
    interface TiptapNode {
      type: string;
      attrs?: Record<string, unknown>;
      content?: TiptapNode[];
      [key: string]: unknown;
    }

    // Filter out conditional blocks that don't pass
    const filterConditionals = (node: TiptapNode): TiptapNode | null => {
      if (node.type === 'conditional') {
        const conditions = node.attrs?.conditions as LogicGroup | undefined;
        if (conditions) {
          const shouldShow = evaluateCondition(conditions, values);
          if (!shouldShow) {
            return null; // Remove this node entirely
          }
        }
        // Keep the content, but continue filtering children
        return {
          ...node,
          content: node.content
            ?.map(filterConditionals)
            .filter((n): n is TiptapNode => n !== null),
        };
      }

      // For injector nodes, add resolved value
      if (node.type === 'injector' && node.attrs?.variableId) {
        const variableId = node.attrs.variableId as string;
        const varValue = values[variableId];
        return {
          ...node,
          attrs: {
            ...node.attrs,
            resolvedValue: varValue?.displayValue || `[${variableId}]`,
            hasValue: !!varValue?.value,
          },
        };
      }

      // Recurse into children
      if (node.content) {
        return {
          ...node,
          content: node.content
            .map(filterConditionals)
            .filter((n): n is TiptapNode => n !== null),
        };
      }

      return node;
    };

    return filterConditionals(content as TiptapNode) || { type: 'doc', content: [] };
  }, [content, values]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        dropcursor: false,
        gapcursor: false,
      }),
      Link.configure({
        openOnClick: false,
      }),
      Highlight,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      PreviewInjectorExtension,
      PreviewConditionalExtension,
      PreviewSignatureExtension,
      PreviewPageBreakExtension,
      PreviewImageExtension,
    ],
    content: transformedContent,
    editable: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none',
      },
    },
  });

  // Update content when values change
  useEffect(() => {
    if (editor && transformedContent) {
      editor.commands.setContent(transformedContent);
    }
  }, [editor, transformedContent]);

  if (!editor) return null;

  return (
    <div
      className={cn('preview-document', className)}
      style={{
        '--page-width': `${pageConfig.format.width}px`,
        '--page-padding-h': `${pageConfig.format.margins.left}px`,
        '--page-padding-v': `${pageConfig.format.margins.top}px`,
      } as React.CSSProperties}
    >
      <div
        className="bg-white dark:bg-gray-900 shadow-lg mx-auto"
        style={{
          width: pageConfig.format.width,
          minHeight: pageConfig.format.height,
          padding: `${pageConfig.format.margins.top}px ${pageConfig.format.margins.right}px ${pageConfig.format.margins.bottom}px ${pageConfig.format.margins.left}px`,
        }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};
