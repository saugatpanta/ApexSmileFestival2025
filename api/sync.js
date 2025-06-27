import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
let cachedDb = null;

// Critical environment check
if (!process.env.SHEET_SYNC_KEY) {
  console.error('❌ CRITICAL ERROR: SHEET_SYNC_KEY environment variable is not set!');
} else {
  console.log('ℹ️ SHEET_SYNC_KEY is set');
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
  
  // Mask keys for security
  const maskKey = (key) => {
    if (!key) return 'none';
    if (key.length < 8) return 'invalid';
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };
  
  const maskedReceived = maskKey(apiKey);
  const maskedExpected = maskKey(process.env.SHEET_SYNC_KEY);
  
  console.log(`🔑 Received Key: ${maskedReceived}`);
  console.log(`🔑 Expected Key: ${maskedExpected}`);

  // Validate API key
  if (!process.env.SHEET_SYNC_KEY) {
    const errorMsg = '❌ Server misconfigured: SHEET_SYNC_KEY not set';
    console.error(errorMsg);
    return res.status(500).json({ 
      success: false, 
      message: 'Server configuration error',
      details: errorMsg
    });
  }

  if (!apiKey || apiKey !== process.env.SHEET_SYNC_KEY) {
    const errorMsg = `❌ Invalid API key: Received ${maskedReceived}, Expected ${maskedExpected}`;
    console.error(errorMsg);
    
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid API key',
      receivedKey: maskedReceived,
      expectedKey: maskedExpected,
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
      message: 'Server error: ' + error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
