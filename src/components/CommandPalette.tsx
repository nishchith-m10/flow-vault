'use client';

import { useState, useEffect, useCallback, useRef, createContext, useContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FolderOpen,
  Upload,
  Sparkles,
  Archive,
  Zap,
  Settings,
  Tag,
  Trash2,
  Search,
  Moon,
  Sun,
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  icon: ReactNode;
  shortcut?: string;
  action: () => void;
  group: string;
}

interface CommandPaletteContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextType | undefined>(undefined);

export function useCommandPalette() {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error('useCommandPalette must be used within a CommandPaletteProvider');
  }
  return context;
}

interface CommandPaletteProviderProps {
  children: ReactNode;
}

export function CommandPaletteProvider({ children }: CommandPaletteProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(0);
  }, []);
  const toggle = useCallback(() => {
    if (isOpen) close();
    else open();
  }, [isOpen, open, close]);

  // Navigation items
  const navigationItems: CommandItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, shortcut: 'G D', action: () => { router.push('/'); close(); }, group: 'Navigation' },
    { id: 'workflows', label: 'Workflows', icon: <FolderOpen size={18} />, shortcut: 'G W', action: () => { router.push('/workflows'); close(); }, group: 'Navigation' },
    { id: 'import', label: 'Import Workflows', icon: <Upload size={18} />, shortcut: 'G I', action: () => { router.push('/workflows/import'); close(); }, group: 'Navigation' },
    { id: 'create', label: 'Create Workflow', icon: <Sparkles size={18} />, shortcut: 'G C', action: () => { router.push('/workflows/create'); close(); }, group: 'Navigation' },
    { id: 'archived', label: 'Archived', icon: <Archive size={18} />, shortcut: 'G A', action: () => { router.push('/workflows/archived'); close(); }, group: 'Navigation' },
    { id: 'executions', label: 'Executions', icon: <Zap size={18} />, shortcut: 'G E', action: () => { router.push('/executions'); close(); }, group: 'Navigation' },
    { id: 'variables', label: 'Variables', icon: <Settings size={18} />, shortcut: 'G V', action: () => { router.push('/variables'); close(); }, group: 'Navigation' },
    { id: 'tags', label: 'Tags', icon: <Tag size={18} />, shortcut: 'G T', action: () => { router.push('/tags'); close(); }, group: 'Navigation' },
    { id: 'trash', label: 'Trash', icon: <Trash2 size={18} />, action: () => { router.push('/trash'); close(); }, group: 'Navigation' },
  ];

  // Theme items
  const themeItems: CommandItem[] = [
    { id: 'theme-dark', label: 'Dark Mode', icon: <Moon size={18} />, action: () => { document.documentElement.setAttribute('data-theme', 'dark'); localStorage.setItem('flowvault-theme', 'dark'); close(); }, group: 'Theme' },
    { id: 'theme-light', label: 'Light Mode', icon: <Sun size={18} />, action: () => { document.documentElement.setAttribute('data-theme', 'light'); localStorage.setItem('flowvault-theme', 'light'); close(); }, group: 'Theme' },
  ];

  const allItems = [...navigationItems, ...themeItems];

  // Filter items based on query
  const filteredItems = query
    ? allItems.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.group.toLowerCase().includes(query.toLowerCase())
      )
    : allItems;

  // Group items
  const groupedItems = filteredItems.reduce((groups, item) => {
    if (!groups[item.group]) {
      groups[item.group] = [];
    }
    groups[item.group].push(item);
    return groups;
  }, {} as Record<string, CommandItem[]>);

  // Flatten for keyboard navigation
  const flatItems = Object.values(groupedItems).flat();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
        return;
      }

      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          close();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => (i + 1) % flatItems.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => (i - 1 + flatItems.length) % flatItems.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (flatItems[selectedIndex]) {
            flatItems[selectedIndex].action();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, toggle, close, flatItems, selectedIndex]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset selected index when query changes
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setSelectedIndex(0), 0);
      return () => clearTimeout(timer);
    }
  }, [query, isOpen]);

  return (
    <CommandPaletteContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="command-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={close}
            />

            {/* Dialog */}
            <motion.div
              className="command-dialog"
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {/* Search Input */}
              <div className="command-input-wrapper">
                <Search size={18} className="text-[var(--text-tertiary)]" />
                <input
                  ref={inputRef}
                  type="text"
                  className="command-input"
                  placeholder="Type a command or search..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <kbd className="command-shortcut">esc</kbd>
              </div>

              {/* Results */}
              <div className="command-list">
                {flatItems.length === 0 ? (
                  <div className="py-8 text-center text-sm text-[var(--text-tertiary)]">
                    No results found
                  </div>
                ) : (
                  Object.entries(groupedItems).map(([group, items]) => (
                    <div key={group}>
                      <div className="command-group-label">{group}</div>
                      {items.map((item) => {
                        const itemIndex = flatItems.findIndex(i => i.id === item.id);
                        return (
                          <div
                            key={item.id}
                            className="command-item"
                            data-selected={selectedIndex === itemIndex}
                            onClick={item.action}
                            onMouseEnter={() => setSelectedIndex(itemIndex)}
                          >
                            <span className="command-item-icon">{item.icon}</span>
                            <span>{item.label}</span>
                            {item.shortcut && (
                              <kbd className="command-shortcut">{item.shortcut}</kbd>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </CommandPaletteContext.Provider>
  );
}

export default CommandPaletteProvider;

// Cleanup event listeners on unmount

// Add JSDoc explaining keybinding overrides
