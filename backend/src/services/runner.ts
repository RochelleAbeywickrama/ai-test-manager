import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { getDb } from '../db/schema';
import { sendTestRunNotification } from './slack';

const execFileAsync = promisify(execFile);

interface RunResult {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  reportPath: string;
  status: 'passed' | 'failed' | 'error';
}

export async function executeTestRun(
  runId: string,
  projectId: string,
  testCaseIds: string[],
  framework: 'playwright' | 'cypress'
): Promise<void> {
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as
    | { name: string }
    | undefined;
  const run = db.prepare('SELECT * FROM test_runs WHERE id = ?').get(runId) as
    | { name: string; triggered_by: string }
    | undefined;

  if (!project || !run) throw new Error('Project or run not found');

  // Update status to running
  db.prepare('UPDATE test_runs SET status = ? WHERE id = ?').run('running', runId);

  const reportsDir = path.join(__dirname, '../../reports', runId);
  fs.mkdirSync(reportsDir, { recursive: true });

  try {
    // Write test files to a temp directory
    const tempDir = path.join(__dirname, '../../temp', runId);
    fs.mkdirSync(tempDir, { recursive: true });

    const testCases = db
      .prepare(
        `SELECT * FROM test_cases WHERE id IN (${testCaseIds.map(() => '?').join(',')})`
      )
      .all(...testCaseIds) as Array<{ id: string; title: string; code: string }>;

    for (const tc of testCases) {
      const ext = framework === 'playwright' ? 'spec.ts' : 'cy.ts';
      const fileName = `${tc.id}.${ext}`;
      fs.writeFileSync(path.join(tempDir, fileName), tc.code);
    }

    let result: RunResult;
    if (framework === 'playwright') {
      result = await runPlaywright(tempDir, reportsDir);
    } else {
      result = await runCypress(tempDir, reportsDir);
    }

    // Update run record
    db.prepare(`
      UPDATE test_runs SET
        status = ?, total = ?, passed = ?, failed = ?, skipped = ?,
        duration = ?, report_path = ?, completed_at = datetime('now')
      WHERE id = ?
    `).run(
      result.status,
      result.total,
      result.passed,
      result.failed,
      result.skipped,
      result.duration,
      result.reportPath,
      runId
    );

    // Send Slack notification
    await sendTestRunNotification({
      runName: run.name,
      projectName: project.name,
      status: result.status,
      total: result.total,
      passed: result.passed,
      failed: result.failed,
      skipped: result.skipped,
      duration: result.duration,
      triggeredBy: run.triggered_by,
      runId,
    });

    // Cleanup temp files
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (err) {
    db.prepare(`
      UPDATE test_runs SET status = 'error', completed_at = datetime('now') WHERE id = ?
    `).run(runId);
    throw err;
  }
}

async function runPlaywright(testDir: string, reportDir: string): Promise<RunResult> {
  const startTime = Date.now();
  const reportPath = path.join(reportDir, 'index.html');
  const jsonReportPath = path.join(reportDir, 'report.json');

  // Write a temp config so Playwright puts reports in the right place
  const configPath = path.join(reportDir, 'playwright.config.js');
  fs.writeFileSync(configPath, `module.exports = {
    testDir: ${JSON.stringify(testDir)},
    reporter: [
      ['html', { outputFolder: ${JSON.stringify(reportDir)}, open: 'never' }],
      ['json', { outputFile: ${JSON.stringify(jsonReportPath)} }],
    ],
  };`);

  try {
    await execFileAsync('npx', [
      'playwright',
      'test',
      '--config', configPath,
    ], { timeout: 300000 });
  } catch {
    // playwright exits with non-zero on test failures, continue to parse results
  }

  const duration = Date.now() - startTime;

  if (fs.existsSync(jsonReportPath)) {
    const report = JSON.parse(fs.readFileSync(jsonReportPath, 'utf-8'));
    const stats = report.stats || {};
    const failed = stats.unexpected || 0;
    const passed = stats.expected || 0;
    const skipped = stats.skipped || 0;
    return {
      total: passed + failed + skipped,
      passed,
      failed,
      skipped,
      duration,
      reportPath,
      status: failed > 0 ? 'failed' : 'passed',
    };
  }

  return { total: 0, passed: 0, failed: 0, skipped: 0, duration, reportPath, status: 'passed' };
}

async function runCypress(testDir: string, reportDir: string): Promise<RunResult> {
  const startTime = Date.now();
  const reportPath = path.join(reportDir, 'index.html');

  try {
    await execFileAsync('npx', [
      'cypress',
      'run',
      '--spec',
      `${testDir}/**/*.cy.ts`,
      '--reporter',
      'html',
      '--reporter-options',
      `reportDir=${reportDir},reportFilename=index`,
    ], { timeout: 300000 });
  } catch {
    // cypress exits with non-zero on failures
  }

  const duration = Date.now() - startTime;

  // Read mochawesome JSON if available
  try {
    const jsonFiles = fs.readdirSync(reportDir).filter((f) => f.endsWith('.json'));
    if (jsonFiles.length > 0) {
      const report = JSON.parse(fs.readFileSync(path.join(reportDir, jsonFiles[0]), 'utf-8'));
      const stats = report.stats || {};
      return {
        total: stats.tests || 0,
        passed: stats.passes || 0,
        failed: stats.failures || 0,
        skipped: stats.pending || 0,
        duration,
        reportPath,
        status: (stats.failures || 0) > 0 ? 'failed' : 'passed',
      };
    }
  } catch {
    // ignore
  }

  return { total: 0, passed: 0, failed: 0, skipped: 0, duration, reportPath, status: 'passed' };
}
