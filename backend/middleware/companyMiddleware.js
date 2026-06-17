import Company from '../models/Company.js';

export const requireCompany = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const company = await Company.findOne({
      $or: [
        { owner: userId },
        { members: { $elemMatch: { user: userId, inviteStatus: 'accepted' } } },
      ],
    });
    if (!company) {
      return res.status(403).json({ success: false, message: 'You are not a member of any company workspace.' });
    }
    req.company = company;
    if (company.owner.toString() === userId.toString()) {
      req.companyRole = 'owner';
    } else {
      const m = company.members.find(m => m.user.toString() === userId.toString());
      req.companyRole = m?.role || 'member';
    }
    next();
  } catch {
    res.status(500).json({ success: false, message: 'Company lookup failed.' });
  }
};

export const requireCompanyRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.companyRole)) {
    return res.status(403).json({ success: false, message: `Requires ${roles.join(' or ')} role.` });
  }
  next();
};
