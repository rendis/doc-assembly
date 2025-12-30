import { Pin, PinOff, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Props for the SidebarToggleButton component
 */
interface SidebarToggleButtonProps {
  /**
   * Whether the sidebar is currently pinned
   */
  isPinned: boolean;

  /**
   * Whether the sidebar is currently expanded (pinned or hovered)
   */
  isExpanded: boolean;

  /**
   * Callback to toggle the pin state
   */
  onTogglePin: () => void;

  /**
   * Accessible label for the button
   */
  ariaLabel: string;

  /**
   * Optional tooltip text
   */
  title?: string;
}

/**
 * Floating circular button for toggling sidebar pin state
 *
 * Features:
 * - Positioned absolutely on the right edge of sidebar
 * - Shows different icons based on state:
 *   - ChevronRight: collapsed (hover to expand)
 *   - Pin: expanded but not pinned (click to pin)
 *   - PinOff: pinned (click to unpin)
 * - Smooth animations and hover effects
 * - Fully accessible with keyboard support
 *
 * @example
 * ```tsx
 * <SidebarToggleButton
 *   isPinned={isPinned}
 *   isExpanded={isExpanded}
 *   onTogglePin={togglePin}
 *   ariaLabel="Pin sidebar"
 *   title="Click to pin sidebar"
 * />
 * ```
 */
export const SidebarToggleButton = ({
  isPinned,
  isExpanded,
  onTogglePin,
  ariaLabel,
  title,
}: SidebarToggleButtonProps) => {
  // Determine which icon to show based on state
  const renderIcon = () => {
    if (!isExpanded) {
      // Collapsed state - show chevron pointing right
      return <ChevronRight className="h-3 w-3" />;
    }

    if (isPinned) {
      // Pinned state - show unpin icon
      return <PinOff className="h-3 w-3" />;
    }

    // Expanded but not pinned - show pin icon
    return <Pin className="h-3 w-3" />;
  };

  return (
    <button
      onClick={onTogglePin}
      aria-label={ariaLabel}
      title={title}
      className={cn(
        // Positioning - absolutely positioned on right edge
        'absolute -right-3 top-16 z-50',

        // Size and layout
        'flex h-6 w-6 items-center justify-center rounded-full',

        // Appearance
        'bg-card border-2 border-border shadow-md',

        // Hover state
        'hover:bg-accent hover:border-accent-foreground',

        // Active state (when clicking)
        'active:scale-95',

        // Transitions
        'transition-all duration-200 ease-in-out',

        // Focus state for accessibility
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
      )}
    >
      {renderIcon()}
    </button>
  );
};
