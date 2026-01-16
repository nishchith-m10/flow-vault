/**
 * Backup Version Details and History Page
 * Shows version timeline, comparison, and restore options
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import { DialogModal } from '@/components/Modal';

interface Backup {
  id: string;
  workflow_id: string;
  workflow_name: string;
  version: number;
  backup_type: string;
  tags: string[];
  created_at: string;
  is_active: boolean;
  checksum: string;
  size_bytes: number;
}

type ConflictStrategy = 'skip' | 'overwrite' | 'create-new';

export default function BackupVersionPage() {
  const params = useParams();
  const router = useRouter();
  const backupId = params.id as string;

  const [backup, setBackup] = useState<Backup | null>(null);
  const [allVersions, setAllVersions] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [conflictStrategy, setConflictStrategy] = useState<ConflictStrategy>('create-new');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchBackupDetails = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch the specific backup
      const response = await fetch(`/api/backups/${backupId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch backup details');
      }

      const result = await response.json();
      const currentBackup = result.data;
      setBackup(currentBackup);

      // Fetch all versions for this workflow
      const historyResponse = await fetch('/api/backups/history');
      if (historyResponse.ok) {
        const historyResult = await historyResponse.json();
        const versions = (historyResult.data || []).filter(
          (b: Backup) => b.workflow_id === currentBackup.workflow_id
        );
        setAllVersions(versions);
      }
    } catch (error) {
      console.error('Failed to load backup:', error);
      setToast({ message: 'Failed to load backup details', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [backupId]);

  async function handleRestore() {
    if (!backup) return;

    setRestoring(true);
    try {
      const response = await fetch(`/api/backups/${backupId}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          handleConflict: conflictStrategy,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Restore failed');
      }

      setToast({
        message: `Workflow ${result.action} successfully! ID: ${result.workflowId}`,
        type: 'success',
      });

      setShowRestoreModal(false);
    } catch (error) {
      console.error('Restore failed:', error);
      setToast({
        message: error instanceof Error ? error.message : 'Restore failed',
        type: 'error',
      });
    } finally {
      setRestoring(false);
    }
  }

  async function handleExport() {
    if (!backup) return;

    setExporting(true);
    try {
      const response = await fetch(`/api/backups/${backupId}/export`);

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Export failed');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `backup_${backupId}.json`;
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setToast({
        message: 'Workflow exported successfully',
        type: 'success',
      });
    } catch (error) {
      console.error('Export failed:', error);
      setToast({
        message: error instanceof Error ? error.message : 'Export failed',
        type: 'error',
      });
    } finally {
      setExporting(false);
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  // Load backup details on mount
  useEffect(() => {
    fetchBackupDetails();
  }, [fetchBackupDetails]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!backup) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
            Backup Not Found
          </h2>
          <Button onClick={() => router.push('/backups')}>
            Back to Backups
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            toast.type === 'success'
              ? 'bg-[var(--success)] text-white'
              : 'bg-[var(--error)] text-white'
          }`}
        >
          {toast.message}
          <button
            onClick={() => setToast(null)}
            className="ml-4 text-white hover:opacity-80 transition-opacity"
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/backups')}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 mb-4 inline-flex items-center"
        >
          ← Back to Backups
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">
              {backup.workflow_name}
            </h1>
            <p className="text-[var(--text-tertiary)] mt-2">
              Version {backup.version} • {formatDate(backup.created_at)}
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={handleExport}
              disabled={exporting}
              variant="secondary"
            >
              {exporting ? 'Exporting...' : 'Export JSON'}
            </Button>
            <Button
              onClick={() => setShowRestoreModal(true)}
              disabled={restoring}
            >
              Restore Workflow
            </Button>
          </div>
        </div>
      </div>

      {/* Backup Details */}
      <Card className="mb-6 p-6">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
          Backup Details
        </h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-[var(--text-tertiary)]">Backup ID</p>
            <p className="font-mono text-sm text-[var(--text-primary)]">{backup.id}</p>
          </div>
          
          <div>
            <p className="text-sm text-[var(--text-tertiary)]">Workflow ID</p>
            <p className="font-mono text-sm text-[var(--text-primary)]">{backup.workflow_id}</p>
          </div>
          
          <div>
            <p className="text-sm text-[var(--text-tertiary)]">Backup Type</p>
            <Badge variant={backup.backup_type === 'scheduled' ? 'neutral' : 'info'}>
              {backup.backup_type}
            </Badge>
          </div>
          
          <div>
            <p className="text-sm text-[var(--text-tertiary)]">Status</p>
            <Badge variant={backup.is_active ? 'success' : 'neutral'}>
              {backup.is_active ? 'Active' : 'Archived'}
            </Badge>
          </div>
          
          <div>
            <p className="text-sm text-[var(--text-tertiary)]">Size</p>
            <p className="text-sm text-[var(--text-primary)]">{formatBytes(backup.size_bytes)}</p>
          </div>
          
          <div>
            <p className="text-sm text-[var(--text-tertiary)]">Checksum</p>
            <p className="font-mono text-xs text-[var(--text-primary)]">{backup.checksum.substring(0, 16)}...</p>
          </div>
        </div>

        {backup.tags && backup.tags.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-[var(--text-tertiary)] mb-2">Tags</p>
            <div className="flex flex-wrap gap-2">
              {backup.tags.map((tag, idx) => (
                <Badge key={idx} variant="neutral">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Version History */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
          Version History ({allVersions.length} versions)
        </h2>

        <div className="space-y-3">
          {allVersions.map((version) => (
            <div
              key={version.id}
              className={`p-4 rounded-lg border ${
                version.id === backupId
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-[var(--border-default)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">
                      Version {version.version}
                      {version.id === backupId && (
                        <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">
                          (Current)
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-[var(--text-tertiary)]">
                      {formatDate(version.created_at)}
                    </p>
                  </div>
                  
                  <Badge variant={version.backup_type === 'scheduled' ? 'neutral' : 'info'}>
                    {version.backup_type}
                  </Badge>
                  
                  {version.is_active && (
                    <Badge variant="success">Active</Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-[var(--text-tertiary)]">
                    {formatBytes(version.size_bytes)}
                  </span>
                  
                  {version.id !== backupId && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => router.push(`/backups/${version.id}`)}
                    >
                      View
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Restore Modal */}
      {showRestoreModal && (
        <DialogModal isOpen={showRestoreModal} onClose={() => setShowRestoreModal(false)} title="Restore Workflow">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
              Restore Workflow
            </h2>

            <p className="text-[var(--text-tertiary)] mb-6">
              Restore &ldquo;{backup.workflow_name}&rdquo; version {backup.version} to your n8n instance.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                If workflow already exists:
              </label>
              
              <div className="space-y-2">
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-[var(--bg-hover)]">
                  <input
                    type="radio"
                    name="conflict"
                    value="create-new"
                    checked={conflictStrategy === 'create-new'}
                    onChange={(e) => setConflictStrategy(e.target.value as ConflictStrategy)}
                    className="mr-3"
                  />
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">Create new workflow</p>
                    <p className="text-sm text-[var(--text-tertiary)]">
                      Create as a new workflow with a new ID
                    </p>
                  </div>
                </label>

                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-[var(--bg-hover)]">
                  <input
                    type="radio"
                    name="conflict"
                    value="overwrite"
                    checked={conflictStrategy === 'overwrite'}
                    onChange={(e) => setConflictStrategy(e.target.value as ConflictStrategy)}
                    className="mr-3"
                  />
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">Overwrite existing</p>
                    <p className="text-sm text-[var(--text-tertiary)]">
                      Replace the existing workflow with this version
                    </p>
                  </div>
                </label>

                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-[var(--bg-hover)]">
                  <input
                    type="radio"
                    name="conflict"
                    value="skip"
                    checked={conflictStrategy === 'skip'}
                    onChange={(e) => setConflictStrategy(e.target.value as ConflictStrategy)}
                    className="mr-3"
                  />
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">Skip if exists</p>
                    <p className="text-sm text-[var(--text-tertiary)]">
                      Don&apos;t restore if workflow already exists
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowRestoreModal(false)}
                disabled={restoring}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRestore}
                disabled={restoring}
              >
                {restoring ? 'Restoring...' : 'Restore Workflow'}
              </Button>
            </div>
          </div>
        </DialogModal>
      )}
    </div>
  );
}
