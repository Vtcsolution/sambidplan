import CreditUsageLog from '../models/CreditUsageLog.js';
import User from '../models/User.js';
import { FEATURE_LABELS, FEATURE_COSTS } from '../config/aiCredits.js';
import { transporter, FROM } from '../services/emailService.js';

export const getCreditUsageLogs = async (req, res) => {
  try {
    const {
      userId, businessName, feature, dateFrom, dateTo,
      page = 1, limit = 50, sort = '-createdAt',
    } = req.query;

    const filter = {};
    if (userId) filter.user = userId;
    if (businessName) filter.businessName = { $regex: businessName, $options: 'i' };
    if (feature) filter.feature = feature;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = to;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      CreditUsageLog.find(filter).sort(sort).skip(skip).limit(Number(limit)).lean(),
      CreditUsageLog.countDocuments(filter),
    ]);

    res.json({ success: true, data: logs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCreditUsageSummary = async (req, res) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const m = Number(month ?? now.getMonth());
    const y = Number(year ?? now.getFullYear());
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 1);

    const [byUser, byFeature, totalAgg] = await Promise.all([
      CreditUsageLog.aggregate([
        { $match: { createdAt: { $gte: start, $lt: end } } },
        { $group: {
          _id: '$user',
          userName: { $first: '$userName' },
          userEmail: { $first: '$userEmail' },
          businessName: { $first: '$businessName' },
          plan: { $first: '$plan' },
          totalCredits: { $sum: '$creditsUsed' },
          totalCalls: { $sum: 1 },
        }},
        { $sort: { totalCredits: -1 } },
      ]),
      CreditUsageLog.aggregate([
        { $match: { createdAt: { $gte: start, $lt: end } } },
        { $group: {
          _id: '$feature',
          featureLabel: { $first: '$featureLabel' },
          totalCredits: { $sum: '$creditsUsed' },
          totalCalls: { $sum: 1 },
        }},
        { $sort: { totalCredits: -1 } },
      ]),
      CreditUsageLog.aggregate([
        { $match: { createdAt: { $gte: start, $lt: end } } },
        { $group: { _id: null, totalCredits: { $sum: '$creditsUsed' }, totalCalls: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        month: m, year: y,
        monthLabel: start.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
        totalCredits: totalAgg[0]?.totalCredits || 0,
        totalCalls: totalAgg[0]?.totalCalls || 0,
        byUser,
        byFeature,
        featureLabels: FEATURE_LABELS,
        featureCosts: FEATURE_COSTS,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getUserCreditHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { dateFrom, dateTo, page = 1, limit = 50 } = req.query;

    const filter = { user: userId };
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = to;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total, summary] = await Promise.all([
      CreditUsageLog.find(filter).sort('-createdAt').skip(skip).limit(Number(limit)).lean(),
      CreditUsageLog.countDocuments(filter),
      CreditUsageLog.aggregate([
        { $match: filter },
        { $group: {
          _id: '$feature',
          featureLabel: { $first: '$featureLabel' },
          totalCredits: { $sum: '$creditsUsed' },
          totalCalls: { $sum: 1 },
        }},
        { $sort: { totalCredits: -1 } },
      ]),
    ]);

    const user = await User.findById(userId).select('name email businessName plan monthlyAIGenerationsUsed bonusAICredits').lean();

    res.json({
      success: true,
      data: { logs, total, pages: Math.ceil(total / Number(limit)), summary, user },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const sendCreditReport = async (req, res) => {
  try {
    const { userId, month, year } = req.body;
    const user = await User.findById(userId).select('name email businessName plan').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const now = new Date();
    const m = Number(month ?? now.getMonth());
    const y = Number(year ?? now.getFullYear());
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 1);
    const monthLabel = start.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    const logs = await CreditUsageLog.find({
      user: userId,
      createdAt: { $gte: start, $lt: end },
    }).sort('createdAt').lean();

    const totalCredits = logs.reduce((s, l) => s + l.creditsUsed, 0);

    let tableRows = '';
    logs.forEach((log, i) => {
      const date = new Date(log.createdAt);
      tableRows += `<tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:8px 12px;font-size:13px;color:#6b7280;">${i + 1}</td>
        <td style="padding:8px 12px;font-size:13px;">${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
        <td style="padding:8px 12px;font-size:13px;color:#6b7280;">${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
        <td style="padding:8px 12px;font-size:13px;font-weight:600;">${log.featureLabel}</td>
        <td style="padding:8px 12px;font-size:13px;">${log.model}</td>
        <td style="padding:8px 12px;font-size:13px;">${log.opportunityTitle || '—'}</td>
        <td style="padding:8px 12px;font-size:13px;font-weight:700;color:#4f46e5;text-align:center;">${log.creditsUsed}</td>
      </tr>`;
    });

    const html = `
      <div style="max-width:700px;margin:0 auto;font-family:Arial,sans-serif;">
        <div style="background:linear-gradient(135deg,#4f46e5,#3730a3);padding:24px 30px;border-radius:12px 12px 0 0;">
          <h1 style="color:#fff;font-size:20px;margin:0;">AI Credits Usage Report</h1>
          <p style="color:#c7d2fe;font-size:14px;margin:6px 0 0;">${monthLabel}</p>
        </div>
        <div style="background:#fff;padding:24px 30px;border:1px solid #e5e7eb;border-top:none;">
          <div style="display:flex;gap:20px;margin-bottom:20px;">
            <div style="flex:1;background:#f0f0ff;padding:14px;border-radius:8px;">
              <p style="font-size:12px;color:#6b7280;margin:0;">Company</p>
              <p style="font-size:16px;font-weight:700;margin:4px 0 0;">${user.businessName || user.name}</p>
            </div>
            <div style="flex:1;background:#f0fdf4;padding:14px;border-radius:8px;">
              <p style="font-size:12px;color:#6b7280;margin:0;">Total Credits Used</p>
              <p style="font-size:24px;font-weight:700;color:#4f46e5;margin:4px 0 0;">${totalCredits}</p>
            </div>
            <div style="flex:1;background:#fffbeb;padding:14px;border-radius:8px;">
              <p style="font-size:12px;color:#6b7280;margin:0;">Total AI Calls</p>
              <p style="font-size:24px;font-weight:700;color:#d97706;margin:4px 0 0;">${logs.length}</p>
            </div>
          </div>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;">#</th>
                <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;">Date</th>
                <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;">Time</th>
                <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;">Feature</th>
                <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;">Model</th>
                <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;">Opportunity</th>
                <th style="padding:10px 12px;text-align:center;font-size:11px;color:#6b7280;text-transform:uppercase;">Credits</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
            <tfoot>
              <tr style="background:#f0f0ff;">
                <td colspan="6" style="padding:10px 12px;font-weight:700;font-size:13px;">Total</td>
                <td style="padding:10px 12px;font-weight:700;font-size:16px;color:#4f46e5;text-align:center;">${totalCredits}</td>
              </tr>
            </tfoot>
          </table>
          <p style="font-size:11px;color:#9ca3af;margin-top:16px;text-align:center;">Generated by SamBid · ${new Date().toLocaleDateString()}</p>
        </div>
      </div>`;

    await transporter.sendMail({
      from: FROM.noreply(),
      to: user.email,
      subject: `AI Credits Usage Report — ${monthLabel}`,
      html,
    });

    res.json({ success: true, message: `Report sent to ${user.email}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
