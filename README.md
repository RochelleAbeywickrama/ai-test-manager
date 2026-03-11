# AI Test Manager

An AI-powered test management tool to plan, write, run, and report on tests — with GitHub Actions CI/CD and Slack notifications.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Database | SQLite (zero config, file-based) |
| AI | Anthropic Claude API (`claude-sonnet-4-6`) |
| Test Frameworks | Playwright, Cypress |
| CI/CD | GitHub Actions + Self-hosted runners |
| Notifications | Slack Incoming Webhooks |

---

## Prerequisites

- Node.js 20+
- npm
- An Anthropic API key (for AI features) — get one at https://console.anthropic.com
- Playwright or Cypress installed in your test project (for running tests)

---

## Quick Start

### 1. Clone and install dependencies

```bash
git clone https://github.com/RochelleAbeywickrama/ai-test-manager.git
cd ai-test-manager

# Install root dependencies
npm install --cache /tmp/npm-cache

# Install backend dependencies
npm install --cache /tmp/npm-cache --prefix backend

# Install frontend dependencies
npm install --prefix frontend
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
ANTHROPIC_API_KEY=sk-ant-api03-...   # Required for AI features
PORT=3001
FRONTEND_URL=http://localhost:5173
```

> **Without an API key:** All features work except AI plan generation, AI test case generation, and AI test improvement.

### 3. Start the app

```bash
npm run dev
```

This starts both servers concurrently:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001

---

## Project Structure

```
ai-test-manager/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   └── schema.ts          # SQLite schema & connection
│   │   ├── routes/
│   │   │   ├── projects.ts        # Project CRUD
│   │   │   ├── plans.ts           # Test plan CRUD + AI generation
│   │   │   ├── testcases.ts       # Test case CRUD + AI generation
│   │   │   ├── runs.ts            # Test run execution
│   │   │   ├── reports.ts         # Report serving
│   │   │   └── settings.ts        # App settings (Slack, etc.)
│   │   ├── services/
│   │   │   ├── ai.ts              # Claude API integration
│   │   │   ├── runner.ts          # Playwright/Cypress test runner
│   │   │   └── slack.ts           # Slack webhook notifications
│   │   └── index.ts               # Express app entry point
│   ├── .env                       # Environment variables (not committed)
│   ├── .env.example               # Environment variable template
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.tsx         # Sidebar navigation layout
│   │   ├── pages/
│   │   │   ├── Projects.tsx       # Project management
│   │   │   ├── Plans.tsx          # Test plans
│   │   │   ├── TestCases.tsx      # Test case editor
│   │   │   ├── Runs.tsx           # Test run management
│   │   │   ├── Reports.tsx        # Reports dashboard
│   │   │   └── Settings.tsx       # App settings
│   │   ├── lib/
│   │   │   └── api.ts             # API client + TypeScript types
│   │   └── App.tsx                # Routes
│   └── package.json
├── .github/
│   └── workflows/
│       ├── test-pipeline.yml              # GitHub Actions CI workflow
│       └── self-hosted-runner-setup.sh   # Self-hosted runner setup script
└── package.json                   # Root scripts (runs both servers)
```

---

## Features & Usage

### Projects

Create a project to group your test plans, test cases, and runs.

1. Go to **Projects** → **New Project**
2. Enter a name, optional description, and select your test framework (Playwright or Cypress)
3. Click **Create Project**

> Deleting a project also deletes all its plans, test cases, and runs.

---

### Test Plans

Create structured test plans manually or generate them with AI.

**Write Manually:**
1. Go to **Test Plans** → select **Write Manually** tab
2. Select a project
3. Enter a title and write your plan in Markdown
4. Click **Save Plan**

**Generate with AI** *(requires API key)*:
1. Select the **Generate with AI** tab
2. Select a project
3. Paste your requirements or feature description
4. Click **Generate Test Plan** — Claude writes a full structured plan

---

### Test Cases

Write test code in the built-in editor or generate it with AI.

**Write Manually:**
1. Go to **Test Cases** → select your project
2. Select the **Write Manually** tab
3. Enter a title and write your test code (starter template provided)
4. Click **Save**

**Generate with AI** *(requires API key)*:
1. Select the **Generate with AI** tab
2. Describe the test in plain English
3. Optionally link to a test plan and add extra context (URL, credentials, etc.)
4. Click **Generate** — Claude writes complete, runnable Playwright or Cypress code

**Edit & Improve:**
- Click any saved test case to open it in the editor
- Edit the code directly and click **Save edits**
- Use the **Improve with AI** bar at the bottom to refine with natural language *(requires API key)*

