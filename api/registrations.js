import { MongoClient } from 'mongodb';

// MongoDB connection URI
const uri = process.env.MONGODB_URI;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    console.log("Using cached database connection");
    return cachedDb;
  }
  
  console.log("Creating new database connection");
  const client = await MongoClient.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
  });
  
  const db = client.db('apex_reels');
  cachedDb = db;
  
  console.log("Database connection established");
  return db;
}

export default async function handler(req, res) {
  console.log("Registration request received");
  
  if (req.method !== 'POST') {
    console.log("Method not allowed:", req.method);
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    const db = await connectToDatabase();
    console.log("Database connected");
    
    const registrations = db.collection('registrations');
    console.log("Registrations collection accessed");

    const { name, email, contact, program, semester, reelLink } = req.body;
    console.log("Request data:", { name, email, contact, program, semester, reelLink });

    // Validate input
    if (!name || !email || !contact || !program || !semester || !reelLink) {
      console.log("Missing required fields");
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Check for existing email
    const existingEmail = await registrations.findOne({ email });
    if (existingEmail) {
      console.log("Email already exists:", email);
      return res.status(400).json({
        success: false,
        message: 'This email is already registered'
      });
    }

    // Check for existing contact
    const existingContact = await registrations.findOne({ contact });
    if (existingContact) {
      console.log("Contact already exists:", contact);
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

    const result = await registrations.insertOne(newRegistration);
    console.log("Registration inserted:", result.insertedId);

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
