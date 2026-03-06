import { useEffect, useState } from 'react';
import { Save, Bell, Send } from 'lucide-react';
import { api } from '../lib/api';

export default function Settings() {
  const [settings, setSettings] = useState({
    slack_webhook_url: '',
    slack_channel: '#test-results',
    notify_on_failure: 'true',
    notify_on_success: 'false',
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    api.settings.get().then((s) => setSettings((prev) => ({ ...prev, ...s })));
  }, []);

  async function save() {
    setSaving(true);
    try {
      await api.settings.update(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function testSlack() {
    if (!settings.slack_webhook_url) return;
    setTesting(true);
    setTestResult(null);
    try {
      await api.settings.testSlack(settings.slack_webhook_url);
      setTestResult({ ok: true, msg: 'Test message sent successfully!' });
    } catch (e: unknown) {
      setTestResult({ ok: false, msg: e instanceof Error ? e.message : 'Failed to send test message' });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1 text-sm">Configure integrations and notifications</p>
      </div>

      {/* Slack */}
      <div className="card p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <Bell size={18} /> Slack Notifications
        </h2>
        <p className="text-sm text-gray-500 mb-5">
          Get notified in Slack when test runs complete. Create an Incoming Webhook in your Slack workspace settings.
        </p>
        <div className="space-y-4">
          <div>
            <label className="label">Webhook URL</label>
            <input
              className="input"
              type="url"
              placeholder="https://hooks.slack.com/services/..."
              value={settings.slack_webhook_url}
              onChange={(e) => setSettings({ ...settings, slack_webhook_url: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Channel</label>
            <input
              className="input"
              placeholder="#test-results"
              value={settings.slack_channel}
              onChange={(e) => setSettings({ ...settings, slack_channel: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-brand-600"
                checked={settings.notify_on_failure === 'true'}
                onChange={(e) => setSettings({ ...settings, notify_on_failure: String(e.target.checked) })}
              />
              <span className="text-sm text-gray-700">Notify on failure</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-brand-600"
                checked={settings.notify_on_success === 'true'}
                onChange={(e) => setSettings({ ...settings, notify_on_success: String(e.target.checked) })}
              />
              <span className="text-sm text-gray-700">Notify on success</span>
            </label>
          </div>
          {settings.slack_webhook_url && (
            <div>
              <button className="btn-secondary" onClick={testSlack} disabled={testing}>
                <Send size={16} />
                {testing ? 'Sending...' : 'Send Test Message'}
              </button>
              {testResult && (
                <p className={`text-sm mt-2 ${testResult.ok ? 'text-green-600' : 'text-red-600'}`}>
                  {testResult.msg}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* GitHub Actions info */}
      <div className="card p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-1">GitHub Actions Integration</h2>
        <p className="text-sm text-gray-500 mb-4">
          A ready-to-use workflow file is included at <code className="bg-gray-100 px-1 rounded">.github/workflows/test-pipeline.yml</code>.
          Add the following secrets to your GitHub repository:
        </p>
        <div className="space-y-2 font-mono text-sm">
          {[
            ['ANTHROPIC_API_KEY', 'Your Anthropic API key'],
            ['SLACK_WEBHOOK_URL', 'Your Slack incoming webhook URL'],
            ['TEST_MANAGER_URL', 'URL of your deployed backend (for self-hosted runners)'],
          ].map(([key, desc]) => (
            <div key={key} className="flex items-start gap-3 bg-gray-50 rounded p-3">
              <span className="text-brand-600 font-medium shrink-0">{key}</span>
              <span className="text-gray-500 text-xs font-sans">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      <button className="btn-primary" onClick={save} disabled={saving}>
        <Save size={16} />
        {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}
