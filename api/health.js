const mongoose = require('mongoose');

module.exports = async (req, res) => {
  try {
    // Check MongoDB connection
    const isConnected = mongoose.connection.readyState === 1;
    
    if (isConnected) {
      res.status(200).json({ 
        status: 'connected',
        message: 'Backend is connected to MongoDB'
      });
    } else {
      res.status(500).json({ 
        status: 'disconnected',
        message: 'Backend is not connected to MongoDB'
      });
    }
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: 'Error checking connection status'
    });
  }
};
