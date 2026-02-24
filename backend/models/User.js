const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  userType: {
    type: String,
    enum: ['iiit', 'non-iiit', 'organizer', 'admin'],
    required: true,
  },
  interested_topics: {
    type: [String],
    default: []
  },
  interested_clubs: {
    type: [String],
    default: []
  },
  filled: {
    type: Boolean,
    default: false
  },
  firstName: {
    type: String,
    default: ''
  },
  lastName: {
    type: String,
    default: ''
  },
  contactNumber: {
    type: String,
    default: ''
  },
  college: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
