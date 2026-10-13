import dotenv from 'dotenv';
dotenv.config();
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import { User } from '../models/User.js';

// Read Firebase Web API Key from client/.env.local or fallback
function getFirebaseConfig() {
  const envPath = path.resolve(process.cwd(), '../client/.env.local');
  let apiKey = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyDy876JtXty19jkIfkyNyo_Rb_rN42lJas';
  let projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'coreresearch-33a17';

  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const keyMatch = content.match(/VITE_FIREBASE_API_KEY=(.+)/);
    const projMatch = content.match(/VITE_FIREBASE_PROJECT_ID=(.+)/);
    if (keyMatch) apiKey = keyMatch[1].trim();
    if (projMatch) projectId = projMatch[1].trim();
  }

  return { apiKey, projectId };
}

async function createOrAuthenticateUser(apiKey, email, password) {
  // 1. Try to register with Firebase Auth REST API
  const signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;
  const signUpRes = await fetch(signUpUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: true
    })
  });

  const signUpData = await signUpRes.json();

  if (signUpRes.ok) {
    console.log(`✅ Created Firebase Auth user: ${email} (UID: ${signUpData.localId})`);
    return {
      uid: signUpData.localId,
      idToken: signUpData.idToken,
      isNew: true
    };
  }

  // If already exists, sign in to retrieve token & uid
  if (signUpData.error && signUpData.error.message.includes('EMAIL_EXISTS')) {
    console.log(`ℹ️ User ${email} already exists in Firebase Auth. Signing in...`);
    const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
    const signInRes = await fetch(signInUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true
      })
    });

    const signInData = await signInRes.json();
    if (signInRes.ok) {
      console.log(`✅ Signed in existing user: ${email} (UID: ${signInData.localId})`);
      return {
        uid: signInData.localId,
        idToken: signInData.idToken,
        isNew: false
      };
    } else {
      throw new Error(`Failed to sign in existing user: ${JSON.stringify(signInData.error)}`);
    }
  } else {
    throw new Error(`Firebase Auth Sign-Up error: ${JSON.stringify(signUpData.error)}`);
  }
}

// Convert JS object to Firestore REST document fields
function toFirestoreFields(obj) {
  const fields = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      fields[key] = { nullValue: null };
    } else if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        fields[key] = { integerValue: value.toString() };
      } else {
        fields[key] = { doubleValue: value };
      }
    } else if (Array.isArray(value)) {
      fields[key] = {
        arrayValue: {
          values: value.map((item) => ({ stringValue: String(item) }))
        }
      };
    } else if (typeof value === 'object') {
      fields[key] = { mapValue: { fields: toFirestoreFields(value) } };
    }
  }
  return fields;
}

async function saveToFirestore(projectId, idToken, uid, profileData) {
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`;
  const fields = toFirestoreFields(profileData);

  const res = await fetch(firestoreUrl, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify({ fields })
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.warn(`⚠️ Firestore REST write returned status ${res.status}: ${errorText}`);
  } else {
    console.log(`✅ Profile successfully saved to Firestore: users/${uid}`);
  }
}

async function saveToMongoDB(profileData) {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.warn('⚠️ No MONGODB_URI found, skipping MongoDB sync.');
      return;
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(mongoUri);
      console.log('✅ Connected to MongoDB');
    }

    const updated = await User.findOneAndUpdate(
      { uid: profileData.uid },
      profileData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`✅ Profile successfully synced to MongoDB for ${updated.fullName} (${updated.email})`);
  } catch (err) {
    console.warn('⚠️ MongoDB save warning:', err.message);
  }
}

async function main() {
  console.log('========================================================');
  console.log('  Adding Wilson B. Suyat as Adviser to CoreResearch');
  console.log('========================================================\n');

  const { apiKey, projectId } = getFirebaseConfig();
  console.log(`Using Firebase Project ID: ${projectId}`);

  // User credentials
  const email = 'wilson.suyat@gmail.com';
  const password = 'Password123!';

  // Adviser profile data
  const adviserProfile = {
    email: email,
    fullName: 'Wilson B. Suyat',
    first_name: 'Wilson',
    last_name: 'Suyat',
    role: 'adviser',
    role_id: 'adviser',
    department: 'College of Computer Studies',
    department_id: 'ccs',
    college: 'College of Computer Studies',
    studentIdOrEmployeeId: 'EMP-2024-0018',
    status: 'active',
    is_approved: true,
    isAvailable: true,
    maxCapacity: 5,
    activeGroupsCount: 0,
    expertise: [
      'Internet of Things (IoT)',
      'Information Systems',
      'Software Engineering',
      'Embedded Systems',
      'System Analysis & Design'
    ],
    selectedExpertise: [
      'Internet of Things (IoT)',
      'Information Systems',
      'Software Engineering'
    ],
    specialization: [
      'Internet of Things (IoT)',
      'Information Systems',
      'Software Engineering'
    ],
    researchInterests: [
      'Internet of Things (IoT)',
      'Smart Systems & Automation',
      'Information Systems',
      'Software Engineering'
    ],
    keywords: [
      'iot',
      'internet of things',
      'information systems',
      'software engineering',
      'embedded systems',
      'sensors',
      'systems analysis'
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // 1. Authenticate / Create Firebase Auth User
  const authResult = await createOrAuthenticateUser(apiKey, email, password);
  adviserProfile.uid = authResult.uid;

  // 2. Save / Update in Firestore
  await saveToFirestore(projectId, authResult.idToken, authResult.uid, adviserProfile);

  // 3. Save / Update in MongoDB
  await saveToMongoDB(adviserProfile);

  console.log('\n========================================================');
  console.log('  🎉 Wilson B. Suyat successfully registered!');
  console.log('========================================================');
  console.log(`  Name:        ${adviserProfile.fullName}`);
  console.log(`  Role:        ${adviserProfile.role}`);
  console.log(`  Email:       ${adviserProfile.email}`);
  console.log(`  Password:    ${password}`);
  console.log(`  UID:         ${adviserProfile.uid}`);
  console.log(`  Department:  ${adviserProfile.department}`);
  console.log(`  Status:      ${adviserProfile.status} (Approved: ${adviserProfile.is_approved})`);
  console.log(`  Expertise:   ${adviserProfile.expertise.join(', ')}`);
  console.log(`  Selected:    ${adviserProfile.selectedExpertise.join(', ')}`);
  console.log('========================================================\n');

  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error creating Wilson B. Suyat:', err);
  process.exit(1);
});
