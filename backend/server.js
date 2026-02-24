require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const qrcode = require('qrcode');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const User = require('./models/User');
const Team = require('./models/Team');
const ChatMessage = require('./models/ChatMessage');
const Organizer = require('./models/Organizer');
const DraftEvent = require('./models/DraftEvent');
const GlobalEvent = require('./models/GlobalEvent');
const Ticket = require('./models/Ticket');
const PassReset = require('./models/PassReset');

const app = express();

// Socket.IO Setup
const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to send Discord notification
const sendDiscordNotification = async (webhookUrl, eventData, organizerName) => {
  if (!webhookUrl) return;

  try {
    const message = {
      content: `🎉 **New Event Published by ${organizerName}!** 🎉`,
      embeds: [{
        title: eventData.name,
        description: eventData.description,
        color: 3447003, // Blue color
        fields: [
          {
            name: 'Type',
            value: eventData.eventType,
            inline: true
          },
          {
            name: 'Start Date',
            value: new Date(eventData.startDate).toLocaleDateString(),
            inline: true
          },
          {
            name: 'Registration Deadline',
            value: new Date(eventData.registrationDeadline).toLocaleDateString(),
            inline: true
          }
        ],
        footer: {
          text: 'Felicity Event Management System'
        },
        timestamp: new Date().toISOString()
      }]
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message)
    });
    console.log('Discord notification sent successfully');
  } catch (error) {
    console.error('Failed to send Discord notification:', error);
  }
};

