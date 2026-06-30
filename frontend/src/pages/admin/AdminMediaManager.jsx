import { useState, useEffect, useRef } from 'react';
import AdminHowItWorks from '../../components/AdminHowItWorks';
import { Upload, Trash2, Image, Video, CheckCircle, AlertCircle, Loader, Eye, Film, Home, Star } from 'lucide-react';
import axios from 'axios';

const API = import.meta.env.VITE_BASE_URL || 'http://localhost:8000';

const HOME_SLOTS = [
  { key: 'hero',     label: 'Hero Screenshot',  types: ['image'] },
  { key: 'phase_01', label: 'Phase 01 — Find Every Opportunity',    types: ['video','image'] },
  { key: 'phase_02', label: 'Phase 02 — Search & Discover',         types: ['video','image'] },
  { key: 'phase_03', label: 'Phase 03 — Deadline Calendar',         types: ['video','image'] },
  { key: 'phase_04', label: 'Phase 04 — AI Predictions',            types: ['video','image'] },
  { key: 'phase_05', label: 'Phase 05 — Teaming Finder',            types: ['video','image'] },
  { key: 'phase_06', label: 'Phase 06 — Past Performance',          types: ['video','image'] },
  { key: 'phase_07', label: 'Phase 07 — AI Proposal Writing',       types: ['video','image'] },
];

