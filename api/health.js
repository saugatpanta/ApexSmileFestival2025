import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

export default async function handler(req, res) {
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
  });
  
  try {
    await client.connect();
    await client.db().command({ ping: 1 });
    await client.close();
    
    res.status(200).json({
      status: 'connected',
      timestamp: new Date().toISOString(),
      service: 'Apex Reels API',
      version: '1.0.0'
    });
  } catch (error) {
    res.status(500).json({
      status: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
