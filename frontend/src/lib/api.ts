const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// Projects
export const api = {
  projects: {
    list: () => request<Project[]>('/projects'),
    get: (id: string) => request<Project>(`/projects/${id}`),
    create: (data: Partial<Project>) => request<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Project>) => request('/projects/' + id, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request('/projects/' + id, { method: 'DELETE' }),
  },
  plans: {
    list: (projectId?: string) => request<TestPlan[]>(`/plans${projectId ? `?projectId=${projectId}` : ''}`),
    get: (id: string) => request<TestPlan>(`/plans/${id}`),
    create: (data: { projectId: string; title: string; plan: string; requirements?: string }) =>
      request<TestPlan>('/plans', { method: 'POST', body: JSON.stringify(data) }),
    generate: (projectId: string, requirements: string) =>
      request<TestPlan>('/plans/generate', { method: 'POST', body: JSON.stringify({ projectId, requirements }) }),
    update: (id: string, data: Partial<TestPlan>) => request('/plans/' + id, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request('/plans/' + id, { method: 'DELETE' }),
  },
  testcases: {
    list: (params?: { projectId?: string; planId?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return request<TestCase[]>(`/testcases${qs ? `?${qs}` : ''}`);
    },
    get: (id: string) => request<TestCase>(`/testcases/${id}`),
    create: (data: { projectId: string; title: string; code: string; description?: string; planId?: string }) =>
      request<TestCase>('/testcases', { method: 'POST', body: JSON.stringify(data) }),
    generate: (data: { projectId: string; description: string; planId?: string; context?: string }) =>
      request<TestCase>('/testcases/generate', { method: 'POST', body: JSON.stringify(data) }),
    improve: (id: string, feedback: string) =>
      request<{ code: string }>(`/testcases/${id}/improve`, { method: 'POST', body: JSON.stringify({ feedback }) }),
    update: (id: string, data: Partial<TestCase>) => request('/testcases/' + id, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request('/testcases/' + id, { method: 'DELETE' }),
  },
  runs: {
    list: (projectId?: string) => request<TestRun[]>(`/runs${projectId ? `?projectId=${projectId}` : ''}`),
    get: (id: string) => request<TestRun>(`/runs/${id}`),
    create: (data: { projectId: string; testCaseIds: string[]; name?: string; triggeredBy?: string }) =>
      request<TestRun>('/runs', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => request('/runs/' + id, { method: 'DELETE' }),
  },
  settings: {
    get: () => request<Record<string, string>>('/settings'),
    update: (data: Record<string, string>) => request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
    testSlack: (webhookUrl: string) =>
      request('/settings/test-slack', { method: 'POST', body: JSON.stringify({ webhookUrl }) }),
  },
};

// Types
export interface Project {
  id: string;
  name: string;
  description: string;
  framework: 'playwright' | 'cypress';
  created_at: string;
}

export interface TestPlan {
  id: string;
  project_id: string;
  title: string;
  requirements: string;
  plan: string;
  status: string;
  created_at: string;
}

export interface TestCase {
  id: string;
  project_id: string;
  plan_id: string | null;
  title: string;
  description: string;
  code: string;
  framework: 'playwright' | 'cypress';
  status: string;
  created_at: string;
}

export interface TestRun {
  id: string;
  project_id: string;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'error';
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  report_path: string | null;
  triggered_by: string;
  created_at: string;
  completed_at: string | null;
}
