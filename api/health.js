import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

export default async function handler(req, res) {
  try {
    const client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 3000,
    });
    
    await client.connect();
    await client.db().command({ ping: 1 });
    await client.close();
    
    return res.status(200).json({ 
      status: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({ 
      status: 'disconnected',
      error: error.message
    });
  }
}
