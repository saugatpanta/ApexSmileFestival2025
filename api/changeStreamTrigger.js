const { MongoClient } = require('mongodb');

module.exports = async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  
  const db = client.db(process.env.MONGODB_DB);
  const collection = db.collection('registrations');
  const changeStream = collection.watch();
  
  console.log('Listening for MongoDB changes...');
  
  changeStream.on('change', async (change) => {
    if (change.operationType === 'insert') {
      try {
        const newDoc = change.fullDocument;
        console.log('New registration detected:', newDoc.registrationId);
        
        // Trigger Google Sheets update
        await triggerGoogleSheetsUpdate(newDoc);
      } catch (error) {
        console.error('Change stream error:', error);
      }
    }
  });
  
  process.on('SIGINT', () => {
    changeStream.close();
    client.close();
    process.exit();
  });
};

async function triggerGoogleSheetsUpdate(registration) {
  const webhookUrl = process.env.GOOGLE_APPS_SCRIPT_WEBHOOK;
  
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GOOGLE_WEBHOOK_SECRET}`
    },
    body: JSON.stringify({
      action: 'addRegistration',
      data: registration
    })
  });
  
  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
  }
  
  console.log(`Update triggered for ${registration.registrationId}`);
}
