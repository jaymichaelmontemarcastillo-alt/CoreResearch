import mongoose from 'mongoose';
import { db, isDevMockMode, mockFirestoreDb } from '../config/firebaseAdmin.js';
import { seedMockRepositoryIfEmpty } from './repositoryController.js';
import { Comment as MongoComment } from '../models/Comment.js';

// Pre-seed mock manuscript version history & drafts if empty
const defaultDraftContentHtml = `<h1 style="text-align: center; color: #1e293b;">Smart IoT Moisture & Nutrient Sensing System for Urban Farming</h1>
<p style="text-align: center; font-style: italic; color: #64748b;">A Research Manuscript Submitted to the Faculty of College of Computer Studies</p>
<hr style="margin: 20px 0; border: 0; border-top: 1px solid #cbd5e1;" />
<h2>Abstract</h2>
<p>Urban farming has rapidly emerged as a sustainable solution to address food security in high-density metropolitan areas. However, precision resource management remains a challenge for urban gardeners. This study introduces an automated IoT-based soil moisture and nutrient monitoring framework that integrates custom electrochemical sensor nodes with dynamic cloud analytics. Empirical evaluations demonstrate a 34% reduction in water usage and a 22% improvement in crop yield efficiency compared to traditional manual schedule irrigation.</p>

<h2>1. Introduction</h2>
<p>Food sustainability in contemporary urban environments demands innovative agricultural technologies. Traditional farming relies heavily on manual observation and calendar-based irrigation schedules, which frequently lead to either overwatering or nutrient depletion.</p>

<h3>1.1 Background of the Study</h3>
<p>Micro-climate variability in rooftop and indoor vertical farms poses unique environmental stressors. Microcontroller-based wireless sensor networks (WSNs) provide continuous telemetric observation of soil water potential and key N-P-K nutrient indicators.</p>

<h3>1.2 Statement of the Problem</h3>
<p>Specifically, this research addresses the following problems:</p>
<ul>
  <li>Inconsistent soil moisture monitoring leading to root hypoxia in automated urban hydroponic systems.</li>
  <li>Lack of real-time multi-node wireless telemetry for small-scale indoor plant beds.</li>
  <li>High latency and cost associated with commercial agricultural laboratory soil testing kits.</li>
</ul>

<h2>2. Review of Related Literature</h2>
<p>Recent work by Chen et al. (2023) highlighted the efficacy of capacitive moisture sensors in vertical farming modules. Furthermore, Gutierrez & Lopez (2024) developed an ambient humidity feedback loop that reduced pump duty cycles by 18%.</p>

<h2>3. Methodology</h2>
<p>The proposed system architecture comprises three primary tiers: (1) Edge Sensing Layer, (2) IoT Gateway & Signal Processing Layer, and (3) Cloud Analytics & Advisory Web Platform.</p>`;

const seedMockManuscriptsIfEmpty = () => {
  if (!mockFirestoreDb.has('manuscripts')) {
    mockFirestoreDb.set('manuscripts', new Map());
  }

  // Seed live draft storage if empty
  if (!mockFirestoreDb.has('manuscript_drafts')) {
    const draftsMap = new Map();
    draftsMap.set('proj-501', {
      projectId: 'proj-501',
      projectTitle: 'Smart IoT Moisture & Nutrient Sensing System for Urban Farming',
      contentHtml: defaultDraftContentHtml,
      lastSavedBy: 'dev-student-01',
      lastSavedByName: 'Alex Rivera',
      updatedAt: new Date().toISOString()
    });
    draftsMap.set('proj-502', {
      projectId: 'proj-502',
      projectTitle: 'AI-Powered Automated Code Quality & Vulnerability Assessor',
      contentHtml: `<h1>AI-Powered Automated Code Quality & Vulnerability Assessor</h1><p>Draft manuscript under initial development by Marcus Vance & group.</p>`,
      lastSavedBy: 'dev-student-02',
      lastSavedByName: 'Marcus Vance',
      updatedAt: new Date().toISOString()
    });
    draftsMap.set('proj-503', {
      projectId: 'proj-503',
      projectTitle: 'Blockchain-Based Verifiable Academic Credential Ledger',
      contentHtml: `<h1>Blockchain-Based Verifiable Academic Credential Ledger</h1><p>Draft manuscript under review for Chapter 1-2.</p>`,
      lastSavedBy: 'dev-student-03',
      lastSavedByName: 'Ethan Vance',
      updatedAt: new Date().toISOString()
    });
    mockFirestoreDb.set('manuscript_drafts', draftsMap);
  }

  // Seed comments storage if empty
  if (!mockFirestoreDb.has('manuscript_comments')) {
    const commentsMap = new Map();
    commentsMap.set('proj-501', [
      {
        id: 'comm-101',
        projectId: 'proj-501',
        text: 'Please expand the literature review in Section 2 to cite recent 2024 IEEE papers on capacitive sensor calibration.',
        selectedText: 'Recent work by Chen et al. (2023) highlighted the efficacy of capacitive moisture sensors',
        section: '2. Review of Related Literature',
        page: 2,
        authorId: 'dev-adviser-01',
        authorName: 'Dr. Eleanor Vance',
        authorRole: 'adviser',
        createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
        resolved: false,
        replies: []
      },
      {
        id: 'comm-102',
        projectId: 'proj-501',
        text: 'Ensure the block diagram for the Edge Sensing Layer in Chapter 3 includes microcontroller pinouts.',
        selectedText: '(1) Edge Sensing Layer',
        section: '3. Methodology',
        page: 3,
        authorId: 'dev-adviser-01',
        authorName: 'Dr. Eleanor Vance',
        authorRole: 'adviser',
        createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        resolved: false,
        replies: []
      }
    ]);
    mockFirestoreDb.set('manuscript_comments', commentsMap);
  }
};

