const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const Registration = require('../registration');

// Rate limiting configuration (100 requests per 15 minutes)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  }
});

module.exports = async (req, res) => {
  try {
    // Apply rate limiting
    await new Promise((resolve, reject) => {
      limiter(req, res, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    // API Key Validation
    const apiKey = req.query.key;
    if (!apiKey || apiKey !== process.env.SHEET_SYNC_KEY) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key',
        mismatchPosition: findMismatchPosition(apiKey, process.env.SHEET_SYNC_KEY),
        receivedLength: apiKey?.length,
        expectedLength: process.env.SHEET_SYNC_KEY?.length,
        timestamp: new Date().toISOString()
      });
    }

    // Connect to DB if needed
    if (mongoose.connection.readyState !== 1) {
      try {
        await mongoose.connect(process.env.MONGODB_URI, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          connectTimeoutMS: 5000,
          socketTimeoutMS: 30000
        });
      } catch (err) {
        console.error('MongoDB connection error:', err);
        return res.status(503).json({
          success: false,
          message: 'Database connection failed',
          error: err.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Get all registrations with additional filtering options
    const { status, program, startDate, endDate } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (program) query.program = program;
    if (startDate || endDate) {
      query.submittedAt = {};
      if (startDate) query.submittedAt.$gte = new Date(startDate);
      if (endDate) query.submittedAt.$lte = new Date(endDate);
    }

    const registrations = await Registration.find(query)
      .sort({ submittedAt: -1 })
      .lean();

    // Transform data for Google Sheets with additional validation
    const data = registrations.map(reg => {
      // Validate each field before including in response
      return {
        registrationId: reg.registrationId || 'N/A',
        fullName: sanitizeString(reg.name) || 'Unknown',
        email: validateEmail(reg.email) || 'invalid@email',
        contact: validatePhone(reg.contact) || '0000000000',
        program: sanitizeString(reg.program) || 'Unknown',
        semester: sanitizeString(reg.semester) || 'Unknown',
        reelLink: validateUrl(reg.reelLink) || 'https://example.com/invalid',
        status: reg.status || 'Submitted',
        createdAt: reg.submittedAt?.toISOString() || new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
    });

    // Add audit log
    await createAuditLog({
      action: 'sheet_sync',
      recordsSynced: data.length,
      syncBy: 'google_script',
      ipAddress: req.headers['x-forwarded-for'] || req.ip
    });

    return res.json({
      success: true,
      data: data,
      count: data.length,
      serverTime: new Date().toISOString(),
      apiVersion: '2.0'
    });

  } catch (error) {
    console.error('Sync endpoint error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Helper functions
function findMismatchPosition(a, b) {
  if (!a || !b) return -1;
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i++) {
    if (a[i] !== b[i]) return i;
  }
  return length;
}

function sanitizeString(str) {
  return typeof str === 'string' ? str.trim() : '';
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase()) ? email : null;
}

function validatePhone(phone) {
  const re = /^[0-9]{10}$/;
  return re.test(String(phone)) ? phone : null;
}

function validateUrl(url) {
  try {
    new URL(url);
    return url;
  } catch {
    return null;
  }
}

async function createAuditLog(data) {
  try {
    const AuditLog = mongoose.model('AuditLog') || 
      mongoose.model('AuditLog', new mongoose.Schema({
        action: String,
        recordsSynced: Number,
        syncBy: String,
        ipAddress: String,
        timestamp: { type: Date, default: Date.now }
      }));
    
    await new AuditLog(data).save();
  } catch (err) {
    console.error('Audit log error:', err);
  }
}
