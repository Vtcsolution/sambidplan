import { useState, useEffect } from 'react';
import { Building2, CheckCircle, XCircle, Loader, ShieldCheck, AlertTriangle, Plus, Trash2, Globe, Phone, MapPin, Save } from 'lucide-react';
import { companyAPI } from '../../services/api';
import { useUserPlan } from '../../hooks/useUserPlan';
import PlanGate from '../../components/PlanGate';

const CERT_OPTIONS = [
  { value: '8a',      label: '8(a) Business Development' },
  { value: 'wosb',    label: 'Woman-Owned Small Business (WOSB)' },
  { value: 'edwosb',  label: 'Economically Disadvantaged WOSB' },
  { value: 'hubzone', label: 'HUBZone' },
  { value: 'sdvosb',  label: 'Service-Disabled Veteran-Owned (SDVOSB)' },
  { value: 'vosb',    label: 'Veteran-Owned Small Business (VOSB)' },
  { value: 'sdb',     label: 'Small Disadvantaged Business (SDB)' },
  { value: 'other',   label: 'Other' },
];

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'];

// ── Validation rules ──────────────────────────────────────────────────────────
const LIMITS = {
  name:         { max: 100 },
  uei:          { min: 12, max: 12 },
  cage:         { min: 5,  max: 5  },
  website:      { max: 200 },
  phone:        { max: 20 },
  street:       { max: 100 },
  city:         { max: 50 },
  zip:          { max: 10 },
  naics:        { min: 6, max: 6 },
  capabilities: { max: 1000 },
};

