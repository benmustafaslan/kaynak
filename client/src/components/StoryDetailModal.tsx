import { useCallback, useEffect } from 'react';
import StoryDetail from '../pages/StoryDetail';

interface StoryDetailModalProps {
  storyId: string;
  onClose: () => void;
}

export function StoryDetailModal({ storyId, onClose }: StoryDetailModalProps) {
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[1100] bg-black/40 backdrop-blur-[2px] animate-fade-in"
        onClick={handleBackdropClick}
        aria-hidden
      />
      <div
        className="fixed left-1/2 top-1/2 z-[1101] flex max-h-[90vh] w-full max-w-[900px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-app-border-light bg-app-bg-primary shadow-2xl animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="story-modal-title"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-auto">
          <StoryDetail isModal storyId={storyId} onClose={handleClose} />
        </div>
      </div>
    </>
  );
}
