const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
    teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        required: true
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    senderName: {
        type: String,
        required: true
    },
    text: {
        type: String,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
