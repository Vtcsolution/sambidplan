// backend/controllers/savedController.js
import SavedOpportunity from '../models/SavedOpportunity.js';
import Opportunity from '../models/Opportunity.js';

// @desc    Save an opportunity
// @route   POST /api/saved
export const saveOpportunity = async (req, res) => {
  try {
    const { opportunityId, notes } = req.body;
    const userId = req.user._id;

    // Check if opportunity exists
    const opportunity = await Opportunity.findById(opportunityId);
    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }

    // Check if already saved
    const existing = await SavedOpportunity.findOne({ user: userId, opportunity: opportunityId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Opportunity already saved' });
    }

    // Check plan limits (free users: max 10 saved)
    if (req.user.plan === 'free') {
      const savedCount = await SavedOpportunity.countDocuments({ user: userId });
      if (savedCount >= 10) {
        return res.status(403).json({ 
          success: false, 
          message: 'Free plan allows only 10 saved opportunities. Upgrade to Pro for unlimited.'
        });
      }
    }

    const saved = await SavedOpportunity.create({
      user: userId,
      opportunity: opportunityId,
      notes: notes || '',
      status: 'saved'
    });

    res.status(201).json({
      success: true,
      data: saved,
      message: 'Opportunity saved successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all saved opportunities for current user
// @route   GET /api/saved
export const getSavedOpportunities = async (req, res) => {
  try {
    const saved = await SavedOpportunity.find({ user: req.user._id })
      .populate('opportunity')
      .sort({ savedAt: -1 });

    res.json({
      success: true,
      data: saved,
      count: saved.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single saved opportunity
// @route   GET /api/saved/:id
export const getSavedOpportunityById = async (req, res) => {
  try {
    const saved = await SavedOpportunity.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('opportunity');

    if (!saved) {
      return res.status(404).json({ success: false, message: 'Saved opportunity not found' });
    }

    res.json({ success: true, data: saved });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove saved opportunity
// @route   DELETE /api/saved/:id
export const unsaveOpportunity = async (req, res) => {
  try {
    const saved = await SavedOpportunity.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!saved) {
      return res.status(404).json({ success: false, message: 'Saved opportunity not found' });
    }

    res.json({ success: true, message: 'Opportunity removed from saved' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const PIPELINE_STAGES = ['saved', 'researching', 'proposal_draft', 'submitted', 'won', 'lost'];

// @desc    Update saved opportunity status + notes (pipeline move)
// @route   PUT /api/saved/:id
export const updateSavedStatus = async (req, res) => {
  try {
    const { status, notes, pipelineNotes } = req.body;

    if (status && !PIPELINE_STAGES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const updateData = { movedAt: new Date() };
    if (status)                    updateData.status        = status;
    if (notes        !== undefined) updateData.notes         = notes;
    if (pipelineNotes !== undefined) updateData.pipelineNotes = pipelineNotes;

    const saved = await SavedOpportunity.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      updateData,
      { new: true }
    ).populate('opportunity');

    if (!saved) {
      return res.status(404).json({ success: false, message: 'Saved opportunity not found' });
    }

    res.json({ success: true, data: saved });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get full pipeline grouped by stage + stats
// @route   GET /api/saved/pipeline
export const getPipeline = async (req, res) => {
  try {
    const all = await SavedOpportunity.find({ user: req.user._id })
      .populate('opportunity', 'title agency dueDate estimatedValue naicsCode setAside aiMatchScore url')
      .sort({ movedAt: -1 })
      .lean();

    // Group by status
    const grouped = {};
    PIPELINE_STAGES.forEach(s => { grouped[s] = []; });
    all.forEach(item => {
      const stage = PIPELINE_STAGES.includes(item.status) ? item.status : 'saved';
      grouped[stage].push({
        _id:           item._id,
        status:        stage,
        pipelineNotes: item.pipelineNotes || '',
        notes:         item.notes || '',
        savedAt:       item.savedAt,
        movedAt:       item.movedAt,
        opportunity:   item.opportunity
      });
    });

    // Stats
    const now = new Date();
    const activeStages = ['researching', 'proposal_draft', 'submitted'];
    const activeItems = activeStages.flatMap(s => grouped[s]);
    const pipelineValue  = activeItems.reduce((sum, i) => sum + (i.opportunity?.estimatedValue || 0), 0);
    const wonCount       = grouped.won.length;
    const lostCount      = grouped.lost.length;
    const winRate        = (wonCount + lostCount) > 0
      ? Math.round((wonCount / (wonCount + lostCount)) * 100)
      : null;

    // Urgent: due within 7 days in active stages
    const urgentCount = activeItems.filter(i => {
      if (!i.opportunity?.dueDate) return false;
      const days = Math.ceil((new Date(i.opportunity.dueDate) - now) / 86400000);
      return days >= 0 && days <= 7;
    }).length;

    res.json({
      success: true,
      data: {
        columns: grouped,
        stats: {
          total:         all.length,
          pipelineValue,
          active:        activeItems.length,
          submitted:     grouped.submitted.length,
          won:           wonCount,
          lost:          lostCount,
          winRate,
          urgentCount
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Check if opportunity is saved
// @route   GET /api/saved/check/:opportunityId
export const checkSaved = async (req, res) => {
  try {
    const saved = await SavedOpportunity.findOne({
      user: req.user._id,
      opportunity: req.params.opportunityId
    });

    res.json({
      success: true,
      isSaved: !!saved,
      savedId: saved?._id || null
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};