// src/services/documentStore.js
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

const COLLECTION_NAME = 'documents';
const COMMENTS_SUBCOLLECTION = 'comments';
const VERSIONS_SUBCOLLECTION = 'versions';

// Memory/temporary session cache for instant UI response
const memoryDocCache = new Map();

export const DEFAULT_PAGE_SETTINGS = {
  size: 'letter', // 'letter' (8.5x11 in), 'a4' (8.27x11.69 in), 'legal' (8.5x14 in)
  orientation: 'portrait', // 'portrait' or 'landscape'
  marginTop: '1in',
  marginBottom: '1in',
  marginLeft: '1in',
  marginRight: '1in',
};

export const DEFAULT_EDITOR_SETTINGS = {
  fontFamily: 'Inter',
  fontSize: '11pt',
  lineSpacing: '1.5',
  page: DEFAULT_PAGE_SETTINGS,
};

export const documentStore = {
  /**
   * Fetch all documents from Firestore with optional user filter
   */
  fetchDocuments: async (userProfile = null) => {
    try {
      const colRef = collection(db, COLLECTION_NAME);
      const q = query(colRef, orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);

      const docs = snapshot.docs.map(snap => {
        const data = snap.data();
        const docObj = {
          id: snap.id,
          title: data.title || 'Untitled Document',
          ownerId: data.ownerId || '',
          ownerName: data.ownerName || 'Researcher',
          ownerRole: data.ownerRole || 'student',
          groupId: data.groupId || '',
          projectId: data.projectId || '',
          content: data.content || null,
          contentHtml: data.contentHtml || '',
          plainText: data.plainText || '',
          sourceType: data.sourceType || 'native',
          editorSettings: data.editorSettings || DEFAULT_EDITOR_SETTINGS,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
          updatedBy: data.updatedBy || '',
          collaboratorCount: data.collaboratorCount || 1,
        };
        memoryDocCache.set(snap.id, docObj);
        return docObj;
      });

      return docs;
    } catch (error) {
      console.warn('[documentStore] fetchDocuments error (using cache):', error.message);
      return Array.from(memoryDocCache.values());
    }
  },

  /**
   * Fetch a single document by ID from Firestore
   */
  fetchDocument: async (id) => {
    if (!id) return null;
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const docObj = {
          id: snap.id,
          title: data.title || 'Untitled Document',
          ownerId: data.ownerId || '',
          ownerName: data.ownerName || 'Researcher',
          ownerRole: data.ownerRole || 'student',
          groupId: data.groupId || '',
          projectId: data.projectId || '',
          content: data.content || null,
          contentHtml: data.contentHtml || '',
          plainText: data.plainText || '',
          sourceType: data.sourceType || 'native',
          editorSettings: {
            ...DEFAULT_EDITOR_SETTINGS,
            ...(data.editorSettings || {}),
            page: {
              ...DEFAULT_PAGE_SETTINGS,
              ...(data.pageSettings || {}),
              ...(data.editorSettings?.page || {})
            }
          },
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
          updatedBy: data.updatedBy || '',
          collaboratorCount: data.collaboratorCount || 1,
        };
        memoryDocCache.set(id, docObj);
        return docObj;
      }
    } catch (error) {
      console.warn(`[documentStore] fetchDocument error for ${id}:`, error.message);
    }

    // Fallback to cache if present
    if (memoryDocCache.has(id)) {
      return memoryDocCache.get(id);
    }

    return null;
  },

  /**
   * Synchronous getDocument helper (uses memory cache or fallback)
   */
  getDocument: (id) => {
    if (memoryDocCache.has(id)) {
      return memoryDocCache.get(id);
    }
    return {
      id,
      title: 'Untitled Document',
      ownerName: 'Researcher',
      editorSettings: DEFAULT_EDITOR_SETTINGS,
      updatedAt: new Date().toISOString(),
      collaboratorCount: 1
    };
  },

  /**
   * Synchronous getDocuments helper
   */
  getDocuments: () => {
    return Array.from(memoryDocCache.values());
  },

  /**
   * Create a new document in Firestore
   */
  createDocument: async (customTitle = '', userProfile = null, initialData = {}) => {
    const docId = initialData.id || `doc-${Date.now()}`;
    const now = new Date().toISOString();

    const newDoc = {
      id: docId,
      title: customTitle.trim() || 'Untitled Document',
      ownerId: userProfile?.uid || 'guest-user',
      ownerName: userProfile?.fullName || userProfile?.first_name || 'Researcher',
      ownerRole: userProfile?.role || 'student',
      groupId: initialData.groupId || '',
      projectId: initialData.projectId || '',
      content: initialData.content || null,
      contentHtml: initialData.contentHtml || '',
      plainText: initialData.plainText || '',
      editorSettings: {
        ...DEFAULT_EDITOR_SETTINGS,
        ...(initialData.editorSettings || {})
      },
      createdAt: now,
      updatedAt: now,
      updatedBy: userProfile?.uid || 'guest-user',
      collaboratorCount: 1,
    };

    memoryDocCache.set(docId, newDoc);

    try {
      const docRef = doc(db, COLLECTION_NAME, docId);
      await setDoc(docRef, newDoc);
    } catch (error) {
      console.warn('[documentStore] createDocument Firestore write error:', error.message);
    }

    return newDoc;
  },

  /**
   * Update document title in Firestore
   */
  updateDocumentTitle: async (id, newTitle) => {
    if (!id) return;
    const now = new Date().toISOString();
    
    // Update local cache
    const existing = memoryDocCache.get(id) || {};
    const updated = {
      ...existing,
      id,
      title: newTitle,
      updatedAt: now
    };
    memoryDocCache.set(id, updated);

    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await setDoc(docRef, {
        title: newTitle,
        updatedAt: now
      }, { merge: true });
    } catch (error) {
      console.warn(`[documentStore] updateDocumentTitle error for ${id}:`, error.message);
    }
  },

  /**
   * Real-time subscription to document changes in Firestore
   */
  subscribeDocument: (id, onUpdate, onError) => {
    if (!id) return () => {};
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      return onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const docObj = {
            id: snap.id,
            title: data.title || 'Untitled Document',
            ownerId: data.ownerId || '',
            ownerName: data.ownerName || 'Researcher',
            ownerRole: data.ownerRole || 'student',
            groupId: data.groupId || '',
            projectId: data.projectId || '',
            content: data.content || null,
            contentHtml: data.contentHtml || '',
            plainText: data.plainText || '',
            sourceType: data.sourceType || 'native',
            editorSettings: {
              ...DEFAULT_EDITOR_SETTINGS,
              ...(data.editorSettings || {}),
              page: {
                ...DEFAULT_PAGE_SETTINGS,
                ...(data.pageSettings || {}),
                ...(data.editorSettings?.page || {})
              }
            },
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
            updatedBy: data.updatedBy || '',
            collaboratorCount: data.collaboratorCount || 1,
          };
          memoryDocCache.set(id, docObj);
          if (onUpdate) onUpdate(docObj);
        }
      }, (err) => {
        console.warn(`[documentStore] subscribeDocument error for ${id}:`, err.message);
        if (onError) onError(err);
      });
    } catch (err) {
      console.warn(`[documentStore] subscribeDocument exception:`, err.message);
      return () => {};
    }
  },

  /**
   * Save complete Tiptap content state in Firestore
   */
  saveDocumentContent: async (id, contentJson, contentHtml = '', plainText = '', userProfile = null) => {
    if (!id) return;
    const now = new Date().toISOString();

    let cleanJson = null;
    if (contentJson) {
      if (typeof contentJson.getJSON === 'function') {
        cleanJson = contentJson.getJSON();
      } else if (typeof contentJson === 'object') {
        try {
          cleanJson = JSON.parse(JSON.stringify(contentJson));
        } catch (e) {
          cleanJson = null;
        }
      }
    }

    const existing = memoryDocCache.get(id) || {};
    const updated = {
      ...existing,
      id,
      content: cleanJson || existing.content || null,
      contentHtml: typeof contentHtml === 'string' ? contentHtml : '',
      plainText: typeof plainText === 'string' ? plainText : '',
      updatedAt: now,
      updatedBy: userProfile?.uid || existing.updatedBy || ''
    };
    memoryDocCache.set(id, updated);

    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const updateData = {
        updatedAt: now,
        updatedBy: userProfile?.uid || 'user'
      };
      if (cleanJson) updateData.content = cleanJson;
      if (typeof contentHtml === 'string') updateData.contentHtml = contentHtml;
      if (typeof plainText === 'string') updateData.plainText = plainText;

      await setDoc(docRef, updateData, { merge: true });
    } catch (error) {
      console.warn(`[documentStore] saveDocumentContent error for ${id}:`, error.message);
      throw error;
    }
  },

  /**
   * Save Page Settings (Size, Orientation, Margins) to Firestore
   */
  savePageSettings: async (id, pageSettings) => {
    if (!id || !pageSettings) return;
    const now = new Date().toISOString();

    const existing = memoryDocCache.get(id) || {};
    const currentSettings = existing.editorSettings || DEFAULT_EDITOR_SETTINGS;
    const updatedEditorSettings = {
      ...currentSettings,
      page: {
        ...currentSettings.page,
        ...pageSettings
      }
    };

    memoryDocCache.set(id, {
      ...existing,
      editorSettings: updatedEditorSettings,
      updatedAt: now
    });

    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await setDoc(docRef, {
        editorSettings: updatedEditorSettings,
        updatedAt: now
      }, { merge: true });
    } catch (error) {
      console.warn(`[documentStore] savePageSettings error for ${id}:`, error.message);
    }
  },

  /**
   * Delete a document from Firestore
   */
  deleteDocument: async (id) => {
    if (!id) return;
    memoryDocCache.delete(id);
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.warn(`[documentStore] deleteDocument error for ${id}:`, error.message);
    }
  },

  /**
   * Fetch eligible mentionable users for a document (group members, collaborators, users)
   */
  getEligibleMentionUsers: async (documentId) => {
    try {
      const { userService } = await import('./user.service');
      const allUsers = await userService.getAllUsers();
      return allUsers.map(u => ({
        id: u.uid || u.id,
        uid: u.uid || u.id,
        fullName: u.fullName || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'Researcher',
        first_name: u.first_name || '',
        role: u.role || 'student',
        department: u.department || '',
        profile_image: u.profile_image || '',
        email: u.email || '',
      }));
    } catch (err) {
      console.warn('[documentStore] getEligibleMentionUsers fallback:', err.message);
      return [];
    }
  },

  // ==================== COMMENTS SUBCOLLECTION ====================

  /**
   * Subscribe to real-time comments updates for a document
   */
  subscribeComments: (documentId, onUpdate, onError) => {
    if (!documentId) return () => {};
    try {
      const commentsCol = collection(db, COLLECTION_NAME, documentId, COMMENTS_SUBCOLLECTION);
      const q = query(commentsCol, orderBy('createdAt', 'asc'));

      return onSnapshot(q, (snapshot) => {
        const comments = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        onUpdate(comments);
      }, (err) => {
        console.warn(`[documentStore] subscribeComments error for ${documentId}:`, err.message);
        if (onError) onError(err);
      });
    } catch (error) {
      console.warn(`[documentStore] subscribeComments exception:`, error.message);
      return () => {};
    }
  },

  /**
   * Add a comment to a document in Firestore with mentions & notifications
   */
  addComment: async (documentId, commentData, userProfile = null) => {
    if (!documentId || !commentData.text) return null;
    const commentId = commentData.id || `comm_${Date.now()}`;
    const now = new Date().toISOString();
    const authorId = userProfile?.uid || 'unknown-user';
    const authorName = userProfile?.fullName || userProfile?.first_name || 'Researcher';
    const authorRole = userProfile?.role || 'student';
    const authorAvatar = userProfile?.profile_image || '';

    const newComment = {
      id: commentId,
      documentId,
      text: commentData.text,
      selectedText: commentData.selectedText || '',
      section: commentData.section || '',
      authorId,
      authorName,
      authorRole,
      authorAvatar,
      replyToUserId: commentData.replyToUserId || '',
      replyToUserName: commentData.replyToUserName || '',
      mentions: Array.isArray(commentData.mentions) ? commentData.mentions : [],
      resolved: false,
      replies: [],
      createdAt: now,
      updatedAt: now
    };

    try {
      const commentRef = doc(db, COLLECTION_NAME, documentId, COMMENTS_SUBCOLLECTION, commentId);
      await setDoc(commentRef, newComment);

      // Dispatch notifications to mentioned users
      if (newComment.mentions && newComment.mentions.length > 0) {
        try {
          const { notificationService } = await import('./notification.service');
          const docInfo = memoryDocCache.get(documentId) || {};
          const docTitle = docInfo.title || 'Manuscript';

          for (const mention of newComment.mentions) {
            if (mention.userId && mention.userId !== authorId) {
              await notificationService.createNotification({
                userId: mention.userId,
                title: 'Mentioned in Manuscript Comment',
                message: `${authorName} mentioned you in a comment on "${docTitle}"`,
                type: 'manuscript',
                linkUrl: `/documents/${documentId}`
              });
            }
          }
        } catch (notifErr) {
          console.warn('[documentStore] Mention notification dispatch warning:', notifErr.message);
        }
      }

      return newComment;
    } catch (error) {
      console.warn(`[documentStore] addComment error for ${documentId}:`, error.message);
      return newComment;
    }
  },

  /**
   * Update or resolve a comment in Firestore
   */
  updateComment: async (documentId, commentId, updates = {}) => {
    if (!documentId || !commentId) return;
    const now = new Date().toISOString();

    try {
      const commentRef = doc(db, COLLECTION_NAME, documentId, COMMENTS_SUBCOLLECTION, commentId);
      await updateDoc(commentRef, {
        ...updates,
        updatedAt: now
      });
    } catch (error) {
      console.warn(`[documentStore] updateComment error for ${commentId}:`, error.message);
    }
  },

  /**
   * Add a reply to an existing comment with mentions & notifications
   */
  addCommentReply: async (documentId, commentId, replyInput, userProfile = null) => {
    if (!documentId || !commentId) return;
    const now = new Date().toISOString();
    const authorId = userProfile?.uid || 'unknown-user';
    const authorName = userProfile?.fullName || userProfile?.first_name || 'Researcher';
    const authorRole = userProfile?.role || 'student';

    const text = typeof replyInput === 'string' ? replyInput.trim() : (replyInput.text || '').trim();
    if (!text) return;

    const parentReplyId = typeof replyInput === 'object' ? replyInput.parentReplyId || null : null;
    const replyToUserId = typeof replyInput === 'object' ? replyInput.replyToUserId || '' : '';
    const replyToUserName = typeof replyInput === 'object' ? replyInput.replyToUserName || '' : '';
    const mentions = typeof replyInput === 'object' && Array.isArray(replyInput.mentions) ? replyInput.mentions : [];

    try {
      const commentRef = doc(db, COLLECTION_NAME, documentId, COMMENTS_SUBCOLLECTION, commentId);
      const snap = await getDoc(commentRef);
      if (snap.exists()) {
        const commentData = snap.data();
        const replies = commentData.replies || [];
        const newReply = {
          id: `reply_${Date.now()}`,
          parentReplyId: parentReplyId || null,
          text,
          authorId,
          authorName,
          authorRole,
          replyToUserId: replyToUserId || commentData.authorId || '',
          replyToUserName: replyToUserName || commentData.authorName || '',
          mentions,
          createdAt: now
        };
        replies.push(newReply);
        await updateDoc(commentRef, { replies, updatedAt: now });

        // Dispatch notifications to parent author and mentioned users
        try {
          const { notificationService } = await import('./notification.service');
          const docInfo = memoryDocCache.get(documentId) || {};
          const docTitle = docInfo.title || 'Manuscript';

          // Notify parent comment author if not self
          if (commentData.authorId && commentData.authorId !== authorId) {
            await notificationService.createNotification({
              userId: commentData.authorId,
              title: 'New Reply on Manuscript Comment',
              message: `${authorName} replied to your comment on "${docTitle}"`,
              type: 'manuscript',
              linkUrl: `/documents/${documentId}`
            });
          }

          // Notify mentioned users in reply
          if (mentions.length > 0) {
            for (const mention of mentions) {
              if (mention.userId && mention.userId !== authorId && mention.userId !== commentData.authorId) {
                await notificationService.createNotification({
                  userId: mention.userId,
                  title: 'Mentioned in Manuscript Reply',
                  message: `${authorName} mentioned you in a reply on "${docTitle}"`,
                  type: 'manuscript',
                  linkUrl: `/documents/${documentId}`
                });
              }
            }
          }
        } catch (notifErr) {
          console.warn('[documentStore] Reply notification dispatch warning:', notifErr.message);
        }
      }
    } catch (error) {
      console.warn(`[documentStore] addCommentReply error:`, error.message);
    }
  },

  /**
   * Delete a comment from Firestore
   */
  deleteComment: async (documentId, commentId) => {
    if (!documentId || !commentId) return;
    try {
      const commentRef = doc(db, COLLECTION_NAME, documentId, COMMENTS_SUBCOLLECTION, commentId);
      await deleteDoc(commentRef);
    } catch (error) {
      console.warn(`[documentStore] deleteComment error:`, error.message);
    }
  },

  // ==================== VERSIONS SUBCOLLECTION ====================

  /**
   * Save a snapshot version of the document content
   */
  saveVersion: async (documentId, contentJson, userProfile = null, label = '') => {
    if (!documentId) return null;
    const versionId = `v_${Date.now()}`;
    const now = new Date().toISOString();
    const authorId = userProfile?.uid || 'unknown-user';
    const authorName = userProfile?.fullName || userProfile?.first_name || 'Researcher';

    let cleanJson = null;
    if (contentJson) {
      if (typeof contentJson.getJSON === 'function') {
        cleanJson = contentJson.getJSON();
      } else if (typeof contentJson === 'object') {
        try {
          cleanJson = JSON.parse(JSON.stringify(contentJson));
        } catch (e) {
          cleanJson = null;
        }
      }
    }

    const newVersion = {
      id: versionId,
      documentId,
      content: cleanJson,
      label: label.trim(),
      createdBy: authorId,
      createdByName: authorName,
      createdAt: now
    };

    try {
      const versionRef = doc(db, COLLECTION_NAME, documentId, VERSIONS_SUBCOLLECTION, versionId);
      await setDoc(versionRef, newVersion);
      return newVersion;
    } catch (error) {
      console.warn(`[documentStore] saveVersion error for ${documentId}:`, error.message);
      return null;
    }
  },

  /**
   * Subscribe to real-time version history updates for a document
   */
  subscribeVersions: (documentId, onUpdate, onError) => {
    if (!documentId) return () => {};
    try {
      const versionsCol = collection(db, COLLECTION_NAME, documentId, VERSIONS_SUBCOLLECTION);
      const q = query(versionsCol, orderBy('createdAt', 'desc'));

      return onSnapshot(q, (snapshot) => {
        const versions = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        onUpdate(versions);
      }, (err) => {
        console.warn(`[documentStore] subscribeVersions error for ${documentId}:`, err.message);
        if (onError) onError(err);
      });
    } catch (error) {
      console.warn(`[documentStore] subscribeVersions exception:`, error.message);
      return () => {};
    }
  }
};

