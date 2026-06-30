import { useState, useEffect, useRef } from 'react';
import {
  FileText, Plus, Edit2, Trash2, Save, Loader, X, ChevronDown, ChevronUp,
  Eye, EyeOff, Search, RefreshCw, Sparkles, Play, ExternalLink, CheckCircle, Upload,
  Image
} from 'lucide-react';

const BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000';
function authH() {
  const token = localStorage.getItem('adminToken');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}
async function api(path, method = 'GET', body) {
  const r = await fetch(`${BASE}/api/features${path}`, { method, headers: authH(), body: body ? JSON.stringify(body) : undefined });
  return r.json();
}

async function uploadFile(file) {
  const token = localStorage.getItem('adminToken');
  const fd = new FormData();
  fd.append('file', file);
  const r = await fetch(`${BASE}/api/features/admin/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  return r.json();
}

function UploadBtn({ label, accept, onUploaded }) {
  const ref = useRef(null);
  const [uploading, setUploading] = useState(false);
  return (
    <>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
          const res = await uploadFile(file);
          if (res.success) onUploaded(`${BASE}${res.data.url}`);
          else alert(res.message || 'Upload failed');
        } catch { alert('Upload error'); }
        setUploading(false);
        e.target.value = '';
      }} />
      <button type="button" onClick={() => ref.current?.click()} disabled={uploading}
        className="flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-medium hover:bg-indigo-100 disabled:opacity-50 shrink-0">
        {uploading ? <Loader className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
        {label}
      </button>
    </>
  );
}

function FeatureEditor({ feature, onSave, onCancel }) {
  const [f, setF] = useState(feature || {
    slug: '', title: '', subtitle: '', videoUrl: '', steps: [{ title: '', description: '' }],
    benefits: [''], ctaText: 'Try It Free', ctaLink: '/signup', isActive: true, order: 0, icon: 'FileText', color: 'indigo',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!f.title?.trim()) return alert('Title is required');
    if (!f.slug?.trim()) return alert('Slug is required');
    setSaving(true);
    try {
      const res = feature?._id
        ? await api(`/admin/${feature._id}`, 'PUT', f)
        : await api('/admin', 'POST', f);
      if (res.success) onSave(res.data);
      else alert(res.message || 'Failed');
    } catch (e) { alert('Error saving'); }
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-indigo-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900">{feature?._id ? 'Edit Feature' : 'Add Feature'}</h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Title *</label>
          <input value={f.title} onChange={e => set('title', e.target.value)} className="w-full text-sm border rounded-lg px-3 py-2" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Slug *</label>
          <input value={f.slug} onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} className="w-full text-sm border rounded-lg px-3 py-2 font-mono" />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">Subtitle</label>
        <input value={f.subtitle} onChange={e => set('subtitle', e.target.value)} className="w-full text-sm border rounded-lg px-3 py-2" />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">Hero Thumbnail / Screenshot (shown when no video)</label>
        <div className="flex gap-2">
          <input value={f.thumbnailUrl || ''} onChange={e => set('thumbnailUrl', e.target.value)} placeholder="Image URL or upload →" className="flex-1 text-sm border rounded-lg px-3 py-2" />
          <UploadBtn label="Upload Image" accept="image/jpeg,image/png,image/webp,image/gif" onUploaded={url => set('thumbnailUrl', url)} />
        </div>
        {f.thumbnailUrl && (
          <div className="mt-1 flex items-center gap-2">
            <img src={f.thumbnailUrl} alt="Thumbnail preview" className="h-10 rounded border" />
            <p className="text-xs text-green-600 truncate">{f.thumbnailUrl.split('/').pop()}</p>
          </div>
        )}
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">Hero Video (YouTube link OR upload MP4) — optional, overrides thumbnail</label>
        <div className="flex gap-2">
          <input value={f.videoUrl} onChange={e => set('videoUrl', e.target.value)} placeholder="https://youtube.com/watch?v=... or upload →" className="flex-1 text-sm border rounded-lg px-3 py-2" />
          <UploadBtn label="Upload Video" accept="video/mp4,video/webm,video/quicktime" onUploaded={url => set('videoUrl', url)} />
        </div>
        {f.videoUrl && (
          <p className="text-xs text-green-600 mt-1 truncate">Current: {f.videoUrl.split('/').pop()}</p>
        )}
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Icon</label>
          <input value={f.icon} onChange={e => set('icon', e.target.value)} className="w-full text-sm border rounded-lg px-3 py-2" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Color</label>
          <select value={f.color} onChange={e => set('color', e.target.value)} className="w-full text-sm border rounded-lg px-3 py-2 bg-white">
            {['indigo','blue','green','red','purple','amber','pink','emerald','teal','violet','rose','yellow'].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Order</label>
          <input type="number" value={f.order} onChange={e => set('order', Number(e.target.value))} className="w-full text-sm border rounded-lg px-3 py-2" />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" checked={f.isActive} onChange={e => set('isActive', e.target.checked)} className="accent-indigo-600 w-4 h-4" />
            Active
          </label>
        </div>
      </div>

      {/* Steps */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-500">Workflow Steps</label>
          <button onClick={() => set('steps', [...(f.steps || []), { title: '', description: '', videoUrl: '', imageUrl: '' }])} className="text-xs text-indigo-600 hover:underline flex items-center gap-1"><Plus className="w-3 h-3" />Add Step</button>
        </div>
        <div className="space-y-3">
          {(f.steps || []).map((step, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-200">
              <div className="flex gap-2 items-start mb-2">
                <span className="text-xs font-bold text-indigo-600 mt-2 w-5 shrink-0">{i + 1}.</span>
                <input placeholder="Step title" value={step.title} onChange={e => { const s = [...f.steps]; s[i] = { ...s[i], title: e.target.value }; set('steps', s); }} className="flex-1 text-sm border rounded-lg px-3 py-1.5" />
                <button onClick={() => set('steps', f.steps.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 mt-1"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <div className="ml-7 space-y-2">
                <input placeholder="Description" value={step.description} onChange={e => { const s = [...f.steps]; s[i] = { ...s[i], description: e.target.value }; set('steps', s); }} className="w-full text-sm border rounded-lg px-3 py-1.5" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <div className="flex gap-1">
                      <input placeholder="Video URL or upload →" value={step.videoUrl || ''} onChange={e => { const s = [...f.steps]; s[i] = { ...s[i], videoUrl: e.target.value }; set('steps', s); }} className="flex-1 text-xs border rounded-lg px-2 py-1.5" />
                      <UploadBtn label="Video" accept="video/mp4,video/webm" onUploaded={url => { const s = [...f.steps]; s[i] = { ...s[i], videoUrl: url }; set('steps', s); }} />
                    </div>
                    {step.videoUrl && <p className="text-[10px] text-green-600 mt-0.5 truncate">{step.videoUrl.split('/').pop()}</p>}
                  </div>
                  <div>
                    <div className="flex gap-1">
                      <input placeholder="Image URL or upload →" value={step.imageUrl || ''} onChange={e => { const s = [...f.steps]; s[i] = { ...s[i], imageUrl: e.target.value }; set('steps', s); }} className="flex-1 text-xs border rounded-lg px-2 py-1.5" />
                      <UploadBtn label="Image" accept="image/jpeg,image/png,image/webp" onUploaded={url => { const s = [...f.steps]; s[i] = { ...s[i], imageUrl: url }; set('steps', s); }} />
                    </div>
                    {step.imageUrl && <p className="text-[10px] text-green-600 mt-0.5 truncate">{step.imageUrl.split('/').pop()}</p>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-500">Benefits</label>
          <button onClick={() => set('benefits', [...(f.benefits || []), ''])} className="text-xs text-indigo-600 hover:underline flex items-center gap-1"><Plus className="w-3 h-3" />Add</button>
        </div>
        <div className="space-y-2">
          {(f.benefits || []).map((b, i) => (
            <div key={i} className="flex gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-2 shrink-0" />
              <input value={b} onChange={e => { const bs = [...f.benefits]; bs[i] = e.target.value; set('benefits', bs); }} className="flex-1 text-sm border rounded-lg px-3 py-1.5" />
              <button onClick={() => set('benefits', f.benefits.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">CTA Text</label>
          <input value={f.ctaText} onChange={e => set('ctaText', e.target.value)} className="w-full text-sm border rounded-lg px-3 py-2" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">CTA Link</label>
          <input value={f.ctaLink} onChange={e => set('ctaLink', e.target.value)} className="w-full text-sm border rounded-lg px-3 py-2" />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
          {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
        </button>
        <button onClick={onCancel} className="px-5 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200">Cancel</button>
      </div>
    </div>
  );
}

export default function AdminFeatureShowcase() {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await api('/admin/all');
    if (r.success) setFeatures(r.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSeed = async () => {
    if (!confirm('Create 18 default feature pages? This only works if no features exist yet.')) return;
    setSeeding(true);
    const r = await api('/admin/seed', 'POST');
    alert(r.message);
    if (r.success) load();
    setSeeding(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this feature page?')) return;
    await api(`/admin/${id}`, 'DELETE');
    load();
  };

  const handleToggle = async (feature) => {
    await api(`/admin/${feature._id}`, 'PUT', { isActive: !feature.isActive });
    load();
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1440px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-600" /> Feature Showcase Pages
          </h1>
          <p className="text-sm text-gray-500">Manage public feature pages — video, steps, benefits. Visitors see these before signup.</p>
        </div>
        <div className="flex gap-2">
          {features.length === 0 && (
            <button onClick={handleSeed} disabled={seeding} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
              {seeding ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Seed 18 Defaults
            </button>
          )}
          <button onClick={() => { setAdding(true); setEditing(null); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Feature
          </button>
          <button onClick={load} className="p-2 hover:bg-gray-100 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Editor */}
      {(adding || editing) && (
        <div className="mb-6">
          <FeatureEditor
            feature={editing}
            onSave={() => { setAdding(false); setEditing(null); load(); }}
            onCancel={() => { setAdding(false); setEditing(null); }}
          />
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader className="w-8 h-8 animate-spin text-indigo-500" /></div>
      ) : features.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No feature pages yet</p>
          <p className="text-sm mt-1">Click "Seed 18 Defaults" to create all feature pages with preset content</p>
        </div>
      ) : (
        <div className="space-y-2">
          {features.map(f => (
            <div key={f._id} className={`bg-white rounded-xl border p-4 flex items-center gap-4 ${f.isActive ? 'border-gray-200' : 'border-red-200 bg-red-50/30'}`}>
              <div className="w-8 text-center text-xs font-bold text-gray-400">{f.order}</div>
              {/* Thumbnail preview */}
              <div className="w-14 h-10 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center">
                {f.thumbnailUrl ? (
                  <img src={f.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Image className="w-4 h-4 text-gray-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 truncate">{f.title}</p>
                  {!f.isActive && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Hidden</span>}
                  {f.videoUrl && <span className="inline-flex items-center gap-0.5 text-xs bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full"><Play className="w-3 h-3" />Video</span>}
                  {f.thumbnailUrl && !f.videoUrl && <span className="inline-flex items-center gap-0.5 text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full"><Image className="w-3 h-3" />Image</span>}
                  {!f.videoUrl && !f.thumbnailUrl && <span className="text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full">No media</span>}
                </div>
                <p className="text-xs text-gray-500 truncate">/features/{f.slug} · {f.steps?.length || 0} steps · {f.benefits?.length || 0} benefits</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <a href={`/features/${f.slug}`} target="_blank" rel="noopener noreferrer"
                  className="p-1.5 text-gray-400 hover:text-indigo-600"><ExternalLink className="w-4 h-4" /></a>
                <button onClick={() => handleToggle(f)}
                  className="p-1.5 text-gray-400 hover:text-amber-600">
                  {f.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button onClick={() => { setEditing(f); setAdding(false); }}
                  className="p-1.5 text-gray-400 hover:text-indigo-600"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(f._id)}
                  className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
