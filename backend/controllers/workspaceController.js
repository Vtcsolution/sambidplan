import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Company, { WORKSPACE_PAGE_KEYS } from '../models/Company.js';

const workspaceSecret = () => crypto.createHmac('sha256', process.env.JWT_SECRET).update('workspace').digest('hex');

// ── Owner: create a workspace user ───────────────────────────────────────────
export const createWorkspaceUser = async (req, res) => {
  try {
    const { username, password, displayName, allowedPages = [] } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'Username and password are required.' });
    if (password.length < 8 || password.length > 128) return res.status(400).json({ success: false, message: 'Password must be 8-128 characters.' });

    const company = await Company.findOne({ owner: req.user._id });
    if (!company) return res.status(404).json({ success: false, message: 'Company not found.' });

    const duplicate = company.workspaceUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (duplicate) return res.status(400).json({ success: false, message: 'Username already exists in this workspace.' });

    const validPages = allowedPages.filter(p => WORKSPACE_PAGE_KEYS.includes(p));
    const passwordHash = await bcrypt.hash(password, 10);

    company.workspaceUsers.push({ username: username.trim(), passwordHash, displayName: displayName || username, allowedPages: validPages });
    await company.save();

    const created = company.workspaceUsers[company.workspaceUsers.length - 1];
    res.status(201).json({ success: true, data: { _id: created._id, username: created.username, displayName: created.displayName, allowedPages: created.allowedPages, isActive: created.isActive } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Owner: list workspace users ───────────────────────────────────────────────
export const listWorkspaceUsers = async (req, res) => {
  try {
    const company = await Company.findOne({ owner: req.user._id }).select('workspaceUsers name _id');
    if (!company) return res.status(404).json({ success: false, message: 'Company not found.' });

    const users = company.workspaceUsers.map(u => ({
      _id: u._id, username: u.username, displayName: u.displayName,
      allowedPages: u.allowedPages, isActive: u.isActive, createdAt: u.createdAt,
    }));
    res.json({ success: true, data: users, companyId: company._id, companyName: company.name });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Owner: update workspace user (pages / display name / password) ────────────
export const updateWorkspaceUser = async (req, res) => {
  try {
    const { workspaceUserId } = req.params;
    const { allowedPages, displayName, password, isActive } = req.body;

    const company = await Company.findOne({ owner: req.user._id });
    if (!company) return res.status(404).json({ success: false, message: 'Company not found.' });

    const wu = company.workspaceUsers.id(workspaceUserId);
    if (!wu) return res.status(404).json({ success: false, message: 'Workspace user not found.' });

    if (allowedPages !== undefined) wu.allowedPages = allowedPages.filter(p => WORKSPACE_PAGE_KEYS.includes(p));
    if (displayName !== undefined) wu.displayName = displayName;
    if (isActive !== undefined) wu.isActive = isActive;
    if (password) {
      if (password.length < 8 || password.length > 128) return res.status(400).json({ success: false, message: 'Password must be 8-128 characters.' });
      wu.passwordHash = await bcrypt.hash(password, 10);
    }

    await company.save();
    res.json({ success: true, data: { _id: wu._id, username: wu.username, displayName: wu.displayName, allowedPages: wu.allowedPages, isActive: wu.isActive } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Owner: delete workspace user ──────────────────────────────────────────────
export const deleteWorkspaceUser = async (req, res) => {
  try {
    const company = await Company.findOne({ owner: req.user._id });
    if (!company) return res.status(404).json({ success: false, message: 'Company not found.' });

    const wu = company.workspaceUsers.id(req.params.workspaceUserId);
    if (!wu) return res.status(404).json({ success: false, message: 'Workspace user not found.' });

    wu.deleteOne();
    await company.save();
    res.json({ success: true, message: 'Workspace user removed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Public: workspace login ───────────────────────────────────────────────────
export const workspaceLogin = async (req, res) => {
  try {
    const { companyId, username, password } = req.body;
    if (!companyId || !username || !password)
      return res.status(400).json({ success: false, message: 'Company ID, username, and password are required.' });

    const company = await Company.findById(companyId)
      .select('workspaceUsers name owner');
    if (!company) return res.status(404).json({ success: false, message: 'Company not found.' });

    const wu = company.workspaceUsers.find(u => u.username.toLowerCase() === username.toLowerCase() && u.isActive);
    if (!wu) return res.status(401).json({ success: false, message: 'Invalid username or password.' });

    const match = await bcrypt.compare(password, wu.passwordHash);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid username or password.' });

    const token = jwt.sign(
      { workspaceUserId: wu._id, companyId: company._id, ownerId: company.owner, allowedPages: wu.allowedPages, displayName: wu.displayName, username: wu.username },
      workspaceSecret(),
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      data: {
        workspaceUserId: wu._id,
        username: wu.username,
        displayName: wu.displayName,
        companyId: company._id,
        companyName: company.name,
        allowedPages: wu.allowedPages,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Middleware: verify workspace JWT ─────────────────────────────────────────
export const requireWorkspaceAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'No workspace token.' });
  try {
    req.workspace = jwt.verify(header.slice(7), workspaceSecret());
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired workspace token.' });
  }
};
