import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let inFlightConnection = null;

export const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      return mongoose;
    }
    if (inFlightConnection) {
      return await inFlightConnection;
    }

    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      console.warn('[MongoDB] MONGODB_URI is not defined in environment variables. Falling back to mock mode if applicable.');
      return null;
    }

    // Reuse a bounded connection pool and deduplicate concurrent connectDB() calls during request bursts
    inFlightConnection = mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
    });

    const conn = await inFlightConnection;
    inFlightConnection = null;

    // Ensure indexes on native researchgroups collection for fast authorization and schedule/workload lookups
    try {
      const rgCol = conn.connection.db?.collection('researchgroups');
      if (rgCol) {
        Promise.all([
          rgCol.createIndex({ id: 1 }),
          rgCol.createIndex({ sectionId: 1 }),
          rgCol.createIndex({ memberIds: 1 }),
          rgCol.createIndex({ 'members.uid': 1 }),
          rgCol.createIndex({ adviserId: 1 }),
        ]).catch(() => {});
      }
    } catch (e) {}

    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    inFlightConnection = null;
    console.error(`[MongoDB] Connection Error: ${error.message}`);
    // Do not exit process, allow the app to fall back to mock mode if needed
    return null;
  }
};
