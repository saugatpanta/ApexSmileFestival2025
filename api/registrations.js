import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  
  console.log("Connecting to MongoDB...");
  
  // Create a new MongoClient with connection pooling
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    auth: {
      username: process.env.MONGO_USER,
      password: process.env.MONGO_PASSWORD
    }
  });
  
  try {
    await client.connect();
    console.log("Connected to MongoDB server");
    
    // Select the database
    const db = client.db('apex_reels');
    
    // Verify connection
    await db.command({ ping: 1 });
    console.log("Database ping successful");
    
    cachedDb = db;
    return db;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}

export default async function handler(req, res) {
  console.log("Registration request received");
  
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    const db = await connectToDatabase();
    const registrations = db.collection('registrations');

    const { name, email, contact, program, semester, reelLink } = req.body;
    
    // Validate required fields
    const requiredFields = ['name', 'email', 'contact', 'program', 'semester', 'reelLink'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Check for existing email
    const existingEmail = await registrations.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'This email is already registered'
      });
    }

    // Check for existing contact
    const existingContact = await registrations.findOne({ contact });
    if (existingContact) {
      return res.status(400).json({
        success: false,
        message: 'This phone number is already registered'
      });
    }

    // Generate registration ID
    const registrationId = generateRegistrationId();
    
    // Create new registration
    const newRegistration = {
      registrationId,
      fullName: name,
      email,
      contact,
      program,
      semester,
      reelLink,
      status: 'Submitted',
      createdAt: new Date()
    };

    await registrations.insertOne(newRegistration);

    res.status(201).json({
      success: true,
      registrationId,
      timestamp: newRegistration.createdAt
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration: ' + error.message
    });
  }
}

function generateRegistrationId() {
  const date = new Date();
  const dateStr = `${date.getDate()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `REEL-${dateStr}-${randomNum}`;
}
