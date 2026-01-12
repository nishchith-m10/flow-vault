'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AlertTriangle, Trash2, Archive, CheckCircle2, Info, X, LucideIcon } from 'lucide-react';
import Button from './ui/Button';

interface ModalConfig {
  title: string;
  message: string;
  icon?: LucideIcon;
  iconColor?: string;
  confirmLabel?: string;
  confirmText?: string; // Alias for confirmLabel
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  onConfirm: () => void;
  onCancel?: () => void;
}

interface ModalContextType {
  showModal: (config: ModalConfig) => void;
  hideModal: () => void;
  openModal: (config: ModalConfig) => void;  // Alias
  closeModal: () => void;  // Alias
}

const ModalContext = createContext<ModalContextType>({ 
  showModal: () => {}, 
  hideModal: () => {},
  openModal: () => {},
  closeModal: () => {},
});

export const useModal = () => useContext(ModalContext);

// Helper functions for common modal types
export const useConfirmDelete = () => {
  const { showModal } = useModal();
  
  return (options: { title: string; message: string; onConfirm: () => void }) => {
    showModal({
      icon: Trash2,
      variant: 'danger',
      confirmLabel: 'Delete',
      ...options,
    });
  };
};

export const useConfirmArchive = () => {
  const { showModal } = useModal();
  
  return (options: { title: string; message: string; onConfirm: () => void }) => {
    showModal({
      icon: Archive,
      variant: 'warning',
      confirmLabel: 'Archive',
      ...options,
    });
  };
};

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalConfig | null>(null);

  const showModal = useCallback((config: ModalConfig) => {
    setModal(config);
  }, []);

  const hideModal = useCallback(() => {
    setModal(null);
  }, []);

  // Aliases for alternative naming
  const openModal = showModal;
  const closeModal = hideModal;

  const handleConfirm = () => {
    modal?.onConfirm();
    setModal(null);
  };

  const handleCancel = () => {
    modal?.onCancel?.();
    setModal(null);
  };

  const getIconColor = (variant?: ModalConfig['variant']) => {
    switch (variant) {
      case 'danger': return 'text-[var(--error)] bg-[var(--error-muted)]';
      case 'warning': return 'text-[var(--warning)] bg-[var(--warning-muted)]';
      case 'success': return 'text-[var(--success)] bg-[var(--success-muted)]';
      case 'info':
      default: return 'text-[var(--accent)] bg-[var(--accent-muted)]';
    }
  };

  const getDefaultIcon = (variant?: ModalConfig['variant']) => {
    switch (variant) {
      case 'danger': return Trash2;
      case 'warning': return AlertTriangle;
      case 'success': return CheckCircle2;
      case 'info':
      default: return Info;
    }
  };

  const getButtonVariant = (variant?: ModalConfig['variant']): 'danger' | 'primary' | 'success' => {
    switch (variant) {
      case 'danger': return 'danger';
      case 'success': return 'success';
      default: return 'primary';
    }
  };

  return (
    <ModalContext.Provider value={{ showModal, hideModal, openModal, closeModal }}>
      {children}
      
      {/* Modal Overlay */}
      {modal && (
        <div className="fixed inset-0 z-[var(--z-overlay)] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="modal-backdrop"
            onClick={handleCancel}
          />
          
          {/* Modal */}
          <div className="modal-content w-full max-w-md p-6">
            {/* Close Button */}
            <button
              onClick={handleCancel}
              className="absolute top-4 right-4 p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--bg-subtle)] transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-[var(--text-tertiary)]" />
            </button>

            {/* Icon */}
            {(() => {
              const Icon = modal.icon || getDefaultIcon(modal.variant);
              return (
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${getIconColor(modal.variant)}`}>
                  <Icon className="w-7 h-7" />
                </div>
              );
            })()}

            {/* Content */}
            <h2 className="text-xl font-semibold text-center text-[var(--text-primary)] mb-2">
              {modal.title}
            </h2>
            <p className="text-[var(--text-secondary)] text-center mb-6">
              {modal.message}
            </p>
            
            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={handleCancel}
              >
                {modal.cancelLabel || 'Cancel'}
              </Button>
              <Button
                variant={getButtonVariant(modal.variant)}
                className="flex-1"
                onClick={handleConfirm}
              >
                {modal.confirmLabel || modal.confirmText || 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

// Add event stop propagation and document behavior
