import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { templatesApi } from '../api/templates-api';
import { TagBadge } from './TagBadge';
import type { Folder, TagWithCount } from '../types';

interface CreateTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  tags: TagWithCount[];
  currentFolderId?: string;
  onCreated: () => void;
}

export function CreateTemplateDialog({
  isOpen,
  onClose,
  folders,
  tags,
  currentFolderId,
  onCreated,
}: CreateTemplateDialogProps) {
  const { t } = useTranslation();

  const [title, setTitle] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await templatesApi.create({
        title: title.trim(),
        folderId: currentFolderId,
      });

      // Assign tags if any selected
      if (selectedTagIds.length > 0) {
        await templatesApi.assignTags(result.template.id, { tagIds: selectedTagIds });
      }

      onCreated();
      handleClose();
    } catch (err) {
      console.error('Failed to create template:', err);
      setError(t('templates.create.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setSelectedTagIds([]);
    setError(null);
    onClose();
  };

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      setSelectedTagIds(selectedTagIds.filter((id) => id !== tagId));
    } else {
      setSelectedTagIds([...selectedTagIds, tagId]);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="
            w-full max-w-md bg-background rounded-lg shadow-xl
            animate-in fade-in-0 zoom-in-95
          "
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">{t('templates.create.title')}</h2>
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-6 mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-1.5">
                {t('templates.create.titleLabel')} *
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('templates.create.titlePlaceholder')}
                className="
                  w-full px-3 py-2 text-sm
                  border rounded-md bg-background
                  placeholder:text-muted-foreground
                  focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                "
                required
                autoFocus
              />
            </div>

            {/* Folder (readonly) */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                {t('templates.create.folderLabel')}
              </label>
              <div className="px-3 py-2 text-sm border rounded-md bg-muted/50 text-muted-foreground">
                {currentFolderId
                  ? folders.find((f) => f.id === currentFolderId)?.name
                  : t('folders.root')}
              </div>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  {t('templates.create.tagsLabel')}
                </label>
                <div className="flex flex-wrap gap-1.5 p-3 border rounded-md min-h-[44px]">
                  {tags.map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`
                          transition-opacity
                          ${isSelected ? 'opacity-100' : 'opacity-50 hover:opacity-75'}
                        `}
                      >
                        <TagBadge
                          tag={tag}
                          size="sm"
                          onRemove={isSelected ? () => toggleTag(tag.id) : undefined}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="
                  px-4 py-2 text-sm font-medium
                  border rounded-md
                  hover:bg-muted transition-colors
                "
                disabled={isSubmitting}
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="
                  flex items-center gap-2 px-4 py-2 text-sm font-medium
                  bg-primary text-primary-foreground rounded-md
                  hover:bg-primary/90 transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
                disabled={isSubmitting || !title.trim()}
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('templates.create.button')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
