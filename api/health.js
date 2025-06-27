export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    return res.status(200).json({
      status: 'operational',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      system: 'Apex Smile Festival Backend'
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message
    });
  }
}