// Cloudflare Turnstile Verification Helper
const verifyTurnstile = async (token) => {
  try {
    const formData = new URLSearchParams();
    formData.append('secret', process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA');
    formData.append('response', token);

    const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    const result = await fetch(url, {
      body: formData,
      method: 'POST',
    });

    const outcome = await result.json();
    console.log('Turnstile Verify Outcome:', outcome);
    return outcome.success;
  } catch (err) {
    console.error('Turnstile verification error:', err);
    return false;
  }
};



// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB (participant_login)'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Register Route
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, userType, turnstileToken } = req.body;

    if (!turnstileToken) {
      return res.status(400).json({ message: 'Cloudflare Turnstile CAPTCHA token is missing.' });
    }

    const isValidCaptcha = await verifyTurnstile(turnstileToken);
    if (!isValidCaptcha) {
      return res.status(400).json({ message: 'CAPTCHA verification failed. Please try again.' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username: email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the password using bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user in MongoDB
    const newUser = new User({
      username: email,
      password: hashedPassword,
      userType: userType
    });

    await newUser.save();

    // Generate JWT Token
    const token = jwt.sign(
      {
        userId: newUser._id,
        username: newUser.username,
        userType: newUser.userType,
        filled: newUser.filled
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { userId: newUser._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' } // Refresh token expires in 7 days
    );

    // Send success response with tokens
    res.status(201).json({
      message: 'Registration successful!',
      token: token,
      refreshToken: refreshToken
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login Route
app.post('/api/auth/login', async (req, res) => {
  try {
    let { email, password, userType, turnstileToken } = req.body;

    // We allow admin logins without captcha to let them rescue the system if needed, but not organizers/participants
    if (userType !== 'admin') {
      if (!turnstileToken) {
        return res.status(400).json({ message: 'Cloudflare Turnstile CAPTCHA token is missing.' });
      }

      const isValidCaptcha = await verifyTurnstile(turnstileToken);
      if (!isValidCaptcha) {
        return res.status(400).json({ message: 'CAPTCHA verification failed. Please try again.' });
      }
    }

    // Basic Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email/Username and password are required' });
    }

    let user;

    if (userType === 'participant') {
      user = await User.findOne({ username: email });
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      // Verify user type matches
      if (user.userType !== 'iiit' && user.userType !== 'non-iiit') {
        return res.status(403).json({ message: 'Access denied. Not a participant.' });
      }
    }
    else if (userType === 'organizer') {
      user = await Organizer.findOne({ email: email });
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      if (user.status === 'archived') {
        return res.status(403).json({ message: 'Account has been archived. Please contact an administrator.' });
      }
    }
    else {
      return res.status(400).json({ message: 'Invalid user type' });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT Token
    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username || user.email,
        userType: user.userType,
        filled: user.filled !== undefined ? user.filled : true // Default to true for organizers
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Send success response with tokens
    res.status(200).json({
      message: 'Login successful!',
      token: token,
      refreshToken: refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Admin Login Route
app.post('/api/auth/admin-login', async (req, res) => {
  try {
    const { username, password, turnstileToken } = req.body;

    if (!turnstileToken) {
      return res.status(400).json({ message: 'Cloudflare Turnstile CAPTCHA token is missing.' });
    }

    const isValidCaptcha = await verifyTurnstile(turnstileToken);
    if (!isValidCaptcha) {
      return res.status(400).json({ message: 'CAPTCHA verification failed. Please try again.' });
    }

    // Hardcoded admin credentials as requested
    if (username === 'admin' && password === 'p@ssword') {
      // Generate JWT Token for admin
      const token = jwt.sign(
        { username: 'admin', userType: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      return res.status(200).json({
        message: 'Admin login successful!',
        token: token
      });
    } else {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error during admin login' });
  }
});

// Password Reset Request Route
app.post('/api/auth/reset-password-request', async (req, res) => {
  try {
    const { email, reason } = req.body;

    if (!email || !reason) {
      return res.status(400).json({ message: 'Email and reason are required' });
    }

    // Check if the organizer exists
    const organizer = await Organizer.findOne({ email });
    if (!organizer) {
      return res.status(404).json({ message: 'Club/Organizer not found' });
    }

    // Check if there's already a pending request
    const existingReq = await PassReset.findOne({ clubemail: email, status: 'Pending' });
    if (existingReq) {
      return res.status(400).json({ message: 'A password reset request is already pending for this email' });
    }

    const newRequest = new PassReset({
      clubemail: email,
      reason,
      status: 'Pending',
      date: new Date()
    });

    await newRequest.save();
    res.status(201).json({ message: 'Password reset request submitted successfully' });

  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ message: 'Server error while submitting request' });
  }
});

// Admin Route to Create Organizer
app.post('/api/admin/organizers', async (req, res) => {
  try {
    const { email, password, name, category, description, contact } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check if organizer already exists
    const existingOrg = await Organizer.findOne({ email });
    if (existingOrg) {
      return res.status(400).json({ message: 'Organizer already exists' });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new organizer
    const newOrganizer = new Organizer({
      email,
      password: hashedPassword,
      name: name || '',
      category: category || '',
      description: description || '',
      contact: contact || '',
      userType: 'organizer'
    });

    await newOrganizer.save();

    res.status(201).json({ message: 'Organizer created successfully!' });
  } catch (error) {
    console.error('Create organizer error:', error);
    res.status(500).json({ message: 'Server error creating organizer' });
  }
});

// Admin Route to Get All Organizers
app.get('/api/admin/organizers', async (req, res) => {
  try {
    const organizers = await Organizer.find({}, '-password'); // Exclude password from results
    res.status(200).json(organizers);
  } catch (error) {
    console.error('Get organizers error:', error);
    res.status(500).json({ message: 'Server error fetching organizers' });
  }
});

// Admin Route to Delete Organizer
app.delete('/api/admin/organizers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedOrg = await Organizer.findByIdAndDelete(id);

    if (!deletedOrg) {
      return res.status(404).json({ message: 'Organizer not found' });
    }

    res.status(200).json({ message: 'Organizer deleted successfully' });
  } catch (error) {
    console.error('Delete organizer error:', error);
    res.status(500).json({ message: 'Server error deleting organizer' });
  }
});

// Admin Route to Archive/Unarchive Organizer
app.put('/api/admin/organizers/:id/archive', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'active' or 'archived'

    if (!['active', 'archived'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const updatedOrg = await Organizer.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedOrg) {
      return res.status(404).json({ message: 'Organizer not found' });
    }

    res.status(200).json({ message: `Organizer successfully ${status}`, organizer: updatedOrg });
  } catch (error) {
    console.error('Archive organizer error:', error);
    res.status(500).json({ message: 'Server error archiving organizer' });
  }
});

// Admin Route to Get Password Reset Requests
app.get('/api/admin/password-resets', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.userType !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    const requests = await PassReset.find().sort({ date: -1 });
    res.status(200).json(requests);

  } catch (error) {
    console.error('Fetch password reset requests error:', error);
    res.status(500).json({ message: 'Server error fetching requests' });
  }
});

// Admin Route to Resolve Password Reset Request
app.put('/api/admin/password-resets/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.userType !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    const requestId = req.params.id;
    const { action, newPassword } = req.body; // action = 'Approve' or 'Reject'

    const passResetObj = await PassReset.findById(requestId);
    if (!passResetObj) {
      return res.status(404).json({ message: 'Reset request not found' });
    }

    if (passResetObj.status !== 'Pending') {
      return res.status(400).json({ message: 'Request is already processed' });
    }

    if (action === 'Reject') {
      passResetObj.status = 'Rejected';
      await passResetObj.save();
      return res.status(200).json({ message: 'Request rejected successfully' });
    }

    if (action === 'Approve') {
      if (newPassword === undefined || newPassword === null) {
        return res.status(400).json({ message: 'Valid new password is required to approve' });
      }

      // Update Organizer Password
      const organizer = await Organizer.findOne({ email: passResetObj.clubemail });
      if (!organizer) {
        return res.status(404).json({ message: 'Club/Organizer could not be found' });
      }

      const salt = await bcrypt.genSalt(10);
      organizer.password = await bcrypt.hash(newPassword, salt);
      await organizer.save();

      // Update User Password if they also exist in User table (since Organizer and User models overlap username/email logic occasionally)
      const userObj = await User.findOne({ username: passResetObj.clubemail });
      if (userObj) {
        userObj.password = await bcrypt.hash(newPassword, salt);
        await userObj.save();
      }

      passResetObj.status = 'Approved';
      await passResetObj.save();

      return res.status(200).json({ message: 'Password reset and request approved successfully' });
    }

    res.status(400).json({ message: 'Invalid action' });

  } catch (error) {
    console.error('Resolve password reset error:', error);
    res.status(500).json({ message: 'Server error resolving request' });
  }
});

// Organizer Route to Create Event
app.post('/api/organizer/events', async (req, res) => {
  try {
    // In a real app, you'd extract the organizerId from the verified JWT token middleware
    // For now, we'll assume the frontend sends the token in the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.userType !== 'organizer') {
      return res.status(403).json({ message: 'Access denied. Not an organizer.' });
    }

    const {
      name, description, eventType, eligibility,
      registrationDeadline, startDate, endDate,
      registrationLimit, registrationFee, tags, action,
      customFields, merchandiseDetails
    } = req.body;

    // Helper to parse dd/mm/yyyy to Date object
    const parseDate = (dateStr) => {
      const [day, month, year] = dateStr.split('/');
      return new Date(year, month - 1, day);
    };

    const eventData = {
      name,
      description,
      eventType,
      eligibility,
      registrationDeadline: parseDate(registrationDeadline),
      startDate: parseDate(startDate),
      endDate: parseDate(endDate),
      registrationLimit: registrationLimit ? Number(registrationLimit) : null,
      registrationFee: registrationFee ? Number(registrationFee) : 0,
      tags,
      organizerId: decoded.userId,
      customFields: eventType === 'normal' ? (customFields || []) : [],
      merchandiseDetails: eventType === 'merchandise' ? (merchandiseDetails || {}) : undefined
    };

    let newEvent;
    if (action === 'publish') {
      eventData.status = 'Published';
      newEvent = new GlobalEvent(eventData);

      // Send Discord notification if webhook is configured
      const organizer = await Organizer.findById(decoded.userId);
      if (organizer && organizer.discordWebhook) {
        sendDiscordNotification(organizer.discordWebhook, eventData, organizer.name || organizer.email);
      }
    } else {
      eventData.status = 'Draft';
      newEvent = new DraftEvent(eventData);
    }

    await newEvent.save();
    res.status(201).json({ message: `Event ${action === 'publish' ? 'published' : 'saved to draft'} successfully!`, event: newEvent });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ message: 'Server error creating event' });
  }
});

// Organizer Route to Get All Events
app.get('/api/organizer/events', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.userType !== 'organizer') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const drafts = await DraftEvent.find({ organizerId: decoded.userId }).lean();
    const globals = await GlobalEvent.find({ organizerId: decoded.userId }).lean();

    const globalEventsWithCount = await Promise.all(globals.map(async (event) => {
      const tickets = await Ticket.find({ eventId: event._id });
      let registeredCount = 0;
      tickets.forEach(ticket => {
        if (ticket.status === 'Registered' || ticket.status === 'Completed') {
          let qty = 1;
          if (ticket.type === 'merchandise' && ticket.merchandiseSelections?.quantity) {
            qty = ticket.merchandiseSelections.quantity;
          }
          registeredCount += qty;
        }
      });
      return { ...event, registeredCount };
    }));

    res.status(200).json([...drafts, ...globalEventsWithCount]);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ message: 'Server error fetching events' });
  }
});

