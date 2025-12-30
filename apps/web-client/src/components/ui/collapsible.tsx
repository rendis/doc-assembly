import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"
import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const CollapsibleContext = React.createContext<{ isOpen: boolean }>({ isOpen: false })

const Collapsible = React.forwardRef<
  React.ComponentRef<typeof CollapsiblePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Root>
>(({ children, open, defaultOpen, onOpenChange, ...props }, ref) => {
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
    <CollapsibleContext.Provider value={{ isOpen }}>
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
  const { isOpen } = React.useContext(CollapsibleContext)

  return (
    <motion.div
      ref={ref}
      initial={false}
      animate={{
        height: isOpen ? "auto" : 0,
        opacity: isOpen ? 1 : 0,
      }}
      transition={{
        height: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
        opacity: { duration: 0.15, ease: "easeOut" },
      }}
      className={cn("overflow-hidden", className)}
      {...props}
    >
      {children}
    </motion.div>
  )
})
CollapsibleContent.displayName = "CollapsibleContent"

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
