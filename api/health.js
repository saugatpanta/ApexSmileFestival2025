// pages/api/health.js
import { MongoClient } from 'mongodb';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    // Test MongoDB connection
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);
    
    await client.connect();
    const db = client.db(process.env.MONGODB_DB);
    await db.command({ ping: 1 });
    await client.close();

    return res.status(200).json({
      status: 'operational',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      system: 'Apex Smile Festival Backend',
      database: 'connected'
    });
  } catch (error) {
    return res.status(500).json({
      status: 'degraded',
      message: 'Database connection failed',
      error: error.message,
      system: 'Apex Smile Festival Backend'
    });
  }
}
