// @ts-ignore
import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import type { SuggestionOptions } from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';
import { filterVariables, type MentionVariable } from './variables';
import { variableSuggestion } from './suggestion';

const MentionPluginKey = new PluginKey('mentionSuggestion');

export interface VariableSuggestionOptions {
  suggestion: Partial<SuggestionOptions<MentionVariable>>;
}

export const MentionExtension = Extension.create<VariableSuggestionOptions>({
  name: 'variableSuggestion',

  addOptions() {
    return {
      suggestion: {
        char: '@',
        command: ({ editor, range, props }: { editor: any; range: any; props: MentionVariable }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setInjector({
              type: props.type,
              label: props.label,
              variableId: props.id,
            })
            .run();
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        pluginKey: MentionPluginKey,
        char: '@',
        allowSpaces: true,
        allowedPrefixes: null,
        ...this.options.suggestion,
        ...variableSuggestion,
        items: ({ query }: { query: string }) => filterVariables(query),
      }),
    ];
  },
});
