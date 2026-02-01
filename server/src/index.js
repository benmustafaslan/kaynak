import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load .env from project root (works when running via "npm run dev" from root or from server/)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');
dotenv.config({ path: path.join(rootDir, '.env') });

import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import connectDB from './config/database.js';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { apiLimiter } from './middleware/rateLimit.js';
await connectDB();

const app = express();

app.use(helmet({ contentSecurityPolicy: env.nodeEnv === 'production' }));
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(apiLimiter);

app.use('/api', routes);

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// In production, serve the built React app so you can run everything at one URL
const clientDist = path.join(rootDir, 'client', 'dist');
if (env.nodeEnv === 'production' && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(async (err, req, res, next) => {
  if (env.nodeEnv === 'production') {
    console.error(err.message);
  } else {
    console.error(err.stack);
  }
  res.status(err.status || 500).json({
    error: env.nodeEnv === 'production' ? 'Internal server error' : err.message,
  });
});

app.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
});
