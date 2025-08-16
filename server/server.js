import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import paymentsRouter from './payments.routes.js';

dotenv.config();

const app = express();

// For webhook route we need raw body; so apply json parser except webhook
app.use((req, res, next) => {
  if (req.originalUrl === '/api/webhook') return next();
  express.json()(req, res, next);
});

app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api', paymentsRouter);

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
