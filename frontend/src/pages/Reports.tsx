import { useEffect, useState } from 'react';
import { BarChart3, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { api } from '../lib/api';
import type { Project, TestRun } from '../lib/api';

export default function Reports() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [runs, setRuns] = useState<TestRun[]>([]);

  useEffect(() => { api.projects.list().then(setProjects); }, []);
  useEffect(() => {
    if (selectedProject) api.runs.list(selectedProject).then(setRuns);
    else api.runs.list().then(setRuns);
  }, [selectedProject]);

  const completed = runs.filter((r) => r.status === 'passed' || r.status === 'failed');
  const totalTests = completed.reduce((s, r) => s + r.total, 0);
  const totalPassed = completed.reduce((s, r) => s + r.passed, 0);
  const totalFailed = completed.reduce((s, r) => s + r.failed, 0);
  const overallRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 mt-1 text-sm">Test results overview and history</p>
      </div>

      <div className="mb-6">
        <select className="input w-64" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
          <option value="">All projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Runs', value: completed.length, color: 'text-gray-900' },
          { label: 'Tests Run', value: totalTests, color: 'text-gray-900' },
          { label: 'Passed', value: totalPassed, color: 'text-green-600' },
          { label: 'Failed', value: totalFailed, color: 'text-red-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-5">
            <p className="text-sm text-gray-500">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Pass rate bar */}
      {completed.length > 0 && (
        <div className="card p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">Overall Pass Rate</h2>
            <span className={`text-2xl font-bold ${overallRate >= 80 ? 'text-green-600' : overallRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
              {overallRate}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`rounded-full h-3 transition-all ${overallRate >= 80 ? 'bg-green-500' : overallRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${overallRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Run history table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <BarChart3 size={18} /> Run History
          </h2>
        </div>
        {completed.length === 0 ? (
          <div className="p-12 text-center">
            <BarChart3 className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500">No completed runs yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Run', 'Date', 'Status', 'Passed', 'Failed', 'Skip', 'Duration', 'Pass Rate', 'Report'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {runs.map((run) => {
                  const rate = run.total > 0 ? Math.round((run.passed / run.total) * 100) : 0;
                  return (
                    <tr key={run.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{run.name}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(run.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        {run.status === 'passed' ? (
                          <span className="flex items-center gap-1 text-green-600"><CheckCircle size={14} /> Passed</span>
                        ) : run.status === 'failed' ? (
                          <span className="flex items-center gap-1 text-red-600"><XCircle size={14} /> Failed</span>
                        ) : (
                          <span className="badge-gray badge">{run.status}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-green-600 font-medium">{run.passed}</td>
                      <td className="px-4 py-3 text-red-600 font-medium">{run.failed}</td>
                      <td className="px-4 py-3 text-gray-500">{run.skipped}</td>
                      <td className="px-4 py-3 text-gray-500">{(run.duration / 1000).toFixed(1)}s</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div className="bg-green-500 rounded-full h-1.5" style={{ width: `${rate}%` }} />
                          </div>
                          <span className="text-xs text-gray-600">{rate}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {run.report_path && (
                          <a
                            href={`http://localhost:3001/api/reports/${run.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-600 hover:text-brand-700 flex items-center gap-1 text-xs"
                          >
                            Open <ExternalLink size={12} />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
