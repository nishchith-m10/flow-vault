'use client';

import { useCredentials } from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import {
  FolderOpen,
  Zap,
  Play,
  TrendingUp,
  Upload,
  Sparkles,
  Settings,
  Link,
  CheckCircle2,
  Unplug,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { SkeletonStats } from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';

interface Stats {
  workflowCount: number;
  activeWorkflows: number;
  executionCount: number;
  successRate: number;
}

interface StatCardProps {
  icon: React.ElementType;
  value: number | string;
  label: string;
  color: string;
  bgColor: string;
}

function StatCard({ icon: Icon, value, label, color, bgColor }: StatCardProps) {
  return (
    <Card hover className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bgColor}`}>
            <Icon className={`w-6 h-6 ${color}`} />
          </div>
          <div>
            <div className={`text-3xl font-bold ${color}`}>{value}</div>
            <div className="text-sm text-[var(--text-muted)]">{label}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface QuickActionProps {
  href: string;
  icon: React.ElementType;
  label: string;
}

function QuickAction({ href, icon: Icon, label }: QuickActionProps) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-primary)] rounded-lg hover:bg-[var(--bg-secondary)] border border-transparent hover:border-[var(--border-primary)] transition-all duration-200 group"
    >
      <div className="w-10 h-10 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
        <Icon className="w-5 h-5 text-[var(--accent)] transition-colors" />
      </div>
      <span className="font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">{label}</span>
    </a>
  );
}

export default function DashboardPage() {
  const { n8nUrl, apiKey, isConfigured } = useCredentials();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isConfigured) return;

    const fetchStats = async () => {
      setLoading(true);
      try {
        // Fetch workflows
        const wfResponse = await fetch('/api/n8n', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'listWorkflows', n8nUrl, apiKey }),
        });
        const wfData = await wfResponse.json();

        // Fetch executions
        const exResponse = await fetch('/api/n8n', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'listExecutions', n8nUrl, apiKey, limit: 100 }),
        });
        const exData = await exResponse.json();

        const workflows = wfData.data || [];
        const executions = exData.data || [];
        const successfulExecs = executions.filter((e: { status: string }) => e.status === 'success').length;

        setStats({
          workflowCount: workflows.length,
          activeWorkflows: workflows.filter((w: { active: boolean }) => w.active).length,
          executionCount: executions.length,
          successRate: executions.length > 0 ? Math.round((successfulExecs / executions.length) * 100) : 0,
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
      setLoading(false);
    };

    fetchStats();
  }, [isConfigured, n8nUrl, apiKey]);

  if (!isConfigured) {
    return (
      <EmptyState
        icon={Unplug}
        title="Connect to n8n"
        description="Click the connection status button in the sidebar to add your n8n instance URL and API key."
      />
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Dashboard</h1>
        <p className="text-[var(--text-muted)] mt-1">Overview of your n8n instance</p>
      </div>

      {loading ? (
        <SkeletonStats />
      ) : stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={FolderOpen}
            value={stats.workflowCount}
            label="Total Workflows"
            color="text-[var(--accent)]"
            bgColor="bg-[var(--accent-muted)]"
          />
          <StatCard
            icon={Play}
            value={stats.activeWorkflows}
            label="Active Workflows"
            color="text-[var(--success)]"
            bgColor="bg-[var(--success-muted)]"
          />
          <StatCard
            icon={Zap}
            value={stats.executionCount}
            label="Recent Executions"
            color="text-[var(--accent)]"
            bgColor="bg-[var(--accent-muted)]"
          />
          <StatCard
            icon={TrendingUp}
            value={`${stats.successRate}%`}
            label="Success Rate"
            color="text-[var(--success)]"
            bgColor="bg-[var(--success-muted)]"
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <QuickAction href="/workflows/import" icon={Upload} label="Import Workflows" />
            <QuickAction href="/workflows/create" icon={Sparkles} label="Create Workflows" />
            <QuickAction href="/workflows" icon={FolderOpen} label="Manage Workflows" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connection Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-[var(--border-primary)]">
              <div className="flex items-center gap-3 text-[var(--text-muted)]">
                <Link className="w-4 h-4" />
                <span className="shrink-0">Instance</span>
              </div>
              <span className="font-mono text-xs text-[var(--text-primary)] truncate ml-2" style={{ maxWidth: '60%' }} title={n8nUrl}>
                {n8nUrl}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3 text-[var(--text-muted)]">
                <Settings className="w-4 h-4" />
                <span>Status</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--status-success)]">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">Connected</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
