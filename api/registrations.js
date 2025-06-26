// api/registrations.js
import { MongoClient } from 'mongodb';

// MongoDB connection URI
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        await client.connect();
        const db = client.db('apex-reels');
        const registrations = db.collection('registrations');

        const { name, email, contact, program, semester, reelLink } = req.body;

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

        const result = await registrations.insertOne(newRegistration);

        res.status(201).json({
            success: true,
            registrationId,
            timestamp: newRegistration.createdAt
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration'
        });
    } finally {
        await client.close();
    }
}

function generateRegistrationId() {
    const date = new Date();
    const dateStr = `${date.getDate()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `REEL-${dateStr}-${randomNum}`;
}