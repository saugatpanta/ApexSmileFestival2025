const mongoose = require('mongoose');
const Registration = require('./models/registration');

module.exports = async (req, res) => {
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
      const instaRegex = /https?:\/\/(www\.)?instagram\.com\/reel\/.+/;
      if (!instaRegex.test(reelLink)) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid Instagram reel URL'
        });
      }
      
      // Generate registration ID (example: ASF-2025-XXXX)
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const registrationId = `ASF-2025-${randomNum}`;
      
      // Create new registration
      const newRegistration = new Registration({
        registrationId,
        name,
        program,
        email,
        contact,
        semester,
        reelLink,
        submittedAt: new Date()
      });
      
      await newRegistration.save();
      
      res.status(201).json({
        success: true,
        message: 'Registration submitted successfully',
        registrationId
      });
      
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error processing registration',
        error: error.message
      });
    }
  } else {
    res.status(405).json({ 
      success: false,
      message: 'Method not allowed'
    });
  }
};
