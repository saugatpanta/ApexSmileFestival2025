import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  });
  
  try {
    await client.connect();
    cachedDb = client.db('apex_reels');
    return cachedDb;
  } catch (error) {
    throw new Error(`MongoDB connection failed: ${error.message}`);
  }
}

export default async function handler(req, res) {
  // Health check endpoint
  if (req.method === 'GET') {
    try {
      await connectToDatabase();
      return res.status(200).json({ status: 'ready' });
    } catch (error) {
      return res.status(500).json({ status: 'unavailable' });
    }
  }

  // Registration endpoint
  if (req.method === 'POST') {
    try {
      const db = await connectToDatabase();
      const registrations = db.collection('registrations');

      const { name, email, contact, program, semester, reelLink } = req.body;
      
      // Validate input
      if (!name || !email || !contact || !program || !semester || !reelLink) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required'
        });
      }

      // Check for duplicates
      const existing = await registrations.findOne({ 
        $or: [{ email }, { contact }] 
      });
      
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Email or phone number already registered'
        });
      }

      // Generate ID
      const date = new Date();
      const dateStr = `${date.getDate()}${String(date.getMonth() + 1).padStart(2, '0')}`;
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const registrationId = `REEL-${dateStr}-${randomNum}`;

      // Create registration
      await registrations.insertOne({
        registrationId,
        fullName: name,
        email,
        contact,
        program,
        semester,
        reelLink,
        status: 'Submitted',
        createdAt: new Date()
      });

      return res.status(201).json({
        success: true,
        registrationId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Server error: ' + error.message
      });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
