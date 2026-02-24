const mongoose = require('mongoose');

const organizerSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  contact: {
    type: String,
    default: ''
  },
  discordWebhook: {
    type: String,
    default: ''
  },
  userType: {
    type: String,
    default: 'organizer'
  },
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active'
  }
}, { timestamps: true });

// The third argument explicitly sets the collection name to 'organisertable'
module.exports = mongoose.model('Organizer', organizerSchema, 'organisertable');
