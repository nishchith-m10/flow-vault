'use client';

import { ReactNode, ComponentType, isValidElement, forwardRef } from 'react';
import Button from './Button';
import { LucideProps } from 'lucide-react';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
}

// Type for both regular components and forwardRef components
type IconType = ComponentType<LucideProps> | React.ForwardRefExoticComponent<LucideProps & React.RefAttributes<SVGSVGElement>>;

export interface EmptyStateProps {
  icon?: ReactNode | IconType;
  title: string;
  description?: string;
  action?: EmptyStateAction | ReactNode;
  children?: ReactNode;
  className?: string;
}

// Helper to check if something is a component (function or forwardRef)
function isComponent(value: unknown): value is IconType {
  if (typeof value === 'function') return true;
  // Check for forwardRef (has $$typeof and render properties)
  if (
    value &&
    typeof value === 'object' &&
    '$$typeof' in value &&
    'render' in value
  ) {
    return true;
  }
  return false;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  children,
  className = '',
}: EmptyStateProps) {
  // Handle icon as either a React element or a component
  const renderIcon = () => {
    if (!icon) return null;
    if (isValidElement(icon)) return icon;
    if (isComponent(icon)) {
      const IconComponent = icon as IconType;
      return <IconComponent className="w-12 h-12" />;
    }
    // If it's neither, don't render (prevent object rendering error)
    return null;
  };

  // Handle action as either an object or a ReactNode
  const renderAction = () => {
    if (!action) return null;
    if (isValidElement(action)) return action;
    if (typeof action === 'object' && 'label' in action && 'onClick' in action) {
      const actionObj = action as EmptyStateAction;
      return (
        <Button variant={actionObj.variant || 'primary'} onClick={actionObj.onClick}>
          {actionObj.label}
        </Button>
      );
    }
    return null;
  };

  return (
    <div className={`empty-state ${className}`}>
      {icon && <div className="empty-state-icon">{renderIcon()}</div>}
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}
      {renderAction()}
      {children}
    </div>
  );
}

export default EmptyState;

// Accessibility: add `aria-label` and prop docs
