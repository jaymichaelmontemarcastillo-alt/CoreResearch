import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { User } from '../models/User.js';

async function syncFaculty() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // 1. Sync Chester Mendoza
  const resChester = await User.findOneAndUpdate(
    { uid: 'NB6BslBEMndyfj5P6hptsEh14uE2' },
    {
      uid: 'NB6BslBEMndyfj5P6hptsEh14uE2',
      email: 'chester.mendoza@lspu.edu.ph',
      fullName: 'Chester Mendoza',
      first_name: 'Chester',
      last_name: 'Mendoza',
      role: 'adviser',
      role_id: 'adviser',
      department: 'College of Computer Studies',
      college: 'College of Computer Studies',
      status: 'active',
      is_approved: true,
      isAvailable: true,
      maxCapacity: 5,
      activeGroupsCount: 0,
      specialization: ['Web Development', 'Information Technology', 'Software Engineering'],
      expertise: ['Full Stack Development', 'System Architecture', 'Database Design'],
      researchInterests: ['Web Applications', 'Software Architecture', 'Database Systems'],
      keywords: ['web', 'software', 'database', 'development', 'information technology'],
      updated_at: new Date().toISOString()
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log('Synced Chester Mendoza:', resChester.fullName);

  // 2. Sync Michael C. Montemar
  const resMontemar = await User.findOneAndUpdate(
    { uid: 'TLzlls4GrgPBpYu2AwjaZ2AqbAP2' },
    {
      uid: 'TLzlls4GrgPBpYu2AwjaZ2AqbAP2',
      email: 'michael.montemar@lspu.edu.ph',
      fullName: 'Michael C. Montemar',
      first_name: 'Michael',
      last_name: 'Montemar',
      role: 'adviser',
      role_id: 'adviser',
      department: 'College of Computer Studies',
      college: 'College of Computer Studies',
      status: 'active',
      is_approved: true,
      isAvailable: true,
      maxCapacity: 5,
      activeGroupsCount: 0,
      specialization: ['Research Management Systems', 'Software Engineering', 'Information Systems'],
      expertise: ['Web Portals', 'Manuscript Monitoring', 'System Analysis', 'Data Analytics'],
      researchInterests: ['Manuscript Management', 'Research Portals', 'Educational Technology'],
      keywords: ['research', 'manuscript', 'portal', 'monitoring', 'management', 'grading'],
      updated_at: new Date().toISOString()
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log('Synced Michael C. Montemar:', resMontemar.fullName);

  // 3. Update Admin to ensure adviser capabilities if acting as adviser
  const resAdmin = await User.findOneAndUpdate(
    { uid: 'jcd5FxgvKOX5Ora7vtOSFEr0uJz2' },
    {
      isAvailable: true,
      maxCapacity: 5,
      activeGroupsCount: 0,
      department: 'College of Computer Studies',
      college: 'College of Computer Studies',
      specialization: ['Computer Science', 'Software Engineering', 'Artificial Intelligence'],
      expertise: ['Machine Learning', 'System Design', 'Cloud Computing'],
      researchInterests: ['Artificial Intelligence', 'Software Systems'],
      keywords: ['ai', 'machine learning', 'cloud', 'system design', 'computer science']
    },
    { new: true }
  );
  console.log('Updated Admin adviser fields:', resAdmin.fullName);

  // Also check Adviser one to ensure complete fields
  await User.findOneAndUpdate(
    { uid: 'Qdk3KHwRrrYi2EtMfvqyrPECjGl2' },
    {
      isAvailable: true,
      maxCapacity: 5,
      activeGroupsCount: 0,
      status: 'active',
      is_approved: true,
      department: 'College of Computer Studies',
      college: 'College of Computer Studies',
    }
  );

  const totalAdvisers = await User.countDocuments({ role: { $in: ['adviser', 'faculty'] } });
  console.log(`Total advisers now in MongoDB: ${totalAdvisers}`);
  process.exit(0);
}

syncFaculty().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
