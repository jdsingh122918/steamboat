'use client';

import React, { forwardRef, createContext, useContext, useState, useCallback, ReactNode } from 'react';

// ============================================
// Tabs Components
// ============================================

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

const useTabsContext = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs');
  }
  return context;
};

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  ({ defaultValue, value: controlledValue, onValueChange, className = '', children, ...props }, ref) => {
    const [internalValue, setInternalValue] = useState(defaultValue || '');

    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : internalValue;

    const handleValueChange = useCallback((newValue: string) => {
      if (!isControlled) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
    }, [isControlled, onValueChange]);

    return (
      <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
        <div ref={ref} className={`tabs ${className}`} data-testid="tabs" {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    );
  }
);

Tabs.displayName = 'Tabs';

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

const TabsList = forwardRef<HTMLDivElement, TabsListProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} role="tablist" className={`tabs-list ${className}`} {...props}>
        {children}
      </div>
    );
  }
);

TabsList.displayName = 'TabsList';

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

const TabsTrigger = forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ value, disabled, className = '', children, ...props }, ref) => {
    const { value: selectedValue, onValueChange } = useTabsContext();
    const isSelected = value === selectedValue;

    const handleClick = () => {
      if (!disabled) {
        onValueChange(value);
      }
    };

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={isSelected}
        aria-disabled={disabled || undefined}
        disabled={disabled}
        className={`tabs-trigger ${isSelected ? 'tabs-trigger-active' : ''} ${disabled ? 'tabs-trigger-disabled' : ''} ${className}`}
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    );
  }
);

TabsTrigger.displayName = 'TabsTrigger';

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const TabsContent = forwardRef<HTMLDivElement, TabsContentProps>(
  ({ value, className = '', children, ...props }, ref) => {
    const { value: selectedValue } = useTabsContext();
    const isSelected = value === selectedValue;

    if (!isSelected) return null;

    return (
      <div
        ref={ref}
        role="tabpanel"
        className={`tabs-content ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

TabsContent.displayName = 'TabsContent';

// ============================================
// Accordion Components
// ============================================

interface AccordionContextValue {
  value: string[];
  onItemToggle: (itemValue: string) => void;
  type: 'single' | 'multiple';
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

const useAccordionContext = () => {
  const context = useContext(AccordionContext);
  if (!context) {
    throw new Error('Accordion components must be used within an Accordion');
  }
  return context;
};

interface AccordionItemContextValue {
  value: string;
  isOpen: boolean;
  disabled: boolean;
}

const AccordionItemContext = createContext<AccordionItemContextValue | null>(null);

const useAccordionItemContext = () => {
  const context = useContext(AccordionItemContext);
  if (!context) {
    throw new Error('AccordionTrigger/AccordionContent must be used within an AccordionItem');
  }
  return context;
};

interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: 'single' | 'multiple';
  defaultValue?: string[];
  value?: string[];
  onValueChange?: (value: string[]) => void;
}

const Accordion = forwardRef<HTMLDivElement, AccordionProps>(
  ({ type = 'multiple', defaultValue = [], value: controlledValue, onValueChange, className = '', children, ...props }, ref) => {
    const [internalValue, setInternalValue] = useState<string[]>(defaultValue);

    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : internalValue;

    const handleItemToggle = useCallback((itemValue: string) => {
      let newValue: string[];

      if (type === 'single') {
        newValue = value.includes(itemValue) ? [] : [itemValue];
      } else {
        newValue = value.includes(itemValue)
          ? value.filter((v) => v !== itemValue)
          : [...value, itemValue];
      }

      if (!isControlled) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
    }, [type, value, isControlled, onValueChange]);

    return (
      <AccordionContext.Provider value={{ value, onItemToggle: handleItemToggle, type }}>
        <div ref={ref} className={`accordion ${className}`} data-testid="accordion" {...props}>
          {children}
        </div>
      </AccordionContext.Provider>
    );
  }
);

Accordion.displayName = 'Accordion';

interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  disabled?: boolean;
}

const AccordionItem = forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ value, disabled = false, className = '', children, ...props }, ref) => {
    const { value: openItems } = useAccordionContext();
    const isOpen = openItems.includes(value);

    return (
      <AccordionItemContext.Provider value={{ value, isOpen, disabled }}>
        <div
          ref={ref}
          className={`accordion-item ${isOpen ? 'accordion-item-open' : ''} ${disabled ? 'accordion-item-disabled' : ''} ${className}`}
          data-testid="accordion-item"
          {...props}
        >
          {children}
        </div>
      </AccordionItemContext.Provider>
    );
  }
);

AccordionItem.displayName = 'AccordionItem';

interface AccordionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const AccordionTrigger = forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  ({ className = '', children, ...props }, ref) => {
    const { onItemToggle } = useAccordionContext();
    const { value, isOpen, disabled } = useAccordionItemContext();

    const handleClick = () => {
      if (!disabled) {
        onItemToggle(value);
      }
    };

    return (
      <button
        ref={ref}
        type="button"
        aria-expanded={isOpen}
        aria-disabled={disabled || undefined}
        className={`accordion-trigger ${isOpen ? 'accordion-trigger-open' : ''} ${disabled ? 'accordion-trigger-disabled' : ''} ${className}`}
        onClick={handleClick}
        {...props}
      >
        <span className="accordion-trigger-text">{children}</span>
        <svg
          className="accordion-trigger-icon"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
    );
  }
);

AccordionTrigger.displayName = 'AccordionTrigger';

interface AccordionContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const AccordionContent = forwardRef<HTMLDivElement, AccordionContentProps>(
  ({ className = '', children, ...props }, ref) => {
    const { isOpen } = useAccordionItemContext();

    if (!isOpen) return null;

    return (
      <div
        ref={ref}
        className={`accordion-content ${className}`}
        data-testid="accordion-content"
        {...props}
      >
        <div className="accordion-content-inner">{children}</div>
      </div>
    );
  }
);

AccordionContent.displayName = 'AccordionContent';

export { Tabs, TabsList, TabsTrigger, TabsContent, Accordion, AccordionItem, AccordionTrigger, AccordionContent };
export type { TabsProps, TabsListProps, TabsTriggerProps, TabsContentProps, AccordionProps, AccordionItemProps, AccordionTriggerProps, AccordionContentProps };
