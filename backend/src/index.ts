import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import path from 'path';
import dotenv from 'dotenv';

// Load Environment variables - reloaded for mobile local network access
dotenv.config();

import { connectDB } from './config/db';
import { initCron } from './cron/reminderCron';
import { initPush } from './services/pushNotification';

// Import Routes
import authRoutes from './routes/authRoutes';
import groceryRoutes from './routes/groceryRoutes';
import notificationRoutes from './routes/notificationRoutes';
import profileRoutes from './routes/profileRoutes';
import adminRoutes from './routes/adminRoutes';
import aiRoutes from './routes/aiRoutes';
import chatRoutes from './routes/chatRoutes';

// Define allowed origins for local network hotspot, localhost, and custom environments
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'https://grocery-expiry-tracking.vercel.app',
  'https://grocery-expiry-tracking12.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean) as string[];

// Create Express app & HTTP Server
const app = express();
const server = http.createServer(app);

// Connect Socket.io
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Save socket server instance to express app context to allow route emits
app.set('io', io);

// Connect to MongoDB
connectDB();

// Initialize Cron Jobs
initCron();

// Initialize Push Notifications VAPID
initPush();

// --- SECURITY MIDDLEWARES ---

// Helmet configuration with CSP adjustment to allow local image rendering fallback
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// CORS settings
app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  })
);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per window
  message: 'Too many requests from this IP, please try again after 15 minutes.'
});
app.use('/api', limiter);

// Express JSON and urlencoded parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// --- STATIC FOLDER ---
// Serves local uploaded images fallback in development/production
const uploadsPath = path.join(__dirname, '../../uploads');
app.use('/uploads', express.static(uploadsPath));

// --- API ROUTES REGISTER ---
import { protect } from './middleware/auth';
import { upload } from './middleware/upload';
import { validate } from './middleware/validate';
import { grocerySchema } from './validators';
import {
  createGrocery,
  uploadImageEndpoint
} from './controllers/groceryController';

// Specified Base Routes
app.post('/api/upload-image', protect, upload.single('image'), uploadImageEndpoint);
app.post('/api/grocery', protect, upload.single('image'), validate(grocerySchema), createGrocery);

app.use('/api/auth', authRoutes);
app.use('/api/groceries', groceryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/chat', chatRoutes);

// Root Hello Route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Grocery Expiry Tracker API!' });
});

// Socket.io connection logic
io.on('connection', (socket) => {
  console.log(`Socket client connected: ${socket.id}`);

  // Join a dedicated room for this user so we can emit targeted messages
  socket.on('joinRoom', (userId: string) => {
    if (userId) {
      socket.join(userId);
      console.log(`Socket ${socket.id} joined user room: ${userId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Socket client disconnected: ${socket.id}`);
  });
});

// Start the server
const PORT = process.env.PORT || 5001;

server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