// Organizer Route to Get Single Event
app.get('/api/organizer/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let event = await DraftEvent.findById(id);
    if (!event) {
      event = await GlobalEvent.findById(id);
    }

    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.status(200).json(event);
  } catch (error) {
    console.error('Get single event error:', error);
    res.status(500).json({ message: 'Server error fetching event' });
  }
});

// Organizer Route to Update Event
app.put('/api/organizer/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Helper to parse dd/mm/yyyy to Date object
    const parseDate = (dateStr) => {
      if (!dateStr) return undefined;
      if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/');
        return new Date(year, month - 1, day);
      }
      return new Date(dateStr); // fallback if already ISO
    };

    if (updateData.startDate) updateData.startDate = parseDate(updateData.startDate);
    if (updateData.endDate) updateData.endDate = parseDate(updateData.endDate);
    if (updateData.registrationDeadline) updateData.registrationDeadline = parseDate(updateData.registrationDeadline);

    // Filter customFields and merchandiseDetails based on eventType
    if (updateData.eventType) {
      if (updateData.eventType === 'normal') {
        updateData.merchandiseDetails = undefined;
      } else if (updateData.eventType === 'merchandise') {
        updateData.customFields = [];
      }
    }

    let event = await DraftEvent.findById(id);
    let isDraft = true;

    if (!event) {
      event = await GlobalEvent.findById(id);
      isDraft = false;
    }

    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Validate update fields based on event status per requirements:
    // Draft: Free edits, can be published. (Covered natively)
    // Published: description update, extend deadline, increase limit, close registrations
    // Ongoing/Completed/Cancelled: no edits except status change, can be marked completed or closed.

    if (event.status === 'Closed' || event.status === 'Completed' || event.status === 'Cancelled') {
      // If already closed/completed/cancelled, can't change anything (or maybe status but keep it simple here)
      return res.status(400).json({ message: 'Cannot edit an event in closed, completed, or cancelled status.' });
    }

    if (event.status === 'Ongoing') {
      // Can only change status, no other fields
      const allowedKeys = ['status'];
      const updateKeys = Object.keys(updateData);
      const isIllegalUpdate = updateKeys.some(key => !allowedKeys.includes(key));
      if (isIllegalUpdate) {
        return res.status(400).json({ message: 'Ongoing events can only have their status updated (e.g., to Completed or Closed).' });
      }
    }

    if (event.status === 'Published') {
      // Allowed updates for published: status, description, registrationDeadline (only extend), registrationLimit (only increase)
      const allowedKeys = ['status', 'description', 'registrationDeadline', 'registrationLimit'];
      const updateKeys = Object.keys(updateData);
      const isIllegalUpdate = updateKeys.some(key => !allowedKeys.includes(key));

      if (isIllegalUpdate) {
        return res.status(400).json({ message: 'Published events can only update description, deadline, limit, or status.' });
      }

      if (updateData.registrationDeadline && updateData.registrationDeadline < event.registrationDeadline) {
        return res.status(400).json({ message: 'Registration deadline can only be extended, not shortened.' });
      }

      if (updateData.registrationLimit && updateData.registrationLimit < event.registrationLimit) {
        return res.status(400).json({ message: 'Registration limit/stock can only be increased, not decreased.' });
      }
    }

    if (isDraft && updateData.status === 'Published') {
      // Move from DraftEvent to GlobalEvent
      const newGlobal = new GlobalEvent({
        ...event.toObject(),
        ...updateData,
        _id: event._id // keep same ID
      });
      await newGlobal.save();
      await DraftEvent.findByIdAndDelete(id);

      // Send Discord notification if webhook is configured
      const organizer = await Organizer.findById(event.organizerId);
      if (organizer && organizer.discordWebhook) {
        sendDiscordNotification(organizer.discordWebhook, newGlobal, organizer.name || organizer.email);
      }
    } else if (isDraft) {
      await DraftEvent.findByIdAndUpdate(id, updateData);
    } else {
      await GlobalEvent.findByIdAndUpdate(id, updateData);
    }

    res.status(200).json({ message: 'Event updated successfully' });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ message: 'Server error updating event status' });
  }
});

