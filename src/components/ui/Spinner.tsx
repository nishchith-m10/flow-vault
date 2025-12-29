'use client';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 16,
  md: 24,
  lg: 32,
};

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const dimension = sizes[size];
  
  return (
    <svg
      className={`animate-spin text-[var(--accent)] ${className}`}
      width={dimension}
      height={dimension}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

export function LoadingDots({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-tertiary)] animate-pulse" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-tertiary)] animate-pulse" style={{ animationDelay: '150ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-tertiary)] animate-pulse" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

export function LoadingOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-[var(--bg-base)]/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-sm text-[var(--text-secondary)]">{message}</p>
      </div>
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-sm text-[var(--text-secondary)]">Loading...</p>
      </div>
    </div>
  );
}

// Alias for backward compatibility
export const LoadingPage = PageLoading;

export default Spinner;
