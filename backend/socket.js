// backend/socket.js — Socket.IO singleton
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from './models/User.js';
import Admin from './models/Admin.js';

let io = null;

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
  process.env.FRONTEND_URL,
].filter(Boolean);

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: ALLOWED_ORIGINS, credentials: true },
    transports: ['websocket', 'polling'],
  });

  // ── Auth middleware ─────────────────────────────────────────────────────────
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.type === 'admin') {
        const admin = await Admin.findById(decoded.id).select('-password');
        if (!admin || !admin.isActive) return next(new Error('Admin not found'));
        socket.data = { type: 'admin', id: admin._id.toString(), name: admin.name, role: admin.role, email: admin.email };
      } else {
        const user = await User.findById(decoded.id).select('name email');
        if (!user) return next(new Error('User not found'));
        socket.data = { type: 'user', id: user._id.toString(), name: user.name };
      }
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // ── Connection ──────────────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    if (socket.data.type === 'admin') {
      socket.join('admins');                        // all admins in one broadcast room
      socket.join(`admin_${socket.data.id}`);       // individual admin room
      console.log(`🔌 Admin connected: ${socket.data.name} (${socket.data.role})`);
    } else {
      socket.join(`user_${socket.data.id}`);
      console.log(`🔌 User connected: ${socket.data.name}`);
    }

    socket.on('disconnect', () => {
      console.log(`🔌 Disconnected: ${socket.data.name} (${socket.data.type})`);
    });
  });

  return io;
};

export const getIO = () => io;

// ── Helpers used by controllers ─────────────────────────────────────────────

/** Notify ALL online admins */
export const emitToAdmins = (event, data) => {
  io?.to('admins').emit(event, data);
};

/** Notify a specific user */
export const emitToUser = (userId, event, data) => {
  io?.to(`user_${userId}`).emit(event, data);
};
