import { db, isDevMockMode, mockFirestoreDb } from '../config/firebaseAdmin.js';
import { getStorageProvider } from '../services/storage/storageManager.js';
import { RepositoryPublication } from '../models/RepositoryPublication.js';

// Pre-seed mock repository publications if empty
export const seedMockRepositoryIfEmpty = () => {
  // Not used for MongoDB, keeping for legacy compatibility if needed
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
    const finalPublicationStatus = isStudent
      ? 'pending_publication'
      : (requestedStatus || 'approved');

    let finalPdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

    if (pdfUrl && pdfUrl.startsWith('data:application/pdf;base64,')) {
      const base64Data = pdfUrl.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      const storage = getStorageProvider();
      const storageKey = `repository/repo-${Date.now()}.pdf`;
      const uploadResult = await storage.upload(storageKey, buffer, 'application/pdf');
      finalPdfUrl = uploadResult.url;
    } else if (pdfUrl) {
      finalPdfUrl = pdfUrl;
    }

    const newDoc = {
      id: `repo-${Date.now()}`,
      projectId: projectId || 'proj-501',
      manuscriptId: manuscriptId || '',
      title,
      authors: Array.isArray(authors) ? authors : (authors ? [authors] : ['Student Researcher']),
      adviserName: adviserName || 'Faculty Adviser',
      department: department || 'Computer Science',
      publicationYear: Number(publicationYear) || new Date().getFullYear(),
      abstract,
      keywords: Array.isArray(keywords) ? keywords : (keywords ? keywords.split(',').map(k => k.trim()) : []),
      pdfUrl: finalPdfUrl,
      citation: citation || `${title}. (${new Date().getFullYear()}). Institutional Repository.`,
      publicationStatus: finalPublicationStatus,
      rejectionReason: '',
      viewsCount: 1,
      downloadsCount: 0,
      publishedAt: new Date()
    };

    const newPublication = await RepositoryPublication.create(newDoc);

    // If linked to an existing manuscript, synchronize publicationStatus
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

    const list = await RepositoryPublication.find(filter).sort({ publishedAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      data: list
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
