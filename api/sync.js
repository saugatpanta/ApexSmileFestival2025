const { getMongoClient } = require('../utils/db');

module.exports = async (req, res) => {
  // Validate API key
  const apiKey = req.query.key;
  const validKey = process.env.SHEET_SYNC_KEY;
  
  if (!apiKey || apiKey !== validKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid or missing API key',
      expectedLength: validKey?.length || 0,
      receivedLength: apiKey?.length || 0
    });
  }

  try {
    const { db } = await getMongoClient();
    const collection = db.collection('registrations');
    
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
        reelLink: 1,
        status: 1,
        createdAt: 1
      }
    }).sort({ createdAt: -1 }).toArray();

    // Format dates and ensure consistent structure
    const formattedData = data.map(item => ({
      registrationId: item.registrationId || 'N/A',
      name: item.name || 'Unknown',
      email: item.email || '',
      contact: item.contact || '',
      program: item.program || '',
      semester: item.semester || '',
      reelLink: item.reelLink || '',
      status: item.status || 'Submitted',
      createdAt: item.createdAt?.toISOString() || new Date().toISOString()
    }));

    res.status(200).json({
      success: true,
      data: formattedData,
      count: formattedData.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('SYNC ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Database operation failed',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
