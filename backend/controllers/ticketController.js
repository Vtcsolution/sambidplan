import Ticket from '../models/Ticket.js';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import AdminNotification from '../models/admin/AdminNotification.js';
import { emitToAdmins, emitToUser } from '../socket.js';
import {
  sendTicketCreatedEmail,
  sendTicketReplyEmail,
  sendTicketStatusEmail,
  sendAdminTicketUserReplyAlert,
} from '../services/emailService.js';
import { createUserNotification } from '../services/notificationService.js';

// ── helpers ───────────────────────────────────────────────────────────────────
const mapFiles = (files = []) =>
  files.map(f => ({
    originalName: f.originalname,
    mimeType:     f.mimetype,
    size:         f.size,
    data:         f.buffer.toString('base64'),
  }));

/** Fetch all active admin emails (for multi-admin notifications) */
const getAllAdminEmails = async () => {
  try {
    const admins = await Admin.find({ isActive: true }).select('email');
    const emails = admins.map(a => a.email).filter(Boolean);
    const envEmail = process.env.ADMIN_EMAIL;
    if (envEmail && !emails.includes(envEmail)) emails.push(envEmail);
    return emails;
  } catch {
    return [process.env.ADMIN_EMAIL || process.env.EMAIL_USER].filter(Boolean);
  }
};

/** Update the handlers array with the replying admin */
const recordHandler = (ticket, admin) => {
  const existing = ticket.handlers.find(h => h.adminId?.toString() === admin._id.toString());
  if (existing) {
    existing.lastReplyAt = new Date();
    existing.replyCount += 1;
  } else {
    ticket.handlers.push({
      adminId:    admin._id,
      adminName:  admin.name,
      adminRole:  admin.role,
      adminEmail: admin.email,
    });
  }
  ticket.assignedTo     = admin._id;
  ticket.assignedToName = admin.name;
  ticket.assignedToRole = admin.role;
};

// ── USER: Create ticket ───────────────────────────────────────────────────────
export const createTicket = async (req, res) => {
  try {
    const { subject, category, priority, description } = req.body;
    if (!subject || !description)
      return res.status(400).json({ success: false, message: 'Subject and description are required' });

    const user = await User.findById(req.user.id).select('name email');

    const ticket = await Ticket.create({
      user:        req.user.id,
      userName:    user.name,
      userEmail:   user.email,
      subject:     subject.trim(),
      category:    category || 'general',
      priority:    priority || 'medium',
      description: description.trim(),
      attachments: mapFiles(req.files || []),
      messages: [{
        senderType: 'user',
        senderName: user.name,
        senderId:   req.user.id,
        content:    description.trim(),
        attachments: mapFiles(req.files || []),
      }],
    });

    // ── Real-time: push to all online admins ──────────────────────────────
    emitToAdmins('ticket:new', {
      ticketId:     ticket._id,
      ticketNumber: ticket.ticketNumber,
      subject:      ticket.subject,
      userName:     ticket.userName,
      userEmail:    ticket.userEmail,
      priority:     ticket.priority,
      category:     ticket.category,
      createdAt:    ticket.createdAt,
    });

    // ── Admin bell notification ───────────────────────────────────────────
    AdminNotification.create({
      title: `🎫 New Ticket: ${ticket.ticketNumber}`,
      message: `${user.name} (${user.email}) — "${ticket.subject}"`,
      type: 'ticket_created',
      actionRequired: true,
      priority: ticket.priority === 'urgent' ? 'high' : 'medium',
      metadata: { ticketId: ticket._id, ticketNumber: ticket.ticketNumber, userId: user._id, userEmail: user.email },
    }).catch(() => {});

    // ── Email: user confirmation + all admins ─────────────────────────────
    sendTicketCreatedEmail(user, ticket, await getAllAdminEmails()).catch(() => {});

    // ── User in-app notification ──────────────────────────────────────────
    createUserNotification(req.user.id, 'ticket_created',
      `Ticket ${ticket.ticketNumber} submitted`,
      `Your request "${ticket.subject}" has been received. We'll respond shortly.`,
      '/help');

    res.status(201).json({ success: true, data: ticket, message: 'Ticket created successfully' });
  } catch (err) {
    console.error('createTicket error:', err);
    res.status(500).json({ success: false, message: 'Failed to create ticket' });
  }
};

