import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import axios from 'axios';
import Company from '../models/Company.js';
import CompanyDocument from '../models/CompanyDocument.js';
import User from '../models/User.js';
import emailService from '../utils/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMyCompany(userId) {
  return Company.findOne({
    $or: [
      { owner: userId },
      { members: { $elemMatch: { user: userId, inviteStatus: 'accepted' } } },
    ],
  });
}

// ── Company CRUD ──────────────────────────────────────────────────────────────

export const createCompany = async (req, res) => {
  try {
    const existing = await getMyCompany(req.user._id);
    if (existing) return res.status(400).json({ success: false, message: 'You already belong to a company workspace.' });

    const { name, uei, cage, website, phone, address, naicsCodes, certifications, capabilities } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Company name is required.' });

    const company = await Company.create({
      name: name.trim(),
      uei:  (uei || '').trim().toUpperCase(),
      cage: (cage || '').trim().toUpperCase(),
      website, phone, address,
      naicsCodes:     naicsCodes || [],
      certifications: certifications || [],
      capabilities:   capabilities || '',
      owner:   req.user._id,
      members: [],
    });

    res.status(201).json({ success: true, data: company });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMyCompanyProfile = async (req, res) => {
  try {
    const company = await getMyCompany(req.user._id);
    if (!company) return res.status(404).json({ success: false, message: 'No company workspace found. Create one to get started.' });

    // populate member user info
    await company.populate('members.user', 'name email');
    await company.populate('owner', 'name email');

    const role = company.owner._id.toString() === req.user._id.toString()
      ? 'owner'
      : company.members.find(m => m.user._id.toString() === req.user._id.toString())?.role || 'member';

    res.json({ success: true, data: company, myRole: role });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateCompany = async (req, res) => {
  try {
    const company = req.company;
    if (!['owner','admin'].includes(req.companyRole)) {
      return res.status(403).json({ success: false, message: 'Only owners and admins can update company details.' });
    }
    const { name, uei, cage, website, phone, address, naicsCodes, certifications, capabilities } = req.body;
    if (name !== undefined) company.name = name.trim();
    if (uei  !== undefined) { company.uei = uei.trim().toUpperCase(); company.ueiVerified = false; }
    if (cage !== undefined) company.cage = cage.trim().toUpperCase();
    if (website      !== undefined) company.website      = website;
    if (phone        !== undefined) company.phone        = phone;
    if (address      !== undefined) company.address      = address;
    if (naicsCodes   !== undefined) company.naicsCodes   = naicsCodes;
    if (certifications !== undefined) company.certifications = certifications;
    if (capabilities !== undefined) company.capabilities = capabilities;

    await company.save();
    res.json({ success: true, data: company });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── UEI Verification ──────────────────────────────────────────────────────────

export const verifyUEI = async (req, res) => {
  try {
    const company = req.company;
    if (!['owner','admin'].includes(req.companyRole)) {
      return res.status(403).json({ success: false, message: 'Only owners and admins can verify UEI.' });
    }
    const uei = (req.body.uei || company.uei || '').trim().toUpperCase();
    if (!uei) return res.status(400).json({ success: false, message: 'UEI is required.' });
    if (!/^[A-Z0-9]{12}$/.test(uei)) {
      return res.status(400).json({ success: false, message: 'UEI must be exactly 12 alphanumeric characters.' });
    }

    const apiKey = process.env.SAM_GOV_API_KEY;
    if (!apiKey) {
      // Format validation only — no SAM.gov call
      company.uei          = uei;
      company.ueiVerified  = false;
      company.ueiData      = {};
      await company.save();
      return res.json({
        success: true,
        verified: false,
        message: 'UEI format is valid. Add a SAM_GOV_API_KEY to enable live SAM.gov verification.',
        uei,
      });
    }

    // Live SAM.gov verification
    const samRes = await axios.get('https://api.sam.gov/entity-information/v3/entities', {
      params: { api_key: apiKey, ueiSAM: uei },
      timeout: 10000,
    });
    const entities = samRes.data?.entityData;
    if (!entities?.length) {
      return res.status(404).json({ success: false, message: 'UEI not found in SAM.gov. Ensure the entity is active and registered.' });
    }
    const entity = entities[0];
    const reg    = entity.entityRegistration || {};
    const addr   = entity.coreData?.physicalAddress || {};

    company.uei         = uei;
    company.ueiVerified = true;
    company.ueiVerifiedAt = new Date();
    company.ueiData     = {
      legalBusinessName:    reg.legalBusinessName || '',
      physicalAddress:      `${addr.addressLine1 || ''} ${addr.city || ''} ${addr.stateOrProvinceCode || ''} ${addr.zipCode || ''}`.trim(),
      entityType:           reg.entityType || '',
      registrationStatus:   reg.registrationStatus || '',
      expirationDate:       reg.registrationExpirationDate || '',
      purposeOfRegistration:reg.purposeOfRegistration || '',
    };
    if (!company.name) company.name = reg.legalBusinessName || company.name;
    await company.save();

    res.json({ success: true, verified: true, ueiData: company.ueiData, message: 'UEI verified successfully with SAM.gov.' });
  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(404).json({ success: false, message: 'UEI not found in SAM.gov.' });
    }
    res.status(500).json({ success: false, message: 'UEI verification failed. Try again later.' });
  }
};

// ── Team Members ──────────────────────────────────────────────────────────────

const PLAN_MEMBER_LIMITS = { free: 0, starter: 3, pro: 10, enterprise: Infinity };

export const inviteMember = async (req, res) => {
  try {
    const company = req.company;
    if (!['owner','admin'].includes(req.companyRole)) {
      return res.status(403).json({ success: false, message: 'Only owners and admins can invite members.' });
    }
    const { email, role = 'member' } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

    const VALID_ROLES = ['admin','capture_manager','proposal_writer','reviewer','member'];
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }

    // Enforce plan-based member limit (check owner's plan)
    const owner = await User.findById(company.owner).select('plan');
    const ownerPlan = owner?.plan || 'free';
    const memberLimit = PLAN_MEMBER_LIMITS[ownerPlan] ?? 0;
    const activeCount = company.members.filter(m => m.inviteStatus === 'accepted').length;
    if (activeCount >= memberLimit) {
      const limitLabel = memberLimit === Infinity ? 'unlimited' : memberLimit;
      return res.status(403).json({
        success: false,
        message: `Your ${ownerPlan} plan allows up to ${limitLabel} team members. Upgrade your plan to add more.`,
      });
    }

    // Check if already invited / member
    const alreadyMember = company.members.some(m => m.inviteEmail === email.toLowerCase());
    if (alreadyMember) return res.status(400).json({ success: false, message: 'This email has already been invited.' });

    // Check if user exists
    const invitedUser = await User.findOne({ email: email.toLowerCase() });
    const token = crypto.randomBytes(24).toString('hex');

    company.members.push({
      user:         invitedUser?._id || new (await import('mongoose')).default.Types.ObjectId(),
      role,
      inviteStatus: 'pending',
      inviteToken:  token,
      inviteEmail:  email.toLowerCase(),
      invitedBy:    req.user._id,
      joinedAt:     new Date(),
    });
    await company.save();

    const frontendOrigin = req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5173';
    const joinUrl = `${frontendOrigin}/company/join?token=${token}`;

    // Send invite email (non-blocking — don't fail if email fails)
    emailService.sendTeamInvite({
      toEmail:       email.toLowerCase(),
      invitedByName: req.user.name || 'A team member',
      companyName:   company.name,
      role,
      joinUrl,
    }).catch(() => {});

    res.json({
      success: true,
      message: `Invite sent${invitedUser ? '' : ' (user must sign up first)'}.`,
      joinUrl,
      token,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Public preview — no auth required; lets join page show company/role before login
export const previewInvite = async (req, res) => {
  try {
    const { token } = req.params;
    const company = await Company.findOne({ 'members.inviteToken': token }).populate('owner', 'name');
    if (!company) return res.status(404).json({ success: false, message: 'Invalid or expired invite link.' });

    const member = company.members.find(m => m.inviteToken === token);
    if (!member) return res.status(404).json({ success: false, message: 'Invite not found.' });
    if (member.inviteStatus === 'accepted') {
      return res.status(400).json({ success: false, message: 'This invitation has already been accepted.' });
    }

    res.json({
      success: true,
      data: {
        companyName:  company.name,
        role:         member.role,
        inviteEmail:  member.inviteEmail,
        invitedBy:    company.owner?.name || 'a team member',
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const acceptInvite = async (req, res) => {
  try {
    const { token } = req.params;
    const company = await Company.findOne({ 'members.inviteToken': token });
    if (!company) return res.status(404).json({ success: false, message: 'Invalid or expired invite link.' });

    const memberIdx = company.members.findIndex(m => m.inviteToken === token);
    if (memberIdx === -1) return res.status(404).json({ success: false, message: 'Invite not found.' });

    const m = company.members[memberIdx];
    if (m.inviteStatus === 'accepted') return res.json({ success: true, message: 'Already a member.', data: company });

    m.user         = req.user._id;
    m.inviteStatus = 'accepted';
    m.inviteEmail  = req.user.email;
    m.joinedAt     = new Date();
    company.members[memberIdx] = m;
    await company.save();

    res.json({ success: true, message: `You have joined ${company.name}!`, companyName: company.name });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateMemberRole = async (req, res) => {
  try {
    const company = req.company;
    if (!['owner','admin'].includes(req.companyRole)) {
      return res.status(403).json({ success: false, message: 'Only owners and admins can change roles.' });
    }
    const { memberId } = req.params;
    const { role } = req.body;
    const VALID_ROLES = ['admin','capture_manager','proposal_writer','reviewer','member'];
    if (!VALID_ROLES.includes(role)) return res.status(400).json({ success: false, message: 'Invalid role.' });

    const m = company.members.id(memberId);
    if (!m) return res.status(404).json({ success: false, message: 'Member not found.' });
    m.role = role;
    await company.save();

    res.json({ success: true, message: 'Role updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const removeMember = async (req, res) => {
  try {
    const company = req.company;
    if (!['owner','admin'].includes(req.companyRole)) {
      return res.status(403).json({ success: false, message: 'Only owners and admins can remove members.' });
    }
    const { memberId } = req.params;
    company.members.pull({ _id: memberId });
    await company.save();
    res.json({ success: true, message: 'Member removed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const leaveCompany = async (req, res) => {
  try {
    const company = await getMyCompany(req.user._id);
    if (!company) return res.status(404).json({ success: false, message: 'No company found.' });
    if (company.owner.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Owners cannot leave. Transfer ownership or delete the company.' });
    }
    company.members.pull({ user: req.user._id });
    await company.save();
    res.json({ success: true, message: 'You have left the company workspace.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Documents ─────────────────────────────────────────────────────────────────

export const listDocuments = async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = { company: req.company._id };
    if (category && category !== 'all') filter.category = category;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const docs = await CompanyDocument.find(filter)
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: docs, count: docs.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

    const { name, description, category = 'other', tags } = req.body;
    const BASE_URL = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 8000}`;

    const doc = await CompanyDocument.create({
      company:      req.company._id,
      name:         (name || req.file.originalname).trim(),
      description:  description || '',
      category,
      tags:         tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [],
      filename:     req.file.filename,
      originalName: req.file.originalname,
      url:          `/uploads/documents/${req.file.filename}`,
      size:         req.file.size,
      mimeType:     req.file.mimetype,
      uploadedBy:   req.user._id,
    });

    await doc.populate('uploadedBy', 'name email');
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    if (req.file) {
      const filePath = join(__dirname, '../uploads/documents', req.file.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const doc = await CompanyDocument.findOne({ _id: req.params.id, company: req.company._id });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found.' });

    const canDelete = req.companyRole === 'owner' || req.companyRole === 'admin'
      || doc.uploadedBy.toString() === req.user._id.toString();
    if (!canDelete) return res.status(403).json({ success: false, message: 'You can only delete documents you uploaded.' });

    const filePath = join(__dirname, '../uploads/documents', doc.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await doc.deleteOne();

    res.json({ success: true, message: 'Document deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const addComment = async (req, res) => {
  try {
    const doc = await CompanyDocument.findOne({ _id: req.params.id, company: req.company._id });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found.' });

    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ success: false, message: 'Comment text is required.' });

    doc.comments.push({ user: req.user._id, text: text.trim() });
    await doc.save();
    await doc.populate('comments.user', 'name email');

    const latest = doc.comments[doc.comments.length - 1];
    res.json({ success: true, data: latest });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const downloadDocument = async (req, res) => {
  try {
    const doc = await CompanyDocument.findOne({ _id: req.params.id, company: req.company._id });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found.' });

    doc.downloadCount += 1;
    await doc.save();

    const filePath = join(__dirname, '../uploads/documents', doc.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: 'File not found on disk.' });

    res.download(filePath, doc.originalName);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/company/ai-readiness
// Returns profile completeness for AI analysis quality indicator
export const getAIReadiness = async (req, res) => {
  try {
    const user = req.user;
    const company = await getMyCompany(user._id).lean().catch(() => null);

    const items = [
      {
        key: 'businessName',
        label: 'Business Name',
        description: 'Your legal business name as registered in SAM.gov',
        complete: !!(user.businessName && user.businessName.trim().length > 2),
        required: true,
        link: '/profile',
      },
      {
        key: 'naicsCodes',
        label: 'NAICS Codes',
        description: 'Your business classification codes for matching opportunities',
        complete: !!(user.naicsCodes && user.naicsCodes.length > 0),
        required: true,
        link: '/profile',
      },
      {
        key: 'companyWorkspace',
        label: 'Company Workspace',
        description: 'Create a company workspace to store your full profile',
        complete: !!company,
        required: false,
        link: '/company/profile',
      },
      {
        key: 'uei',
        label: 'UEI Number',
        description: 'Your Unique Entity Identifier from SAM.gov',
        complete: !!(company?.uei),
        required: false,
        link: '/company/profile',
      },
      {
        key: 'ueiVerified',
        label: 'SAM.gov Verified',
        description: 'Verify your UEI to pull official SAM.gov registration data',
        complete: !!(company?.ueiVerified),
        required: false,
        link: '/company/profile',
      },
      {
        key: 'certifications',
        label: 'Certifications',
        description: 'Federal certifications: 8(a), WOSB, HUBZone, SDVOSB, etc.',
        complete: !!(company?.certifications && company.certifications.length > 0),
        required: false,
        link: '/company/profile',
      },
      {
        key: 'capabilities',
        label: 'Core Capabilities',
        description: 'Description of what your company does and your expertise areas',
        complete: !!(company?.capabilities && company.capabilities.trim().length > 50),
        required: false,
        link: '/company/profile',
      },
    ];

    const totalComplete = items.filter(i => i.complete).length;
    const score = Math.round((totalComplete / items.length) * 100);

    res.json({ success: true, data: { score, totalComplete, totalItems: items.length, items } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
