'use client';

import React, { forwardRef, useEffect, createContext, useContext } from 'react';

// Modal context for passing onClose to children
interface ModalContextValue {
  onClose: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

const useModalContext = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('Modal components must be used within a Modal');
  }
  return context;
};

// Modal sizes
type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ModalProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onClose: () => void;
  size?: ModalSize;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  'aria-labelledby'?: string;
}

const Modal = forwardRef<HTMLDivElement, ModalProps>(
  ({
    isOpen,
    onClose,
    size = 'md',
    closeOnBackdropClick = true,
    closeOnEscape = true,
    className = '',
    children,
    ...props
  }, ref) => {
    // Handle escape key
    useEffect(() => {
      if (!isOpen || !closeOnEscape) return;

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, closeOnEscape, onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      }
      return () => {
        document.body.style.overflow = '';
      };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleBackdropClick = () => {
      if (closeOnBackdropClick) {
        onClose();
      }
    };

    return (
      <ModalContext.Provider value={{ onClose }}>
        <div ref={ref} className={`modal ${className}`} data-testid="modal" {...props}>
          <div
            className="modal-backdrop"
            data-testid="modal-backdrop"
            onClick={handleBackdropClick}
          />
          <div
            className={`modal-dialog modal-${size}`}
            data-testid="modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={props['aria-labelledby']}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </div>
        </div>
      </ModalContext.Provider>
    );
  }
);

Modal.displayName = 'Modal';

// ModalContent
interface ModalContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const ModalContent = forwardRef<HTMLDivElement, ModalContentProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={`modal-content ${className}`} data-testid="modal-content" {...props}>
        {children}
      </div>
    );
  }
);

ModalContent.displayName = 'ModalContent';

// ModalHeader
interface ModalHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  showClose?: boolean;
}

const ModalHeader = forwardRef<HTMLDivElement, ModalHeaderProps>(
  ({ className = '', showClose = true, children, ...props }, ref) => {
    const { onClose } = useModalContext();

    return (
      <div ref={ref} className={`modal-header ${className}`} data-testid="modal-header" {...props}>
        <div className="modal-header-content">{children}</div>
        {showClose && (
          <button
            type="button"
            className="modal-close-button"
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

ModalHeader.displayName = 'ModalHeader';

// ModalBody
interface ModalBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

const ModalBody = forwardRef<HTMLDivElement, ModalBodyProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={`modal-body ${className}`} data-testid="modal-body" {...props}>
        {children}
      </div>
    );
  }
);

ModalBody.displayName = 'ModalBody';

// ModalFooter
interface ModalFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const ModalFooter = forwardRef<HTMLDivElement, ModalFooterProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={`modal-footer ${className}`} data-testid="modal-footer" {...props}>
        {children}
      </div>
    );
  }
);

ModalFooter.displayName = 'ModalFooter';

// BottomSheet
type BottomSheetHeight = 'auto' | 'half' | 'full';

interface BottomSheetProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onClose: () => void;
  height?: BottomSheetHeight;
  closeOnBackdropClick?: boolean;
}

const BottomSheet = forwardRef<HTMLDivElement, BottomSheetProps>(
  ({
    isOpen,
    onClose,
    height = 'auto',
    closeOnBackdropClick = true,
    className = '',
    children,
    ...props
  }, ref) => {
    // Prevent body scroll when bottom sheet is open
    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      }
      return () => {
        document.body.style.overflow = '';
      };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleBackdropClick = () => {
      if (closeOnBackdropClick) {
        onClose();
      }
    };

    return (
      <div className="bottom-sheet-wrapper">
        <div
          className="modal-backdrop"
          data-testid="modal-backdrop"
          onClick={handleBackdropClick}
        />
        <div
          ref={ref}
          className={`bottom-sheet bottom-sheet-${height} ${className}`}
          data-testid="bottom-sheet"
          role="dialog"
          aria-modal="true"
          {...props}
        >
          <div className="bottom-sheet-handle" data-testid="bottom-sheet-handle" />
          <div className="bottom-sheet-content">
            {children}
          </div>
        </div>
      </div>
    );
  }
);

BottomSheet.displayName = 'BottomSheet';

export { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, BottomSheet };
export type { ModalProps, ModalSize, ModalContentProps, ModalHeaderProps, ModalBodyProps, ModalFooterProps, BottomSheetProps, BottomSheetHeight };
