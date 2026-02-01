import { useCallback, useRef, useState } from 'react';
import StoryDetail, { type StoryDetailHandle } from '../pages/StoryDetail';
import { ModalShell } from './ModalShell';

interface StoryDetailModalProps {
  storyId: string;
  onClose: () => void;
}

export function StoryDetailModal({ storyId, onClose }: StoryDetailModalProps) {
  const storyDetailRef = useRef<StoryDetailHandle | null>(null);
  const [saving, setSaving] = useState(false);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const saveAndClose = useCallback(() => {
    const p = storyDetailRef.current?.saveAndClose?.();
    if (p && typeof p.then === 'function') {
      p.catch(() => {}).finally(() => {});
    } else {
      handleClose();
    }
  }, [handleClose]);

  const handleSave = useCallback(async () => {
    const saveFn = storyDetailRef.current?.save;
    if (!saveFn) return;
    setSaving(true);
    try {
      await saveFn();
    } finally {
      setSaving(false);
    }
  }, []);

  return (
    <ModalShell
      variant="detail"
      maxWidth="900px"
      zIndex={1100}
      onRequestClose={saveAndClose}
      aria-labelledby="story-modal-title"
      headerActions={
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-app-accent-primary px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <StoryDetail ref={storyDetailRef} isModal storyId={storyId} onClose={handleClose} />
      </div>
    </ModalShell>
  );
}
