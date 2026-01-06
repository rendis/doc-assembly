import { useCallback } from 'react';
import Moveable from 'react-moveable';
import { Button } from '@/components/ui/button';
import { Square, Circle, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ImageShape } from '../types';

interface ImageToolbarProps {
  imageRef: React.RefObject<HTMLImageElement | null>;
  shape: ImageShape;
  onShapeToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onResize: (width: number, height: number) => void;
  children?: React.ReactNode; // For position selector
}

export function ImageToolbar({
  imageRef,
  shape,
  onShapeToggle,
  onEdit,
  onDelete,
  onResize,
  children,
}: ImageToolbarProps) {
  const handleResize = useCallback(
    (e: { width: number; height: number; target: HTMLElement }) => {
      e.target.style.width = `${e.width}px`;
      e.target.style.height = `${e.height}px`;
    },
    []
  );

  const handleResizeEnd = useCallback(
    (e: { target: HTMLElement }) => {
      let newWidth = parseFloat(e.target.style.width);
      let newHeight = parseFloat(e.target.style.height);

      if (shape === 'circle') {
        const size = Math.max(newWidth, newHeight);
        newWidth = size;
        newHeight = size;
      }

      onResize(Math.round(newWidth), Math.round(newHeight));
    },
    [shape, onResize]
  );

  return (
    <>
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-background border rounded-lg shadow-lg p-1 z-10">
        {/* Align/Float selector slot */}
        {children}

        {children && <div className="w-px h-6 bg-border mx-1" />}

        {/* Shape buttons */}
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', shape === 'square' && 'bg-accent')}
          onClick={onShapeToggle}
          title="Cuadrado"
        >
          <Square className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', shape === 'circle' && 'bg-accent')}
          onClick={onShapeToggle}
          title="Circular"
        >
          <Circle className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Edit and delete */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onEdit}
          title="Editar imagen"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={onDelete}
          title="Eliminar imagen"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <Moveable
        target={imageRef}
        resizable
        keepRatio
        throttleResize={0}
        renderDirections={['nw', 'ne', 'sw', 'se']}
        onResize={({ width: w, height: h, target }) => {
          handleResize({ width: w, height: h, target: target as HTMLElement });
        }}
        onResizeEnd={({ target }) => {
          handleResizeEnd({ target: target as HTMLElement });
        }}
      />
    </>
  );
}
