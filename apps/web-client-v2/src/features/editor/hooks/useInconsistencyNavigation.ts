import { useState, useMemo, useCallback, useEffect } from 'react'
import type { Editor } from '@tiptap/core'
import { useSignerRolesStore } from '../stores/signer-roles-store'

interface InvalidNode {
  pos: number
  roleId: string
  label: string
}

interface UseInconsistencyNavigationReturn {
  /** Total count of invalid injectables */
  count: number
  /** Current navigation index (-1 if not navigating) */
  currentIndex: number
  /** List of invalid nodes */
  invalidNodes: InvalidNode[]
  /** Navigate to next invalid node */
  next: () => void
  /** Navigate to previous invalid node */
  prev: () => void
  /** Navigate to specific index */
  navigateTo: (index: number) => void
  /** Reset navigation state */
  reset: () => void
}

/**
 * Hook to find and navigate between invalid injectables in the editor.
 * Invalid injectables are role variables whose role has been deleted.
 */
export function useInconsistencyNavigation(
  editor: Editor | null
): UseInconsistencyNavigationReturn {
  const [currentIndex, setCurrentIndex] = useState(-1)
  const roles = useSignerRolesStore((state) => state.roles)

  // Find all invalid injector nodes in the document
  const invalidNodes = useMemo<InvalidNode[]>(() => {
    if (!editor) return []

    const nodes: InvalidNode[] = []
    const roleIds = new Set(roles.map((r) => r.id))

    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'injector') {
        const { isRoleVariable, roleId, label } = node.attrs
        // Check if it's a role variable and the role doesn't exist
        if (isRoleVariable && roleId && !roleIds.has(roleId)) {
          nodes.push({ pos, roleId, label: label || 'Unknown' })
        }
      }
    })

    return nodes
  }, [editor, editor?.state.doc, roles])

  // Reset current index when invalid nodes change
  useEffect(() => {
    if (invalidNodes.length === 0) {
      setCurrentIndex(-1)
    } else if (currentIndex >= invalidNodes.length) {
      setCurrentIndex(invalidNodes.length - 1)
    }
  }, [invalidNodes.length, currentIndex])

  const navigateTo = useCallback(
    (index: number) => {
      if (!editor || invalidNodes.length === 0) return

      // Wrap around
      const targetIndex =
        ((index % invalidNodes.length) + invalidNodes.length) %
        invalidNodes.length
      const target = invalidNodes[targetIndex]
      if (!target) return

      // Focus the editor first, then select the node
      editor.chain().focus().setNodeSelection(target.pos).run()

      // Find the DOM element and apply highlight effect
      // Use setTimeout to ensure the DOM is updated after selection
      setTimeout(() => {
        const domNode = editor.view.nodeDOM(target.pos) as HTMLElement | null
        if (domNode) {
          // Scroll into view
          domNode.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest',
          })

          // Add temporary highlight animation
          domNode.classList.add('animate-highlight-pulse')
          setTimeout(() => {
            domNode.classList.remove('animate-highlight-pulse')
          }, 2000)
        }
      }, 50)

      setCurrentIndex(targetIndex)
    },
    [editor, invalidNodes]
  )

  const next = useCallback(() => {
    navigateTo(currentIndex + 1)
  }, [currentIndex, navigateTo])

  const prev = useCallback(() => {
    navigateTo(currentIndex - 1)
  }, [currentIndex, navigateTo])

  const reset = useCallback(() => {
    setCurrentIndex(-1)
  }, [])

  return {
    count: invalidNodes.length,
    currentIndex,
    invalidNodes,
    next,
    prev,
    navigateTo,
    reset,
  }
}
