import jwt from 'jsonwebtoken';
import { getStorageProvider } from '../services/storage/storageManager.js';
import { Document } from '../models/Document.js';
import { Document as DocxDocument, Packer, Paragraph, TextRun } from 'docx';
import { canAccessProject, isPrivilegedRole } from '../middleware/resourceAuthorization.js';

const getJwtSecret = () => {
  if (!process.env.ONLYOFFICE_JWT_SECRET) {
    throw new Error('ONLYOFFICE_JWT_SECRET must be configured.');
  }
  return process.env.ONLYOFFICE_JWT_SECRET;
};
const isValidDocumentId = (value) => typeof value === 'string' && /^[A-Za-z0-9_-]{1,200}$/.test(value);

/**
 * Generate configuration token for frontend ONLYOFFICE component
 */
export const generateConfig = async (req, res) => {
  try {
    const { documentId } = req.params;
    if (!isValidDocumentId(documentId)) {
      return res.status(400).json({ success: false, message: 'Invalid document ID.' });
    }
    const document = await Document.findOne({ id: documentId });
    const user = req.user;

    const isExplicitPanelistMode = req.query.mode === 'panelist';
    const isExplicitReadMode = req.query.mode === 'read';
    const isAdmin = isPrivilegedRole(user.role);
    const jwtSecret = getJwtSecret();
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    if (!document.onlyofficeFileKey) {
      return res.status(400).json({ success: false, message: 'Document has no ONLYOFFICE file key. Not migrated.' });
    }

    if (!(await canAccessProject(user, document.id, document.toObject()))) {
      return res.status(403).json({ success: false, message: 'You are not authorized to access this document.' });
    }

    // The document URL must be reachable by the ONLYOFFICE server (which runs in Docker)
    const hostHeader = req.get('host') || '';
    const isLocal = hostHeader.includes('localhost') || hostHeader.includes('127.0.0.1');
    const defaultHost = isLocal ? 'http://host.docker.internal:5000' : `${req.protocol}://${hostHeader}`;
    const backendHost = process.env.BACKEND_PUBLIC_URL || defaultHost;
    const documentKey = `${documentId}-${Date.now()}`;
    await Document.updateOne({ id: documentId }, { $set: { onlyofficeKey: documentKey } });
    const downloadToken = jwt.sign(
      { scope: 'onlyoffice:download', documentId, key: documentKey },
      jwtSecret,
      { expiresIn: '1h' }
    );
    const documentUrl = `${backendHost}/api/onlyoffice/download/${encodeURIComponent(documentId)}?token=${encodeURIComponent(downloadToken)}`;
    const callbackUrl = `${backendHost}/api/onlyoffice/callback?id=${encodeURIComponent(documentId)}`;

    // Advisers, Panelists, Admins, and Research Coordinators view in read-only mode.
    // Group student members edit the manuscript collaboratively.
    const isReviewOnlyRole = ['adviser', 'panelist', 'admin', 'research_coordinator', 'coordinator'].includes(user.role);
    const isReadOnly = isReviewOnlyRole || isExplicitPanelistMode || isExplicitReadMode;

    const config = {
      document: {
        fileType: 'docx',
        key: documentKey,
        title: document.title || 'Untitled Document',
        url: documentUrl,
        permissions: {
          edit: !isReadOnly,
          comment: true,
          chat: true,
          download: true,
          print: true,
          review: true,
          fillForms: false
        }
      },
      documentType: 'word',
      editorConfig: {
        callbackUrl,
        user: {
          id: user.uid,
          name: user.fullName
        },
        mode: isReadOnly ? 'view' : 'edit',
        customization: {
          compactHeader: false,
          toolbarNoTabs: false,
          hideRightMenu: false,
          forcesave: true
        }
      }
    };

    // Sign the config
    const token = jwt.sign(config, jwtSecret, { expiresIn: '1h' });
    
    return res.status(200).json({
      success: true,
      config,
      token
    });
  } catch (error) {
    console.error('[onlyofficeController] generateConfig error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate ONLYOFFICE config' });
  }
};

/**
 * Download the DOCX file directly to the ONLYOFFICE server
 */
export const downloadDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    if (!isValidDocumentId(documentId)) {
      return res.status(400).json({ success: false, message: 'Invalid document ID.' });
    }
    const token = req.query.token;
    if (typeof token !== 'string') {
      return res.status(401).json({ success: false, message: 'A valid download token is required.' });
    }
    const claims = jwt.verify(token, getJwtSecret());
    if (claims.scope !== 'onlyoffice:download' || claims.documentId !== documentId || typeof claims.key !== 'string') {
      return res.status(403).json({ success: false, message: 'Download token does not authorize this document.' });
    }

    const document = await Document.findOne({ id: documentId });

    if (!document || !document.onlyofficeFileKey || document.onlyofficeKey !== claims.key) {
      return res.status(404).json({ success: false, message: 'Document or file not found' });
    }

    const storageProvider = getStorageProvider();
    const stream = await storageProvider.downloadStream(document.onlyofficeFileKey);
    
    if (!stream) {
      return res.status(404).json({ success: false, message: 'Physical file not found in storage' });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${document.title || 'document'}.docx"`);
    
    stream.pipe(res);
  } catch (error) {
    console.error('[onlyofficeController] downloadDocument error:', error);
    if (['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error.name)) {
      return res.status(401).json({ success: false, message: 'Download token is invalid or expired.' });
    }
    return res.status(500).json({ success: false, message: 'Failed to download document' });
  }
};

/**
 * Handle callbacks from ONLYOFFICE Document Server
 */
