// @ts-ignore
import { mergeAttributes, Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ConditionalComponent } from './ConditionalComponent';

export type LogicOperator = 'AND' | 'OR';
export type RuleOperator = 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'empty' | 'not_empty';

export interface LogicRule {
  id: string;
  type: 'rule';
  variableId: string; // The ID of the variable dragged in
  operator: RuleOperator;
  value: string; // Static value or another variable
}

export interface LogicGroup {
  id: string;
  type: 'group';
  logic: LogicOperator;
  children: (LogicRule | LogicGroup)[];
}

export type ConditionalSchema = LogicGroup; // Root is always a group

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    setConditional: (options: { conditions?: ConditionalSchema; expression?: string }) => ReturnType;
  }
}

export const ConditionalExtension = Node.create({
  name: 'conditional',

  group: 'block',

  content: 'block+',

  draggable: true,

  selectable: false,

  allowGapCursor: false,

  addAttributes() {
    return {
      conditions: {
        default: {
          id: 'root',
          type: 'group',
          logic: 'AND',
          children: [],
        } as LogicGroup,
      },
      expression: {
        default: '', // Human readable summary
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="conditional"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'conditional' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ConditionalComponent);
  },

  addCommands() {
    return {
      setConditional:
        (attributes: { conditions?: ConditionalSchema; expression?: string }) =>
        ({ commands }: { commands: any }) => {
          return commands.wrapIn(this.name, attributes);
        },
    };
  },
});
