// backend/controllers/prospectController.js
import Prospect from '../models/Prospect.js';
import {
  startProspectSync, resumeProspectEnrichment, stopProspectSync,
  prospectSyncState,
} from '../services/prospectFetchService.js';
import {
  runAIWebsiteFinder, stopAIWebsiteFinder, aiFindState,
} from '../services/websiteFinderAI.js';
import {
  getTemplateList, renderTemplate, sendBulkProspectEmails,
  generateEmailWithAI, sendBulkCustomEmails, EMAIL_TYPE_LIST,
} from '../services/prospectEmailService.js';

// ── Stats ─────────────────────────────────────────────────────────────────────
export const getProspectStats = async (req, res) => {
  try {
    const [
      total, withAll, withWebsite, withEmail, withPhone,
      emailOnly, phoneOnly, websiteOnly,
      high, medium, low,
      contacted, converted, pendingEnrichment,
    ] = await Promise.all([
      Prospect.countDocuments(),
      Prospect.countDocuments({ website: { $ne: null }, primaryEmail: { $ne: null }, primaryPhone: { $ne: null } }),
      Prospect.countDocuments({ website: { $ne: null } }),
      Prospect.countDocuments({ primaryEmail: { $ne: null } }),
      Prospect.countDocuments({ primaryPhone: { $ne: null } }),
      Prospect.countDocuments({ emailOnly: true }),
      Prospect.countDocuments({ phoneOnly: true }),
      Prospect.countDocuments({ websiteOnly: true }),
      Prospect.countDocuments({ priority: 'high' }),
      Prospect.countDocuments({ priority: 'medium' }),
      Prospect.countDocuments({ priority: 'low' }),
      Prospect.countDocuments({ contacted: true }),
      Prospect.countDocuments({ responseStatus: 'converted' }),
      Prospect.countDocuments({ enrichmentAttempted: false }),
    ]);

    const sourceCounts = await Prospect.aggregate([
      { $unwind: '$dataSource' },
      { $group: { _id: '$dataSource', count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        total, withAll, withWebsite, withEmail, withPhone,
        emailOnly, phoneOnly, websiteOnly,
        pendingEnrichment,
        priority: { high, medium, low },
        crm: { contacted, converted },
        sources: Object.fromEntries(sourceCounts.map(s => [s._id, s.count])),
        syncState: prospectSyncState,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── List ──────────────────────────────────────────────────────────────────────
export const getProspects = async (req, res) => {
  try {
    const {
      page = 1, limit = 50, search,
      hasWebsite, hasEmail, hasPhone, hasAll,
      priority, state, naicsCode, minAward, maxAward,
      agency, contacted, responseStatus, dataSource, websiteStatus,
    } = req.query;

    const query = {};
    if (search) query.$or = [
      { companyName:       { $regex: search, $options: 'i' } },
      { primaryEmail:      { $regex: search, $options: 'i' } },
      { contactPersonName: { $regex: search, $options: 'i' } },
      { uei:               { $regex: search, $options: 'i' } },
      { cageCode:          { $regex: search, $options: 'i' } },
    ];

    if (hasAll === 'true') {
      query.website = { $ne: null }; query.primaryEmail = { $ne: null }; query.primaryPhone = { $ne: null };
    } else {
      if (hasWebsite === 'true') query.website      = { $ne: null };
      if (hasEmail   === 'true') query.primaryEmail = { $ne: null };
      if (hasPhone   === 'true') query.primaryPhone = { $ne: null };
    }
    if (priority)       query.priority       = priority;
    if (state)          query.state          = state.toUpperCase();
    if (naicsCode)      query.naicsCode      = naicsCode;
    if (agency)         query.agenciesWorkedWith = agency;
    if (contacted)      query.contacted      = contacted === 'true';
    if (responseStatus) query.responseStatus = responseStatus;
    if (dataSource)     query.dataSource     = dataSource;
    if (websiteStatus)  query.websiteStatus  = websiteStatus;

    if (minAward || maxAward) {
      query.totalAwardAmount = {};
      if (minAward) query.totalAwardAmount.$gte = Number(minAward);
      if (maxAward) query.totalAwardAmount.$lte = Number(maxAward);
    }

    const p   = Math.max(1, parseInt(page));
    const lim = Math.min(200, parseInt(limit));
    const [prospects, total] = await Promise.all([
      Prospect.find(query).sort({ totalAwardAmount: -1, createdAt: -1 }).skip((p-1)*lim).limit(lim).lean(),
      Prospect.countDocuments(query),
    ]);

    res.json({ success: true, data: prospects, pagination: { page: p, limit: lim, total, pages: Math.ceil(total/lim) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Export CSV ────────────────────────────────────────────────────────────────
const esc = v => { if (v == null) return ''; const s = String(v).replace(/"/g,'""'); return (s.includes(',') || s.includes('\n') || s.includes('"')) ? `"${s}"` : s; };

const EXPORT_FIELDS = {
  all: [
    { l:'Company Name',     k:'companyName' },
    { l:'UEI',              k:'uei' },
    { l:'CAGE Code',        k:'cageCode' },
    { l:'Website',          k:'website' },
    { l:'All Websites',     g: r => (r.allWebsites||[]).join(';') },
    { l:'Website Status',   k:'websiteStatus' },
    { l:'Primary Email',    k:'primaryEmail' },
    { l:'All Emails',       g: r => (r.allEmails||[]).join(';') },
    { l:'Email Source',     k:'emailSource' },
    { l:'Primary Phone',    k:'primaryPhone' },
    { l:'All Phones',       g: r => (r.allPhones||[]).join(';') },
    { l:'Phone Source',     k:'phoneSource' },
    { l:'Contact Name',     k:'contactPersonName' },
    { l:'Contact Title',    k:'contactPersonTitle' },
    { l:'NAICS Code',       k:'naicsCode' },
    { l:'NAICS Description',k:'naicsDescription' },
    { l:'State',            k:'state' },
    { l:'City',             k:'city' },
    { l:'ZIP',              k:'zipCode' },
    { l:'Total Award ($)',  k:'totalAwardAmount' },
    { l:'Contracts Won',    k:'totalContractsWon' },
    { l:'Priority',         k:'priority' },
    { l:'Agencies',         g: r => (r.agenciesWorkedWith||[]).join(';') },
    { l:'Contract Types',   g: r => (r.contractTypes||[]).join(';') },
    { l:'Sources',          g: r => (r.dataSource||[]).join(';') },
    { l:'Contacted',        k:'contacted' },
    { l:'Response Status',  k:'responseStatus' },
    { l:'Notes',            k:'notes' },
  ],
  email:   [{ l:'Company', k:'companyName' }, { l:'Email', k:'primaryEmail' }, { l:'All Emails', g: r => (r.allEmails||[]).join(';') }, { l:'Source', k:'emailSource' }, { l:'Contact Name', k:'contactPersonName' }],
  phone:   [{ l:'Company', k:'companyName' }, { l:'Phone', k:'primaryPhone' }, { l:'All Phones', g: r => (r.allPhones||[]).join(';') }, { l:'Source', k:'phoneSource' }, { l:'Contact Name', k:'contactPersonName' }],
  website: [{ l:'Company', k:'companyName' }, { l:'Website', k:'website' }, { l:'Status', k:'websiteStatus' }, { l:'HTTP Status', k:'websiteHttpStatus' }, { l:'Source', k:'websiteSource' }],
  contact: [
    { l:'Company', k:'companyName' }, { l:'Contact Name', k:'contactPersonName' }, { l:'Title', k:'contactPersonTitle' },
    { l:'Email', k:'primaryEmail' }, { l:'Phone', k:'primaryPhone' }, { l:'Website', k:'website' },
    { l:'State', k:'state' }, { l:'Priority', k:'priority' },
  ],
};

export const exportProspects = async (req, res) => {
  try {
    const { type = 'all', priority, state, naicsCode, contacted, hasWebsite, hasEmail, hasPhone, hasAll } = req.query;
    const query = {};
    if (type === 'email')   query.primaryEmail = { $ne: null };
    if (type === 'phone')   query.primaryPhone = { $ne: null };
    if (type === 'website') query.website      = { $ne: null };
    if (hasAll === 'true')  { query.website = { $ne: null }; query.primaryEmail = { $ne: null }; query.primaryPhone = { $ne: null }; }
    if (priority)  query.priority   = priority;
    if (state)     query.state      = state.toUpperCase();
    if (naicsCode) query.naicsCode  = naicsCode;
    if (contacted) query.contacted  = contacted === 'true';

    const prospects = await Prospect.find(query).sort({ totalAwardAmount: -1 }).limit(100000).lean();
    const fields    = EXPORT_FIELDS[type] || EXPORT_FIELDS.all;
    const header    = fields.map(f => esc(f.l)).join(',');
    const lines     = prospects.map(r => fields.map(f => esc(f.g ? f.g(r) : r[f.k])).join(','));
    const csv       = [header, ...lines].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="prospects_${type}_${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Sync control ──────────────────────────────────────────────────────────────
export const triggerProspectSync = async (req, res) => {
  if (prospectSyncState.isRunning) return res.json({ success: false, message: 'Already running', state: prospectSyncState });
  startProspectSync().catch(e => { prospectSyncState.lastError = e.message; prospectSyncState.isRunning = false; });
  res.json({ success: true, message: 'Prospect sync started' });
};
// Phase 1 only (collect to DB without enriching)
export const triggerCollectOnly = async (req, res) => {
  if (prospectSyncState.isRunning) return res.json({ success: false, message: 'Already running', state: prospectSyncState });
  startProspectSync({ phase2Only: false, skipEnrich: true }).catch(e => { prospectSyncState.lastError = e.message; prospectSyncState.isRunning = false; });
  res.json({ success: true, message: 'Phase 1 (collect) started — companies saved to DB as collected' });
};
// Phase 2 only (enrich companies already in DB)
export const triggerEnrichOnly = async (req, res) => {
  if (prospectSyncState.isRunning) return res.json({ success: false, message: 'Already running', state: prospectSyncState });
  resumeProspectEnrichment().catch(e => { prospectSyncState.lastError = e.message; prospectSyncState.isRunning = false; });
  res.json({ success: true, message: 'Phase 2 (enrich) started — enriching companies already in DB' });
};
export const resumeProspectSyncHandler = async (req, res) => {
  if (prospectSyncState.isRunning) return res.json({ success: false, message: 'Already running' });
  resumeProspectEnrichment().catch(e => { prospectSyncState.lastError = e.message; prospectSyncState.isRunning = false; });
  res.json({ success: true, message: 'Enrichment phase resumed' });
};
export const stopProspectSyncHandler    = (req, res) => { stopProspectSync(); res.json({ success: true, message: 'Stop signal sent' }); };
export const getProspectSyncStatus      = (req, res) => res.json({ success: true, data: prospectSyncState });
export const clearAllProspects = async (req, res) => {
  try {
    if (!req.body?.confirmed) return res.status(400).json({ success: false, message: 'Send { confirmed: true }' });
    const r = await Prospect.deleteMany({});
    res.json({ success: true, deleted: r.deletedCount });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── CRM actions ───────────────────────────────────────────────────────────────
export const markContacted = async (req, res) => {
  try {
    const { contactedBy, notes } = req.body;
    const p = await Prospect.findByIdAndUpdate(req.params.id, { contacted: true, contactedDate: new Date(), contactedBy, notes }, { new: true });
    if (!p) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: p });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
export const bulkMarkContacted = async (req, res) => {
  try {
    const { ids, contactedBy } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ success: false, message: 'ids[] required' });
    const r = await Prospect.updateMany({ _id: { $in: ids } }, { contacted: true, contactedDate: new Date(), contactedBy: contactedBy || 'Admin' });
    res.json({ success: true, updated: r.modifiedCount });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
export const updateResponseStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const valid = ['none','replied','interested','notInterested','converted'];
    if (!valid.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
    const p = await Prospect.findByIdAndUpdate(req.params.id, { responseStatus: status, ...(notes !== undefined && { notes }) }, { new: true });
    if (!p) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: p });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
export const deleteProspect = async (req, res) => {
  try { await Prospect.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── AI Website Finder ─────────────────────────────────────────────────────────
export const startAIWebsiteFinder = async (req, res) => {
  if (aiFindState.isRunning) return res.json({ success: false, message: 'AI finder already running', state: aiFindState });
  const { onlySource } = req.body || {};
  runAIWebsiteFinder({ onlySource }).catch(e => { aiFindState.lastError = e.message; aiFindState.isRunning = false; });
  res.json({ success: true, message: 'AI website finder started (Gemini → GPT)' });
};
export const stopAIWebsiteFinderHandler = (req, res) => {
  stopAIWebsiteFinder();
  res.json({ success: true, message: 'Stop signal sent' });
};
export const getAIFinderStatus = (req, res) => {
  res.json({ success: true, data: aiFindState });
};

// ── Email Outreach ────────────────────────────────────────────────────────────
export const getEmailTemplates = (_req, res) =>
  res.json({ success: true, data: { staticTemplates: getTemplateList(), aiTypes: EMAIL_TYPE_LIST } });

export const previewEmailTemplate = (req, res) => {
  try {
    const { templateId } = req.params;
    const mock = { companyName: 'Acme Federal Services', contactPersonName: 'John Smith', state: 'VA', naicsCode: '541512' };
    const { subject, html } = renderTemplate(templateId, mock);
    res.json({ success: true, data: { subject, html } });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// AI-powered email generation
export const generateProspectEmail = async (req, res) => {
  try {
    const { templateType, prospectId, prospectData } = req.body;
    if (!templateType)
      return res.status(400).json({ success: false, message: 'templateType required' });

    let data = prospectData || {};
    if (prospectId && !prospectData) {
      const found = await Prospect.findById(prospectId).lean();
      if (found) data = found;
    }

    const result = await generateEmailWithAI(templateType, data);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Send with custom (AI-generated + possibly edited) content
export const sendProspectEmails = async (req, res) => {
  try {
    const { prospectIds, customRecipients, subject, bodyText, templateType, templateId } = req.body;

    const hasIds    = Array.isArray(prospectIds)       && prospectIds.length > 0;
    const hasCustom = Array.isArray(customRecipients)  && customRecipients.length > 0;
    if (!hasIds && !hasCustom)
      return res.status(400).json({ success: false, message: 'Provide prospectIds[] or customRecipients[]' });

    // DB prospects
    const dbProspects = hasIds ? await Prospect.find({ _id: { $in: prospectIds } }) : [];

    // Manual recipients shaped like prospect objects (no _id — history skipped)
    const manualProspects = hasCustom
      ? customRecipients
          .filter(r => r.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email))
          .map(r => ({
            _id:               null,
            companyName:       r.name || r.email,
            contactPersonName: r.name || '',
            primaryEmail:      r.email,
          }))
      : [];

    const allProspects = [...dbProspects, ...manualProspects];
    if (!allProspects.length)
      return res.status(404).json({ success: false, message: 'No valid recipients found' });

    const sentBy = req.admin?.name || req.admin?.email || 'Admin';

    if (subject && bodyText) {
      const results = await sendBulkCustomEmails(allProspects, { subject, bodyText, templateType: templateType || 'custom' }, sentBy);
      return res.json({
        success: true,
        message: `Sent: ${results.sent}, failed: ${results.failed}, no email: ${results.noEmail}`,
        data: results,
      });
    }

    if (!templateId)
      return res.status(400).json({ success: false, message: 'Provide subject+bodyText or templateId' });
    const results = await sendBulkProspectEmails(allProspects, templateId, sentBy);
    res.json({
      success: true,
      message: `Sent: ${results.sent}, failed: ${results.failed}, no email: ${results.noEmail}`,
      data: results,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const quickAddProspect = async (req, res) => {
  try {
    const { email, companyName } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ success: false, message: 'Valid email required' });

    const name = (companyName || '').trim() || email;

    const prospect = await Prospect.findOneAndUpdate(
      { primaryEmail: email.toLowerCase().trim() },
      {
        $setOnInsert: {
          companyName:  name,
          primaryEmail: email.toLowerCase().trim(),
          dataSource:   ['manual'],
          priority:     'medium',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, data: prospect, isNew: !prospect.createdAt || Date.now() - prospect.createdAt < 5000 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getProspectEmailHistory = async (req, res) => {
  try {
    const prospect = await Prospect.findById(req.params.id)
      .select('companyName primaryEmail emailHistory').lean();
    if (!prospect) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: prospect });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
