/**
 * Backup History Page
 * Shows all backups with filtering and manual trigger
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import Pagination from '@/components/ui/Pagination';

interface Backup {
  id: string;
  workflow_id: string;
  workflow_name: string;
  version: number;
  backup_type: string;
  tags: string[];
  created_at: string;
  is_active: boolean;
}

export default function BackupsPage() {
  const router = useRouter();
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    fetchBackups();
  }, []);

  async function fetchBackups() {
    try {
      const response = await fetch('/api/backups/history');
      
      if (!response.ok) {
        throw new Error('Failed to fetch backups');
      }

      const result = await response.json();
      setBackups(result.data || []);
    } catch (error) {
      console.error('Failed to load backups:', error);
      setToast({ message: 'Failed to load backups', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function triggerManualBackup() {
    setTriggering(true);
    try {
      const response = await fetch('/api/backups/trigger', {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Backup failed');
      }

      setToast({
        message: `Backup completed! ${result.workflowsBackedUp} workflows backed up, ${result.workflowsSkipped} skipped`,
        type: 'success',
      });

      // Refresh backup list
      await fetchBackups();
    } catch (error) {
      console.error('Backup failed:', error);
      setToast({
        message: error instanceof Error ? error.message : 'Backup failed',
        type: 'error',
      });
    } finally {
      setTriggering(false);
    }
  }

  // Filter backups
  const filteredBackups = backups.filter(backup => {
    const matchesSearch = backup.workflow_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || backup.backup_type === selectedType;
    return matchesSearch && matchesType;
  });

  // Paginate
  const totalPages = Math.ceil(filteredBackups.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBackups = filteredBackups.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Backup History</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {backups.length} total backups
          </p>
        </div>
        <Button onClick={triggerManualBackup} disabled={triggering}>
          {triggering ? 'Running Backup...' : 'Run Manual Backup'}
        </Button>
      </div>

      {/* TODO: Add RateLimitStatus component back when available */}

      {/* Filters */}
      <Card className="mb-6">
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium mb-2">
                Search workflows
              </label>
              <input
                id="search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter by workflow name..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              />
            </div>
            <div>
              <label htmlFor="type" className="block text-sm font-medium mb-2">
                Backup type
              </label>
              <select
                id="type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              >
                <option value="all">All types</option>
                <option value="scheduled">Scheduled</option>
                <option value="manual">Manual</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Backup List */}
      {paginatedBackups.length === 0 ? (
        <Card>
          <div className="p-8 text-center text-gray-500">
            {backups.length === 0 ? 'No backups yet. Run a manual backup to get started!' : 'No backups match your filters'}
          </div>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {paginatedBackups.map((backup) => (
              <Card key={backup.id}>
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{backup.workflow_name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Version {backup.version} • {backup.backup_type}
                        {backup.is_active && (
                          <span className="ml-2 px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded">
                            Active
                          </span>
                        )}
                      </p>
                      {backup.tags.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {backup.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-xs rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-sm text-gray-500">
                        {new Date(backup.created_at).toLocaleString()}
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => router.push(`/backups/${backup.id}`)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredBackups.length}
                pageSize={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 p-4 rounded-md shadow-lg ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white`}
        >
          {toast.message}
          <button
            onClick={() => setToast(null)}
            className="ml-4 text-white hover:text-gray-200"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
