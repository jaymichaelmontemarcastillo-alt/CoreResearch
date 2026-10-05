const mongoose = require('mongoose');

async function test() {
  try {
    const mongoURI = "mongodb+srv://jaymichaelmontemarcastillo_db_user:UWIt1KgwttLDcFej@cluster0.2kqoljr.mongodb.net/coreresearch?appName=Cluster0";
    await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 5000 });
    console.log("MongoDB connected successfully");
    const docs = await mongoose.connection.db.collection('adviserresearchdocuments').find({}).toArray();
    console.log("Documents count:", docs.length);
    process.exit(0);
  } catch (err) {
    console.error("MongoDB error:", err.message);
    process.exit(1);
  }
}
test();
