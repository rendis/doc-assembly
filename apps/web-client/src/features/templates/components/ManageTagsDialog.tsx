import { useState, useEffect } from 'react';
import { X, Loader2, Plus, Pencil, Trash2, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { tagsApi } from '../api/tags-api';
import { TAG_COLORS } from '../hooks/useTags';
import type { TagWithCount } from '../types';

interface ManageTagsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onChanged: () => void;
}

export function ManageTagsDialog({ isOpen, onClose, onChanged }: ManageTagsDialogProps) {
  const { t } = useTranslation();

  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch tags
  useEffect(() => {
    if (isOpen) {
      fetchTags();
    }
  }, [isOpen]);

  const fetchTags = async () => {
    setIsLoading(true);
    try {
      const response = await tagsApi.list();
      setTags(response.data);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;

    setIsSubmitting(true);
    try {
      await tagsApi.create({ name: newName.trim(), color: newColor });
      setNewName('');
      setIsCreating(false);
      await fetchTags();
      onChanged();
    } catch (error) {
      console.error('Failed to create tag:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (tagId: string) => {
    if (!editName.trim()) return;

    setIsSubmitting(true);
    try {
      await tagsApi.update(tagId, { name: editName.trim(), color: editColor });
      setEditingId(null);
      await fetchTags();
      onChanged();
    } catch (error) {
      console.error('Failed to update tag:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (tagId: string) => {
    if (!confirm(t('tagManager.delete.message'))) return;

    try {
      await tagsApi.delete(tagId);
      await fetchTags();
      onChanged();
    } catch (error) {
      console.error('Failed to delete tag:', error);
    }
  };

  const startEditing = (tag: TagWithCount) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="
            w-full max-w-md bg-background rounded-lg shadow-xl
            animate-in fade-in-0 zoom-in-95
            max-h-[80vh] flex flex-col
          "
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
            <h2 className="text-lg font-semibold">{t('tagManager.title')}</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                {tags.map((tag) => (
                  <div key={tag.id}>
                    {editingId === tag.id ? (
                      <div className="flex items-center gap-2 p-2 border rounded-md">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border rounded"
                          autoFocus
                        />
                        <ColorPicker
                          value={editColor}
                          onChange={setEditColor}
                        />
                        <button
                          type="button"
                          onClick={() => handleEdit(tag.id)}
                          disabled={isSubmitting}
                          className="p-1.5 text-primary hover:bg-primary/10 rounded"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="p-1.5 hover:bg-muted rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-2 hover:bg-muted rounded-md group">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="text-sm">{tag.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({tag.templateCount})
                          </span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => startEditing(tag)}
                            className="p-1.5 hover:bg-muted-foreground/10 rounded"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(tag.id)}
                            className="p-1.5 hover:bg-destructive/10 text-destructive rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {tags.length === 0 && !isCreating && (
                  <p className="text-center text-muted-foreground py-4 text-sm">
                    {t('tagManager.noTags')}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Create form */}
          <div className="flex-shrink-0 px-4 py-3 border-t">
            {isCreating ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t('tagManager.create.namePlaceholder')}
                  className="flex-1 px-3 py-2 text-sm border rounded-md"
                  autoFocus
                />
                <ColorPicker value={newColor} onChange={setNewColor} />
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isSubmitting || !newName.trim()}
                  className="
                    p-2 bg-primary text-primary-foreground rounded-md
                    hover:bg-primary/90 disabled:opacity-50
                  "
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setNewName('');
                  }}
                  className="p-2 hover:bg-muted rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="
                  flex items-center gap-2 w-full px-3 py-2
                  text-sm text-muted-foreground
                  border border-dashed rounded-md
                  hover:border-primary hover:text-primary transition-colors
                "
              >
                <Plus className="w-4 h-4" />
                {t('tagManager.new')}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 rounded-md border"
        style={{ backgroundColor: value }}
      />
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-20 p-2 bg-popover border rounded-md shadow-lg grid grid-cols-4 gap-1">
            {TAG_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => {
                  onChange(color);
                  setIsOpen(false);
                }}
                className={`
                  w-6 h-6 rounded-md
                  ${color === value ? 'ring-2 ring-primary ring-offset-2' : ''}
                `}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
