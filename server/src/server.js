import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { db, auth, isDevMockMode, mockUsersDb, mockFirestoreDb } from './config/firebaseAdmin.js';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { Document as MongoDocument } from './models/Document.js';


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
import documentRoutes from './routes/documentRoutes.js';
import workspaceRoutes from './routes/workspaceRoutes.js';
import adviserMatchingRoutes from './routes/adviserMatchingRoutes.js';
import onlyofficeRoutes from './routes/onlyofficeRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Helper for consistent collaborator color generation
const getUserColor = (userId) => {
  const colors = ['#f56565', '#ed8936', '#ecc94b', '#48bb78', '#38b2ac', '#4299e1', '#667eea', '#9f7aea', '#ed64a6'];
  let hash = 0;
  const str = String(userId || 'user');
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Security & Middleware
app.use(helmet());
app.use(cors({
  origin: [CLIENT_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173', 'https://coreresearch-33a17.web.app', 'https://coreresearch-33a17.firebaseapp.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-user-id',
    'x-user-name',
    'x-user-role',
    'x-group-id',
    'x-requested-with',
    'Accept',
    'Origin',
  ],
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

// Public Client Config Endpoint — serves runtime config to the frontend
// so env vars like ONLYOFFICE_SERVER_URL don't need to be baked into the build.
app.get('/api/config', (req, res) => {
  res.status(200).json({
    onlyofficeServerUrl: process.env.ONLYOFFICE_SERVER_URL || 'http://localhost:8080/',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/workspace', workspaceRoutes);
app.use('/api/adviser-matching', adviserMatchingRoutes);
app.use('/api/manuscripts', manuscriptRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/repository', repositoryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/storage', documentRoutes);
app.use('/api/onlyoffice', onlyofficeRoutes);

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


const startServer = async () => {
  await connectDB();

  httpServer.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`🚀 CoreResearch API Server running on port ${PORT}`);
    console.log(`🌐 Health check: http://0.0.0.0:${PORT}/api/health`);
    console.log(`=================================================`);
  });
};

startServer();

export default app;

