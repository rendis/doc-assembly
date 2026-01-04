import { useEffect, useRef } from 'react'
import { Trash2, Pencil } from 'lucide-react'

export type NodeContextType =
  | 'injector'
  | 'signature'
  | 'conditional'
  | 'pageBreak'

interface EditorNodeContextMenuProps {
  x: number
  y: number
  nodeType: NodeContextType
  onDelete: () => void
  onEdit?: () => void
  onClose: () => void
}

const NODE_TYPE_LABELS: Record<NodeContextType, string> = {
  injector: 'Variable',
  signature: 'Firma',
  conditional: 'Condicional',
  pageBreak: 'Salto de página',
}

export const EditorNodeContextMenu = ({
  x,
  y,
  nodeType,
  onDelete,
  onEdit,
  onClose,
}: EditorNodeContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  // Adjust position to stay within viewport
  const adjustedPosition = {
    x: Math.min(x, window.innerWidth - 180),
    y: Math.min(y, window.innerHeight - 120),
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-popover border border-gray-100 rounded-lg shadow-lg py-1 min-w-[160px]"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      {onEdit && (
        <button
          onClick={() => {
            onEdit()
            onClose()
          }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-black hover:bg-gray-50 transition-colors text-left"
        >
          <Pencil className="h-4 w-4" />
          <span>Editar {NODE_TYPE_LABELS[nodeType]}</span>
        </button>
      )}

      <button
        onClick={() => {
          onDelete()
          onClose()
        }}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-gray-50 transition-colors text-left"
      >
        <Trash2 className="h-4 w-4" />
        <span>Eliminar</span>
      </button>
    </div>
  )
}
