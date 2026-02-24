const mongoose = require('mongoose');

const passResetSchema = new mongoose.Schema({
    clubemail: {
        type: String,
        required: true,
    },
    reason: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending',
    }
}, { timestamps: true });

module.exports = mongoose.model('PassReset', passResetSchema, 'passreset');
