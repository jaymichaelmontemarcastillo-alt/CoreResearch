import express from 'express';
import { generateConfig, downloadDocument, callbackHandler, createDocument } from '../controllers/onlyofficeController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Create a new blank document for ONLYOFFICE
router.post('/create', verifyToken, createDocument);

// Generate ONLYOFFICE configuration (requires auth)
router.get('/config/:documentId', verifyToken, generateConfig);

// Download the actual DOCX file (this is called by the ONLYOFFICE server, so it may need a different auth mechanism in production, or public access if using temporary signed URLs)
router.get('/download/:documentId', downloadDocument);

// Callback URL for ONLYOFFICE to save documents back to our server
// Important: ONLYOFFICE sends a POST request here
router.post('/callback', express.json(), callbackHandler);

export default router;
