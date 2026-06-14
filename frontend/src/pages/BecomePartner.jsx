import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  Users, DollarSign, TrendingUp, Gift, CheckCircle, Loader2,
  AlertCircle, ArrowRight, Star, Shield, Zap, Globe, ChevronDown,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const CHANNELS = [
  'LinkedIn / Social Media',
  'Email Outreach',
  'Network / Friends',
  'Content / Blog',
  'YouTube / Video',
  'Events / Conferences',
  'Other',
];

const BENEFITS = [
  { icon: DollarSign, color: 'bg-emerald-100 text-emerald-600', title: '20% Commission', desc: 'Earn 20% on every payment your referred company makes — recurring!' },
  { icon: Gift,       color: 'bg-violet-100 text-violet-600',   title: '20% Discount',  desc: 'Your referred companies get 20% off any plan — makes selling easy.' },
  { icon: TrendingUp, color: 'bg-blue-100 text-blue-600',       title: 'Passive Income', desc: 'Commission keeps coming every billing cycle, not just the first payment.' },
  { icon: Shield,     color: 'bg-amber-100 text-amber-600',     title: 'Withdraw at $100', desc: 'Request a payout once your balance reaches $100 via PayPal or bank.' },
  { icon: Zap,        color: 'bg-pink-100 text-pink-600',       title: 'Instant Dashboard', desc: 'Real-time view of your referrals, conversions, and earnings in your panel.' },
  { icon: Globe,      color: 'bg-teal-100 text-teal-600',       title: 'Work Remotely',  desc: 'No office, no schedule. Refer from anywhere in the world.' },
];

const STEPS = [
  { n: '1', title: 'Apply',        desc: 'Fill out the form below. Takes under 2 minutes.' },
  { n: '2', title: 'Get Approved', desc: 'Our team reviews your application within 2–3 business days.' },
  { n: '3', title: 'Get Your Link', desc: 'Receive login credentials + a unique referral link via email.' },
  { n: '4', title: 'Start Earning', desc: 'Share your link. Earn commissions on every referred company.' },
];

const FAQ = [
  { q: 'Do I need to be a US-based company?',           a: 'No — anyone from anywhere in the world can apply.' },
  { q: 'Is there a sign-up fee?',                       a: 'Absolutely not. Joining the program is 100% free.' },
  { q: 'When do I get paid?',                           a: 'You can request a withdrawal once your balance reaches $100. We process payouts within 3–5 business days.' },
  { q: 'How long does commission last?',                a: 'As long as the referred company keeps their subscription, you keep earning. It is recurring.' },
  { q: 'What counts as a valid referral?',              a: 'A company that signs up via your unique link and purchases any paid plan.' },
  { q: 'Can I refer multiple companies?',               a: 'Yes — there is no limit. The more you refer, the more you earn.' },
];

export default function BecomePartner() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', country: '', experience: '', channels: [], motivation: '',
  });
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error,     setError]     = useState('');
  const [openFaq,   setOpenFaq]   = useState(null);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const toggleChannel = (ch) =>
    setForm(f => ({
      ...f,
      channels: f.channels.includes(ch) ? f.channels.filter(c => c !== ch) : [...f.channels, ch],
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.motivation.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await axios.post(`${API}/partner/apply`, form);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-lg w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h1>
          <p className="text-gray-500 mb-6">
            Thank you, <strong>{form.name}</strong>! We have received your application and sent a confirmation to <strong>{form.email}</strong>.
            Our team will review it and get back to you within <strong>2–3 business days</strong>.
          </p>
          <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition">
            Back to Home <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-900 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Star className="w-3.5 h-3.5 text-amber-300" /> Partner &amp; Affiliate Program
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-5 leading-tight">
            Earn commissions by referring<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-indigo-200">
              US federal contractors
            </span>
          </h1>
          <p className="text-lg text-indigo-200 max-w-2xl mx-auto mb-8">
            Join the Sambid Notify partner program. Share your referral link, help companies
            win government contracts, and earn <strong>20% recurring commission</strong> on every payment.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            {['Free to join', '20% commission', 'Recurring earnings', 'Withdraw at $100'].map(t => (
              <div key={t} className="flex items-center gap-1.5 bg-white/10 rounded-full px-4 py-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-green-300" /> {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits ────────────────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-2">Why join our partner program?</h2>
          <p className="text-gray-500 text-center mb-10">Everything you need to build a sustainable income stream.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {BENEFITS.map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-10">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} className="text-center">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-xl font-bold mx-auto mb-3">
                  {n}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Commission example ──────────────────────────────────────────────── */}
      <section className="py-10 px-4 bg-indigo-50">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6 sm:p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1 text-center">Earnings example</h2>
            <p className="text-gray-500 text-sm text-center mb-6">Based on referring 5 companies on the Pro plan</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              {[
                { label: 'Pro Plan (20% off)',    value: '$758 → $606/yr', color: 'text-indigo-600' },
                { label: 'Your commission (20%)', value: '$121/yr',        color: 'text-emerald-600' },
                { label: '5 companies × $121',    value: '$605/yr',        color: 'text-amber-600' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-gray-50 rounded-xl py-4 px-3">
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 text-center mt-4">Recurring — earned every year while the companies remain subscribed.</p>
          </div>
        </div>
      </section>

      {/* ── Application Form ────────────────────────────────────────────────── */}
      <section id="apply" className="py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-2">Apply to join</h2>
          <p className="text-gray-500 text-center mb-8">Takes 2 minutes. We review every application personally.</p>

          <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-100 shadow-lg p-6 sm:p-8 space-y-5">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={set('name')} placeholder="Jane Smith" required
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email <span className="text-red-500">*</span></label>
                <input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Phone (optional)</label>
                <input value={form.phone} onChange={set('phone')} placeholder="+1 234 567 8900"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Country</label>
                <input value={form.country} onChange={set('country')} placeholder="United States"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Your background / experience (optional)</label>
              <input value={form.experience} onChange={set('experience')}
                placeholder="e.g. 3 years in B2B SaaS sales, consultant to small businesses…"
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">How do you plan to refer companies? (select all that apply)</label>
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map(ch => (
                  <button key={ch} type="button" onClick={() => toggleChannel(ch)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                      form.channels.includes(ch)
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                    }`}>
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Why do you want to join? <span className="text-red-500">*</span>
              </label>
              <textarea value={form.motivation} onChange={set('motivation')} rows={4} required
                placeholder="Tell us a bit about yourself and why you're interested in the Sambid Notify partner program…"
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-60 text-sm">
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                : <><Users className="w-4 h-4" /> Submit Application</>
              }
            </button>

            <p className="text-xs text-gray-400 text-center">
              By submitting you agree to our{' '}
              <Link to="/terms" className="text-indigo-500 hover:underline">Terms of Service</Link>.
              We will never share your information.
            </p>
          </form>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Frequently asked questions</h2>
          <div className="space-y-3">
            {FAQ.map(({ q, a }, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left">
                  <span className="font-medium text-gray-900 text-sm">{q}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4">
                    <p className="text-sm text-gray-600">{a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer CTA ──────────────────────────────────────────────────────── */}
      <section className="py-14 px-4 bg-indigo-600 text-white text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-3">Ready to start earning?</h2>
        <p className="text-indigo-200 mb-6 text-sm">Join hundreds of partners already earning with Sambid Notify.</p>
        <a href="#apply" className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-indigo-700 rounded-xl font-semibold hover:bg-indigo-50 transition text-sm">
          Apply Now <ArrowRight className="w-4 h-4" />
        </a>
      </section>

    </div>
  );
}