export const callbackHandler = async (req, res) => {
  try {
    const documentId = req.query.id;
    const body = req.body;
    const bearer = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null;
    const token = typeof body?.token === 'string' ? body.token : bearer;
    if (!isValidDocumentId(documentId) || !token) {
      return res.status(401).json({ error: 1, message: 'A signed callback token and document ID are required.' });
    }

    const verified = jwt.verify(token, getJwtSecret());
    const payload = verified.payload || verified;
    if (!payload || typeof payload !== 'object' || !Number.isInteger(payload.status) || typeof payload.key !== 'string') {
      return res.status(400).json({ error: 1, message: 'Invalid ONLYOFFICE callback payload.' });
    }

    const status = payload.status;
    console.log(`[ONLYOFFICE] Callback received for document ${documentId}, status: ${status}`);

    const document = await Document.findOne({ id: documentId });
    if (!document || !document.onlyofficeFileKey || document.onlyofficeKey !== payload.key) {
      return res.status(403).json({ error: 1, message: 'Callback is not bound to this document.' });
    }

    // Status 2: Document is ready for saving
    // Status 6: Force save
    if (status === 2 || status === 6) {
      if (typeof payload.url !== 'string') {
        return res.status(400).json({ error: 1, message: 'Callback download URL is missing.' });
      }

      const configuredServer = process.env.ONLYOFFICE_DOCUMENT_SERVER_URL || process.env.ONLYOFFICE_URL;
      if (!configuredServer) {
        throw new Error('ONLYOFFICE_DOCUMENT_SERVER_URL must be configured to validate callback URLs.');
      }
      let downloadUrl;
      let allowedOrigin;
      try {
        downloadUrl = new URL(payload.url);
        allowedOrigin = new URL(configuredServer).origin;
      } catch {
        return res.status(400).json({ error: 1, message: 'Callback download URL is invalid.' });
      }
      if (downloadUrl.origin !== allowedOrigin || downloadUrl.username || downloadUrl.password) {
        return res.status(403).json({ error: 1, message: 'Callback download URL is not from the configured ONLYOFFICE server.' });
      }
      if (typeof fetch !== 'function') {
        throw new Error('Fetch API is unavailable in this Node.js runtime.');
      }
      const fileResponse = await fetch(downloadUrl, { redirect: 'error' });
      
      if (!fileResponse.ok) {
        throw new Error(`Failed to download updated document from ONLYOFFICE. Status: ${fileResponse.status}`);
      }
      
      const fileBuffer = Buffer.from(await fileResponse.arrayBuffer());
      
      // Save it over the existing GridFS file
      const storageProvider = getStorageProvider();
      await storageProvider.upload(
        document.onlyofficeFileKey,
        fileBuffer,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        { documentId, updatedBy: payload.users ? payload.users[0] : 'onlyoffice' }
      );
      
      console.log(`[ONLYOFFICE] Successfully saved document ${documentId}`);
    }

    // Must return this exact response format so ONLYOFFICE knows the callback was successful
    return res.status(200).json({ error: 0 });
  } catch (error) {
    console.error('[onlyofficeController] callbackHandler error:', error);
    if (['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error.name)) {
      return res.status(401).json({ error: 1, message: 'Callback token is invalid or expired.' });
    }
    // ONLYOFFICE considers any error > 0 as a failure.
    return res.status(500).json({ error: 1, message: error.message });
  }
};

/**
 * Create a new blank DOCX for ONLYOFFICE and initialize the MongoDocument
 */
export const createDocument = async (req, res) => {
  try {
    const { documentId, title } = req.body;
    
    if (!isValidDocumentId(documentId)) {
      return res.status(400).json({ success: false, message: 'documentId is required' });
    }

    const user = req.user;
    const projectId = req.body.projectId || req.body.groupId;
    if (projectId && !(await canAccessProject(user, projectId))) {
      return res.status(403).json({ success: false, message: 'You are not authorized to create a document for this project.' });
    }

    // Check if document already exists
    let document = await Document.findOne({ id: documentId });
    if (document) {
      if (!(await canAccessProject(user, document.id, document.toObject()))) {
        return res.status(403).json({ success: false, message: 'You are not authorized to access this document.' });
      }
      if (document.onlyofficeFileKey) {
        return res.status(200).json({ success: true, message: 'Document already exists', document });
      } else {
        // Document exists but has no onlyofficeFileKey -> it is a legacy Tiptap document.
        // We must NOT overwrite it with a blank DOCX. The migration script will handle it later.
        return res.status(409).json({ success: false, message: 'Document is a legacy Tiptap document', editorType: 'tiptap' });
      }
    }

    // Generate a blank DOCX with Inter font
    const doc = new DocxDocument({
      styles: {
        default: {
          document: {
            run: {
              font: "Inter",
            },
          },
        },
      },
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun(title || 'Untitled Document'),
            ],
          }),
        ],
      }],
    });
    const b64string = await Packer.toBase64String(doc);
    const fileBuffer = Buffer.from(b64string, 'base64');

    // Upload to GridFS
    const storageProvider = getStorageProvider();
    const cleanFileName = (title || 'untitled').replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `documents/${documentId}/original/${cleanFileName}.docx`;
    
    await storageProvider.upload(
      storageKey,
      fileBuffer,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      { documentId, uploadedBy: req.user?.uid || 'guest' }
    );

    // Create or update MongoDocument
    document = await Document.findOneAndUpdate(
      { id: documentId },
      { 
        id: documentId,
        title: title || 'Untitled Document',
        onlyofficeFileKey: storageKey,
        editorType: 'onlyoffice',
        ownerId: user.uid,
        ownerRole: user.role,
        authors: [user.uid],
        groupId: req.body.groupId || '',
        projectId: req.body.projectId || ''
      },
      { upsert: true, new: true }
    );

    return res.status(201).json({ success: true, document });
  } catch (error) {
    console.error('[onlyofficeController] createDocument error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create ONLYOFFICE document' });
  }
};
