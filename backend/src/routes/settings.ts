import { Router } from 'express';
import { getDb } from '../db/schema';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;
  const settings: Record<string, string> = {};
  for (const row of rows) settings[row.key] = row.value;
  res.json(settings);
});

router.put('/', (req, res) => {
  const db = getDb();
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const updateMany = db.transaction((entries: [string, string][]) => {
    for (const [key, value] of entries) upsert.run(key, value);
  });
  updateMany(Object.entries(req.body));
  res.json({ success: true });
});

// Test Slack webhook
router.post('/test-slack', async (req, res) => {
  const { webhookUrl } = req.body;
  if (!webhookUrl) return res.status(400).json({ error: 'webhookUrl is required' });

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: ':white_check_mark: AI Test Manager connected successfully! Slack notifications are working.',
      }),
    });

    if (response.ok) {
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Slack webhook returned an error' });
    }
  } catch {
    res.status(500).json({ error: 'Failed to reach Slack webhook URL' });
  }
});

export default router;
