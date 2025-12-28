import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Check, Plus, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { templatesApi } from '../api/templates-api';
import { tagsApi } from '../api/tags-api';
import { TAG_COLORS } from '../hooks/useTags';
import { TagBadge } from './TagBadge';
import { normalizeTagName } from '@/lib/normalize-tag';
import { fadeSlideDown, fadeHeight, fade, scaleFade, quickTransition, smoothTransition } from '@/lib/animations';
import type { Tag, TagWithCount } from '../types';

// Color picker component with portal
function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        popupRef.current && !popupRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: rect.left,
      });
    }
    setIsOpen(!isOpen);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="w-6 h-6 rounded-md border-2 border-white shadow-sm flex-shrink-0 hover:scale-110 transition-transform"
        style={{ backgroundColor: value }}
      />
      {isOpen && createPortal(
        <AnimatePresence>
          <motion.div
            ref={popupRef}
            className="fixed z-[9999] p-2 bg-popover border rounded-md shadow-lg grid grid-cols-4 gap-1"
            style={{ top: position.top, left: position.left }}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={quickTransition}
          >
            {TAG_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(color);
                  setIsOpen(false);
                }}
                className={`
                  w-6 h-6 rounded-md transition-transform hover:scale-110
                  ${color === value ? 'ring-2 ring-primary ring-offset-2' : ''}
                `}
                style={{ backgroundColor: color }}
              />
            ))}
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

interface EditTemplateTagsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  templateId: string;
  currentTags: Tag[];
  availableTags: TagWithCount[];
  onSaved: () => void;
}

/**
 * Suggests a color that is not used by existing tags.
 * If all colors are used, returns the least used one.
 */
function suggestColor(existingTags: TagWithCount[]): string {
  const usedColors = existingTags.map((tag) => tag.color);

  // Find colors not used
  const unusedColors = TAG_COLORS.filter((color) => !usedColors.includes(color));

  if (unusedColors.length > 0) {
    // Return a random unused color
    return unusedColors[Math.floor(Math.random() * unusedColors.length)];
  }

  // All colors used - find the least used one
  const colorCounts = new Map<string, number>();
  TAG_COLORS.forEach((color) => colorCounts.set(color, 0));
  usedColors.forEach((color) => {
    colorCounts.set(color, (colorCounts.get(color) ?? 0) + 1);
  });

  let minCount = Infinity;
  let leastUsedColor = TAG_COLORS[0];
  colorCounts.forEach((count, color) => {
    if (count < minCount) {
      minCount = count;
      leastUsedColor = color;
    }
  });

  return leastUsedColor;
}

