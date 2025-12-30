import HorizontalRule from '@tiptap/extension-horizontal-rule';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { PageBreakHRComponent } from './PageBreakHRComponent';

export const PageBreakHR = HorizontalRule.extend({
  name: 'pageBreak',

  addAttributes() {
    return {
      ...this.parent?.(),
      type: {
        default: 'pagebreak',
        parseHTML: (element) => element.getAttribute('data-type'),
        renderHTML: (attributes) => {
          return {
            'data-type': attributes.type,
          };
        },
      },
    };
  },

  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ commands }) => {
          return commands.setHorizontalRule();
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Enter': () => this.editor.commands.setPageBreak(),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(PageBreakHRComponent);
  },

  parseHTML() {
    return [
      { tag: 'hr[data-type="pagebreak"]' },
      { tag: 'hr.page-break' },
      { tag: 'div[data-type="page-break"]' }, // Backward compatibility
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['hr', { ...HTMLAttributes, 'data-type': 'pagebreak', class: 'manual-page-break' }];
  },
});
