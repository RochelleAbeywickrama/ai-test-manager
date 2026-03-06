import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db/schema';
import { generateTestCase, improveTestCase } from '../services/ai';

const router = Router();

router.get('/', (req, res) => {
  const { projectId, planId } = req.query;
  const db = getDb();
  let query = 'SELECT * FROM test_cases WHERE 1=1';
  const params: string[] = [];
  if (projectId) { query += ' AND project_id = ?'; params.push(projectId as string); }
  if (planId) { query += ' AND plan_id = ?'; params.push(planId as string); }
  query += ' ORDER BY created_at DESC';
  res.json(db.prepare(query).all(...params));
});

// Manual create
router.post('/', (req, res) => {
  const { projectId, planId, title, description = '', code } = req.body;
  if (!projectId || !title || !code) {
    return res.status(400).json({ error: 'projectId, title and code are required' });
  }
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as
    | { framework: string }
    | undefined;
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const id = uuid();
  db.prepare(
    'INSERT INTO test_cases (id, project_id, plan_id, title, description, code, framework) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, projectId, planId ?? null, title, description, code, project.framework);
  res.status(201).json({ id, title, description, code, framework: project.framework, status: 'draft', created_at: new Date().toISOString() });
});

router.post('/generate', async (req, res) => {
  const { projectId, planId, description, context } = req.body;
  if (!projectId || !description) {
    return res.status(400).json({ error: 'projectId and description are required' });
  }

  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as
    | { name: string; framework: 'playwright' | 'cypress' }
    | undefined;
  if (!project) return res.status(404).json({ error: 'Project not found' });

  try {
    const { title, code } = await generateTestCase(
      description,
      project.framework,
      project.name,
      context
    );

    const id = uuid();
    db.prepare(
      'INSERT INTO test_cases (id, project_id, plan_id, title, description, code, framework) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, projectId, planId ?? null, title, description, code, project.framework);

    res.status(201).json({ id, title, description, code, framework: project.framework, status: 'draft' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate test case' });
  }
});

router.post('/:id/improve', async (req, res) => {
  const { feedback } = req.body;
  if (!feedback) return res.status(400).json({ error: 'feedback is required' });

  const db = getDb();
  const tc = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(req.params.id) as
    | { code: string; framework: 'playwright' | 'cypress' }
    | undefined;
  if (!tc) return res.status(404).json({ error: 'Test case not found' });

  try {
    const improvedCode = await improveTestCase(tc.code, feedback, tc.framework);
    db.prepare('UPDATE test_cases SET code = ? WHERE id = ?').run(improvedCode, req.params.id);
    res.json({ code: improvedCode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to improve test case' });
  }
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const tc = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(req.params.id);
  if (!tc) return res.status(404).json({ error: 'Not found' });
  res.json(tc);
});

router.put('/:id', (req, res) => {
  const { title, description, code, status } = req.body;
  const db = getDb();
  db.prepare(
    'UPDATE test_cases SET title = COALESCE(?, title), description = COALESCE(?, description), code = COALESCE(?, code), status = COALESCE(?, status) WHERE id = ?'
  ).run(title, description, code, status, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM test_cases WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
