const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  registrationId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: function() {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      return `ASF-2025-${randomNum}`;
    }
  },
  name: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  program: {
    type: String,
    required: [true, 'Program is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: props => `${props.value} is not a valid email address!`
    }
  },
  contact: {
    type: String,
    required: [true, 'Contact number is required'],
    validate: {
      validator: function(v) {
        return /^[0-9]{10}$/.test(v);
      },
      message: props => `${props.value} is not a valid 10-digit phone number!`
    }
  },
  semester: {
    type: String,
    required: [true, 'Semester is required'],
    trim: true
  },
  reelLink: {
    type: String,
    required: [true, 'Reel link is required'],
    validate: {
      validator: function(v) {
        return /https?:\/\/(www\.)?instagram\.com\/reel\/.+/i.test(v);
      },
      message: props => `Invalid Instagram reel URL! Must start with https://www.instagram.com/reel/`
    }
  },
  status: {
    type: String,
    enum: ['Submitted', 'Approved', 'Rejected'],
    default: 'Submitted'
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt automatically
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for faster queries
registrationSchema.index({ email: 1 });
registrationSchema.index({ submittedAt: -1 });
registrationSchema.index({ status: 1 });

// Pre-save hook to ensure proper formatting
registrationSchema.pre('save', function(next) {
  // Trim all string fields
  const stringFields = ['name', 'program', 'semester', 'reelLink'];
  stringFields.forEach(field => {
    if (this[field]) this[field] = this[field].trim();
  });
  
  // Format contact to remove any non-numeric characters
  if (this.contact) {
    this.contact = this.contact.replace(/\D/g, '');
  }
  
  next();
});

const Registration = mongoose.model('Registration', registrationSchema);

