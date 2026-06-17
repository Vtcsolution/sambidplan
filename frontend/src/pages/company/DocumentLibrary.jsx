import { useState, useEffect, useRef } from 'react';
import {
  FolderOpen, Upload, FileText, Trash2, Download, MessageSquare,
  Loader, CheckCircle, XCircle, Search, Filter, Plus, X, ChevronDown, ChevronUp, Send
} from 'lucide-react';
import { companyAPI } from '../../services/api';
import { useUserPlan } from '../../hooks/useUserPlan';
import PlanGate from '../../components/PlanGate';

const CATEGORIES = [
  { value: 'all',              label: 'All Files',       color: 'text-gray-600',   bg: 'bg-gray-100' },
  { value: 'proposal',         label: 'Proposals',       color: 'text-indigo-600', bg: 'bg-indigo-100' },
  { value: 'past_performance', label: 'Past Performance',color: 'text-amber-600',  bg: 'bg-amber-100' },
  { value: 'capability',       label: 'Capability Stmts',color: 'text-green-600',  bg: 'bg-green-100' },
  { value: 'template',         label: 'Templates',       color: 'text-purple-600', bg: 'bg-purple-100' },
  { value: 'compliance',       label: 'Compliance',      color: 'text-red-600',    bg: 'bg-red-100' },
  { value: 'sow',              label: 'SOW / PWS',       color: 'text-teal-600',   bg: 'bg-teal-100' },
  { value: 'other',            label: 'Other',           color: 'text-gray-600',   bg: 'bg-gray-100' },
];

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getMimeIcon(mimeType) {
  if (!mimeType) return '📄';
  if (mimeType.includes('pdf'))   return '📕';
  if (mimeType.includes('word') || mimeType.includes('msword')) return '📘';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📗';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📙';
  if (mimeType.includes('image')) return '🖼️';
  if (mimeType.includes('text'))  return '📝';
  return '📄';
}

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

