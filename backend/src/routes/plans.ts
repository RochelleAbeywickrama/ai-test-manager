import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db/schema';
import { generateTestPlan } from '../services/ai';

const router = Router();

router.get('/', (req, res) => {
  const { projectId } = req.query;
  const db = getDb();
  const plans = projectId
    ? db.prepare('SELECT * FROM test_plans WHERE project_id = ? ORDER BY created_at DESC').all(projectId)
    : db.prepare('SELECT * FROM test_plans ORDER BY created_at DESC').all();
  res.json(plans);
});

// Manual create
router.post('/', (req, res) => {
  const { projectId, title, plan, requirements = '' } = req.body;
  if (!projectId || !title || !plan) {
    return res.status(400).json({ error: 'projectId, title and plan are required' });
  }
  const db = getDb();
  if (!db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId)) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const id = uuid();
  db.prepare('INSERT INTO test_plans (id, project_id, title, requirements, plan) VALUES (?, ?, ?, ?, ?)').run(
    id, projectId, title, requirements, plan
  );
  res.status(201).json({ id, title, plan, requirements, project_id: projectId, status: 'draft', created_at: new Date().toISOString() });
});

router.post('/generate', async (req, res) => {
  const { projectId, requirements } = req.body;
  if (!projectId || !requirements) {
    return res.status(400).json({ error: 'projectId and requirements are required' });
  }

  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as
    | { name: string }
    | undefined;
  if (!project) return res.status(404).json({ error: 'Project not found' });

  try {
    const plan = await generateTestPlan(requirements, project.name);
    const id = uuid();
    const title = `Test Plan - ${new Date().toLocaleDateString()}`;

    db.prepare('INSERT INTO test_plans (id, project_id, title, requirements, plan) VALUES (?, ?, ?, ?, ?)').run(
      id, projectId, title, requirements, plan
    );

    res.status(201).json({ id, title, plan, requirements, projectId, status: 'draft' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate test plan' });
  }
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const plan = db.prepare('SELECT * FROM test_plans WHERE id = ?').get(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Not found' });
  res.json(plan);
});

router.put('/:id', (req, res) => {
  const { title, plan, status } = req.body;
  const db = getDb();
  db.prepare('UPDATE test_plans SET title = COALESCE(?, title), plan = COALESCE(?, plan), status = COALESCE(?, status) WHERE id = ?')
    .run(title, plan, status, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM test_plans WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
