import { useState, useEffect } from 'react';
import { FileText, Settings2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePaginationStore, PAGE_FORMATS } from '../stores/pagination-store';
import type { PageMargins, PageFormat } from '../types/pagination';
// @ts-expect-error - TipTap types compatibility
import type { Editor } from '@tiptap/core';

interface PageSettingsToolbarProps {
  editor: Editor | null;
}

export const PageSettingsToolbar = ({ editor }: PageSettingsToolbarProps) => {
  const { config, setFormat, setCustomFormat } = usePaginationStore();
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [customValues, setCustomValues] = useState({
    width: config.format.width,
    height: config.format.height,
    marginTop: config.format.margins.top,
    marginBottom: config.format.margins.bottom,
    marginLeft: config.format.margins.left,
    marginRight: config.format.margins.right,
  });

  // Sync pagination options with the editor extension
  // Pass FULL page dimensions - extension handles margins internally
  const syncPaginationOptions = (format: PageFormat) => {
    if (editor?.commands?.setPaginationOptions) {
      editor.commands.setPaginationOptions({
        pageHeight: format.height,
        pageWidth: format.width,
        pageMargin: format.margins.top,
      });
    }
  };

  // Sync on mount and when config changes
  useEffect(() => {
    syncPaginationOptions(config.format);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.format, editor]);

  const handleFormatChange = (value: string) => {
    if (value === 'CUSTOM') {
      // Pre-fill with current values
      setCustomValues({
        width: config.format.width,
        height: config.format.height,
        marginTop: config.format.margins.top,
        marginBottom: config.format.margins.bottom,
        marginLeft: config.format.margins.left,
        marginRight: config.format.margins.right,
      });
      setCustomDialogOpen(true);
      return;
    }
    const format = PAGE_FORMATS[value];
    if (format) {
      setFormat(format);
      syncPaginationOptions(format);
    }
  };

  const handleCustomSave = () => {
    const margins: PageMargins = {
      top: customValues.marginTop,
      bottom: customValues.marginBottom,
      left: customValues.marginLeft,
      right: customValues.marginRight,
    };
    setCustomFormat(customValues.width, customValues.height, margins);

    // Sync with pagination extension
    syncPaginationOptions({
      id: 'CUSTOM',
      name: 'Personalizado',
      width: customValues.width,
      height: customValues.height,
      margins,
    });

    setCustomDialogOpen(false);
  };

  const handleInputChange = (field: keyof typeof customValues, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      setCustomValues((prev) => ({ ...prev, [field]: numValue }));
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/30">
        <FileText className="h-4 w-4 text-muted-foreground" />

        <Select value={config.format.id} onValueChange={handleFormatChange}>
          <SelectTrigger className="w-32 h-7 text-xs">
            <SelectValue placeholder="Formato" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(PAGE_FORMATS).map((format) => (
              <SelectItem key={format.id} value={format.id} className="text-xs">
                {format.name}
              </SelectItem>
            ))}
            <SelectItem value="CUSTOM" className="text-xs">
              Personalizado...
            </SelectItem>
          </SelectContent>
        </Select>

        <div className="text-xs text-muted-foreground">
          {config.format.width} x {config.format.height} px
        </div>

        <div className="flex-1" />

        <button
          onClick={() => {
            setCustomValues({
              width: config.format.width,
              height: config.format.height,
              marginTop: config.format.margins.top,
              marginBottom: config.format.margins.bottom,
              marginLeft: config.format.margins.left,
              marginRight: config.format.margins.right,
            });
            setCustomDialogOpen(true);
          }}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings2 className="h-3 w-3" />
          <span>Márgenes: {config.format.margins.top}px</span>
        </button>
      </div>

      <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Formato de página personalizado</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Dimensions */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="width" className="text-xs">
                  Ancho (px)
                </Label>
                <Input
                  id="width"
                  type="number"
                  value={customValues.width}
                  onChange={(e) => handleInputChange('width', e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height" className="text-xs">
                  Alto (px)
                </Label>
                <Input
                  id="height"
                  type="number"
                  value={customValues.height}
                  onChange={(e) => handleInputChange('height', e.target.value)}
                  className="h-8"
                />
              </div>
            </div>

            {/* Margins */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Márgenes (px)</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="marginTop" className="text-xs text-muted-foreground">
                    Superior
                  </Label>
                  <Input
                    id="marginTop"
                    type="number"
                    value={customValues.marginTop}
                    onChange={(e) => handleInputChange('marginTop', e.target.value)}
                    className="h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="marginBottom" className="text-xs text-muted-foreground">
                    Inferior
                  </Label>
                  <Input
                    id="marginBottom"
                    type="number"
                    value={customValues.marginBottom}
                    onChange={(e) => handleInputChange('marginBottom', e.target.value)}
                    className="h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="marginLeft" className="text-xs text-muted-foreground">
                    Izquierdo
                  </Label>
                  <Input
                    id="marginLeft"
                    type="number"
                    value={customValues.marginLeft}
                    onChange={(e) => handleInputChange('marginLeft', e.target.value)}
                    className="h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="marginRight" className="text-xs text-muted-foreground">
                    Derecho
                  </Label>
                  <Input
                    id="marginRight"
                    type="number"
                    value={customValues.marginRight}
                    onChange={(e) => handleInputChange('marginRight', e.target.value)}
                    className="h-8"
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
              <span className="font-medium">Vista previa:</span>{' '}
              {customValues.width} x {customValues.height} px, márgenes:{' '}
              {customValues.marginTop}/{customValues.marginRight}/{customValues.marginBottom}/{customValues.marginLeft} px
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCustomSave}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
