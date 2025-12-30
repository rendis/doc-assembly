import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { useCallback, useRef, useState, useMemo, useEffect } from 'react';
import Moveable from 'react-moveable';
import { cn } from '@/lib/utils';
import { ImageAlignSelector } from './ImageAlignSelector';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ImageDisplayMode, ImageAlign } from './types';

export function ImageComponent({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const { src, alt, title, width, height, displayMode, align } = node.attrs as {
    src: string;
    alt?: string;
    title?: string;
    width?: number;
    height?: number;
    displayMode: ImageDisplayMode;
    align: ImageAlign;
  };

  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const editable = editor.isEditable;

  // Force re-render when image loads to ensure Moveable has a valid target
  useEffect(() => {
    setImageLoaded(false);
  }, [src]);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleAlignChange = useCallback((newDisplayMode: ImageDisplayMode, newAlign: ImageAlign) => {
    updateAttributes({
      displayMode: newDisplayMode,
      align: newAlign,
    });
  }, [updateAttributes]);

  const handleDelete = useCallback(() => {
    editor.commands.deleteSelection();
  }, [editor]);

  const containerStyles = useMemo(() => {
    const styles: React.CSSProperties = {};

    if (displayMode === 'block') {
      styles.display = 'flex';
      styles.clear = 'both';
      if (align === 'left') {
        styles.justifyContent = 'flex-start';
      } else if (align === 'center') {
        styles.justifyContent = 'center';
      } else if (align === 'right') {
        styles.justifyContent = 'flex-end';
      }
    } else {
      // inline/float mode
      if (align === 'left') {
        styles.float = 'left';
        styles.marginRight = '1rem';
        styles.marginBottom = '0.5rem';
      } else if (align === 'right') {
        styles.float = 'right';
        styles.marginLeft = '1rem';
        styles.marginBottom = '0.5rem';
      }
    }

    return styles;
  }, [displayMode, align]);

  const imageStyles = useMemo(() => {
    const styles: React.CSSProperties = {
      maxWidth: '100%',
      height: 'auto',
    };

    if (width) {
      styles.width = width;
      styles.maxWidth = 'none';
    }
    if (height) {
      styles.height = height;
    }

    return styles;
  }, [width, height]);

  return (
    <NodeViewWrapper
      as="div"
      className="relative my-2"
      style={containerStyles}
      ref={containerRef}
    >
      <div
        className={cn(
          'relative inline-block',
          selected && editable && 'ring-2 ring-primary ring-offset-2 rounded'
        )}
        data-drag-handle
      >
        <img
          ref={imageRef}
          src={src}
          alt={alt || ''}
          title={title || ''}
          style={imageStyles}
          className="block rounded"
          onLoad={handleImageLoad}
          draggable={false}
        />

        {/* Floating toolbar when selected */}
        {selected && editable && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-background border rounded-lg shadow-lg p-1 z-10">
            <ImageAlignSelector
              displayMode={displayMode}
              align={align}
              onChange={handleAlignChange}
            />
            <div className="w-px h-6 bg-border mx-1" />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleDelete}
              title="Eliminar imagen"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Moveable for resizing */}
      {selected && editable && imageLoaded && imageRef.current && (
        <Moveable
          key={`${displayMode}-${align}`}
          target={imageRef.current}
          resizable={true}
          keepRatio={true}
          throttleResize={0}
          edge={false}
          renderDirections={['se', 'sw', 'ne', 'nw']}
          onResize={({ target, width: newWidth, height: newHeight }) => {
            target.style.width = `${newWidth}px`;
            target.style.height = `${newHeight}px`;
          }}
          onResizeEnd={({ target }) => {
            const newWidth = parseInt(target.style.width, 10);
            const newHeight = parseInt(target.style.height, 10);
            updateAttributes({
              width: newWidth,
              height: newHeight,
            });
          }}
        />
      )}
    </NodeViewWrapper>
  );
}
