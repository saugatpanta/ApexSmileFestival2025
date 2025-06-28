// utils/db.js
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');

let client = null;

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
  if (client && client.isConnected()) {
    return client;
  }
  
  client = new MongoClient(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  
  try {
    await client.connect();
    console.log('MongoDB native client connected');
    return client;
  } catch (error) {
    console.error('MongoDB native connection error:', error);
    throw error;
  }
};

module.exports = { connectDB, getMongoClient };
