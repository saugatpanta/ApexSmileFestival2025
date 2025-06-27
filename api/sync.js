import { MongoClient } from 'mongodb';
import { healthCheck } from './registrations';

const uri = process.env.MONGODB_URI;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  
  await client.connect();
  cachedDb = client.db('apex_reels');
  return cachedDb;
}

export default async function handler(req, res) {
  // Verify API key
  if (req.query.key !== process.env.SHEET_SYNC_KEY) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const db = await connectToDatabase();
    const registrations = db.collection('registrations');
    
    // Fetch all registrations
    const data = await registrations.find({}, {
      projection: { _id: 0 }
    }).toArray();
    
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('❌ Sync error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
}
