import admin from 'firebase-admin';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const students = [
  { email: 'aivan.mole@gmail.com' },
  { email: 'luigi.sanchez@gmail.com' },
  { email: 'micahella.mamaril@gmail.com' },
  { email: 'andrewflores@gmail.com' },
  { email: 'hermie.a@gmail.com' },
  { email: 'kennethz.punta@gmail.com' },
  { email: 'marianneangel@gmail.com' },
  { email: 'daniel.tejada@gmail.com' },
  { email: 'crislién.barayang@gmail.com' },
  { email: 'lanceedwin@gmail.com' },
  { email: 'pinkie.ocampo@gmail.com' },
  { email: 'jasperm.gonzales@gmail.com' },
  { email: 'harvy.villamayor@gmail.com' },
  { email: 'irahshane.bacolod@gmail.com' },
  { email: 'johnpaul.delarueda@gmail.com' },
  { email: 'ronalfred.palis@gmail.com' },
  { email: 'pauldaniel.llanes@gmail.com' },
  { email: 'markphilip.esplana@gmail.com' },
  { email: 'josemari.macaleng@gmail.com' },
  { email: 'justine.natal@gmail.com' },
  { email: 'giancarlo.botones@gmail.com' },
  { email: 'rafael.perez@gmail.com' },
  { email: 'carljoseph.rosales@gmail.com' },
  { email: 'ronnell.asinas@gmail.com' },
  { email: 'jeruslalyn.mundia@gmail.com' }
];

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  
  const rootDir = process.cwd();
  const parentDir = path.resolve(rootDir, '..');
  
  const findServiceAccount = () => {
    const dirsToSearch = [rootDir, parentDir];
    for (const dir of dirsToSearch) {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file === 'serviceAccountKey.json' || (file.includes('firebase-adminsdk') && file.endsWith('.json'))) {
          return path.resolve(dir, file);
        }
      }
    }
    return null;
  };

  const saPath = findServiceAccount();
  if (saPath) {
    admin.initializeApp({
      credential: admin.credential.cert(saPath)
    });
  } else if (process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      })
    });
  } else {
    throw new Error('No Firebase credentials found');
  }

  const User = mongoose.model('User', new mongoose.Schema({ email: String, uid: String }, { strict: false }));
  
  for (const s of students) {
    const updateData = {
      majorCode: 'IS',
      programSpecialization: 'IS',
      sectionName: 'A'
    };
    
    try {
      const dbUser = await User.findOneAndUpdate(
        { email: s.email }, 
        updateData, 
        { returnDocument: 'after' }
      );
      
      if (dbUser && dbUser.uid) {
        await admin.firestore().collection('users').doc(dbUser.uid).set(updateData, { merge: true });
        console.log(`Updated ${s.email} with IS and Section A`);
      } else {
        console.log(`User ${s.email} not found in DB`);
      }
    } catch (err) {
      console.error(`Failed to update ${s.email}:`, err.message);
    }
  }
  
  console.log('Done!');
  process.exit(0);
}

run();
