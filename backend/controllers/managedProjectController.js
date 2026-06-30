import ManagedProject    from '../models/ManagedProject.js';
import ManagedBid        from '../models/ManagedBid.js';
import ManagedService    from '../models/ManagedService.js';
import CommissionInvoice from '../models/CommissionInvoice.js';
import SubcontractorQuote from '../models/SubcontractorQuote.js';
import ProjectMilestone  from '../models/ProjectMilestone.js';
import UserNotification  from '../models/UserNotification.js';
import User              from '../models/User.js';
import Company           from '../models/Company.js';
import {
  sendProjectCreatedEmail,
  sendQuoteReceivedEmail,
  sendVendorSelectedEmail,
  sendMilestoneUpdateEmail,
  sendDeadlineAlertEmail,
  sendGovPaymentReceivedEmail,
  sendSubcontractorPaymentEmail,
} from '../services/emailService.js';
import { calcCommission, fmt as fmtMoney, sendCommissionEmail } from './adminManagedServiceController.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n) { return `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

async function notify(userId, type, title, message, link = '/company/managed-service') {
  try { await UserNotification.create({ user: userId, type, title, message, link }); } catch {}
}

const ALLOWED_TRANSITIONS = {
  draft:           ['rfq_open', 'cancelled'],
  rfq_open:        ['vendor_selected', 'cancelled'],
  vendor_selected: ['in_progress', 'cancelled'],
  in_progress:     ['delivered', 'cancelled'],
  delivered:       ['payment_pending'],
  payment_pending: ['completed'],
};

// ── Stats ────────────────────────────────────────────────────────────────────

