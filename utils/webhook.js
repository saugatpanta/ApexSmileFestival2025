const fetch = require('node-fetch');

module.exports.triggerSheetUpdate = async (registration) => {
  const webhookUrl = process.env.GOOGLE_APPS_SCRIPT_WEBHOOK;
  const secret = process.env.GOOGLE_WEBHOOK_SECRET;
  
  if (!webhookUrl) {
    console.error('Webhook URL not configured');
    return;
  }
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${secret}`
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
  } catch (error) {
    console.error('Webhook error:', error);
    // Add retry logic or error reporting here
  }
};
