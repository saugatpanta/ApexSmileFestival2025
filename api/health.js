const mongoose = require('mongoose');

module.exports = async (req, res) => {
  try {
    // Check MongoDB connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Simple response with more diagnostic info
    res.status(200).json({
      status: dbStatus,
      message: dbStatus === 'connected' 
        ? 'Backend and database are healthy' 
        : 'Backend is running but database is disconnected',
      services: {
        database: dbStatus,
        api: 'operational'
      },
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
