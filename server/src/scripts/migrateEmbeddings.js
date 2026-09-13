import mongoose from 'mongoose';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Assuming this script is run from server/src/scripts
import { AdviserResearchDocument } from '../models/AdviserResearchDocument.js';

async function runMigration() {
  console.log('--- Embedding Migration Started ---');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/coreresearch');
    console.log('Connected to MongoDB.');
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const allReadyDocs = await AdviserResearchDocument.find({ processingStatus: 'READY' });
  console.log(`Total READY documents found: ${allReadyDocs.length}`);
  
  const eligibleDocs = [];
  const alreadyMigrated = [];
  const invalidDocs = [];

  for (const doc of allReadyDocs) {
    // Check if it already has the new 3072-dimension vector or the correct embedding model
    if ((doc.embedding && doc.embedding.length === 3072) || doc.embeddingModel === 'gemini-embedding-2') {
      alreadyMigrated.push(doc.id);
      continue;
    }
    
    // Check if fingerprint exists (must have some data to embed)
    if (!doc.abstract && (!doc.researchTopics || doc.researchTopics.length === 0)) {
      invalidDocs.push(doc.id);
      continue;
    }
    
    eligibleDocs.push(doc);
  }

  console.log(`Already migrated (3072 dims): ${alreadyMigrated.length}`);
  console.log(`Missing fingerprint data: ${invalidDocs.length}`);
  console.log(`Eligible for migration: ${eligibleDocs.length}`);

  let successCount = 0;
  let failCount = 0;

  for (const doc of eligibleDocs) {
    try {
      const combinedRepresentation = [
        doc.abstract || '',
        ...(doc.researchTopics || []),
        ...(doc.keywords || []),
        ...(doc.keyPhrases || []),
        ...(doc.researchConcepts || []),
        ...(doc.methodologies || []),
        doc.researchDomain || '',
        doc.researchProblem || ''
      ].join(' ');

      const response = await ai.models.embedContent({
        model: 'gemini-embedding-2',
        contents: combinedRepresentation,
      });

      const newEmbedding = response.embeddings[0].values;
      if (!newEmbedding || newEmbedding.length !== 3072) {
        throw new Error(`Unexpected dimension: ${newEmbedding ? newEmbedding.length : 'undefined'}`);
      }

      // Save safely without deleting old until new is ready
      await AdviserResearchDocument.updateOne(
        { id: doc.id },
        { 
          $set: { 
            embedding: newEmbedding,
            embeddingModel: 'gemini-embedding-2',
            embeddingDimensions: newEmbedding.length
          } 
        }
      );
      
      console.log(`✅ [${doc.id}] Successfully migrated`);
      successCount++;
    } catch (err) {
      console.error(`❌ [${doc.id}] Migration failed:`, err.message);
      failCount++;
    }
  }

  console.log('--- Migration Complete ---');
  console.log(`Total: ${allReadyDocs.length} | Migrated: ${successCount} | Skipped (already done): ${alreadyMigrated.length} | Skipped (invalid): ${invalidDocs.length} | Failed: ${failCount}`);
  
  await mongoose.disconnect();
  process.exit(0);
}

runMigration().catch(console.error);
