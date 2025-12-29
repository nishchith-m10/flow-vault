'use client';

import { useCredentials } from '@/components/DashboardLayout';
import { useState, useEffect, useCallback } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, EmptyState } from '@/components/ui';
import { Settings, Plus, Pencil, Trash2, RefreshCw, Unplug, Loader2, Save, X } from 'lucide-react';
import { useModal } from '@/components/Modal';
import { useToast } from '@/components/Toast';

interface Variable {
  id: string;
  key: string;
  value: string;
}

export default function VariablesPage() {
  const { n8nUrl, apiKey, isConfigured } = useCredentials();
  const [variables, setVariables] = useState<Variable[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const { openModal, closeModal } = useModal();
  const toast = useToast();

  const fetchVariables = useCallback(async () => {
    if (!isConfigured) return;
    setLoading(true);
    try {
      const response = await fetch('/api/n8n', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'listVariables', n8nUrl, apiKey }),
      });
      const data = await response.json();
      setVariables(data.data || []);
    } catch (error) {
      console.error('Failed to fetch variables:', error);
      toast.error('Failed to fetch variables');
    }
    setLoading(false);
  }, [isConfigured, n8nUrl, apiKey, toast]);

  useEffect(() => {
    fetchVariables();
  }, [fetchVariables]);

  const createVariable = async () => {
    if (!newKey.trim() || !newValue.trim()) {
      toast.error('Key and value are required');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/n8n', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createVariable', n8nUrl, apiKey, key: newKey, value: newValue }),
      });
      const result = await response.json();
      if (result.id) {
        toast.success(`Variable "${newKey}" created`);
        setNewKey('');
        setNewValue('');
        setShowNew(false);
        fetchVariables();
      } else {
        toast.error(result.message || 'Failed to create variable');
      }
    } catch (error) {
      console.error('Failed to create variable:', error);
      toast.error('Failed to create variable');
    }
    setSaving(false);
  };

  const updateVariable = async (id: string) => {
    setSaving(true);
    try {
      const response = await fetch('/api/n8n', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateVariable', n8nUrl, apiKey, variableId: id, value: editValue }),
      });
      const result = await response.json();
      if (result.id) {
        toast.success('Variable updated');
        setEditingId(null);
        fetchVariables();
      } else {
        toast.error(result.message || 'Failed to update variable');
      }
    } catch (error) {
      console.error('Failed to update variable:', error);
      toast.error('Failed to update variable');
    }
    setSaving(false);
  };

  const deleteVariable = (variable: Variable) => {
    openModal({
      title: 'Delete Variable?',
      message: `The variable "${variable.key}" will be permanently deleted.`,
      variant: 'danger',
      icon: Trash2,
      confirmText: 'Delete',
      onConfirm: async () => {
        closeModal();
        try {
          await fetch('/api/n8n', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'deleteVariable', n8nUrl, apiKey, variableId: variable.id }),
          });
          toast.success(`Variable "${variable.key}" deleted`);
          fetchVariables();
        } catch (error) {
          console.error('Failed to delete variable:', error);
          toast.error('Failed to delete variable');
        }
      },
    });
  };

  const startEdit = (variable: Variable) => {
    setEditingId(variable.id);
    setEditValue(variable.value);
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
          <div className="p-2 bg-cyan-500/10 rounded-lg">
            <Settings className="w-6 h-6 text-cyan-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Variables</h1>
            <p className="text-sm text-[var(--text-tertiary)]">Environment variables for your workflows</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={fetchVariables} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="primary" onClick={() => setShowNew(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Variable
          </Button>
        </div>
      </div>

      {/* New Variable Form */}
      {showNew && (
        <Card>
          <CardHeader>
            <CardTitle>Create Variable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm text-[var(--text-tertiary)] mb-2">Key</label>
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="MY_VARIABLE"
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-tertiary)] mb-2">Value</label>
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="value"
                className="input w-full"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowNew(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={createVariable} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Create
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Variables List */}
      {loading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--accent-indigo)]" />
            <p className="mt-2 text-sm text-[var(--text-tertiary)]">Loading variables...</p>
          </CardContent>
        </Card>
      ) : variables.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <EmptyState
              icon={Settings}
              title="No variables"
              description="Create variables to use in your workflows"
              action={
                <Button variant="primary" onClick={() => setShowNew(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Variable
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {variables.map((variable, idx) => (
              <div
                key={variable.id}
                className={`flex items-center justify-between p-4 ${
                  idx < variables.length - 1 ? 'border-b border-[var(--border-primary)]' : ''
                }`}
              >
                {editingId === variable.id ? (
                  <div className="flex-1 flex items-center gap-4">
                    <code className="text-sm font-mono text-[var(--accent-indigo)]">{variable.key}</code>
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="input flex-1"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => updateVariable(variable.id)}
                        disabled={saving}
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <code className="text-sm font-mono text-[var(--accent-indigo)]">{variable.key}</code>
                      <span className="mx-3 text-[var(--text-tertiary)]">=</span>
                      <span className="text-sm">{variable.value}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(variable)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteVariable(variable)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="text-sm text-[var(--text-tertiary)]">
        {variables.length} variable(s)
      </div>
    </div>
  );
}
