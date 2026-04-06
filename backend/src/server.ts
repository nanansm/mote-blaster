import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import dotenv from 'dotenv';
import { prisma } from './config/database';
import { initializePassport } from './config/passport';
import { redis } from './config/redis';
import { createBlastWorker } from './services/messageQueue.service';
import { verifyAccessToken } from './utils/jwt';

// Import routes
import authRoutes from './routes/auth.routes';
import dashboardRoutes from './routes/dashboard.routes';
import instanceRoutes from './routes/instance.routes';
import campaignRoutes from './routes/campaign.routes';
import billingRoutes from './routes/billing.routes';
import { errorMiddleware } from './middlewares/error.middleware';

dotenv.config();

// Extend Socket interface to include userId
declare module 'socket.io' {
  interface Socket {
    userId?: string;
  }
}

const app = express();
const httpServer = createServer(app);

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
});

// Redis adapter for Socket.io (optional, for scaling)
// io.adapter(createAdapter(redis));

initializePassport();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Passport
app.use(passport.initialize());

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 500,
  message: { error: 'Too many requests, please try again later' },
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for'] as string || 
           req.headers['x-real-ip'] as string || 
           req.ip || 
           'unknown';
  },
  skip: (req) => {
    // Skip rate limiting for Google OAuth callback
    return req.path.includes('/auth/google');
  },
});
app.use('/api/', limiter);

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/instances', instanceRoutes);
app.use('/api/v1/campaigns', campaignRoutes);
app.use('/api/v1/billing', billingRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.io authentication and rooms
io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

  if (!token) {
    return next(new Error('Authentication error'));
  }

  const decoded = verifyAccessToken(token);

  if (decoded) {
    socket.userId = decoded.userId;
    return next();
  }

  return next(new Error('Authentication error'));
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id, 'user:', socket.userId);

  // Join user-specific room
  socket.join(`user:${socket.userId}`);

  // Handle instance status subscription
  socket.on('subscribe:instance', ({ instanceId }) => {
    socket.join(`instance:${instanceId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Export io for use in other services
export { io };

// Start blast worker
const blastWorker = createBlastWorker();
blastWorker.on('ready', () => {
  console.log('Blast worker started');
});
blastWorker.on('error', (err: any) => {
  console.error('Blast worker error:', err);
});

// Error handling
app.use(errorMiddleware);

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});
