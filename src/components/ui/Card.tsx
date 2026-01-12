'use client';

import { HTMLAttributes, forwardRef, ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

type CardPadding = 'none' | 'sm' | 'md' | 'lg';

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

type MotionDivProps = Omit<HTMLMotionProps<'div'>, 'ref'>;
type BaseCardProps = Omit<HTMLAttributes<HTMLDivElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'>;

export interface CardProps extends BaseCardProps {
  interactive?: boolean;
  hover?: boolean; // Alias for interactive
  selected?: boolean;
  padding?: CardPadding;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ interactive = false, hover = false, selected = false, padding, className = '', children, ...props }, ref) => {
    const isInteractive = interactive || hover;
    const baseClasses = 'card';
    const interactiveClasses = isInteractive ? 'card-interactive' : '';
    const selectedClasses = selected ? 'card-selected' : '';
    const paddingClass = padding ? paddingClasses[padding] : '';

    if (isInteractive) {
      return (
        <motion.div
          ref={ref}
          className={`${baseClasses} ${interactiveClasses} ${selectedClasses} ${paddingClass} ${className}`}
          whileHover={{ y: -2 }}
          whileTap={{ y: 0 }}
          transition={{ duration: 0.12 }}
          {...(props as MotionDivProps)}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <div
        ref={ref}
        className={`${baseClasses} ${selectedClasses} ${paddingClass} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export type CardHeaderProps = HTMLAttributes<HTMLDivElement>;

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className = '', children, ...props }, ref) => (
    <div ref={ref} className={`card-header ${className}`} {...props}>
      {children}
    </div>
  )
);

CardHeader.displayName = 'CardHeader';

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ as: Component = 'h3', className = '', children, ...props }, ref) => (
    <Component
      ref={ref}
      className={`text-lg font-semibold text-[var(--text-primary)] ${className}`}
      {...props}
    >
      {children}
    </Component>
  )
);

CardTitle.displayName = 'CardTitle';

export type CardDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className = '', children, ...props }, ref) => (
    <p
      ref={ref}
      className={`text-sm text-[var(--text-secondary)] mt-1 ${className}`}
      {...props}
    >
      {children}
    </p>
  )
);

CardDescription.displayName = 'CardDescription';

export type CardBodyProps = HTMLAttributes<HTMLDivElement>;

export const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className = '', children, ...props }, ref) => (
    <div ref={ref} className={`card-body ${className}`} {...props}>
      {children}
    </div>
  )
);

CardBody.displayName = 'CardBody';

export const CardContent = CardBody;

export type CardFooterProps = HTMLAttributes<HTMLDivElement>;

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className = '', children, ...props }, ref) => (
    <div ref={ref} className={`card-footer ${className}`} {...props}>
      {children}
    </div>
  )
);

CardFooter.displayName = 'CardFooter';

export interface StatCardProps {
  label: string;
  value: string | number;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
  icon?: ReactNode;
  className?: string;
}

export function StatCard({ label, value, trend, icon, className = '' }: StatCardProps) {
  return (
    <div className={`stat-card ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="stat-label">{label}</p>
          <p className="stat-value">{value}</p>
          {trend && (
            <p className={`stat-trend ${trend.direction === 'up' ? 'stat-trend-up' : trend.direction === 'down' ? 'stat-trend-down' : 'text-[var(--text-tertiary)]'}`}>
              {trend.direction === 'up' && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m18 15-6-6-6 6" />
                </svg>
              )}
              {trend.direction === 'down' && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              )}
              {trend.value}
            </p>
          )}
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-tertiary)]">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export default Card;
