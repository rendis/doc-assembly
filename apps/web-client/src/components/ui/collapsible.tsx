import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"
import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const CollapsibleContext = React.createContext<{
  isOpen: boolean
  onCloseComplete?: () => void
}>({ isOpen: false })

interface CollapsibleProps extends React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Root> {
  onCloseComplete?: () => void
}

const Collapsible = React.forwardRef<
  React.ComponentRef<typeof CollapsiblePrimitive.Root>,
  CollapsibleProps
>(({ children, open, defaultOpen, onOpenChange, onCloseComplete, ...props }, ref) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen ?? open ?? false)

  React.useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open)
    }
  }, [open])

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  return (
    <CollapsibleContext.Provider value={{ isOpen, onCloseComplete }}>
      <CollapsiblePrimitive.Root
        ref={ref}
        open={isOpen}
        onOpenChange={handleOpenChange}
        {...props}
      >
        {children}
      </CollapsiblePrimitive.Root>
    </CollapsibleContext.Provider>
  )
})
Collapsible.displayName = "Collapsible"

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger

const CollapsibleContent = React.forwardRef<
  HTMLDivElement,
  Omit<React.HTMLAttributes<HTMLDivElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'>
>(({ className, children, ...props }, ref) => {
  const { isOpen, onCloseComplete } = React.useContext(CollapsibleContext)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [height, setHeight] = React.useState(0)
  const [contentOpacity, setContentOpacity] = React.useState(isOpen ? 1 : 0)

  React.useLayoutEffect(() => {
    if (contentRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setHeight(entry.contentRect.height)
        }
      })
      resizeObserver.observe(contentRef.current)
      return () => resizeObserver.disconnect()
    }
  }, [])

  // Control opacity: fade in when opening, stay visible when closing
  React.useEffect(() => {
    if (isOpen) {
      // Opening: start fade in after a small delay
      const timer = setTimeout(() => setContentOpacity(1), 50)
      return () => clearTimeout(timer)
    }
    // Closing: keep opacity at 1 (don't fade out)
  }, [isOpen])

  const handleAnimationComplete = React.useCallback(() => {
    if (!isOpen) {
      // Reset opacity to 0 after close animation completes (for next open)
      setContentOpacity(0)
      onCloseComplete?.()
    }
  }, [isOpen, onCloseComplete])

  return (
    <motion.div
      ref={ref}
      initial={false}
      animate={{
        height: isOpen ? height : 0,
      }}
      transition={{
        height: {
          duration: 0.25,
          ease: isOpen ? [0.0, 0.0, 0.2, 1] : [0.4, 0.0, 1, 1],
        },
      }}
      onAnimationComplete={handleAnimationComplete}
      className={cn("overflow-hidden", className)}
      {...props}
    >
      <div
        ref={contentRef}
        style={{
          opacity: contentOpacity,
          transition: isOpen ? 'opacity 0.2s ease-out' : 'none',
        }}
      >
        {children}
      </div>
    </motion.div>
  )
})
CollapsibleContent.displayName = "CollapsibleContent"

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
