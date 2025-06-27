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
    const db = client.db('apex_reels');
    console.log("✅ MongoDB connected");
    cachedDb = db;
    return db;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
}

// Health check endpoint
export async function healthCheck() {
  try {
    const db = await connectToDatabase();
    await db.command({ ping: 1 });
    return { status: 'connected', dbStatus: 'healthy' };
  } catch (error) {
    return { status: 'disconnected', error: error.message };
  }
}

export default async function handler(req, res) {
  // Health check endpoint
  if (req.method === 'GET' && req.query.health) {
    try {
      const health = await healthCheck();
      return res.status(200).json(health);
    } catch (error) {
      return res.status(500).json({ status: 'down', error: error.message });
    }
  }

  // Registration endpoint
  if (req.method === 'POST') {
    console.log("📝 Registration request received");
    
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

      // Create new registration
      const registrationId = generateRegistrationId();
      const result = await registrations.insertOne({
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

      console.log(`✅ Registration successful: ${registrationId}`);
      return res.status(201).json({
        success: true,
        registrationId,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('❌ Registration error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error: ' + error.message
      });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}

function generateRegistrationId() {
  const date = new Date();
  const dateStr = `${date.getDate()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `REEL-${dateStr}-${randomNum}`;
}
