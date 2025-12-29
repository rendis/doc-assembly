import Mention from '@tiptap/extension-mention';
import type { MentionOptions } from '@tiptap/extension-mention';
import { filterVariables } from './variables';
import { mentionSuggestion } from './suggestion';

export const MentionExtension = Mention.configure({
  HTMLAttributes: {
    class: 'mention',
  },
  suggestion: {
    ...mentionSuggestion,
    items: ({ query }) => filterVariables(query),
  },
} as Partial<MentionOptions>);
