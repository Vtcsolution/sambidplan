import Company from '../models/Company.js';
import CompanyDocument from '../models/CompanyDocument.js';
import User from '../models/User.js';

// ── Stats ─────────────────────────────────────────────────────────────────────

export const getWorkspaceStats = async (req, res) => {
  try {
    const [totalCompanies, verifiedCount, totalDocs] = await Promise.all([
      Company.countDocuments(),
      Company.countDocuments({ ueiVerified: true }),
      CompanyDocument.countDocuments(),
    ]);

    const agg = await Company.aggregate([
      {
        $project: {
          memberCount: { $size: { $filter: { input: '$members', as: 'm', cond: { $eq: ['$$m.inviteStatus', 'accepted'] } } } },
          wsUserCount: { $size: { $ifNull: ['$workspaceUsers', []] } },
        },
      },
      { $group: { _id: null, totalMembers: { $sum: '$memberCount' }, totalWsUsers: { $sum: '$wsUserCount' } } },
    ]);
    const totalMembers  = agg[0]?.totalMembers  || 0;
    const totalWsUsers  = agg[0]?.totalWsUsers  || 0;

    res.json({
      success: true,
      data: { totalCompanies, verifiedCount, totalMembers, totalDocs, totalWsUsers },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── List All Companies ────────────────────────────────────────────────────────

export const listAllCompanies = async (req, res) => {
  try {
    const { search, verified, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (search)   filter.$or = [{ name: { $regex: search, $options: 'i' } }, { uei: { $regex: search, $options: 'i' } }];
    if (verified === 'true')  filter.ueiVerified = true;
    if (verified === 'false') filter.ueiVerified = false;

    const skip = (Number(page) - 1) * Number(limit);
    const [companies, total] = await Promise.all([
      Company.find(filter)
        .populate('owner', 'name email plan')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Company.countDocuments(filter),
    ]);

    // Attach doc counts
    const ids = companies.map(c => c._id);
    const docCounts = await CompanyDocument.aggregate([
      { $match: { company: { $in: ids } } },
      { $group: { _id: '$company', count: { $sum: 1 } } },
    ]);
    const docMap = Object.fromEntries(docCounts.map(d => [d._id.toString(), d.count]));

    const enriched = companies.map(c => ({
      ...c,
      memberCount:      (c.members || []).filter(m => m.inviteStatus === 'accepted').length,
      pendingInvites:   (c.members || []).filter(m => m.inviteStatus === 'pending').length,
      workspaceUserCount: (c.workspaceUsers || []).length,
      docCount:         docMap[c._id.toString()] || 0,
    }));

    res.json({ success: true, data: enriched, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get One Company ───────────────────────────────────────────────────────────

export const getCompanyById = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id)
      .populate('owner', 'name email plan createdAt')
      .populate('members.user', 'name email plan');

    if (!company) return res.status(404).json({ success: false, message: 'Company not found.' });

    const docs = await CompanyDocument.find({ company: company._id })
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    // Strip passwordHash before sending to admin — never expose it
    const companyObj = company.toObject();
    companyObj.workspaceUsers = (companyObj.workspaceUsers || []).map(
      ({ passwordHash: _ph, ...wu }) => wu
    );

    res.json({ success: true, data: companyObj, docs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Manual UEI Verification ───────────────────────────────────────────────────

export const adminVerifyUEI = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found.' });

    company.ueiVerified   = true;
    company.ueiVerifiedAt = new Date();
    if (!company.ueiData) company.ueiData = {};
    company.ueiData.legalBusinessName = company.name;
    await company.save();

    res.json({ success: true, message: 'UEI manually verified.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const adminUnverifyUEI = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found.' });
    company.ueiVerified   = false;
    company.ueiVerifiedAt = undefined;
    await company.save();
    res.json({ success: true, message: 'UEI verification removed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Delete Company ────────────────────────────────────────────────────────────

export const deleteCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found.' });

    // Also delete all documents
    await CompanyDocument.deleteMany({ company: company._id });
    await company.deleteOne();

    res.json({ success: true, message: 'Company workspace and all documents deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Remove Member (admin action) ──────────────────────────────────────────────

export const adminRemoveMember = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found.' });
    company.members.pull({ _id: req.params.memberId });
    await company.save();
    res.json({ success: true, message: 'Member removed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
