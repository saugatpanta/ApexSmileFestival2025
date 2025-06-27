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
    headers: req.headers,
    query: req.query
  });

  // Verify API key from multiple sources
  const apiKey = 
    req.query.key || 
    req.headers['x-api-key'] || 
    req.headers['authorization']?.split(' ')[1];
  
  // Log key details (masked)
  const maskedKey = apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'none';
  console.log(`🔑 API Key Received: ${maskedKey}`);
  console.log(`🔑 Expected Key: ${process.env.SHEET_SYNC_KEY.substring(0, 4)}...${process.env.SHEET_SYNC_KEY.substring(process.env.SHEET_SYNC_KEY.length - 4)}`);

  // Validate API key
  if (!apiKey || apiKey !== process.env.SHEET_SYNC_KEY) {
    console.error('❌ Invalid API key');
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid API key',
      receivedKey: maskedKey,
      expectedKey: `${process.env.SHEET_SYNC_KEY.substring(0, 4)}...${process.env.SHEET_SYNC_KEY.substring(process.env.SHEET_SYNC_KEY.length - 4)}`
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
