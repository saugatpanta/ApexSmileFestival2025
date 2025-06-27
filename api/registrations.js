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
      console.error('MongoDB connection error:', err);
      return res.status(500).json({ 
        success: false,
        message: 'Database connection failed',
        error: err.message
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, program, email, contact, semester, reelLink } = req.body;
      
      // Validate required fields
      if (!name || !program || !email || !contact || !semester || !reelLink) {
        return res.status(400).json({ 
          success: false,
          message: 'All fields are required'
        });
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid email format'
        });
      }
      
      // Validate phone number format (10 digits)
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(contact)) {
        return res.status(400).json({ 
          success: false,
          message: 'Phone number must be 10 digits'
        });
      }
      
      // Validate Instagram reel URL
      const instaRegex = /https?:\/\/(www\.)?instagram\.com\/reel\/.+/i;
      if (!instaRegex.test(reelLink)) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid Instagram reel URL. Must start with https://www.instagram.com/reel/'
        });
      }
      
      // Generate registration ID (ASF-2025-XXXX)
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const registrationId = `ASF-2025-${randomNum}`;
      
      // Create new registration
      const newRegistration = new Registration({
        registrationId,
        name,
        program,
        email: email.toLowerCase().trim(),
        contact,
        semester,
        reelLink,
        submittedAt: new Date()
      });
      
      // Save to database
      await newRegistration.save();
      
      return res.status(201).json({
        success: true,
        message: 'Registration submitted successfully',
        registrationId
      });
      
    } catch (error) {
      console.error('Registration error:', error);
      
      // Handle duplicate key errors (unique fields)
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Duplicate entry',
          error: `This ${Object.keys(error.keyPattern)[0]} is already registered`
        });
      }
      
      // Handle validation errors
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: error.message
        });
      }
      
      // Generic error handler
      return res.status(500).json({ 
        success: false,
        message: 'Error processing registration',
        error: error.message
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ 
      success: false,
      message: 'Method not allowed'
    });
  }
};
