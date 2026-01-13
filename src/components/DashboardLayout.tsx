'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
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
  Menu,
  X,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Key,
  Link as LinkIcon,
  Command,
} from 'lucide-react';
import Button from './ui/Button';
import { ThemeToggle } from './ThemeProvider';
import { useCommandPalette } from './CommandPalette';
import { UserProfile } from './UserProfile';

interface CredentialsContextType {
  n8nUrl: string;
  apiKey: string;
  setN8nUrl: (url: string) => void;
  setApiKey: (key: string) => void;
  isConfigured: boolean;
}

const CredentialsContext = createContext<CredentialsContextType>({
  n8nUrl: '',
  apiKey: '',
  setN8nUrl: () => {},
  setApiKey: () => {},
  isConfigured: false,
});

export const useCredentials = () => useContext(CredentialsContext);

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/workflows', label: 'Workflows', icon: FolderOpen },
  { href: '/workflows/import', label: 'Import', icon: Upload, indent: true },
  { href: '/workflows/create', label: 'Create', icon: Sparkles, indent: true },
  { href: '/workflows/archived', label: 'Archived', icon: Archive, indent: true },
  { href: '/executions', label: 'Executions', icon: Zap },
  { href: '/variables', label: 'Variables', icon: Settings },
  { href: '/tags', label: 'Tags', icon: Tag },
  { href: '/trash', label: 'Trash', icon: Trash2 },
];

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ElementType;
  indent?: boolean;
  isActive: boolean;
  onClick?: () => void;
}

function NavItem({ href, label, icon: Icon, indent, isActive, onClick }: NavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`nav-item ${indent ? 'nav-item-indent' : ''} ${isActive ? 'nav-item-active' : ''}`}
    >
      <Icon className="nav-item-icon" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

interface MobileHeaderProps {
  onMenuClick: () => void;
  isConfigured: boolean;
}

function MobileHeader({ onMenuClick, isConfigured }: MobileHeaderProps) {
  const { open: openCommandPalette } = useCommandPalette();

  return (
    <header className="mobile-header">
      <button
        onClick={onMenuClick}
        className="btn btn-ghost btn-icon btn-sm"
        aria-label="Toggle menu"
      >
        <Menu size={20} />
      </button>
      
      <span className="sidebar-logo">FlowVault</span>
      
      <div className="flex items-center gap-2">
        <button
          onClick={openCommandPalette}
          className="btn btn-ghost btn-icon btn-sm"
          aria-label="Open command palette"
        >
          <Command size={18} />
        </button>
        <div
          className={`w-2 h-2 rounded-full ${
            isConfigured ? 'bg-[var(--success)]' : 'bg-[var(--error)]'
          }`}
        />
      </div>
    </header>
  );
}

