import { db, isDevMockMode, mockFirestoreDb } from '../config/firebaseAdmin.js';
import { getStorageProvider } from '../services/storage/storageManager.js';
import { RepositoryPublication } from '../models/RepositoryPublication.js';

// Pre-seed mock repository publications if empty
export const seedMockRepositoryIfEmpty = () => {
  // Not used for MongoDB, keeping for legacy compatibility if needed
};

/**
 * Publish approved research project to Public Repository (Admin only)
 */
export const publishToRepository = async (req, res) => {
  try {
    const { projectId, title, authors, adviserName, department, publicationYear, abstract, keywords, pdfUrl, citation } = req.body;

    if (!title || !abstract) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Title and Abstract are required.'
      });
    }

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
      title,
      authors: Array.isArray(authors) ? authors : (authors ? [authors] : ['Student Researcher']),
      adviserName: adviserName || 'Faculty Adviser',
      department: department || 'Computer Science',
      publicationYear: Number(publicationYear) || new Date().getFullYear(),
      abstract,
      keywords: Array.isArray(keywords) ? keywords : (keywords ? keywords.split(',').map(k => k.trim()) : []),
      pdfUrl: finalPdfUrl,
      citation: citation || `${title}. (${new Date().getFullYear()}). Institutional Repository.`,
      viewsCount: 1,
      downloadsCount: 0,
      publishedAt: new Date()
    };

    const newPublication = await RepositoryPublication.create(newDoc);

    return res.status(201).json({
      success: true,
      message: 'Research paper successfully published to Institutional Repository.',
      data: newPublication
    });
  } catch (error) {
    console.error('[RepositoryController] publishToRepository error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Search and browse published research papers (Public & Authenticated)
 */
export const getRepositoryPublications = async (req, res) => {
  try {
    const { search, department, year } = req.query;
    
    let filter = {};
    
    if (department && department !== 'all') {
      filter.department = department;
    }
    
    if (year) {
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
