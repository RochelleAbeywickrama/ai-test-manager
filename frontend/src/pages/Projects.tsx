import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowRight, FlaskConical } from 'lucide-react';
import { api } from '../lib/api';
import type { Project } from '../lib/api';

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', framework: 'playwright' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { load(); }, []);

  async function load() {
    setProjects(await api.projects.list());
  }

  async function create() {
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      await api.projects.create(form as Partial<Project>);
      setForm({ name: '', description: '', framework: 'playwright' });
      setShowForm(false);
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this project?')) return;
    await api.projects.delete(id);
    await load();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage your test projects</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> New Project
        </button>
      </div>

      {showForm && (
        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">New Project</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Project Name</label>
              <input className="input" placeholder="My App Tests" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Description</label>
              <input className="input" placeholder="What are you testing?" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="label">Framework</label>
              <select className="input" value={form.framework}
                onChange={(e) => setForm({ ...form, framework: e.target.value })}>
                <option value="playwright">Playwright</option>
                <option value="cypress">Cypress</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button className="btn-primary" onClick={create} disabled={loading}>
                {loading ? 'Creating...' : 'Create Project'}
              </button>
              <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="card p-16 text-center">
          <FlaskConical className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500 font-medium">No projects yet</p>
          <p className="text-gray-400 text-sm mt-1">Create a project to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <div key={p.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{p.name}</h3>
                  {p.description && <p className="text-gray-500 text-sm mt-1">{p.description}</p>}
                </div>
                <button onClick={() => remove(p.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className={`badge ${p.framework === 'playwright' ? 'badge-blue' : 'badge-green'}`}>
                  {p.framework}
                </span>
                <button
                  onClick={() => navigate(`/plans?projectId=${p.id}`)}
                  className="text-brand-600 hover:text-brand-700 text-sm font-medium flex items-center gap-1"
                >
                  Open <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