// ── USER: Get my tickets ──────────────────────────────────────────────────────
export const getMyTickets = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = { user: req.user.id };
    if (status && status !== 'all') filter.status = status;

    const total   = await Ticket.countDocuments(filter);
    const tickets = await Ticket.find(filter)
      .select('-messages.attachments.data -attachments.data')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, data: tickets, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch tickets' });
  }
};

// ── USER: Get single ticket ───────────────────────────────────────────────────
export const getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, user: req.user.id })
      .select('-attachments.data -messages.attachments.data');
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.json({ success: true, data: ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch ticket' });
  }
};

// ── USER: Reply to ticket ─────────────────────────────────────────────────────
export const replyToTicket = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim())
      return res.status(400).json({ success: false, message: 'Reply content required' });

    const ticket = await Ticket.findOne({ _id: req.params.id, user: req.user.id });
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    if (['resolved', 'closed'].includes(ticket.status))
      return res.status(400).json({ success: false, message: 'Cannot reply to a closed/resolved ticket' });

    const user = await User.findById(req.user.id).select('name email');

    const newMsg = {
      senderType:  'user',
      senderName:  user.name,
      senderId:    req.user.id,
      content:     content.trim(),
      attachments: mapFiles(req.files || []),
      createdAt:   new Date(),
    };
    ticket.messages.push(newMsg);
    if (ticket.status === 'waiting_user') ticket.status = 'in_progress';
    await ticket.save();

    const savedMsg = ticket.messages[ticket.messages.length - 1];

    // ── Real-time: push to all online admins ──────────────────────────────
    emitToAdmins('ticket:user_reply', {
      ticketId:     ticket._id,
      ticketNumber: ticket.ticketNumber,
      subject:      ticket.subject,
      message:      { ...savedMsg.toObject(), attachments: [] },
      userName:     user.name,
      userEmail:    user.email,
    });

    // ── Admin bell notification ───────────────────────────────────────────
    AdminNotification.create({
      title: `💬 User Replied: ${ticket.ticketNumber}`,
      message: `${user.name}: "${content.trim().slice(0, 100)}${content.trim().length > 100 ? '…' : ''}"`,
      type: 'ticket_reply',
      actionRequired: true,
      priority: 'medium',
      metadata: { ticketId: ticket._id, ticketNumber: ticket.ticketNumber, userId: user._id, userEmail: user.email },
    }).catch(() => {});

    // ── Emails: all admins ────────────────────────────────────────────────
    sendAdminTicketUserReplyAlert(user, ticket, content.trim(), await getAllAdminEmails()).catch(() => {});

    res.json({ success: true, data: ticket, message: 'Reply sent' });
  } catch (err) {
    console.error('replyToTicket error:', err);
    res.status(500).json({ success: false, message: 'Failed to send reply' });
  }
};

// ── USER: Close own ticket ────────────────────────────────────────────────────
export const closeTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, user: req.user.id });
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    ticket.status   = 'closed';
    ticket.closedAt = new Date();
    await ticket.save();

    emitToAdmins('ticket:status_changed', { ticketId: ticket._id, status: 'closed' });

    res.json({ success: true, message: 'Ticket closed' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to close ticket' });
  }
};

