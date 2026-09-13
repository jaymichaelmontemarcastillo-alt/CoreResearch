import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { GeminiAdviserMatchingProvider } from '../services/adviserMatchingProviders.js';

async function runTest() {
  console.log('--- Testing E2E Matching Flow ---');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/coreresearch');
    console.log('Connected to MongoDB.');
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }

  try {
    const provider = new GeminiAdviserMatchingProvider();
    const title = 'Machine Learning for Early Detection of Crop Diseases';
    const description = 'A study utilizing computer vision and deep learning models (CNNs) to detect early signs of diseases in rice crops using drone imagery.';
    
    // Create a mock list of advisers
    const advisers = [
      {
        adviserId: 'adv-123',
        specialization: ['Machine Learning', 'Computer Vision'],
        expertise: ['Deep Learning', 'Agriculture Tech'],
        researchInterests: ['AI for Good', 'Crop Monitoring']
      },
      {
        adviserId: 'adv-456',
        specialization: ['Database Systems'],
        expertise: ['SQL', 'Data Warehousing'],
        researchInterests: ['Performance Optimization']
      }
    ];

    console.log('Calling matchAdvisers...');
    const results = await provider.matchAdvisers(title, description, advisers);
    
    console.log('--- Results ---');
    console.log(JSON.stringify(results, null, 2));

  } catch (error) {
    console.error('Matching Flow Test Failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTest();
