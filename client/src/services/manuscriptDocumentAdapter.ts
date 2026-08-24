// src/services/manuscriptDocumentAdapter.ts
import { documentStore } from './documentStore';
import { ManuscriptWorkspace } from '../types/researchWorkspace.types';
import { UserProfile } from '../types/user.types';

/**
 * Manuscript Document Adapter (The Middle-Man Layer)
 * 
 * Strict boundary between Research Management Workflow and the Document/Editor subsystem.
 * Translates between research workspace records and underlying TipTap/Firestore document records.
 * NEVER accesses or exposes internal TipTap, Yjs, or ProseMirror state.
 */
export const manuscriptDocumentAdapter = {
  /**
   * Resolve or provision a linked document for a research workspace
   */
  async getOrCreateManuscriptDocument(
    workspace: ManuscriptWorkspace,
    userProfile: UserProfile
  ): Promise<{ documentId: string; editorUrl: string }> {
    if (!workspace) {
      throw new Error('No workspace provided to manuscript adapter.');
    }

    // 1. If workspace already has an active documentId, verify existence
    if (workspace.documentId) {
      try {
        const existingDoc = await documentStore.fetchDocument(workspace.documentId);
        if (existingDoc && existingDoc.id) {
          return {
            documentId: existingDoc.id,
            editorUrl: `/documents/${existingDoc.id}`,
          };
        }
      } catch (err) {
        console.warn('[ManuscriptAdapter] Existing document check fallback:', err);
      }
    }

    // 2. Provision new collaborative manuscript document via documentStore
    const documentTitle = workspace.title || 'Research Manuscript';
    const store = documentStore as any;
    const newDoc = await store.createDocument(documentTitle, userProfile, {
      groupId: workspace.groupId || '',
      projectId: workspace.projectId || workspace.proposalId || workspace.id,
      sourceType: 'native',
    });

    return {
      documentId: newDoc.id,
      editorUrl: `/documents/${newDoc.id}`,
    };
  },

  /**
   * Generate canonical editor navigation route for a document
   */
  getManuscriptEditorUrl(documentId: string): string {
    if (!documentId) return '/documents';
    return `/documents/${documentId}`;
  },

  /**
   * Fetch high-level document metadata for display in research workspace
   */
  async getDocumentMetadata(documentId: string): Promise<{
    title: string;
    updatedAt: string;
    collaboratorCount?: number;
  } | null> {
    if (!documentId) return null;
    try {
      const docData = await documentStore.fetchDocument(documentId);
      if (!docData) return null;
      return {
        title: docData.title || 'Untitled Manuscript',
        updatedAt: docData.updatedAt || new Date().toISOString(),
        collaboratorCount: docData.collaboratorCount || 1,
      };
    } catch (err) {
      console.warn('[ManuscriptAdapter] Failed to fetch document metadata:', err);
      return null;
    }
  },
};

export default manuscriptDocumentAdapter;
