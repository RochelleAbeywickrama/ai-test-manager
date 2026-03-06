import { useEffect, useState, useRef } from 'react';
import { Play, RefreshCw, Trash2, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import type { Project, TestCase, TestRun } from '../lib/api';

const statusIcon = {
  pending: <Clock size={16} className="text-yellow-500" />,
  running: <RefreshCw size={16} className="text-blue-500 animate-spin" />,
  passed: <CheckCircle size={16} className="text-green-500" />,
  failed: <XCircle size={16} className="text-red-500" />,
  error: <AlertCircle size={16} className="text-orange-500" />,
};

const statusBadge = {
  pending: 'badge-yellow',
  running: 'badge-blue',
  passed: 'badge-green',
  failed: 'badge-red',
  error: 'badge-yellow',
};

export default function Runs() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [testcases, setTestcases] = useState<TestCase[]>([]);
  const [selectedCases, setSelectedCases] = useState<string[]>([]);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [runName, setRunName] = useState('');
  const [creating, setCreating] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { api.projects.list().then(setProjects); }, []);

  useEffect(() => {
    if (selectedProject) {
      api.testcases.list({ projectId: selectedProject }).then(setTestcases);
      api.runs.list(selectedProject).then(setRuns);
    }
  }, [selectedProject]);

  // Poll for running runs
  useEffect(() => {
    const hasActive = runs.some((r) => r.status === 'pending' || r.status === 'running');
    if (hasActive && !pollingRef.current) {
      pollingRef.current = setInterval(async () => {
        const fresh = await api.runs.list(selectedProject);
        setRuns(fresh);
        if (!fresh.some((r) => r.status === 'pending' || r.status === 'running')) {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
        }
      }, 3000);
    }
    return () => {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    };
  }, [runs, selectedProject]);

  async function startRun() {
    if (!selectedProject || !selectedCases.length) return;
    setCreating(true);
    try {
      const run = await api.runs.create({
        projectId: selectedProject,
        testCaseIds: selectedCases,
        name: runName || undefined,
      });
      setRuns([run, ...runs]);
      setSelectedCases([]);
      setRunName('');
    } finally {
      setCreating(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this run?')) return;
    await api.runs.delete(id);
    setRuns(runs.filter((r) => r.id !== id));
  }

  function toggleCase(id: string) {
    setSelectedCases((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  const passRate = (run: TestRun) =>
    run.total > 0 ? Math.round((run.passed / run.total) * 100) : 0;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Test Runs</h1>
        <p className="text-gray-500 mt-1 text-sm">Execute and monitor test runs</p>
      </div>

      {/* Run configurator */}
      <div className="card p-6 mb-8">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Play size={18} className="text-brand-500" /> Start New Run
        </h2>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="label">Project</label>
              <select className="input" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
                <option value="">Select project...</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="label">Run Name (optional)</label>
              <input className="input" placeholder="e.g. Regression - Sprint 12" value={runName}
                onChange={(e) => setRunName(e.target.value)} />
            </div>
          </div>

          {selectedProject && testcases.length > 0 && (
            <div>
              <label className="label">Select Test Cases ({selectedCases.length} selected)</label>
              <div className="border border-gray-200 rounded-lg divide-y max-h-48 overflow-y-auto">
                {testcases.map((tc) => (
                  <label key={tc.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCases.includes(tc.id)}
                      onChange={() => toggleCase(tc.id)}
                      className="rounded border-gray-300 text-brand-600"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{tc.title}</p>
                    </div>
                    <span className={`badge ${tc.framework === 'playwright' ? 'badge-blue' : 'badge-green'}`}>
                      {tc.framework}
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <button className="text-xs text-brand-600 hover:underline"
                  onClick={() => setSelectedCases(testcases.map((tc) => tc.id))}>Select all</button>
                <span className="text-gray-300">|</span>
                <button className="text-xs text-gray-500 hover:underline" onClick={() => setSelectedCases([])}>Clear</button>
              </div>
            </div>
          )}

          <button
            className="btn-primary"
            onClick={startRun}
            disabled={creating || !selectedProject || !selectedCases.length}
          >
            <Play size={16} />
            {creating ? 'Starting...' : 'Run Tests'}
          </button>
        </div>
      </div>

      {/* Runs list */}
      <div className="space-y-3">
        {runs.map((run) => (
          <div key={run.id} className="card p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {statusIcon[run.status] ?? statusIcon.pending}
                <div>
                  <p className="font-medium text-gray-900">{run.name}</p>
                  <p className="text-xs text-gray-400">{new Date(run.created_at).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {run.status === 'passed' || run.status === 'failed' ? (
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-green-600 font-medium">{run.passed} passed</span>
                    <span className="text-red-600 font-medium">{run.failed} failed</span>
                    <span className="text-gray-500">{run.skipped} skipped</span>
                    <span className="text-gray-400">{(run.duration / 1000).toFixed(1)}s</span>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 rounded-full h-2"
                        style={{ width: `${passRate(run)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-600">{passRate(run)}%</span>
                  </div>
                ) : (
                  <span className={`badge ${statusBadge[run.status] ?? 'badge-gray'}`}>{run.status}</span>
                )}
                {run.report_path && (
                  <a
                    href={`http://localhost:3001/api/reports/${run.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary text-xs py-1.5"
                  >
                    View Report
                  </a>
                )}
                <button onClick={() => remove(run.id)} className="text-gray-400 hover:text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {runs.length === 0 && (
          <div className="card p-12 text-center">
            <Play className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500 font-medium">No runs yet</p>
            <p className="text-gray-400 text-sm mt-1">Select test cases and start a run</p>
          </div>
        )}
      </div>
    </div>
  );
}
