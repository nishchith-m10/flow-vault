/**
 * User Settings Page
 * Manages n8n credentials and backup configuration
 */

'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';

interface UserSettings {
  n8n_instance_url: string;
  backup_enabled: boolean;
  backup_schedule: string;
  retention_days: number;
  last_backup_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form state
  const [instanceUrl, setInstanceUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [backupEnabled, setBackupEnabled] = useState(true);
  const [backupSchedule, setBackupSchedule] = useState('daily');
  const [retentionDays, setRetentionDays] = useState(30);

  // Temporary toast component
  function ToastMessage({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
    useEffect(() => {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }, [onClose]);

    return (
      <div className={`fixed bottom-4 right-4 p-4 rounded-md shadow-lg ${type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
        {message}
      </div>
    );
  }

  // Load existing settings
  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const response = await fetch('/api/settings');
      
      if (response.status === 404) {
        // No settings yet - this is fine
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        setSettings(result.data);
        setInstanceUrl(result.data.n8n_instance_url);
        setBackupEnabled(result.data.backup_enabled);
        setBackupSchedule(result.data.backup_schedule);
        setRetentionDays(result.data.retention_days);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      setToast({ message: 'Failed to load settings', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!instanceUrl || !apiKey) {
      setToast({ message: 'Please fill in all required fields', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          n8n_instance_url: instanceUrl,
          n8n_api_key: apiKey,
          backup_enabled: backupEnabled,
          backup_schedule: backupSchedule,
          retention_days: retentionDays,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to save settings');
      }

      setSettings(result.data);
      setApiKey(''); // Clear sensitive field
      setToast({ message: result.message || 'Settings saved successfully', type: 'success' });
    } catch (error) {
      console.error('Failed to save settings:', error);
      setToast({
        message: error instanceof Error ? error.message : 'Failed to save settings',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    if (!instanceUrl) {
      setToast({ message: 'Please enter your n8n instance URL', type: 'error' });
      return;
    }

    setTesting(true);
    try {
      const response = await fetch('/api/settings/test', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          n8n_instance_url: instanceUrl,
          n8n_api_key: apiKey || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setToast({
          message: `Connection successful! Found ${result.workflowCount} workflows`,
          type: 'success',
        });
      } else {
        setToast({ message: result.error || 'Connection failed', type: 'error' });
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      setToast({ message: 'Connection test failed', type: 'error' });
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Settings</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Configure your n8n instance connection and backup preferences
      </p>

      {/* n8n Connection Settings */}
      <Card className="mb-6">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">n8n Connection</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="instanceUrl" className="block text-sm font-medium mb-2">
                n8n Instance URL *
              </label>
              <Input
                id="instanceUrl"
                type="url"
                value={instanceUrl}
                onChange={(e) => setInstanceUrl(e.target.value)}
                placeholder="https://your-n8n-instance.com"
                className="w-full"
              />
              <p className="text-sm text-gray-500 mt-1">
                The URL of your n8n instance
              </p>
            </div>

            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium mb-2">
                n8n API Key *
              </label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={settings ? '••••••••••••' : 'Enter your n8n API key'}
                className="w-full"
              />
              <p className="text-sm text-gray-500 mt-1">
                Your n8n API key (stored encrypted)
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleTestConnection}
                disabled={testing || !instanceUrl}
                variant="secondary"
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Backup Settings */}
      <Card className="mb-6">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Backup Settings</h2>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="backupEnabled"
                checked={backupEnabled}
                onChange={(e) => setBackupEnabled(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="backupEnabled" className="text-sm font-medium">
                Enable automatic backups
              </label>
            </div>

            <div>
              <label htmlFor="backupSchedule" className="block text-sm font-medium mb-2">
                Backup Schedule
              </label>
              <select
                id="backupSchedule"
                value={backupSchedule}
                onChange={(e) => setBackupSchedule(e.target.value)}
                disabled={!backupEnabled}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="manual">Manual only</option>
              </select>
            </div>

            <div>
              <label htmlFor="retentionDays" className="block text-sm font-medium mb-2">
                Retention Period (days)
              </label>
              <Input
                id="retentionDays"
                type="number"
                value={retentionDays}
                onChange={(e) => setRetentionDays(parseInt(e.target.value, 10))}
                min="1"
                max="365"
                className="w-full"
              />
              <p className="text-sm text-gray-500 mt-1">
                How long to keep backup versions
              </p>
            </div>

            {settings?.last_backup_at && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Last backup: {new Date(settings.last_backup_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button
          onClick={handleSave}
          disabled={saving || !instanceUrl || !apiKey}
        >
          {saving ? 'Saving...' : settings ? 'Update Settings' : 'Save Settings'}
        </Button>
      </div>

      {/* Toast notifications */}
      {toast && (
        <ToastMessage
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