export const getProjectStats = async (req, res) => {
  try {
    const [total, draft, rfqOpen, vendorSelected, inProgress, delivered, paymentPending, completed, cancelled] = await Promise.all([
      ManagedProject.countDocuments(),
      ManagedProject.countDocuments({ status: 'draft' }),
      ManagedProject.countDocuments({ status: 'rfq_open' }),
      ManagedProject.countDocuments({ status: 'vendor_selected' }),
      ManagedProject.countDocuments({ status: 'in_progress' }),
      ManagedProject.countDocuments({ status: 'delivered' }),
      ManagedProject.countDocuments({ status: 'payment_pending' }),
      ManagedProject.countDocuments({ status: 'completed' }),
      ManagedProject.countDocuments({ status: 'cancelled' }),
    ]);

    const pipeline = await ManagedProject.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: null, totalValue: { $sum: '$contractValue' }, pendingGov: { $sum: { $cond: [{ $eq: ['$govPaymentStatus', 'pending'] }, '$contractValue', 0] } }, receivedGov: { $sum: '$govPaymentAmount' } } },
    ]);
    const agg = pipeline[0] || { totalValue: 0, pendingGov: 0, receivedGov: 0 };

    res.json({
      success: true,
      data: { total, draft, rfqOpen, vendorSelected, inProgress, delivered, paymentPending, completed, cancelled, totalValue: agg.totalValue, pendingGovPayment: agg.pendingGov, receivedGovPayment: agg.receivedGov },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── List ─────────────────────────────────────────────────────────────────────

export const listProjects = async (req, res) => {
  try {
    const { status, search = '', page = 1, limit = 15 } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;

    let projects = await ManagedProject.find(query)
      .populate('owner', 'name email businessName')
      .populate('company', 'name')
      .sort({ createdAt: -1 })
      .lean();

    if (search.trim()) {
      const q = search.toLowerCase();
      projects = projects.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.agency?.toLowerCase().includes(q) ||
        p.projectNumber?.toLowerCase().includes(q) ||
        p.owner?.name?.toLowerCase().includes(q) ||
        p.owner?.email?.toLowerCase().includes(q) ||
        p.company?.name?.toLowerCase().includes(q)
      );
    }

    const total = projects.length;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const paginated = projects.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({ success: true, data: paginated, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Create Project from Won Bid ──────────────────────────────────────────────

export const createProject = async (req, res) => {
  try {
    const { bidId } = req.body;
    if (!bidId) return res.status(400).json({ success: false, message: 'bidId is required.' });

    const bid = await ManagedBid.findById(bidId);
    if (!bid) return res.status(404).json({ success: false, message: 'Bid not found.' });
    if (bid.status !== 'won') return res.status(400).json({ success: false, message: 'Only won bids can become projects.' });

    const existing = await ManagedProject.findOne({ managedBid: bidId });
    if (existing) return res.status(400).json({ success: false, message: 'A project already exists for this bid.', data: existing });

    const ms = await ManagedService.findById(bid.managedService).populate('owner');
    if (!ms) return res.status(404).json({ success: false, message: 'Managed service not found.' });

    const project = await ManagedProject.create({
      managedService: ms._id,
      managedBid:     bid._id,
      company:        ms.company,
      owner:          ms.owner._id || ms.owner,
      title:          bid.contractTitle || bid.title || 'Untitled Project',
      solicitationNumber: bid.solicitationNumber || '',
      agency:         bid.agency || '',
      contractValue:  bid.wonValue || bid.estimatedValue || 0,
      naicsCode:      bid.naicsCode || '',
      setAside:       bid.setAside || '',
    });

    const owner = ms.owner._id ? ms.owner : await User.findById(ms.owner);
    notify(owner._id, 'managed_project_created', 'Project Created', `A fulfillment project has been created for "${project.title}".`);
    sendProjectCreatedEmail(owner, project).catch(() => {});

    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get Project Detail ───────────────────────────────────────────────────────

export const getProject = async (req, res) => {
  try {
    const project = await ManagedProject.findById(req.params.id)
      .populate('owner', 'name email businessName')
      .populate('company', 'name')
      .populate('selectedQuote')
      .lean();
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    const [quotes, milestones] = await Promise.all([
      SubcontractorQuote.find({ managedProject: project._id }).sort({ createdAt: -1 }).lean(),
      ProjectMilestone.find({ managedProject: project._id }).sort({ order: 1 }).lean(),
    ]);

    res.json({ success: true, data: project, quotes, milestones });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Update Project ───────────────────────────────────────────────────────────

export const updateProject = async (req, res) => {
  try {
    const project = await ManagedProject.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    const { deliveryAddress, deliveryDeadline, status, notes } = req.body;

    if (deliveryAddress) project.deliveryAddress = { ...project.deliveryAddress?.toObject?.() || {}, ...deliveryAddress };
    if (notes !== undefined) project.notes = notes;

    if (deliveryDeadline) {
      project.deliveryDeadline = new Date(deliveryDeadline);
      project.govPaymentExpectedDate = new Date(new Date(deliveryDeadline).getTime() + 30 * 86400000);
      project.nextAlertDate = new Date(new Date(deliveryDeadline).getTime() - 7 * 86400000);
    }

    if (status && status !== project.status) {
      const allowed = ALLOWED_TRANSITIONS[project.status] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({ success: false, message: `Cannot transition from "${project.status}" to "${status}".` });
      }
      project.status = status;

      const statusMessages = {
        rfq_open:        'Your project is now open for vendor quotations.',
        in_progress:     'Work has begun on your project.',
        delivered:       'Your project has been delivered to the government delivery point.',
        payment_pending: 'Delivery confirmed. Awaiting government payment.',
        completed:       'Your project is complete! All payments have been processed.',
        cancelled:       'Your project has been cancelled.',
      };
      if (statusMessages[status]) {
        notify(project.owner, 'managed_project_update', 'Project Update', `${project.title}: ${statusMessages[status]}`);
      }
    }

    await project.save();
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Quotes ───────────────────────────────────────────────────────────────────

export const addQuote = async (req, res) => {
  try {
    const project = await ManagedProject.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    const quote = await SubcontractorQuote.create({ managedProject: project._id, ...req.body });

    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    if (adminEmail) sendQuoteReceivedEmail(adminEmail, quote, project).catch(() => {});

    res.json({ success: true, data: quote });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateQuote = async (req, res) => {
  try {
    const quote = await SubcontractorQuote.findOneAndUpdate(
      { _id: req.params.quoteId, managedProject: req.params.id },
      { $set: req.body },
      { new: true }
    );
    if (!quote) return res.status(404).json({ success: false, message: 'Quote not found.' });
    res.json({ success: true, data: quote });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const selectVendor = async (req, res) => {
  try {
    const { quoteId } = req.body;
    if (!quoteId) return res.status(400).json({ success: false, message: 'quoteId is required.' });

    const project = await ManagedProject.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    const quote = await SubcontractorQuote.findById(quoteId);
    if (!quote || quote.managedProject.toString() !== project._id.toString()) {
      return res.status(404).json({ success: false, message: 'Quote not found for this project.' });
    }

    // Accept this quote, reject all others
    quote.status = 'accepted';
    await quote.save();
    await SubcontractorQuote.updateMany(
      { managedProject: project._id, _id: { $ne: quoteId }, status: { $nin: ['rejected', 'withdrawn'] } },
      { $set: { status: 'rejected' } }
    );

    project.selectedQuote = quote._id;
    project.selectedVendor = {
      name:        quote.vendorName,
      email:       quote.vendorEmail,
      company:     quote.vendorCompany,
      quoteAmount: quote.quoteAmount,
    };
    project.status = 'vendor_selected';
    await project.save();

    notify(project.owner, 'managed_vendor_selected', 'Vendor Selected', `A vendor has been selected for "${project.title}": ${quote.vendorName}`);
    sendVendorSelectedEmail(quote.vendorEmail, quote.vendorName, project).catch(() => {});

    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Milestones ───────────────────────────────────────────────────────────────

export const addMilestone = async (req, res) => {
  try {
    const project = await ManagedProject.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    let { order } = req.body;
    if (!order) {
      const maxMs = await ProjectMilestone.findOne({ managedProject: project._id }).sort({ order: -1 }).lean();
      order = (maxMs?.order || 0) + 1;
    }

    const milestone = await ProjectMilestone.create({ managedProject: project._id, ...req.body, order });
    res.json({ success: true, data: milestone });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateMilestone = async (req, res) => {
  try {
    const milestone = await ProjectMilestone.findOneAndUpdate(
      { _id: req.params.milestoneId, managedProject: req.params.id },
      { $set: req.body },
      { new: true }
    );
    if (!milestone) return res.status(404).json({ success: false, message: 'Milestone not found.' });

    if (milestone.status === 'approved' && !milestone.completedDate) {
      milestone.completedDate = new Date();
      await milestone.save();
    }

    // Recalculate project progress
    const project = await ManagedProject.findById(req.params.id);
    if (project) {
      const allMs = await ProjectMilestone.find({ managedProject: project._id }).lean();
      const approved = allMs.filter(m => m.status === 'approved').length;
      project.overallProgress = allMs.length ? Math.round((approved / allMs.length) * 100) : 0;
      project.lastProgressUpdate = new Date();
      await project.save();

      const owner = await User.findById(project.owner);
      if (owner) {
        notify(owner._id, 'managed_milestone_update', 'Milestone Update', `"${milestone.title}" is now ${milestone.status.replace('_', ' ')}.`);
        sendMilestoneUpdateEmail(owner, project, milestone).catch(() => {});
      }
    }

    res.json({ success: true, data: milestone });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteMilestone = async (req, res) => {
  try {
    const deleted = await ProjectMilestone.findOneAndDelete({ _id: req.params.milestoneId, managedProject: req.params.id });
    if (!deleted) return res.status(404).json({ success: false, message: 'Milestone not found.' });

    // Reorder remaining
    const remaining = await ProjectMilestone.find({ managedProject: req.params.id }).sort({ order: 1 });
    for (let i = 0; i < remaining.length; i++) {
      remaining[i].order = i + 1;
      await remaining[i].save();
    }

    res.json({ success: true, message: 'Milestone deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Progress ─────────────────────────────────────────────────────────────────

export const updateProgress = async (req, res) => {
  try {
    const { progress, note } = req.body;
    const project = await ManagedProject.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    if (progress !== undefined) project.overallProgress = Math.min(100, Math.max(0, progress));
    if (note) {
      project.progressNotes.push({ note, progress: project.overallProgress, updatedBy: req.user?.name || 'Admin' });
    }
    project.lastProgressUpdate = new Date();
    await project.save();

    notify(project.owner, 'managed_project_update', 'Progress Update', `${project.title}: ${project.overallProgress}% complete.`);

    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Government Payment ───────────────────────────────────────────────────────

export const recordGovPayment = async (req, res) => {
  try {
    const { amount, status, receivedDate } = req.body;
    const project = await ManagedProject.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    if (amount !== undefined) project.govPaymentAmount = amount;
    if (status) project.govPaymentStatus = status;
    if (receivedDate) project.govPaymentReceivedDate = new Date(receivedDate);

    if (project.govPaymentStatus === 'received' && project.status === 'delivered') {
      project.status = 'payment_pending';
    }

    await project.save();

    const owner = await User.findById(project.owner);
    if (owner && project.govPaymentStatus !== 'pending') {
      notify(owner._id, 'managed_payment_update', 'Government Payment Update', `Payment of ${fmt(project.govPaymentAmount)} received for "${project.title}".`);
      sendGovPaymentReceivedEmail(owner, project).catch(() => {});
    }

    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Subcontractor Milestone Payment ──────────────────────────────────────────

export const processSubcontractorPayment = async (req, res) => {
  try {
    const { paymentReference } = req.body;
    const milestone = await ProjectMilestone.findOne({ _id: req.params.milestoneId, managedProject: req.params.id });
    if (!milestone) return res.status(404).json({ success: false, message: 'Milestone not found.' });

    milestone.paymentStatus = 'paid';
    milestone.paymentDate = new Date();
    if (paymentReference) milestone.paymentReference = paymentReference;
    await milestone.save();

    const project = await ManagedProject.findById(req.params.id);
    if (project) {
      // Check if all milestones are paid → auto-complete
      const allMs = await ProjectMilestone.find({ managedProject: project._id }).lean();
      const allPaid = allMs.length > 0 && allMs.every(m => m.paymentStatus === 'paid');
      if (allPaid && project.status === 'payment_pending') {
        project.status = 'completed';
        await project.save();
        notify(project.owner, 'managed_project_update', 'Project Completed', `"${project.title}" is now complete. All payments processed.`);
      }

      // Email vendor
      if (project.selectedVendor?.email) {
        sendSubcontractorPaymentEmail(project.selectedVendor.email, project.selectedVendor.name, milestone, project).catch(() => {});
      }
    }

    res.json({ success: true, data: milestone });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Milestone-Based Commission Billing ───────────────────────────────────────
// Admin records that the GOVERNMENT paid for this milestone → platform commission
// is auto-calculated and invoiced to the company for just this milestone's share,
// respecting the per-contract commission cap set on the bid's ManagedService.

export const recordMilestoneGovPayment = async (req, res) => {
  try {
    const { amount, receivedDate } = req.body;
    const govAmount = Number(amount);
    if (!govAmount || govAmount <= 0) {
      return res.status(400).json({ success: false, message: 'A positive government payment amount is required.' });
    }

    const project = await ManagedProject.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    const milestone = await ProjectMilestone.findOne({ _id: req.params.milestoneId, managedProject: project._id });
    if (!milestone) return res.status(404).json({ success: false, message: 'Milestone not found.' });
    if (milestone.govPaymentReceived) {
      return res.status(400).json({ success: false, message: 'Government payment already recorded for this milestone.' });
    }

    const [bid, ms] = await Promise.all([
      ManagedBid.findById(project.managedBid),
      ManagedService.findById(project.managedService).populate('owner', 'name email'),
    ]);
    if (!bid || !ms) return res.status(404).json({ success: false, message: 'Related bid or managed service not found.' });

    // Calculate this milestone's commission, then cap against whatever headroom remains on the contract
    const { rate, amount: rawCommission } = calcCommission(ms, govAmount);
    const remainingCap = ms.commissionCap ? Math.max(0, ms.commissionCap - (bid.commissionInvoiced || 0)) : Infinity;
    const commission = Math.min(rawCommission, remainingCap);

    milestone.govPaymentAmount     = govAmount;
    milestone.govPaymentReceived   = true;
    milestone.govPaymentReceivedAt = receivedDate ? new Date(receivedDate) : new Date();
    milestone.commissionAmount     = commission;

    let invoice = null;
    if (commission > 0) {
      invoice = await CommissionInvoice.create({
        managedService: ms._id,
        bid:            bid._id,
        milestone:      milestone._id,
        company:        ms.company,
        owner:          ms.owner._id,
        type:           'commission',
        contractValue:  govAmount,
        commissionRate: rate,
        amount:         commission,
        dueDate:        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes:          `Milestone: ${milestone.title}`,
      });
      milestone.commissionInvoice = invoice._id;

      bid.commissionInvoiced = (bid.commissionInvoiced || 0) + commission;
      bid.commissionPaid = bid.commissionInvoiced >= bid.commissionAmount;
      await bid.save();

      ms.totalEarned = (ms.totalEarned || 0) + commission;
      await ms.save();
    }

    await milestone.save();

    // Update project-level cumulative gov payment tracking for the overview dashboard
    project.govPaymentAmount = (project.govPaymentAmount || 0) + govAmount;
    project.govPaymentStatus = project.govPaymentAmount >= project.contractValue ? 'received' : 'partial';
    if (!project.govPaymentReceivedDate) project.govPaymentReceivedDate = new Date();
    await project.save();

    if (invoice) {
      notify(ms.owner._id, 'managed_payment_update', 'Milestone Payment Received',
        `The government paid ${fmtMoney(govAmount)} for "${milestone.title}" on "${project.title}". Commission invoice ${invoice.invoiceNumber} (${fmtMoney(commission)}) has been generated.`,
      );
      sendCommissionEmail(ms.owner, invoice, bid).catch(() => {});
    }

    res.json({ success: true, data: { milestone, invoice, project } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Project documents (contract, SOW, delivery confirmation, etc.) ───────────

export const uploadProjectDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

    const project = await ManagedProject.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    if (!project.documents) project.documents = [];
    project.documents.push({
      name: req.body.name || req.file.originalname,
      url:  `/uploads/documents/${req.file.filename}`,
      type: req.body.type || 'other',
      uploadedAt: new Date(),
    });
    await project.save();

    res.status(201).json({ success: true, data: project.documents[project.documents.length - 1] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteProjectDocument = async (req, res) => {
  try {
    const project = await ManagedProject.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    project.documents = (project.documents || []).filter(d => d._id.toString() !== req.params.docId);
    await project.save();

    res.json({ success: true, message: 'Document removed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
