'use client';

import { useCredentials } from '@/components/DashboardLayout';
import { useState, useEffect, useCallback } from 'react';
import { Button, Badge, Card, CardContent, CardHeader, CardTitle, EmptyState } from '@/components/ui';
import { Tag, Plus, Trash2, RefreshCw, Unplug, Loader2, Save } from 'lucide-react';
import { useModal } from '@/components/Modal';
import { useToast } from '@/components/Toast';

interface TagItem {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function TagsPage() {
  const { n8nUrl, apiKey, isConfigured } = useCredentials();
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTagName, setNewTagName] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const { openModal, closeModal } = useModal();
  const toast = useToast();

  const fetchTags = useCallback(async () => {
    if (!isConfigured) return;
    setLoading(true);
    try {
      const response = await fetch('/api/n8n', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'listTags', n8nUrl, apiKey }),
      });
      const data = await response.json();
      setTags(data.data || []);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
      toast.error('Failed to fetch tags');
    }
    setLoading(false);
  }, [isConfigured, n8nUrl, apiKey, toast]);

  useEffect(() => {
    queueMicrotask(() => {
      fetchTags();
    });
  }, [fetchTags]);

  const createTag = async () => {
    if (!newTagName.trim()) {
      toast.error('Tag name is required');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/n8n', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createTag', n8nUrl, apiKey, tagName: newTagName }),
      });
      const result = await response.json();
      if (result.id) {
        toast.success(`Tag "${newTagName}" created`);
        setNewTagName('');
        setShowNew(false);
        fetchTags();
      } else {
        toast.error(result.message || 'Failed to create tag');
      }
    } catch (error) {
      console.error('Failed to create tag:', error);
      toast.error('Failed to create tag');
    }
    setSaving(false);
  };

  const deleteTag = (tag: TagItem) => {
    openModal({
      title: 'Delete Tag?',
      message: `The tag "${tag.name}" will be permanently deleted. This will not delete associated workflows.`,
      variant: 'danger',
      icon: Trash2,
      confirmText: 'Delete',
      onConfirm: async () => {
        closeModal();
        try {
          await fetch('/api/n8n', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'deleteTag', n8nUrl, apiKey, tagId: tag.id }),
          });
          toast.success(`Tag "${tag.name}" deleted`);
          fetchTags();
        } catch (error) {
          console.error('Failed to delete tag:', error);
          toast.error('Failed to delete tag');
        }
      },
    });
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
          <div className="p-2 bg-pink-500/10 rounded-lg">
            <Tag className="w-6 h-6 text-pink-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Tags</h1>
            <p className="text-sm text-(--text-tertiary)">Organize your workflows with tags</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={fetchTags} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="primary" onClick={() => setShowNew(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Tag
          </Button>
        </div>
      </div>

      {/* New Tag Form */}
      {showNew && (
        <Card>
          <CardHeader>
            <CardTitle>Create Tag</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm text-(--text-tertiary) mb-2">Tag Name</label>
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="My Tag"
                className="input w-full"
                onKeyDown={(e) => e.key === 'Enter' && createTag()}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowNew(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={createTag} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Create
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tags List */}
      {loading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-(--accent-indigo)" />
            <p className="mt-2 text-sm text-(--text-tertiary)">Loading tags...</p>
          </CardContent>
        </Card>
      ) : tags.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <EmptyState
              icon={Tag}
              title="No tags"
              description="Create tags to organize your workflows"
              action={
                <Button variant="primary" onClick={() => setShowNew(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Tag
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tags.map((tag) => (
            <Card key={tag.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[var(--bg-tertiary)] rounded-lg">
                      <Tag className="w-4 h-4 text-[var(--accent-indigo)]" />
                    </div>
                    <div>
                      <div className="font-medium">{tag.name}</div>
                      {tag.createdAt && (
                        <div className="text-xs text-[var(--text-tertiary)]">
                          Created {new Date(tag.createdAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteTag(tag)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="text-sm text-[var(--text-tertiary)]">
        {tags.length} tag(s)
      </div>
    </div>
  );
}
