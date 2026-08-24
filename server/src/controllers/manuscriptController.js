import { db, isDevMockMode, mockFirestoreDb } from '../config/firebaseAdmin.js';
import { seedMockRepositoryIfEmpty } from './repositoryController.js';

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
    const initialManuscripts = [
      {
        id: 'ms-v1.0',
        projectId: 'proj-501',
        projectTitle: 'Smart IoT Moisture & Nutrient Sensing System for Urban Farming',
        versionNumber: 'v1.0',
        fileName: 'CoreResearch_Draft_v1.0.pdf',
        fileSize: 4829100, // ~4.8 MB
        fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        uploadedBy: 'dev-student-01',
        uploaderName: 'Alex Rivera',
        notes: 'Initial Chapter 1 to 3 manuscript draft submission.',
        status: 'revisions_requested',
        createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'ms-v1.1',
        projectId: 'proj-501',
        projectTitle: 'Smart IoT Moisture & Nutrient Sensing System for Urban Farming',
        versionNumber: 'v1.1',
        fileName: 'CoreResearch_Revision_v1.1.pdf',
        fileSize: 5210400, // ~5.2 MB
        fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        uploadedBy: 'dev-student-01',
        uploaderName: 'Alex Rivera',
        notes: 'Revised methodology diagram and expanded related work literature review.',
        status: 'under_review',
        createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
      }
    ];

    const map = new Map();
    initialManuscripts.forEach(m => map.set(m.id, m));
    mockFirestoreDb.set('manuscripts', map);
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

    if (isDevMockMode) {
      const commentsMap = mockFirestoreDb.get('manuscript_comments');
      comments = commentsMap.get(projectId) || [];
    } else {
      const snapshot = await db.collection('manuscript_drafts')
        .doc(projectId)
        .collection('comments')
        .get();
      comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    // Sort newest first
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

    const newComment = {
      id: `comm-${Date.now()}`,
      projectId,
      text,
      selectedText: selectedText || '',
      section: section || 'General',
      page: page || 1,
      authorId: user.uid,
      authorName: user.fullName || user.email.split('@')[0],
      authorRole: user.role || 'adviser',
      createdAt: new Date().toISOString(),
      resolved: false,
      replies: []
    };

    if (isDevMockMode) {
      seedMockManuscriptsIfEmpty();
      const commentsMap = mockFirestoreDb.get('manuscript_comments');
      const list = commentsMap.get(projectId) || [];
      list.push(newComment);
      commentsMap.set(projectId, list);
    } else {
      await db.collection('manuscript_drafts')
        .doc(projectId)
        .collection('comments')
        .doc(newComment.id)
        .set(newComment);
    }

    return res.status(201).json({
      success: true,
      message: 'Comment added successfully.',
      data: newComment
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

    let updatedComment = null;

    if (isDevMockMode) {
      seedMockManuscriptsIfEmpty();
      const commentsMap = mockFirestoreDb.get('manuscript_comments');
      const list = commentsMap.get(projectId) || [];
      const item = list.find(c => c.id === commentId);

      if (!item) {
        return res.status(404).json({ success: false, error: 'Comment not found.' });
      }

      if (typeof resolved === 'boolean') {
        item.resolved = resolved;
      }

      if (replyText) {
        item.replies = item.replies || [];
        item.replies.push({
          id: `reply-${Date.now()}`,
          text: replyText,
          authorName: user.fullName || user.email.split('@')[0],
          authorRole: user.role,
          createdAt: new Date().toISOString()
        });
      }

      updatedComment = item;
      commentsMap.set(projectId, list);
    } else {
      const docRef = db.collection('manuscript_drafts')
        .doc(projectId)
        .collection('comments')
        .doc(commentId);

      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        return res.status(404).json({ success: false, error: 'Comment not found.' });
      }

      const updates = {};
      if (typeof resolved === 'boolean') updates.resolved = resolved;

      if (replyText) {
        const existingReplies = docSnap.data().replies || [];
        existingReplies.push({
          id: `reply-${Date.now()}`,
          text: replyText,
          authorName: user.fullName || user.email.split('@')[0],
          authorRole: user.role,
          createdAt: new Date().toISOString()
        });
        updates.replies = existingReplies;
      }

      await docRef.update(updates);
      const freshSnap = await docRef.get();
      updatedComment = { id: freshSnap.id, ...freshSnap.data() };
    }

    return res.status(200).json({
      success: true,
      message: 'Comment updated successfully.',
      data: updatedComment
    });
  } catch (error) {
    console.error('[ManuscriptController] updateManuscriptComment error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
