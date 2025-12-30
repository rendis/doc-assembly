import { create } from 'zustand';
// @ts-expect-error - tiptap types incompatible with moduleResolution: bundler
import type { Editor } from '@tiptap/core';
import type { Node } from '@tiptap/pm/model';

interface EditorStore {
  editor: Editor | null;
  setEditor: (editor: Editor | null) => void;
}

/**
 * Store global para acceder al editor desde cualquier componente.
 * Esto permite que componentes como SignerRoleItem puedan
 * interactuar con el editor sin necesidad de prop drilling.
 */
export const useEditorStore = create<EditorStore>()((set) => ({
  editor: null,
  setEditor: (editor) => set({ editor }),
}));

/**
 * Cuenta cuántos role injectables hay en el documento para un roleId específico.
 */
export function countRoleInjectables(editor: Editor | null, roleId: string): number {
  if (!editor) return 0;

  let count = 0;
  editor.state.doc.descendants((node: Node) => {
    if (
      node.type.name === 'injector' &&
      node.attrs.isRoleVariable === true &&
      node.attrs.roleId === roleId
    ) {
      count++;
    }
  });

  return count;
}

/**
 * Elimina todos los role injectables del documento para un roleId específico.
 * Retorna el número de nodos eliminados.
 */
export function deleteRoleInjectables(editor: Editor | null, roleId: string): number {
  if (!editor) return 0;

  // Collect positions of nodes to delete (in reverse order to maintain positions)
  const positionsToDelete: number[] = [];

  editor.state.doc.descendants((node: Node, pos: number) => {
    if (
      node.type.name === 'injector' &&
      node.attrs.isRoleVariable === true &&
      node.attrs.roleId === roleId
    ) {
      positionsToDelete.push(pos);
    }
  });

  if (positionsToDelete.length === 0) return 0;

  // Delete in reverse order to maintain correct positions
  positionsToDelete.sort((a, b) => b - a);

  let chain = editor.chain();
  for (const pos of positionsToDelete) {
    chain = chain.deleteRange({ from: pos, to: pos + 1 });
  }
  chain.run();

  return positionsToDelete.length;
}
