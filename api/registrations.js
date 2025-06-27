const mongoose = require('mongoose');
const Registration = require('./registration');

module.exports = async (req, res) => {
  // Connect to DB if not already connected
  if (mongoose.connection.readyState !== 1) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
    } catch (err) {
      return res.status(500).json({ 
        success: false,
        message: 'Database connection failed',
        error: err.message
      });
    }
  }

  if (req.method === 'POST') {
    // ... rest of your existing POST handling code ...
  } else {
    res.status(405).json({ 
      success: false,
      message: 'Method not allowed'
    });
  }
};
