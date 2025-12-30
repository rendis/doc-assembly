import { useState, useMemo } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
// @ts-expect-error - NodeViewProps is not exported in type definitions
import type { NodeViewProps } from '@tiptap/react';
import { cn } from '@/lib/utils';
import {
  Calendar,
  CheckSquare,
  Coins,
  Hash,
  Image as ImageIcon,
  Table,
  Type,
  User,
  Mail,
  AlertTriangle,
} from 'lucide-react';
import { EditorNodeContextMenu } from '../../components/EditorNodeContextMenu';
import type { RolePropertyKey } from '../../types/role-injectable';
import { ROLE_PROPERTIES } from '../../types/role-injectable';
import { useSignerRolesStore } from '../../stores/signer-roles-store';

const icons = {
  TEXT: Type,
  NUMBER: Hash,
  DATE: Calendar,
  CURRENCY: Coins,
  BOOLEAN: CheckSquare,
  IMAGE: ImageIcon,
  TABLE: Table,
  ROLE_TEXT: User,
};

// Iconos específicos para propiedades de rol
const rolePropertyIcons: Record<RolePropertyKey, typeof User> = {
  name: User,
  email: Mail,
};

export const InjectorComponent = (props: NodeViewProps) => {
  const { node, selected, deleteNode } = props;
  const { label, type, format, isRoleVariable, propertyKey, roleId } = node.attrs;

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Obtener el rol actual del store para actualización dinámica
  const roles = useSignerRolesStore((state) => state.roles);

  // Resolver el label dinámicamente para role injectables
  const { displayLabel, roleExists } = useMemo(() => {
    if (!isRoleVariable || !roleId) {
      return { displayLabel: label || 'Variable', roleExists: true };
    }

    const currentRole = roles.find((r) => r.id === roleId);
    if (!currentRole) {
      // El rol fue eliminado - mostrar warning
      return { displayLabel: label || 'Rol eliminado', roleExists: false };
    }

    // Obtener el label de la propiedad
    const propDef = ROLE_PROPERTIES.find((p) => p.key === propertyKey);
    const propLabel = propDef?.defaultLabel || propertyKey || '';

    return {
      displayLabel: `${currentRole.label}.${propLabel}`,
      roleExists: true,
    };
  }, [isRoleVariable, roleId, roles, label, propertyKey]);

  // Seleccionar icono basado en si es role variable y si existe
  const Icon = useMemo(() => {
    if (isRoleVariable && !roleExists) {
      return AlertTriangle;
    }
    if (isRoleVariable && propertyKey) {
      return rolePropertyIcons[propertyKey as RolePropertyKey] || User;
    }
    return icons[type as keyof typeof icons] || Type;
  }, [isRoleVariable, roleExists, propertyKey, type]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <NodeViewWrapper as="span" className="mx-1">
      <span
        contentEditable={false}
        onContextMenu={handleContextMenu}
        title={!roleExists ? 'Este rol ha sido eliminado' : undefined}
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-sm font-medium transition-colors select-none border',
          selected ? 'ring-2 ring-ring ring-offset-2' : '',
          // Estado de warning: rol eliminado
          isRoleVariable && !roleExists
            ? [
                'bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/30',
                'dark:bg-destructive/20 dark:text-destructive dark:border-destructive/40',
              ]
            : // Estilos diferenciados para role variables (púrpura)
              isRoleVariable
              ? [
                  // Light mode: violet/purple
                  'bg-violet-100 text-violet-700 hover:bg-violet-200 border-violet-300/50',
                  // Dark mode: violet with dashed border
                  'dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-900/50 dark:border-dashed dark:border-violet-500/50',
                ]
              : [
                  // Light mode: blue (variables regulares)
                  'bg-primary/10 text-primary hover:bg-primary/20 border-primary/20',
                  // Dark mode: info (cyan) with dashed border
                  'dark:bg-info/15 dark:text-info dark:hover:bg-info/25 dark:border-dashed dark:border-info/50',
                ]
        )}
      >
        <Icon className="h-3 w-3" />
        {displayLabel}
        {format && (
          <span className="text-[10px] opacity-70 bg-background/50 px-1 rounded font-mono">
            {format}
          </span>
        )}
      </span>

      {contextMenu && (
        <EditorNodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeType="injector"
          onDelete={deleteNode}
          onClose={() => setContextMenu(null)}
        />
      )}
    </NodeViewWrapper>
  );
};
