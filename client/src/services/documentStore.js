// src/services/documentStore.js

const STORAGE_KEY = 'core_research_documents_list';

const defaultDocuments = [
  {
    id: 'research-manuscript-123',
    title: 'Research Manuscript - Final',
    updatedAt: new Date().toISOString(),
    ownerId: 'user-admin-01',
    ownerName: 'Dean Elizabeth Warren',
    collaboratorCount: 3,
  },
  {
    id: 'chapter-1-draft',
    title: 'Chapter 1: Introduction (Draft)',
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    ownerId: 'prof123',
    ownerName: 'Professor Cruz',
    collaboratorCount: 1,
  }
];

export const documentStore = {
  getDocuments: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultDocuments));
      return defaultDocuments;
    } catch (e) {
      return defaultDocuments;
    }
  },

  getDocument: (id) => {
    const docs = documentStore.getDocuments();
    const found = docs.find(d => d.id === id);
    if (found) return found;

    return {
      id,
      title: 'Untitled Document',
      updatedAt: new Date().toISOString(),
      ownerName: 'Researcher',
      collaboratorCount: 1
    };
  },

  createDocument: (customTitle = '', userProfile = null) => {
    const docs = documentStore.getDocuments();
    const newDoc = {
      id: `doc-${Date.now()}`,
      title: customTitle.trim() || 'Untitled Document',
      updatedAt: new Date().toISOString(),
      ownerId: userProfile?.uid || 'guest-user',
      ownerName: userProfile?.fullName || userProfile?.first_name || 'Researcher',
      collaboratorCount: 1
    };
    const updatedDocs = [newDoc, ...docs];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedDocs));
    return newDoc;
  },

  updateDocumentTitle: (id, newTitle) => {
    const docs = documentStore.getDocuments();
    let updated = false;
    const updatedDocs = docs.map(doc => {
      if (doc.id === id) {
        updated = true;
        return {
          ...doc,
          title: newTitle,
          updatedAt: new Date().toISOString()
        };
      }
      return doc;
    });

    if (!updated) {
      updatedDocs.unshift({
        id,
        title: newTitle,
        updatedAt: new Date().toISOString(),
        ownerName: 'Researcher',
        collaboratorCount: 1
      });
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedDocs));
  },

  deleteDocument: (id) => {
    const docs = documentStore.getDocuments();
    const filtered = docs.filter(doc => doc.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return filtered;
  }
};
