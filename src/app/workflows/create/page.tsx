'use client';

import { useCredentials } from '@/components/DashboardLayout';
import { useState, useCallback } from 'react';
import { Button, Card, EmptyState } from '@/components/ui';
import { Sparkles, Unplug, Loader2, CheckCircle2, XCircle, Tag } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { motion, AnimatePresence } from 'framer-motion';

interface LogEntry {
  message: string;
  type: 'info' | 'success' | 'error';
}

export default function CreatePage() {
  const { n8nUrl, apiKey, isConfigured } = useCredentials();
  const [workflowNames, setWorkflowNames] = useState('');
  const [tagName, setTagName] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const toast = useToast();

  const log = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs((prev) => [...prev, { message, type }]);
  }, []);

  const names = workflowNames.split('\n').map((n) => n.trim()).filter((n) => n.length > 0);

  const create = async () => {
    if (!isConfigured || names.length === 0) return;

    setIsCreating(true);
    setLogs([]);
    setSuccessCount(0);
    setErrorCount(0);

    let success = 0;
    let errors = 0;
    const createdIds: string[] = [];

    log(`Creating ${names.length} workflow(s)...`, 'info');

    for (const name of names) {
      try {
        log(`Creating "${name}"...`);
        const emptyWorkflow = {
          name,
          nodes: [],
          connections: {},
          settings: { executionOrder: 'v1' },
          staticData: null,
        };
        const response = await fetch('/api/n8n', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'import', n8nUrl, apiKey, workflow: emptyWorkflow }),
        });
        const result = await response.json();
        if (result.id) {
          log(`✓ "${name}" created`, 'success');
          createdIds.push(result.id);
          success++;
        } else {
          log(`✗ "${name}": ${result.message || 'Unknown error'}`, 'error');
          errors++;
        }
      } catch (err) {
        log(`✗ "${name}": ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
        errors++;
      }
      setSuccessCount(success);
      setErrorCount(errors);
    }

    if (tagName && createdIds.length > 0) {
      log(`Creating tag "${tagName}"...`, 'info');
      try {
        const tagResponse = await fetch('/api/n8n', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'createTag', n8nUrl, apiKey, tagName }),
        });
        const tagResult = await tagResponse.json();
        if (tagResult.id) {
          for (const wfId of createdIds) {
            await fetch('/api/n8n', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'tagWorkflow', n8nUrl, apiKey, workflowId: wfId, tagId: tagResult.id }),
            });
          }
          log(`Tagged ${createdIds.length} workflow(s)`, 'success');
        }
      } catch { log(`Failed to create tag`, 'error'); }
    }

    log(`Done! ${success} created, ${errors} failed`, success > 0 ? 'success' : 'error');
    setIsCreating(false);
    
    if (success > 0) {
      toast.success(`Created ${success} workflow(s)`);
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[var(--accent-muted)] rounded-lg">
          <Sparkles className="w-6 h-6 text-[var(--accent)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Create Workflows</h1>
          <p className="text-sm text-[var(--text-tertiary)]">Batch create empty workflows in n8n</p>
        </div>
      </div>

      {/* Names Input */}
      <Card padding="md">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-[var(--text-tertiary)]" />
          <span className="font-medium">Workflow Names</span>
        </div>
        <textarea
          value={workflowNames}
          onChange={(e) => setWorkflowNames(e.target.value)}
          placeholder={`My First Workflow\nMy Second Workflow\nAnother Workflow`}
          rows={8}
          className="input w-full font-mono text-sm resize-none"
        />
        <p className="text-sm text-[var(--text-tertiary)] mt-2">
          One workflow name per line — <span className="text-[var(--accent)] font-medium">{names.length}</span> workflow(s)
        </p>
      </Card>

      {/* Tag */}
      <Card padding="md">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-4 h-4 text-[var(--text-tertiary)]" />
          <span className="font-medium">Tag</span>
          <span className="text-xs text-[var(--text-tertiary)]">(optional)</span>
        </div>
        <input
          type="text"
          value={tagName}
          onChange={(e) => setTagName(e.target.value)}
          placeholder="My Project"
          className="input w-full"
        />
        <p className="text-xs text-[var(--text-tertiary)] mt-2">
          All created workflows will be tagged with this name
        </p>
      </Card>

      {/* Create Button */}
      <Button
        variant="primary"
        className="w-full py-4 text-lg"
        onClick={create}
        disabled={!isConfigured || names.length === 0 || isCreating}
      >
        {isCreating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Creating...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 mr-2" />
            Create {names.length} Workflow(s)
          </>
        )}
      </Button>

      {/* Results */}
      <AnimatePresence>
        {logs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card padding="md">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-[var(--success-muted)] rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-[var(--success)]" />
                    <div className="text-3xl font-bold text-[var(--success)]">{successCount}</div>
                  </div>
                  <div className="text-xs uppercase text-[var(--text-tertiary)] mt-1">Created</div>
                </div>
                <div className="bg-[var(--error-muted)] rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <XCircle className="w-6 h-6 text-[var(--error)]" />
                    <div className="text-3xl font-bold text-[var(--error)]">{errorCount}</div>
                  </div>
                  <div className="text-xs uppercase text-[var(--text-tertiary)] mt-1">Failed</div>
                </div>
              </div>
              <div className="bg-[var(--bg-subtle)] rounded-lg p-4 max-h-64 overflow-y-auto font-mono text-sm space-y-1">
                {logs.map((entry, idx) => (
                  <div key={idx} className={entry.type === 'success' ? 'text-[var(--success)]' : entry.type === 'error' ? 'text-[var(--error)]' : 'text-[var(--info)]'}>
                    {entry.message}
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
