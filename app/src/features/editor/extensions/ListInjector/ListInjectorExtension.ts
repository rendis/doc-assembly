import { mergeAttributes, Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ListInjectorComponent } from './ListInjectorComponent'
import type { ListInjectorOptions } from './types'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    listInjector: {
      /**
       * Insert a list injector
       */
      setListInjector: (options: ListInjectorOptions) => ReturnType
    }
  }
}

export const ListInjectorExtension = Node.create({
  name: 'listInjector',

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      variableId: {
        default: null,
      },
      label: {
        default: 'Dynamic List',
      },
      lang: {
        default: 'en',
      },
      symbol: {
        default: 'bullet',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="listInjector"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'listInjector' }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ListInjectorComponent)
  },

  addCommands() {
    return {
      setListInjector:
        (options: ListInjectorOptions) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              variableId: options.variableId,
              label: options.label || 'Dynamic List',
              lang: options.lang || 'en',
              symbol: options.symbol || 'bullet',
            },
          })
        },
    }
  },
})
