const connectDB = require('../utils/db');
const Registration = require('../models/Registration');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'POST') {
    try {
      await connectDB();
      const { name, program, email, contact, semester, reelLink } = req.body;
      
      // Create registration
      const newRegistration = new Registration({
        name,
        program,
        email,
        contact,
        semester,
        reelLink
      });

      await newRegistration.save();
      
      res.status(201).json({
        success: true,
        message: 'Registration submitted successfully',
        registrationId: newRegistration.registrationId
      });
      
    } catch (error) {
      console.error('Registration error:', error);
      
      // Error handling
      let status = 500;
      let message = 'Error processing registration';
      let details = error.message;
      
      if (error.name === 'ValidationError') {
        status = 400;
        message = 'Validation failed';
      } else if (error.code === 11000) {
        status = 409;
        message = 'Duplicate entry';
        details = `${Object.keys(error.keyPattern)[0]} already exists`;
      }
      
      res.status(status).json({
        success: false,
        message,
        error: details
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }
};
