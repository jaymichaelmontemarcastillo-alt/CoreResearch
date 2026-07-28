import { db, isDevMockMode, mockFirestoreDb } from '../config/firebaseAdmin.js';

// Pre-seed mock reviews if store is empty
const seedMockReviewsIfEmpty = () => {
  if (!mockFirestoreDb.has('reviews')) {
    const initialReviews = [
      {
        id: 'rev-201',
        manuscriptId: 'ms-v1.0',
        chapter: 'Chapter 2 - Literature Review',
        comment: 'Expand section 2.3 on IoT sensor calibration. Cite at least 3 recent IEEE papers from 2024-2025.',
        reviewerId: 'dev-adviser-01',
        reviewerName: 'Dr. Eleanor Vance',
        reviewerRole: 'adviser',
        status: 'addressed',
        studentResponse: 'Updated section 2.3 in v1.1 with citations from IEEE Sensors Journal 2024.',
        createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'rev-202',
        manuscriptId: 'ms-v1.1',
        chapter: 'Chapter 3 - Methodology',
        comment: 'Include a circuit diagram schematic for the NPK soil sensor micro-controller interface.',
        reviewerId: 'dev-panelist-01',
        reviewerName: 'Prof. Marcus Chen',
        reviewerRole: 'panelist',
        status: 'pending',
        studentResponse: '',
        createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString()
      }
    ];

    const map = new Map();
    initialReviews.forEach(r => map.set(r.id, r));
    mockFirestoreDb.set('reviews', map);
  }
};

/**
 * Add review comment to manuscript (Adviser & Panelist & Admin)
 */
export const addReviewComment = async (req, res) => {
  try {
    const { manuscriptId, chapter, comment } = req.body;
    const user = req.user;

    if (!manuscriptId || !comment) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'manuscriptId and comment are required.'
      });
    }

    const newReview = {
      id: `rev-${Date.now()}`,
      manuscriptId,
      chapter: chapter || 'General Comments',
      comment,
      reviewerId: user.uid,
      reviewerName: user.fullName || user.email.split('@')[0],
      reviewerRole: user.role,
      status: 'pending',
      studentResponse: '',
      createdAt: new Date().toISOString()
    };

    if (isDevMockMode) {
      seedMockReviewsIfEmpty();
      const map = mockFirestoreDb.get('reviews');
      map.set(newReview.id, newReview);
    } else {
      await db.collection('reviews').doc(newReview.id).set(newReview);
    }

    return res.status(201).json({
      success: true,
      message: 'Review comment posted successfully.',
      data: newReview
    });
  } catch (error) {
    console.error('[ReviewController] addReviewComment error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get review comments for a manuscript version
 */
export const getReviewComments = async (req, res) => {
  try {
    const { manuscriptId } = req.params;
    let list = [];

    if (isDevMockMode) {
      seedMockReviewsIfEmpty();
      const map = mockFirestoreDb.get('reviews');
      list = Array.from(map.values());
    } else {
      const snapshot = await db.collection('reviews').get();
      list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    if (manuscriptId && manuscriptId !== 'all') {
      list = list.filter(r => r.manuscriptId === manuscriptId);
    }

    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({
      success: true,
      count: list.length,
      data: list
    });
  } catch (error) {
    console.error('[ReviewController] getReviewComments error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Respond to review comment (Student) or update resolution status
 */
export const updateReviewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, studentResponse } = req.body;

    let updated = null;

    if (isDevMockMode) {
      seedMockReviewsIfEmpty();
      const map = mockFirestoreDb.get('reviews');
      const rev = map.get(id);
      if (!rev) {
        return res.status(404).json({ success: false, error: 'Review not found' });
      }
      if (status) rev.status = status;
      if (studentResponse !== undefined) rev.studentResponse = studentResponse;
      map.set(id, rev);
      updated = rev;
    } else {
      const ref = db.collection('reviews').doc(id);
      const updateData = {};
      if (status) updateData.status = status;
      if (studentResponse !== undefined) updateData.studentResponse = studentResponse;
      await ref.update(updateData);
      const doc = await ref.get();
      updated = { id: doc.id, ...doc.data() };
    }

    return res.status(200).json({
      success: true,
      message: 'Review comment status updated.',
      data: updated
    });
  } catch (error) {
    console.error('[ReviewController] updateReviewStatus error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
