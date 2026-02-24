const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Organizer = require('./models/Organizer');
const DraftEvent = require('./models/DraftEvent');
const GlobalEvent = require('./models/GlobalEvent');
const Ticket = require('./models/Ticket');
const Team = require('./models/Team');
const PassReset = require('./models/PassReset');
const ChatMessage = require('./models/ChatMessage');

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');

    await User.deleteMany({});
    console.log('Cleared Users');

    await Organizer.deleteMany({});
    console.log('Cleared Organizers');

    await DraftEvent.deleteMany({});
    console.log('Cleared DraftEvents');

    await GlobalEvent.deleteMany({});
    console.log('Cleared GlobalEvents');

    await Ticket.deleteMany({});
    console.log('Cleared Tickets');

    await Team.deleteMany({});
    console.log('Cleared Teams');

    await PassReset.deleteMany({});
    console.log('Cleared PassResets');

    await ChatMessage.deleteMany({});
    console.log('Cleared ChatMessages');

    console.log('All tables cleared successfully.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
  });
