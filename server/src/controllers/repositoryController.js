import { db, isDevMockMode, mockFirestoreDb } from '../config/firebaseAdmin.js';

// Pre-seed mock repository publications if empty
const seedMockRepositoryIfEmpty = () => {
  if (!mockFirestoreDb.has('repository')) {
    const initialRepo = [
      {
        id: 'repo-1001',
        projectId: 'proj-500',
        title: 'Autonomous Drone Navigation Using Computer Vision & Edge AI',
        authors: ['David Tan', 'Samantha Cruz'],
        adviserName: 'Dr. Eleanor Vance',
        department: 'Computer Science',
        publicationYear: 2025,
        abstract: 'This thesis implements an onboard stereo-vision localization pipeline running on an NVIDIA Jetson Orin Nano, enabling GPS-denied indoor quadcopter trajectory tracking.',
        keywords: ['Computer Vision', 'Drones', 'Edge AI', 'Robotics'],
        pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        citation: 'Tan, D., & Cruz, S. (2025). Autonomous Drone Navigation Using Computer Vision & Edge AI. CoreResearch Academic Press.',
        viewsCount: 142,
        downloadsCount: 38,
        publishedAt: new Date(Date.now() - 180 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'repo-1002',
        projectId: 'proj-499',
        title: 'Predictive Student Retention Analytics via Machine Learning Ensembles',
        authors: ['Kenneth Sy', 'Lia Ocampo'],
        adviserName: 'Prof. Marcus Chen',
        department: 'Information Technology',
        publicationYear: 2025,
        abstract: 'An empirical comparison of XGBoost and Random Forest classifiers predicting first-year college dropout risks using LMS engagement telemetry.',
        keywords: ['Machine Learning', 'Educational Data Mining', 'XGBoost', 'Predictive Analytics'],
        pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        citation: 'Sy, K., & Ocampo, L. (2025). Predictive Student Retention Analytics via Machine Learning Ensembles. CoreResearch Academic Press.',
        viewsCount: 219,
        downloadsCount: 64,
        publishedAt: new Date(Date.now() - 210 * 24 * 3600 * 1000).toISOString()
      }
    ];

    const map = new Map();
    initialRepo.forEach(r => map.set(r.id, r));
    mockFirestoreDb.set('repository', map);
  }
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

    const newPublication = {
      id: `repo-${Date.now()}`,
      projectId: projectId || 'proj-501',
      title,
      authors: Array.isArray(authors) ? authors : (authors ? [authors] : ['Student Researcher']),
      adviserName: adviserName || 'Faculty Adviser',
      department: department || 'Computer Science',
      publicationYear: Number(publicationYear) || new Date().getFullYear(),
      abstract,
      keywords: Array.isArray(keywords) ? keywords : (keywords ? keywords.split(',').map(k => k.trim()) : []),
      pdfUrl: pdfUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      citation: citation || `${title}. (${new Date().getFullYear()}). Institutional Repository.`,
      viewsCount: 1,
      downloadsCount: 0,
      publishedAt: new Date().toISOString()
    };

    if (isDevMockMode) {
      seedMockRepositoryIfEmpty();
      const map = mockFirestoreDb.get('repository');
      map.set(newPublication.id, newPublication);
    } else {
      await db.collection('repository_publications').doc(newPublication.id).set(newPublication);
    }

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
    let list = [];

    if (isDevMockMode) {
      seedMockRepositoryIfEmpty();
      const map = mockFirestoreDb.get('repository');
      list = Array.from(map.values());
    } else {
      const snapshot = await db.collection('repository_publications').get();
      list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    if (department && department !== 'all') {
      list = list.filter(r => r.department === department);
    }

    if (year) {
      list = list.filter(r => String(r.publicationYear) === String(year));
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.abstract.toLowerCase().includes(q) ||
        (r.keywords && r.keywords.some(k => k.toLowerCase().includes(q))) ||
        (r.authors && r.authors.some(a => a.toLowerCase().includes(q)))
      );
    }

    list.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    return res.status(200).json({
      success: true,
      count: list.length,
      data: list
    });
  } catch (error) {
    console.error('[RepositoryController] getRepositoryPublications error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
