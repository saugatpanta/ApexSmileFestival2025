import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  
  await client.connect();
  const db = client.db('apex_reels');
  cachedDb = db;
  return db;
}

export default async function handler(req, res) {
  // Verify API key
  if (req.headers['x-api-key'] !== process.env.SHEET_API_KEY) {
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized' 
    });
  }

  try {
    const db = await connectToDatabase();
    const registrations = await db.collection('registrations')
                                 .find({})
                                 .sort({ createdAt: -1 })
                                 .toArray();
    
    res.status(200).json({
      success: true,
      data: registrations
    });
  } catch (error) {
    console.error('Error fetching registrations:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
