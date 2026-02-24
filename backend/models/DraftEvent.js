const mongoose = require('mongoose');

const draftEventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  eventType: { type: String, enum: ['normal', 'merchandise', 'hackathon'], required: true },
  eligibility: { type: String },
  registrationDeadline: { type: Date, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  registrationLimit: { type: Number },
  registrationFee: { type: Number },
  tags: { type: String },
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organizer', required: true },
  status: { type: String, default: 'Draft' },
  // Normal events dynamic registration form
  customFields: [{
    label: { type: String, required: true },
    type: { type: String, enum: ['text', 'dropdown', 'checkbox'], required: true },
    required: { type: Boolean, default: false },
    options: { type: [String], default: [] } // For dropdown options
  }],
  // Merchandise specific attributes
  merchandiseDetails: {
    sizes: { type: [String], default: [] },
    colors: { type: [String], default: [] },
    variants: { type: [String], default: [] },
    purchaseLimit: { type: Number, default: 1 }
  }
}, { timestamps: true });

module.exports = mongoose.model('DraftEvent', draftEventSchema, 'events_table');
