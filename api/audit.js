const mongoose = require('mongoose');

module.exports = async (req, res) => {
  // API Key Validation
  const apiKey = req.query.key;
  if (!apiKey || apiKey !== process.env.SHEET_SYNC_KEY) {
    return res.status(401).json({ success: false, message: 'Invalid API key' });
  }

  try {
    // Connect to DB if needed
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    const AuditLog = mongoose.model('AuditLog');
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(100).lean();

    return res.json({
      success: true,
      logs: logs,
      count: logs.length
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching audit logs'
    });
  }
};