export function EditTemplateTagsDialog({
  isOpen,
  onClose,
  templateId,
  currentTags,
  availableTags: initialAvailableTags,
  onSaved,
}: EditTemplateTagsDialogProps) {
  const { t } = useTranslation();

  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [availableTags, setAvailableTags] = useState<TagWithCount[]>(initialAvailableTags);
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);

  // Sync availableTags when props change
  useEffect(() => {
    setAvailableTags(initialAvailableTags);
  }, [initialAvailableTags]);

  // Initialize selected tags when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTagIds(new Set(currentTags.map((tag) => tag.id)));
      setSearchInput('');
      setNewTagColor(suggestColor(availableTags));
    }
  }, [isOpen, currentTags, availableTags]);

  // Normalize search input for comparison
  const normalizedSearch = normalizeTagName(searchInput);

  // Filter tags based on search
  const filteredTags = availableTags.filter((tag) => {
    if (!searchInput.trim()) return true;
    const tagNameLower = tag.name.toLowerCase();
    const searchLower = searchInput.toLowerCase().trim();
    return (
      tagNameLower.includes(searchLower) ||
      normalizeTagName(tag.name).includes(normalizedSearch)
    );
  });

  // Check if tag already exists (normalized comparison)
  const tagExists = availableTags.some(
    (tag) => normalizeTagName(tag.name) === normalizedSearch
  );

  // Show create option if there's text, it's valid, and doesn't exist
  const showCreateOption =
    searchInput.trim().length > 0 && normalizedSearch.length > 0 && !tagExists;

  // Show normalized preview when different from input
  const showNormalizedPreview =
    searchInput.trim() &&
    normalizedSearch &&
    normalizedSearch !== searchInput.trim().toLowerCase();

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  };

  const handleCreateTag = async () => {
    if (!normalizedSearch || tagExists || isCreating) return;

    setIsCreating(true);
    try {
      // 1. Create the tag with selected color
      const newTag = await tagsApi.create({
        name: normalizedSearch,
        color: newTagColor,
      });

      // 2. Assign it immediately to the template (along with current selections)
      const newTagIds = [...Array.from(selectedTagIds), newTag.id];
      await templatesApi.assignTags(templateId, { tagIds: newTagIds });

      // 3. Update local state
      const newTagWithCount: TagWithCount = {
        ...newTag,
        templateCount: 1,
      };
      setAvailableTags((prev) => [...prev, newTagWithCount]);
      setSelectedTagIds(new Set(newTagIds));

      // 4. Clear search and notify parent
      setSearchInput('');
      onSaved();
    } catch (error) {
      console.error('Failed to create and assign tag:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await templatesApi.assignTags(templateId, {
        tagIds: Array.from(selectedTagIds),
      });
      onSaved();
      onClose();
    } catch (error) {
      console.error('Failed to update tags:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if there are changes
  const currentTagIdSet = new Set(currentTags.map((t) => t.id));
  const hasChanges =
    selectedTagIds.size !== currentTagIdSet.size ||
    [...selectedTagIds].some((id) => !currentTagIdSet.has(id));

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          className="
            w-full max-w-sm bg-background rounded-lg shadow-xl
            max-h-[80vh] flex flex-col
          "
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={smoothTransition}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
            <h2 className="text-lg font-semibold">{t('templates.tags.editTitle')}</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search input */}
          <div className="px-4 py-3 border-b flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('templates.tags.searchOrCreate')}
                className="
                  w-full pl-9 pr-3 py-2 text-sm
                  border rounded-md bg-background
                  placeholder:text-muted-foreground
                  focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                "
              />
            </div>
            {/* Preview normalized name */}
            <AnimatePresence>
              {showNormalizedPreview && (
                <motion.p
                  className="text-xs text-muted-foreground mt-1.5 pl-1 overflow-hidden"
                  variants={fadeSlideDown}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={quickTransition}
                >
                  {t('templates.tags.willBeCreatedAs')}: <span className="font-mono">{normalizedSearch}</span>
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Create new tag option */}
            <AnimatePresence>
              {showCreateOption && (
                <motion.div
                  className="mb-2"
                  variants={fade}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={smoothTransition}
                >
                  <div
                    className="
                      w-full flex items-center gap-2 px-3 py-2.5
                      rounded-md border border-dashed border-primary/40
                      text-primary text-sm
                      transition-colors
                      aria-disabled:opacity-50
                    "
                    aria-disabled={isCreating}
                  >
                    <ColorPicker value={newTagColor} onChange={setNewTagColor} />
                    <button
                      type="button"
                      onClick={handleCreateTag}
                      disabled={isCreating}
                      className="
                        flex-1 flex items-center gap-2
                        hover:bg-primary/5 rounded px-1 py-0.5 -mx-1
                        disabled:opacity-50 disabled:cursor-not-allowed
                      "
                    >
                      {isCreating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      {t('templates.tags.createNew')}: <span className="font-mono font-medium">{normalizedSearch}</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Existing tags */}
            {filteredTags.length === 0 && !showCreateOption ? (
              <motion.p
                className="text-center text-muted-foreground py-8 text-sm"
                variants={fade}
                initial="initial"
                animate="animate"
              >
                {searchInput.trim()
                  ? t('templates.tags.noMatchingTags')
                  : t('templates.noTags')}
              </motion.p>
            ) : (
              <div className="space-y-1">
                <AnimatePresence mode="popLayout">
                  {filteredTags.map((tag) => {
                    const isSelected = selectedTagIds.has(tag.id);
                    return (
                      <motion.button
                        key={tag.id}
                        layout
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`
                          flex items-center justify-between w-full px-3 py-2.5
                          rounded-md transition-colors
                          ${isSelected
                            ? 'bg-primary/10 border border-primary/30'
                            : 'hover:bg-muted border border-transparent'
                          }
                        `}
                        variants={fade}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={quickTransition}
                      >
                        <TagBadge tag={tag} size="sm" />
                        <AnimatePresence>
                          {isSelected && (
                            <motion.span
                              variants={scaleFade}
                              initial="initial"
                              animate="animate"
                              exit="exit"
                              transition={quickTransition}
                            >
                              <Check className="w-4 h-4 text-primary" />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-md hover:bg-muted transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting || !hasChanges}
              className="
                flex items-center gap-2 px-4 py-2
                text-sm font-medium rounded-md
                bg-primary text-primary-foreground
                hover:bg-primary/90 disabled:opacity-50
                transition-colors
              "
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('common.save')}
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
}
