import { MongoClient } from 'mongodb';
import axios from 'axios';

const uri = process.env.MONGODB_URI;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  
  const client = new MongoClient(uri, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
  });
  
  await client.connect();
  const db = client.db('apex_reels');
  cachedDb = db;
  return db;
}

export default async function handler(req, res) {
  try {
    const { name, email, contact, program, semester, reelLink } = req.body;
    
    // Connect to MongoDB
    const db = await connectToDatabase();
    const registrations = db.collection('registrations');
    
    // Check for existing registration
    if (await registrations.findOne({ email })) {
      return res.status(400).json({ 
        success: false, 
        message: 'This email is already registered' 
      });
    }
    
    if (await registrations.findOne({ contact })) {
      return res.status(400).json({ 
        success: false, 
        message: 'This phone number is already registered' 
      });
    }
    
    // Generate registration ID
    const registrationId = generateRegistrationId();
    
    // Create new registration
    const newRegistration = {
      registrationId,
      fullName: name,
      email,
      contact,
      program,
      semester,
      reelLink,
      status: 'Submitted',
      createdAt: new Date()
    };
    
    // Insert into MongoDB
    await registrations.insertOne(newRegistration);
    
    // Trigger real-time sync to Google Sheet
    try {
      await axios.post(process.env.GOOGLE_SCRIPT_URL, newRegistration, {
        headers: { 
          'Authorization': `Bearer ${process.env.SHEET_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      console.log("✅ Real-time sync triggered");
    } catch (syncError) {
      console.error("⚠️ Real-time sync failed:", syncError.message);
    }
    
    res.status(201).json({
      success: true,
      registrationId,
      timestamp: newRegistration.createdAt
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration: ' + error.message
    });
  }
}

function generateRegistrationId() {
  const date = new Date();
  const dateStr = `${date.getDate()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `REEL-${dateStr}-${randomNum}`;
}
