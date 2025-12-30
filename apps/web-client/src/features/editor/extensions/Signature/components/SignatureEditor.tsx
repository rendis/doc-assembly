/* eslint-disable react-hooks/set-state-in-effect -- Sync external props to local state is a standard UI pattern */
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useState, useCallback, useEffect } from 'react';
import type {
  SignatureBlockAttrs,
  SignatureCount,
  SignatureItem,
  SignatureLayout,
  SignatureLineWidth,
} from '../types';
import {
  adjustSignaturesToCount,
  getDefaultLayoutForCount,
} from '../types';
import { SignatureLayoutSelector } from './SignatureLayoutSelector';
import { SignatureImageUpload } from './SignatureImageUpload';
import { SignatureRoleSelector } from './SignatureRoleSelector';

interface SignatureEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attrs: SignatureBlockAttrs;
  onSave: (attrs: SignatureBlockAttrs) => void;
}

const COUNT_OPTIONS: SignatureCount[] = [1, 2, 3, 4];
const LINE_WIDTH_OPTIONS: { value: SignatureLineWidth; label: string }[] = [
  { value: 'sm', label: 'Pequeña' },
  { value: 'md', label: 'Mediana' },
  { value: 'lg', label: 'Grande' },
];

export function SignatureEditor({
  open,
  onOpenChange,
  attrs,
  onSave,
}: SignatureEditorProps) {
  const [localAttrs, setLocalAttrs] = useState<SignatureBlockAttrs>(attrs);
  const [activeTab, setActiveTab] = useState(0);

  // Sincronizar cuando cambian los attrs externos
  useEffect(() => {
    setLocalAttrs(attrs);
    setActiveTab(0);
  }, [attrs]);

  const handleCountChange = useCallback((newCount: SignatureCount) => {
    setLocalAttrs((prev) => {
      const newSignatures = adjustSignaturesToCount(prev.signatures, newCount);
      const newLayout = getDefaultLayoutForCount(newCount);
      return {
        ...prev,
        count: newCount,
        layout: newLayout,
        signatures: newSignatures,
      };
    });
    setActiveTab(0);
  }, []);

  const handleLayoutChange = useCallback((newLayout: SignatureLayout) => {
    setLocalAttrs((prev) => ({
      ...prev,
      layout: newLayout,
    }));
  }, []);

  const handleLineWidthChange = useCallback((newWidth: SignatureLineWidth) => {
    setLocalAttrs((prev) => ({
      ...prev,
      lineWidth: newWidth,
    }));
  }, []);

  const handleSignatureUpdate = useCallback(
    (index: number, updates: Partial<SignatureItem>) => {
      setLocalAttrs((prev) => {
        const newSignatures = [...prev.signatures];
        newSignatures[index] = { ...newSignatures[index], ...updates };
        return { ...prev, signatures: newSignatures };
      });
    },
    []
  );

  const handleSave = useCallback(() => {
    onSave(localAttrs);
    onOpenChange(false);
  }, [localAttrs, onSave, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Configurar Bloque de Firma</DialogTitle>
        </DialogHeader>

        <motion.div
          layout
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="flex-1 overflow-hidden"
        >
          <div className="grid grid-cols-[200px_1fr] gap-4 h-full">
            {/* Panel izquierdo: Configuración general */}
            <motion.div layout className="space-y-4 border-r pr-4 pl-1 pb-1 overflow-hidden">
              {/* Cantidad de firmas */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Cantidad de firmas</Label>
                <div className="grid grid-cols-4 gap-1">
                  {COUNT_OPTIONS.map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => handleCountChange(count)}
                      className={cn(
                        'h-8 rounded border text-sm font-medium transition-colors',
                        localAttrs.count === count
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background hover:bg-accent border-input'
                      )}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              {/* Layout */}
              <div className="space-y-2 min-h-[280px]">
                <Label className="text-xs font-medium">Distribución</Label>
                <SignatureLayoutSelector
                  count={localAttrs.count}
                  value={localAttrs.layout}
                  onChange={handleLayoutChange}
                />
              </div>

              {/* Ancho de línea */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Ancho de línea</Label>
                <Select
                  value={localAttrs.lineWidth}
                  onValueChange={(value) =>
                    handleLineWidthChange(value as SignatureLineWidth)
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="min-w-[140px] p-1">
                    {LINE_WIDTH_OPTIONS.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        className="text-xs"
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </motion.div>

            {/* Panel derecho: Configuración por firma */}
            <div className="flex flex-col min-h-0">
              {/* Tabs de firmas */}
              <div className="flex border-b mb-3">
                {localAttrs.signatures.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setActiveTab(index)}
                    className={cn(
                      'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                      activeTab === index
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Firma {index + 1}
                  </button>
                ))}
              </div>

              {/* Contenido de la firma activa */}
              <ScrollArea className="flex-1">
                {localAttrs.signatures.map((signature, index) => (
                  <div
                    key={signature.id}
                    className={cn(
                      'space-y-4 px-1',
                      activeTab !== index && 'hidden'
                    )}
                  >
                    {/* Label */}
                    <div className="space-y-1">
                      <Label className="text-xs">Etiqueta</Label>
                      <Input
                        value={signature.label}
                        onChange={(e) =>
                          handleSignatureUpdate(index, { label: e.target.value })
                        }
                        placeholder="Ej: Firma del Cliente"
                        className="h-8 text-sm"
                      />
                    </div>

                    {/* Subtitle */}
                    <div className="space-y-1">
                      <Label className="text-xs">Subtítulo (opcional)</Label>
                      <Input
                        value={signature.subtitle || ''}
                        onChange={(e) =>
                          handleSignatureUpdate(index, {
                            subtitle: e.target.value || undefined,
                          })
                        }
                        placeholder="Ej: Representante Legal"
                        className="h-8 text-sm"
                      />
                    </div>

                    {/* Rol */}
                    <SignatureRoleSelector
                      roleId={signature.roleId}
                      signatureId={signature.id}
                      onChange={(roleId) =>
                        handleSignatureUpdate(index, { roleId })
                      }
                    />

                    {/* Imagen */}
                    <SignatureImageUpload
                      imageData={signature.imageData}
                      imageOriginal={signature.imageOriginal}
                      opacity={signature.imageOpacity ?? 100}
                      onImageChange={(imageData, imageOriginal) =>
                        handleSignatureUpdate(index, { imageData, imageOriginal })
                      }
                      onOpacityChange={(imageOpacity) =>
                        handleSignatureUpdate(index, { imageOpacity })
                      }
                    />
                  </div>
                ))}
              </ScrollArea>
            </div>
          </div>
        </motion.div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Guardar cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
