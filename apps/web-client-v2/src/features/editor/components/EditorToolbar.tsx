import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Editor } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3,
  Minus,
  PenLine,
  GitBranch,
  ImageIcon,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { PreviewButton } from './preview'
import { useOverflowScroll } from '@/hooks/use-overflow-scroll'
import { cn } from '@/lib/utils'

const FONT_FAMILIES = [
  { label: 'Inter', value: 'Inter' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: 'Times New Roman, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: 'Courier New, monospace' },
]

const FONT_SIZES = ['10', '12', '14', '16', '18', '24', '36']

interface EditorToolbarProps {
  editor: Editor | null
  onExport?: () => void
  onImport?: () => void
  templateId?: string
  versionId?: string
}

export function EditorToolbar({ editor, onExport, onImport, templateId, versionId }: EditorToolbarProps) {
  const { t } = useTranslation()
  // Force re-render when editor state changes (for undo/redo buttons)
  const [, forceUpdate] = useState({})

  const {
    containerRef,
    scrollRef,
    canScrollLeft,
    canScrollRight,
    isOverflowing,
    scrollLeft,
    scrollRight,
  } = useOverflowScroll()

  useEffect(() => {
    if (!editor) return

    const handler = () => forceUpdate({})
    editor.on('transaction', handler)

    return () => {
      editor.off('transaction', handler)
    }
  }, [editor])

  if (!editor) return null

  return (
    <TooltipProvider delayDuration={300}>
      <div
        ref={containerRef}
        className="relative flex-1 min-w-0 flex items-center pt-3 pb-2 px-2 bg-card overflow-y-visible overflow-x-clip"
      >
        {/* Left scroll arrow */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={scrollLeft}
            className={cn(
              'absolute left-0 z-10 h-full px-1',
              'flex items-center justify-center',
              'bg-gradient-to-r from-card via-card/95 to-transparent',
              'text-muted-foreground hover:text-foreground',
              'transition-colors duration-150'
            )}
            aria-label="Desplazar a la izquierda"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {/* Scrollable toolbar content */}
        <div
          ref={scrollRef}
          className={cn(
            'flex items-center gap-1 overflow-x-auto overflow-y-visible scrollbar-hide scroll-smooth touch-pan-x pt-1',
            canScrollLeft && 'pl-6',
            canScrollRight && 'pr-6'
          )}
        >
          {/* Undo/Redo */}
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            tooltip="Deshacer"
          >
            <Undo className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            tooltip="Rehacer"
          >
            <Redo className="h-4 w-4" />
          </ToolbarButton>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Font Family */}
          <Select
            value={editor.getAttributes('textStyle').fontFamily || 'Inter'}
            onValueChange={(value) => {
              editor.chain().focus().setFontFamily(value).run()
            }}
          >
            <SelectTrigger className="h-8 w-[110px] text-xs">
              <SelectValue placeholder="Fuente" />
            </SelectTrigger>
            <SelectContent>
              {FONT_FAMILIES.map((font) => (
                <SelectItem
                  key={font.value}
                  value={font.value}
                  style={{ fontFamily: font.value }}
                >
                  {font.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Font Size */}
          <Select
            value={editor.getAttributes('textStyle').fontSize?.replace('px', '') || '14'}
            onValueChange={(value) => {
              editor.chain().focus().setFontSize(`${value}px`).run()
            }}
          >
            <SelectTrigger className="h-8 w-[65px] text-xs">
              <SelectValue placeholder="Tamaño" />
            </SelectTrigger>
            <SelectContent>
              {FONT_SIZES.map((size) => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Headings */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            tooltip="Encabezado 1"
          >
            <Heading1 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            tooltip="Encabezado 2"
          >
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            tooltip="Encabezado 3"
          >
            <Heading3 className="h-4 w-4" />
          </ToolbarButton>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Text formatting */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            tooltip="Negrita"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            tooltip="Cursiva"
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            tooltip="Tachado"
          >
            <Strikethrough className="h-4 w-4" />
          </ToolbarButton>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Lists */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            tooltip="Lista"
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            tooltip="Lista numerada"
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Block elements */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            tooltip="Cita"
          >
            <Quote className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            tooltip="Linea horizontal"
          >
            <Minus className="h-4 w-4" />
          </ToolbarButton>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Document elements - Special tools section */}
          <div className="relative flex items-center gap-1 px-2 py-1 bg-muted/60 dark:bg-muted/40 rounded-lg border border-border">
            {/* Floating label */}
            <span className="absolute -top-2 left-2 px-1.5 text-[10px] font-medium tracking-wide uppercase text-muted-foreground bg-card rounded">
              {t('editor.toolbar.blocks')}
            </span>

            <ToolbarButton
              onClick={() => {
                editor.view.dom.dispatchEvent(
                  new CustomEvent('editor:open-image-modal', { bubbles: true })
                )
              }}
              tooltip="Insertar imagen"
            >
              <ImageIcon className="h-4 w-4 text-success-foreground dark:text-success" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setSignature().run()}
              tooltip="Bloque de firma"
            >
              <PenLine className="h-4 w-4 text-info-foreground dark:text-info" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setConditional({}).run()}
              tooltip="Bloque condicional"
            >
              <GitBranch className="h-4 w-4 text-warning-foreground dark:text-warning" />
            </ToolbarButton>
          </div>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Export/Import/Preview */}
          {(onExport || onImport || (templateId && versionId)) && (
            <>
              {onExport && (
                <ToolbarButton
                  onClick={onExport}
                  tooltip="Exportar documento (JSON)"
                >
                  <Download className="h-4 w-4" />
                </ToolbarButton>
              )}
              {onImport && (
                <ToolbarButton
                  onClick={onImport}
                  tooltip="Importar documento (JSON)"
                >
                  <Upload className="h-4 w-4" />
                </ToolbarButton>
              )}
              {templateId && versionId && (
                <PreviewButton
                  templateId={templateId}
                  versionId={versionId}
                />
              )}
            </>
          )}
        </div>

        {/* Right scroll arrow */}
        {canScrollRight && (
          <button
            type="button"
            onClick={scrollRight}
            className={cn(
              'absolute right-8 z-10 h-full px-1',
              'flex items-center justify-center',
              'bg-gradient-to-l from-card via-card/95 to-transparent',
              'text-muted-foreground hover:text-foreground',
              'transition-colors duration-150'
            )}
            aria-label="Desplazar a la derecha"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* Overflow dropdown menu */}
        {isOverflowing && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 shrink-0 ml-1 text-muted-foreground hover:text-foreground"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {/* History */}
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                Historial
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
              >
                <Undo className="mr-2 h-4 w-4" />
                Deshacer
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
              >
                <Redo className="mr-2 h-4 w-4" />
                Rehacer
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Headings */}
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                Encabezados
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={cn(editor.isActive('heading', { level: 1 }) && 'bg-accent')}
              >
                <Heading1 className="mr-2 h-4 w-4" />
                Encabezado 1
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={cn(editor.isActive('heading', { level: 2 }) && 'bg-accent')}
              >
                <Heading2 className="mr-2 h-4 w-4" />
                Encabezado 2
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                className={cn(editor.isActive('heading', { level: 3 }) && 'bg-accent')}
              >
                <Heading3 className="mr-2 h-4 w-4" />
                Encabezado 3
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Text formatting */}
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                Formato de texto
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={cn(editor.isActive('bold') && 'bg-accent')}
              >
                <Bold className="mr-2 h-4 w-4" />
                Negrita
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={cn(editor.isActive('italic') && 'bg-accent')}
              >
                <Italic className="mr-2 h-4 w-4" />
                Cursiva
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={cn(editor.isActive('strike') && 'bg-accent')}
              >
                <Strikethrough className="mr-2 h-4 w-4" />
                Tachado
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Lists */}
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                Listas
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={cn(editor.isActive('bulletList') && 'bg-accent')}
              >
                <List className="mr-2 h-4 w-4" />
                Lista
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={cn(editor.isActive('orderedList') && 'bg-accent')}
              >
                <ListOrdered className="mr-2 h-4 w-4" />
                Lista numerada
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Block elements */}
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                Bloques
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={cn(editor.isActive('blockquote') && 'bg-accent')}
              >
                <Quote className="mr-2 h-4 w-4" />
                Cita
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
              >
                <Minus className="mr-2 h-4 w-4" />
                Línea horizontal
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  editor.view.dom.dispatchEvent(
                    new CustomEvent('editor:open-image-modal', { bubbles: true })
                  )
                }}
              >
                <ImageIcon className="mr-2 h-4 w-4 text-success-foreground dark:text-success" />
                Insertar imagen
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().setSignature().run()}
              >
                <PenLine className="mr-2 h-4 w-4 text-info-foreground dark:text-info" />
                Bloque de firma
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().setConditional({}).run()}
              >
                <GitBranch className="mr-2 h-4 w-4 text-warning-foreground dark:text-warning" />
                Bloque condicional
              </DropdownMenuItem>

              {/* Export/Import/Preview */}
              {(onExport || onImport || (templateId && versionId)) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                    Acciones
                  </DropdownMenuLabel>
                  {onExport && (
                    <DropdownMenuItem onClick={onExport}>
                      <Download className="mr-2 h-4 w-4" />
                      Exportar documento
                    </DropdownMenuItem>
                  )}
                  {onImport && (
                    <DropdownMenuItem onClick={onImport}>
                      <Upload className="mr-2 h-4 w-4" />
                      Importar documento
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </TooltipProvider>
  )
}

interface ToolbarButtonProps {
  children: React.ReactNode
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  tooltip: string
}

function ToolbarButton({
  children,
  onClick,
  isActive = false,
  disabled = false,
  tooltip,
}: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={isActive ? 'secondary' : 'ghost'}
          size="sm"
          onClick={onClick}
          disabled={disabled}
          className="h-8 w-8 p-0"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}
