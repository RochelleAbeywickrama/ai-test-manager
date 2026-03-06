import { useEffect, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { Sparkles, FileCode2, Trash2, Wand2, Copy, Check, PenLine, Save } from 'lucide-react';
import { api } from '../lib/api';
import type { Project, TestCase, TestPlan } from '../lib/api';

type Mode = 'manual' | 'ai';

const STARTER_CODE = {
  playwright: `import { test, expect } from '@playwright/test';

test.describe('Feature', () => {
  test('should work correctly', async ({ page }) => {
    await page.goto('https://example.com');
    await expect(page).toHaveTitle(/Example/);
  });
});
`,
  cypress: `describe('Feature', () => {
  it('should work correctly', () => {
    cy.visit('https://example.com');
    cy.title().should('include', 'Example');
  });
});
`,
};

export default function TestCases() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [plans, setPlans] = useState<TestPlan[]>([]);
  const [testcases, setTestcases] = useState<TestCase[]>([]);
  const [selected, setSelected] = useState<TestCase | null>(null);
  const [selectedProject, setSelectedProject] = useState('');
  const [mode, setMode] = useState<Mode>('manual');
  const [feedback, setFeedback] = useState('');
  const [improving, setImproving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // manual form
  const [manualForm, setManualForm] = useState({ title: '', planId: '', code: '' });

  // ai form
  const [aiForm, setAiForm] = useState({ description: '', planId: '', context: '' });
  const [generating, setGenerating] = useState(false);

  useEffect(() => { api.projects.list().then(setProjects); }, []);

  useEffect(() => {
    if (selectedProject) {
      const proj = projects.find((p) => p.id === selectedProject);
      api.plans.list(selectedProject).then(setPlans);
      api.testcases.list({ projectId: selectedProject }).then(setTestcases);
      if (!manualForm.code) {
        setManualForm((f) => ({ ...f, code: STARTER_CODE[proj?.framework ?? 'playwright'] }));
      }
    }
  }, [selectedProject]);

  async function saveManual() {
    if (!selectedProject || !manualForm.title.trim() || !manualForm.code.trim()) return;
    setSaving(true);
    setError('');
    try {
      const tc = await api.testcases.create({
        projectId: selectedProject,
        title: manualForm.title,
        code: manualForm.code,
        planId: manualForm.planId || undefined,
      });
      setTestcases([tc, ...testcases]);
      setSelected(tc);
      setManualForm({ title: '', planId: '', code: '' });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save test case');
    } finally {
      setSaving(false);
    }
  }

  async function generate() {
    if (!selectedProject || !aiForm.description.trim()) return;
    setGenerating(true);
    setError('');
    try {
      const tc = await api.testcases.generate({
        projectId: selectedProject,
        description: aiForm.description,
        planId: aiForm.planId || undefined,
        context: aiForm.context || undefined,
      });
      setTestcases([tc, ...testcases]);
      setSelected(tc);
      setAiForm({ description: '', planId: '', context: '' });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate test case');
    } finally {
      setGenerating(false);
    }
  }

  async function improve() {
    if (!selected || !feedback.trim()) return;
    setImproving(true);
    try {
      const { code } = await api.testcases.improve(selected.id, feedback);
      const updated = { ...selected, code };
      setSelected(updated);
      setTestcases(testcases.map((tc) => tc.id === selected.id ? updated : tc));
      setFeedback('');
    } finally {
      setImproving(false);
    }
  }

  async function saveEdits() {
    if (!selected) return;
    await api.testcases.update(selected.id, { title: selected.title, code: selected.code });
  }

  async function remove(id: string) {
    if (!confirm('Delete this test case?')) return;
    await api.testcases.delete(id);
    setTestcases(testcases.filter((tc) => tc.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  async function copy() {
    if (!selected) return;
    await navigator.clipboard.writeText(selected.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex h-full">
      {/* Left panel */}
      <div className="w-72 border-r border-gray-200 flex flex-col bg-white">
        <div className="p-4 border-b border-gray-200">
          <select
            className="input text-sm"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            <option value="">Select project...</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {testcases.length === 0 ? (
            <div className="text-center py-12">
              <FileCode2 className="mx-auto text-gray-300 mb-2" size={36} />
              <p className="text-gray-400 text-sm">No test cases yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {testcases.map((tc) => (
                <div
                  key={tc.id}
                  onClick={() => setSelected(tc)}
                  className={`p-3 rounded-lg cursor-pointer group flex items-start justify-between gap-2 ${
                    selected?.id === tc.id ? 'bg-brand-50 border border-brand-200' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{tc.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{tc.framework}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); remove(tc.id); }}
                    className="text-gray-300 hover:text-red-500 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar — tabs + inputs */}
        <div className="border-b border-gray-200 bg-white">
          {/* Tabs */}
          <div className="flex border-b border-gray-100 px-5">
            <button
              onClick={() => setMode('manual')}
              className={`flex items-center gap-1.5 py-2.5 text-xs font-medium border-b-2 mr-4 transition-colors ${
                mode === 'manual' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <PenLine size={13} /> Write Manually
            </button>
            <button
              onClick={() => setMode('ai')}
              className={`flex items-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                mode === 'ai' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Sparkles size={13} /> Generate with AI
            </button>
          </div>

          <div className="p-4">
            {mode === 'manual' ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    className="input text-sm flex-1"
                    placeholder="Test case title"
                    value={manualForm.title}
                    onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })}
                  />
                  <select
                    className="input text-sm w-44"
                    value={manualForm.planId}
                    onChange={(e) => setManualForm({ ...manualForm, planId: e.target.value })}
                  >
                    <option value="">No plan (optional)</option>
                    {plans.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                  <button
                    className="btn-primary"
                    onClick={saveManual}
                    disabled={saving || !selectedProject || !manualForm.title.trim() || !manualForm.code.trim()}
                  >
                    <Save size={15} />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
                {error && <p className="text-red-600 text-xs">{error}</p>}
              </div>
            ) : (
              <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <textarea
                    className="input text-sm resize-none"
                    rows={2}
                    placeholder="Describe the test to generate. E.g.: Test that a user can log in with valid credentials and is redirected to the dashboard."
                    value={aiForm.description}
                    onChange={(e) => setAiForm({ ...aiForm, description: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <select
                      className="input text-sm"
                      value={aiForm.planId}
                      onChange={(e) => setAiForm({ ...aiForm, planId: e.target.value })}
                    >
                      <option value="">No plan (optional)</option>
                      {plans.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                    <input
                      className="input text-sm"
                      placeholder="Extra context (URL, credentials, etc.)"
                      value={aiForm.context}
                      onChange={(e) => setAiForm({ ...aiForm, context: e.target.value })}
                    />
                  </div>
                </div>
                <button
                  className="btn-primary self-start"
                  onClick={generate}
                  disabled={generating || !selectedProject || !aiForm.description.trim()}
                >
                  <Sparkles size={16} />
                  {generating ? 'Generating...' : 'Generate'}
                </button>
              </div>
            )}
            {mode === 'ai' && error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          </div>
        </div>

        {/* Code area */}
        {mode === 'manual' && !selected ? (
          // Manual new code entry
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-5 py-2 bg-gray-50 border-b border-gray-200">
              <p className="text-xs text-gray-500">Write your test code below, then click Save</p>
            </div>
            <div className="flex-1 overflow-auto">
              <CodeMirror
                value={manualForm.code}
                height="100%"
                extensions={[javascript({ typescript: true })]}
                onChange={(val) => setManualForm({ ...manualForm, code: val })}
                theme="light"
              />
            </div>
          </div>
        ) : selected ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Code header */}
            <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
              <div>
                <p className="font-medium text-gray-900 text-sm">{selected.title}</p>
                <p className="text-xs text-gray-400">{selected.framework}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={saveEdits} className="btn-secondary text-xs py-1.5">
                  <Save size={13} /> Save edits
                </button>
                <button onClick={copy} className="btn-secondary text-xs py-1.5">
                  {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                </button>
              </div>
            </div>

            {/* Code editor */}
            <div className="flex-1 overflow-auto">
              <CodeMirror
                value={selected.code}
                height="100%"
                extensions={[javascript({ typescript: true })]}
                onChange={(val) => {
                  const updated = { ...selected, code: val };
                  setSelected(updated);
                  setTestcases(testcases.map((tc) => tc.id === selected.id ? updated : tc));
                }}
                theme="light"
              />
            </div>

            {/* Improve with AI */}
            <div className="p-4 border-t border-gray-200 bg-white flex gap-3">
              <input
                className="input text-sm flex-1"
                placeholder="Improve with AI: e.g. add negative test cases, add retry logic..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && improve()}
              />
              <button className="btn-secondary" onClick={improve} disabled={improving || !feedback.trim()}>
                <Wand2 size={16} />
                {improving ? 'Improving...' : 'Improve with AI'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileCode2 className="mx-auto text-gray-200 mb-4" size={64} />
              <p className="text-gray-400 font-medium">Select a test case or write a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
