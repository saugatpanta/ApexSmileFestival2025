import { MongoClient } from 'mongodb';
import axios from 'axios';

const uri = process.env.MONGODB_URI;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  
  await client.connect();
  const db = client.db('apex_reels');
  cachedDb = db;
  return db;
}

async function syncToGoogleSheets(registration) {
  try {
    const response = await axios.post(
      process.env.GOOGLE_SCRIPT_URL,
      registration,
      {
        headers: {
          'Authorization': `Bearer ${process.env.SHEET_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 seconds timeout
      }
    );
    
    console.log('Google Sheets sync successful:', response.data);
    return true;
  } catch (error) {
    console.error('Google Sheets sync failed:', error.message);
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    const db = await connectToDatabase();
    const registrations = db.collection('registrations');

    const { name, email, contact, program, semester, reelLink } = req.body;
    
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

    // Save to MongoDB
    const result = await registrations.insertOne(newRegistration);
    console.log('Saved to MongoDB:', result.insertedId);

    // Sync to Google Sheets (fire-and-forget)
    syncToGoogleSheets(newRegistration);

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
