// src/pages/Documents/services/documentService.js
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
} from 'firebase/firestore';
import { db } from '../../../firebase/firebase';
import { documentStore } from '../../../services/documentStore';
import { exportToDocx, exportToPdf } from '../../../utils/manuscriptExporter';

const COLLECTION_NAME = 'documents';

export const documentService = {
  /**
   * Fetch all documents from Firestore with rich metadata.
   */
  fetchDocuments: async (userProfile = null) => {
    try {
      const colRef = collection(db, COLLECTION_NAME);
      const q = query(colRef, orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);

      const docs = snapshot.docs.map((snap) => {
        const data = snap.data();
        return {
          id: snap.id,
          title: data.title || data.fileName || 'Untitled Document',
          fileName: data.fileName || data.title || 'Untitled Document',
          ownerId: data.ownerId || '',
          ownerName: data.ownerName || 'Researcher',
          ownerRole: data.ownerRole || 'student',
          groupId: data.groupId || '',
          groupName: data.groupName || (data.groupId ? `Group ${data.groupId}` : ''),
          projectId: data.projectId || '',
          content: data.content || null,
          contentHtml: data.contentHtml || '',
          plainText: data.plainText || '',
          sourceType: data.sourceType || 'native',
          originalFileUrl: data.originalFileUrl || null,
          previewUrl: data.previewUrl || null,
          fileSize: data.fileSize || 0,
          contentType: data.contentType || 'text/html',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
          lastOpenedAt: data.lastOpenedAt || data.updatedAt || new Date().toISOString(),
          isFavorite: Boolean(data.isFavorite),
          isEditorDraft: true,
        };
      });

      return docs;
    } catch (error) {
      console.warn('[documentService] fetchDocuments Firestore error, falling back to cache:', error);
      // Fallback using documentStore
      const fallbackDocs = await documentStore.fetchDocuments(userProfile);
      return fallbackDocs.map((d) => ({
        ...d,
        fileName: d.title,
        sourceType: d.sourceType || 'native',
        lastOpenedAt: d.lastOpenedAt || d.updatedAt || new Date().toISOString(),
        isEditorDraft: true,
      }));
    }
  },

  /**
   * Create a new blank document in Firestore
   */
  createBlankDocument: async (title = 'Untitled Document', userProfile = null, groupInfo = null) => {
    const docId = `doc-${Date.now()}`;
    const now = new Date().toISOString();

    const newDoc = {
      id: docId,
      title: title.trim() || 'Untitled Document',
      fileName: title.trim() || 'Untitled Document',
      ownerId: userProfile?.uid || 'guest-user',
      ownerName: userProfile?.fullName || userProfile?.first_name || 'Researcher',
      ownerRole: userProfile?.role || 'student',
      groupId: groupInfo?.id || '',
      groupName: groupInfo?.name || (groupInfo?.id ? `Group ${groupInfo.id}` : ''),
      projectId: '',
      content: null,
      contentHtml: '',
      plainText: '',
      sourceType: 'native',
      originalFileUrl: null,
      previewUrl: null,
      fileSize: 0,
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
      updatedBy: userProfile?.uid || 'guest-user',
      collaboratorCount: 1,
      isEditorDraft: true,
    };

    try {
      const docRef = doc(db, COLLECTION_NAME, docId);
      await setDoc(docRef, newDoc);
    } catch (e) {
      console.warn('[documentService] createBlankDocument write warning:', e.message);
    }

    return newDoc;
  },

  /**
   * Create an imported document record (DOCX / PDF) in Firestore
   */
  createImportedDocument: async ({
    id = null,
    title,
    sourceType,
    content = null,
    contentHtml = '',
    plainText = '',
    originalFileUrl = null,
    storagePath = null,
    fileSize = 0,
    contentType = '',
    pageSettings = null,
    userProfile = null,
    groupInfo = null,
  }) => {
    const docId = id || `doc-import-${Date.now()}`;
    const now = new Date().toISOString();

    const newDoc = {
      id: docId,
      title: title?.trim() || 'Imported Document',
      fileName: title?.trim() || 'Imported Document',
      ownerId: userProfile?.uid || 'guest-user',
      ownerName: userProfile?.fullName || userProfile?.first_name || 'Researcher',
      ownerRole: userProfile?.role || 'student',
      groupId: groupInfo?.id || '',
      groupName: groupInfo?.name || '',
      projectId: '',
      content: content || null,
      contentHtml,
      plainText,
      sourceType, // 'docx' | 'pdf'
      originalFileUrl,
      storagePath,
      previewUrl: null,
      fileSize,
      contentType,
      pageSettings: pageSettings || {
        size: 'letter',
        orientation: 'portrait',
        margins: { top: '1in', bottom: '1in', left: '1in', right: '1in' },
      },
      editorSettings: {
        page: pageSettings || {
          size: 'letter',
          orientation: 'portrait',
          margins: { top: '1in', bottom: '1in', left: '1in', right: '1in' },
        },
      },
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
      updatedBy: userProfile?.uid || 'guest-user',
      collaboratorCount: 1,
      isEditorDraft: true,
    };

    const serializedPayload = JSON.stringify(newDoc);
    console.log('[FIRESTORE WRITE] documentId:', docId);
    console.log('[FIRESTORE WRITE] total payload size:', serializedPayload.length, 'bytes');
    console.log('[FIRESTORE WRITE] content JSON size:', JSON.stringify(newDoc.content || {}).length, 'bytes');
    console.log('[FIRESTORE WRITE] plainText size:', (newDoc.plainText || '').length, 'chars');
    console.log('[FIRESTORE WRITE] contentHtml size:', (newDoc.contentHtml || '').length, 'chars');

    const docRef = doc(db, COLLECTION_NAME, docId);
    await setDoc(docRef, newDoc);

    return newDoc;
  },

  /**
   * Update document title (Rename)
   */
  renameDocument: async (id, newTitle) => {
    if (!id || !newTitle) return;
    const now = new Date().toISOString();

    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        title: newTitle.trim(),
        fileName: newTitle.trim(),
        updatedAt: now,
      });
      await documentStore.updateDocumentTitle(id, newTitle.trim());
    } catch (e) {
      console.warn('[documentService] renameDocument error:', e);
    }
  },

  /**
   * Update document last opened timestamp
   */
  recordLastOpened: async (id) => {
    if (!id) return;
    const now = new Date().toISOString();
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, { lastOpenedAt: now });
    } catch (e) {
      // Non-blocking
    }
  },

  /**
   * Toggle document favorite status
   */
  toggleFavorite: async (id, currentStatus = false) => {
    if (!id) return !currentStatus;
    const nextStatus = !currentStatus;
    const now = new Date().toISOString();
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, { 
        isFavorite: nextStatus,
        updatedAt: now,
      });
    } catch (e) {
      console.warn('[documentService] toggleFavorite error:', e);
    }
    return nextStatus;
  },

  /**
   * Delete document
   */
  deleteDocument: async (id) => {
    if (!id) return;
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
      await documentStore.deleteDocument(id);
    } catch (e) {
      console.warn('[documentService] deleteDocument error:', e);
    }
  },

  /**
   * Export document to DOCX
   */
  exportDocx: async (document) => {
    const html = document.contentHtml || `<h1>${document.title}</h1><p>${document.plainText || ''}</p>`;
    return exportToDocx(html, `${document.title || 'Document'}.docx`, document.title);
  },

  /**
   * Export document to PDF
   */
  exportPdf: async (document) => {
    const html = document.contentHtml || `<h1>${document.title}</h1><p>${document.plainText || ''}</p>`;
    return exportToPdf(html, `${document.title || 'Document'}.pdf`, document.title);
  },
};
