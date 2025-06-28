const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  registrationId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return `ASF-2025-${Math.floor(1000 + Math.random() * 9000)}`;
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
      validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      message: props => `${props.value} is not a valid email address!`
    }
  },
  contact: {
    type: String,
    required: [true, 'Contact number is required'],
    validate: {
      validator: (v) => /^[0-9]{10}$/.test(v),
      message: props => `${props.value} is not a valid 10-digit phone number!`
    }
  },
  semester: {
    type: String,
    required: [true, 'Semester is required'],
    trim: true
  },
  profileLink: {  // Changed from reelLink to profileLink
    type: String,
    required: [true, 'Profile link is required'],
    validate: {
      validator: (v) => /^https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)\/?$/i.test(v),
      message: props => 'Invalid Instagram profile URL! Must start with https://www.instagram.com/username/'
    }
  },
  status: {
    type: String,
    enum: ['Submitted', 'Approved', 'Rejected'],
    default: 'Submitted'
  }
}, {
  timestamps: true
});

// Pre-save hook
registrationSchema.pre('save', function(next) {
  // Trim string fields
  ['name', 'program', 'semester', 'profileLink'].forEach(field => {
    if (this[field]) this[field] = this[field].trim();
  });
  
  // Format contact
  if (this.contact) {
    this.contact = this.contact.replace(/\D/g, '');
  }
  
  next();
});

module.exports = mongoose.model('Registration', registrationSchema);
