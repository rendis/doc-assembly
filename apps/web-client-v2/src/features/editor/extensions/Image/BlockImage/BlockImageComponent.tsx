import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { cn } from '@/lib/utils';
import { ImageToolbar } from '../shared/ImageToolbar';
import { ImagePositionSelector } from '../shared/ImagePositionSelector';
import type { BlockImageAlign, ImageShape, ImageAlignOption } from '../types';

export function BlockImageComponent({ node, updateAttributes, selected, deleteNode, editor }: NodeViewProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const { src, alt, title, width, height, align, shape } = node.attrs as {
    src: string;
    alt?: string;
    title?: string;
    width?: number;
    height?: number;
    align: BlockImageAlign;
    shape: ImageShape;
  };

  const handlePositionSelect = useCallback(
    (option: ImageAlignOption) => {
      if (option.displayMode === 'block') {
        // Same type, just change alignment
        updateAttributes({ align: option.align });
      } else {
        // Convert to inline and set float
        editor
          .chain()
          .focus()
          .convertBlockToInline()
          .updateAttributes('inlineImage', { float: option.align })
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
        detail: { shape, imageType: 'block' },
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

  const containerStyles = useMemo((): React.CSSProperties => {
    const styles: React.CSSProperties = {
      display: 'flex',
    };

    if (align === 'left') {
      styles.justifyContent = 'flex-start';
    } else if (align === 'center') {
      styles.justifyContent = 'center';
    } else if (align === 'right') {
      styles.justifyContent = 'flex-end';
    }

    return styles;
  }, [align]);

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
      data-type="block-image"
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
          <ImageToolbar
            imageRef={imageRef}
            shape={shape}
            onShapeToggle={handleShapeToggle}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onResize={handleResize}
          >
            <ImagePositionSelector
              currentType="block"
              currentPosition={align}
              onSelect={handlePositionSelect}
            />
          </ImageToolbar>
        )}
      </div>
    </NodeViewWrapper>
  );
}
