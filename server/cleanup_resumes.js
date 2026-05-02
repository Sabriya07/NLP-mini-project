import mongoose from 'mongoose';
import Resume from './models/Resume.js';
import Job from './models/Job.js';
import Interview from './models/Interview.js';

async function cleanupInvalidResumes() {
  await mongoose.connect('mongodb://127.0.0.1:27017/recruitment_db');
  console.log('Connected to DB');

  const resumes = await Resume.find({});
  let invalidIds = [];

  for (let r of resumes) {
    const err = r.validateSync();
    if (err && err.message.includes('personalInfo')) {
      invalidIds.push(r._id);
    }
  }

  if (invalidIds.length > 0) {
    console.log(`Found ${invalidIds.length} invalid resumes. Deleting them...`);
    await Resume.deleteMany({ _id: { $in: invalidIds } });
    await Job.updateMany({}, { $pull: { ranked: { resumeId: { $in: invalidIds } } } });
    await Interview.deleteMany({ resumeId: { $in: invalidIds } });
    console.log('Successfully deleted invalid resumes and cleaned up references.');
  } else {
    console.log('No invalid resumes found.');
  }

  await mongoose.disconnect();
}

cleanupInvalidResumes().catch(console.error);