// GET /api/organizer/events/:id/attendance
// Fech all tickets (attendance list) for an event
app.get('/api/organizer/events/:id/attendance', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.userType !== 'organizer') return res.status(403).json({ message: 'Access denied' });

    // Verify ownership
    const event = await GlobalEvent.findOne({ _id: req.params.id, organizerId: decoded.userId });
    if (!event) return res.status(404).json({ message: 'Event not found or unauthorized' });

    const tickets = await Ticket.find({ eventId: req.params.id })
      .populate('participantId', 'username firstName lastName email')
      .sort({ purchaseDate: -1 });

    res.status(200).json(tickets);
  } catch (error) {
    console.error('Fetch attendance error:', error);
    res.status(500).json({ message: 'Server error fetching attendance list' });
  }
});

// POST /api/organizer/events/:id/scan
// Scan a QR code ticket to mark attendance
app.post('/api/organizer/events/:id/scan', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.userType !== 'organizer') return res.status(403).json({ message: 'Access denied' });

    const { ticketId } = req.body;
    if (!ticketId) return res.status(400).json({ message: 'Ticket ID is required' });

    // Verify ownership
    const event = await GlobalEvent.findOne({ _id: req.params.id, organizerId: decoded.userId });
    if (!event) return res.status(404).json({ message: 'Event not found or unauthorized' });

    const ticket = await Ticket.findOne({ ticketId, eventId: req.params.id }).populate('participantId', 'username firstName lastName');
    if (!ticket) return res.status(404).json({ message: 'Invalid ticket for this event.' });

    if (ticket.status !== 'Registered') {
      return res.status(400).json({ message: `Ticket status is ${ticket.status}. Cannot mark attendance.` });
    }

    if (ticket.attendanceMarked) {
      return res.status(400).json({ message: 'Duplicate Scan: Attendance already marked.', ticket });
    }

    ticket.attendanceMarked = true;
    ticket.attendanceTimestamp = new Date();
    await ticket.save();

    res.status(200).json({ message: 'Attendance marked successfully', ticket });
  } catch (error) {
    console.error('Scan ticket error:', error);
    res.status(500).json({ message: 'Server error scanning ticket' });
  }
});

// POST /api/organizer/events/:id/manual-override
// Manually toggle attendance status or apply an override with reasoning
app.post('/api/organizer/events/:id/manual-override', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.userType !== 'organizer') return res.status(403).json({ message: 'Access denied' });

    const { ticketId, overrideReason, attendanceMarked } = req.body;
    if (!ticketId || overrideReason === undefined || attendanceMarked === undefined) {
      return res.status(400).json({ message: 'ticketId, overrideReason, and attendanceMarked are required' });
    }

    // Verify ownership
    const event = await GlobalEvent.findOne({ _id: req.params.id, organizerId: decoded.userId });
    if (!event) return res.status(404).json({ message: 'Event not found or unauthorized' });

    const ticket = await Ticket.findOne({ ticketId, eventId: req.params.id });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    ticket.attendanceMarked = attendanceMarked;
    ticket.attendanceTimestamp = attendanceMarked ? new Date() : null;
    ticket.manualOverride = true;
    ticket.overrideReason = overrideReason;

    await ticket.save();

    res.status(200).json({ message: 'Manual override applied successfully', ticket });
  } catch (error) {
    console.error('Manual override error:', error);
    res.status(500).json({ message: 'Server error applying manual override' });
  }
});

