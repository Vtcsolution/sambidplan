import ManagedService     from '../models/ManagedService.js';
import ManagedBid         from '../models/ManagedBid.js';
import ManagedProject     from '../models/ManagedProject.js';
import CommissionInvoice  from '../models/CommissionInvoice.js';
import UserNotification   from '../models/UserNotification.js';
import User               from '../models/User.js';
import Company            from '../models/Company.js';
import Opportunity        from '../models/Opportunity.js';
import { transporter, FROM, sendProjectCreatedEmail } from '../services/emailService.js';

// ── Helpers (also reused by managedProjectController.js for milestone billing) ─
export function calcCommission(ms, wonValue) {
  let rate = ms.defaultRate;
  if (ms.useTiers && ms.tiers?.length) {
    const tier = ms.tiers.find(t => wonValue >= t.minValue && (t.maxValue == null || wonValue <= t.maxValue));
    if (tier) rate = tier.rate;
  }
  const raw    = (wonValue * rate) / 100;
  const amount = ms.commissionCap ? Math.min(raw, ms.commissionCap) : raw;
  return { rate, amount };
}

export function fmt(n) { return `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

async function notify(userId, type, title, message, link = '/company/managed-service') {
  try {
    await UserNotification.create({ user: userId, type, title, message, link });
  } catch {}
}

export async function sendCommissionEmail(owner, invoice, bid) {
  try {
    await transporter.sendMail({
      from:    FROM.billing(),
      to:      owner.email,
      subject: `Commission Invoice ${invoice.invoiceNumber} — ${fmt(invoice.amount)}`,
      html: `
        <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;color:#1f2937;">
          <div style="background:#4f46e5;padding:32px;border-radius:16px 16px 0 0;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:22px;">🏆 Contract Won!</h1>
            <p style="color:#c7d2fe;margin:8px 0 0;">Commission Invoice Generated</p>
          </div>
          <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:32px;border-radius:0 0 16px 16px;">
            <p style="color:#374151;">Hi <strong>${owner.name}</strong>,</p>
            <p style="color:#374151;">Congratulations! Our team successfully won a contract on your behalf. A commission invoice has been generated.</p>
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:20px 0;">
              <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:8px 0;color:#6b7280;width:45%;">Invoice #</td><td style="padding:8px 0;font-weight:700;color:#1f2937;font-family:monospace;">${invoice.invoiceNumber}</td></tr>
                <tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:8px 0;color:#6b7280;">Contract</td><td style="padding:8px 0;font-weight:600;color:#1f2937;">${bid?.contractTitle || '—'}</td></tr>
                <tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:8px 0;color:#6b7280;">Contract Value</td><td style="padding:8px 0;font-weight:600;color:#059669;">${fmt(invoice.contractValue)}</td></tr>
                <tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:8px 0;color:#6b7280;">Commission Rate</td><td style="padding:8px 0;font-weight:600;">${invoice.commissionRate}%</td></tr>
                <tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:8px 0;color:#6b7280;">Commission Due</td><td style="padding:8px 0;font-weight:700;color:#4f46e5;font-size:18px;">${fmt(invoice.amount)}</td></tr>
                <tr><td style="padding:8px 0;color:#6b7280;">Due Date</td><td style="padding:8px 0;font-weight:600;">${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '30 days'}</td></tr>
              </table>
            </div>
            <p style="color:#6b7280;font-size:13px;">Please arrange payment by the due date. Our team will reach out with payment details.</p>
            <a href="${process.env.FRONTEND_URL || 'https://sambid.co'}/company/managed-service" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;margin-top:8px;">View Invoice</a>
          </div>
        </div>`,
    });
  } catch (e) {
    console.error('Commission email error:', e.message);
  }
}

export async function sendMonthlyFeeEmail(owner, invoice) {
  try {
    await transporter.sendMail({
      from:    FROM.billing(),
      to:      owner.email,
      subject: `Monthly Service Invoice ${invoice.invoiceNumber} — ${fmt(invoice.amount)}`,
      html: `
        <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;color:#1f2937;">
          <div style="background:#4f46e5;padding:28px;border-radius:16px 16px 0 0;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:20px;">Monthly Service Invoice</h1>
          </div>
          <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:28px;border-radius:0 0 16px 16px;">
            <p style="color:#374151;">Hi <strong>${owner.name}</strong>,</p>
            <p style="color:#374151;">Your monthly managed service fee invoice is ready.</p>
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:20px 0;">
              <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:8px 0;color:#6b7280;width:45%;">Invoice #</td><td style="padding:8px 0;font-weight:700;font-family:monospace;">${invoice.invoiceNumber}</td></tr>
                <tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:8px 0;color:#6b7280;">Type</td><td style="padding:8px 0;font-weight:600;">Monthly Retainer</td></tr>
                <tr><td style="padding:8px 0;color:#6b7280;">Amount Due</td><td style="padding:8px 0;font-weight:700;color:#4f46e5;font-size:18px;">${fmt(invoice.amount)}</td></tr>
              </table>
            </div>
            <a href="${process.env.FRONTEND_URL || 'https://sambid.co'}/company/managed-service" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;">View Invoice</a>
          </div>
        </div>`,
    });
  } catch (e) {
    console.error('Monthly fee email error:', e.message);
  }
}

// ── Stats ─────────────────────────────────────────────────────────────────────
export const getManagedStats = async (req, res) => {
  try {
    const [total, active, pending, bidsAgg, earningsAgg] = await Promise.all([
      ManagedService.countDocuments(),
      ManagedService.countDocuments({ status: 'active' }),
      ManagedService.countDocuments({ status: 'pending' }),
      ManagedBid.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      CommissionInvoice.aggregate([{ $group: { _id: '$status', total: { $sum: '$amount' } } }]),
    ]);

    const bidMap  = Object.fromEntries(bidsAgg.map(b  => [b._id, b.count]));
    const earnMap = Object.fromEntries(earningsAgg.map(e => [e._id, e.total]));

    res.json({
      success: true,
      data: {
        total, active, pending,
        bids: {
          identified:  bidMap.identified  || 0,
          in_progress: bidMap.in_progress || 0,
          submitted:   bidMap.submitted   || 0,
          won:         bidMap.won         || 0,
          lost:        bidMap.lost        || 0,
        },
        earnings: {
          pending: (earnMap.pending || 0) + (earnMap.sent || 0) + (earnMap.overdue || 0),
          paid:    earnMap.paid    || 0,
          total:   Object.values(earnMap).reduce((a, b) => a + b, 0),
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── List all managed services ─────────────────────────────────────────────────
export const listManagedServices = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;

    let ownerIds;
    if (search) {
      const users = await User.find({
        $or: [
          { name:         { $regex: search, $options: 'i' } },
          { email:        { $regex: search, $options: 'i' } },
          { businessName: { $regex: search, $options: 'i' } },
        ],
      }).select('_id');
      const companies = await Company.find({ name: { $regex: search, $options: 'i' } }).select('owner');
      const companyOwnerIds = companies.map(c => c.owner);
      ownerIds = [...new Set([...users.map(u => u._id.toString()), ...companyOwnerIds.map(id => id.toString())])];
      filter.owner = { $in: ownerIds };
    }

    const [services, total] = await Promise.all([
      ManagedService.find(filter)
        .populate('owner',   'name email plan businessName')
        .populate('company', 'name uei')
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit)),
      ManagedService.countDocuments(filter),
    ]);

    const ids      = services.map(s => s._id);
    const bidCounts = await ManagedBid.aggregate([
      { $match: { managedService: { $in: ids } } },
      { $group: { _id: '$managedService', total: { $sum: 1 }, won: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } } } },
    ]);
    const bidMap = Object.fromEntries(bidCounts.map(b => [b._id.toString(), b]));

    const data = services.map(s => ({
      ...s.toObject(),
      bidTotal: bidMap[s._id.toString()]?.total || 0,
      bidWon:   bidMap[s._id.toString()]?.won   || 0,
    }));

    res.json({ success: true, data, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Enroll a company directly (admin proactive) ───────────────────────────────
export const enrollCompany = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'userId required.' });

    const owner = await User.findById(userId);
    if (!owner) return res.status(404).json({ success: false, message: 'User not found.' });

    const company = await Company.findOne({ owner: userId });
    if (!company) return res.status(404).json({ success: false, message: 'This user has no company profile.' });

    const existing = await ManagedService.findOne({ owner: userId });
    if (existing) return res.json({ success: true, data: existing, message: 'Already enrolled.' });

    const ms = await ManagedService.create({
      company: company._id,
      owner:   userId,
      status:  req.body.status  || 'active',
      monthlyFee:    req.body.monthlyFee    || 299,
      defaultRate:   req.body.defaultRate   || 5,
      commissionCap: req.body.commissionCap || 50000,
      notes:         req.body.notes         || '',
      agreementSignedAt: new Date(),
    });

    await notify(userId, 'managed_service_update', 'Managed Service Activated',
      'Your managed service account has been activated. Our team will start finding contracts for you.',
    );

    res.status(201).json({ success: true, data: ms });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get one service detail ────────────────────────────────────────────────────
export const getManagedServiceById = async (req, res) => {
  try {
    const ms = await ManagedService.findById(req.params.id)
      .populate('owner',   'name email plan businessName')
      .populate('company', 'name uei ueiVerified ueiVerifiedAt cage website phone address naicsCodes certifications capabilities');
    if (!ms) return res.status(404).json({ success: false, message: 'Not found.' });

    const [bids, invoices, projects] = await Promise.all([
      ManagedBid.find({ managedService: ms._id }).populate('opportunity', 'title agency naicsCode setAside estimatedValue dueDate url').sort({ createdAt: -1 }),
      CommissionInvoice.find({ managedService: ms._id }).sort({ createdAt: -1 }),
      ManagedProject.find({ managedService: ms._id }).select('title status managedBid projectNumber').lean(),
    ]);

    res.json({ success: true, data: ms, bids, invoices, projects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Update service config ─────────────────────────────────────────────────────
export const updateManagedService = async (req, res) => {
  try {
    const ms = await ManagedService.findById(req.params.id).populate('owner', 'name email');
    if (!ms) return res.status(404).json({ success: false, message: 'Not found.' });

    const prevStatus = ms.status;
    const fields = ['status','monthlyFee','defaultRate','commissionCap','useTiers','tiers','notes','agreementSignedAt'];
    fields.forEach(f => { if (req.body[f] !== undefined) ms[f] = req.body[f]; });
    await ms.save();

    // Notify company owner on status change
    if (req.body.status && req.body.status !== prevStatus) {
      const statusMessages = {
        active:    'Your managed service is now active! Our team will start finding and bidding on contracts for you.',
        paused:    'Your managed service has been temporarily paused. Contact support for details.',
        cancelled: 'Your managed service has been cancelled.',
      };
      if (statusMessages[req.body.status]) {
        await notify(ms.owner._id, 'managed_service_update',
          `Managed Service ${req.body.status.charAt(0).toUpperCase() + req.body.status.slice(1)}`,
          statusMessages[req.body.status],
        );
      }
    }

    res.json({ success: true, data: ms });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Search real SAM.gov opportunities to attach to a bid ──────────────────────
export const searchOpportunitiesForBid = async (req, res) => {
  try {
    const { q = '', naics = '' } = req.query;
    const filter = {};
    if (q.trim()) {
      filter.$or = [
        { title:              { $regex: q, $options: 'i' } },
        { agency:             { $regex: q, $options: 'i' } },
        { solicitationNumber: { $regex: q, $options: 'i' } },
      ];
    }
    if (naics.trim()) filter.naicsCode = naics.trim();

    const opps = await Opportunity.find(filter)
      .select('title agency naicsCode setAside estimatedValue dueDate solicitationNumber url')
      .sort({ dueDate: 1 })
      .limit(20)
      .lean();

    res.json({ success: true, data: opps });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Add bid ───────────────────────────────────────────────────────────────────
export const addBid = async (req, res) => {
  try {
    const ms = await ManagedService.findById(req.params.id).populate('owner', 'name email');
    if (!ms) return res.status(404).json({ success: false, message: 'Service not found.' });

    let bidData = { managedService: ms._id, company: ms.company, owner: ms.owner._id, ...req.body };

    // If an opportunity was selected, auto-fill real contract data from SAM.gov instead of trusting manual entry
    if (req.body.opportunityId) {
      const opp = await Opportunity.findById(req.body.opportunityId).lean();
      if (opp) {
        bidData = {
          ...bidData,
          opportunity:        opp._id,
          contractTitle:      bidData.contractTitle || opp.title,
          solicitationNumber: bidData.solicitationNumber || opp.solicitationNumber || '',
          agency:             bidData.agency || opp.agency || '',
          naicsCode:          bidData.naicsCode || opp.naicsCode || '',
          setAside:           bidData.setAside || opp.setAside || '',
          estimatedValue:     bidData.estimatedValue || opp.estimatedValue || 0,
          deadline:           bidData.deadline || opp.dueDate || null,
          proposalUrl:        bidData.proposalUrl || opp.url || '',
        };
      }
      delete bidData.opportunityId;
    }

    const bid = await ManagedBid.create(bidData);

    ms.totalBids += 1;
    await ms.save();

    await notify(ms.owner._id, 'managed_bid_update', 'New Contract Identified',
      `Our team has identified a new contract opportunity: "${bid.contractTitle}". Check your managed service dashboard for details.`,
    );

    res.status(201).json({ success: true, data: bid });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Update bid ────────────────────────────────────────────────────────────────
export const updateBid = async (req, res) => {
  try {
    const bid = await ManagedBid.findById(req.params.bidId);
    if (!bid) return res.status(404).json({ success: false, message: 'Bid not found.' });

    const ms    = await ManagedService.findById(bid.managedService).populate('owner', 'name email');
    const prev  = bid.status;

    const editFields = ['contractTitle','solicitationNumber','agency','naicsCode','setAside','estimatedValue','deadline','proposalUrl','notes'];
    editFields.forEach(f => { if (req.body[f] !== undefined) bid[f] = req.body[f]; });

    if (req.body.status && req.body.status !== prev) {
      bid.status = req.body.status;

      if (req.body.status === 'won') {
        const wonValue = Number(req.body.wonValue) || 0;
        if (!wonValue) return res.status(400).json({ success: false, message: 'wonValue is required when marking as won.' });

        bid.wonValue = wonValue;
        // Informational total — actual commission is billed progressively per milestone as the government pays
        const { rate, amount } = calcCommission(ms, wonValue);
        bid.commissionRate   = rate;
        bid.commissionAmount = amount;

        ms.totalWon += 1;
        await ms.save();

        // Auto-create the fulfillment project so milestones can be set up right away — no manual step needed
        let project = await ManagedProject.findOne({ managedBid: bid._id });
        if (!project) {
          project = await ManagedProject.create({
            managedService: ms._id,
            managedBid:     bid._id,
            company:        ms.company,
            owner:          ms.owner._id,
            title:          bid.contractTitle,
            solicitationNumber: bid.solicitationNumber || '',
            agency:         bid.agency || '',
            contractValue:  wonValue,
            naicsCode:      bid.naicsCode || '',
            setAside:       bid.setAside || '',
          });
          sendProjectCreatedEmail(ms.owner, project).catch(() => {});
        }

        await notify(ms.owner._id, 'managed_bid_won', '🏆 Contract Won!',
          `Congratulations! Your bid for "${bid.contractTitle}" was successful. Contract value: ${fmt(wonValue)}. Total commission over the contract: ${fmt(amount)}, billed as each milestone is paid by the government.`,
        );

      } else if (prev === 'won' && req.body.status !== 'won') {
        // Reversing a won bid — rollback stats
        ms.totalWon    = Math.max(0, ms.totalWon - 1);
        ms.totalEarned = Math.max(0, ms.totalEarned - (bid.commissionInvoiced || 0));
        await ms.save();

        // Cancel any milestone commission invoices already generated for this bid
        await CommissionInvoice.updateMany({ bid: bid._id, status: { $ne: 'paid' } }, { status: 'cancelled' });
        bid.commissionAmount   = 0;
        bid.commissionInvoiced = 0;
        bid.commissionRate     = 0;
        bid.wonValue           = 0;

      } else {
        // Non-won status updates
        const statusLabels = { submitted: 'Proposal Submitted', lost: 'Bid Result — Not Selected', cancelled: 'Bid Cancelled' };
        if (statusLabels[req.body.status]) {
          await notify(ms.owner._id, 'managed_bid_update', statusLabels[req.body.status],
            `Update on "${bid.contractTitle}": ${req.body.status === 'submitted' ? "Your proposal has been submitted. We'll update you on the result." : req.body.status === 'lost' ? "Unfortunately this bid was not selected. Our team is identifying new opportunities for you." : "This bid has been cancelled."}`,
          );
        }
      }
    }

    await bid.save();
    res.json({ success: true, data: bid });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Delete bid ────────────────────────────────────────────────────────────────
export const deleteBid = async (req, res) => {
  try {
    const bid = await ManagedBid.findByIdAndDelete(req.params.bidId);
    if (!bid) return res.status(404).json({ success: false, message: 'Bid not found.' });

    // Keep stats accurate
    await ManagedService.findByIdAndUpdate(bid.managedService, {
      $inc: {
        totalBids:    -1,
        totalWon:     bid.status === 'won' ? -1 : 0,
        totalEarned:  bid.status === 'won' ? -(bid.commissionAmount || 0) : 0,
      },
    });

    // Cancel unpaid invoices tied to this bid
    await CommissionInvoice.updateMany({ bid: bid._id, status: { $ne: 'paid' } }, { status: 'cancelled' });

    res.json({ success: true, message: 'Bid removed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Run monthly fee billing for ALL active companies right now (admin override) ─
// The cron job does this automatically on the 1st of each month — this lets
// admin force a run on-demand (e.g. testing, or a company activated mid-month).
export const triggerMonthlyBillingRun = async (req, res) => {
  try {
    const { runMonthlyCommissionFees } = await import('../services/projectSchedulerService.js');
    runMonthlyCommissionFees().catch(err => console.error('Manual monthly billing run error:', err.message));
    res.json({ success: true, message: 'Monthly billing run started — invoices will be generated for active companies that have not been billed yet this month.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Generate monthly fee invoice ──────────────────────────────────────────────
export const generateMonthlyFee = async (req, res) => {
  try {
    const ms = await ManagedService.findById(req.params.id).populate('owner', 'name email');
    if (!ms) return res.status(404).json({ success: false, message: 'Service not found.' });
    if (ms.status !== 'active') return res.status(400).json({ success: false, message: 'Service must be active to generate a monthly fee invoice.' });

    const invoice = await CommissionInvoice.create({
      managedService: ms._id,
      company:        ms.company,
      owner:          ms.owner._id,
      type:           'monthly_fee',
      amount:         ms.monthlyFee,
      dueDate:        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
    });

    await notify(ms.owner._id, 'commission_invoice', 'Monthly Service Invoice',
      `Your monthly service invoice of ${fmt(ms.monthlyFee)} (${invoice.invoiceNumber}) has been generated and is due in 14 days.`,
    );
    await sendMonthlyFeeEmail(ms.owner, invoice);

    res.status(201).json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Mark invoice paid ─────────────────────────────────────────────────────────
export const markInvoicePaid = async (req, res) => {
  try {
    const inv = await CommissionInvoice.findById(req.params.invoiceId).populate('owner', 'name email');
    if (!inv) return res.status(404).json({ success: false, message: 'Invoice not found.' });

    inv.status        = 'paid';
    inv.paidAt        = new Date();
    inv.paymentMethod = req.body.paymentMethod || '';
    if (req.body.notes) inv.notes = req.body.notes;

    if (inv.bid) await ManagedBid.findByIdAndUpdate(inv.bid, { commissionPaid: true, paidAt: new Date() });
    await inv.save();

    await notify(inv.owner._id, 'commission_invoice', 'Invoice Paid — Thank You!',
      `Invoice ${inv.invoiceNumber} (${fmt(inv.amount)}) has been marked as paid. Thank you!`,
    );

    res.json({ success: true, data: inv });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Update invoice ────────────────────────────────────────────────────────────
export const updateInvoice = async (req, res) => {
  try {
    const inv = await CommissionInvoice.findById(req.params.invoiceId);
    if (!inv) return res.status(404).json({ success: false, message: 'Invoice not found.' });

    const prevStatus = inv.status;
    Object.assign(inv, req.body);
    await inv.save();

    // If cancelled and was previously pending — adjust totalEarned
    if (req.body.status === 'cancelled' && prevStatus !== 'cancelled' && inv.type === 'commission') {
      await ManagedService.findByIdAndUpdate(inv.managedService, { $inc: { totalEarned: -(inv.amount || 0) } });
    }

    res.json({ success: true, data: inv });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── All invoices list ─────────────────────────────────────────────────────────
export const listAllInvoices = async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (type   && type   !== 'all') filter.type   = type;

    const [invoices, total] = await Promise.all([
      CommissionInvoice.find(filter)
        .populate('owner',   'name email')
        .populate('company', 'name')
        .populate('bid',     'contractTitle')
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit)),
      CommissionInvoice.countDocuments(filter),
    ]);

    res.json({ success: true, data: invoices, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Search users for enroll ───────────────────────────────────────────────────
export const searchUsersForEnroll = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ success: true, data: [] });

    const users = await User.find({
      $or: [{ name: { $regex: q, $options: 'i' } }, { email: { $regex: q, $options: 'i' } }],
      role: { $ne: 'admin' },
    }).select('name email plan businessName').limit(10);

    // Mark which already have managed service
    const enrolled = await ManagedService.find({ owner: { $in: users.map(u => u._id) } }).select('owner');
    const enrolledSet = new Set(enrolled.map(e => e.owner.toString()));

    const data = users.map(u => ({ ...u.toObject(), alreadyEnrolled: enrolledSet.has(u._id.toString()) }));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Upload a document to a bid (proposal, capability statement, contract, etc.)
export const uploadBidDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

    const bid = await ManagedBid.findById(req.params.bidId);
    if (!bid) return res.status(404).json({ success: false, message: 'Bid not found.' });

    const doc = {
      name: req.body.name || req.file.originalname,
      url:  `/uploads/documents/${req.file.filename}`,
      type: req.body.type || 'other',
      uploadedAt: new Date(),
    };
    bid.documents.push(doc);
    await bid.save();

    res.status(201).json({ success: true, data: bid.documents[bid.documents.length - 1] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteBidDocument = async (req, res) => {
  try {
    const bid = await ManagedBid.findById(req.params.bidId);
    if (!bid) return res.status(404).json({ success: false, message: 'Bid not found.' });

    bid.documents = bid.documents.filter(d => d._id.toString() !== req.params.docId);
    await bid.save();

    res.json({ success: true, message: 'Document removed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
