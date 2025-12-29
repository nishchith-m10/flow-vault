'use client';

import { forwardRef, ButtonHTMLAttributes, ReactNode, useState } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

// Omit conflicting props between HTMLButtonElement and framer-motion
type MotionButtonProps = Omit<HTMLMotionProps<'button'>, 'ref'>;
type BaseButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'>;

export interface ButtonProps extends BaseButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  iconOnly?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      iconOnly = false,
      children,
      className = '',
      disabled,
      onClick,
      ...props
    },
    ref
  ) => {
    const [isPulsing, setIsPulsing] = useState(false);

    const baseClasses = 'btn';
    const variantClasses = `btn-${variant}`;
    const sizeClasses = `btn-${size}`;
    const iconOnlyClasses = iconOnly ? 'btn-icon' : '';
    const pulseClasses = isPulsing ? 'pulse-ring-sm' : '';

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || isLoading) return;
      
      // Trigger pulse animation
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 300);
      
      onClick?.(e);
    };

    return (
      <motion.button
        ref={ref}
        className={`${baseClasses} ${variantClasses} ${sizeClasses} ${iconOnlyClasses} ${pulseClasses} ${className}`}
        disabled={disabled || isLoading}
        onClick={handleClick}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.08 }}
        {...(props as MotionButtonProps)}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            {!iconOnly && <span>Loading...</span>}
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {!iconOnly && children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
