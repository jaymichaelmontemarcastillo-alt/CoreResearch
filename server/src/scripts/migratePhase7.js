// server/src/scripts/migratePhase7.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { connectDB } from '../config/db.js';
import { GridFsStorageProvider } from '../services/storage/GridFsStorageProvider.js';
import { Document as MongoDocument } from '../models/Document.js';

dotenv.config();

const migrateStorageToGridFS = async () => {
  console.log('--- Starting Phase 7 Storage Migration ---');
  await connectDB();

  if (mongoose.connection.readyState !== 1) {
    console.error('Failed to connect to MongoDB. Aborting migration.');
    process.exit(1);
  }

  const gridFsProvider = new GridFsStorageProvider();
  const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads');

  console.log('Checking for local files in:', UPLOADS_ROOT);

  if (!fs.existsSync(UPLOADS_ROOT)) {
    console.log('No local uploads directory found. Nothing to migrate from local storage.');
  } else {
    // Recursively read all files in uploads
    const getAllFiles = (dirPath, arrayOfFiles) => {
      const files = fs.readdirSync(dirPath);
      arrayOfFiles = arrayOfFiles || [];

      files.forEach((file) => {
        if (fs.statSync(dirPath + '/' + file).isDirectory()) {
          arrayOfFiles = getAllFiles(dirPath + '/' + file, arrayOfFiles);
        } else {
          arrayOfFiles.push(path.join(dirPath, '/', file));
        }
      });

      return arrayOfFiles;
    };

    const localFiles = getAllFiles(UPLOADS_ROOT);
    console.log(`Found ${localFiles.length} files in local storage.`);

    for (const filePath of localFiles) {
      const relativePath = path.relative(UPLOADS_ROOT, filePath).replace(/\\/g, '/');
      const buffer = fs.readFileSync(filePath);
      
      // Attempt to determine mimeType
      const ext = path.extname(filePath).toLowerCase();
      let mimeType = 'application/octet-stream';
      if (ext === '.pdf') mimeType = 'application/pdf';
      if (ext === '.docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      if (ext === '.png') mimeType = 'image/png';
      if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';

      console.log(`Migrating: ${relativePath} (${mimeType})`);
      
      try {
        await gridFsProvider.upload(relativePath, buffer, mimeType, { migrated: true });
        console.log(` -> Successfully uploaded ${relativePath} to GridFS.`);
      } catch (err) {
        console.error(` -> Failed to upload ${relativePath}:`, err.message);
      }
    }
  }

  // Update MongoDocument metadata to point to GridFS
  console.log('\nUpdating MongoDB Document references...');
  const docs = await MongoDocument.find({});
  let updatedCount = 0;

  for (const doc of docs) {
    let changed = false;
    // We would update URLs in the document if we stored them in the document model directly
    // Since Phase 4 focused on Yjs binary state, the assets are embedded as URLs in the Y.Doc state
    // To fully migrate URLs inside Yjs state is extremely complex as it requires parsing the CRDT.
    // However, our new GridFsStorageProvider uses the EXACT same resolveUrl format (/api/storage/assets/...)
    // as the LocalStorageProvider did! 
    // Therefore, no Yjs content modification is required! The existing URLs will seamlessly route to GridFS.
  }

  console.log('Migration Phase 7 completed.');
  process.exit(0);
};

migrateStorageToGridFS();
