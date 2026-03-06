import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles, ClipboardList, Trash2, ChevronDown, ChevronRight, PenLine } from 'lucide-react';
import { api } from '../lib/api';
import type { Project, TestPlan } from '../lib/api';

type Mode = 'manual' | 'ai';

const MANUAL_PLACEHOLDER = `## Overview
Briefly describe what this plan covers.

## Test Areas
- Feature A
  - Login flow
  - Logout flow
- Feature B
  - ...

## Entry Criteria
- ...

## Exit Criteria
- All high priority tests pass
`;

export default function Plans() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId') || '';

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState(projectId);
  const [plans, setPlans] = useState<TestPlan[]>([]);
  const [mode, setMode] = useState<Mode>('manual');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // manual form
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [preview, setPreview] = useState(false);

  // ai form
  const [requirements, setRequirements] = useState('');

  useEffect(() => { api.projects.list().then(setProjects); }, []);
  useEffect(() => { if (selectedProject) api.plans.list(selectedProject).then(setPlans); }, [selectedProject]);

  async function saveManual() {
    if (!selectedProject || !manualTitle.trim() || !manualContent.trim()) return;
    setLoading(true);
    setError('');
    try {
      const plan = await api.plans.create({ projectId: selectedProject, title: manualTitle, plan: manualContent });
      setPlans([plan, ...plans]);
      setManualTitle('');
      setManualContent('');
      setExpanded(plan.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save plan');
    } finally {
      setLoading(false);
    }
  }

  async function generate() {
    if (!selectedProject || !requirements.trim()) return;
    setLoading(true);
    setError('');
    try {
      const plan = await api.plans.generate(selectedProject, requirements);
      setPlans([plan, ...plans]);
      setRequirements('');
      setExpanded(plan.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate plan');
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this test plan?')) return;
    await api.plans.delete(id);
    setPlans(plans.filter((p) => p.id !== id));
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Test Plans</h1>
        <p className="text-gray-500 mt-1 text-sm">Create and manage test plans</p>
      </div>

      {/* Create card */}
      <div className="card mb-8">
        {/* Tab bar */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setMode('manual')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              mode === 'manual'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <PenLine size={15} /> Write Manually
          </button>
          <button
            onClick={() => setMode('ai')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              mode === 'ai'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Sparkles size={15} /> Generate with AI
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Project selector — shared */}
          <div>
            <label className="label">Project</label>
            <select className="input" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
              <option value="">Select a project...</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {mode === 'manual' ? (
            <>
              <div>
                <label className="label">Plan Title</label>
                <input
                  className="input"
                  placeholder="e.g. Login & Auth Test Plan"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label mb-0">Plan Content (Markdown)</label>
                  <button
                    className="text-xs text-brand-600 hover:underline"
                    onClick={() => setPreview(!preview)}
                  >
                    {preview ? 'Edit' : 'Preview'}
                  </button>
                </div>
                {preview ? (
                  <div className="input min-h-[200px] prose prose-sm max-w-none overflow-auto">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{manualContent || '_Nothing to preview_'}</ReactMarkdown>
                  </div>
                ) : (
                  <textarea
                    className="input min-h-[200px] resize-y font-mono text-sm"
                    placeholder={MANUAL_PLACEHOLDER}
                    value={manualContent}
                    onChange={(e) => setManualContent(e.target.value)}
                  />
                )}
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                className="btn-primary"
                onClick={saveManual}
                disabled={loading || !selectedProject || !manualTitle.trim() || !manualContent.trim()}
              >
                <PenLine size={16} />
                {loading ? 'Saving...' : 'Save Plan'}
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="label">Requirements / Feature Description</label>
                <textarea
                  className="input min-h-[120px] resize-y"
                  placeholder="Describe what needs to be tested. E.g.: User authentication flow including login, logout, password reset, and session management..."
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                className="btn-primary"
                onClick={generate}
                disabled={loading || !selectedProject || !requirements.trim()}
              >
                <Sparkles size={16} />
                {loading ? 'Generating...' : 'Generate Test Plan'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Plans list */}
      {plans.length === 0 ? (
        <div className="card p-12 text-center">
          <ClipboardList className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500 font-medium">No test plans yet</p>
          <p className="text-gray-400 text-sm mt-1">Write or generate your first test plan above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <div key={plan.id} className="card">
              <div
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 rounded-xl"
                onClick={() => setExpanded(expanded === plan.id ? null : plan.id)}
              >
                <div className="flex items-center gap-3">
                  {expanded === plan.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  <div>
                    <p className="font-medium text-gray-900">{plan.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(plan.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="badge-gray badge">{plan.status}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); remove(plan.id); }}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {expanded === plan.id && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  <div className="mt-4 prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-gray-800">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{plan.plan}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
