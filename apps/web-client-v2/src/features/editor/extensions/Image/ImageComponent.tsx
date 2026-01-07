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

  // Obtener dimensiones máximas del área de contenido de la página
  const getMaxDimensions = useCallback(() => {
    const pageContainer = containerRef.current?.closest('.rm-with-pagination');
    if (pageContainer) {
      const computedStyle = getComputedStyle(pageContainer);
      const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
      const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
      const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
      const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;

      return {
        maxWidth: pageContainer.clientWidth - paddingLeft - paddingRight,
        maxHeight: pageContainer.clientHeight - paddingTop - paddingBottom,
      };
    }
    // Fallback a dimensiones razonables
    return { maxWidth: 700, maxHeight: 900 };
  }, []);

  // Establecer dimensiones iniciales cuando la imagen carga (si no están definidas)
  const handleImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      setImageLoaded(true);

      // Si no hay dimensiones definidas, establecerlas desde la imagen natural
      if (!width || !height) {
        const img = e.currentTarget;
        const { maxWidth, maxHeight } = getMaxDimensions();
        let newWidth = img.naturalWidth;
        let newHeight = img.naturalHeight;

        // Aplicar límites de página si la imagen es muy grande
        const ratio = newWidth / newHeight;
        if (newWidth > maxWidth) {
          newWidth = maxWidth;
          newHeight = newWidth / ratio;
        }
        if (newHeight > maxHeight) {
          newHeight = maxHeight;
          newWidth = newHeight * ratio;
        }

        updateAttributes({
          width: Math.round(newWidth),
          height: Math.round(newHeight),
        });
      }
    },
    [width, height, getMaxDimensions, updateAttributes]
  );

  const handleResize = useCallback(
    (e: { width: number; height: number; target: HTMLElement }) => {
      const { maxWidth, maxHeight } = getMaxDimensions();
      let newWidth = e.width;
      let newHeight = e.height;

      // Mantener ratio cuando se alcanza el límite
      const ratio = e.width / e.height;

      if (newWidth > maxWidth) {
        newWidth = maxWidth;
        newHeight = newWidth / ratio;
      }
      if (newHeight > maxHeight) {
        newHeight = maxHeight;
        newWidth = newHeight * ratio;
      }

      e.target.style.width = `${newWidth}px`;
      e.target.style.height = `${newHeight}px`;
    },
    [getMaxDimensions]
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
      // inline/float mode - texto envuelve la imagen
      styles.maxWidth = '50%';
      styles.marginBottom = '0.5rem';

      if (align === 'left') {
        styles.float = 'left';
        styles.marginRight = '1rem';
      } else if (align === 'right') {
        styles.float = 'right';
        styles.marginLeft = '1rem';
      } else {
        // center fallback
        styles.display = 'inline-block';
        styles.verticalAlign = 'top';
      }
    }

    return styles;
  }, [displayMode, align]);

  // Image styles siguiendo la lógica de v1: maxWidth: 'none' cuando hay width explícito
  const imageStyles = useMemo((): React.CSSProperties => {
    const styles: React.CSSProperties = {
      maxWidth: '100%',
      height: 'auto',
    };

    if (width) {
      styles.width = width;
      styles.maxWidth = 'none'; // Permite agrandar más allá del contenedor
    }
    if (height) {
      styles.height = height;
    }
    if (shape === 'circle') {
      styles.borderRadius = '50%';
    }

    return styles;
  }, [width, height, shape]);

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
          style={imageStyles}
          className={cn(
            'cursor-pointer transition-shadow',
            selected && 'ring-2 ring-primary ring-offset-2',
            shape === 'circle' && 'rounded-full'
          )}
          onLoad={handleImageLoad}
          draggable={false}
        />

        {selected && imageLoaded && (
          <>
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-background border rounded-lg shadow-lg p-1 z-50">
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
