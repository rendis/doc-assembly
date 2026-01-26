import { cn } from '@/lib/utils'
import { useSidebarStore } from '@/stores/sidebar-store'
import { useSandboxMode } from '@/stores/sandbox-mode-store'
import { SidebarContent } from './SidebarContent'
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet'

export function MobileSidebar() {
  const { isMobileOpen, closeMobile } = useSidebarStore()
  const { isSandboxActive } = useSandboxMode()

  return (
    <Sheet open={isMobileOpen} onOpenChange={(open) => !open && closeMobile()}>
      <SheetContent
        side="left"
        className={cn(
          'flex w-[280px] flex-col p-0 pt-16',
          isSandboxActive && 'border-l-2 border-l-sandbox'
        )}
      >
        <SidebarContent
          isExpanded={true}
          onNavigate={closeMobile}
          showAnimations={false}
        />
      </SheetContent>
    </Sheet>
  )
}
