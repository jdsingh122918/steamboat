'use client';

import React, { forwardRef, createContext, useContext, useState, useCallback, useId, ReactNode } from 'react';

// Toast types
type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info';
type ToastPosition = 'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'bottom-left' | 'bottom-center';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  variant?: ToastVariant;
  closable?: boolean;
  onClose?: () => void;
  action?: ToastAction;
  icon?: ReactNode;
  showIcon?: boolean;
}

// Variant icons
const VariantIcons: Record<ToastVariant, ReactNode> = {
  default: null,
  success: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" data-testid="toast-icon">
      <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fill="currentColor"/>
    </svg>
  ),
  error: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" data-testid="toast-icon">
      <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" fill="currentColor"/>
    </svg>
  ),
  warning: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" data-testid="toast-icon">
      <path d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" fill="currentColor"/>
    </svg>
  ),
  info: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" data-testid="toast-icon">
      <path d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" fill="currentColor"/>
    </svg>
  ),
};

const Toast = forwardRef<HTMLDivElement, ToastProps>(
  ({
    title,
    description,
    variant = 'default',
    closable = true,
    onClose,
    action,
    icon,
    showIcon = false,
    className = '',
    ...props
  }, ref) => {
    const displayIcon = icon || (showIcon && VariantIcons[variant]);

    return (
      <div
        ref={ref}
        className={`toast toast-${variant} ${className}`}
        data-testid="toast"
        role="alert"
        {...props}
      >
        {displayIcon && <div className="toast-icon">{displayIcon}</div>}
        <div className="toast-content">
          <div className="toast-title">{title}</div>
          {description && <div className="toast-description">{description}</div>}
        </div>
        {action && (
          <button type="button" className="toast-action" onClick={action.onClick}>
            {action.label}
          </button>
        )}
        {closable && onClose && (
          <button type="button" className="toast-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 4L4 12M4 4l8 8" />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

Toast.displayName = 'Toast';

// Toast context
interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toast: (options: Omit<ToastItem, 'id'>) => string;
  dismiss: (id?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// ToastProvider
interface ToastProviderProps {
  children: ReactNode;
  position?: ToastPosition;
  defaultDuration?: number;
}

const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  position = 'top-right',
  defaultDuration = 5000,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((options: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastItem = {
      id,
      ...options,
      duration: options.duration ?? defaultDuration,
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss
    const duration = newToast.duration;
    if (duration && duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }

    return id;
  }, [defaultDuration]);

  const dismiss = useCallback((id?: string) => {
    if (id) {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    } else {
      setToasts([]);
    }
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div
        className={`toast-container toast-position-${position}`}
        data-testid="toast-container"
      >
        {toasts.map((t) => (
          <Toast
            key={t.id}
            title={t.title}
            description={t.description}
            variant={t.variant}
            onClose={() => dismiss(t.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export { Toast, ToastProvider, useToast };
export type { ToastProps, ToastVariant, ToastPosition, ToastAction, ToastProviderProps };