---

### Test Runs

Execute your test cases and monitor results in real time.

1. Go to **Test Runs**
2. Select a project
3. Optionally name the run (e.g. "Regression - Sprint 12")
4. Check the test cases to include (or use **Select all**)
5. Click **Run Tests**

The run status polls automatically every 3 seconds. When complete, click **View Report** to open the HTML test report.

---

### Reports

View test history and pass rate analytics.

- Filter by project or view all projects
- Summary cards: total runs, tests run, passed, failed
- Overall pass rate progress bar
- Full run history table with per-run stats and report links

---

### Settings

Configure Slack notifications for test run results.

1. Go to **Settings**
2. Paste your Slack Incoming Webhook URL
3. Set the channel name
4. Choose whether to notify on failure, success, or both
5. Click **Send Test Message** to verify the connection
6. Click **Save Settings**

To create a Slack Incoming Webhook:
- Go to your Slack workspace → **Apps** → search "Incoming Webhooks"
- Or visit: https://api.slack.com/messaging/webhooks

---

## GitHub Actions Integration

A ready-to-use workflow is included at `.github/workflows/test-pipeline.yml`.

### Setup

Add these secrets to your GitHub repository (**Settings → Secrets and variables → Actions**):

| Secret | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `SLACK_WEBHOOK_URL` | Your Slack incoming webhook URL |
| `TEST_MANAGER_URL` | URL of your deployed backend (e.g. `http://your-server:3001`) |

### Triggering a run

**Automatic:** Runs on push to `main` or `develop`, and on pull requests to `main`.

**Manual dispatch:**
1. Go to your repo → **Actions** → **AI Test Pipeline** → **Run workflow**
2. Enter your Project ID (copy from the Projects page URL or API)
3. Optionally enter specific test case IDs (comma-separated) or leave empty to run all
4. Enter a custom run name

### Self-hosted Runners

To use a self-hosted runner instead of GitHub-hosted:

**On your runner machine:**
```bash
chmod +x .github/workflows/self-hosted-runner-setup.sh
./.github/workflows/self-hosted-runner-setup.sh
```

Then follow the printed instructions to register the runner in GitHub.

**Enable self-hosted in the workflow:**

Go to your repo → **Settings → Actions → Variables → New repository variable**:
```
Name:  USE_SELF_HOSTED
Value: true
```

---

## API Reference

The backend exposes a REST API at `http://localhost:3001/api`.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create a project |
| DELETE | `/api/projects/:id` | Delete a project (cascades) |
| GET | `/api/plans?projectId=` | List test plans |
| POST | `/api/plans` | Create a plan manually |
| POST | `/api/plans/generate` | Generate a plan with AI |
| GET | `/api/testcases?projectId=` | List test cases |
| POST | `/api/testcases` | Create a test case manually |
| POST | `/api/testcases/generate` | Generate a test case with AI |
| POST | `/api/testcases/:id/improve` | Improve a test case with AI |
| GET | `/api/runs?projectId=` | List test runs |
| POST | `/api/runs` | Start a new test run |
| GET | `/api/runs/:id` | Get run status & results |
| GET | `/api/reports/:runId` | View HTML test report |
| GET | `/api/settings` | Get settings |
| PUT | `/api/settings` | Update settings |
| POST | `/api/settings/test-slack` | Send a Slack test message |
| GET | `/health` | Health check |

---

## Available Scripts

From the root `ai-test-manager/` directory:

```bash
npm run dev              # Start both frontend and backend in dev mode
npm run dev:backend      # Start backend only
npm run dev:frontend     # Start frontend only
npm run build            # Build frontend for production
npm run install:all      # Install all dependencies (backend + frontend)
```

---

## Troubleshooting

**Blank page on first load**
Ensure both servers are running (`npm run dev`). Check the browser console for errors.

**Port already in use**
```bash
# Kill processes on dev ports
lsof -ti tcp:3001 | xargs kill -9
lsof -ti tcp:5173 | xargs kill -9
npm run dev
```

**AI features not working**
- Ensure `ANTHROPIC_API_KEY` in `backend/.env` starts with `sk-ant-`
- Get a valid key at https://console.anthropic.com
- Restart the backend after updating `.env`

**Delete project not working**
Fixed in the current version — the delete cascades to all child records automatically.

**npm install permission error**
```bash
npm install --cache /tmp/npm-cache
```

**Slack test message fails**
- Verify the webhook URL starts with `https://hooks.slack.com/services/`
- Ensure the Slack app is still installed in your workspace