// Organizer Route to Get Event Participants & Analytics
app.get('/api/organizer/events/:id/participants', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.userType !== 'organizer') {
      return res.status(403).json({ message: 'Access denied. Not an organizer.' });
    }

    const { id } = req.params;

    // Verify event ownership
    let event = await GlobalEvent.findById(id);
    if (!event) event = await DraftEvent.findById(id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (event.organizerId.toString() !== decoded.userId) {
      return res.status(403).json({ message: 'Access denied. Not your event.' });
    }

    // Fetch all tickets for this event, populating user details
    const tickets = await Ticket.find({ eventId: id }).populate('participantId', 'username name email');

    // Calculate Analytics
    let totalSales = 0;
    let totalRevenue = 0;
    let totalAttended = 0;

    const formattedParticipants = tickets.map(ticket => {
      // Normal/Merchandise sale logic
      if (ticket.status === 'Registered' || ticket.status === 'Completed') {
        let quantity = 1;
        if (ticket.type === 'merchandise' && ticket.merchandiseSelections?.quantity) {
          quantity = ticket.merchandiseSelections.quantity;
        }
        totalSales += quantity;
        totalRevenue += quantity * (event.registrationFee || 0);
      }

      // Attendance logic
      if (ticket.status === 'Completed') {
        let quantity = 1;
        if (ticket.type === 'merchandise' && ticket.merchandiseSelections?.quantity) {
          quantity = ticket.merchandiseSelections.quantity;
        }
        totalAttended += quantity;
      }

      return {
        _id: ticket._id,
        ticketId: ticket.ticketId,
        participantName: ticket.participantId?.name || 'Unknown',
        participantEmail: ticket.participantId?.username || ticket.participantId?.email || 'Unknown',
        type: ticket.type,
        status: ticket.status,
        purchaseDate: ticket.purchaseDate,
        teamName: ticket.teamName,
        answers: ticket.answers,
        merchandiseSelections: ticket.merchandiseSelections
      };
    });

    res.status(200).json({
      eventDetails: {
        name: event.name,
        status: event.status,
        eventType: event.eventType,
        registrationFee: event.registrationFee,
        registrationLimit: event.registrationLimit
      },
      analytics: {
        totalSales,
        totalRevenue,
        totalAttended
      },
      participants: formattedParticipants
    });

  } catch (error) {
    console.error('Fetch participants error:', error);
    res.status(500).json({ message: 'Server error fetching participants' });
  }
});

// Organizer Route to Get Profile
app.get('/api/organizer/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.userType !== 'organizer') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const organizer = await Organizer.findById(decoded.userId).select('-password');
    if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

    res.status(200).json(organizer);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

// Organizer Route to Update Profile
app.put('/api/organizer/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.userType !== 'organizer') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { name, category, description, contact, discordWebhook } = req.body;

    const updatedOrganizer = await Organizer.findByIdAndUpdate(
      decoded.userId,
      { name, category, description, contact, discordWebhook },
      { returnDocument: 'after' }
    ).select('-password');

    if (!updatedOrganizer) return res.status(404).json({ message: 'Organizer not found' });

    res.status(200).json({ message: 'Profile updated successfully', profile: updatedOrganizer });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// Participant Route to Get Onboarding Data
app.get('/api/participant/onboarding-data', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.userType !== 'iiit' && decoded.userType !== 'non-iiit') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const organizers = await Organizer.find({}, 'name category');

    // Extract unique categories
    const categoriesSet = new Set();
    const clubs = [];

    organizers.forEach(org => {
      if (org.name) clubs.push(org.name);
      if (org.category) {
        // Split by comma if multiple categories are provided
        const cats = org.category.split(',').map(c => c.trim()).filter(c => c);
        cats.forEach(c => categoriesSet.add(c));
      }
    });

    res.status(200).json({
      categories: Array.from(categoriesSet),
      clubs: clubs
    });
  } catch (error) {
    console.error('Get onboarding data error:', error);
    res.status(500).json({ message: 'Server error fetching onboarding data' });
  }
});

// Participant Route to Save Onboarding Data
app.post('/api/participant/onboarding', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.userType !== 'iiit' && decoded.userType !== 'non-iiit') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { topics, clubs } = req.body;

    await User.findByIdAndUpdate(decoded.userId, {
      interested_topics: topics || [],
      interested_clubs: clubs || [],
      filled: true
    });

    res.status(200).json({ message: 'Onboarding completed successfully' });
  } catch (error) {
    console.error('Save onboarding data error:', error);
    res.status(500).json({ message: 'Server error saving onboarding data' });
  }
});

// Participant Route to Get All Clubs
app.get('/api/participant/clubs', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.userType !== 'iiit' && decoded.userType !== 'non-iiit') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const organizers = await Organizer.find({}, '-password');
    const user = await User.findById(decoded.userId);

    res.status(200).json({
      clubs: organizers,
      followedClubs: user.interested_clubs || []
    });
  } catch (error) {
    console.error('Get clubs error:', error);
    res.status(500).json({ message: 'Server error fetching clubs' });
  }
});