/**
 * Upload manuscript version record & automatically publish to Institutional Repository
 */
export const uploadManuscriptVersion = async (req, res) => {
  try {
    const {
      projectId,
      projectTitle,
      title,
      fileName,
      fileSize,
      versionTag,
      fileUrl,
      notes,
      authors,
      adviserName,
      department,
      publicationYear,
      abstract,
      keywords,
      publishToRepository = true
    } = req.body;
    const user = req.user;

    if (!fileName && !title && !projectTitle) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'File or manuscript title is required.'
      });
    }

    const versionNumber = versionTag || 'v1.0';
    const effectiveTitle = title || projectTitle || (fileName ? fileName.replace(/\.[^/.]+$/, '') : 'Research Project Manuscript');
    
    // Parse authors
    const parsedAuthors = Array.isArray(authors)
      ? authors.filter(Boolean)
      : (typeof authors === 'string' && authors.trim()
          ? authors.split(',').map(a => a.trim()).filter(Boolean)
          : [user.fullName || user.email.split('@')[0] || 'Student Researcher']);

    // Parse keywords
    const parsedKeywords = Array.isArray(keywords)
      ? keywords.filter(Boolean)
      : (typeof keywords === 'string' && keywords.trim()
          ? keywords.split(',').map(k => k.trim()).filter(Boolean)
          : ['Research', 'Manuscript']);

    const effectiveDepartment = department || 'Computer Science';
    const effectiveAdviser = adviserName || 'Faculty Adviser';
    const effectiveAbstract = abstract || notes || `Full research manuscript submission for ${effectiveTitle}.`;
    const effectiveYear = Number(publicationYear) || new Date().getFullYear();
    const effectiveFileUrl = fileUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    const effectiveFileName = fileName || `${effectiveTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_${versionNumber}.pdf`;

    const newManuscript = {
      id: `ms-${Date.now()}`,
      projectId: projectId || 'proj-501',
      projectTitle: effectiveTitle,
      title: effectiveTitle,
      authors: parsedAuthors,
      adviserName: effectiveAdviser,
      department: effectiveDepartment,
      abstract: effectiveAbstract,
      keywords: parsedKeywords,
      versionNumber,
      fileName: effectiveFileName,
      fileSize: fileSize || 1048576,
      fileUrl: effectiveFileUrl,
      uploadedBy: user.uid,
      uploaderName: user.fullName || user.email.split('@')[0],
      notes: notes || '',
      status: 'under_review',
      isPublicInRepository: Boolean(publishToRepository),
      createdAt: new Date().toISOString()
    };

    // Save manuscript version
    if (isDevMockMode) {
      seedMockManuscriptsIfEmpty();
      const map = mockFirestoreDb.get('manuscripts');
      map.set(newManuscript.id, newManuscript);
    } else {
      try {
        await db.collection('manuscript_versions').doc(newManuscript.id).set(newManuscript);
      } catch (err) {
        console.warn('[ManuscriptController] Firestore write fallback to mock mode:', err.message);
        seedMockManuscriptsIfEmpty();
        const map = mockFirestoreDb.get('manuscripts');
        map.set(newManuscript.id, newManuscript);
      }
    }

    // Automatically publish to Public Repository
    let newPublication = null;
    if (publishToRepository !== false) {
      newPublication = {
        id: `repo-${Date.now()}`,
        projectId: projectId || 'proj-501',
        manuscriptId: newManuscript.id,
        title: effectiveTitle,
        authors: parsedAuthors,
        adviserName: effectiveAdviser,
        department: effectiveDepartment,
        publicationYear: effectiveYear,
        abstract: effectiveAbstract,
        keywords: parsedKeywords,
        pdfUrl: effectiveFileUrl,
        fileName: effectiveFileName,
        fileSize: fileSize || 1048576,
        citation: `${parsedAuthors.join(', ')} (${effectiveYear}). ${effectiveTitle}. CoreResearch Institutional Repository.`,
        viewsCount: 1,
        downloadsCount: 0,
        versionNumber,
        publishedAt: new Date().toISOString()
      };

      if (isDevMockMode) {
        seedMockRepositoryIfEmpty();
        const repoMap = mockFirestoreDb.get('repository');
        repoMap.set(newPublication.id, newPublication);
      } else {
        try {
          await db.collection('repository_publications').doc(newPublication.id).set(newPublication);
        } catch (err) {
          console.warn('[RepositoryController] Firestore write fallback to mock mode:', err.message);
          seedMockRepositoryIfEmpty();
          const repoMap = mockFirestoreDb.get('repository');
          repoMap.set(newPublication.id, newPublication);
        }
      }
    }

    return res.status(201).json({
      success: true,
      message: `Manuscript version ${versionNumber} submitted and published to repository successfully.`,
      data: newManuscript,
      publication: newPublication
    });
  } catch (error) {
    console.error('[ManuscriptController] uploadManuscriptVersion error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get manuscript version history for a project
 */
export const getManuscriptVersions = async (req, res) => {
  try {
    const { projectId } = req.params;
    let list = [];

    if (isDevMockMode) {
      seedMockManuscriptsIfEmpty();
      const map = mockFirestoreDb.get('manuscripts');
      list = Array.from(map.values());
    } else {
      try {
        const snapshot = await db.collection('manuscript_versions').get();
        list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (err) {
        console.warn('[ManuscriptController] Firestore read fallback to mock mode:', err.message);
        seedMockManuscriptsIfEmpty();
        const map = mockFirestoreDb.get('manuscripts');
        list = Array.from(map.values());
      }
    }

    if (projectId && projectId !== 'all') {
      list = list.filter(m => m.projectId === projectId);
    }

    // Sort descending by date
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({
      success: true,
      count: list.length,
      data: list
    });
  } catch (error) {
    console.error('[ManuscriptController] getManuscriptVersions error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Update manuscript status (Adviser & Admin)
 */
export const updateManuscriptStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const valid = ['under_review', 'revisions_requested', 'approved'];
    if (!valid.includes(status)) {
      return res.status(400).json({ success: false, error: `Invalid status '${status}'` });
    }

    let updated = null;

    if (isDevMockMode) {
      seedMockManuscriptsIfEmpty();
      const map = mockFirestoreDb.get('manuscripts');
      const ms = map.get(id);
      if (!ms) {
        return res.status(404).json({ success: false, error: 'Manuscript not found' });
      }
      ms.status = status;
      map.set(id, ms);
      updated = ms;
    } else {
      const ref = db.collection('manuscript_versions').doc(id);
      await ref.update({ status });
      const doc = await ref.get();
      updated = { id: doc.id, ...doc.data() };
    }

    return res.status(200).json({
      success: true,
      message: `Manuscript version status updated to '${status}'.`,
      data: updated
    });
  } catch (error) {
    console.error('[ManuscriptController] updateManuscriptStatus error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get Advisories list for current logged-in Adviser
 */
export const getAdvisories = async (req, res) => {
  try {
    const user = req.user;
    seedMockManuscriptsIfEmpty();

    const initialAdvisories = [
      {
        id: 'proj-501',
        title: 'Smart IoT Moisture & Nutrient Sensing System for Urban Farming',
        department: 'Computer Science',
        groupName: 'Group 1 - IoT BioTech',
        members: [
          { name: 'Alex Rivera', role: 'Group Leader', email: 'alex.rivera@university.edu' },
          { name: 'Maria Santos', role: 'Lead Developer', email: 'maria.santos@university.edu' }
        ],
        status: 'under_review',
        latestVersion: 'v1.1',
        lastUpdated: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
        adviserId: user.uid || 'dev-adviser-01',
        adviserName: user.fullName || 'Dr. Eleanor Vance'
      },
      {
        id: 'proj-502',
        title: 'AI-Powered Automated Code Quality & Vulnerability Assessor',
        department: 'Computer Science',
        groupName: 'Group 2 - NeuralCode',
        members: [
          { name: 'Marcus Vance', role: 'Group Leader', email: 'marcus.vance@university.edu' },
          { name: 'Sophia Reyes', role: 'ML Engineer', email: 'sophia.reyes@university.edu' }
        ],
        status: 'revisions_requested',
        latestVersion: 'v1.0',
        lastUpdated: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
        adviserId: user.uid || 'dev-adviser-01',
        adviserName: user.fullName || 'Dr. Eleanor Vance'
      },
      {
        id: 'proj-503',
        title: 'Blockchain-Based Verifiable Academic Credential Ledger',
        department: 'Information Technology',
        groupName: 'Group 3 - ChainTrust',
        members: [
          { name: 'Ethan Vance', role: 'Group Leader', email: 'ethan.vance@university.edu' },
          { name: 'Chloe Tan', role: 'Smart Contract Dev', email: 'chloe.tan@university.edu' }
        ],
        status: 'in_progress',
        latestVersion: 'v0.9',
        lastUpdated: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
        adviserId: user.uid || 'dev-adviser-01',
        adviserName: user.fullName || 'Dr. Eleanor Vance'
      }
    ];

    let advisoriesList = initialAdvisories;

    if (!isDevMockMode) {
      try {
        const snapshot = await db.collection('research_projects')
          .where('adviserId', '==', user.uid)
          .get();
        if (!snapshot.empty) {
          advisoriesList = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              title: data.title,
              department: data.department || 'Computer Studies',
              groupName: data.groupName || `Group - ${data.studentName}`,
              members: [
                { name: data.studentName || 'Student Leader', role: 'Group Leader', email: data.studentEmail || '' }
              ],
              status: data.status || 'under_review',
              latestVersion: data.latestVersion || 'v1.0',
              lastUpdated: data.updatedAt || new Date().toISOString(),
              adviserId: data.adviserId,
              adviserName: data.adviserName
            };
          });
        }
      } catch (err) {
        console.warn('[ManuscriptController] getAdvisories Firestore query fallback:', err.message);
      }
    }

    return res.status(200).json({
      success: true,
      count: advisoriesList.length,
      data: advisoriesList
    });
  } catch (error) {
    console.error('[ManuscriptController] getAdvisories error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get live draft manuscript content for a project
 */
export const getManuscriptDraft = async (req, res) => {
  try {
    const { projectId } = req.params;
    seedMockManuscriptsIfEmpty();

    let draft = null;

    if (isDevMockMode) {
      const draftsMap = mockFirestoreDb.get('manuscript_drafts');
      draft = draftsMap.get(projectId);
      if (!draft) {
        draft = {
          projectId,
          projectTitle: 'Research Project Manuscript',
          contentHtml: defaultDraftContentHtml,
          lastSavedBy: req.user.uid,
          lastSavedByName: req.user.fullName || req.user.email,
          updatedAt: new Date().toISOString()
        };
        draftsMap.set(projectId, draft);
      }
    } else {
      const docRef = db.collection('manuscript_drafts').doc(projectId);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        draft = { projectId: docSnap.id, ...docSnap.data() };
      } else {
        draft = {
          projectId,
          projectTitle: 'Research Project Manuscript',
          contentHtml: defaultDraftContentHtml,
          lastSavedBy: req.user.uid,
          lastSavedByName: req.user.fullName || req.user.email,
          updatedAt: new Date().toISOString()
        };
        await docRef.set(draft);
      }
    }

    return res.status(200).json({
      success: true,
      data: draft
    });
  } catch (error) {
    console.error('[ManuscriptController] getManuscriptDraft error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Save / auto-save manuscript live draft content
 */
export const saveManuscriptDraft = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { contentHtml, projectTitle } = req.body;
    const user = req.user;

    if (!contentHtml && contentHtml !== '') {
      return res.status(400).json({ success: false, error: 'contentHtml is required' });
    }

    const updatedDraft = {
      projectId,
      projectTitle: projectTitle || 'Research Project Manuscript',
      contentHtml,
      lastSavedBy: user.uid,
      lastSavedByName: user.fullName || user.email.split('@')[0],
      updatedAt: new Date().toISOString()
    };

    if (isDevMockMode) {
      seedMockManuscriptsIfEmpty();
      const draftsMap = mockFirestoreDb.get('manuscript_drafts');
      draftsMap.set(projectId, updatedDraft);
    } else {
      await db.collection('manuscript_drafts').doc(projectId).set(updatedDraft, { merge: true });
    }

    return res.status(200).json({
      success: true,
      message: 'Draft auto-saved successfully.',
      data: updatedDraft
    });
  } catch (error) {
    console.error('[ManuscriptController] saveManuscriptDraft error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get inline comments / feedback for a project's manuscript
 */
export const getManuscriptComments = async (req, res) => {
  try {
    const { projectId } = req.params;
    seedMockManuscriptsIfEmpty();

    let comments = [];
    let fetchedFromMongo = false;

    try {
      if (mongoose.connection.readyState === 1) {
        const mongoDocs = await MongoComment.find({ documentId: projectId }).lean();
        if (mongoDocs) {
          comments = mongoDocs.map(doc => ({
            id: doc.id,
            projectId: doc.documentId,
            text: doc.content,
            selectedText: doc.selectedText || '',
            section: doc.section || 'General',
            page: doc.page || 1,
            authorId: doc.authorUid,
            authorName: doc.authorName,
            authorRole: doc.authorRole,
            createdAt: doc.createdAt,
            resolved: doc.resolved,
            replies: doc.replies || [],
            yjsRelativePosition: doc.yjsRelativePosition,
            anchorNodeId: doc.anchorNodeId
          }));
          fetchedFromMongo = true;
        }
      }
    } catch (mongoErr) {
      console.warn('[ManuscriptController] MongoDB get comments warning:', mongoErr.message);
    }

    if (!fetchedFromMongo) {
      if (isDevMockMode) {
        const commentsMap = mockFirestoreDb.get('manuscript_comments');
        if (commentsMap) {
          comments = commentsMap.get(projectId) || [];
        }
      } else {
        const snapshot = await db.collection('manuscript_drafts')
          .doc(projectId)
          .collection('comments')
          .get();
        comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
    }

    comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({
      success: true,
      count: comments.length,
      data: comments
    });
  } catch (error) {
    console.error('[ManuscriptController] getManuscriptComments error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Add an inline comment / feedback on selected text or section
 */
export const addManuscriptComment = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { text, selectedText, section, page } = req.body;
    const user = req.user;

    if (!text) {
      return res.status(400).json({ success: false, error: 'Comment text is required.' });
    }

    const newCommentId = `comm-${Date.now()}`;
    let mongoSuccess = false;
    let createdComment = null;
    
    try {
      if (mongoose.connection.readyState === 1) {
        createdComment = await MongoComment.create({
          id: newCommentId,
          documentId: projectId,
          content: text,
          selectedText: selectedText || '',
          section: section || 'General',
          page: page || 1,
          authorUid: user.uid,
          authorName: user.fullName || user.email.split('@')[0],
          authorRole: user.role || 'adviser',
          resolved: false,
          replies: []
        });
        mongoSuccess = true;
      }
    } catch (mongoErr) {
      console.error('[ManuscriptController] MongoDB add comment error:', mongoErr.message);
    }
    
    if (!mongoSuccess) {
      return res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: 'Could not write comment to authoritative database. Operation aborted.'
      });
    }

    const responseData = {
      id: createdComment.id,
      projectId: createdComment.documentId,
      text: createdComment.content,
      selectedText: createdComment.selectedText,
      section: createdComment.section,
      page: createdComment.page,
      authorId: createdComment.authorUid,
      authorName: createdComment.authorName,
      authorRole: createdComment.authorRole,
      createdAt: createdComment.createdAt,
      resolved: createdComment.resolved,
      replies: createdComment.replies
    };

    return res.status(201).json({
      success: true,
      message: 'Comment added successfully.',
      data: responseData
    });
  } catch (error) {
    console.error('[ManuscriptController] addManuscriptComment error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Resolve or reply to a manuscript comment
 */
export const updateManuscriptComment = async (req, res) => {
  try {
    const { projectId, commentId } = req.params;
    const { resolved, replyText } = req.body;
    const user = req.user;

    let mongoSuccess = false;
    let updatedComment = null;

    try {
      if (mongoose.connection.readyState === 1) {
        const updateDoc = {};
        if (typeof resolved === 'boolean') {
          updateDoc.resolved = resolved;
        }
        
        const updateQuery = { $set: updateDoc };
        
        if (replyText) {
          updateQuery.$push = {
            replies: {
              id: `reply-${Date.now()}`,
              content: replyText,
              authorUid: user.uid,
              authorName: user.fullName || user.email.split('@')[0],
              authorRole: user.role,
              createdAt: new Date()
            }
          };
        }

        updatedComment = await MongoComment.findOneAndUpdate(
          { id: commentId, documentId: projectId },
          updateQuery,
          { new: true }
        );

        if (updatedComment) {
          mongoSuccess = true;
        }
      }
    } catch (mongoErr) {
      console.error('[ManuscriptController] MongoDB update comment error:', mongoErr.message);
    }

    if (!mongoSuccess) {
      return res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: 'Could not update comment in authoritative database. Operation aborted.'
      });
    }

    const responseData = {
      id: updatedComment.id,
      projectId: updatedComment.documentId,
      text: updatedComment.content,
      selectedText: updatedComment.selectedText,
      section: updatedComment.section,
      page: updatedComment.page,
      authorId: updatedComment.authorUid,
      authorName: updatedComment.authorName,
      authorRole: updatedComment.authorRole,
      createdAt: updatedComment.createdAt,
      resolved: updatedComment.resolved,
      replies: updatedComment.replies
    };

    return res.status(200).json({
      success: true,
      message: 'Comment updated successfully.',
      data: responseData
    });
  } catch (error) {
    console.error('[ManuscriptController] updateManuscriptComment error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get all manuscripts for Admin & Research Coordinators
 */
export const getAllAdminManuscripts = async (req, res) => {
  try {
    seedMockManuscriptsIfEmpty();
    let list = [];

    if (isDevMockMode) {
      const map = mockFirestoreDb.get('manuscripts');
      list = Array.from(map.values());
    } else {
      try {
        const snapshot = await db.collection('manuscript_versions').get();
        if (!snapshot.empty) {
          list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        // Also retrieve active student manuscript workspaces
        const wsSnap = await db.collection('manuscript_workspaces').get();
        if (!wsSnap.empty) {
          const wsList = wsSnap.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              projectId: data.projectId || data.proposalId || doc.id,
              projectTitle: data.title,
              title: data.title,
              authors: data.members?.map(m => m.fullName) || (data.studentName ? [data.studentName] : []),
              uploaderName: data.studentName,
              uploadedBy: data.studentId,
              adviserName: data.adviserName,
              adviserId: data.adviserId,
              department: data.department || 'Computer Studies',
              versionNumber: 'v1.0',
              abstract: data.abstract || '',
              keywords: data.keywords || [],
              status: data.status || 'under_review',
              isArchived: Boolean(data.isArchived),
              isBestThesis: Boolean(data.isBestThesis),
              bestThesisNotes: data.bestThesisNotes || '',
              grade: null,
              sections: data.sections || [],
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt || new Date().toISOString()
            };
          });

          // Merge without duplicate IDs
          const existingIds = new Set(list.map(m => m.id));
          wsList.forEach(wsItem => {
            if (!existingIds.has(wsItem.id)) {
              list.push(wsItem);
            }
          });
        }
      } catch (err) {
        console.warn('[ManuscriptController] Firestore read fallback to mock:', err.message);
        const map = mockFirestoreDb.get('manuscripts') || new Map();
        list = Array.from(map.values());
      }
    }

    // Strictly filter out any mock/dummy IDs
    list = list.filter(m => !m.id?.startsWith('ms-10') && !m.projectId?.startsWith('proj-50'));

    list.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

    return res.status(200).json({
      success: true,
      count: list.length,
      data: list
    });
  } catch (error) {
    console.error('[ManuscriptController] getAllAdminManuscripts error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Admin update manuscript metadata (Title, Abstract, Authors, Status, etc.)
 */
export const adminUpdateManuscript = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    seedMockManuscriptsIfEmpty();

    let updated = null;

    if (isDevMockMode) {
      const map = mockFirestoreDb.get('manuscripts');
      const item = map.get(id);
      if (!item) {
        return res.status(404).json({ success: false, error: 'Manuscript not found' });
      }
      updated = {
        ...item,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      map.set(id, updated);
    } else {
      const ref = db.collection('manuscript_versions').doc(id);
      const doc = await ref.get();
      if (!doc.exists) {
        // Fallback to mock map
        const map = mockFirestoreDb.get('manuscripts');
        const item = map?.get(id);
        if (item) {
          updated = { ...item, ...updates, updatedAt: new Date().toISOString() };
          map.set(id, updated);
        } else {
          return res.status(404).json({ success: false, error: 'Manuscript not found' });
        }
      } else {
        await ref.update({
          ...updates,
          updatedAt: new Date().toISOString()
        });
        const refreshed = await ref.get();
        updated = { id: refreshed.id, ...refreshed.data() };
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Manuscript updated successfully.',
      data: updated
    });
  } catch (error) {
    console.error('[ManuscriptController] adminUpdateManuscript error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Admin edit or give grade for a manuscript
 */
export const updateManuscriptGrade = async (req, res) => {
  try {
    const { id } = req.params;
    const { score, letter, remarks, criteria } = req.body;
    seedMockManuscriptsIfEmpty();

    const numericScore = Number(score) || 0;
    let computedLetter = letter;
    if (!computedLetter) {
      if (numericScore >= 95) computedLetter = '1.00 (Excellence)';
      else if (numericScore >= 90) computedLetter = '1.25 (Very Superior)';
      else if (numericScore >= 85) computedLetter = '1.50 (Superior)';
      else if (numericScore >= 80) computedLetter = '1.75 (High Average)';
      else if (numericScore >= 75) computedLetter = '2.00 (Average)';
      else computedLetter = 'Conditional Re-defense';
    }

    const gradeObj = {
      score: numericScore,
      letter: computedLetter,
      remarks: remarks || '',
      criteria: criteria || { presentation: 0, methodology: 0, results: 0, manuscriptQuality: 0 },
      updatedAt: new Date().toISOString()
    };

    let updated = null;

    if (isDevMockMode) {
      const map = mockFirestoreDb.get('manuscripts');
      const item = map.get(id);
      if (!item) {
        return res.status(404).json({ success: false, error: 'Manuscript not found' });
      }
      item.grade = gradeObj;
      item.updatedAt = new Date().toISOString();
      map.set(id, item);
      updated = item;
    } else {
      const ref = db.collection('manuscript_versions').doc(id);
      await ref.update({
        grade: gradeObj,
        updatedAt: new Date().toISOString()
      });
      const doc = await ref.get();
      updated = { id: doc.id, ...doc.data() };
    }

    return res.status(200).json({
      success: true,
      message: `Manuscript grade updated to ${numericScore} (${computedLetter}).`,
      data: updated
    });
  } catch (error) {
    console.error('[ManuscriptController] updateManuscriptGrade error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Toggle archive status for manuscript
 */
export const toggleArchiveManuscript = async (req, res) => {
  try {
    const { id } = req.params;
    const { isArchived } = req.body;
    seedMockManuscriptsIfEmpty();

    let updated = null;

    if (isDevMockMode) {
      const map = mockFirestoreDb.get('manuscripts');
      const item = map.get(id);
      if (!item) {
        return res.status(404).json({ success: false, error: 'Manuscript not found' });
      }
      const nextArchive = isArchived !== undefined ? Boolean(isArchived) : !item.isArchived;
      item.isArchived = nextArchive;
      if (nextArchive) {
        item.status = 'archived';
      } else if (item.status === 'archived') {
        item.status = 'approved';
      }
      item.updatedAt = new Date().toISOString();
      map.set(id, item);
      updated = item;
    } else {
      const ref = db.collection('manuscript_versions').doc(id);
      const doc = await ref.get();
      const current = doc.data() || {};
      const nextArchive = isArchived !== undefined ? Boolean(isArchived) : !current.isArchived;
      const patch = {
        isArchived: nextArchive,
        status: nextArchive ? 'archived' : (current.status === 'archived' ? 'approved' : current.status),
        updatedAt: new Date().toISOString()
      };
      await ref.update(patch);
      const refreshed = await ref.get();
      updated = { id: refreshed.id, ...refreshed.data() };
    }

    return res.status(200).json({
      success: true,
      message: updated.isArchived ? 'Manuscript moved to archive.' : 'Manuscript restored from archive.',
      data: updated
    });
  } catch (error) {
    console.error('[ManuscriptController] toggleArchiveManuscript error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Toggle Best Thesis designation
 */
export const toggleBestThesis = async (req, res) => {
  try {
    const { id } = req.params;
    const { isBestThesis, notes } = req.body;
    seedMockManuscriptsIfEmpty();

    let updated = null;

    if (isDevMockMode) {
      const map = mockFirestoreDb.get('manuscripts');
      const item = map.get(id);
      if (!item) {
        return res.status(404).json({ success: false, error: 'Manuscript not found' });
      }
      const nextBest = isBestThesis !== undefined ? Boolean(isBestThesis) : !item.isBestThesis;
      item.isBestThesis = nextBest;
      item.bestThesisNotes = nextBest ? (notes || item.bestThesisNotes || 'Nominated and selected as Best Thesis.') : '';
      item.updatedAt = new Date().toISOString();
      map.set(id, item);
      updated = item;
    } else {
      const ref = db.collection('manuscript_versions').doc(id);
      const doc = await ref.get();
      const current = doc.data() || {};
      const nextBest = isBestThesis !== undefined ? Boolean(isBestThesis) : !current.isBestThesis;
      const patch = {
        isBestThesis: nextBest,
        bestThesisNotes: nextBest ? (notes || current.bestThesisNotes || 'Nominated and selected as Best Thesis.') : '',
        updatedAt: new Date().toISOString()
      };
      await ref.update(patch);
      const refreshed = await ref.get();
      updated = { id: refreshed.id, ...refreshed.data() };
    }

    return res.status(200).json({
      success: true,
      message: updated.isBestThesis ? 'Manuscript designated as Best Thesis!' : 'Best Thesis designation removed.',
      data: updated
    });
  } catch (error) {
    console.error('[ManuscriptController] toggleBestThesis error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Add feedback comment directly to manuscript
 */
export const addManuscriptFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, section } = req.body;
    const user = req.user;
    seedMockManuscriptsIfEmpty();

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: 'Feedback text is required' });
    }

    const newComment = {
      id: `comm-${Date.now()}`,
      authorName: user.fullName || user.email.split('@')[0],
      authorRole: user.role || 'admin',
      text: text.trim(),
      section: section || 'General',
      createdAt: new Date().toISOString()
    };

    let updated = null;

    if (isDevMockMode) {
      const map = mockFirestoreDb.get('manuscripts');
      const item = map.get(id);
      if (!item) {
        return res.status(404).json({ success: false, error: 'Manuscript not found' });
      }
      item.comments = item.comments || [];
      item.comments.push(newComment);
      item.commentsCount = item.comments.length;
      item.updatedAt = new Date().toISOString();
      map.set(id, item);
      updated = item;
    } else {
      const ref = db.collection('manuscript_versions').doc(id);
      const doc = await ref.get();
      const current = doc.data() || {};
      const comments = current.comments || [];
      comments.push(newComment);
      await ref.update({
        comments,
        commentsCount: comments.length,
        updatedAt: new Date().toISOString()
      });
      const refreshed = await ref.get();
      updated = { id: refreshed.id, ...refreshed.data() };
    }

    return res.status(201).json({
      success: true,
      message: 'Feedback posted successfully.',
      comment: newComment,
      data: updated
    });
  } catch (error) {
    console.error('[ManuscriptController] addManuscriptFeedback error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Publish manuscript directly to Institutional Repository
 */
import { getStorageProvider } from '../services/storage/storageManager.js';

export const publishManuscriptToRepository = async (req, res) => {
  try {
    const { id } = req.params;
    seedMockManuscriptsIfEmpty();
    seedMockRepositoryIfEmpty();

    let manuscript = null;

    if (isDevMockMode) {
      const map = mockFirestoreDb.get('manuscripts');
      manuscript = map.get(id);
      if (!manuscript) {
        return res.status(404).json({ success: false, error: 'Manuscript not found' });
      }
      manuscript.status = 'published';
      manuscript.updatedAt = new Date().toISOString();
      map.set(id, manuscript);
    } else {
      const ref = db.collection('manuscript_versions').doc(id);
      const doc = await ref.get();
      if (!doc.exists) {
        return res.status(404).json({ success: false, error: 'Manuscript not found' });
      }
      await ref.update({ status: 'published', updatedAt: new Date().toISOString() });
      manuscript = { id: doc.id, ...doc.data(), status: 'published' };
    }

    let finalPdfUrl = manuscript.fileUrl || '';

    if (finalPdfUrl && finalPdfUrl.startsWith('data:application/pdf;base64,')) {
      try {
        const base64Data = finalPdfUrl.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const storage = getStorageProvider();
        const storageKey = `repository/repo-${Date.now()}.pdf`;
        const uploadResult = await storage.upload(storageKey, buffer, 'application/pdf');
        finalPdfUrl = uploadResult.url;
      } catch (uploadErr) {
        console.warn('[ManuscriptController] Error uploading base64 pdfUrl to storage:', uploadErr);
        // Fallback or leave as is (will likely fail firestore if too large)
      }
    }

    // Insert into repository publications
    const repoPub = {
      id: `repo-${Date.now()}`,
      projectId: manuscript.projectId || 'proj-501',
      manuscriptId: manuscript.id,
      title: manuscript.title || manuscript.projectTitle,
      authors: manuscript.authors || [manuscript.uploaderName || 'Student Researcher'],
      adviserName: manuscript.adviserName || 'Adviser',
      department: manuscript.department || 'Computer Science',
      publicationYear: new Date().getFullYear(),
      abstract: manuscript.abstract || 'Institutional Research Publication',
      keywords: manuscript.keywords || ['Research'],
      pdfUrl: finalPdfUrl,
      fileName: manuscript.fileName || 'manuscript.pdf',
      viewsCount: 1,
      downloadsCount: 0,
      versionNumber: manuscript.versionNumber || 'v1.0',
      isBestThesis: Boolean(manuscript.isBestThesis),
      publishedAt: new Date().toISOString()
    };

    if (isDevMockMode) {
      const repoMap = mockFirestoreDb.get('repository');
      repoMap.set(repoPub.id, repoPub);
    } else {
      await db.collection('repository_publications').doc(repoPub.id).set(repoPub);
    }

    return res.status(200).json({
      success: true,
      message: 'Manuscript published to Institutional Repository successfully.',
      publication: repoPub,
      data: manuscript
    });
  } catch (error) {
    console.error('[ManuscriptController] publishManuscriptToRepository error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Admin: Delete manuscripts
 */
export const deleteAdminManuscripts = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'No manuscript IDs provided.' });
    }

    if (isDevMockMode) {
      const map = mockFirestoreDb.get('manuscripts');
      if (map) {
        ids.forEach(id => map.delete(id));
      }
    } else {
      const batch = db.batch();
      ids.forEach(id => {
        const ref = db.collection('manuscript_versions').doc(id);
        batch.delete(ref);
      });
      await batch.commit();
    }

    return res.status(200).json({
      success: true,
      message: `Deleted ${ids.length} manuscript(s) successfully.`
    });
  } catch (error) {
    console.error('[ManuscriptController] deleteAdminManuscripts error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

