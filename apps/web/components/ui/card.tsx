'use client';

import React, { forwardRef } from 'react';

// Card variants
type CardVariant = 'default' | 'elevated' | 'outlined' | 'ghost';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  asChild?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', variant = 'default', padding = 'md', onClick, asChild, children, ...props }, ref) => {
    const classes = [
      'card',
      `card-${variant}`,
      `card-padding-${padding}`,
      onClick ? 'card-interactive' : '',
      className,
    ].filter(Boolean).join(' ');

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, {
        ref,
        className: classes,
        'data-testid': 'card',
        ...props,
      });
    }

    return (
      <div ref={ref} className={classes} onClick={onClick} data-testid="card" {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// CardHeader
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={`card-header ${className}`} data-testid="card-header" {...props}>
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

// CardTitle
type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: HeadingLevel;
}

const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className = '', as: Component = 'h3', children, ...props }, ref) => {
    return (
      <Component ref={ref} className={`card-title ${className}`} {...props}>
        {children}
      </Component>
    );
  }
);

CardTitle.displayName = 'CardTitle';

// CardDescription
interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <p ref={ref} className={`card-description ${className}`} data-testid="card-description" {...props}>
        {children}
      </p>
    );
  }
);

CardDescription.displayName = 'CardDescription';

// CardContent
interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={`card-content ${className}`} data-testid="card-content" {...props}>
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

// CardFooter
type FooterJustify = 'start' | 'end' | 'center' | 'between';

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  justify?: FooterJustify;
}

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className = '', justify, children, ...props }, ref) => {
    const classes = [
      'card-footer',
      justify ? `card-footer-${justify}` : '',
      className,
    ].filter(Boolean).join(' ');

    return (
      <div ref={ref} className={classes} data-testid="card-footer" {...props}>
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
export type { CardProps, CardVariant, CardPadding, CardHeaderProps, CardTitleProps, CardDescriptionProps, CardContentProps, CardFooterProps };
