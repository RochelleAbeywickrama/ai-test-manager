import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db/schema';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  const projects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
  res.json(projects);
});

router.post('/', (req, res) => {
  const { name, description, framework = 'playwright' } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const db = getDb();
  const id = uuid();
  db.prepare('INSERT INTO projects (id, name, description, framework) VALUES (?, ?, ?, ?)').run(
    id, name, description ?? '', framework
  );
  res.status(201).json({ id, name, description, framework });
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  res.json(project);
});

router.put('/:id', (req, res) => {
  const { name, description, framework } = req.body;
  const db = getDb();
  db.prepare('UPDATE projects SET name = COALESCE(?, name), description = COALESCE(?, description), framework = COALESCE(?, framework) WHERE id = ?')
    .run(name, description, framework, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const id = req.params.id;
  db.transaction(() => {
    db.prepare('DELETE FROM test_runs WHERE project_id = ?').run(id);
    db.prepare('DELETE FROM test_cases WHERE project_id = ?').run(id);
    db.prepare('DELETE FROM test_plans WHERE project_id = ?').run(id);
    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  })();
  res.json({ success: true });
});

export default router;
