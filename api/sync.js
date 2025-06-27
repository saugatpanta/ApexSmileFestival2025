import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
let cachedDb = null;

// Debug environment variables on startup
console.log('🚀 API Startup - Environment Variables:', {
  mongodb_uri_set: !!uri,
  sheet_sync_key_set: !!process.env.SHEET_SYNC_KEY,
  node_env: process.env.NODE_ENV,
  vercel_env: process.env.VERCEL_ENV
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
  // Log incoming request details
  console.log('🔍 Incoming Request:', {
    method: req.method,
    url: req.url,
    query: req.query,
    headers: {
      'user-agent': req.headers['user-agent'],
      'x-forwarded-for': req.headers['x-forwarded-for']
    }
  });

  // SIMPLIFIED AUTHENTICATION - ONLY QUERY PARAMETER
  const apiKey = req.query.key;
  
  // Get server key from environment
  const serverKey = process.env.SHEET_SYNC_KEY || '';
  
  // Log keys for comparison
  console.log('🔑 Key Comparison:', {
    received: apiKey,
    expected: serverKey,
    lengthMatch: apiKey?.length === serverKey?.length,
    receivedLength: apiKey?.length,
    expectedLength: serverKey?.length
  });

  // Case 1: Environment key not set
  if (!serverKey) {
    const errorMsg = '❌ Server misconfiguration: SHEET_SYNC_KEY not set';
    console.error(errorMsg);
    return res.status(500).json({ 
      success: false, 
      message: errorMsg,
      help: 'Run "vercel env add SHEET_SYNC_KEY" and redeploy'
    });
  }

  // Case 2: No key in request
  if (!apiKey) {
    const errorMsg = '❌ API key required in query parameter';
    console.error(errorMsg);
    return res.status(401).json({ 
      success: false, 
      message: errorMsg,
      help: 'Add ?key=YOUR_API_KEY to the request URL'
    });
  }

  // Case 3: Key mismatch
  if (apiKey !== serverKey) {
    // Find exact mismatch position
    let mismatchPosition = -1;
    for (let i = 0; i < Math.max(apiKey.length, serverKey.length); i++) {
      if (apiKey[i] !== serverKey[i]) {
        mismatchPosition = i;
        break;
      }
    }
    
    console.error('❌ Key mismatch', {
      received: apiKey,
      expected: serverKey,
      mismatchPosition
    });
    
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid API key',
      help: 'Ensure keys match exactly in Apps Script and Vercel environment',
      keyComparison: {
        receivedLength: apiKey.length,
        expectedLength: serverKey.length,
        firstMismatchPosition: mismatchPosition
      }
    });
  }

  // Authentication successful - process request
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
