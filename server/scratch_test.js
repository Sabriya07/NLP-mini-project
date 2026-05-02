import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema({
  personalInfo: {
    full_name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    city: { type: String, required: true },
  },
});

const Resume = mongoose.model('Resume', resumeSchema);

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/test_db_debug_123');
  
  try {
    const r = new Resume({
      personalInfo: {
        full_name: "John",
        email: "john@test.com",
        phone: "123",
        city: "" // testing empty string
      }
    });
    await r.save();
    console.log("Saved empty string");
  } catch (e) {
    console.error("Error empty string:", e.message);
  }

  try {
    const r2 = new Resume({
      personalInfo: {
        full_name: " ",
        email: " ",
        phone: " ",
        city: " "
      }
    });
    await r2.save();
    console.log("Saved spaces");
  } catch (e) {
    console.error("Error spaces:", e.message);
  }

  try {
    // testing findOneAndUpdate without runValidators
    const r3 = await Resume.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId() },
      {
        personalInfo: {
          full_name: "",
          email: "",
          phone: "",
          city: ""
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log("Saved findOneAndUpdate with empty string, no error");
    
    // Now trigger save
    await r3.save();
    console.log("Saved r3 with save(), no error");
  } catch (e) {
    console.error("Error r3:", e.message);
  }

  await mongoose.disconnect();
}

run();
