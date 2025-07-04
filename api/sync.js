const { getMongoClient } = require('../utils/db');

module.exports = async (req, res) => {
  // Validate API key
  const apiKey = req.query.key;
  const validKey = process.env.SHEET_SYNC_KEY;
  
  if (!apiKey || apiKey !== validKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing API key',
      expectedLength: validKey?.length || 0,
      receivedLength: apiKey?.length || 0
    });
  }

  try {
    // Get client and database properly
    const { client, db } = await getMongoClient();
    const collection = db.collection('registrations'); // FIXED: Added proper collection access
    
    // Get all registrations
    const data = await collection.find({}, {
      projection: {
        _id: 0,
        registrationId: 1,
        name: 1,
        email: 1,
        contact: 1,
        program: 1,
        semester: 1,
        profileLink: 1,
        status: 1,
        createdAt: 1
      }
    }).sort({ createdAt: -1 }).toArray();

    // Format dates
    const formattedData = data.map(item => ({
      ...item,
      createdAt: item.createdAt.toISOString()
    }));

    res.status(200).json({
      success: true,
      data: formattedData,
      count: formattedData.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('MongoDB error:', error);
    res.status(500).json({
      success: false,
      error: 'Database operation failed',
      details: error.message
    });
  }
};