function CommentPanel({ doc, onClose, showToast }) {
  const [comments, setComments] = useState(doc.comments || []);
  const [text,    setText]      = useState('');
  const [sending, setSending]   = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [comments]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await companyAPI.addComment(doc._id, text.trim());
      setComments(p => [...p, res.data.data]);
      setText('');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add comment.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <p className="font-bold text-gray-900 text-sm">Comments</p>
            <p className="text-xs text-gray-500 truncate max-w-xs">{doc.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {comments.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">No comments yet. Start the conversation.</p>
          )}
          {comments.map((c, i) => (
            <div key={c._id || i} className="flex gap-3">
              <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
                {(c.user?.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-xs font-semibold text-gray-800">{c.user?.name || 'Team Member'}</p>
                  <p className="text-[10px] text-gray-400">{c.createdAt ? formatDate(c.createdAt) : ''}</p>
                </div>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2">{c.text}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex gap-2">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Add a comment… (Enter to send)"
            rows={2}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button onClick={handleSend} disabled={sending || !text.trim()}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-50 transition self-end">
            {sending ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function UploadModal({ onClose, onSuccess, showToast }) {
  const [file,     setFile]     = useState(null);
  const [name,     setName]     = useState('');
  const [desc,     setDesc]     = useState('');
  const [category, setCategory] = useState('other');
  const [progress, setProgress] = useState(0);
  const [uploading,setUploading]= useState(false);
  const fileRef = useRef();

  const handleUpload = async () => {
    if (!file) return showToast('Select a file first.', 'error');
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('name', name || file.name);
    fd.append('description', desc);
    fd.append('category', category);
    try {
      const res = await companyAPI.uploadDoc(fd);
      onSuccess(res.data.data);
      showToast('Document uploaded!');
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Upload failed.', 'error');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Upload Document</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        {/* Drop zone */}
        <div
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${file ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}>
          <input ref={fileRef} type="file" className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.webp"
            onChange={e => { const f = e.target.files[0]; if (f) { setFile(f); if (!name) setName(f.name.replace(/\.[^.]+$/, '')); } }} />
          {file ? (
            <p className="text-sm font-semibold text-indigo-700">{getMimeIcon(file.type)} {file.name} ({formatSize(file.size)})</p>
          ) : (
            <>
              <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Click to select · PDF, Word, Excel, PPT, TXT, Image</p>
              <p className="text-xs text-gray-400 mt-1">Max 50 MB</p>
            </>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Document Name</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Q3 Proposal Draft — DoD SBIR"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
            {CATEGORIES.filter(c => c.value !== 'all').map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Description (optional)</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
            placeholder="Brief note about this document…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>

        <button onClick={handleUpload} disabled={uploading || !file}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition flex items-center justify-center gap-2">
          {uploading ? <><Loader className="w-4 h-4 animate-spin" /> Uploading…</> : <><Upload className="w-4 h-4" /> Upload Document</>}
        </button>
      </div>
    </div>
  );
}

export default function DocumentLibrary() {
  const { plan, loading: planLoading } = useUserPlan();
  const [docs,     setDocs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [company,  setCompany]  = useState(null);
  const [category, setCategory] = useState('all');
  const [search,   setSearch]   = useState('');
  const [toast,    setToast]    = useState(null);
  const [showUpload,   setShowUpload]   = useState(false);
  const [commentDoc,   setCommentDoc]   = useState(null);
  const [deletingId,   setDeletingId]   = useState(null);
  const [downloading,  setDownloading]  = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  useEffect(() => { loadInit(); }, []);
  useEffect(() => { if (company) loadDocs(); }, [category]); // eslint-disable-line

  const loadInit = async () => {
    setLoading(true);
    try {
      const res = await companyAPI.getMine();
      if (res.data.success) {
        setCompany(res.data.data);
        await loadDocs();
      }
    } catch (err) {
      if (err.response?.status !== 404) showToast('Failed to load workspace.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadDocs = async () => {
    try {
      const params = {};
      if (category !== 'all') params.category = category;
      if (search)             params.search    = search;
      const res = await companyAPI.listDocs(params);
      setDocs(res.data.data || []);
    } catch {
      setDocs([]);
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.name}"?`)) return;
    setDeletingId(doc._id);
    try {
      await companyAPI.deleteDoc(doc._id);
      setDocs(p => p.filter(d => d._id !== doc._id));
      showToast('Document deleted.');
    } catch (err) {
      showToast(err.response?.data?.message || 'Delete failed.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (doc) => {
    setDownloading(doc._id);
    try {
      const res = await companyAPI.downloadDoc(doc._id);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = doc.originalName || doc.name;
      a.click(); URL.revokeObjectURL(url);
      showToast('Download started.');
    } catch {
      showToast('Download failed.', 'error');
    } finally {
      setDownloading(null);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadDocs();
  };

  const getCategoryMeta = (val) => CATEGORIES.find(c => c.value === val) || CATEGORIES[0];

  if (loading || planLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader className="w-7 h-7 text-indigo-600 animate-spin" />
    </div>
  );

  if (plan === 'free') {
    return (
      <PlanGate
        requiredPlan="starter"
        featureName="Document Library"
        description="Share proposals, capability statements, and templates with your team. Upgrade to Starter to unlock team collaboration features."
      />
    );
  }

  if (!company) return (
    <div className="min-h-screen flex items-center justify-center text-center px-4">
      <div>
        <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-gray-900 mb-2">No Company Workspace</h2>
        <p className="text-gray-500 text-sm mb-4">Create a company profile first to use the document library.</p>
        <a href="/company/profile" className="inline-block bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
          Go to Company Profile
        </a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Document Library</h1>
              <p className="text-sm text-gray-500">{company.name} · {docs.length} document{docs.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition">
            <Plus className="w-4 h-4" /> Upload Document
          </button>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search documents…"
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
              Search
            </button>
          </form>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(cat => (
              <button key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${category === cat.value ? `${cat.color} ${cat.bg}` : 'text-gray-500 bg-gray-100 hover:bg-gray-200'}`}>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Document Grid */}
        {docs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
            <FolderOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-600 mb-1">No documents yet</p>
            <p className="text-sm text-gray-400">Upload proposals, templates, SOWs, and more to share with your team.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {docs.map(doc => {
              const catMeta = getCategoryMeta(doc.category);
              return (
                <div key={doc._id} className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-md transition">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl leading-none mt-0.5">{getMimeIcon(doc.mimeType)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{doc.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${catMeta.color} ${catMeta.bg}`}>{catMeta.label}</span>
                        <span className="text-xs text-gray-400">{formatSize(doc.size)}</span>
                      </div>
                      {doc.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{doc.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
                        <span>{doc.uploadedBy?.name || 'Team'}</span>
                        <span>·</span>
                        <span>{formatDate(doc.createdAt)}</span>
                        {doc.downloadCount > 0 && <><span>·</span><span>{doc.downloadCount} download{doc.downloadCount !== 1 ? 's' : ''}</span></>}
                        {doc.comments?.length > 0 && <><span>·</span><span>{doc.comments.length} comment{doc.comments.length !== 1 ? 's' : ''}</span></>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button onClick={() => handleDownload(doc)}
                      disabled={downloading === doc._id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition disabled:opacity-50">
                      {downloading === doc._id ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      Download
                    </button>
                    <button onClick={() => setCommentDoc(doc)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg text-xs font-semibold transition">
                      <MessageSquare className="w-3.5 h-3.5" />
                      {doc.comments?.length > 0 ? doc.comments.length : ''}
                    </button>
                    <button onClick={() => handleDelete(doc)}
                      disabled={deletingId === doc._id}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50">
                      {deletingId === doc._id ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSuccess={d => setDocs(p => [d, ...p])} showToast={showToast} />}
      {commentDoc  && <CommentPanel doc={commentDoc} onClose={() => setCommentDoc(null)} showToast={showToast} />}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
