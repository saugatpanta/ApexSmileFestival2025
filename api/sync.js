import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
let cachedDb = null;

// Log environment status on startup
console.log('ℹ️ Environment check:', {
  node_env: process.env.NODE_ENV,
  vercel_env: process.env.VERCEL_ENV,
  key_set: !!process.env.SHEET_SYNC_KEY,
  key_value: process.env.SHEET_SYNC_KEY ? 
    `${process.env.SHEET_SYNC_KEY.substring(0, 4)}...${process.env.SHEET_SYNC_KEY.substring(process.env.SHEET_SYNC_KEY.length - 4)}` : 
    'NOT SET'
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
    console.log('✅ MongoDB connected');
    return cachedDb;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    throw new Error(`Database connection failed: ${error.message}`);
  }
}

export default async function handler(req, res) {
  // Log raw headers for debugging
  console.log('🔍 Raw Headers Received:', JSON.stringify(req.headers, null, 2));
  
  // Extract keys using case-insensitive approach
  const getHeader = (name) => {
    const lowerName = name.toLowerCase();
    for (const [key, value] of Object.entries(req.headers)) {
      if (key.toLowerCase() === lowerName) return value;
    }
    return null;
  };

  const apiKey = 
    req.query.key || 
    getHeader('x-api-key') || 
    getHeader('x-apex-key');

  // Log environment key details
  const envKey = process.env.SHEET_SYNC_KEY || '';
  console.log('🔐 Server Environment Key:', {
    exists: !!envKey,
    length: envKey.length,
    masked: envKey ? `${envKey.substring(0, 4)}...${envKey.substring(envKey.length - 4)}` : 'none',
    value: envKey // CAUTION: Only for debugging
  });

  // Case 1: Environment key not set
  if (!envKey) {
    const errorMsg = '❌ Server misconfiguration: SHEET_SYNC_KEY not set';
    console.error(errorMsg);
    return res.status(500).json({ 
      success: false, 
      message: errorMsg,
      help: 'Add environment variable in Vercel: vercel env add SHEET_SYNC_KEY'
    });
  }

  // Case 2: No key found in request
  if (!apiKey) {
    const errorMsg = '❌ API key not found in request headers or query parameters';
    console.error(errorMsg, {
      headersReceived: Object.keys(req.headers),
      queryParams: req.query
    });
    
    return res.status(401).json({ 
      success: false, 
      message: 'API key required',
      help: 'Add key to query parameter (?key=) or X-API-Key header'
    });
  }

  // Case 3: Key mismatch
  if (apiKey !== envKey) {
    // Find mismatch position
    let mismatchPosition = -1;
    for (let i = 0; i < Math.max(apiKey.length, envKey.length); i++) {
      if (apiKey[i] !== envKey[i]) {
        mismatchPosition = i;
        break;
      }
    }
    
    console.error('❌ Key mismatch', {
      received: apiKey,
      expected: envKey,
      lengthMatch: apiKey.length === envKey.length,
      mismatchPosition
    });
    
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid API key',
      help: 'Ensure keys match exactly in Apps Script and Vercel environment',
      keyComparison: {
        receivedLength: apiKey.length,
        expectedLength: envKey.length,
        firstMismatchPosition: mismatchPosition
      }
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
