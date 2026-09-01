import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { Schedule } from './src/models/Schedule.js';
import { connectDB } from './src/config/db.js';

const checkDb = async () => {
  await connectDB();
  if (mongoose.connection.readyState === 1) {
    const schedules = await Schedule.find({});
    console.log(`Found ${schedules.length} schedules in MongoDB.`);
    if (schedules.length > 0) {
      console.log('Sample schedule:', schedules[0]);
    }
  } else {
    console.log('Not connected to MongoDB.');
  }
  process.exit(0);
};

checkDb();
