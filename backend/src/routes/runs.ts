import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db/schema';
import { executeTestRun } from '../services/runner';

const router = Router();

router.get('/', (req, res) => {
  const { projectId } = req.query;
  const db = getDb();
  const runs = projectId
    ? db.prepare('SELECT * FROM test_runs WHERE project_id = ? ORDER BY created_at DESC').all(projectId)
    : db.prepare('SELECT * FROM test_runs ORDER BY created_at DESC').all();
  res.json(runs);
});

router.post('/', async (req, res) => {
  const { projectId, testCaseIds, name, triggeredBy = 'manual' } = req.body;
  if (!projectId || !testCaseIds?.length) {
    return res.status(400).json({ error: 'projectId and testCaseIds are required' });
  }

  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as
    | { framework: 'playwright' | 'cypress' }
    | undefined;
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const id = uuid();
  const runName = name || `Run ${new Date().toLocaleString()}`;

  db.prepare(
    'INSERT INTO test_runs (id, project_id, name, status, triggered_by) VALUES (?, ?, ?, ?, ?)'
  ).run(id, projectId, runName, 'pending', triggeredBy);

  // Execute async — don't await so we can return the run ID immediately
  executeTestRun(id, projectId, testCaseIds, project.framework).catch((err) => {
    console.error('Test run failed:', err);
  });

  res.status(201).json({ id, name: runName, status: 'pending', projectId });
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const run = db.prepare('SELECT * FROM test_runs WHERE id = ?').get(req.params.id);
  if (!run) return res.status(404).json({ error: 'Not found' });
  res.json(run);
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM test_runs WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
