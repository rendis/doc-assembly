import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const dropCursorPluginKey = new PluginKey('customDropCursor');

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customDropCursor: {
      showDropCursor: (pos: number) => ReturnType;
      hideDropCursor: () => ReturnType;
    };
  }
}

export const DropCursorExtension = Extension.create({
  name: 'customDropCursor',

  addCommands() {
    return {
      showDropCursor:
        (pos: number) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(dropCursorPluginKey, pos);
          }
          return true;
        },
      hideDropCursor:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(dropCursorPluginKey, null);
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: dropCursorPluginKey,
        state: {
          init: () => null as number | null,
          apply(tr, value) {
            const meta = tr.getMeta(dropCursorPluginKey);
            if (meta !== undefined) return meta;
            return value;
          },
        },
        props: {
          decorations(state) {
            const pos = this.getState(state);
            if (pos === null) return DecorationSet.empty;

            const widget = document.createElement('div');
            widget.className = 'custom-drop-cursor';

            return DecorationSet.create(state.doc, [
              Decoration.widget(pos, widget, { side: -1 }),
            ]);
          },
          handleDOMEvents: {
            dragover: (view, event) => {
              const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
              if (pos) {
                view.dispatch(view.state.tr.setMeta(dropCursorPluginKey, pos.pos));
              }
              return false;
            },
            dragleave: (view) => {
              view.dispatch(view.state.tr.setMeta(dropCursorPluginKey, null));
              return false;
            },
            drop: (view) => {
              view.dispatch(view.state.tr.setMeta(dropCursorPluginKey, null));
              return false;
            },
          },
        },
      }),
    ];
  },
});
