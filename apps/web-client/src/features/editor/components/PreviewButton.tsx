import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye } from 'lucide-react';
import { InjectablesFormModal } from './InjectablesFormModal';
import { cn } from '@/lib/utils';

interface PreviewButtonProps {
  templateId: string;
  versionId: string;
  disabled?: boolean;
}

export function PreviewButton({ templateId, versionId, disabled }: PreviewButtonProps) {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = () => {
    if (!disabled && templateId && versionId) {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={disabled || !templateId || !versionId}
        className={cn(
          'p-2 rounded hover:bg-accent transition-colors',
          (disabled || !templateId || !versionId) && 'opacity-50 cursor-not-allowed'
        )}
        title={t('editor.preview.tooltip')}
      >
        <Eye className="h-4 w-4" />
      </button>

      <InjectablesFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        templateId={templateId}
        versionId={versionId}
      />
    </>
  );
}
