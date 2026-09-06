import mongoose from 'mongoose';
import * as Y from 'yjs';
import { TiptapTransformer } from '@hocuspocus/transformer';
import { Document as MongoDocument } from '../models/Document.js';
import { getStorageProvider } from '../services/storage/storageManager.js';
import { Document as DocxDocument, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell } from 'docx';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Setup DB connection
const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/coreresearch_docs';
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      family: 4
    });
    console.log('[Migration] Connected to MongoDB');
  }
};

// Helper: Parse Tiptap node into docx children
function parseTiptapNode(node) {
  if (node.type === 'text') {
    const isBold = node.marks?.some(m => m.type === 'bold');
    const isItalic = node.marks?.some(m => m.type === 'italic');
    const isUnderline = node.marks?.some(m => m.type === 'underline');
    return new TextRun({
      text: node.text || '',
      bold: isBold,
      italics: isItalic,
      underline: isUnderline ? {} : undefined,
    });
  }

  if (node.type === 'paragraph') {
    return new Paragraph({
      children: (node.content || []).map(parseTiptapNode).filter(Boolean).flat(),
    });
  }

  if (node.type === 'heading') {
    const levelMap = {
      1: HeadingLevel.HEADING_1,
      2: HeadingLevel.HEADING_2,
      3: HeadingLevel.HEADING_3,
      4: HeadingLevel.HEADING_4,
      5: HeadingLevel.HEADING_5,
      6: HeadingLevel.HEADING_6,
    };
    return new Paragraph({
      heading: levelMap[node.attrs?.level] || HeadingLevel.HEADING_1,
      children: (node.content || []).map(parseTiptapNode).filter(Boolean).flat(),
    });
  }

  // Handle lists simply by parsing their content as paragraphs for now, 
  // as deep nested lists require specific DOCX numbering logic which is complex
  if (node.type === 'bulletList' || node.type === 'orderedList') {
    return (node.content || []).map(listItem => {
      // listItem contains paragraphs usually
      const children = (listItem.content || []).map(parseTiptapNode).flat();
      // Add a simple bullet representation
      if (children.length > 0 && children[0] instanceof Paragraph) {
        // Docx allows bullet points, but for a safe minimal conversion, we just use text fallback or basic paragraph
        return new Paragraph({
          bullet: { level: 0 },
          children: children[0].root // Extract children of the paragraph
        });
      }
      return children;
    }).flat();
  }
  
  if (node.type === 'listItem') {
     return (node.content || []).map(parseTiptapNode).flat();
  }

  // Fallback for unknown block nodes
  if (node.content) {
    return node.content.map(parseTiptapNode).flat();
  }

  return null;
}

export const runMigration = async (documentId = null, dryRun = false) => {
  await connectDB();
  const storageProvider = getStorageProvider();

  const query = documentId ? { id: documentId } : {};

  console.log('[Migration] Building query...', JSON.stringify(query));
  
  console.log('[Migration] Executing MongoDocument.find()...');
  const allDocs = await MongoDocument.find(query);
  
  // Filter in memory to avoid complex query hangs on free tier MongoDB
  const documents = documentId ? allDocs : allDocs.filter(d => 
    d.editorType !== 'onlyoffice' || !d.onlyofficeFileKey
  );
  
  console.log(`[Migration] Found ${documents.length} legacy documents to migrate (out of ${allDocs.length} total binary state docs).`);

  let successCount = 0;
  let skipCount = 0;

  for (const doc of documents) {
    console.log(`\n--- Migrating Document ID: ${doc.id} ---`);
    
    // Idempotency check
    if (doc.editorType === 'onlyoffice' && doc.onlyofficeFileKey) {
      console.log(`[Migration] Document ${doc.id} is already migrated. Skipping.`);
      skipCount++;
      continue;
    }

    try {
      const binary = doc.yjsBinaryState;
      const ydoc = new Y.Doc();
      Y.applyUpdate(ydoc, binary);

      // We don't have the exact extensions imported here, but transformer uses a basic schema by default
      const tiptapJson = TiptapTransformer.fromYdoc(ydoc, 'default');
      
      const docxChildren = [];
      if (tiptapJson.content) {
        tiptapJson.content.forEach(node => {
          const parsed = parseTiptapNode(node);
          if (parsed) {
            if (Array.isArray(parsed)) {
              docxChildren.push(...parsed);
            } else {
              docxChildren.push(parsed);
            }
          }
        });
      }

      // If document is completely empty, add a blank paragraph to prevent docx generation error
      if (docxChildren.length === 0) {
        docxChildren.push(new Paragraph({ children: [new TextRun("")] }));
      }

      // Filter out invalid children (only Paragraph and Table allowed at root in docx)
      const validRootChildren = docxChildren.filter(c => c instanceof Paragraph || c instanceof Table);

      const docxDoc = new DocxDocument({
        sections: [{
          properties: {},
          children: validRootChildren.length > 0 ? validRootChildren : [new Paragraph({})],
        }],
      });

      const b64string = await Packer.toBase64String(docxDoc);
      const fileBuffer = Buffer.from(b64string, 'base64');

      const cleanFileName = (doc.title || 'untitled').replace(/[^a-zA-Z0-9._-]/g, '_');
      const storageKey = `documents/${doc.id}/original/${cleanFileName}.docx`;

      if (dryRun) {
        console.log(`[Migration] [DRY RUN] Would upload DOCX to ${storageKey}`);
        console.log(`[Migration] [DRY RUN] Would update MongoDocument with editorType: 'onlyoffice'`);
        successCount++;
        continue;
      }

      // Upload to GridFS
      await storageProvider.upload(
        storageKey,
        fileBuffer,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        { documentId: doc.id, migration: true }
      );
      console.log(`[Migration] Uploaded DOCX to GridFS: ${storageKey}`);

      // Update MongoDocument
      doc.editorType = 'onlyoffice';
      doc.onlyofficeFileKey = storageKey;
      // Do NOT delete yjsBinaryState yet, per instructions!
      await doc.save();
      
      console.log(`[Migration] Successfully updated MongoDB document metadata.`);
      successCount++;
    } catch (err) {
      console.error(`[Migration] Failed to migrate document ${doc.id}:`, err);
    }
  }

  console.log(`\n[Migration] Complete. Migrated: ${successCount}, Skipped: ${skipCount}, Total: ${documents.length}`);
  
  if (!documentId) {
    process.exit(0);
  }
};

// Check if run directly
if (process.argv[1] && process.argv[1].endsWith('migrateToOnlyOffice.js')) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const idIndex = args.indexOf('--id');
  const targetId = idIndex > -1 ? args[idIndex + 1] : null;

  runMigration(targetId, dryRun).then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