// Participant Route to Toggle Follow Club
app.post('/api/participant/clubs/:id/toggle', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.userType !== 'iiit' && decoded.userType !== 'non-iiit') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { id } = req.params;
    const organizer = await Organizer.findById(id);
    if (!organizer) return res.status(404).json({ message: 'Club not found' });

    const user = await User.findById(decoded.userId);
    const clubName = organizer.name;

    if (!clubName) return res.status(400).json({ message: 'Club has no name set' });

    let followedClubs = user.interested_clubs || [];
    if (followedClubs.includes(clubName)) {
      followedClubs = followedClubs.filter(c => c !== clubName);
    } else {
      followedClubs.push(clubName);
    }

    user.interested_clubs = followedClubs;
    await user.save();

    res.status(200).json({ message: 'Follow status updated', followedClubs });
  } catch (error) {
    console.error('Toggle follow error:', error);
    res.status(500).json({ message: 'Server error toggling follow status' });
  }
});

// Participant Route to Get Single Club Details
app.get('/api/participant/clubs/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.userType !== 'iiit' && decoded.userType !== 'non-iiit') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { id } = req.params;
    const organizer = await Organizer.findById(id, '-password');
    if (!organizer) return res.status(404).json({ message: 'Club not found' });

    // Get events for this club (only Published or Closed)
    const events = await GlobalEvent.find({ organizerId: id });

    res.status(200).json({
      club: organizer,
      events: events
    });
  } catch (error) {
    console.error('Get club details error:', error);
    res.status(500).json({ message: 'Server error fetching club details' });
  }
});

// Participant Route to Get Profile
app.get('/api/participant/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.userType !== 'iiit' && decoded.userType !== 'non-iiit') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const user = await User.findById(decoded.userId, '-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

// Participant Route to Update Profile
app.put('/api/participant/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.userType !== 'iiit' && decoded.userType !== 'non-iiit') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { firstName, lastName, contactNumber, college, interested_topics, interested_clubs } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      decoded.userId,
      { firstName, lastName, contactNumber, college, interested_topics, interested_clubs },
      { returnDocument: 'after' }
    ).select('-password');

    if (!updatedUser) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({ message: 'Profile updated successfully', profile: updatedUser });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// Participant Route to Change Password
app.post('/api/participant/change-password', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.userType !== 'iiit' && decoded.userType !== 'non-iiit') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { email, oldPassword, newPassword } = req.body;

    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.username !== email) {
      return res.status(400).json({ message: 'Email does not match your account' });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect old password' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error changing password' });
  }
});

// Participant Route to Get All Events
app.get('/api/participant/events', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.userType !== 'iiit' && decoded.userType !== 'non-iiit' && decoded.userType !== 'participant') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const user = await User.findById(decoded.userId);
    const followedClubs = user?.interested_clubs || [];

    const events = await GlobalEvent.find().populate('organizerId', 'name category');

    // Sort events: those where organizerId._id is in followedClubs come first
    events.sort((a, b) => {
      const orgA = a.organizerId?._id?.toString();
      const orgB = b.organizerId?._id?.toString();

      const aInFollowed = followedClubs.includes(orgA);
      const bInFollowed = followedClubs.includes(orgB);

      if (aInFollowed && !bInFollowed) return -1;
      if (!aInFollowed && bInFollowed) return 1;
      // If both are same, sort by date (newest first) or retain order
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.status(200).json(events);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ message: 'Server error fetching events' });
  }
});

// Participant Route to Get Single Event and Increment Views
app.get('/api/participant/events/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.userType !== 'iiit' && decoded.userType !== 'non-iiit' && decoded.userType !== 'participant') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const event = await GlobalEvent.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { returnDocument: 'after' }
    ).populate('organizerId', 'name category description contact');

    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.status(200).json(event);
  } catch (error) {
    console.error('Get single event error:', error);
    res.status(500).json({ message: 'Server error fetching event' });
  }
});

