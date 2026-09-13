import { AdviserResearchDocument } from '../models/AdviserResearchDocument.js';
import adviserResearchProcessingService from '../services/adviserResearchProcessingService.js';

/**
 * Upload a new research document
 */
export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const adviserId = req.user.uid;
    
    // Only advisers can upload to this endpoint
    if (req.user.role !== 'adviser') {
      return res.status(403).json({ success: false, message: 'Only advisers can upload research documents' });
    }

    const doc = await adviserResearchProcessingService.importResearchDocument({
      fileBuffer: req.file.buffer,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      adviserId
    });

    return res.status(201).json({
      success: true,
      data: doc
    });
  } catch (error) {
    console.error('[AdviserResearchController] upload error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get all research documents for the authenticated adviser
 */
export const getMyDocuments = async (req, res) => {
  try {
    const adviserId = req.user.uid;
    const docs = await AdviserResearchDocument.find({ adviserId })
      .select('-extractedText -embedding') // Don't send huge texts/vectors to frontend
      .sort({ created_at: -1 });

    return res.status(200).json({
      success: true,
      data: docs
    });
  } catch (error) {
    console.error('[AdviserResearchController] getMyDocuments error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete a research document
 */
export const deleteDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const adviserId = req.user.uid;

    await adviserResearchProcessingService.deleteDocument(documentId, adviserId);

    return res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('[AdviserResearchController] deleteDocument error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Reprocess a FAILED research document
 */
export const reprocessDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const adviserId = req.user.uid;

    const result = await adviserResearchProcessingService.reprocessDocument(documentId, adviserId);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[AdviserResearchController] reprocessDocument error:', error);
    if (error.message.includes('not found') || error.message.includes('unauthorized')) {
      return res.status(404).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};
