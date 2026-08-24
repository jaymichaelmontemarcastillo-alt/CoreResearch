// src/pages/Documents/hooks/useDocuments.js
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { groupService } from '../../../services/group.service';
import useTitleProposal from '../../../hooks/useTitleProposal';
import { documentService } from '../services/documentService';

export const useDocuments = () => {
  const { currentUser, userProfile, role } = useAuth();
  
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [group, setGroup] = useState(null);
  const [adviserGroupIds, setAdviserGroupIds] = useState(undefined);
  const [groupLoading, setGroupLoading] = useState(true);

  const isCoordinator = role === 'research_coordinator' || role === 'admin';
  const isStudent = role === 'student';

  // 1. Fetch user's group or adviser groups
  useEffect(() => {
    let isMounted = true;
    const fetchGroups = async () => {
      const uid = currentUser?.uid || userProfile?.uid;
      if (!uid) {
        if (isMounted) setGroupLoading(false);
        return;
      }
      try {
        if (role === 'student') {
          const g = await groupService.getGroupByStudentId(uid);
          if (isMounted) setGroup(g);
        } else if (role === 'adviser') {
          const groups = await groupService.getGroupsByAdviserId(uid);
          if (isMounted) setAdviserGroupIds(groups.map((g) => g.id));
        }
      } catch (err) {
        console.error('Failed to load user groups:', err);
      } finally {
        if (isMounted) setGroupLoading(false);
      }
    };

    fetchGroups();
    return () => { isMounted = false; };
  }, [role, currentUser, userProfile]);

  const noGroupAssigned = isStudent && !group && !groupLoading;

  // 2. Fetch proposals for legacy / uploaded attachments
  const { proposals, loading: proposalsLoading } = useTitleProposal(
    isCoordinator
      ? { coordinatorMode: true }
      : role === 'adviser'
      ? { adviserGroupIds: adviserGroupIds || [] }
      : group
      ? { groupId: group.id }
      : { fetchNone: noGroupAssigned }
  );

  // 3. Load Firestore document records
  const loadDocuments = useCallback(async () => {
    try {
      setLoadingDocs(true);
      const docs = await documentService.fetchDocuments(userProfile);
      setDocuments(docs);
    } catch (err) {
      console.warn('Failed to load documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  }, [userProfile]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // 4. Flatten proposal attachments
  const proposalDocs = useMemo(() => {
    const docs = [];
    (proposals || []).forEach((p) => {
      if (p.attachments && Array.isArray(p.attachments)) {
        p.attachments.forEach((att) => {
          docs.push({
            id: `proposal-${p.id}-${att.fileName}`,
            proposalId: p.id,
            proposalTitle: p.title,
            title: att.fileName,
            fileName: att.fileName,
            downloadUrl: att.downloadUrl,
            contentType: att.contentType || 'application/pdf',
            sourceType: att.fileName.endsWith('.docx') ? 'docx' : 'pdf',
            fileSize: att.fileSize || 0,
            createdAt: att.uploadedAt || p.createdAt || p.updatedAt || new Date().toISOString(),
            updatedAt: att.uploadedAt || p.updatedAt || new Date().toISOString(),
            lastOpenedAt: att.uploadedAt || p.updatedAt || new Date().toISOString(),
            ownerId: p.submittedBy || '',
            ownerName: p.submittedByName || 'Researcher',
            groupId: p.groupId || '',
            groupName: p.groupName || 'Research Team',
            isEditorDraft: false,
            isProposalAttachment: true,
          });
        });
      }
    });
    return docs;
  }, [proposals]);

  // 5. Combine Firestore Documents & Proposal Documents
  const allDocuments = useMemo(() => {
    const formattedDocs = documents.map((doc) => ({
      ...doc,
      groupName: doc.groupName || group?.name || (doc.groupId ? `Group ${doc.groupId}` : 'Research Team'),
      ownerName: doc.ownerName || userProfile?.fullName || 'Researcher',
    }));

    const combined = [...formattedDocs, ...proposalDocs];
    
    // Sort primarily by lastOpenedAt / updatedAt
    return combined.sort((a, b) => {
      const timeA = new Date(a.lastOpenedAt || a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.lastOpenedAt || b.updatedAt || b.createdAt).getTime();
      return timeB - timeA;
    });
  }, [documents, proposalDocs, group, userProfile]);

  const isLoading = groupLoading || proposalsLoading || loadingDocs;

  // Actions
  const handleCreateBlank = async () => {
    const newDoc = await documentService.createBlankDocument(
      'Untitled Document',
      userProfile,
      group
    );
    setDocuments((prev) => [newDoc, ...prev]);
    return newDoc;
  };

  const handleRename = async (id, newTitle) => {
    await documentService.renameDocument(id, newTitle);
    setDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, title: newTitle, fileName: newTitle, updatedAt: new Date().toISOString() } : d))
    );
  };

  const handleDelete = async (id) => {
    try {
      await documentService.deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error('Failed to delete document from Firebase:', err);
    }
  };

  const handleToggleFavorite = async (id, currentStatus) => {
    const nextStatus = !currentStatus;
    // Optimistic UI update
    setDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, isFavorite: nextStatus } : d))
    );
    await documentService.toggleFavorite(id, currentStatus);
  };

  const handleDocumentCreated = (newDoc) => {
    setDocuments((prev) => [newDoc, ...prev]);
  };

  return {
    allDocuments,
    isLoading,
    group,
    role,
    userProfile,
    currentUser,
    noGroupAssigned,
    createBlankDocument: handleCreateBlank,
    renameDocument: handleRename,
    deleteDocument: handleDelete,
    toggleFavorite: handleToggleFavorite,
    onDocumentCreated: handleDocumentCreated,
    refreshDocuments: loadDocuments,
  };
};
