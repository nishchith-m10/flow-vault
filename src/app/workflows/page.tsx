'use client';

import { useCredentials } from '@/components/DashboardLayout';
import { useEffect, useState, useCallback } from 'react';
import { addToTrash } from '@/lib/trash';
import { isWorkflowArchived, archiveWorkflow } from '@/lib/archived';
import { useModal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import {
  Play,
  Pause,
  Archive,
  Trash2,
  Download,
  Upload,
  Sparkles,
  Search,
  FolderOpen,
  Unplug,
  Circle,
  CheckCircle2,
  RefreshCw,
  MoreHorizontal,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { LoadingPage } from '@/components/ui/Spinner';
import { Pagination } from '@/components/ui/Pagination';
import { FloatingActionBar, type FloatingAction } from '@/components/ui/FloatingActionBar';

interface Workflow {
  id: string;
  name: string;
  active: boolean;
  isArchived: boolean;
  updatedAt: string;
  tags?: { id: string; name: string }[];
  [key: string]: unknown;
}

export default function WorkflowsPage() {
  const { n8nUrl, apiKey, isConfigured } = useCredentials();
  const { showModal } = useModal();
  const toast = useToast();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchWorkflows = useCallback(async () => {
    if (!isConfigured) return;
    setLoading(true);
    try {
      const response = await fetch('/api/n8n', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'listWorkflows', n8nUrl, apiKey }),
      });
      const data = await response.json();
      
      const activeWorkflows = (data.data || []).filter((w: Workflow) => !isWorkflowArchived(w));
      setWorkflows(activeWorkflows);
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
      toast.error('Failed to fetch workflows', 'Please check your connection');
    }
    setLoading(false);
  }, [isConfigured, n8nUrl, apiKey, toast]);

  useEffect(() => {
    queueMicrotask(() => {
      fetchWorkflows();
    });
  }, [fetchWorkflows]);

  const filteredWorkflows = workflows.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase())
  );

  // Handle "All" option (pageSize = -1)
  const effectivePageSize = pageSize === -1 ? filteredWorkflows.length : pageSize;
  const totalPages = effectivePageSize > 0 ? Math.ceil(filteredWorkflows.length / effectivePageSize) : 1;
  const paginatedWorkflows = pageSize === -1 
    ? filteredWorkflows 
    : filteredWorkflows.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
      );

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === paginatedWorkflows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedWorkflows.map((w) => w.id)));
    }
  };

  const bulkAction = async (action: 'activate' | 'deactivate' | 'delete' | 'archive') => {
    if (selectedIds.size === 0) return;

    if (action === 'archive') {
      setActionLoading(true);
      let successCount = 0;
      for (const id of selectedIds) {
        try {
          await archiveWorkflow(n8nUrl, apiKey, id);
          successCount++;
        } catch (error) {
          console.error(`Failed to archive workflow ${id}:`, error);
        }
      }
      toast.success('Archived successfully', `${successCount} workflow(s) moved to archive`);
      setSelectedIds(new Set());
      await fetchWorkflows();
      setActionLoading(false);
      return;
    }

    if (action === 'delete') {
      showModal({
        title: 'Move to Trash?',
        message: `${selectedIds.size} workflow(s) will be moved to trash. You can restore them later from the Trash page.`,
        icon: Trash2,
        variant: 'danger',
        confirmLabel: 'Move to Trash',
        onConfirm: async () => {
          setActionLoading(true);

          const toDelete = workflows.filter((w) => selectedIds.has(w.id));
          for (const wf of toDelete) {
            addToTrash(wf);
          }

          let successCount = 0;
          for (const id of selectedIds) {
            try {
              await fetch('/api/n8n', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'deleteWorkflow', n8nUrl, apiKey, workflowId: id }),
              });
              successCount++;
            } catch (error) {
              console.error(`Failed to delete workflow ${id}:`, error);
            }
          }

          toast.success('Moved to trash', `${successCount} workflow(s) moved to trash`);
          setSelectedIds(new Set());
          await fetchWorkflows();
          setActionLoading(false);
        },
      });
      return;
    }

    setActionLoading(true);
    let successCount = 0;
    for (const id of selectedIds) {
      try {
        await fetch('/api/n8n', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: action === 'activate' ? 'activateWorkflow' : 'deactivateWorkflow',
            n8nUrl,
            apiKey,
            workflowId: id,
          }),
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to ${action} workflow ${id}:`, error);
      }
    }
    toast.success(
      action === 'activate' ? 'Activated' : 'Deactivated',
      `${successCount} workflow(s) ${action}d successfully`
    );
    setSelectedIds(new Set());
    await fetchWorkflows();
    setActionLoading(false);
  };

  const exportSelected = () => {
    const selectedWorkflows = workflows.filter((w) => selectedIds.has(w.id));
    const dataStr = JSON.stringify(selectedWorkflows, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflows-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported', `${selectedWorkflows.length} workflow(s) exported`);
  };

  // Keyboard shortcuts for Select All
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && filteredWorkflows.length > 0) {
        e.preventDefault();
        if (selectedIds.size === filteredWorkflows.length) {
          setSelectedIds(new Set());
        } else {
          setSelectedIds(new Set(filteredWorkflows.map((w) => w.id)));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredWorkflows, selectedIds]);

  // Floating action bar actions
  const floatingActions: FloatingAction[] = [
    {
      id: 'activate',
      label: 'Activate',
      icon: Play,
      variant: 'success',
      onClick: () => bulkAction('activate'),
    },
    {
      id: 'deactivate',
      label: 'Deactivate',
      icon: Pause,
      variant: 'secondary',
      onClick: () => bulkAction('deactivate'),
    },
    {
      id: 'archive',
      label: 'Archive',
      icon: Archive,
      variant: 'secondary',
      shortcut: 'a',
      onClick: () => bulkAction('archive'),
    },
    {
      id: 'export',
      label: 'Export',
      icon: Download,
      variant: 'secondary',
      shortcut: 'e',
      onClick: exportSelected,
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      variant: 'danger',
      onClick: () => bulkAction('delete'),
    },
  ];

  if (!isConfigured) {
    return (
      <EmptyState
        icon={Unplug}
        title="Connect to n8n"
        description="Click the connection status button in the sidebar to add your credentials."
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--accent-muted)] rounded-lg">
            <FolderOpen className="w-6 h-6 text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Active Workflows</h1>
            <p className="text-sm text-[var(--text-tertiary)]">Workflows not marked as archived in n8n</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={fetchWorkflows} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="primary" leftIcon={<Upload className="w-4 h-4" />}>
            <a href="/workflows/import">Import</a>
          </Button>
          <Button variant="secondary" leftIcon={<Sparkles className="w-4 h-4" />}>
            <a href="/workflows/create">Create</a>
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card padding="md">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-[var(--text-tertiary)] pointer-events-none" />
          <input
            type="text"
            placeholder="Search workflows..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="input w-full"
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
      </Card>

      {/* Workflow List */}
      {loading ? (
        <LoadingPage />
      ) : filteredWorkflows.length === 0 ? (
        <Card>
          <EmptyState
            icon={FolderOpen}
            title="No workflows found"
            description={search ? 'Try a different search term' : 'Create or import workflows to get started'}
            action={{
              label: 'Import Workflows',
              onClick: () => window.location.href = '/workflows/import',
            }}
          />
        </Card>
      ) : (
        <>
          <Card padding="none">
            {/* Grid Header */}
            <div className="grid grid-cols-[40px_1fr_100px_120px] gap-4 px-4 py-3 border-b border-[var(--border-primary)] text-sm text-[var(--text-tertiary)] font-medium bg-[var(--bg-subtle)]">
              <div>
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={selectedIds.size === paginatedWorkflows.length && paginatedWorkflows.length > 0}
                  onChange={selectAll}
                />
              </div>
              <div>Name</div>
              <div>Status</div>
              <div>Updated</div>
            </div>

            {/* Grid Body */}
            {paginatedWorkflows.map((workflow) => (
              <div
                key={workflow.id}
                className={`grid grid-cols-[40px_1fr_100px_120px] gap-4 px-4 py-3 border-b border-[var(--border-default)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer ${
                  selectedIds.has(workflow.id) ? 'bg-[var(--accent-indigo-muted)]' : ''
                }`}
                onClick={(e) => {
                  if ((e.target as HTMLElement).tagName !== 'INPUT') {
                    toggleSelect(workflow.id);
                  }
                }}
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={selectedIds.has(workflow.id)}
                    onChange={() => toggleSelect(workflow.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-(--text-primary) truncate">{workflow.name}</span>
                  {workflow.tags && workflow.tags.length > 0 && (
                    <div className="flex gap-1 shrink-0">
                      {workflow.tags.slice(0, 2).map((t) => (
                        <Badge key={t.id} variant="neutral">
                          {t.name}
                        </Badge>
                      ))}
                      {workflow.tags.length > 2 && (
                        <Badge variant="neutral">+{workflow.tags.length - 2}</Badge>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center">
                  {workflow.active ? (
                    <Badge variant="success" dot>Active</Badge>
                  ) : (
                    <Badge variant="neutral" dot>Inactive</Badge>
                  )}
                </div>
                <div className="flex items-center text-sm text-(--text-tertiary)">
                  {new Date(workflow.updatedAt).toLocaleDateString()}
                </div>
              </div>
            ))}

            {/* Pagination */}
            {(totalPages > 1 || pageSize === -1 || filteredWorkflows.length > 10) && (
              <div className="border-t border-(--border-primary)">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredWorkflows.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setCurrentPage(1);
                  }}
                  showPageSizeSelector
                />
              </div>
            )}
          </Card>
        </>
      )}

      {/* Floating Action Bar */}
      <FloatingActionBar
        selectedCount={selectedIds.size}
        actions={floatingActions}
        onClearSelection={() => setSelectedIds(new Set())}
        loading={actionLoading}
        itemLabel="workflow"
      />
    </div>
  );
}
