'use client';

import { useCredentials } from '@/components/DashboardLayout';
import { useState, useEffect } from 'react';
import { getTrash, removeFromTrash, clearTrash, TrashedWorkflow } from '@/lib/trash';
import { useModal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { Button, Card, CardContent, EmptyState } from '@/components/ui';
import { Trash2, RotateCcw, Download, RefreshCw, Unplug, Loader2, AlertTriangle } from 'lucide-react';

export default function TrashPage() {
  const { isConfigured } = useCredentials();
  const [trash, setTrash] = useState<TrashedWorkflow[]>([]);
  const [restoring, setRestoring] = useState<string | null>(null);
  const { openModal, closeModal } = useModal();
  const toast = useToast();

  useEffect(() => {
    queueMicrotask(() => {
      setTrash(getTrash());
    });
  }, []);

  const restore = async (workflow: TrashedWorkflow) => {
    if (!isConfigured) return;
    setRestoring(workflow.id);
    try {
      const response = await fetch('/api/n8n', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import', workflow: workflow.workflow }),
      });
      const result = await response.json();
      if (result.id) {
        removeFromTrash(workflow.id);
        setTrash(getTrash());
        toast.success(`Restored "${workflow.name}"`);
      } else {
        toast.error(`Failed to restore: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to restore:', error);
      toast.error('Failed to restore workflow');
    }
    setRestoring(null);
  };

  const deleteForever = (id: string) => {
    openModal({
      title: 'Delete Forever?',
      message: 'This will permanently delete the workflow from trash. This cannot be undone.',
      variant: 'danger',
      icon: Trash2,
      confirmText: 'Delete Forever',
      onConfirm: () => {
        removeFromTrash(id);
        setTrash(getTrash());
        closeModal();
        toast.success('Workflow permanently deleted');
      },
    });
  };

  const emptyTrash = () => {
    openModal({
      title: 'Empty Trash?',
      message: `This will permanently delete all ${trash.length} workflow(s) from trash. This cannot be undone.`,
      variant: 'danger',
      icon: AlertTriangle,
      confirmText: 'Empty Trash',
      onConfirm: () => {
        clearTrash();
        setTrash([]);
        closeModal();
        toast.success('Trash emptied');
      },
    });
  };

  const downloadBackup = (workflow: TrashedWorkflow) => {
    const blob = new Blob([JSON.stringify(workflow.workflow, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflow.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Workflow downloaded');
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
          <div className="p-2 bg-[var(--error-muted)] rounded-lg">
            <Trash2 className="w-6 h-6 text-[var(--error)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Trash</h1>
            <p className="text-sm text-[var(--text-tertiary)]">Deleted workflows backup (stored locally)</p>
          </div>
        </div>
        {trash.length > 0 && (
          <Button variant="danger" onClick={emptyTrash}>
            <Trash2 className="w-4 h-4 mr-2" />
            Empty Trash
          </Button>
        )}
      </div>

      {/* Trash List */}
      {trash.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <EmptyState
              icon={Trash2}
              title="Trash is empty"
              description="Deleted workflows will appear here for recovery"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {trash.map((workflow) => (
            <Card key={workflow.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{workflow.name}</div>
                    <div className="text-sm text-[var(--text-tertiary)]">
                      Deleted {new Date(workflow.deletedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadBackup(workflow)}
                      title="Download backup"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => restore(workflow)}
                      disabled={restoring === workflow.id}
                    >
                      {restoring === workflow.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : (
                        <RotateCcw className="w-4 h-4 mr-1" />
                      )}
                      Restore
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => deleteForever(workflow.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="text-sm text-[var(--text-tertiary)]">
        {trash.length} item(s) in trash
      </div>
    </div>
  );
}
