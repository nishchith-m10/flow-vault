'use client';

import { useCredentials } from '@/components/DashboardLayout';
import { useEffect, useState, useCallback } from 'react';
import { isWorkflowArchived, unarchiveWorkflow } from '@/lib/archived';
import { addToTrash } from '@/lib/trash';
import { useModal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { Button, Badge, Card, EmptyState, Pagination, FloatingActionBar, type FloatingAction } from '@/components/ui';
import { Archive, RotateCcw, Trash2, Unplug, Search, RefreshCw, Loader2 } from 'lucide-react';

interface Workflow {
  id: string;
  name: string;
  active: boolean;
  isArchived: boolean;
  updatedAt: string;
  tags?: { id: string; name: string }[];
  [key: string]: unknown;
}

export default function ArchivedWorkflowsPage() {
  const { n8nUrl, apiKey, isConfigured } = useCredentials();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { openModal, closeModal } = useModal();
  const toast = useToast();

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
      
      const archivedWorkflows = (data.data || []).filter((w: Workflow) => isWorkflowArchived(w));
      setWorkflows(archivedWorkflows);
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
      toast.error('Failed to fetch workflows');
    }
    setLoading(false);
  }, [isConfigured, n8nUrl, apiKey, toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchWorkflows();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchWorkflows]);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredWorkflows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredWorkflows.map((w) => w.id)));
    }
  };

  const bulkRestore = async () => {
    if (selectedIds.size === 0) return;
    setActionLoading(true);
    
    let restored = 0;
    for (const id of selectedIds) {
      try {
        await unarchiveWorkflow(n8nUrl, apiKey, id);
        restored++;
      } catch (error) {
        console.error(`Failed to restore workflow ${id}:`, error);
      }
    }
    
    toast.success(`Restored ${restored} workflow(s)`);
    setSelectedIds(new Set());
    await fetchWorkflows();
    setActionLoading(false);
  };

  const bulkMoveToTrash = async () => {
    if (selectedIds.size === 0) return;

    openModal({
      title: 'Move to Trash?',
      message: `${selectedIds.size} workflow(s) will be moved to trash and deleted from n8n. You can restore them later from trash.`,
      variant: 'danger',
      icon: Trash2,
      confirmText: 'Move to Trash',
      onConfirm: async () => {
        closeModal();
        setActionLoading(true);

        const toDelete = workflows.filter((w) => selectedIds.has(w.id));
        for (const wf of toDelete) {
          addToTrash(wf);
        }

        let deleted = 0;
        for (const id of selectedIds) {
          try {
            await fetch('/api/n8n', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'deleteWorkflow', n8nUrl, apiKey, workflowId: id }),
            });
            deleted++;
          } catch (error) {
            console.error(`Failed to delete workflow ${id}:`, error);
          }
        }

        toast.success(`Moved ${deleted} workflow(s) to trash`);
        setSelectedIds(new Set());
        await fetchWorkflows();
        setActionLoading(false);
      },
    });
  };

  // Filter and paginate
  const filteredWorkflows = workflows.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filteredWorkflows.length / pageSize);
  const paginatedWorkflows = filteredWorkflows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

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
      id: 'restore',
      label: 'Restore',
      icon: RotateCcw,
      variant: 'success',
      shortcut: 'r',
      onClick: bulkRestore,
    },
    {
      id: 'delete',
      label: 'Move to Trash',
      icon: Trash2,
      variant: 'danger',
      onClick: bulkMoveToTrash,
    },
  ];

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
    <div className="space-y-6 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--warning-muted)] rounded-lg">
            <Archive className="w-6 h-6 text-[var(--warning)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Archived Workflows</h1>
            <p className="text-sm text-[var(--text-tertiary)]">Workflows marked as archived in n8n</p>
          </div>
        </div>
        <Button variant="ghost" onClick={fetchWorkflows} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Search */}
      <Card padding="md">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-[var(--text-tertiary)] pointer-events-none" />
          <input
            type="text"
            placeholder="Search archived workflows..."
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
      <Card padding="none">
          {/* Table Header */}
          <div className="grid grid-cols-[40px_1fr_100px_120px] gap-4 px-4 py-3 border-b border-[var(--border-primary)] text-sm text-[var(--text-tertiary)] font-medium bg-[var(--bg-subtle)]">
            <div>
              <input
                type="checkbox"
                checked={selectedIds.size === paginatedWorkflows.length && paginatedWorkflows.length > 0}
                onChange={selectAll}
                className="checkbox"
              />
            </div>
            <div>Name</div>
            <div>Status</div>
            <div>Updated</div>
          </div>

          {/* Table Body */}
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--accent)]" />
              <p className="mt-2 text-sm text-[var(--text-tertiary)]">Loading workflows...</p>
            </div>
          ) : filteredWorkflows.length === 0 ? (
            <div className="p-12">
              <EmptyState
                icon={Archive}
                title="No archived workflows"
                description="Workflows with the archived tag will appear here"
              />
            </div>
          ) : (
            paginatedWorkflows.map((workflow) => (
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
                    checked={selectedIds.has(workflow.id)}
                    onChange={() => toggleSelect(workflow.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="checkbox"
                  />
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium truncate">{workflow.name}</span>
                  {workflow.tags && workflow.tags.length > 0 && (
                    <div className="flex gap-1 flex-shrink-0">
                      {workflow.tags.slice(0, 2).map((t) => (
                        <Badge key={t.id} variant="neutral">{t.name}</Badge>
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
                <div className="flex items-center text-sm text-[var(--text-tertiary)]">
                  {new Date(workflow.updatedAt).toLocaleDateString()}
                </div>
              </div>
            ))
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-[var(--border-primary)]">
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

// Add keyboard navigation improvements