interface SidebarProps {
  pathname: string;
  isConfigured: boolean;
  showSettings: boolean;
  onToggleSettings: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

function Sidebar({
  pathname,
  isConfigured,
  showSettings,
  onToggleSettings,
  isMobileOpen,
  onMobileClose,
}: SidebarProps) {
  const { open: openCommandPalette } = useCommandPalette();

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            className="sidebar-overlay sidebar-overlay-visible"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onMobileClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`sidebar ${isMobileOpen ? 'sidebar-open' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          <span className="sidebar-logo">FlowVault</span>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              onClick={onMobileClose}
              className="btn btn-ghost btn-icon btn-sm lg:hidden"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Command Palette Trigger */}
        <div className="px-3 py-2">
          <button
            onClick={openCommandPalette}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] text-[var(--text-tertiary)] text-sm hover:border-[var(--border-hover)] hover:text-[var(--text-secondary)] transition-all"
          >
            <Command size={16} />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="text-xs bg-[var(--bg-subtle)] px-1.5 py-0.5 rounded">⌘K</kbd>
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav space-y-1">
          {navItems.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              isActive={pathname === item.href}
              onClick={onMobileClose}
            />
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div className="flex items-center gap-3">
            <UserProfile />
          </div>

          {/* Divider */}
          <div className="h-px bg-[var(--border-default)] my-2" />

          {/* Connection Status */}
          <button
            onClick={onToggleSettings}
            suppressHydrationWarning
            className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] transition-all ${
              isConfigured
                ? 'bg-[var(--success-muted)] text-[var(--success)]'
                : 'bg-[var(--error-muted)] text-[var(--error)]'
            }`}
          >
            <div className="flex items-center gap-3">
              {isConfigured ? (
                <CheckCircle2 size={18} />
              ) : (
                <XCircle size={18} />
              )}
              <span className="text-sm font-medium">
                {isConfigured ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            {showSettings ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}

interface SettingsPanelProps {
  n8nUrl: string;
  apiKey: string;
  onUrlChange: (url: string) => void;
  onApiKeyChange: (key: string) => void;
  onClose: () => void;
}

function SettingsPanel({
  n8nUrl,
  apiKey,
  onUrlChange,
  onApiKeyChange,
  onClose,
}: SettingsPanelProps) {
  return (
    <motion.div
      className="bg-[var(--bg-elevated)] border-b border-[var(--border-default)] p-6"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--accent-muted)] flex items-center justify-center">
              <Key size={20} className="text-[var(--accent)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                n8n Connection
              </h2>
              <p className="text-sm text-[var(--text-tertiary)]">
                Configure your n8n instance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-icon btn-sm"
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <LinkIcon size={14} />
              Instance URL
            </label>
            <input
              type="text"
              value={n8nUrl}
              onChange={(e) => onUrlChange(e.target.value)}
              placeholder="https://your-n8n.ondigitalocean.app"
              className="input w-full"
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <Key size={14} />
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              placeholder="Your n8n API key"
              className="input w-full"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="primary" onClick={onClose}>
            Save & Close
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [n8nUrl, setN8nUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    queueMicrotask(() => {
      setN8nUrl(localStorage.getItem('n8n_url') || '');
      setApiKey(localStorage.getItem('n8n_api_key') || '');
      setIsMounted(true);
    });
  }, []);

  // Save to localStorage when changed
  useEffect(() => {
    if (isMounted) {
      if (n8nUrl) localStorage.setItem('n8n_url', n8nUrl);
      if (apiKey) localStorage.setItem('n8n_api_key', apiKey);
    }
  }, [n8nUrl, apiKey, isMounted]);

  // Close mobile menu on route change
  useEffect(() => {
    if (mobileMenuOpen) {
      const timer = setTimeout(() => setMobileMenuOpen(false), 0);
      return () => clearTimeout(timer);
    }
  }, [pathname, mobileMenuOpen]);

  const isConfigured = Boolean(n8nUrl && apiKey);

  return (
    <CredentialsContext.Provider
      value={{ n8nUrl, apiKey, setN8nUrl, setApiKey, isConfigured }}
    >
      <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        {/* Mobile Header */}
        <MobileHeader
          onMenuClick={() => setMobileMenuOpen(true)}
          isConfigured={isConfigured}
        />

        {/* Sidebar */}
        <Sidebar
          pathname={pathname}
          isConfigured={isConfigured}
          showSettings={showSettings}
          onToggleSettings={() => setShowSettings(!showSettings)}
          isMobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />

        {/* Main Content */}
        <main className="main-content">
          {/* Settings Panel */}
          <AnimatePresence>
            {showSettings && (
              <SettingsPanel
                n8nUrl={n8nUrl}
                apiKey={apiKey}
                onUrlChange={setN8nUrl}
                onApiKeyChange={setApiKey}
                onClose={() => setShowSettings(false)}
              />
            )}
          </AnimatePresence>

          {/* Page Content */}
          <div className="page-container">{children}</div>
        </main>
      </div>
    </CredentialsContext.Provider>
  );
}
