'use client';

import { useCredentials } from '@/components/DashboardLayout';
import { useState, useCallback } from 'react';
import JSZip from 'jszip';
import { Button, Card, CardContent, CardHeader, CardTitle, EmptyState, Badge } from '@/components/ui';
import { Upload, Unplug, Loader2, FileJson, X, CheckCircle2, XCircle, FolderOpen, Tag, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { motion, AnimatePresence } from 'framer-motion';

interface WorkflowFile {
  id: string;
  name: string;
  content: Record<string, unknown>;
  tags: string[];
}

interface LogEntry {
  message: string;
  type: 'info' | 'success' | 'error';
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export default function ImportPage() {
  const { n8nUrl, apiKey, isConfigured } = useCredentials();
  const [files, setFiles] = useState<WorkflowFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [globalTag, setGlobalTag] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState('');
  const toast = useToast();

  const log = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs((prev) => [...prev, { message, type }]);
  }, []);

  const handleFiles = useCallback(async (fileList: FileList) => {
    const newFiles: WorkflowFile[] = [];
    setIsExtracting(true);

    for (const file of Array.from(fileList)) {
      if (file.name.endsWith('.zip')) {
        try {
          const zip = await JSZip.loadAsync(file);
          const jsonFiles = Object.keys(zip.files).filter(
            (name) => name.endsWith('.json') && !name.startsWith('__MACOSX')
          );
          for (const jsonName of jsonFiles) {
            try {
              const content = await zip.files[jsonName].async('string');
              const parsed = JSON.parse(content);
              const baseName = jsonName.split('/').pop() || jsonName;
              newFiles.push({ id: generateId(), name: baseName, content: parsed, tags: [] });
            } catch { /* skip invalid */ }
          }
        } catch { /* skip invalid zip */ }
      } else if (file.name.endsWith('.json')) {
        try {
          const text = await file.text();
          const content = JSON.parse(text);
          newFiles.push({ id: generateId(), name: file.name, content, tags: [] });
        } catch { /* skip invalid */ }
      }
    }

    setFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const uniqueNew = newFiles.filter((f) => !existingNames.has(f.name));
      return [...prev, ...uniqueNew];
    });
    setIsExtracting(false);
    if (newFiles.length > 0) {
      toast.success(`Added ${newFiles.length} file(s)`);
    }
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const addTagToFile = (fileId: string, tag: string) => {
    if (!tag.trim()) return;
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId && !f.tags.includes(tag.trim())
          ? { ...f, tags: [...f.tags, tag.trim()] }
          : f
      )
    );
    setNewTagInput('');
  };

  const removeTagFromFile = (fileId: string, tag: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, tags: f.tags.filter((t) => t !== tag) } : f
      )
    );
  };

  const applyGlobalTagToAll = () => {
    if (!globalTag.trim()) return;
    setFiles((prev) =>
      prev.map((f) =>
        f.tags.includes(globalTag.trim()) ? f : { ...f, tags: [...f.tags, globalTag.trim()] }
      )
    );
    toast.success(`Applied "${globalTag}" to all files`);
  };

  const clearAllTags = () => {
    setFiles((prev) => prev.map((f) => ({ ...f, tags: [] })));
    toast.info('Cleared all tags');
  };

  const deploy = async () => {
    if (!isConfigured || files.length === 0) return;

    setIsDeploying(true);
    setLogs([]);
    setSuccessCount(0);
    setErrorCount(0);

    let success = 0;
    let errors = 0;
    const tagCache: Record<string, string> = {}; // tagName -> tagId

    log(`Starting import to ${n8nUrl}...`, 'info');

    for (const file of files) {
      try {
        log(`Importing ${file.name}...`);
        const response = await fetch('/api/n8n', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'import', n8nUrl, apiKey, workflow: file.content }),
        });
        const result = await response.json();
        
        if (result.id) {
          log(`✓ ${file.name} imported`, 'success');
          success++;
          
          // Apply tags for this file
          if (file.tags.length > 0) {
            for (const tagName of file.tags) {
              try {
                // Get or create tag
                if (!tagCache[tagName]) {
                  const tagResponse = await fetch('/api/n8n', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'createTag', n8nUrl, apiKey, tagName }),
                  });
                  const tagResult = await tagResponse.json();
                  if (tagResult.id) {
                    tagCache[tagName] = tagResult.id;
                  }
                }
                
                // Tag the workflow
                if (tagCache[tagName]) {
                  await fetch('/api/n8n', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'tagWorkflow', n8nUrl, apiKey, workflowId: result.id, tagId: tagCache[tagName] }),
                  });
                }
              } catch {
                log(`Failed to apply tag "${tagName}" to ${file.name}`, 'error');
              }
            }
            log(`Tagged ${file.name} with: ${file.tags.join(', ')}`, 'info');
          }
        } else {
          log(`✗ ${file.name}: ${result.message || 'Unknown error'}`, 'error');
          errors++;
        }
      } catch (err) {
        log(`✗ ${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
        errors++;
      }
      setSuccessCount(success);
      setErrorCount(errors);
    }

    log(`Done! ${success} imported, ${errors} failed`, success > 0 ? 'success' : 'error');
    setIsDeploying(false);
    
    if (success > 0) {
      toast.success(`Imported ${success} workflow(s)`);
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
        <div className="p-2 bg-(--info-muted) rounded-lg">
          <Upload className="w-6 h-6 text-(--info)" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Import Workflows</h1>
          <p className="text-sm text-(--text-tertiary)">Upload JSON or ZIP files to import workflows</p>
        </div>
      </div>

      {/* Drop Zone */}
      <Card padding="none">
        <div className="p-6">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onClick={() => document.getElementById('fileInput')?.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
              isDragOver ? 'border-(--accent) bg-(--accent-muted)' : 'border-(--border-default) hover:border-(--accent)'
            }`}
          >
            <div className="flex justify-center mb-4">
              {isExtracting ? (
                <Loader2 className="w-12 h-12 text-(--accent) animate-spin" />
              ) : (
                <FolderOpen className="w-12 h-12 text-(--text-tertiary)" />
              )}
            </div>
            <div className="text-(--text-secondary)">
              {isExtracting ? 'Extracting files...' : 'Drag & drop JSON or ZIP files here'}
            </div>
            <div className="text-sm text-(--text-tertiary) mt-2">or click to browse</div>
            <input id="fileInput" type="file" accept=".json,.zip" multiple onChange={(e) => e.target.files && handleFiles(e.target.files)} className="hidden" />
          </div>
        </div>
      </Card>

      {/* File List with Per-File Tags */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card padding="none">
              <div className="p-4 border-b border-(--border-default) flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileJson className="w-5 h-5 text-(--text-tertiary)" />
                  <span className="font-medium">{files.length} file(s) ready to import</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setFiles([])}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              </div>
              
              <div className="divide-y divide-(--border-default)">
                {files.map((file) => (
                  <div key={file.id} className="p-4 hover:bg-(--bg-hover) transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <FileJson className="w-4 h-4 text-(--info) shrink-0" />
                          <span className="font-mono text-sm truncate">{file.name}</span>
                        </div>
                        
                        {/* Tags */}
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          {file.tags.map((tag) => (
                            <Badge key={tag} variant="accent">
                              {tag}
                              <button
                                onClick={() => removeTagFromFile(file.id, tag)}
                                className="ml-1.5 hover:text-(--error) transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                          
                          {editingFileId === file.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={newTagInput}
                                onChange={(e) => setNewTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    addTagToFile(file.id, newTagInput);
                                    setEditingFileId(null);
                                  } else if (e.key === 'Escape') {
                                    setEditingFileId(null);
                                    setNewTagInput('');
                                  }
                                }}
                                placeholder="Tag name"
                                className="input py-1 px-2 text-xs w-24"
                                autoFocus
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  addTagToFile(file.id, newTagInput);
                                  setEditingFileId(null);
                                }}
                              >
                                <CheckCircle2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingFileId(file.id);
                                setNewTagInput('');
                              }}
                              className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              Add tag
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <Button variant="ghost" size="sm" onClick={() => removeFile(file.id)}>
                        <X className="w-4 h-4 text-[var(--error)]" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Tag */}
      <Card padding="md">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-4 h-4 text-[var(--text-tertiary)]" />
          <span className="font-medium">Quick Tag</span>
          <span className="text-xs text-[var(--text-tertiary)]">(optional)</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={globalTag}
            onChange={(e) => setGlobalTag(e.target.value)}
            placeholder="Enter a tag name..."
            className="input flex-1"
          />
          <Button
            variant="secondary"
            onClick={applyGlobalTagToAll}
            disabled={!globalTag.trim() || files.length === 0}
          >
            Apply to All
          </Button>
          {files.some((f) => f.tags.length > 0) && (
            <Button variant="ghost" onClick={clearAllTags}>
              Clear Tags
            </Button>
          )}
        </div>
        <p className="text-xs text-[var(--text-tertiary)] mt-2">
          Apply a tag to all files, or add individual tags per file above
        </p>
      </Card>

      {/* Deploy Button */}
      <Button
        variant="primary"
        className="w-full py-4 text-lg"
        onClick={deploy}
        disabled={!isConfigured || files.length === 0 || isDeploying}
      >
        {isDeploying ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Importing...
          </>
        ) : (
          <>
            <Upload className="w-5 h-5 mr-2" />
            Import {files.length} Workflow(s)
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
                  <div className="text-xs uppercase text-[var(--text-tertiary)] mt-1">Imported</div>
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