const FEATURE_SLOTS = [
  { key: 'feature_01', label: 'Feature 01 — Opportunity Discovery' },
  { key: 'feature_02', label: 'Feature 02 — Smart Alerts' },
  { key: 'feature_03', label: 'Feature 03 — Deadline Calendar' },
  { key: 'feature_04', label: 'Feature 04 — AI Win Predictions' },
  { key: 'feature_05', label: 'Feature 05 — AI Proposal Writer' },
  { key: 'feature_06', label: 'Feature 06 — RFP Analyzer' },
  { key: 'feature_07', label: 'Feature 07 — Past Performance Intel' },
  { key: 'feature_08', label: 'Feature 08 — Teaming Finder' },
  { key: 'feature_09', label: 'Feature 09 — Market Research' },
  { key: 'feature_10', label: 'Feature 10 — Capability Statement' },
  { key: 'feature_11', label: 'Feature 11 — Bid Pipeline' },
  { key: 'feature_12', label: 'Feature 12 — Contract Vehicles' },
].map(s => ({ ...s, types: ['image'] }));

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function SlotCard({ slot, page, media, onRefresh }) {
  const [uploading, setUploading] = useState({});
  const [deleting,  setDeleting]  = useState({});
  const [preview,   setPreview]   = useState(null);
  const refs = { video: useRef(), image: useRef() };

  const adminToken = localStorage.getItem('adminToken');
  const headers    = { Authorization: `Bearer ${adminToken}` };

  const handleUpload = async (type, file) => {
    if (!file) return;
    setUploading(p => ({ ...p, [type]: true }));
    const fd = new FormData();
    fd.append('file', file);
    fd.append('page', page);
    fd.append('slot', slot.key);
    try {
      await axios.post(`${API}/api/media/upload`, fd, { headers: { ...headers, 'Content-Type': 'multipart/form-data' } });
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(p => ({ ...p, [type]: false }));
      if (refs[type]?.current) refs[type].current.value = '';
    }
  };

  const handleDelete = async (id, type) => {
    if (!confirm('Delete this media?')) return;
    setDeleting(p => ({ ...p, [type]: true }));
    try {
      await axios.delete(`${API}/api/media/${id}`, { headers });
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(p => ({ ...p, [type]: false }));
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-900 text-sm">{slot.label}</p>
          <p className="text-xs text-gray-500 font-mono mt-0.5">{slot.key}</p>
        </div>
        <div className="flex gap-1">
          {slot.types.map(t => (
            <span key={t} className={`text-xs px-2 py-0.5 rounded-full font-medium ${t === 'video' ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'}`}>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Slots */}
      <div className="p-4 space-y-4">
        {slot.types.map(type => {
          const existing = media?.[type];
          const Icon = type === 'video' ? Film : Image;
          const isVid = type === 'video';
          const accept = isVid ? 'video/mp4,video/webm,video/quicktime' : 'image/jpeg,image/png,image/webp';

          return (
            <div key={type} className={`rounded-lg border-2 border-dashed p-3 ${existing ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${existing ? 'text-green-600' : 'text-gray-400'}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{type}</p>
                    {existing ? (
                      <div className="mt-1">
                        <p className="text-xs text-green-700 font-medium truncate">{existing.filename}</p>
                        <p className="text-xs text-gray-500">{formatSize(existing.size)}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mt-0.5">No {type} uploaded</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {existing && (
                    <button
                      onClick={() => setPreview({ url: `${API}${existing.url}`, type })}
                      className="p-1.5 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                      title="Preview"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {existing && (
                    <button
                      onClick={() => handleDelete(existing._id, type)}
                      disabled={deleting[type]}
                      className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      {deleting[type] ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  <label className="cursor-pointer">
                    <input
                      ref={refs[type]}
                      type="file"
                      accept={accept}
                      className="hidden"
                      onChange={e => handleUpload(type, e.target.files[0])}
                    />
                    <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      uploading[type]
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer'
                    }`}>
                      {uploading[type]
                        ? <><Loader className="w-3 h-3 animate-spin" /> Uploading…</>
                        : <><Upload className="w-3 h-3" /> {existing ? 'Replace' : 'Upload'}</>
                      }
                    </div>
                  </label>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview modal */}
      {preview && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div className="max-w-3xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <p className="font-semibold text-gray-900 text-sm">{slot.label} — {preview.type}</p>
              <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="p-4">
              {preview.type === 'video'
                ? <video src={preview.url} controls className="w-full rounded-lg" style={{ maxHeight: '70vh' }} />
                : <img src={preview.url} alt="preview" className="w-full rounded-lg object-contain" style={{ maxHeight: '70vh' }} />
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminMediaManager() {
  const [activePage, setActivePage] = useState('home');
  const [media,      setMedia]      = useState({});
  const [loading,    setLoading]    = useState(true);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/media/page/${activePage}`);
      setMedia(res.data.media || {});
    } catch {
      setMedia({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMedia(); }, [activePage]); // eslint-disable-line

  const slots = activePage === 'home' ? HOME_SLOTS : FEATURE_SLOTS;
  const filled = slots.filter(s => s.types.some(t => media[s.key]?.[t])).length;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Page Media Manager<AdminHowItWorks page="mediaManager" /></h1>
        <p className="text-gray-500 text-sm">Upload videos and screenshots that appear on the public home and features pages.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 mb-6">
        {[
          { key: 'home',     label: 'Home Page',     icon: Home, total: HOME_SLOTS.length },
          { key: 'features', label: 'Features Page', icon: Star, total: FEATURE_SLOTS.length },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActivePage(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                activePage === tab.key
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Progress bar */}
      {!loading && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold text-gray-700">Upload progress</span>
              <span className="text-sm text-gray-500">{filled} / {slots.length} slots filled</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${slots.length ? (filled / slots.length) * 100 : 0}%` }}
              />
            </div>
          </div>
          {filled === slots.length && (
            <div className="flex items-center gap-1.5 text-green-600 text-sm font-semibold shrink-0">
              <CheckCircle className="w-4 h-4" /> All done!
            </div>
          )}
        </div>
      )}

      {/* Slot grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader className="w-7 h-7 text-indigo-600 animate-spin" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {slots.map(slot => (
            <SlotCard
              key={slot.key}
              slot={slot}
              page={activePage}
              media={media[slot.key]}
              onRefresh={fetchMedia}
            />
          ))}
        </div>
      )}

      {/* Info box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <p className="font-semibold mb-0.5">Storage notes</p>
          <ul className="space-y-0.5 text-blue-600">
            <li>• Videos stored in <code className="bg-blue-100 px-1 rounded">uploads/videos/</code> — max 300 MB per file</li>
            <li>• Images stored in <code className="bg-blue-100 px-1 rounded">uploads/images/</code> — max 300 MB per file</li>
            <li>• Uploading a new file for a slot automatically replaces the previous one</li>
            <li>• Changes appear on the public site immediately after upload</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
