import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  
  console.log("Connecting to MongoDB...");
  
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000,
  });
  
  try {
    await client.connect();
    console.log("Connected to MongoDB server");
    
    // Explicitly select database
    const db = client.db('apex_reels');
    
    // Verify permissions by listing collections
    const collections = await db.listCollections().toArray();
    console.log("Available collections:", collections.map(c => c.name));
    
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
    console.log("Database connected");
    
    // Access the registrations collection
    const registrations = db.collection('registrations');
    console.log("Registrations collection accessed");

    const { name, email, contact, program, semester, reelLink } = req.body;
    console.log("Request data:", { name, email, contact, program, semester, reelLink });

    // Validate input
    if (!name || !email || !contact || !program || !semester || !reelLink) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
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
    console.log("Generated registration ID:", registrationId);

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

    // Insert into database
    const result = await registrations.insertOne(newRegistration);
    console.log("Registration inserted with ID:", result.insertedId);

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
