// @ts-expect-error - TipTap types are not fully compatible with strict mode
import { mergeAttributes, Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { InjectorComponent } from './InjectorComponent';
import type { InjectorType } from '../../data/variables';
import type { RolePropertyKey } from '../../types/role-injectable';

export interface InjectorOptions {
  type: InjectorType;
  label: string;
  variableId?: string;
  /** Indica si es una variable de rol */
  isRoleVariable?: boolean;
  /** ID del rol (solo para role variables) */
  roleId?: string;
  /** Label del rol (solo para role variables) */
  roleLabel?: string;
  /** Key de la propiedad: 'name', 'email' (solo para role variables) */
  propertyKey?: RolePropertyKey;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    setInjector: (options: InjectorOptions) => ReturnType;
  }
}

export const InjectorExtension = Node.create({
  name: 'injector',

  group: 'inline',

  inline: true,

  atom: true,

  allowGapCursor: false,

  addAttributes() {
    return {
      type: {
        default: 'TEXT',
      },
      label: {
        default: 'Variable',
      },
      variableId: {
        default: null,
      },
      format: {
        default: null,
      },
      required: {
        default: false,
      },
      // Atributos para role injectables
      isRoleVariable: {
        default: false,
      },
      roleId: {
        default: null,
      },
      roleLabel: {
        default: null,
      },
      propertyKey: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="injector"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'injector' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(InjectorComponent);
  },

  addCommands() {
    return {
      setInjector:
        (options: InjectorOptions) =>
        ({ commands }: { commands: { insertContent: (content: unknown) => boolean } }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});
