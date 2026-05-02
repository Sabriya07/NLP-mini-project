import mongoose from 'mongoose';
import Resume from './models/Resume.js';

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/recruitment_db'); // Assuming default DB or read from env
  
  const resumes = await Resume.find({});
  let invalidCount = 0;
  for (let r of resumes) {
    const err = r.validateSync();
    if (err) {
      console.log(`Resume ${r._id} validation error:`, err.message);
      invalidCount++;
    }
  }
  console.log(`Found ${invalidCount} invalid resumes out of ${resumes.length}`);
  
  await mongoose.disconnect();
}

run();
