/**
 * Truth Ledger API Server
 * Express server with middleware configuration
 */

import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pino } from 'pino';
import routes from './routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logger
export const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
    },
  },
});

// Create Express app
export function createApp() {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // JSON parsing
  app.use(express.json({ limit: '10mb' }));

  // Request logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info({
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${duration}ms`,
      });
    });

    next();
  });

  // API routes
  app.use('/api/v1', routes);

  // Serve UI in production
  const uiDistPath = path.join(__dirname, '../../ui/dist');
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(uiDistPath));
  }

  // Root endpoint - serve UI or API info
  app.get('/', (req, res, next) => {
    // In production, serve UI
    if (process.env.NODE_ENV === 'production') {
      return res.sendFile(path.join(uiDistPath, 'index.html'));
    }
    // In development, show API info
    res.json({
      name: 'Truth Ledger API',
      version: '0.1.0',
      description: 'Centralized fact-checking system for aerospace data',
      documentation: '/api/v1/docs',
      health: '/api/v1/health',
      stats: '/api/v1/stats',
      ui: 'Run `npm run dev:ui` to start the UI development server',
    });
  });

  // SPA fallback - serve index.html for all non-API routes in production
  if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res, next) => {
      // Skip API routes
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(uiDistPath, 'index.html'));
    });
  }

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not found',
      path: req.path,
    });
  });

  // Error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    logger.error({
      error: err.message,
      stack: err.stack,
      method: req.method,
      url: req.url,
    });

    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
    });
  });

  return app;
}

// Start server
export async function startServer(port: number = 3000) {
  const app = createApp();

  return new Promise<void>((resolve, reject) => {
    const server = app.listen(port, () => {
      logger.info(`Truth Ledger API server running on port ${port}`);
      logger.info(`Health check: http://localhost:${port}/api/v1/health`);
      resolve();
    });

    server.on('error', reject);
  });
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = parseInt(process.env.PORT || '3000', 10);
  startServer(port).catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
}
