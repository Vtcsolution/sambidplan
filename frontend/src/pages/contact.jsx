import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Mail, Phone, Users, MessageSquare,
  CheckCircle, Loader2, ArrowRight, Clock, AlertCircle, RefreshCw
} from 'lucide-react';
import { contactAPI } from '../services/api';

const EMPLOYEE_OPTIONS = ['1-10', '11-50', '51-200', '201-500', '500+'];

// Only $499+ plans — Starter/Pro are purchased directly on the Pricing page
const PLAN_OPTIONS = [
  { value: 'enterprise', label: 'Enterprise — $499/mo (or $4,788/yr)' },
  { value: 'custom',     label: 'Custom / Enterprise Plus — Custom pricing' },
];

const PREMIUM_PLANS = [
  {
    value: 'enterprise',
    name:  'Enterprise',
    price: '$499',
    period: '/mo',
    badge: 'Most Popular',
    badgeColor: 'bg-indigo-600',
    ring: 'ring-2 ring-indigo-500',
    features: [
      '10,000 daily contract matches',
      'Dedicated account manager',
      'AI proposal generation',
      'Full API access',
      '24/7 priority support',
      'Custom integrations',
      'Unlimited saved opportunities',
      'Advanced competitive analysis',
    ],
  },
  {
    value: 'custom',
    name:  'Custom / Enterprise Plus',
    price: 'Custom',
    period: 'pricing',
    badge: 'For Large Teams',
    badgeColor: 'bg-purple-600',
    ring: 'ring-2 ring-purple-400',
    features: [
      'Unlimited contract matches',
      'Multiple user seats',
      'White-label options',
      'Custom NAICS & agency filters',
      'Dedicated engineering support',
      'SLA guarantee',
      'On-premise / private cloud',
      'Custom data exports & integrations',
    ],
  },
];

const STATUS_CONFIG = {
  new:         { label: 'Received',    color: 'bg-blue-100 text-blue-700 border-blue-200',   icon: Clock,         desc: 'Your inquiry is in the queue. We\'ll be in touch shortly.' },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: RefreshCw, desc: 'Our team is reviewing your request and will contact you soon.' },
  resolved:    { label: 'Resolved',    color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle,  desc: 'Your inquiry has been resolved. Check your email for details.' },
  closed:      { label: 'Closed',      color: 'bg-gray-100 text-gray-600 border-gray-200',   icon: AlertCircle,  desc: 'This inquiry was closed. Submit a new one if you need help.' },
};

