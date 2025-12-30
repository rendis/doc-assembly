/* eslint-disable react-hooks/set-state-in-effect -- Reset state on dialog open is a standard UI pattern */
import { useState, useEffect } from 'react';
import { X, Loader2, CalendarClock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ScheduleDialogProps {
  isOpen: boolean;
  type: 'publish' | 'archive';
  versionName: string;
  onSchedule: (scheduledAt: string) => Promise<void>;
  onCancel: () => void;
}

export function ScheduleDialog({
  isOpen,
  type,
  versionName,
  onSchedule,
  onCancel,
}: ScheduleDialogProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState('');

  // Get minimum date (now + 1 minute)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    return now.toISOString().slice(0, 16);
  };

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      setError(null);
      // Default to tomorrow at 9:00 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      setScheduledAt(tomorrow.toISOString().slice(0, 16));
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!scheduledAt) {
      setError(t('templates.schedule.dateRequired'));
      return;
    }

    const selectedDate = new Date(scheduledAt);
    if (selectedDate <= new Date()) {
      setError(t('templates.schedule.minDateError'));
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      // Convert to ISO 8601 format for API
      await onSchedule(selectedDate.toISOString());
    } catch (err) {
      console.error('Failed to schedule:', err);
      setError(
        type === 'publish'
          ? t('templates.schedule.publishError')
          : t('templates.schedule.archiveError')
      );
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const title =
    type === 'publish' ? t('templates.schedule.publishTitle') : t('templates.schedule.archiveTitle');

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onCancel}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="
            w-full max-w-sm bg-background rounded-lg shadow-xl
            animate-in fade-in-0 zoom-in-95
          "
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">{title}</h2>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
              disabled={isSubmitting}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-6 py-4 space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                {error}
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              {type === 'publish'
                ? t('templates.schedule.publishDescription', { version: versionName })
                : t('templates.schedule.archiveDescription', { version: versionName })}
            </p>

            <div className="space-y-2">
              <label htmlFor="schedule-datetime" className="block text-sm font-medium">
                {t('templates.schedule.dateLabel')}
              </label>
              <input
                id="schedule-datetime"
                type="datetime-local"
                value={scheduledAt}
                min={getMinDateTime()}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="
                  w-full px-3 py-2 text-sm
                  border rounded-md
                  bg-background
                  focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                "
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-muted/30">
            <button
              type="button"
              onClick={onCancel}
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
              type="button"
              onClick={handleSubmit}
              className="
                flex items-center gap-2 px-4 py-2 text-sm font-medium
                bg-primary text-primary-foreground rounded-md
                hover:bg-primary/90 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
              "
              disabled={isSubmitting || !scheduledAt}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('templates.schedule.button')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
