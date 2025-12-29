// @ts-ignore
import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import type { SuggestionOptions } from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';
import { filterCommands, type SlashCommand } from './commands';

const SlashCommandsPluginKey = new PluginKey('slashCommands');

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
        pluginKey: SlashCommandsPluginKey,
        char: '/',
        allowSpaces: true,
        allowedPrefixes: null,
        ...this.options.suggestion,
        items: ({ query }: { query: string }) => filterCommands(query),
      }),
    ];
  },
});