function InquiryStatusCard({ inquiry, onNewInquiry }) {
  const cfg = STATUS_CONFIG[inquiry.status] || STATUS_CONFIG.new;
  const Icon = cfg.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center px-4 py-16">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold mb-6 ${cfg.color}`}>
          <Icon className="w-4 h-4" />
          {cfg.label}
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-1">Your Inquiry Status</h2>
        <p className="text-gray-500 text-sm mb-6">{cfg.desc}</p>

        <div className="bg-gray-50 rounded-xl p-5 space-y-3 mb-6 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Plan requested</span>
            <span className="font-medium capitalize">{inquiry.planInterest}</span>
          </div>
          {inquiry.company && (
            <div className="flex justify-between">
              <span className="text-gray-500">Company</span>
              <span className="font-medium">{inquiry.company}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">Submitted</span>
            <span className="font-medium">{new Date(inquiry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Last updated</span>
            <span className="font-medium">{new Date(inquiry.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Admin notes visible to user (if any) */}
        {inquiry.adminNotes && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6">
            <p className="text-xs font-semibold text-indigo-600 uppercase mb-1">Message from our team</p>
            <p className="text-sm text-indigo-900">{inquiry.adminNotes}</p>
          </div>
        )}

        {/* Status steps */}
        <div className="flex items-center gap-2 mb-6">
          {['new', 'in_progress', 'resolved'].map((s, i) => {
            const steps = ['new', 'in_progress', 'resolved'];
            const currentIndex = steps.indexOf(inquiry.status);
            const isActive  = i <= currentIndex;
            const isCurrent = i === currentIndex;
            return (
              <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isActive ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'
                } ${isCurrent ? 'ring-2 ring-indigo-300 ring-offset-1' : ''}`}>
                  {i + 1}
                </div>
                <span className={`text-xs ${isActive ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                  {s === 'new' ? 'Received' : s === 'in_progress' ? 'In Review' : 'Done'}
                </span>
                {i < 2 && <div className={`flex-1 h-px ${isActive && i < currentIndex ? 'bg-indigo-600' : 'bg-gray-200'}`} />}
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <a
            href={`mailto:${inquiry.email}`}
            className="flex-1 text-center py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Contact Support
          </a>
          {['resolved', 'closed'].includes(inquiry.status) && (
            <button
              onClick={onNewInquiry}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
            >
              Submit New Inquiry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Contact() {
  const navigate = useNavigate();
  const isLoggedIn = !!(localStorage.getItem('authToken') || sessionStorage.getItem('authToken'));

  const [existingInquiry, setExistingInquiry] = useState(null);
  const [checkingInquiry, setCheckingInquiry] = useState(isLoggedIn);
  const [forceNew, setForceNew] = useState(false);

  const [form, setForm] = useState({
    name:        localStorage.getItem('userName') || '',
    email:       localStorage.getItem('userEmail') || sessionStorage.getItem('userEmail') || '',
    company:     '',
    phone:       '',
    employees:   '',
    planInterest:'enterprise',
    message:     '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [error,      setError]      = useState('');

  // Check if the logged-in user already has an open inquiry
  useEffect(() => {
    if (!isLoggedIn) { setCheckingInquiry(false); return; }
    contactAPI.myInquiries()
      .then(res => {
        const open = res.data.data?.find(i => !['closed'].includes(i.status));
        if (open) setExistingInquiry(open);
      })
      .catch(() => {})
      .finally(() => setCheckingInquiry(false));
  }, []);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Your name is required.'); return; }
    if (!form.email.trim()) { setError('Email address is required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { setError('Please enter a valid email address.'); return; }
    if (!form.message.trim()) { setError('Message is required.'); return; }
    if (form.message.trim().length < 10) { setError('Please write at least 10 characters in your message.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await contactAPI.submit(form);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state while checking existing inquiry
  if (checkingInquiry) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // Show existing inquiry status (unless user explicitly wants a new one)
  if (existingInquiry && !forceNew) {
    return <InquiryStatusCard inquiry={existingInquiry} onNewInquiry={() => setForceNew(true)} />;
  }

  // Success state after submit
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-9 h-9 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Received!</h2>
          <p className="text-gray-600 mb-2">
            Thank you! We have received your <strong>{form.planInterest === 'custom' ? 'Custom Enterprise' : 'Enterprise ($499/mo · $4,788/yr)'}</strong> plan request.
            Our team will contact you within <strong>1 business day</strong> to activate your plan.
          </p>
          <p className="text-sm text-gray-400 mb-6">A confirmation email has been sent to <strong>{form.email}</strong>.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
          >
            Go to Dashboard <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-10 sm:py-16 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-7 sm:mb-10">
          <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs sm:text-sm font-semibold mb-3">
            Enterprise Plans — $499/mo (or $4,788/yr, save 20%)
          </span>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3">Request an Enterprise Plan</h1>
          <p className="text-gray-600 text-sm sm:text-base md:text-lg">
            Fill in your details below. Our team reviews every request and activates your plan within <strong>1 business day</strong>.
          </p>
          <p className="text-xs sm:text-sm text-gray-400 mt-2">
            Looking for Starter or Pro? <a href="/pricing" className="text-indigo-600 hover:underline">Purchase directly on the Pricing page →</a>
          </p>
        </div>

        {/* Two premium plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {PREMIUM_PLANS.map(plan => (
            <button
              key={plan.value}
              type="button"
              onClick={() => setForm(f => ({ ...f, planInterest: plan.value }))}
              className={`text-left bg-white rounded-2xl p-5 border-2 transition-all cursor-pointer ${
                form.planInterest === plan.value
                  ? 'border-indigo-500 shadow-lg shadow-indigo-100'
                  : 'border-gray-200 hover:border-indigo-300'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className={`inline-block text-xs font-bold text-white px-2 py-0.5 rounded-full mb-1 ${plan.badgeColor}`}>
                    {plan.badge}
                  </span>
                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-2xl font-bold text-indigo-600">
                    {plan.price}<span className="text-sm font-normal text-gray-500">{plan.period}</span>
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 mt-1 flex items-center justify-center shrink-0 ${
                  form.planInterest === plan.value ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'
                }`}>
                  {form.planInterest === plan.value && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              </div>
              <ul className="space-y-1.5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-5 sm:p-8 space-y-5">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Contact Us</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                type="text" name="name" value={form.name} onChange={handleChange}
                placeholder="John Smith"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Email *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email" name="email" value={form.email} onChange={handleChange}
                  placeholder="john@company.com"
                  className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text" name="company" value={form.company} onChange={handleChange}
                  placeholder="Acme Corp"
                  className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel" name="phone" value={form.phone} onChange={handleChange}
                  placeholder="+1 (555) 000-0000"
                  className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Number of Employees</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  name="employees" value={form.employees} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
                >
                  <option value="">Select range</option>
                  {EMPLOYEE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan of Interest</label>
              <select
                name="planInterest" value={form.planInterest} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {PLAN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tell us about your needs</label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <textarea
                name="message" value={form.message} onChange={handleChange}
                rows={4}
                placeholder="Describe your use case, NAICS codes, contract types you target..."
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit" disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-60"
          >
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
              : <>Submit Inquiry <ArrowRight className="w-4 h-4" /></>}
          </button>

          <p className="text-xs text-center text-gray-400">
            We respond within 1 business day. A confirmation email will be sent to you.
          </p>
        </form>
      </div>
    </div>
  );
}