function stripToAlphanumeric(val) { return val.replace(/[^a-zA-Z0-9]/g, ''); }
function stripToDigits(val)       { return val.replace(/\D/g, ''); }
function stripToPhone(val)        { return val.replace(/[^0-9()\-+\s]/g, ''); }
function stripToLettersSpaces(val){ return val.replace(/[^a-zA-Z\s'-]/g, ''); }
function stripToAlphaNum(val)     { return val.replace(/[^a-zA-Z0-9\s\-&.,]/g, ''); }

function validate(form) {
  const e = {};
  if (!form.name.trim())                   e.name    = 'Company name is required.';
  else if (form.name.length > LIMITS.name.max) e.name = `Max ${LIMITS.name.max} characters.`;

  if (form.uei && form.uei.length !== LIMITS.uei.min)
    e.uei = `UEI must be exactly ${LIMITS.uei.min} characters.`;

  if (form.cage && form.cage.length !== LIMITS.cage.min)
    e.cage = `CAGE code must be exactly ${LIMITS.cage.min} characters.`;

  if (form.website && !/^https?:\/\/.+\..+/.test(form.website))
    e.website = 'Enter a valid URL (e.g. https://yourcompany.com).';

  if (form.phone && form.phone.replace(/\D/g,'').length < 7)
    e.phone = 'Enter a valid phone number.';

  const zip = form.address.zip;
  if (zip && !/^\d{5}(-\d{4})?$/.test(zip))
    e.zip = 'Enter a valid ZIP (e.g. 90210 or 90210-1234).';

  if (form.capabilities.length > LIMITS.capabilities.max)
    e.capabilities = `Max ${LIMITS.capabilities.max} characters.`;

  return e;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
      {msg}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">×</button>
    </div>
  );
}

function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="text-xs text-red-500 mt-1">{msg}</p>;
}

function CharCount({ current, max }) {
  const near = current >= max * 0.85;
  const over  = current > max;
  return (
    <span className={`text-xs ${over ? 'text-red-500 font-semibold' : near ? 'text-amber-500' : 'text-gray-400'}`}>
      {current}/{max}
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function CompanyProfile() {
  const { plan, loading: planLoading } = useUserPlan();
  const [company,   setCompany]   = useState(null);
  const [myRole,    setMyRole]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [creating,  setCreating]  = useState(false);
  const [toast,     setToast]     = useState(null);
  const [errors,    setErrors]    = useState({});

  const [form, setForm] = useState({
    name: '', uei: '', cage: '', website: '', phone: '',
    capabilities: '',
    address: { street: '', city: '', state: '', zip: '' },
    naicsCodes: [],
    certifications: [],
  });
  const [naicsInput, setNaicsInput] = useState('');
  const [naicsError, setNaicsError] = useState('');

  useEffect(() => { loadCompany(); }, []);

  const loadCompany = async () => {
    setLoading(true);
    try {
      const res = await companyAPI.getMine();
      if (res.data.success) {
        setCompany(res.data.data);
        setMyRole(res.data.myRole);
        const c = res.data.data;
        setForm({
          name:           c.name || '',
          uei:            c.uei || '',
          cage:           c.cage || '',
          website:        c.website || '',
          phone:          c.phone || '',
          capabilities:   c.capabilities || '',
          address:        c.address || { street: '', city: '', state: '', zip: '' },
          naicsCodes:     c.naicsCodes || [],
          certifications: c.certifications || [],
        });
      }
    } catch (err) {
      if (err.response?.status !== 404) showToast(err.response?.data?.message || 'Failed to load company.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = 'success') => setToast({ msg, type });
  const canEdit = ['owner', 'admin'].includes(myRole) || !company;

  const handleCreate = async () => {
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); showToast('Please fix the errors before saving.', 'error'); return; }
    setErrors({});
    setCreating(true);
    try {
      const res = await companyAPI.create(form);
      setCompany(res.data.data);
      setMyRole('owner');
      showToast('Company workspace created!');
    } catch (err) {
      showToast(err.response?.data?.message || 'Create failed.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); showToast('Please fix the errors before saving.', 'error'); return; }
    setErrors({});
    setSaving(true);
    try {
      const res = await companyAPI.update(form);
      setCompany(res.data.data);
      showToast('Company profile saved!');
    } catch (err) {
      showToast(err.response?.data?.message || 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyUEI = async () => {
    if (form.uei.length !== 12) { setErrors(p => ({ ...p, uei: 'UEI must be exactly 12 characters.' })); return; }
    setVerifying(true);
    try {
      const res = await companyAPI.verifyUEI({ uei: form.uei });
      if (res.data.verified) { showToast('UEI verified with SAM.gov!'); loadCompany(); }
      else showToast(res.data.message, 'error');
    } catch (err) {
      showToast(err.response?.data?.message || 'Verification failed.', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const addNaics = () => {
    const code = stripToDigits(naicsInput).slice(0, 6);
    if (!code) { setNaicsError('Enter a NAICS code.'); return; }
    if (code.length !== 6) { setNaicsError('NAICS code must be exactly 6 digits.'); return; }
    if (form.naicsCodes.includes(code)) { setNaicsError('This NAICS code is already added.'); return; }
    if (form.naicsCodes.length >= 10) { setNaicsError('Maximum 10 NAICS codes allowed.'); return; }
    setForm(p => ({ ...p, naicsCodes: [...p.naicsCodes, code] }));
    setNaicsInput('');
    setNaicsError('');
  };

  const toggleCert = (type) => {
    setForm(p => {
      const exists = p.certifications.find(c => c.type === type);
      return {
        ...p,
        certifications: exists
          ? p.certifications.filter(c => c.type !== type)
          : [...p.certifications, { type, name: CERT_OPTIONS.find(o => o.value === type)?.label || type }],
      };
    });
  };

  // ── Field change handlers with inline sanitization ─────────────────────────
  const setField = (key, val) => {
    setForm(p => ({ ...p, [key]: val }));
    if (errors[key]) setErrors(p => ({ ...p, [key]: '' }));
  };

  const setAddress = (key, val) => {
    setForm(p => ({ ...p, address: { ...p.address, [key]: val } }));
    if (errors[key]) setErrors(p => ({ ...p, [key]: '' }));
  };

  if (loading || planLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader className="w-7 h-7 text-indigo-600 animate-spin" />
    </div>
  );

  if (plan === 'free') {
    return (
      <PlanGate
        requiredPlan="starter"
        featureName="Company Workspace"
        description="Create your company profile, verify your SAM.gov UEI, and manage certifications. Available on Starter plan and above."
      />
    );
  }

  const inputCls = (err) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 disabled:bg-gray-50 ${err ? 'border-red-400 focus:ring-red-300' : 'border-gray-200 focus:ring-indigo-400'}`;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Company Profile</h1>
              <p className="text-sm text-gray-500">
                {company ? `Your workspace · ${myRole.replace('_',' ')}` : 'Set up your company workspace'}
              </p>
            </div>
          </div>
          {company && canEdit && (
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 transition">
              {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          )}
        </div>

        {/* No company yet */}
        {!company && (
          <div className="bg-white rounded-2xl border border-dashed border-indigo-200 p-10 text-center">
            <Building2 className="w-14 h-14 text-indigo-200 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Create Your Company Workspace</h2>
            <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
              A shared workspace lets your team collaborate on bids, share documents, and manage proposals together.
            </p>
            <div className="max-w-sm mx-auto mb-4 text-left">
              <div className="mb-3">
                <input
                  value={form.name}
                  onChange={e => setField('name', stripToAlphaNum(e.target.value).slice(0, LIMITS.name.max))}
                  placeholder="Your company legal name *"
                  className={inputCls(errors.name)}
                />
                <div className="flex justify-between mt-1">
                  <FieldError msg={errors.name} />
                  <CharCount current={form.name.length} max={LIMITS.name.max} />
                </div>
              </div>
              <button onClick={handleCreate} disabled={creating}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50 transition flex items-center justify-center gap-2">
                {creating ? <><Loader className="w-4 h-4 animate-spin" /> Creating…</> : 'Create Workspace'}
              </button>
            </div>
          </div>
        )}

        {/* Company exists */}
        {company && (
          <>
            {/* UEI Verification Banner */}
            <div className={`flex items-start gap-3 p-4 rounded-xl border ${company.ueiVerified ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
              {company.ueiVerified
                ? <ShieldCheck className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                : <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              }
              <div className="flex-1 min-w-0">
                {company.ueiVerified ? (
                  <>
                    <p className="font-semibold text-green-800 text-sm">SAM.gov Verified</p>
                    <p className="text-green-700 text-xs mt-0.5">{company.ueiData?.legalBusinessName} · Verified {company.ueiVerifiedAt ? new Date(company.ueiVerifiedAt).toLocaleDateString() : ''}</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-amber-800 text-sm">UEI Not Verified</p>
                    <p className="text-amber-700 text-xs mt-0.5">Add your SAM.gov UEI number below and click Verify to confirm your registration.</p>
                  </>
                )}
              </div>
            </div>

            {/* Basic Info */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <h2 className="font-bold text-gray-900">Basic Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Company Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Legal Company Name *</label>
                  <input
                    value={form.name}
                    disabled={!canEdit}
                    onChange={e => setField('name', stripToAlphaNum(e.target.value).slice(0, LIMITS.name.max))}
                    className={inputCls(errors.name)}
                  />
                  <div className="flex justify-between mt-1">
                    <FieldError msg={errors.name} />
                    <CharCount current={form.name.length} max={LIMITS.name.max} />
                  </div>
                </div>

                {/* UEI */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    SAM.gov UEI <span className="text-gray-400 font-normal">(exactly 12 chars)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={form.uei}
                      disabled={!canEdit}
                      onChange={e => {
                        const val = stripToAlphanumeric(e.target.value).toUpperCase().slice(0, 12);
                        setField('uei', val);
                      }}
                      placeholder="e.g. JF19K3S4ZTJ3"
                      className={`flex-1 font-mono ${inputCls(errors.uei)}`}
                    />
                    {canEdit && (
                      <button onClick={handleVerifyUEI} disabled={verifying || form.uei.length !== 12}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition whitespace-nowrap">
                        {verifying ? <Loader className="w-3.5 h-3.5 animate-spin" /> : 'Verify'}
                      </button>
                    )}
                  </div>
                  <div className="flex justify-between mt-1">
                    <FieldError msg={errors.uei} />
                    <CharCount current={form.uei.length} max={12} />
                  </div>
                </div>

                {/* CAGE Code */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    CAGE Code <span className="text-gray-400 font-normal">(exactly 5 chars)</span>
                  </label>
                  <input
                    value={form.cage}
                    disabled={!canEdit}
                    onChange={e => {
                      const val = stripToAlphanumeric(e.target.value).toUpperCase().slice(0, 5);
                      setField('cage', val);
                    }}
                    placeholder="e.g. 4F3R2"
                    className={`font-mono ${inputCls(errors.cage)}`}
                  />
                  <div className="flex justify-between mt-1">
                    <FieldError msg={errors.cage} />
                    <CharCount current={form.cage.length} max={5} />
                  </div>
                </div>

                {/* Website */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                    <Globe className="w-3 h-3" /> Website
                  </label>
                  <input
                    value={form.website}
                    disabled={!canEdit}
                    onChange={e => setField('website', e.target.value.slice(0, LIMITS.website.max))}
                    placeholder="https://yourcompany.com"
                    type="url"
                    className={inputCls(errors.website)}
                  />
                  <FieldError msg={errors.website} />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Phone
                  </label>
                  <input
                    value={form.phone}
                    disabled={!canEdit}
                    onChange={e => setField('phone', stripToPhone(e.target.value).slice(0, LIMITS.phone.max))}
                    placeholder="(555) 000-0000"
                    type="tel"
                    className={inputCls(errors.phone)}
                  />
                  <FieldError msg={errors.phone} />
                </div>

              </div>
            </div>

            {/* Address */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-500" /> Business Address
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Street Address</label>
                  <input
                    value={form.address.street}
                    disabled={!canEdit}
                    onChange={e => setAddress('street', e.target.value.slice(0, LIMITS.street.max))}
                    placeholder="123 Main St, Suite 400"
                    className={inputCls(errors.street)}
                  />
                  <div className="flex justify-between mt-1">
                    <FieldError msg={errors.street} />
                    <CharCount current={form.address.street.length} max={LIMITS.street.max} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">City</label>
                  <input
                    value={form.address.city}
                    disabled={!canEdit}
                    onChange={e => setAddress('city', stripToLettersSpaces(e.target.value).slice(0, LIMITS.city.max))}
                    placeholder="Washington"
                    className={inputCls(errors.city)}
                  />
                  <div className="flex justify-between mt-1">
                    <FieldError msg={errors.city} />
                    <CharCount current={form.address.city.length} max={LIMITS.city.max} />
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">State</label>
                    <select
                      value={form.address.state}
                      disabled={!canEdit}
                      onChange={e => setAddress('state', e.target.value)}
                      className={inputCls(errors.state)}
                    >
                      <option value="">Select State</option>
                      {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="w-28">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">ZIP</label>
                    <input
                      value={form.address.zip}
                      disabled={!canEdit}
                      onChange={e => {
                        const raw = e.target.value.replace(/[^0-9-]/g, '').slice(0, 10);
                        setAddress('zip', raw);
                      }}
                      placeholder="90210"
                      className={inputCls(errors.zip)}
                    />
                    <FieldError msg={errors.zip} />
                  </div>
                </div>

              </div>
            </div>

            {/* NAICS Codes */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900">NAICS Codes</h2>
                <span className="text-xs text-gray-400">{form.naicsCodes.length}/10 codes</span>
              </div>
              {form.naicsCodes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.naicsCodes.map(code => (
                    <span key={code} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium">
                      {code}
                      {canEdit && (
                        <button
                          onClick={() => setForm(p => ({ ...p, naicsCodes: p.naicsCodes.filter(c => c !== code) }))}
                          className="ml-1 text-indigo-400 hover:text-indigo-700">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}
              {canEdit && form.naicsCodes.length < 10 && (
                <div>
                  <div className="flex gap-2">
                    <input
                      value={naicsInput}
                      onChange={e => {
                        setNaicsError('');
                        setNaicsInput(stripToDigits(e.target.value).slice(0, 6));
                      }}
                      onKeyDown={e => e.key === 'Enter' && addNaics()}
                      placeholder="e.g. 541330"
                      className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${naicsError ? 'border-red-400 focus:ring-red-300' : 'border-gray-200 focus:ring-indigo-400'}`}
                    />
                    <button onClick={addNaics}
                      className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
                      <Plus className="w-4 h-4" /> Add
                    </button>
                  </div>
                  <div className="flex justify-between mt-1">
                    <FieldError msg={naicsError} />
                    <span className="text-xs text-gray-400">{naicsInput.length}/6 digits</span>
                  </div>
                </div>
              )}
            </div>

            {/* Certifications */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <h2 className="font-bold text-gray-900">Small Business Certifications</h2>
              <div className="grid sm:grid-cols-2 gap-2">
                {CERT_OPTIONS.map(opt => {
                  const active = form.certifications.some(c => c.type === opt.value);
                  return (
                    <button key={opt.value} disabled={!canEdit}
                      onClick={() => canEdit && toggleCert(opt.value)}
                      className={`text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition ${active ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-indigo-200'} disabled:cursor-not-allowed`}>
                      <div className="flex items-center gap-2">
                        {active
                          ? <CheckCircle className="w-4 h-4 text-indigo-500 shrink-0" />
                          : <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />}
                        {opt.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Core Capabilities */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <h2 className="font-bold text-gray-900">Core Capabilities Statement</h2>
              <textarea
                value={form.capabilities}
                disabled={!canEdit}
                rows={5}
                onChange={e => setField('capabilities', e.target.value.slice(0, LIMITS.capabilities.max))}
                placeholder="Describe your company's core capabilities, differentiators, and expertise for federal contracting…"
                className={`w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none disabled:bg-gray-50 border ${errors.capabilities ? 'border-red-400 focus:ring-red-300' : 'border-gray-200 focus:ring-indigo-400'}`}
              />
              <div className="flex justify-between">
                <FieldError msg={errors.capabilities} />
                <CharCount current={form.capabilities.length} max={LIMITS.capabilities.max} />
              </div>
            </div>

            {canEdit && (
              <button onClick={handleSave} disabled={saving}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50 transition flex items-center justify-center gap-2">
                {saving ? <><Loader className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Company Profile</>}
              </button>
            )}
          </>
        )}
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
