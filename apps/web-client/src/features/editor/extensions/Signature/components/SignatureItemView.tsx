import { cn } from '@/lib/utils';
import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { User } from 'lucide-react';
import Moveable from 'react-moveable';
import type { SignatureItem, SignatureLineWidth } from '../types';
import { getLineWidthClasses } from '../signature-layouts';
import { useSignerRolesContextSafe } from '@/features/editor/context/SignerRolesContext';

interface ImageTransform {
  imageRotation: number;
  imageScale: number;
  imageX: number;
  imageY: number;
}

interface SignatureItemViewProps {
  signature: SignatureItem;
  lineWidth: SignatureLineWidth;
  className?: string;
  editable?: boolean;
  onImageTransformChange?: (transform: Partial<ImageTransform>) => void;
}

export function SignatureItemView({
  signature,
  lineWidth,
  className,
  editable = false,
  onImageTransformChange,
}: SignatureItemViewProps) {
  const lineWidthClasses = getLineWidthClasses(lineWidth);
  const rolesContext = useSignerRolesContextSafe();
  const imageRef = useRef<HTMLImageElement>(null);
  const [isSelected, setIsSelected] = useState(false);

  // Reset image selection when editable state changes
  useEffect(() => {
    setIsSelected(false);
  }, [editable]);

  const assignedRole = useMemo(() => {
    if (!signature.roleId || !rolesContext) return null;
    return rolesContext.getRoleById(signature.roleId);
  }, [signature.roleId, rolesContext]);

  // Compute transform from signature values
  const imageTransform = useMemo(() => {
    const rotation = signature.imageRotation ?? 0;
    const scale = signature.imageScale ?? 1;
    const x = signature.imageX ?? 0;
    const y = signature.imageY ?? 0;
    return `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${scale})`;
  }, [signature.imageRotation, signature.imageScale, signature.imageX, signature.imageY]);

  const imageStyles = useMemo(() => {
    if (!signature.imageData) return {};
    return {
      opacity: (signature.imageOpacity ?? 100) / 100,
      mixBlendMode: 'multiply' as const,
      transform: imageTransform,
    };
  }, [signature.imageData, signature.imageOpacity, imageTransform]);

  const handleImageClick = useCallback(() => {
    if (editable) {
      setIsSelected(true);
    }
  }, [editable]);

  const handleClickOutside = useCallback(() => {
    setIsSelected(false);
  }, []);

  return (
    <div
      className={cn('relative flex flex-col items-center pt-24', className)}
      onClick={handleClickOutside}
    >
      {/* Badge de rol asignado */}
      {assignedRole && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
          <span className="inline-flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
            <User className="h-2.5 w-2.5" />
            {assignedRole.label}
          </span>
        </div>
      )}

      {/* Imagen de firma (si existe) */}
      {signature.imageData && (
        <div
          className="mb-2 h-20 flex items-end justify-center relative"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            ref={imageRef}
            src={signature.imageData}
            alt="Firma"
            className={cn(
              'max-h-20 max-w-full object-contain',
              editable && !isSelected && 'cursor-pointer',
              editable && isSelected && 'cursor-move'
            )}
            style={imageStyles}
            onClick={handleImageClick}
          />

          {/* Moveable controls - only when editable and selected */}
          {editable && isSelected && imageRef.current && (
            <Moveable
              target={imageRef.current}
              draggable={true}
              rotatable={true}
              scalable={true}
              keepRatio={true}
              throttleDrag={0}
              throttleRotate={0}
              throttleScale={0}
              onDrag={({ target, transform }) => {
                target.style.transform = transform;
              }}
              onDragEnd={({ target }) => {
                // Parse transform to extract values
                const style = target.style.transform;
                const translateMatch = style.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
                if (translateMatch && onImageTransformChange) {
                  onImageTransformChange({
                    imageX: parseFloat(translateMatch[1]),
                    imageY: parseFloat(translateMatch[2]),
                  });
                }
              }}
              onRotate={({ target, transform }) => {
                target.style.transform = transform;
              }}
              onRotateEnd={({ target }) => {
                const style = target.style.transform;
                const rotateMatch = style.match(/rotate\(([^)]+)deg\)/);
                if (rotateMatch && onImageTransformChange) {
                  onImageTransformChange({
                    imageRotation: parseFloat(rotateMatch[1]),
                  });
                }
              }}
              onScale={({ target, transform }) => {
                target.style.transform = transform;
              }}
              onScaleEnd={({ target }) => {
                const style = target.style.transform;
                const scaleMatch = style.match(/scale\(([^)]+)\)/);
                if (scaleMatch && onImageTransformChange) {
                  onImageTransformChange({
                    imageScale: parseFloat(scaleMatch[1]),
                  });
                }
              }}
            />
          )}
        </div>
      )}

      {/* Línea de firma */}
      <div
        className={cn(
          'h-px bg-foreground/60',
          lineWidthClasses
        )}
      />

      {/* Label (texto superior/título) */}
      <div className="mt-2 text-center">
        <p className="text-sm font-medium text-foreground">
          {signature.label || 'Firma'}
        </p>

        {/* Subtitle (texto inferior) */}
        {signature.subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {signature.subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
