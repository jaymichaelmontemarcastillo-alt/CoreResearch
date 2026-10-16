import jwt from 'jsonwebtoken';
import { getStorageProvider } from '../services/storage/storageManager.js';
import { Document } from '../models/Document.js';
import { Document as DocxDocument, Packer, Paragraph, TextRun } from 'docx';
import path from 'path';

// MUST be configured in environment variables, fallback for dev only
const getJwtSecret = () => process.env.ONLYOFFICE_JWT_SECRET || 'mysecret';

/**
 * Generate configuration token for frontend ONLYOFFICE component
 */
export const generateConfig = async (req, res) => {
  try {
    const { documentId } = req.params;
    console.log(`[onlyofficeController] generateConfig called for documentId: "${documentId}"`);
    let document = await Document.findOne({ id: documentId });

    const user = req.user || {
      uid: req.headers['x-user-id'] || 'guest-user',
      fullName: req.headers['x-user-name'] || 'Researcher',
      role: req.headers['x-user-role'] || 'student'
    };

    const isExplicitPanelistMode = req.query.mode === 'panelist';
    const isExplicitReadMode = req.query.mode === 'read';
    const isAdmin = user.role === 'admin' || user.role === 'coordinator' || user.role === 'research_coordinator' || user.role === 'dean';
    const isAdviserOrPanelist = user.role === 'adviser' || user.role === 'panelist' || isExplicitPanelistMode;

    // Auto-initialize document in GridFS and MongoDB if missing
    if (!document) {
      console.log(`[onlyofficeController] Document not found in DB for id: "${documentId}". Auto-initializing document...`);
      try {
        const { Document: DocxDocument, Packer, Paragraph, TextRun } = await import('docx');
        const doc = new DocxDocument({
          styles: { default: { document: { run: { font: "Inter" } } } },
          sections: [{ properties: {}, children: [new Paragraph({ children: [new TextRun('Research Manuscript')] })] }]
        });
        const b64 = await Packer.toBase64String(doc);
        const fileBuffer = Buffer.from(b64, 'base64');
        const storageProvider = getStorageProvider();
        const storageKey = `documents/${documentId}/original/manuscript.docx`;
        await storageProvider.upload(storageKey, fileBuffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', { documentId, uploadedBy: user.uid });
        document = await Document.findOneAndUpdate(
          { id: documentId },
          { id: documentId, title: 'Research Manuscript', onlyofficeFileKey: storageKey, editorType: 'onlyoffice' },
          { upsert: true, new: true }
        );
      } catch (initErr) {
        console.error('[onlyofficeController] Auto-initialization error:', initErr);
        return res.status(404).json({ success: false, message: 'Document not found and could not be initialized.' });
      }
    }

    if (!document.onlyofficeFileKey) {
      return res.status(400).json({ success: false, message: 'Document has no ONLYOFFICE file key. Not migrated.' });
    }

    // Authorization Check: Admins and Research Coordinators have system-wide access to all manuscripts.
    // For students: ensure ownership or group membership.
    if (!isAdmin && !isAdviserOrPanelist && user.role === 'student' && user.uid !== 'guest-user') {
      const docAuthors = document.authors || [];
      const isAuthor = docAuthors.includes(user.uid) || document.ownerId === user.uid;
      let isGroupMember = false;
      if (document.groupId && user.groupId) {
        isGroupMember = document.groupId === user.groupId;
      }
      if (!isAuthor && !isGroupMember && (docAuthors.length > 0 || document.ownerId || document.groupId)) {
        return res.status(403).json({
          success: false,
          message: 'Access Restricted: You do not have permission to view other research groups\' private manuscripts.'
        });
      }
    }

    // Authorization Check for Panelists/Advisers (if document or schedule has assigned personnel)
    if (!isAdmin && isAdviserOrPanelist && user.uid !== 'guest-user') {
      const docAuthors = document.authors || [];
      const docPanelists = document.panelists || [];
      const docAdviser = document.adviser || '';

      const isAuthor = docAuthors.includes(user.uid);
      const isDocAdviser = docAdviser === user.uid;
      const isDocPanelist = docPanelists.includes(user.uid);

      if (!isAuthor && !isDocAdviser && !isDocPanelist && (docAuthors.length > 0 || docPanelists.length > 0 || docAdviser)) {
        // Also check Schedule model to see if assigned in defense schedule
        try {
          const { Schedule } = await import('../models/Schedule.js');
          const schedule = await Schedule.findOne({
            $or: [
              { projectId: document.id },
              { projectId: document.groupId },
              { projectTitle: document.title }
            ]
          }).lean();

          if (schedule) {
            const inSchedulePanelists = (schedule.panelists || []).some(p => p.id === user.uid || p.uid === user.uid);
            const inScheduleAdviser = schedule.adviserId === user.uid;

            if (!inSchedulePanelists && !inScheduleAdviser) {
              return res.status(403).json({
                success: false,
                message: 'Access Restricted: You do not have permission to access this manuscript. Only officially assigned personnel can review this document.'
              });
            }
          }
        } catch (authErr) {
          console.warn('[onlyofficeController] Schedule auth check warning:', authErr.message);
        }
      }
    }

    // The document URL must be reachable by the ONLYOFFICE server (which runs in Docker)
    const hostHeader = req.get('host') || '';
    const isLocal = hostHeader.includes('localhost') || hostHeader.includes('127.0.0.1');
    const defaultHost = isLocal ? 'http://host.docker.internal:5000' : `${req.protocol}://${hostHeader}`;
    const backendHost = process.env.BACKEND_PUBLIC_URL || defaultHost;
    const documentUrl = `${backendHost}/api/onlyoffice/download/${documentId}`;
    const callbackUrl = `${backendHost}/api/onlyoffice/callback?id=${documentId}`;

    // Inspection is read-only by default for Admins, Coordinators, Advisers, and Panelists.
    // Explicit edit mode must be permitted and requested.
    const isReadOnly = isAdviserOrPanelist || isExplicitReadMode || (isAdmin && req.query.mode !== 'edit');

    const config = {
      document: {
        fileType: 'docx',
        key: `${documentId}-${new Date(document.updated_at || Date.now()).getTime()}`, // cache buster
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
    const token = jwt.sign(config, getJwtSecret(), { expiresIn: '1h' });
    
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
    const document = await Document.findOne({ id: documentId });

    if (!document || !document.onlyofficeFileKey) {
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
    return res.status(500).json({ success: false, message: 'Failed to download document' });
  }
};

/**
 * Handle callbacks from ONLYOFFICE Document Server
 */
export const callbackHandler = async (req, res) => {
  try {
    const documentId = req.query.id;
    let payload = req.body;

    // If ONLYOFFICE sends the payload wrapped in a token field, we decode it
    if (payload.token) {
      payload = jwt.verify(payload.token, getJwtSecret());
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      const token = req.headers.authorization.substring(7);
      const decodedToken = jwt.verify(token, getJwtSecret());
      payload = decodedToken.payload || decodedToken; // ONLYOFFICE puts body in payload sometimes
    }

    const status = payload.status;
    console.log(`[ONLYOFFICE] Callback received for document ${documentId}, status: ${status}`);

    // Status 2: Document is ready for saving
    // Status 6: Force save
    if (status === 2 || status === 6) {
      const document = await Document.findOne({ id: documentId });
      if (!document || !document.onlyofficeFileKey) {
        console.error(`[ONLYOFFICE] Document ${documentId} not found for saving.`);
        return res.status(404).json({ error: 1, message: 'Document not found' });
      }

      // Download the updated DOCX from ONLYOFFICE
      const downloadUrl = payload.url;
      const fetch = (await import('node-fetch')).default || global.fetch; // fallback if global fetch is not available in node version
      const fileResponse = await fetch(downloadUrl);
      
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
    
    if (!documentId) {
      return res.status(400).json({ success: false, message: 'documentId is required' });
    }

    // Check if document already exists
    let document = await Document.findOne({ id: documentId });
    if (document) {
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
        editorType: 'onlyoffice'
      },
      { upsert: true, new: true }
    );

    return res.status(201).json({ success: true, document });
  } catch (error) {
    console.error('[onlyofficeController] createDocument error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create ONLYOFFICE document', error: error.message, stack: error.stack });
  }
};
