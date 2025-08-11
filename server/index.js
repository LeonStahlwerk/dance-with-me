const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

// Basic Express app with Socket.IO and MongoDB
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

// Environment variables (for Render these will be set)
const PORT = process.env.PORT || 4000;
const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/dance-with-me';

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

// Define basic schemas and models
const eventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  date: Date,
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  bio: String,
  events: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
});

const messageSchema = new mongoose.Schema({
  text: { type: String, required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  createdAt: { type: Date, default: Date.now },
});

const Event = mongoose.model('Event', eventSchema);
const User = mongoose.model('User', userSchema);
const Message = mongoose.model('Message', messageSchema);

// REST API endpoints
// Events
app.get('/api/events', async (req, res) => {
  try {
    const events = await Event.find().sort({ date: -1 });
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

app.post('/api/events', async (req, res) => {
  const { name, description, date } = req.body;
  try {
    const event = new Event({ name, description, date });
    await event.save();
    res.json(event);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Failed to create event' });
  }
});

// Users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users', async (req, res) => {
  const { name, bio } = req.body;
  try {
    const user = new User({ name, bio });
    await user.save();
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Failed to create user' });
  }
});

// Messages
// Get all messages for a given event
app.get('/api/messages/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const messages = await Message.find({ event: eventId })
      .populate('sender', 'name')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Create a new message
app.post('/api/messages', async (req, res) => {
  const { eventId, userId, text } = req.body;
  if (!eventId || !userId || !text) {
    return res.status(400).json({ error: 'Missing eventId, userId or text' });
  }
  try {
    const msg = new Message({ text, sender: userId, event: eventId });
    await msg.save();
    const populatedMsg = await msg.populate('sender', 'name');
    res.json(populatedMsg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

// Socket.IO for chat
io.on('connection', (socket) => {
  console.log('User connected', socket.id);

  // Join a chat room based on the event ID
  socket.on('joinEvent', (eventId) => {
    socket.join(eventId);
  });

  // Leave a chat room
  socket.on('leaveEvent', (eventId) => {
    socket.leave(eventId);
  });

  // Handle sending messages
  socket.on('sendMessage', async ({ eventId, userId, text }) => {
    if (!eventId || !userId || !text) return;
    try {
      const msg = new Message({ text, sender: userId, event: eventId });
      await msg.save();
      const populatedMsg = await msg.populate('sender', 'name');
      // Emit message to all clients in the event room
      io.to(eventId).emit('message', populatedMsg);
    } catch (err) {
      console.error('Error saving message', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected', socket.id);
  });
});

// Start the HTTP server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});