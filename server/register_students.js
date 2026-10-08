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
  { name: 'Mole, Aivan P.', email: 'aivan.mole@gmail.com' },
  { name: 'Sanchez, Luigi G.', email: 'luigi.sanchez@gmail.com' },
  { name: 'Mamaril, Maria Princessa Miccahella M.', email: 'micahella.mamaril@gmail.com' },
  { name: 'Flores, Andrew A.', email: 'andrewflores@gmail.com' },
  { name: 'Dacallos, Hermie A.', email: 'hermie.a@gmail.com' },
  { name: 'Punta, Kenneth Z.', email: 'kennethz.punta@gmail.com' },
  { name: 'Campaner, Marianne Angel B.', email: 'marianneangel@gmail.com' },
  { name: 'Tejada, Daniel F.', email: 'daniel.tejada@gmail.com' },
  { name: 'Barayang, Crislién Ariane S.', email: 'crislién.barayang@gmail.com' },
  { name: 'Maligaya, Lance Edwin M.', email: 'lanceedwin@gmail.com' },
  { name: 'Ocampo, Princess Pinkie C.', email: 'pinkie.ocampo@gmail.com' },
  { name: 'Gonzales, Jasper M.', email: 'jasperm.gonzales@gmail.com' },
  { name: 'Villamayor, Harvy C.', email: 'harvy.villamayor@gmail.com' },
  { name: 'Bacolod, Irah Shane P.', email: 'irahshane.bacolod@gmail.com' },
  { name: 'Dela Rueda, John Paul A.', email: 'johnpaul.delarueda@gmail.com' },
  { name: 'Palis, Ron Alfred F.', email: 'ronalfred.palis@gmail.com' },
  { name: 'Llanes, Paul Daniel M.', email: 'pauldaniel.llanes@gmail.com' },
  { name: 'Esplana, Mark Philip L.', email: 'markphilip.esplana@gmail.com' },
  { name: 'Macaleng, Jose Mari Elliflor J.', email: 'josemari.macaleng@gmail.com' },
  { name: 'Natal, Justine M.', email: 'justine.natal@gmail.com' },
  { name: 'Botones, Giancarlo G.', email: 'giancarlo.botones@gmail.com' },
  { name: 'Perez, Rafael Louise R.', email: 'rafael.perez@gmail.com' },
  { name: 'Rosales, Carl Joseph E.', email: 'carljoseph.rosales@gmail.com' },
  { name: 'Asinas, Ronnell E.', email: 'ronnell.asinas@gmail.com' },
  { name: 'Mundia, Jeruslalyn D.', email: 'jeruslalyn.mundia@gmail.com' }
];

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/coreresearch');
  
  // Find service account
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

  const User = mongoose.model('User', new mongoose.Schema({ uid: String }, { strict: false }));
  
  const results = [];

  for (const s of students) {
    // Generate a simple password, e.g. CS2026_Firstname
    const firstName = s.name.split(',')[1].trim().split(' ')[0].replace(/[^a-zA-Z]/g, '');
    const password = `CS2026_${firstName}!`;
    
    let uid;
    try {
      try {
        const userRec = await admin.auth().getUserByEmail(s.email);
        uid = userRec.uid;
        console.log(`User ${s.email} already exists in Firebase. Updating password...`);
        await admin.auth().updateUser(uid, { password });
      } catch (e) {
        if (e.code === 'auth/user-not-found') {
          const userRec = await admin.auth().createUser({
            email: s.email,
            password: password,
            displayName: s.name
          });
          uid = userRec.uid;
        } else {
          throw e;
        }
      }
      
      const first_name = s.name.split(',')[1].trim();
      const last_name = s.name.split(',')[0].trim();
      
      const doc = {
        uid,
        email: s.email,
        first_name,
        last_name,
        fullName: `${first_name} ${last_name}`,
        role: 'student',
        role_id: 'student',
        department: 'Computer Studies',
        department_id: 'Computer Studies',
        program: 'Computer Science', // Assuming CS
        section: 'A',
        sectionId: 'A',
        status: 'pending',
        is_approved: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      await User.findOneAndUpdate({ uid }, doc, { upsert: true, new: true, setDefaultsOnInsert: true });
      await admin.firestore().collection('users').doc(uid).set(doc, { merge: true });
      
      results.push({ name: s.name, email: s.email, password });
      console.log(`Registered ${s.email}`);
    } catch (err) {
      console.error(`Failed to register ${s.email}:`, err.message);
      results.push({ name: s.name, email: s.email, password: `FAILED: ${err.message}` });
    }
  }
  
  fs.writeFileSync('passwords.json', JSON.stringify(results, null, 2));
  console.log('Done! Saved to passwords.json');
  process.exit(0);
}

run();
