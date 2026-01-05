import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import Moveable from 'react-moveable';
import { Button } from '@/components/ui/button';
import { Square, Circle, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageAlignSelector } from './ImageAlignSelector';
import type { ImageDisplayMode, ImageAlign, ImageShape } from './types';

export function ImageComponent({ node, updateAttributes, selected, deleteNode, editor }: NodeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const { src, alt, title, width, height, displayMode, align, shape } = node.attrs as {
    src: string;
    alt?: string;
    title?: string;
    width?: number;
    height?: number;
    displayMode: ImageDisplayMode;
    align: ImageAlign;
    shape: ImageShape;
  };

  const handleAlignChange = useCallback(
    (newDisplayMode: ImageDisplayMode, newAlign: ImageAlign) => {
      updateAttributes({ displayMode: newDisplayMode, align: newAlign });
    },
    [updateAttributes]
  );

  const handleShapeToggle = useCallback(() => {
    const newShape: ImageShape = shape === 'square' ? 'circle' : 'square';

    if (newShape === 'circle' && width && height && width !== height) {
      const size = Math.min(width, height);
      updateAttributes({ shape: newShape, width: size, height: size });
    } else {
      updateAttributes({ shape: newShape });
    }
  }, [shape, width, height, updateAttributes]);

  const handleEdit = useCallback(() => {
    editor.view.dom.dispatchEvent(
      new CustomEvent('editor:edit-image', {
        bubbles: true,
        detail: { shape },
      })
    );
  }, [editor, shape]);

  const handleDelete = useCallback(() => {
    deleteNode();
  }, [deleteNode]);

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

      updateAttributes({ width: Math.round(newWidth), height: Math.round(newHeight) });
    },
    [shape, updateAttributes]
  );

  useEffect(() => {
    if (imageRef.current) {
      if (width) imageRef.current.style.width = `${width}px`;
      if (height) imageRef.current.style.height = `${height}px`;
    }
  }, [width, height]);

  // Use inline styles instead of Tailwind classes to avoid CSS cascade issues with PaginationPlus
  const containerStyles = useMemo((): React.CSSProperties => {
    const styles: React.CSSProperties = {};

    if (displayMode === 'block') {
      styles.display = 'flex';
      if (align === 'left') {
        styles.justifyContent = 'flex-start';
      } else if (align === 'center') {
        styles.justifyContent = 'center';
      } else if (align === 'right') {
        styles.justifyContent = 'flex-end';
      }
    } else {
      // inline mode - usar inline-block (compatible con PaginationPlus)
      styles.display = 'inline-block';
      styles.verticalAlign = 'top';
      styles.maxWidth = '50%';
      styles.marginBottom = '0.5rem';

      if (align === 'left') {
        styles.marginRight = '1rem';
      } else if (align === 'right') {
        styles.marginLeft = '1rem';
      }
    }

    return styles;
  }, [displayMode, align]);

  const imageStyles = cn(
    'max-w-full cursor-pointer transition-shadow',
    shape === 'circle' && 'rounded-full',
    selected && 'ring-2 ring-primary ring-offset-2'
  );

  return (
    <NodeViewWrapper
      as="div"
      className="relative my-2 group"
      style={containerStyles}
      ref={containerRef}
    >
      <div className="relative inline-block">
        <img
          ref={imageRef}
          src={src}
          alt={alt || ''}
          title={title}
          className={imageStyles}
          style={{
            width: width ? `${width}px` : undefined,
            height: height ? `${height}px` : undefined,
          }}
          onLoad={() => setImageLoaded(true)}
          draggable={false}
        />

        {selected && imageLoaded && (
          <>
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-background border rounded-lg shadow-lg p-1 z-10">
              <ImageAlignSelector
                displayMode={displayMode}
                align={align}
                onChange={handleAlignChange}
              />
              <div className="w-px h-6 bg-border mx-1" />
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-8 w-8', shape === 'square' && 'bg-accent')}
                onClick={handleShapeToggle}
                title="Cuadrado"
              >
                <Square className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-8 w-8', shape === 'circle' && 'bg-accent')}
                onClick={handleShapeToggle}
                title="Circular"
              >
                <Circle className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-border mx-1" />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleEdit}
                title="Editar imagen"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={handleDelete}
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
        )}
      </div>
    </NodeViewWrapper>
  );
}
