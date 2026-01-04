import { mergeAttributes, Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ConditionalComponent } from './ConditionalComponent'

export type LogicOperator = 'AND' | 'OR'

export type RuleOperator =
  // Comunes
  | 'eq'
  | 'neq'
  | 'empty'
  | 'not_empty'
  // TEXT
  | 'starts_with'
  | 'ends_with'
  | 'contains'
  // NUMBER/CURRENCY
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  // DATE
  | 'before'
  | 'after'
  // BOOLEAN
  | 'is_true'
  | 'is_false'

export type RuleValueMode = 'text' | 'variable'

export interface RuleValue {
  mode: RuleValueMode
  value: string
}

export interface LogicRule {
  id: string
  type: 'rule'
  variableId: string
  operator: RuleOperator
  value: RuleValue
}

export interface LogicGroup {
  id: string
  type: 'group'
  logic: LogicOperator
  children: (LogicRule | LogicGroup)[]
}

export type ConditionalSchema = LogicGroup

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    conditional: {
      setConditional: (options: {
        conditions?: ConditionalSchema
        expression?: string
      }) => ReturnType
    }
  }
}

export const ConditionalExtension = Node.create({
  name: 'conditional',

  group: 'block',

  content: 'block+',

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
        default: '',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="conditional"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'conditional' }),
      0,
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ConditionalComponent)
  },

  addCommands() {
    return {
      setConditional:
        (attributes: {
          conditions?: ConditionalSchema
          expression?: string
        }) =>
        ({
          commands,
        }: {
          commands: { wrapIn: (name: string, attrs: unknown) => boolean }
        }) => {
          return commands.wrapIn(this.name, attributes)
        },
    }
  },
})
