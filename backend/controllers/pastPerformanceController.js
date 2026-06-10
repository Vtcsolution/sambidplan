import PastPerformance from '../models/PastPerformance.js';

const fmt = (num) => num ? `$${Number(num).toLocaleString()}` : 'N/A';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: '2-digit', year: 'numeric' }) : 'Present';

// Format one record as SF-330-style plain text for copy/export
const formatSF330 = (r) => {
  const lines = [
    `PROJECT TITLE: ${r.projectTitle}`,
    r.contractNumber   ? `CONTRACT NUMBER: ${r.contractNumber}` : null,
    r.taskOrderNumber  ? `TASK ORDER: ${r.taskOrderNumber}`      : null,
    `CONTRACT TYPE: ${r.contractType}`,
    ``,
    `CUSTOMER: ${r.agencyName}${r.subAgency ? ` / ${r.subAgency}` : ''}${r.officeName ? ` — ${r.officeName}` : ''}`,
    `ROLE: ${r.role}${r.role !== 'Prime' && r.primeContractorName ? ` (Prime: ${r.primeContractorName})` : ''}`,
    r.placeOfPerformance ? `PLACE OF PERFORMANCE: ${r.placeOfPerformance}` : null,
    r.naicsCode          ? `NAICS: ${r.naicsCode}`                          : null,
    r.setAside           ? `SET-ASIDE: ${r.setAside}`                       : null,
    ``,
    `PERIOD OF PERFORMANCE: ${fmtDate(r.startDate)} – ${fmtDate(r.endDate)}`,
    `CONTRACT VALUE: ${fmt(r.finalValue || r.originalValue)}${r.originalValue && r.finalValue && r.originalValue !== r.finalValue ? ` (original: ${fmt(r.originalValue)})` : ''}`,
    ``,
    `DESCRIPTION:`,
    r.scopeSummary,
  ];

  if (r.keyDeliverables?.length) {
    lines.push(``, `KEY DELIVERABLES:`);
    r.keyDeliverables.forEach(d => lines.push(`• ${d}`));
  }

  if (r.technologiesUsed?.length) {
    lines.push(``, `TECHNOLOGIES / SKILLS: ${r.technologiesUsed.join(', ')}`);
  }

  if (r.cparsRating && r.cparsRating !== 'Not Rated') {
    lines.push(``, `PERFORMANCE RATING: ${r.cparsRating}`);
  }

  if (r.pocName) {
    lines.push(``, `POINT OF CONTACT:`);
    lines.push(`${r.pocName}${r.pocTitle ? `, ${r.pocTitle}` : ''}`);
    if (r.pocEmail) lines.push(r.pocEmail);
    if (r.pocPhone) lines.push(r.pocPhone);
  }

  if (r.keyPersonnel?.length) {
    lines.push(``, `KEY PERSONNEL:`);
    r.keyPersonnel.forEach(p => {
      lines.push(`• ${p.name}${p.title ? ` — ${p.title}` : ''}${p.clearance ? ` (${p.clearance})` : ''}`);
    });
  }

  return lines.filter(l => l !== null).join('\n');
};

// ── GET all for user ──────────────────────────────────────────────────────────
export const getAll = async (req, res) => {
  try {
    const { search, agency, naics, role, rating } = req.query;
    const filter = { user: req.user._id };

    if (agency) filter.agencyName = { $regex: agency, $options: 'i' };
    if (naics)  filter.naicsCode  = naics;
    if (role)   filter.role       = role;
    if (rating) filter.cparsRating = rating;
    if (search) {
      filter.$or = [
        { projectTitle:   { $regex: search, $options: 'i' } },
        { agencyName:     { $regex: search, $options: 'i' } },
        { contractNumber: { $regex: search, $options: 'i' } },
        { scopeSummary:   { $regex: search, $options: 'i' } },
        { tags:           { $in: [new RegExp(search, 'i')] } },
      ];
    }

    const records = await PastPerformance.find(filter).sort({ endDate: -1, createdAt: -1 });
    res.json({ success: true, data: records, total: records.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET one ───────────────────────────────────────────────────────────────────
export const getOne = async (req, res) => {
  try {
    const record = await PastPerformance.findOne({ _id: req.params.id, user: req.user._id });
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── CREATE ────────────────────────────────────────────────────────────────────
export const create = async (req, res) => {
  try {
    const record = await PastPerformance.create({ ...req.body, user: req.user._id });
    res.status(201).json({ success: true, data: record });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── UPDATE ────────────────────────────────────────────────────────────────────
export const update = async (req, res) => {
  try {
    const record = await PastPerformance.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── DELETE ────────────────────────────────────────────────────────────────────
export const remove = async (req, res) => {
  try {
    const record = await PastPerformance.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── EXPORT single as formatted text ──────────────────────────────────────────
export const exportOne = async (req, res) => {
  try {
    const record = await PastPerformance.findOne({ _id: req.params.id, user: req.user._id }).lean();
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

    // Increment usage counter
    await PastPerformance.updateOne(
      { _id: record._id },
      { $inc: { usedInProposals: 1 }, $set: { lastUsedAt: new Date() } }
    );

    const text = formatSF330(record);
    res.json({ success: true, data: { text, record } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── EXPORT all as combined text ───────────────────────────────────────────────
export const exportAll = async (req, res) => {
  try {
    const ids = req.body.ids; // optional array of specific IDs
    const filter = { user: req.user._id };
    if (Array.isArray(ids) && ids.length) filter._id = { $in: ids };

    const records = await PastPerformance.find(filter).sort({ endDate: -1 }).lean();
    if (!records.length) return res.status(404).json({ success: false, message: 'No records found' });

    const text = records.map((r, i) => `${'─'.repeat(60)}\nRECORD ${i + 1} OF ${records.length}\n${'─'.repeat(60)}\n${formatSF330(r)}`).join('\n\n');
    res.json({ success: true, data: { text, count: records.length } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
