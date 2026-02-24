const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GlobalEvent',
        required: true
    },
    leaderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [
        {
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            status: {
                type: String,
                enum: ['pending', 'accepted'],
                default: 'pending'
            }
        }
    ],
    size: {
        type: Number,
        required: true,
        min: 1
    },
    inviteCode: {
        type: String,
        required: true,
        unique: true
    },
    isComplete: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Ensure unique invite code constraint is enforced.
module.exports = mongoose.model('Team', teamSchema);
