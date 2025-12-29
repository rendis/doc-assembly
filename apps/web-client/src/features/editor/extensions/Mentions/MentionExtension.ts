import Mention from '@tiptap/extension-mention';
// @ts-expect-error - TipTap types compatibility
import type { Editor } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import { filterVariables, type MentionVariable } from './variables';
import { variableSuggestion } from './suggestion';

const MentionPluginKey = new PluginKey('mentionSuggestion');

export const MentionExtension = Mention.configure({
  suggestion: {
    char: '@',
    pluginKey: MentionPluginKey,
    allowSpaces: true,
    ...variableSuggestion,
    items: ({ query }: { query: string }) => filterVariables(query),
    command: ({ editor, range, props }: { editor: Editor; range: { from: number; to: number }; props: unknown }) => {
      const item = props as MentionVariable;
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setInjector({
          type: item.type,
          label: item.label,
          variableId: item.id,
        })
        .run();
    },
  },
});
