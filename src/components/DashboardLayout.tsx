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
  ChevronRight,
  Command,
} from 'lucide-react';
import { ThemeToggle } from './ThemeProvider';
import { useCommandPalette } from './CommandPalette';
import { UserProfile } from './UserProfile';

// Configuration status context - credentials never exposed to client
interface ConfigurationContextType {
  isConfigured: boolean;
  refreshConfiguration: () => Promise<void>;
}

const ConfigurationContext = createContext<ConfigurationContextType>({
  isConfigured: false,
  refreshConfiguration: async () => {},
});

// Export with backward-compatible name for gradual migration
export const useCredentials = () => useContext(ConfigurationContext);

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/workflows', label: 'Workflows', icon: FolderOpen },
  { href: '/workflows/import', label: 'Import', icon: Upload, indent: true },
  { href: '/workflows/create', label: 'Create', icon: Sparkles, indent: true },
  { href: '/workflows/archived', label: 'Archived', icon: Archive, indent: true },
  { href: '/executions', label: 'Executions', icon: Zap },
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
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

function Sidebar({
  pathname,
  isConfigured,
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
          {/* Connection Status */}
          <Link
            href="/settings"
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
            <ChevronRight size={16} />
          </Link>

          {/* Divider */}
          <div className="h-px bg-[var(--border-default)] my-2" />

          <div className="flex items-center gap-3">
            <UserProfile />
          </div>
        </div>
      </aside>
    </>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  // Fetch configuration status from server (credentials never exposed to client)
  const refreshConfiguration = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const result = await response.json();
        setIsConfigured(result.success && result.data);
      } else {
        setIsConfigured(false);
      }
    } catch (error) {
      console.error('Failed to check configuration status:', error);
      setIsConfigured(false);
    }
  };

  // Load configuration status on mount
  useEffect(() => {
    refreshConfiguration();
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    if (mobileMenuOpen) {
      const timer = setTimeout(() => setMobileMenuOpen(false), 0);
      return () => clearTimeout(timer);
    }
  }, [pathname, mobileMenuOpen]);

  return (
    <ConfigurationContext.Provider
      value={{ isConfigured, refreshConfiguration }}
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
          isMobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />

        {/* Main Content */}
        <main className="main-content">
          {/* Settings panel removed - use /settings page for credential management */}

          {/* Page Content */}
          <div className="page-container">{children}</div>
        </main>
      </div>
    </ConfigurationContext.Provider>
  );
}
