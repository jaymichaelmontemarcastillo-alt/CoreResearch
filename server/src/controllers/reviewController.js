import mongoose from 'mongoose';
import { db, isDevMockMode, mockFirestoreDb } from '../config/firebaseAdmin.js';
import { Review as MongoReview } from '../models/Review.js';

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

    const newReviewId = `rev-${Date.now()}`;
    
    // [FINAL PRODUCTION ARCHITECTURE]
    // Strictly write to MongoDB. Hard fail if unavailable.
    let mongoSuccess = false;
    let createdReview = null;

    try {
      if (mongoose.connection.readyState === 1) {
        createdReview = await MongoReview.create({
          id: newReviewId,
          manuscriptId,
          chapter: chapter || 'General Comments',
          comment,
          reviewerId: user.uid,
          reviewerName: user.fullName || user.email.split('@')[0],
          reviewerRole: user.role,
          status: 'pending',
          studentResponse: ''
        });
        mongoSuccess = true;
      }
    } catch (mongoErr) {
      console.error('[ReviewController] MongoDB add review error:', mongoErr.message);
    }

    if (!mongoSuccess) {
      return res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: 'Could not write review to authoritative database. Operation aborted.'
      });
    }

    // Map back for response compatibility
    const responseData = {
      id: createdReview.id,
      manuscriptId: createdReview.manuscriptId,
      chapter: createdReview.chapter,
      comment: createdReview.comment,
      reviewerId: createdReview.reviewerId,
      reviewerName: createdReview.reviewerName,
      reviewerRole: createdReview.reviewerRole,
      status: createdReview.status,
      studentResponse: createdReview.studentResponse,
      createdAt: createdReview.createdAt
    };

    return res.status(201).json({
      success: true,
      message: 'Review comment posted successfully.',
      data: responseData
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
    let fetchedFromMongo = false;

    try {
      if (mongoose.connection.readyState === 1) {
        const query = manuscriptId && manuscriptId !== 'all' ? { manuscriptId } : {};
        const mongoDocs = await MongoReview.find(query).lean();
        
        if (mongoDocs) {
          list = mongoDocs.map(doc => ({
            id: doc.id,
            manuscriptId: doc.manuscriptId,
            chapter: doc.chapter,
            comment: doc.comment,
            reviewerId: doc.reviewerId,
            reviewerName: doc.reviewerName,
            reviewerRole: doc.reviewerRole,
            status: doc.status,
            studentResponse: doc.studentResponse,
            createdAt: doc.createdAt
          }));
          fetchedFromMongo = true;
        }
      }
    } catch (mongoErr) {
      console.warn('[ReviewController] MongoDB get reviews warning:', mongoErr.message);
    }

    if (!fetchedFromMongo) {
      // [TEMPORARY MIGRATION COMPATIBILITY]
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

    // [FINAL PRODUCTION ARCHITECTURE]
    // Strictly write to MongoDB. Hard fail if unavailable.
    let mongoSuccess = false;
    let updatedReview = null;

    try {
      if (mongoose.connection.readyState === 1) {
        const updateData = {};
        if (status) updateData.status = status;
        if (studentResponse !== undefined) updateData.studentResponse = studentResponse;
        
        updatedReview = await MongoReview.findOneAndUpdate(
          { id: id },
          { $set: updateData },
          { new: true }
        );

        if (updatedReview) {
          mongoSuccess = true;
        }
      }
    } catch (mongoErr) {
      console.error('[ReviewController] MongoDB update review error:', mongoErr.message);
    }

    if (!mongoSuccess) {
      return res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: 'Could not update review in authoritative database. Operation aborted.'
      });
    }

    // Map back for response compatibility
    const updated = {
      id: updatedReview.id,
      manuscriptId: updatedReview.manuscriptId,
      chapter: updatedReview.chapter,
      comment: updatedReview.comment,
      reviewerId: updatedReview.reviewerId,
      reviewerName: updatedReview.reviewerName,
      reviewerRole: updatedReview.reviewerRole,
      status: updatedReview.status,
      studentResponse: updatedReview.studentResponse,
      createdAt: updatedReview.createdAt
    };

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
