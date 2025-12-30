import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { User } from 'lucide-react';
import type { SignatureItem, SignatureLineWidth } from '../types';
import { getLineWidthClasses } from '../signature-layouts';
import { useSignerRolesContextSafe } from '@/features/editor/context/SignerRolesContext';

interface SignatureItemViewProps {
  signature: SignatureItem;
  lineWidth: SignatureLineWidth;
  className?: string;
}

export function SignatureItemView({
  signature,
  lineWidth,
  className,
}: SignatureItemViewProps) {
  const lineWidthClasses = getLineWidthClasses(lineWidth);
  const rolesContext = useSignerRolesContextSafe();

  const assignedRole = useMemo(() => {
    if (!signature.roleId || !rolesContext) return null;
    return rolesContext.getRoleById(signature.roleId);
  }, [signature.roleId, rolesContext]);

  const imageStyles = useMemo(() => {
    if (!signature.imageData) return {};
    return {
      opacity: (signature.imageOpacity ?? 100) / 100,
      mixBlendMode: 'multiply' as const,
    };
  }, [signature.imageData, signature.imageOpacity]);

  return (
    <div className={cn('relative flex flex-col items-center pt-24', className)}>
      {/* Badge de rol asignado */}
      {assignedRole && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
            <User className="h-2.5 w-2.5" />
            {assignedRole.label}
          </span>
        </div>
      )}

      {/* Imagen de firma (si existe) */}
      {signature.imageData && (
        <div className="mb-2 h-16 flex items-end justify-center">
          <img
            src={signature.imageData}
            alt="Firma"
            className="max-h-16 max-w-full object-contain"
            style={imageStyles}
          />
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
