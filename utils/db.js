const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');

let cachedClient = null;
let cachedDb = null;

// Mongoose connection for ODM
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;
  
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      dbName: process.env.MONGODB_DB
    });
    console.log('Mongoose connected successfully');
  } catch (error) {
    console.error('Mongoose connection error:', error);
    throw error;
  }
};

// MongoDB native client for change streams
const getMongoClient = async () => {
  // Always return existing connection if available
  if (cachedClient) {
    return { client: cachedClient, db: cachedDb };
  }
  
  const client = new MongoClient(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB);
    
    cachedClient = client;
    cachedDb = db;
    
    console.log('MongoDB native client connected');
    return { client, db };
  } catch (error) {
    console.error('MongoDB native connection error:', error);
    throw error;
  }
};

module.exports = { connectDB, getMongoClient };
