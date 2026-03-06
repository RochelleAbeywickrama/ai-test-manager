import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import projectsRouter from './routes/projects';
import plansRouter from './routes/plans';
import testCasesRouter from './routes/testcases';
import runsRouter from './routes/runs';
import reportsRouter from './routes/reports';
import settingsRouter from './routes/settings';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/projects', projectsRouter);
app.use('/api/plans', plansRouter);
app.use('/api/testcases', testCasesRouter);
app.use('/api/runs', runsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/settings', settingsRouter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`AI Test Manager backend running on http://localhost:${PORT}`);
});
