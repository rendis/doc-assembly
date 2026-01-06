import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { cn } from '@/lib/utils';
import { ImageToolbar } from '../shared/ImageToolbar';
import { ImagePositionSelector } from '../shared/ImagePositionSelector';
import type { InlineImageFloat, ImageShape, ImageAlignOption } from '../types';

export function InlineImageComponent({ node, updateAttributes, selected, deleteNode, editor }: NodeViewProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const { src, alt, title, width, height, float: floatDir, shape } = node.attrs as {
    src: string;
    alt?: string;
    title?: string;
    width?: number;
    height?: number;
    float: InlineImageFloat;
    shape: ImageShape;
  };

  const handlePositionSelect = useCallback(
    (option: ImageAlignOption) => {
      if (option.displayMode === 'inline') {
        // Same type, just change float direction
        updateAttributes({ float: option.align });
      } else {
        // Convert to block and set alignment
        editor
          .chain()
          .focus()
          .convertInlineToBlock()
          .updateAttributes('blockImage', { align: option.align })
          .run();
      }
    },
    [updateAttributes, editor]
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
        detail: { shape, imageType: 'inline' },
      })
    );
  }, [editor, shape]);

  const handleDelete = useCallback(() => {
    deleteNode();
  }, [deleteNode]);

  const handleResize = useCallback(
    (newWidth: number, newHeight: number) => {
      updateAttributes({ width: newWidth, height: newHeight });
    },
    [updateAttributes]
  );

  useEffect(() => {
    if (imageRef.current) {
      if (width) imageRef.current.style.width = `${width}px`;
      if (height) imageRef.current.style.height = `${height}px`;
    }
  }, [width, height]);

  // Inline images use CSS float for text wrapping within the same paragraph
  const containerStyles = useMemo((): React.CSSProperties => {
    const styles: React.CSSProperties = {
      display: 'inline-block',
      maxWidth: '50%',
      marginBottom: '0.5rem',
    };

    if (floatDir === 'left') {
      styles.float = 'left';
      styles.marginRight = '1rem';
    } else {
      styles.float = 'right';
      styles.marginLeft = '1rem';
    }

    return styles;
  }, [floatDir]);

  const imageStyles = cn(
    'max-w-full cursor-pointer transition-shadow',
    shape === 'circle' && 'rounded-full',
    selected && 'ring-2 ring-primary ring-offset-2'
  );

  return (
    <NodeViewWrapper
      as="span"
      className="relative group"
      style={containerStyles}
      data-type="inline-image"
    >
      <span className="relative inline-block">
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
          <ImageToolbar
            imageRef={imageRef}
            shape={shape}
            onShapeToggle={handleShapeToggle}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onResize={handleResize}
          >
            <ImagePositionSelector
              currentType="inline"
              currentPosition={floatDir}
              onSelect={handlePositionSelect}
            />
          </ImageToolbar>
        )}
      </span>
    </NodeViewWrapper>
  );
}
