import Suggestion from '../models/Suggestion.js';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import AdminNotification from '../models/admin/AdminNotification.js';
import { emitToAdmins, emitToUser } from '../socket.js';
import { sendSuggestionEmail } from '../services/emailService.js';
import { createUserNotification } from '../services/notificationService.js';

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

// ── USER: Submit suggestion ───────────────────────────────────────────────────
export const createSuggestion = async (req, res) => {
  try {
    const { title, category, description } = req.body;
    if (!title || !description)
      return res.status(400).json({ success: false, message: 'Title and description are required' });

    const user = await User.findById(req.user.id).select('name email companyName');

    const suggestion = await Suggestion.create({
      user:        req.user.id,
      userName:    user.name,
      userEmail:   user.email,
      companyName: user.companyName || '',
      title:       title.trim(),
      category:    category || 'general',
      description: description.trim(),
    });

    // Real-time push to all online admins
    emitToAdmins('suggestion:new', {
      suggestionId:     suggestion._id,
      suggestionNumber: suggestion.suggestionNumber,
      title:            suggestion.title,
      category:         suggestion.category,
      userName:         suggestion.userName,
      userEmail:        suggestion.userEmail,
      companyName:      suggestion.companyName,
      createdAt:        suggestion.createdAt,
    });

    // Admin bell notification
    AdminNotification.create({
      title:   `💡 New Suggestion: ${suggestion.suggestionNumber}`,
      message: `${user.name} (${user.email}) — "${suggestion.title}"`,
      type:    'suggestion',
      actionRequired: false,
      priority: 'medium',
      actionUrl: '/admin/suggestions',
      metadata: {
        suggestionId:     suggestion._id,
        suggestionNumber: suggestion.suggestionNumber,
        userId:           user._id,
        userEmail:        user.email,
      },
    }).catch(() => {});

    // Email admin + user confirmation
    sendSuggestionEmail(user, suggestion, await getAllAdminEmails()).catch(() => {});

    // User in-app notification
    createUserNotification(
      req.user.id,
      'general',
      `Suggestion ${suggestion.suggestionNumber} submitted`,
      `Your feedback "${suggestion.title}" has been received. Thank you!`,
      '/suggestions'
    );

    res.status(201).json({ success: true, data: suggestion, message: 'Suggestion submitted successfully' });
  } catch (err) {
    console.error('createSuggestion error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit suggestion' });
  }
};

// ── USER: Get my suggestions ─────────────────────────────────────────────────
export const getMySuggestions = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const [suggestions, total] = await Promise.all([
      Suggestion.find({ user: req.user.id }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Suggestion.countDocuments({ user: req.user.id }),
    ]);

    res.json({ success: true, data: suggestions, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch suggestions' });
  }
};

// ── ADMIN: Get all suggestions ────────────────────────────────────────────────
export const adminGetSuggestions = async (req, res) => {
  try {
    const { status, category, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status)   filter.status   = status;
    if (category) filter.category = category;
    if (search)   filter.$or = [
      { title:       { $regex: search, $options: 'i' } },
      { userName:    { $regex: search, $options: 'i' } },
      { userEmail:   { $regex: search, $options: 'i' } },
      { companyName: { $regex: search, $options: 'i' } },
    ];

    const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit));
    const [suggestions, total] = await Promise.all([
      Suggestion.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Math.min(100, parseInt(limit))).lean(),
      Suggestion.countDocuments(filter),
    ]);

    // Counts per status for dashboard badges
    const counts = await Suggestion.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const statusCounts = Object.fromEntries(counts.map(c => [c._id, c.count]));

    res.json({ success: true, data: suggestions, total, statusCounts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch suggestions' });
  }
};

// ── ADMIN: Update status + optional response note ─────────────────────────────
export const adminUpdateSuggestion = async (req, res) => {
  try {
    const { status, note } = req.body;
    const suggestion = await Suggestion.findById(req.params.id);
    if (!suggestion) return res.status(404).json({ success: false, message: 'Suggestion not found' });

    const prevStatus = suggestion.status;
    if (status) suggestion.status = status;
    if (note)   {
      const actor = req.admin || req.user;
      suggestion.adminResponse = {
        adminId:     actor._id,
        adminName:   actor.name || 'Admin',
        note:        note.trim(),
        respondedAt: new Date(),
      };
    }
    await suggestion.save();

    // Notify user if status changed
    if (status && status !== prevStatus) {
      const statusLabels = {
        under_review: 'is being reviewed',
        in_progress:  'is now in progress',
        implemented:  'has been implemented! 🎉',
        declined:     'has been reviewed (declined)',
        pending:      'is pending',
      };
      createUserNotification(
        suggestion.user,
        'general',
        `Suggestion update: ${suggestion.suggestionNumber}`,
        `Your suggestion "${suggestion.title}" ${statusLabels[status] || 'was updated'}.`,
        '/suggestions'
      );

      emitToUser(suggestion.user.toString(), 'suggestion:updated', {
        suggestionId: suggestion._id,
        status,
        note: suggestion.adminResponse?.note || null,
      });
    }

    res.json({ success: true, data: suggestion, message: 'Suggestion updated' });
  } catch (err) {
    console.error('adminUpdateSuggestion error:', err);
    res.status(500).json({ success: false, message: 'Failed to update suggestion' });
  }
};

// ── ADMIN: Delete suggestion ──────────────────────────────────────────────────
export const adminDeleteSuggestion = async (req, res) => {
  try {
    await Suggestion.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Suggestion deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete suggestion' });
  }
};