// ── ADMIN: Get all tickets ────────────────────────────────────────────────────
export const adminGetAllTickets = async (req, res) => {
  try {
    const { status, priority, category, search, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (priority && priority !== 'all') filter.priority = priority;
    if (category && category !== 'all') filter.category = category;
    if (search) {
      const re = new RegExp(search, 'i');
      filter.$or = [{ subject: re }, { userEmail: re }, { userName: re }, { ticketNumber: re }];
    }

    const total   = await Ticket.countDocuments(filter);
    const tickets = await Ticket.find(filter)
      .select('-messages.attachments.data -attachments.data')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const counts = await Ticket.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const statusCounts = counts.reduce((acc, c) => { acc[c._id] = c.count; return acc; }, {});

    res.json({ success: true, data: tickets, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) }, statusCounts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch tickets' });
  }
};

// ── ADMIN: Get single ticket ──────────────────────────────────────────────────
export const adminGetTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .select('-attachments.data -messages.attachments.data');
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.json({ success: true, data: ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch ticket' });
  }
};

// ── ADMIN: Reply ──────────────────────────────────────────────────────────────
export const adminReplyToTicket = async (req, res) => {
  try {
    const { content, status } = req.body;
    if (!content?.trim())
      return res.status(400).json({ success: false, message: 'Reply content required' });

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    // Admin identity from middleware (req.admin = Admin doc, req.user = normalised)
    const adminDoc = req.admin || {
      _id:   req.user._id,
      name:  req.user.name || 'Support',
      role:  req.user.role || 'admin',
      email: req.user.email || '',
    };

    const newMsg = {
      senderType:  'admin',
      senderName:  adminDoc.name,
      senderRole:  adminDoc.role,
      senderId:    adminDoc._id,
      content:     content.trim(),
      attachments: mapFiles(req.files || []),
      createdAt:   new Date(),
    };
    ticket.messages.push(newMsg);

    // Record handler
    recordHandler(ticket, adminDoc);

    if (status) {
      ticket.status = status;
      if (status === 'resolved') ticket.resolvedAt = new Date();
      if (status === 'closed')   ticket.closedAt   = new Date();
    } else if (ticket.status === 'open') {
      ticket.status = 'in_progress';
    } else {
      ticket.status = 'waiting_user';
    }

    await ticket.save();

    const savedMsg = ticket.messages[ticket.messages.length - 1];

    // ── Real-time: push to the specific user ──────────────────────────────
    emitToUser(ticket.user.toString(), 'ticket:admin_reply', {
      ticketId:     ticket._id,
      ticketNumber: ticket.ticketNumber,
      subject:      ticket.subject,
      message:      { ...savedMsg.toObject(), attachments: [] },
      adminName:    adminDoc.name,
      adminRole:    adminDoc.role,
      status:       ticket.status,
    });

    // Also broadcast updated ticket to all admins (so other admins' lists refresh)
    emitToAdmins('ticket:updated', {
      ticketId:       ticket._id,
      ticketNumber:   ticket.ticketNumber,
      status:         ticket.status,
      assignedToName: ticket.assignedToName,
      assignedToRole: ticket.assignedToRole,
      lastMessage:    { senderName: adminDoc.name, content: content.trim().slice(0, 80) },
      updatedAt:      ticket.updatedAt,
    });

    // ── User email + in-app notification ──────────────────────────────────
    const userDoc = await User.findById(ticket.user).select('email name');
    if (userDoc) {
      sendTicketReplyEmail(userDoc, ticket, content.trim()).catch(() => {});
      createUserNotification(
        ticket.user,
        'ticket_reply',
        `${adminDoc.name} replied to ${ticket.ticketNumber}`,
        content.trim().slice(0, 120) + (content.trim().length > 120 ? '…' : ''),
        '/help'
      );
    }

    res.json({ success: true, data: ticket, message: 'Reply sent' });
  } catch (err) {
    console.error('adminReplyToTicket error:', err);
    res.status(500).json({ success: false, message: 'Failed to send reply' });
  }
};

// ── ADMIN: Update status ──────────────────────────────────────────────────────
export const adminUpdateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    ticket.status = status;
    if (status === 'resolved') ticket.resolvedAt = new Date();
    if (status === 'closed')   ticket.closedAt   = new Date();
    await ticket.save();

    // Real-time: notify user + all admins
    emitToUser(ticket.user.toString(), 'ticket:status_changed', {
      ticketId: ticket._id, ticketNumber: ticket.ticketNumber, status,
    });
    emitToAdmins('ticket:updated', {
      ticketId: ticket._id, ticketNumber: ticket.ticketNumber, status, updatedAt: ticket.updatedAt,
    });

    // User in-app notification + email for resolved/closed
    if (status === 'resolved' || status === 'closed') {
      const userDoc = await User.findById(ticket.user).select('email name');
      const label = status === 'resolved' ? 'resolved' : 'closed';
      createUserNotification(ticket.user, 'ticket_reply',
        `Ticket ${ticket.ticketNumber} ${label}`,
        `Your support ticket has been marked as ${label}.`,
        '/help');
      if (userDoc) {
        sendTicketStatusEmail(userDoc, ticket, status).catch(() => {});
      }
    }

    res.json({ success: true, message: `Ticket marked as ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update ticket' });
  }
};
