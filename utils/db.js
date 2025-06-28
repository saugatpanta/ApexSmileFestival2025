const { MongoClient } = require('mongodb');

let cachedClient = null;
let cachedDb = null;

const getMongoClient = async () => {
  if (cachedClient && cachedClient.isConnected()) {
    return { client: cachedClient, db: cachedDb };
  }
  
  try {
    const client = new MongoClient(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    await client.connect();
    const db = client.db(process.env.MONGODB_DB);
    
    // Test connection
    await db.command({ ping: 1 });
    console.log("✅ MongoDB connected successfully");
    
    cachedClient = client;
    cachedDb = db;
    
    return { client, db };
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw new Error('Database connection failed');
  }
};

module.exports = { getMongoClient };
