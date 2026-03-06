import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { getDb } from '../db/schema';

const router = Router();

// Get report for a run
router.get('/:runId', (req, res) => {
  const db = getDb();
  const run = db.prepare('SELECT * FROM test_runs WHERE id = ?').get(req.params.runId) as
    | { report_path: string; status: string }
    | undefined;

  if (!run) return res.status(404).json({ error: 'Run not found' });
  if (!run.report_path) return res.status(404).json({ error: 'No report available yet' });
  if (!fs.existsSync(run.report_path)) return res.status(404).json({ error: 'Report file not found' });

  res.sendFile(run.report_path);
});

// Serve static report assets
router.get('/:runId/assets/*', (req, res) => {
  const reportsDir = path.join(__dirname, '../../reports', req.params.runId);
  const wildcard = (req.params as Record<string, string>)['0'] ?? '';
  const assetPath = path.join(reportsDir, wildcard);
  if (fs.existsSync(assetPath)) {
    res.sendFile(assetPath);
  } else {
    res.status(404).send('Not found');
  }
});

export default router;