// Participant Route to Register for an Event
app.post('/api/participant/events/:id/register', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.userType !== 'iiit' && decoded.userType !== 'non-iiit' && decoded.userType !== 'participant') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const eventId = req.params.id;
    const participantId = decoded.userId;
    const { teamName, answers, merchandiseSelections } = req.body;

    // Check if already registered
    const existingTicket = await Ticket.findOne({ eventId, participantId });
    if (existingTicket) {
      return res.status(400).json({ message: 'You are already registered for this event.' });
    }

    const event = await GlobalEvent.findById(eventId).populate('organizerId', 'name');
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (event.status !== 'Published' && event.status !== 'Ongoing') {
      return res.status(400).json({ message: 'Event is not open for registration.' });
    }

    // Process merchandise registration options
    let requestedQuantity = 1;
    if (event.eventType === 'merchandise') {
      requestedQuantity = merchandiseSelections?.quantity || 1;
      const purchaseLimit = event.merchandiseDetails?.purchaseLimit || 1;

      if (requestedQuantity > purchaseLimit) {
        return res.status(400).json({ message: `You can only purchase up to ${purchaseLimit} items.` });
      }

      if (!merchandiseSelections?.size || !merchandiseSelections?.color) {
        return res.status(400).json({ message: 'Please select size and color.' });
      }
    }

    // Check registration limit / stock
    if (event.registrationLimit !== null && event.registrationLimit !== undefined) {
      if (event.eventType === 'merchandise') {
        const currentRegistrations = await Ticket.aggregate([
          { $match: { eventId: new mongoose.Types.ObjectId(eventId) } },
          { $group: { _id: null, totalSold: { $sum: '$merchandiseSelections.quantity' } } }
        ]);
        const totalSold = currentRegistrations.length > 0 ? currentRegistrations[0].totalSold : 0;

        if (totalSold + requestedQuantity > event.registrationLimit) {
          return res.status(400).json({ message: 'Out of stock! Not enough items available.' });
        }
      } else {
        const currentRegistrations = await Ticket.countDocuments({ eventId });
        if (currentRegistrations >= event.registrationLimit) {
          return res.status(400).json({ message: 'Registration limit reached' });
        }
      }
    }

    const user = await User.findById(participantId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Generate unique Ticket ID based on instructions: {ClubName}{EventName}_{useremail}
    const cleanName = (str) => str ? str.replace(/[^a-zA-Z0-9]/g, '') : 'Unknown';
    const clubStr = cleanName(event.organizerId?.name);
    const eventStr = cleanName(event.name);
    // Adding an underscore before the email to make it easy to extract later during attendance
    const ticketId = `${clubStr}${eventStr}_${user.username}`;

    // Generate QR Code
    const qrData = JSON.stringify({
      ticketId,
      eventId: event._id,
      eventName: event.name,
      participantId: user._id,
      participantName: user.username
    });
    const qrCodeDataUrl = await qrcode.toDataURL(qrData);

    // Create Ticket
    const newTicket = new Ticket({
      ticketId,
      eventId: event._id,
      participantId: user._id,
      qrCode: qrCodeDataUrl,
      type: event.eventType,
      teamName: teamName || undefined,
      answers: event.eventType === 'normal' ? answers : undefined,
      merchandiseSelections: event.eventType === 'merchandise' ? {
        ...merchandiseSelections,
        quantity: requestedQuantity
      } : undefined
    });

    await newTicket.save();

    // Send Email (Mocked for now, but structure is there)
    // In a real app, configure transporter with real credentials
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: '"Felicity Events" <noreply@felicity.iiit.ac.in>',
      to: user.username, // Assuming username is email
      subject: `Registration Confirmation: ${event.name}`,
      html: `
        <h1>Registration Successful!</h1>
        <p>Hi there,</p>
        <p>You have successfully registered for <strong>${event.name}</strong>.</p>
        <p><strong>Ticket ID:</strong> ${ticketId}</p>
        <p><strong>Event Type:</strong> ${event.eventType}</p>
        <p><strong>Organizer:</strong> ${event.organizerId?.name || 'Unknown'}</p>
        <p>Please find your QR code attached or view it in your dashboard.</p>
      `,
      attachments: [
        {
          filename: 'ticket-qr.png',
          content: qrCodeDataUrl.split('base64,')[1],
          encoding: 'base64'
        }
      ]
    };

    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${user.username} for ticket ${ticketId}`);
      } else {
        console.log(`[MOCK EMAIL LOG] In production, an email with the QR code would be sent to ${user.username} for ticket ${ticketId}. For now, participants can view the QR code on the "My Events" Dashboard.`);
      }
    } catch (error) {
      console.error('Failed to send email:', error);
    }

    res.status(201).json({
      message: 'Registration successful!',
      ticket: newTicket
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Participant Route to Get My Events (Participation History)
app.get('/api/participant/my-events', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.userType !== 'iiit' && decoded.userType !== 'non-iiit' && decoded.userType !== 'participant') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const tickets = await Ticket.find({ participantId: decoded.userId })
      .populate({
        path: 'eventId',
        populate: { path: 'organizerId', select: 'name' }
      })
      .sort({ purchaseDate: -1 });

    res.status(200).json(tickets);
  } catch (error) {
    console.error('Get my events error:', error);
    res.status(500).json({ message: 'Server error fetching participation history' });
  }
});

// Participant Route to Cancel Ticket
app.put('/api/participant/tickets/:id/cancel', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.userType !== 'iiit' && decoded.userType !== 'non-iiit' && decoded.userType !== 'participant') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const ticketId = req.params.id; // DB _id of the ticket
    const participantId = decoded.userId;

    const ticket = await Ticket.findOne({ _id: ticketId, participantId });

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (ticket.status !== 'Registered') {
      return res.status(400).json({ message: 'Only registered tickets can be cancelled' });
    }

    // Per user instructions, DO NOT increase the registration limit back up
    ticket.status = 'Cancelled';
    await ticket.save();

    res.status(200).json({ message: 'Ticket cancelled successfully', ticket });

  } catch (error) {
    console.error('Cancel ticket error:', error);
    res.status(500).json({ message: 'Server error cancelling ticket' });
  }
});



// --- Hackathon Team Registration Routes ---

// Participant Route to Create a Team
app.post('/api/teams/create', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.userType !== 'iiit' && decoded.userType !== 'non-iiit' && decoded.userType !== 'participant') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { name, eventId, size } = req.body;
    if (!name || !eventId || !size) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const event = await GlobalEvent.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Generate unique invite code
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const newTeam = new Team({
      name,
      eventId,
      leaderId: decoded.userId,
      size,
      inviteCode,
      members: [{ userId: decoded.userId, status: 'accepted' }],
      isComplete: size === 1
    });

    await newTeam.save();

    // If size is 1, auto-generate ticket since team is complete
    if (newTeam.isComplete) {
      const user = await User.findById(decoded.userId);
      const populatedEvent = await GlobalEvent.findById(eventId).populate('organizerId', 'name');

      const cleanName = (str) => str ? str.replace(/[^a-zA-Z0-9]/g, '') : 'Unknown';
      const clubStr = cleanName(populatedEvent.organizerId?.name);
      const eventStr = cleanName(populatedEvent.name);
      const ticketId = `${clubStr}${eventStr}_${user.username}`;

      const qrData = JSON.stringify({
        ticketId,
        eventId: event._id,
        eventName: event.name,
        participantId: user._id,
        participantName: user.username
      });
      const qrCodeDataUrl = await qrcode.toDataURL(qrData);

      const ticket = new Ticket({
        ticketId,
        eventId,
        organizerId: event.organizerId,
        participantId: decoded.userId,
        qrCode: qrCodeDataUrl,
        status: 'Registered',
        type: event.eventType === 'merchandise' ? 'merchandise' : 'normal',
        teamId: newTeam._id,
        teamName: newTeam.name
      });
      await ticket.save();
    }

    res.status(201).json({ message: 'Team created successfully', team: newTeam });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ message: 'Server error creating team' });
  }
});

// Participant Route to Join a Team
app.post('/api/teams/join', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.userType !== 'iiit' && decoded.userType !== 'non-iiit' && decoded.userType !== 'participant') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { inviteCode } = req.body;
    if (!inviteCode) return res.status(400).json({ message: 'Invite code is required' });

    const team = await Team.findOne({ inviteCode });
    if (!team) return res.status(404).json({ message: 'Invalid invite code' });

    if (team.isComplete) {
      return res.status(400).json({ message: 'This team is already full' });
    }

    // Check if user is already in the team
    const isMember = team.members.some(m => m.userId.toString() === decoded.userId);
    if (isMember) {
      return res.status(400).json({ message: 'You are already a member of this team' });
    }

    team.members.push({ userId: decoded.userId, status: 'accepted' });

    // Check if team is now complete
    if (team.members.length === team.size) {
      team.isComplete = true;

      // Generate tickets for all members since team is complete
      const event = await GlobalEvent.findById(team.eventId).populate('organizerId', 'name');

      const cleanName = (str) => str ? str.replace(/[^a-zA-Z0-9]/g, '') : 'Unknown';
      const clubStr = cleanName(event.organizerId?.name);
      const eventStr = cleanName(event.name);

      const ticketPromises = team.members.map(async (member) => {
        const user = await User.findById(member.userId);
        const ticketId = `${clubStr}${eventStr}_${user.username}`;

        const qrData = JSON.stringify({
          ticketId,
          eventId: event._id,
          eventName: event.name,
          participantId: user._id,
          participantName: user.username
        });
        const qrCodeDataUrl = await qrcode.toDataURL(qrData);

        const ticket = new Ticket({
          ticketId,
          eventId: team.eventId,
          organizerId: event.organizerId,
          participantId: member.userId,
          qrCode: qrCodeDataUrl,
          status: 'Registered',
          type: event.eventType === 'merchandise' ? 'merchandise' : 'normal',
          teamId: team._id,
          teamName: team.name
        });
        return ticket.save();
      });

      await Promise.all(ticketPromises);
    }

    await team.save();

    res.status(200).json({ message: 'Successfully joined team', team });
  } catch (error) {
    console.error('Join team error:', error);
    res.status(500).json({ message: 'Server error joining team' });
  }
});

// Participant Route to Get Teams they belong to
app.get('/api/teams/my-teams', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const teams = await Team.find({ 'members.userId': decoded.userId })
      .populate('eventId', 'name startDate endDate')
      .populate('leaderId', 'firstName lastName email username')
      .populate('members.userId', 'firstName lastName email username');

    res.status(200).json(teams);
  } catch (error) {
    console.error('Get user teams error:', error);
    res.status(500).json({ message: 'Server error fetching user teams' });
  }
});

// --- Hackathon Team Chat Routes ---
app.get('/api/teams/:id/messages', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const teamId = req.params.id;
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    const isMember = team.members.some(m => m.userId.toString() === decoded.userId);
    if (!isMember && team.leaderId.toString() !== decoded.userId) {
      return res.status(403).json({ message: 'Not a member of this team' });
    }

    const messages = await ChatMessage.find({ teamId }).sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (error) {
    console.error('Fetch messages error:', error);
    res.status(500).json({ message: 'Server error fetching messages' });
  }
});

// Socket Request Handlers
io.on('connection', (socket) => {
  console.log('User connected to chat:', socket.id);

  socket.on('join_team', (teamId) => {
    socket.join(teamId);
    console.log(`User joined team room: ${teamId}`);
  });

  socket.on('send_message', async (data) => {
    try {
      const { teamId, senderId, senderName, text } = data;
      const newMessage = new ChatMessage({ teamId, senderId, senderName, text });
      await newMessage.save();

      // Emit to everyone in the room
      io.to(teamId).emit('receive_message', newMessage);
    } catch (error) {
      console.error('Error saving chat message:', error);
    }
  });

  socket.on('typing', (data) => {
    // data = { teamId, senderName }
    socket.to(data.teamId).emit('user_typing', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected from chat:', socket.id);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
