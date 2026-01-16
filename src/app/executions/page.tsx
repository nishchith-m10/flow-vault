'use client';

import { useCredentials } from '@/components/DashboardLayout';
import { useState, useEffect, useCallback } from 'react';
import { Button, Badge, Card, CardContent, EmptyState } from '@/components/ui';
import { Zap, CheckCircle2, XCircle, Clock, RefreshCw, Unplug, Loader2, Trash2, Filter } from 'lucide-react';
import { useModal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { SkeletonCard } from '@/components/ui/Skeleton';

interface Execution {
  id: string;
  workflowId: string;
  finished: boolean;
  mode: string;
  startedAt: string;
  stoppedAt?: string;
  status: 'success' | 'error' | 'running' | 'waiting';
  workflowData?: { name?: string };
}

export default function ExecutionsPage() {
  const { isConfigured } = useCredentials();
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'success' | 'error' | 'running'>('all');
  const { openModal, closeModal } = useModal();
  const toast = useToast();

  const fetchExecutions = useCallback(async () => {
    if (!isConfigured) return;
    setLoading(true);
    try {
      const response = await fetch('/api/n8n', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'listExecutions' }),
      });
      const data = await response.json();
      setExecutions(data.data || []);
    } catch (error) {
      console.error('Failed to fetch executions:', error);
      toast.error('Failed to fetch executions');
    }
    setLoading(false);
  }, [isConfigured, toast]);

  useEffect(() => {
    queueMicrotask(() => {
      fetchExecutions();
    });
  }, [fetchExecutions]);

  const deleteExecution = (id: string) => {
    openModal({
      title: 'Delete Execution?',
      message: 'This execution record will be permanently deleted.',
      variant: 'danger',
      icon: Trash2,
      confirmText: 'Delete',
      onConfirm: async () => {
        closeModal();
        try {
          await fetch('/api/n8n', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'deleteExecution', executionId: id }),
          });
          setExecutions((prev) => prev.filter((e) => e.id !== id));
          toast.success('Execution deleted');
        } catch (error) {
          console.error('Failed to delete execution:', error);
          toast.error('Failed to delete execution');
        }
      },
    });
  };

  const filteredExecutions = executions.filter((e) => {
    if (filter === 'all') return true;
    return e.status === filter;
  });

  const getStatusBadge = (status: Execution['status']) => {
    switch (status) {
      case 'success':
        return (
          <Badge variant="success" icon={<CheckCircle2 className="w-3 h-3" />}>
            Success
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="error" icon={<XCircle className="w-3 h-3" />}>
            Error
          </Badge>
        );
      case 'running':
        return (
          <Badge variant="info" icon={<RefreshCw className="w-3 h-3 animate-spin" />}>
            Running
          </Badge>
        );
      case 'waiting':
        return (
          <Badge variant="warning" icon={<Clock className="w-3 h-3" />}>
            Waiting
          </Badge>
        );
      default:
        return <Badge variant="neutral">Unknown</Badge>;
    }
  };

  if (!isConfigured) {
    return (
      <EmptyState
        icon={Unplug}
        title="Connect to n8n"
        description="Click the connection status button in the sidebar to configure your n8n instance."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--accent-muted)] rounded-lg">
            <Zap className="w-6 h-6 text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Executions</h1>
            <p className="text-sm text-[var(--text-tertiary)]">Workflow execution history</p>
          </div>
        </div>
        <Button variant="ghost" onClick={fetchExecutions} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--text-tertiary)]" />
            <span className="text-sm text-[var(--text-tertiary)] mr-2">Filter:</span>
            {(['all', 'success', 'error', 'running'] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Executions List */}
      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filteredExecutions.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <EmptyState
              icon={Zap}
              title="No executions"
              description={filter === 'all' ? 'No workflow executions found' : `No ${filter} executions found`}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredExecutions.map((execution) => (
            <Card key={execution.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {getStatusBadge(execution.status)}
                    <div>
                      <div className="font-medium">
                        {execution.workflowData?.name || `Workflow ${execution.workflowId}`}
                      </div>
                      <div className="text-sm text-[var(--text-tertiary)]">
                        {new Date(execution.startedAt).toLocaleString()}
                        {execution.stoppedAt && (
                          <span className="ml-2">
                            ({Math.round((new Date(execution.stoppedAt).getTime() - new Date(execution.startedAt).getTime()) / 1000)}s)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-tertiary)] font-mono">#{execution.id}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteExecution(execution.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="text-sm text-[var(--text-tertiary)]">
        {filteredExecutions.length} execution(s)
      </div>
    </div>
  );
}
