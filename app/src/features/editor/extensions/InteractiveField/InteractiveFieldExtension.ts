import { mergeAttributes, Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { InteractiveFieldComponent } from './InteractiveFieldComponent'

export type InteractiveFieldType = 'checkbox' | 'radio' | 'text'

export interface InteractiveFieldOption {
  id: string
  label: string
}

export interface InteractiveFieldAttrs {
  id: string
  fieldType: InteractiveFieldType
  roleId: string
  label: string
  required: boolean
  options: InteractiveFieldOption[]
  placeholder: string
  maxLength: number
}

export interface SetInteractiveFieldOptions {
  id?: string
  fieldType?: InteractiveFieldType
  roleId?: string
  label?: string
  required?: boolean
  options?: InteractiveFieldOption[]
  placeholder?: string
  maxLength?: number
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    interactiveField: {
      setInteractiveField: (options?: SetInteractiveFieldOptions) => ReturnType
    }
  }
}

export const InteractiveFieldExtension = Node.create({
  name: 'interactiveField',

  group: 'block',

  atom: true,

  draggable: true,

  allowGapCursor: false,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-id'),
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-id': attributes.id,
        }),
      },
      fieldType: {
        default: 'checkbox',
      },
      roleId: {
        default: '',
      },
      label: {
        default: '',
      },
      required: {
        default: false,
      },
      options: {
        default: [],
        parseHTML: (element: HTMLElement) => {
          const raw = element.getAttribute('data-options')
          if (raw) {
            try {
              return JSON.parse(raw)
            } catch {
              return []
            }
          }
          return []
        },
        renderHTML: (attributes: { options: InteractiveFieldOption[] }) => ({
          'data-options': JSON.stringify(attributes.options),
        }),
      },
      placeholder: {
        default: '',
      },
      maxLength: {
        default: 0,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="interactiveField"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'interactiveField' }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(InteractiveFieldComponent, {
      stopEvent: (event) => {
        const target = event.event.target as HTMLElement
        if (target.closest('[data-toolbar]') || target.closest('[data-drag-handle]')) {
          return true
        }
        return false
      },
    })
  },

  addKeyboardShortcuts() {
    return {
      'Mod-c': () => {
        const { selection } = this.editor.state
        if (selection.node?.type.name === this.name) {
          return true
        }
        return false
      },
      'Mod-x': () => {
        const { selection } = this.editor.state
        if (selection.node?.type.name === this.name) {
          return true
        }
        return false
      },
    }
  },

  addCommands() {
    return {
      setInteractiveField:
        (options?: SetInteractiveFieldOptions) =>
        ({
          commands,
        }: {
          commands: { insertContent: (content: unknown) => boolean }
        }) => {
          const attrs: SetInteractiveFieldOptions = {
            id: crypto.randomUUID(),
            fieldType: 'checkbox',
            roleId: '',
            label: '',
            required: false,
            options: [],
            placeholder: '',
            maxLength: 0,
            ...options,
          }

          return commands.insertContent({
            type: this.name,
            attrs,
          })
        },
    }
  },
})
