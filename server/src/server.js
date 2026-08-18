import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import { Server } from '@hocuspocus/server';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import proposalRoutes from './routes/proposalRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import manuscriptRoutes from './routes/manuscriptRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import scheduleRoutes from './routes/scheduleRoutes.js';
import evaluationRoutes from './routes/evaluationRoutes.js';
import repositoryRoutes from './routes/repositoryRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Security & Middleware
app.use(helmet());
app.use(cors({
  origin: [CLIENT_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'CoreResearch API Server',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/manuscripts', manuscriptRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/repository', repositoryRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `API endpoint '${req.originalUrl}' does not exist.`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[ServerError]', err.stack || err);
  res.status(err.status || 500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred.'
  });
});

const httpServer = http.createServer(app);

// Setup Hocuspocus Open-Source Collaborative Editing Server
const hocuspocusServer = new Server({
  name: 'coreresearch-hocuspocus',
  httpServer,
  async onAuthenticate(data) {
    const { token } = data;
    if (!token) {
      throw new Error('Authentication required');
    }
    return {
      user: {
        id: data.connection?.readOnly ? 'guest' : 'collaborator',
      },
    };
  },
  async onLoadDocument(data) {
    return data.document;
  },
});

hocuspocusServer.setupHttpUpgrade();

httpServer.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 CoreResearch API Server running on port ${PORT}`);
  console.log(`📡 Hocuspocus OSS WebSocket Server: ws://localhost:${PORT}/collaboration`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  console.log(`=================================================`);
});

export default app;

