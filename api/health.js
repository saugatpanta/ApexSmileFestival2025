const mongoose = require('mongoose');

module.exports = async (req, res) => {
  // Check connection status
  const isConnected = mongoose.connection.readyState === 1;
  
  if (!isConnected) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
    } catch (err) {
      return res.status(500).json({
        status: 'disconnected',
        message: 'Failed to connect to MongoDB',
        error: err.message
      });
    }
  }

  res.status(200).json({ 
    status: 'connected',
    message: 'Backend is connected to MongoDB'
  });
};
