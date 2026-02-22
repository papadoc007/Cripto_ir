import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { initSchema } from './db/schema.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
import addressRoutes from './routes/address.js';
import analyticsRoutes from './routes/analytics.js';
import queryRoutes from './routes/query.js';
import reportRoutes from './routes/report.js';
import sseRoutes from './routes/sse.js';

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/address', addressRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/sync', sseRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Error handler
app.use(errorHandler);

// Init DB and start
initSchema();
logger.info('Database initialized');

app.listen(config.port, () => {
  logger.info(`Server running on http://localhost:${config.port}`);
});
