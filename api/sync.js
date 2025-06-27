import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
let cachedDb = null;

// Log environment status on startup
console.log('🔐 Sync Endpoint Environment Check:', {
  key_set: !!process.env.SHEET_SYNC_KEY,
  key_value: process.env.SHEET_SYNC_KEY 
    ? `${process.env.SHEET_SYNC_KEY.substring(0, 4)}...${process.env.SHEET_SYNC_KEY.substring(process.env.SHEET_SYNC_KEY.length - 4)}`
    : 'NOT SET',
  mongodb_connected: !!process.env.MONGODB_URI
});

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
  });
  
  try {
    await client.connect();
    cachedDb = client.db('apex_reels');
    return cachedDb;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    throw new Error(`Database connection failed: ${error.message}`);
  }
}

export default async function handler(req, res) {
  // Log raw headers for debugging
  console.log('🔍 Request Headers:', Object.keys(req.headers));
  
  // Case-insensitive header lookup
  const getHeader = (name) => {
    const lowerName = name.toLowerCase();
    for (const [key, value] of Object.entries(req.headers)) {
      if (key.toLowerCase() === lowerName) return value;
    }
    return null;
  };

  // Get API key from all possible sources
  const apiKey = 
    req.query.key || 
    getHeader('x-api-key') || 
    getHeader('x-apex-key') || 
    getHeader('authorization')?.split(' ')[1];

  // Log key details
  console.log('🔑 Key Received:', apiKey ? `${apiKey.substring(0, 4)}...` : 'NONE');
  console.log('🔐 Key Expected:', process.env.SHEET_SYNC_KEY 
    ? `${process.env.SHEET_SYNC_KEY.substring(0, 4)}...`
    : 'NOT SET IN ENVIRONMENT');

  // Verify environment key is set
  if (!process.env.SHEET_SYNC_KEY) {
    console.error('❌ Server Configuration Error: SHEET_SYNC_KEY not set');
    return res.status(500).json({ 
      success: false, 
      message: 'Server configuration error',
      help: 'Add SHEET_SYNC_KEY environment variable in Vercel'
    });
  }

  // Check if key was received
  if (!apiKey) {
    console.error('❌ Missing API Key');
    return res.status(401).json({ 
      success: false, 
      message: 'API key required',
      help: 'Add key to query parameter or header'
    });
  }

  // Compare keys directly without encoding issues
  if (apiKey !== process.env.SHEET_SYNC_KEY) {
    console.error('❌ Key Mismatch');
    
    // Find mismatch position
    let position = -1;
    for (let i = 0; i < Math.max(apiKey.length, process.env.SHEET_SYNC_KEY.length); i++) {
      if (apiKey[i] !== process.env.SHEET_SYNC_KEY[i]) {
        position = i;
        break;
      }
    }
    
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid API key',
      mismatchPosition: position,
      receivedLength: apiKey.length,
      expectedLength: process.env.SHEET_SYNC_KEY.length
    });
  }

  try {
    const db = await connectToDatabase();
    const registrations = db.collection('registrations');
    
    const data = await registrations.find({}, { projection: { _id: 0 } }).toArray();
    console.log(`✅ Fetched ${data.length} records`);
    
    return res.status(200).json({
      success: true,
      data,
      count: data.length
    });
  } catch (error) {
    console.error('❌ Database error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
}
