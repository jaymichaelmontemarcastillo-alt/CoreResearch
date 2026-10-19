import { db, isDevMockMode, mockFirestoreDb } from '../config/firebaseAdmin.js';
import { getStorageProvider } from '../services/storage/storageManager.js';
import { RepositoryPublication } from '../models/RepositoryPublication.js';

// Pre-seed mock repository publications if empty
export const seedMockRepositoryIfEmpty = () => {
  if (!mockFirestoreDb.has('repository')) {
    mockFirestoreDb.set('repository', new Map());
  }
};

/**
 * Publish approved research project to Public Repository
 * Students submit as 'pending_publication'; Admins/Coordinators can publish directly as 'approved'.
 */
export const publishToRepository = async (req, res) => {
  try {
    const {
      projectId,
      manuscriptId,
      title,
      authors,
      adviserName,
      department,
      publicationYear,
      abstract,
      keywords,
      pdfUrl,
      citation,
      publicationStatus: requestedStatus
    } = req.body;

    if (!title || !abstract) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Title and Abstract are required.'
      });
    }

    const isStudent = req.user?.role === 'student';
    const acceptedTerms = req.body.acceptedTerms === true || req.body.acceptedTerms === 'true';

    // Strict validation: Students MUST explicitly accept repository publication conditions
    if (isStudent && !acceptedTerms) {
      return res.status(400).json({
        success: false,
        error: 'Terms Acceptance Required',
        message: 'Institutional repository publication conditions and author warranty terms must be explicitly accepted before publishing.'
      });
    }

    // Verify post-defense revisions clearance if applicable
    const postDefenseRevisionRequired = req.body.postDefenseRevisionRequired === true || req.body.postDefenseRevisionRequired === 'true';
    const postDefenseRevisionStatus = req.body.postDefenseRevisionStatus;
    if (postDefenseRevisionRequired && postDefenseRevisionStatus !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Post-Defense Revisions Required',
        message: 'Publication blocked: Post-defense revisions must be formally reviewed and approved by faculty panel before repository publication.'
      });
    }

    const finalPublicationStatus = isStudent
      ? 'pending_publication'
      : (requestedStatus || 'approved');

    let finalPdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

    // Preferred: multipart upload (req.file via multer). Legacy: base64 data URL in JSON.
    let pdfBuffer = null;
    if (req.file?.buffer) {
      pdfBuffer = req.file.buffer;
    } else if (pdfUrl && pdfUrl.startsWith('data:application/pdf;base64,')) {
      pdfBuffer = Buffer.from(pdfUrl.split(',')[1], 'base64');
    } else if (pdfUrl) {
      finalPdfUrl = pdfUrl;
    }

    if (pdfBuffer) {
      const storage = getStorageProvider();
      const storageKey = `repository/repo-${Date.now()}.pdf`;
      const startedAt = Date.now();
      try {
        const uploadResult = await storage.upload(storageKey, pdfBuffer, 'application/pdf');
        finalPdfUrl = uploadResult.url;
        console.log(`[RepositoryController] Stored ${(pdfBuffer.length / 1048576).toFixed(1)}MB PDF via ${storage.constructor.name} in ${Date.now() - startedAt}ms`);
      } catch (storageErr) {
        console.error(`[RepositoryController] PDF storage failed after ${Date.now() - startedAt}ms via ${storage.constructor.name}:`, storageErr.message);
        return res.status(502).json({
          success: false,
          error: 'StorageError',
          message: `Could not save the PDF (${(pdfBuffer.length / 1048576).toFixed(1)}MB) to file storage: ${storageErr.message}. Please try again.`
        });
      }
    }

    const toList = (v) => Array.isArray(v)
      ? v.map(s => String(s).trim()).filter(Boolean)
      : (v ? String(v).split(',').map(s => s.trim()).filter(Boolean) : []);
    const authorList = toList(authors);

    const newDoc = {
      id: `repo-${Date.now()}`,
      projectId: projectId || 'proj-501',
      manuscriptId: manuscriptId || '',
      title,
      authors: authorList.length ? authorList : ['Student Researcher'],
      adviserName: adviserName || 'Faculty Adviser',
      department: department || 'Computer Science',
      publicationYear: Number(publicationYear) || new Date().getFullYear(),
      abstract,
      keywords: toList(keywords),
      pdfUrl: finalPdfUrl,
      citation: citation || `${title}. (${new Date().getFullYear()}). Institutional Repository.`,
      publicationStatus: finalPublicationStatus,
      rejectionReason: '',
      viewsCount: 1,
      downloadsCount: 0,
      publishedAt: new Date(),
      acceptedTerms: Boolean(acceptedTerms),
      acceptedBy: req.user?.uid || '',
      acceptedByName: req.user?.fullName || req.user?.email || 'Student Researcher',
      acceptedAt: acceptedTerms ? new Date() : null,
      termsVersion: req.body.termsVersion || '1.0'
    };

    const newPublication = await RepositoryPublication.create(newDoc);

    // Dual-write to Firestore repository_publications for real-time synchronization
    try {
      if (!isDevMockMode && db) {
        await db.collection('repository_publications').doc(newDoc.id).set({
          ...newDoc,
          publishedAt: newDoc.publishedAt instanceof Date ? newDoc.publishedAt.toISOString() : newDoc.publishedAt,
          acceptedAt: newDoc.acceptedAt instanceof Date ? newDoc.acceptedAt.toISOString() : (newDoc.acceptedAt || null),
        }, { merge: true });
      }
    } catch (fsErr) {
      console.warn('[RepositoryController] Firestore dual-write warning:', fsErr.message);
    }
    if (manuscriptId) {
      try {
        if (!isDevMockMode) {
          const mRef = db.collection('manuscript_versions').doc(manuscriptId);
          const mDoc = await mRef.get();
          if (mDoc.exists) {
            await mRef.update({
              publicationStatus: finalPublicationStatus,
              updatedAt: new Date().toISOString()
            });
          } else {
            const wsRef = db.collection('manuscript_workspaces').doc(manuscriptId);
            const wsDoc = await wsRef.get();
            if (wsDoc.exists) {
              await wsRef.update({
                publicationStatus: finalPublicationStatus,
                updatedAt: new Date().toISOString()
              });
            }
          }
        } else {
          const map = mockFirestoreDb.get('manuscripts');
          if (map?.has(manuscriptId)) {
            const m = map.get(manuscriptId);
            m.publicationStatus = finalPublicationStatus;
            m.updatedAt = new Date().toISOString();
            map.set(manuscriptId, m);
          }
        }
      } catch (syncErr) {
        console.warn('[RepositoryController] manuscript sync warning:', syncErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: finalPublicationStatus === 'pending_publication'
        ? 'Research paper submitted for publication review.'
        : 'Research paper successfully published to Institutional Repository.',
      data: newPublication
    });
  } catch (error) {
    console.error('[RepositoryController] publishToRepository error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Search and browse published research papers (Public & Authenticated)
 * Strictly enforces that only Approved/Published items are displayed!
 */
export const getRepositoryPublications = async (req, res) => {
  try {
    const { search, department, year, status } = req.query;
    
    let filter = {};

    // Only return approved/published research papers by default.
    // Legacy records lacking publicationStatus are treated as approved.
    if (!status || status === 'approved') {
      filter.publicationStatus = { $nin: ['pending_publication', 'rejected'] };
    } else if (status && status !== 'all') {
      filter.publicationStatus = status;
    }
    
    if (department && department !== 'all') {
      filter.department = department;
    }
    
    if (year && year !== 'any') {
      filter.publicationYear = Number(year);
    }
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { authors: { $regex: search, $options: 'i' } },
        { abstract: { $regex: search, $options: 'i' } },
        { keywords: { $regex: search, $options: 'i' } }
      ];
    }

    let list = [];
    let mongoSuccess = false;
    try {
      list = await RepositoryPublication.find(filter).sort({ publishedAt: -1 }).lean();
      mongoSuccess = true;
    } catch (mongoErr) {
      console.warn('[RepositoryController] MongoDB query failed, falling back to Firestore:', mongoErr.message);
    }

    // Fallback to Firestore repository_publications only if MongoDB query actually failed
    if (!mongoSuccess && (!list || list.length === 0)) {

      try {
        if (!isDevMockMode && db) {
          const snapshot = await db.collection('repository_publications').get();
          list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          if (department && department !== 'all') {
            list = list.filter(r => r.department === department);
          }
          if (year && year !== 'any') {
            list = list.filter(r => Number(r.publicationYear) === Number(year));
          }
          if (status && status !== 'all') {
            list = list.filter(r => r.publicationStatus === status);
          } else if (!status || status === 'approved') {
            list = list.filter(r => r.publicationStatus !== 'pending_publication' && r.publicationStatus !== 'rejected');
          }
          if (search) {
            const q = search.toLowerCase();
            list = list.filter(r =>
              (r.title && r.title.toLowerCase().includes(q)) ||
              (r.abstract && r.abstract.toLowerCase().includes(q)) ||
              (r.keywords && r.keywords.some(k => k.toLowerCase().includes(q))) ||
              (r.authors && r.authors.some(a => a.toLowerCase().includes(q)))
            );
          }
          list.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
        }
      } catch (fsErr) {
        console.warn('[RepositoryController] Firestore fallback read error:', fsErr.message);
      }
    }

    // Check if requester has student role
    const isStudent = (req.user?.role === 'student') || (req.headers['x-user-role'] === 'student');

    // For student accounts, redact full document url and content to enforce Abstract Only access
    const sanitizedList = list.map((pub) => {
      if (isStudent) {
        const { pdfUrl, fileUrl, content, ...abstractOnlyPub } = pub;
        return {
          ...abstractOnlyPub,
          hasFullAccess: false,
          accessLevel: 'abstract_only',
        };
      }
      return {
        ...pub,
        hasFullAccess: true,
        accessLevel: 'full_document',
      };
    });

    return res.status(200).json({
      success: true,
      data: sanitizedList,
      accessLevel: isStudent ? 'abstract_only' : 'full_document',
    });
  } catch (error) {
    console.error('[RepositoryController] getRepositoryPublications error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Approve repository publication (Admin or Research Coordinator)
 */
export const approveRepositoryPublication = async (req, res) => {
  try {
    const { id } = req.params;
    const reviewerName = req.user?.fullName || 'Research Coordinator';
    const reviewerId = req.user?.uid || '';

    const pub = await RepositoryPublication.findOneAndUpdate(
      { id },
      {
        publicationStatus: 'approved',
        reviewedBy: reviewerId,
        reviewedByName: reviewerName,
        reviewedAt: new Date()
      },
      { new: true }
    );

    if (!pub) {
      return res.status(404).json({ success: false, error: 'Publication record not found' });
    }

    // Also sync manuscript if linked
    if (pub.manuscriptId && !isDevMockMode) {
      try {
        const mRef = db.collection('manuscript_versions').doc(pub.manuscriptId);
        const mDoc = await mRef.get();
        if (mDoc.exists) {
          await mRef.update({
            publicationStatus: 'approved',
            publicationReviewedAt: new Date().toISOString(),
            publicationReviewerName: reviewerName
          });
        }
      } catch (syncErr) {
        console.warn('[RepositoryController] manuscript sync warning:', syncErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Publication approved and released to Institutional Repository.',
      data: pub
    });
  } catch (error) {
    console.error('[RepositoryController] approveRepositoryPublication error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Reject repository publication (Admin or Research Coordinator)
 */
export const rejectRepositoryPublication = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required.' });
    }

    const reviewerName = req.user?.fullName || 'Research Coordinator';
    const reviewerId = req.user?.uid || '';

    const pub = await RepositoryPublication.findOneAndUpdate(
      { id },
      {
        publicationStatus: 'rejected',
        rejectionReason: reason.trim(),
        reviewedBy: reviewerId,
        reviewedByName: reviewerName,
        reviewedAt: new Date()
      },
      { new: true }
    );

    if (!pub) {
      return res.status(404).json({ success: false, error: 'Publication record not found' });
    }

    // Also sync manuscript if linked
    if (pub.manuscriptId && !isDevMockMode) {
      try {
        const mRef = db.collection('manuscript_versions').doc(pub.manuscriptId);
        const mDoc = await mRef.get();
        if (mDoc.exists) {
          await mRef.update({
            publicationStatus: 'rejected',
            publicationRejectionReason: reason.trim(),
            publicationReviewedAt: new Date().toISOString(),
            publicationReviewerName: reviewerName
          });
        }
      } catch (syncErr) {
        console.warn('[RepositoryController] manuscript sync warning:', syncErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Publication rejected with reviewer feedback.',
      data: pub
    });
  } catch (error) {
    console.error('[RepositoryController] rejectRepositoryPublication error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const updateRepositoryPublication = async (req, res) => {
  try {
    const { id } = req.params;
    const { department } = req.body;
    
    await RepositoryPublication.findOneAndUpdate({ id }, { department });
    
    return res.status(200).json({ success: true, message: 'Updated successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteRepositoryPublication = async (req, res) => {
  try {
    const { id } = req.params;
    await RepositoryPublication.deleteOne({ id });
    return res.status(200).json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
