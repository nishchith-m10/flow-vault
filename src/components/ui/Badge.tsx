'use client';

import { HTMLAttributes, ReactNode } from 'react';

export type BadgeVariant = 'neutral' | 'success' | 'error' | 'warning' | 'info' | 'accent';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
  icon?: ReactNode;
}

export function Badge({
  variant = 'neutral',
  dot = false,
  icon,
  className = '',
  children,
  ...props
}: BadgeProps) {
  return (
    <span className={`badge badge-${variant} ${className}`} {...props}>
      {dot && !icon && (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor:
              variant === 'success' ? 'var(--success)' :
              variant === 'error' ? 'var(--error)' :
              variant === 'warning' ? 'var(--warning)' :
              variant === 'info' ? 'var(--info)' :
              variant === 'accent' ? 'var(--accent)' :
              'var(--text-tertiary)',
          }}
        />
      )}
      {icon}
      {children}
    </span>
  );
}

export default Badge;
