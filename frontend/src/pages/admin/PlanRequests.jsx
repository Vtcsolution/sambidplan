// frontend/src/pages/admin/AdminPlans.jsx
import { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  CheckCircle,
  XCircle,
  DollarSign,
  Eye,
  EyeOff,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';

export default function PlanRequests() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    priceMonthly: 0,
    priceYearly: 0,
    features: [],
    limits: {
      maxSavedOpportunities: 10,
      maxAlerts: 5,
      aiProposals: false,
      prioritySupport: false,
      apiAccess: false
    },
    order: 0,
    isActive: true
  });
  const [featureInput, setFeatureInput] = useState('');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminAPI.getPlans();
      if (response.data.success) {
        setPlans(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      setError(error.response?.data?.message || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFeature = () => {
    if (featureInput.trim()) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, { name: featureInput.trim(), included: true }]
      }));
      setFeatureInput('');
    }
  };

  const handleRemoveFeature = (index) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const handleToggleFeature = (index) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.map((f, i) => 
        i === index ? { ...f, included: !f.included } : f
      )
    }));
  };

  const handleOpenModal = (plan = null) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        name: plan.name,
        displayName: plan.displayName,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        features: plan.features || [],
        limits: plan.limits || {
          maxSavedOpportunities: 10,
          maxAlerts: 5,
          aiProposals: false,
          prioritySupport: false,
          apiAccess: false
        },
        order: plan.order,
        isActive: plan.isActive
      });
    } else {
      setEditingPlan(null);
      setFormData({
        name: '',
        displayName: '',
        description: '',
        priceMonthly: 0,
        priceYearly: 0,
        features: [],
        limits: {
          maxSavedOpportunities: 10,
          maxAlerts: 5,
          aiProposals: false,
          prioritySupport: false,
          apiAccess: false
        },
        order: plans.length + 1,
        isActive: true
      });
    }
    setShowModal(true);
  };

  const handleSavePlan = async () => {
    try {
      let response;
      if (editingPlan) {
        response = await adminAPI.updatePlan(editingPlan._id, formData);
        if (response.data.success) {
          alert('Plan updated successfully!');
        }
      } else {
        response = await adminAPI.createPlan(formData);
        if (response.data.success) {
          alert('Plan created successfully!');
        }
      }
      setShowModal(false);
      fetchPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
      alert(error.response?.data?.message || 'Failed to save plan');
    }
  };

  const handleDeletePlan = async (plan) => {
    if (window.confirm(`Are you sure you want to delete "${plan.displayName}" plan?`)) {
      try {
        await adminAPI.deletePlan(plan._id);
        alert('Plan deleted successfully');
        fetchPlans();
      } catch (error) {
        console.error('Error deleting plan:', error);
        alert(error.response?.data?.message || 'Failed to delete plan');
      }
    }
  };

  const handleToggleStatus = async (plan) => {
    try {
      await adminAPI.togglePlanStatus(plan._id);
      fetchPlans();
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Failed to toggle plan status');
    }
  };

  const getPlanBadgeColor = (planName) => {
    switch(planName) {
      case 'free': return 'bg-gray-100 text-gray-700';
      case 'starter': return 'bg-blue-100 text-blue-700';
      case 'pro': return 'bg-purple-100 text-purple-700';
      case 'enterprise': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Plan Management</h1>
          <p className="text-gray-600 mt-1">Manage subscription plans and pricing</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchPlans}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <Button
            variant="primary"
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add New Plan
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-700 font-medium">Error loading plans</p>
            <p className="text-red-600 text-sm">{error}</p>
            <button 
              onClick={fetchPlans}
              className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Try Again →
            </button>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <Card key={plan._id} className={`relative ${!plan.isActive ? 'opacity-60' : ''}`}>
            {!plan.isActive && (
              <div className="absolute top-2 right-2">
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">Inactive</span>
              </div>
            )}
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{plan.displayName}</h3>
                  <p className="text-xs text-gray-500 mt-1">{plan.name}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPlanBadgeColor(plan.name)}`}>
                  {plan.name}
                </span>
              </div>
              
              <div className="mb-4">
                <p className="text-3xl font-bold text-gray-900">${plan.priceMonthly}</p>
                <p className="text-sm text-gray-500">/month</p>
                <p className="text-sm text-gray-500 mt-1">or ${plan.priceYearly}/year</p>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
              
              <div className="space-y-1 mb-4">
                {plan.features?.slice(0, 4).map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    {feature.included ? (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    ) : (
                      <XCircle className="w-3 h-3 text-gray-300" />
                    )}
                    <span className={feature.included ? 'text-gray-600' : 'text-gray-400'}>
                      {feature.name}
                    </span>
                  </div>
                ))}
                {plan.features?.length > 4 && (
                  <p className="text-xs text-gray-400">+{plan.features.length - 4} more features</p>
                )}
              </div>
              
              <div className="flex gap-2 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleOpenModal(plan)}
                  className="flex-1 px-3 py-2 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-1"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleToggleStatus(plan)}
                  className="px-3 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {plan.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleDeletePlan(plan)}
                  className="px-3 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                  disabled={plan.name === 'free' || plan.name === 'starter' || plan.name === 'pro'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add/Edit Plan Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {editingPlan ? 'Edit Plan' : 'Create New Plan'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name (slug)</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="free, starter, pro, enterprise"
                    disabled={!!editingPlan}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Free, Starter, Pro, Enterprise"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                  placeholder="Plan description"
                />
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Price ($)</label>
                  <input
                    type="number"
                    value={formData.priceMonthly}
                    onChange={(e) => setFormData({...formData, priceMonthly: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yearly Price ($)</label>
                  <input
                    type="number"
                    value={formData.priceYearly}
                    onChange={(e) => setFormData({...formData, priceYearly: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Features */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Features</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter feature name"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddFeature()}
                  />
                  <button
                    onClick={handleAddFeature}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Add
                  </button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-2">
                  {formData.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleFeature(idx)}
                          className="p-1"
                        >
                          {feature.included ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-gray-300" />
                          )}
                        </button>
                        <span className={feature.included ? 'text-gray-700' : 'text-gray-400'}>
                          {feature.name}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveFeature(idx)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Limits */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Plan Limits</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Max Saved Opportunities</label>
                    <input
                      type="number"
                      value={formData.limits.maxSavedOpportunities}
                      onChange={(e) => setFormData({
                        ...formData,
                        limits: {...formData.limits, maxSavedOpportunities: parseInt(e.target.value) || 0}
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">(-1 for unlimited)</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Max Alerts</label>
                    <input
                      type="number"
                      value={formData.limits.maxAlerts}
                      onChange={(e) => setFormData({
                        ...formData,
                        limits: {...formData.limits, maxAlerts: parseInt(e.target.value) || 0}
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">(-1 for unlimited)</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.limits.aiProposals}
                      onChange={(e) => setFormData({
                        ...formData,
                        limits: {...formData.limits, aiProposals: e.target.checked}
                      })}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">AI Proposals</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.limits.prioritySupport}
                      onChange={(e) => setFormData({
                        ...formData,
                        limits: {...formData.limits, prioritySupport: e.target.checked}
                      })}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Priority Support</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.limits.apiAccess}
                      onChange={(e) => setFormData({
                        ...formData,
                        limits: {...formData.limits, apiAccess: e.target.checked}
                      })}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">API Access</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({...formData, order: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 mt-6">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSavePlan}
              >
                <Save className="w-4 h-4 mr-2" />
                {editingPlan ? 'Update Plan' : 'Create Plan'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}