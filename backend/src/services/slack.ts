import { getDb } from '../db/schema';

interface TestRunSummary {
  runName: string;
  projectName: string;
  status: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  triggeredBy: string;
  runId: string;
}

function getSetting(key: string): string {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? '';
}

export async function sendTestRunNotification(summary: TestRunSummary): Promise<void> {
  const webhookUrl = getSetting('slack_webhook_url');
  if (!webhookUrl) return;

  const notifyOnFailure = getSetting('notify_on_failure') === 'true';
  const notifyOnSuccess = getSetting('notify_on_success') === 'true';

  const hasFailed = summary.failed > 0;
  if (hasFailed && !notifyOnFailure) return;
  if (!hasFailed && !notifyOnSuccess) return;

  const passRate = summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0;
  const statusEmoji = summary.failed > 0 ? ':red_circle:' : ':large_green_circle:';
  const durationSecs = (summary.duration / 1000).toFixed(1);

  const payload = {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${statusEmoji} Test Run: ${summary.runName}`,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Project:*\n${summary.projectName}` },
          { type: 'mrkdwn', text: `*Status:*\n${summary.status.toUpperCase()}` },
          { type: 'mrkdwn', text: `*Pass Rate:*\n${passRate}% (${summary.passed}/${summary.total})` },
          { type: 'mrkdwn', text: `*Duration:*\n${durationSecs}s` },
        ],
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Passed:* :white_check_mark: ${summary.passed}` },
          { type: 'mrkdwn', text: `*Failed:* :x: ${summary.failed}` },
          { type: 'mrkdwn', text: `*Skipped:* :large_yellow_circle: ${summary.skipped}` },
          { type: 'mrkdwn', text: `*Triggered by:* ${summary.triggeredBy}` },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Run ID: ${summary.runId} | AI Test Manager`,
          },
        ],
      },
    ],
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    console.error('Failed to send Slack notification:', await response.text());
  }
}
