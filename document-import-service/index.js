import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { connectDB } from './src/config/db.js';
import { documentImportService } from './src/services/import/DocumentImportService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Setup Multer for temp file uploads
const upload = multer({
  dest: 'temp_uploads/',
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Security & Middleware
app.use(helmet());
const allowedOrigins = [
  'https://coreresearch-33a17.web.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-user-id',
    'x-user-name',
    'x-user-role',
    'x-group-id',
  ],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight for all routes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check Endpoint (Required for Cloud Run)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'CoreResearch Document Import Service' });
});

// Import Endpoint
app.post('/api/import', upload.single('file'), async (req, res) => {
  try {
    console.log(`[Import Service] Received DOCX import request!`);
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    const file = req.file;
    // Basic user extraction, since this service doesn't need to do auth verification directly,
    // we assume the main API Gateway/Firebase handles auth, or we pass user data in the body/headers.
    const userProfile = {
      uid: req.headers['x-user-id'] || req.body.userId || 'guest-user',
      fullName: req.headers['x-user-name'] || 'Researcher',
      role: req.headers['x-user-role'] || 'student',
    };

    let groupInfo = null;
    if (req.body?.groupInfo) {
      try {
        groupInfo = typeof req.body.groupInfo === 'string' ? JSON.parse(req.body.groupInfo) : req.body.groupInfo;
      } catch (e) {
        console.warn(`[Import Service] Failed to parse groupInfo:`, e.message);
      }
    }

    const documentRecord = await documentImportService.importDocument({
      filePath: file.path,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      userProfile,
      groupInfo,
    });

    // Clean up temp file
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    return res.status(201).json({
      success: true,
      message: 'Document imported and structured successfully.',
      document: documentRecord,
    });
  } catch (error) {
    console.error('[Import Service] Import error CAUGHT:', error);
    
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
    }

    return res.status(500).json({
      success: false,
      error: 'Import Failed',
      message: error.message || 'An error occurred while importing the document.',
    });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Import Service Error]', err.stack || err);
  
  // Ensure CORS headers are on error responses
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      error: 'CORS Error',
      message: 'Origin not allowed'
    });
  }

  res.status(err.status || 500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred.'
  });
});

const startServer = async () => {
  // Connect to MongoDB using the shared db.js config
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 Dedicated Document Import Service running on port ${PORT}`);
  });
};

startServer();
