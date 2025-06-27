const mongoose = require('mongoose');

module.exports = async (req, res) => {
  try {
    // Check MongoDB connection
    const dbStart = Date.now();
    const isConnected = mongoose.connection.readyState === 1;
    const dbPing = isConnected ? await mongoose.connection.db.admin().ping() : null;
    const dbLatency = Date.now() - dbStart;

    // System information
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    res.status(200).json({ 
      status: isConnected ? 'connected' : 'disconnected',
      message: isConnected ? 'Backend is healthy' : 'Database disconnected',
      details: {
        database: {
          status: isConnected ? 'connected' : 'disconnected',
          ping: dbPing,
          latency: `${dbLatency}ms`,
          collections: isConnected ? await mongoose.connection.db.listCollections().toArray() : null
        },
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          memory: {
            rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
            heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
            heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`
          },
          uptime: `${uptime.toFixed(2)} seconds`
        },
        api: {
          version: '2.0',
          routes: ['/api/sync', '/api/health', '/api/audit']
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: 'Health check failed',
      error: error.message
    });
  }
};
