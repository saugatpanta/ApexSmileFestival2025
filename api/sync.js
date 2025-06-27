const mongoose = require('mongoose');
const Registration = require('../registration');

module.exports = async (req, res) => {
  // API Key Validation
  const apiKey = req.query.key;
  if (!apiKey || apiKey !== process.env.SHEET_SYNC_KEY) {
    return res.status(401).json({
      success: false,
      message: 'Invalid API key',
      mismatchPosition: findMismatchPosition(apiKey, process.env.SHEET_SYNC_KEY),
      receivedLength: apiKey?.length,
      expectedLength: process.env.SHEET_SYNC_KEY?.length
    });
  }

  // Connect to DB if needed
  if (mongoose.connection.readyState !== 1) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'Database connection failed'
      });
    }
  }

  try {
    // Get all registrations
    const registrations = await Registration.find({})
      .sort({ submittedAt: -1 })
      .lean();

    // Transform data for Google Sheets
    const data = registrations.map(reg => ({
      registrationId: reg.registrationId,
      fullName: reg.name,
      email: reg.email,
      contact: reg.contact,
      program: reg.program,
      semester: reg.semester,
      reelLink: reg.reelLink,
      status: 'Submitted',
      createdAt: reg.submittedAt.toISOString()
    }));

    return res.json({
      success: true,
      data: data,
      count: data.length
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching registrations'
    });
  }
};

function findMismatchPosition(a, b) {
  if (!a || !b) return -1;
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i++) {
    if (a[i] !== b[i]) return i;
  }
  return length;
}
