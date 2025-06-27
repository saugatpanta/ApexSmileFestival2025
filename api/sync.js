import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
let cachedDb = null;

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
  // Log request details for debugging
  console.log('🔒 Sync request received', {
    method: req.method,
    query: req.query,
    headers: {
      'user-agent': req.headers['user-agent'],
      'x-forwarded-for': req.headers['x-forwarded-for']
    }
  });

  // Verify API key from multiple sources
  const apiKey = 
    req.query.key || 
    req.headers['x-api-key'] || 
    req.headers['authorization']?.split(' ')[1];
  
  // Mask keys for security
  const maskKey = (key) => key ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : 'none';
  const maskedReceived = maskKey(apiKey);
  const maskedExpected = maskKey(process.env.SHEET_SYNC_KEY);
  
  console.log(`🔑 Received Key: ${maskedReceived}`);
  console.log(`🔑 Expected Key: ${maskedExpected}`);

  // Validate API key
  if (!apiKey || apiKey !== process.env.SHEET_SYNC_KEY) {
    console.error('❌ Invalid API key');
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid API key',
      receivedKey: maskedReceived,
      expectedKey: maskedExpected
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
