import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
let cachedDb = null;

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
  console.log('🔍 Raw Headers Received:', req.headers);
  
  // Extract all potential key sources
  const potentialKeys = {
    queryParam: req.query.key,
    xApiKeyHeader: req.headers['x-api-key'],
    apexKeyHeader: req.headers['x-apex-key'],
    authorizationHeader: req.headers['authorization']?.split(' ')[1],
    lowercaseHeader: req.headers['x-api-key'] || req.headers['x_apex_key'] // Vercel sometimes lowercases headers
  };
  
  console.log('🔑 All Potential Key Sources:', JSON.stringify(potentialKeys, null, 2));
  
  // Find the first non-empty key
  const apiKey = Object.values(potentialKeys).find(val => val && val.trim() !== '');

  // Log environment key details
  const envKey = process.env.SHEET_SYNC_KEY || '';
  console.log('🔐 Server Environment Key:', {
    exists: !!envKey,
    length: envKey.length,
    masked: envKey ? `${envKey.substring(0, 4)}...${envKey.substring(envKey.length - 4)}` : 'none',
    value: envKey // CAUTION: Only for debugging, remove in production
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
      queryParams: Object.keys(req.query)
    });
    
    return res.status(401).json({ 
      success: false, 
      message: 'API key required',
      help: 'Add key to query parameter (?key=) or X-API-Key header'
    });
  }

  // Case 3: Key mismatch
  if (apiKey !== envKey) {
    console.error('❌ Key mismatch', {
      received: apiKey,
      expected: envKey,
      lengthMatch: apiKey.length === envKey.length,
      characterDiff: {
        position: findFirstMismatch(apiKey, envKey),
        receivedChar: findFirstMismatch(apiKey, envKey) >= 0 ? apiKey.charCodeAt(findFirstMismatch(apiKey, envKey)) : 'N/A',
        expectedChar: findFirstMismatch(apiKey, envKey) >= 0 ? envKey.charCodeAt(findFirstMismatch(apiKey, envKey)) : 'N/A'
      }
    });
    
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid API key',
      help: 'Ensure keys match exactly in Apps Script and Vercel environment',
      keyComparison: {
        receivedLength: apiKey.length,
        expectedLength: envKey.length,
        firstMismatchPosition: findFirstMismatch(apiKey, envKey)
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

// Helper function to find first mismatch position
function findFirstMismatch(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) return i;
  }
  return -1;
}
