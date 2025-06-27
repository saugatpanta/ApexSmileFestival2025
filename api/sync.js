import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
let cachedDb = null;

// Critical environment check
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
  console.log('🔒 Sync request received', {
    method: req.method,
    url: req.url,
    query: req.query,
    headers: {
      'user-agent': req.headers['user-agent'],
      'x-forwarded-for': req.headers['x-forwarded-for']
    }
  });

  // Verify API key from multiple sources
  const apiKeySources = {
    queryParam: req.query.key,
    xApiKeyHeader: req.headers['x-api-key'],
    authHeader: req.headers['authorization']?.split(' ')[1],
    apexKeyHeader: req.headers['x-apex-key']
  };
  
  console.log('🔑 Key sources:', apiKeySources);

  const apiKey = apiKeySources.queryParam || 
                 apiKeySources.xApiKeyHeader || 
                 apiKeySources.authHeader || 
                 apiKeySources.apexKeyHeader;

  // Mask keys for security
  const maskKey = (key) => {
    if (!key) return 'none';
    if (key.length < 8) return 'too_short';
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };
  
  const maskedReceived = maskKey(apiKey);
  const maskedExpected = maskKey(process.env.SHEET_SYNC_KEY);

  // Validate API key existence on server
  if (!process.env.SHEET_SYNC_KEY) {
    const errorMsg = '❌ Server misconfigured: SHEET_SYNC_KEY not set in Vercel environment variables';
    console.error(errorMsg);
    return res.status(500).json({ 
      success: false, 
      message: 'Server configuration error',
      details: errorMsg,
      help: 'Run "vercel env add SHEET_SYNC_KEY" and redeploy'
    });
  }

  // Handle missing key in request
  if (!apiKey) {
    const errorMsg = '❌ API key not found in request';
    console.error(errorMsg, {
      receivedSources: Object.entries(apiKeySources)
        .filter(([_, value]) => value)
        .map(([key]) => key),
      headers: Object.keys(req.headers)
    });
    
    return res.status(401).json({ 
      success: false, 
      message: 'API key required',
      receivedKey: 'none',
      expectedKey: maskedExpected,
      help: 'Send key in query param (?key=) or X-API-Key header'
    });
  }

  // Handle key mismatch
  if (apiKey !== process.env.SHEET_SYNC_KEY) {
    const errorMsg = `❌ API key mismatch: Received ${maskedReceived}, Expected ${maskedExpected}`;
    console.error(errorMsg);
    
    // Character-by-character comparison
    const vercelKey = process.env.SHEET_SYNC_KEY || '';
    let mismatchPosition = -1;
    for (let i = 0; i < Math.max(apiKey.length, vercelKey.length); i++) {
      if (apiKey[i] !== vercelKey[i]) {
        mismatchPosition = i;
        break;
      }
    }
    
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid API key',
      receivedKey: maskedReceived,
      expectedKey: maskedExpected,
      mismatchPosition,
      help: 'Verify key matches in Vercel and Apps Script',
      keySources: apiKeySources
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
