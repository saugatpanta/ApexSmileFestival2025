const { getMongoClient } = require('../utils/db');
const { triggerSheetUpdate } = require('../utils/webhook');

// This function will be triggered by a cron job or manually
module.exports = async (req, res) => {
  // Authenticate request
  const authKey = req.headers['x-auth-key'] || req.query.key;
  if (authKey !== process.env.CHANGE_STREAM_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const { db } = await getMongoClient();
    const collection = db.collection('registrations');
    
    console.log('Starting change stream listener...');
    
    const changeStream = collection.watch([], { fullDocument: 'updateLookup' });
    
    changeStream.on('change', async (change) => {
      if (change.operationType === 'insert') {
        try {
          const newDoc = change.fullDocument;
          console.log('New registration detected:', newDoc.registrationId);
          
          // Trigger Google Sheets update
          await triggerSheetUpdate(newDoc);
        } catch (error) {
          console.error('Change stream processing error:', error);
        }
      }
    });
    
    // Respond immediately while change stream runs in background
    res.status(200).json({
      success: true,
      message: 'Change stream listener started'
    });
    
    // Handle process termination
    process.on('SIGTERM', () => {
      console.log('Closing change stream...');
      changeStream.close();
    });
  } catch (error) {
    console.error('Change stream setup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start change stream'
    });
  }
};
