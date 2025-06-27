import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
let cachedDb = null;

// Verify environment variable is set
if (!process.env.SHEET_SYNC_KEY) {
  console.error('❌ CRITICAL ERROR: SHEET_SYNC_KEY environment variable is not set!');
}

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
    console.log('✅ MongoDB connected');
    return cachedDb;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    throw new Error(`Database connection failed: ${error.message}`);
  }
}

export default async function handler(req, res) {
  // Log environment status
  console.log('ℹ️ Environment check:', {
    node_env: process.env.NODE_ENV,
    vercel_env: process.env.VERCEL_ENV,
    key_set: !!process.env.SHEET_SYNC_KEY
  });

  // Verify API key from multiple sources
  const apiKey = 
    req.query.key || 
    req.headers['x-api-key'] || 
    req.headers['authorization']?.split(' ')[1];
  
  // Log request details
  console.log('🔒 Sync request received', {
    method: req.method,
    path: req.url,
    query: req.query,
    headers: {
      'user-agent': req.headers['user-agent'],
      'x-forwarded-for': req.headers['x-forwarded-for']
    },
    receivedKey: apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'none'
  });

  // Validate API key
  if (!process.env.SHEET_SYNC_KEY) {
    console.error('❌ Server misconfigured: SHEET_SYNC_KEY not set');
    return res.status(500).json({ 
      success: false, 
      message: 'Server configuration error' 
    });
  }

  if (!apiKey || apiKey !== process.env.SHEET_SYNC_KEY) {
    console.error('❌ Invalid API key', {
      received: apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'none',
      expected: `${process.env.SHEET_SYNC_KEY.substring(0, 4)}...${process.env.SHEET_SYNC_KEY.substring(process.env.SHEET_SYNC_KEY.length - 4)}`
    });
    
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid API key',
      receivedKey: apiKey ? `${apiKey.substring(0, 4)}...` : 'none',
      expectedKey: `${process.env.SHEET_SYNC_KEY.substring(0, 4)}...`,
      help: 'Verify SHEET_SYNC_KEY matches in Vercel and Apps Script'
    });
  }

  try {
    const db = await connectToDatabase();
    const registrations = db.collection('registrations');
    
    // Fetch all registrations
    const data = await registrations.find({}, {
      projection: { _id: 0 }
    }).toArray();
    
    console.log(`✅ Fetched ${data.length} records for sync`);
    
    return res.status(200).json({
      success: true,
      data,
      count: data.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Database error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
}
