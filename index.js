const express = require('express');
const cors = require('cors');
const connectDB = require('./db');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/health', require('./health'));
app.use('/api/registrations', require('./registrations'));

module.exports = app;
