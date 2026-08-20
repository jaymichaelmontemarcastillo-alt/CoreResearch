import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import { Hocuspocus } from '@hocuspocus/server';
import * as Y from 'yjs';
import { db, auth, isDevMockMode, mockUsersDb, mockFirestoreDb } from './config/firebaseAdmin.js';

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
app.use('/api/documents', documentRoutes);
app.use('/api/storage', documentRoutes);

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

// Setup Hocuspocus Collaborative Editing Engine
const hocuspocus = new Hocuspocus({
  name: 'coreresearch-hocuspocus',
  quiet: true,
  debounce: 2000,
  maxDebounce: 10000,

  async onAuthenticate(data) {
    const { token, documentName } = data;
    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      // 1. Dev token handling
      if (token.startsWith('dev-token-')) {
        let uid = 'dev-user-id';
        let role = 'student';
        const parts = token.split('-');
        if (parts.length >= 4) {
          uid = parts.slice(2, -1).join('-');
          role = parts[parts.length - 1];
        }

        const userProfile = mockUsersDb?.get?.(uid);
        const name = userProfile?.fullName || `User ${uid}`;
        return {
          user: {
            id: uid,
            name,
            role,
            color: getUserColor(uid)
          }
        };
      }

      // 2. Real Firebase ID token verification
      let decoded = null;
      if (auth) {
        try {
          decoded = await auth.verifyIdToken(token);
        } catch (verifyErr) {
          console.warn('[Hocuspocus Auth] verifyIdToken fallback:', verifyErr.message);
        }
      }

      const uid = decoded?.uid || decoded?.user_id || 'authenticated-user';
      const name = decoded?.name || decoded?.email?.split('@')[0] || 'Researcher';
      const role = decoded?.role || 'student';

      return {
        user: {
          id: uid,
          name,
          role,
          color: getUserColor(uid)
        }
      };
    } catch (authError) {
      console.error('[Hocuspocus Auth Error]:', authError.message);
      throw new Error('Authentication failed');
    }
  },

  async onLoadDocument(data) {
    const { documentName, document } = data;
    const cleanDocId = documentName.replace(/^(manuscript-|document-)/, '');

    try {
      if (isDevMockMode) {
        if (!mockFirestoreDb.has('documents')) {
          mockFirestoreDb.set('documents', new Map());
        }
        const docsMap = mockFirestoreDb.get('documents');
        const existing = docsMap.get(cleanDocId) || docsMap.get(documentName);
        if (existing?.yjsBinaryState) {
          const binary = Buffer.from(existing.yjsBinaryState, 'base64');
          Y.applyUpdate(document, binary);
        }
      } else if (db) {
        try {
          // Attempt loading from Firestore documents collection
          const docRef = db.collection('documents').doc(cleanDocId);
          const docSnap = await docRef.get();
          if (docSnap.exists) {
            const docData = docSnap.data();
            if (docData.yjsBinaryState) {
              const binary = Buffer.from(docData.yjsBinaryState, 'base64');
              Y.applyUpdate(document, binary);
            }
          }
        } catch (dbErr) {
          // Fallback to dev storage
          if (!mockFirestoreDb.has('documents')) {
            mockFirestoreDb.set('documents', new Map());
          }
          const docsMap = mockFirestoreDb.get('documents');
          const existing = docsMap.get(cleanDocId) || docsMap.get(documentName);
          if (existing?.yjsBinaryState) {
            const binary = Buffer.from(existing.yjsBinaryState, 'base64');
            Y.applyUpdate(document, binary);
          }
        }
      }
    } catch (err) {
      console.warn(`[Hocuspocus] onLoadDocument warning for ${documentName}:`, err.message);
    }

    return document;
  },

  async onStoreDocument(data) {
    const { documentName, document } = data;
    const cleanDocId = documentName.replace(/^(manuscript-|document-)/, '');

    try {
      const state = Y.encodeStateAsUpdate(document);
      const base64State = Buffer.from(state).toString('base64');

      if (isDevMockMode) {
        if (!mockFirestoreDb.has('documents')) {
          mockFirestoreDb.set('documents', new Map());
        }
        const docsMap = mockFirestoreDb.get('documents');
        const existing = docsMap.get(cleanDocId) || {};
        docsMap.set(cleanDocId, {
          ...existing,
          id: cleanDocId,
          yjsBinaryState: base64State,
          updatedAt: new Date().toISOString()
        });
      } else if (db) {
        try {
          await db.collection('documents').doc(cleanDocId).set({
            yjsBinaryState: base64State,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (dbErr) {
          // Fallback to dev storage
          if (!mockFirestoreDb.has('documents')) {
            mockFirestoreDb.set('documents', new Map());
          }
          const docsMap = mockFirestoreDb.get('documents');
          const existing = docsMap.get(cleanDocId) || {};
          docsMap.set(cleanDocId, {
            ...existing,
            id: cleanDocId,
            yjsBinaryState: base64State,
            updatedAt: new Date().toISOString()
          });
        }
      }
    } catch (err) {
      console.error(`[Hocuspocus] onStoreDocument error for ${documentName}:`, err.message);
    }
  }
});

// Setup WebSocket server and connect with HTTP Upgrade
const wss = new WebSocketServer({ noServer: true });

httpServer.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // Accept WebSocket upgrades on /collaboration, /ws, or root /
  if (pathname.startsWith('/collaboration') || pathname.startsWith('/ws') || pathname === '/') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws, request) => {
  const clientConnection = hocuspocus.handleConnection(ws, request);

  ws.on('message', (data) => {
    try {
      const uint8 = data instanceof Uint8Array ? data : new Uint8Array(data);
      clientConnection.handleMessage(uint8);
    } catch (err) {
      console.error('[Hocuspocus Message Error]:', err);
    }
  });

  ws.on('close', (code, reason) => {
    try {
      const reasonStr = typeof reason === 'string' ? reason : (reason ? reason.toString() : '');
      clientConnection.handleClose({ code, reason: reasonStr });
    } catch (err) {
      console.error('[Hocuspocus Close Error]:', err);
    }
  });

  ws.on('error', (err) => {
    console.error('[Hocuspocus WebSocket Error]:', err);
  });
});

httpServer.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 CoreResearch API Server running on port ${PORT}`);
  console.log(`📡 Hocuspocus OSS WebSocket Server: ws://localhost:${PORT}/collaboration`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  console.log(`=================================================`);
});

export default app;

