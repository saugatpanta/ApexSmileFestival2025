// pages/api/sync.js
import { MongoClient } from 'mongodb';

export default async function handler(req, res) {
  // Validate API key
  const apiKey = req.query.key;
  const validKey = process.env.SHEET_SYNC_KEY;
  
  if (!apiKey || apiKey !== validKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing API key',
      expectedLength: validKey?.length || 0,
      receivedLength: apiKey?.length || 0
    });
  }

  // MongoDB Connection Setup
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    
    const db = client.db(process.env.MONGODB_DB);
    const registrations = db.collection('registrations');
    
    // Fetch registrations with projection
    const data = await registrations.find(
      {},
      { 
        projection: { 
          _id: 0,
          registrationId: 1,
          fullName: 1,
          email: 1,
          contact: 1,
          program: 1,
          semester: 1,
          reelLink: 1,
          status: 1,
          createdAt: 1
        }
      }
    ).sort({ createdAt: -1 }).toArray();

    // Format createdAt dates
    const formattedData = data.map(reg => ({
      ...reg,
      createdAt: new Date(reg.createdAt).toISOString()
    }));

    res.status(200).json({
      success: true,
      data: formattedData,
      timestamp: new Date().toISOString(),
      count: formattedData.length
    });
  } catch (error) {
    console.error('MongoDB error:', error);
    res.status(500).json({
      success: false,
      error: 'Database operation failed',
      details: error.message
    });
  } finally {
    await client.close();
  }
}
