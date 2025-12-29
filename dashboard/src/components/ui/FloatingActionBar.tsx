'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, type LucideIcon } from 'lucide-react';
import { useEffect, useCallback } from 'react';
import Button from './Button';

export interface FloatingAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  shortcut?: string;
  disabled?: boolean;
}

export interface FloatingActionBarProps {
  selectedCount: number;
  actions: FloatingAction[];
  onClearSelection: () => void;
  loading?: boolean;
  itemLabel?: string; // e.g., "workflow", "file"
}

export function FloatingActionBar({
  selectedCount,
  actions,
  onClearSelection,
  loading = false,
  itemLabel = 'item',
}: FloatingActionBarProps) {
  const isVisible = selectedCount > 0;

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isVisible) return;

      // Escape to clear selection
      if (e.key === 'Escape') {
        e.preventDefault();
        onClearSelection();
        return;
      }

      // Check for action shortcuts
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
        const action = actions.find(
          (a) => a.shortcut?.toLowerCase() === e.key.toLowerCase() && !a.disabled
        );
        if (action) {
          e.preventDefault();
          action.onClick();
        }
      }
    },
    [isVisible, actions, onClearSelection]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[var(--z-sticky)] pointer-events-auto"
        >
          <div className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-2xl shadow-lg backdrop-blur-sm">
            {/* Selection Count */}
            <div className="flex items-center gap-3 pr-3 border-r border-[var(--border-default)]">
              <button
                onClick={onClearSelection}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                title="Clear selection (Esc)"
              >
                <X size={16} />
              </button>
              <span className="text-sm font-medium text-[var(--text-primary)] whitespace-nowrap">
                {selectedCount} {itemLabel}
                {selectedCount !== 1 ? 's' : ''} selected
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {loading ? (
                <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--text-secondary)]">
                  <Loader2 size={16} className="animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                actions.map((action) => (
                  <Button
                    key={action.id}
                    variant={action.variant || 'secondary'}
                    size="sm"
                    onClick={action.onClick}
                    disabled={action.disabled}
                    title={
                      action.shortcut
                        ? `${action.label} (⌘${action.shortcut.toUpperCase()})`
                        : action.label
                    }
                    className="whitespace-nowrap"
                  >
                    <action.icon size={16} className="mr-1.5" />
                    {action.label}
                    {action.shortcut && (
                      <kbd className="hidden sm:inline-flex ml-2 px-1.5 py-0.5 text-[10px] font-mono bg-[var(--bg-hover)] rounded border border-[var(--border-default)] text-[var(--text-tertiary)]">
                        ⌘{action.shortcut.toUpperCase()}
                      </kbd>
                    )}
                  </Button>
                ))
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default FloatingActionBar;
