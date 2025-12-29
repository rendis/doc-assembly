// @ts-ignore
import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import type { SuggestionOptions } from '@tiptap/suggestion';
import { filterCommands, type SlashCommand } from './commands';

export interface SlashCommandsOptions {
  suggestion: Partial<SuggestionOptions<SlashCommand>>;
}

export const SlashCommandsExtension = Extension.create<SlashCommandsOptions>({
  name: 'slashCommands',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: false,
        command: ({ editor, range, props }: { editor: any; range: any; props: SlashCommand }) => {
          props.action(editor);
          editor.chain().focus().deleteRange(range).run();
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }: { query: string }) => filterCommands(query),
      }),
    ];
  },
});
