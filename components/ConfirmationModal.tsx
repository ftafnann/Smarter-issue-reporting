import React, { useEffect } from 'react';
import { AlertTriangleIcon } from './icons';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  variant?: 'danger' | 'primary';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Delete Incident Report',
  variant = 'danger',
}) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md p-6 sm:p-7 bg-white/95 backdrop-blur-xl border border-[#EAE7DF] rounded-3xl shadow-floating"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-2xl border ${
            variant === 'danger'
              ? 'bg-red-50 border-red-200 text-red-600'
              : 'bg-[#F4F1FD] border-[#DDD6FE] text-[#7C3AED]'
          }`}>
            <AlertTriangleIcon className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-serif text-[#171717] tracking-tight" id="modal-title">
              {title}
            </h3>
            <div className="mt-2">
              <p className="text-xs text-[#737373] leading-relaxed">
                {message}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-7 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-white border border-[#EAE7DF] text-xs font-medium text-[#737373] hover:text-[#171717] hover:bg-[#F8F7F3] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-2xl text-white text-xs font-medium shadow-sm transition-all ${
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-[#171717] hover:bg-[#2b2b2b]'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
