const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticketId: { type: String, required: true, unique: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'GlobalEvent', required: true },
  participantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  qrCode: { type: String, required: true },
  type: { type: String, enum: ['normal', 'merchandise'], required: true },
  status: { type: String, enum: ['Registered', 'Completed', 'Cancelled', 'Rejected'], default: 'Registered' },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  teamName: { type: String },
  purchaseDate: { type: Date, default: Date.now },
  // Attendance Tracking
  attendanceMarked: { type: Boolean, default: false },
  attendanceTimestamp: { type: Date },
  manualOverride: { type: Boolean, default: false },
  overrideReason: { type: String },
  // For normal events custom form answers
  answers: { type: Map, of: mongoose.Schema.Types.Mixed },
  // For merchandise specific purchases
  merchandiseSelections: {
    size: { type: String },
    color: { type: String },
    variant: { type: String },
    quantity: { type: Number, default: 1 }
  }
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema, 'tickets');
