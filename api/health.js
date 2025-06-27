const connectDB = require('../utils/db');
const mongoose = require('mongoose');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    await connectDB();
    const isConnected = mongoose.connection.readyState === 1;
    
    res.status(200).json({
      status: isConnected ? 'operational' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      system: 'Apex Smile Festival Backend',
      database: isConnected ? 'connected' : 'disconnected'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message
    });
  }
};
