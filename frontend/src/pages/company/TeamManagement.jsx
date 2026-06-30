import { useState, useEffect } from 'react';
import { Users, UserPlus, Crown, Shield, Briefcase, FileEdit, Eye, User, Loader, Trash2, Copy, CheckCircle, XCircle, Clock, LogOut, AlertTriangle, KeyRound, Link2, ToggleLeft, ToggleRight } from 'lucide-react';
import { companyAPI } from '../../services/api';
import { useUserPlan } from '../../hooks/useUserPlan';
import PlanGate from '../../components/PlanGate';
import HowItWorks from '../../components/HowItWorks';

const ALL_PAGES = [
  { key: 'dashboard',            label: 'Dashboard' },
  { key: 'opportunities',        label: 'Find Contracts' },
  { key: 'saved',                label: 'Saved Contracts' },
  { key: 'bid-pipeline',         label: 'Bid Pipeline' },
  { key: 'calendar',             label: 'Deadline Calendar' },
  { key: 'alerts',               label: 'Smart Alerts' },
  { key: 'winning-bids',         label: 'Who Won Contracts' },
  { key: 'referral',             label: 'Earn by Referring' },
  { key: 'proposal-builder',     label: 'Proposal Builder' },
  { key: 'rfp-analyzer',         label: 'RFP Analyzer' },
  { key: 'go-no-go',             label: 'Go/No-Go' },
  { key: 'teaming-finder',       label: 'Teaming Finder' },
  { key: 'contract-vehicles',    label: 'Contract Vehicles' },
  { key: 'market-research',      label: 'Market Research' },
  { key: 'past-performance',     label: 'Past Performance' },
  { key: 'sources-sought',       label: 'Sources Sought' },
  { key: 'ai-predictions',       label: 'AI Predictions' },
  { key: 'capability-statement',    label: 'Capability Statement' },
  { key: 'company-profile',      label: 'Company Profile' },
  { key: 'company-team',         label: 'Team Members' },
  { key: 'company-documents',    label: 'Document Library' },
  { key: 'company-managed-service', label: 'Managed Winning' },
];

const TEAM_LIMITS = { starter: 3, pro: 10, enterprise: Infinity };

function getMemberLimit(plan) {
  return TEAM_LIMITS[plan] ?? 0;
}

const ROLE_META = {
  owner:            { label: 'Owner',            icon: Crown,     color: 'text-amber-600',  bg: 'bg-amber-50  border-amber-200' },
  admin:            { label: 'Admin',             icon: Shield,    color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
  capture_manager:  { label: 'Capture Manager',   icon: Briefcase, color: 'text-blue-600',   bg: 'bg-blue-50   border-blue-200' },
  proposal_writer:  { label: 'Proposal Writer',   icon: FileEdit,  color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
  reviewer:         { label: 'Reviewer',           icon: Eye,       color: 'text-teal-600',   bg: 'bg-teal-50   border-teal-200' },
  member:           { label: 'Member',             icon: User,      color: 'text-gray-600',   bg: 'bg-gray-50   border-gray-200' },
};

const ASSIGNABLE_ROLES = ['admin','capture_manager','proposal_writer','reviewer','member'];

function RoleBadge({ role }) {
  const m = ROLE_META[role] || ROLE_META.member;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${m.color} ${m.bg}`}>
      <Icon className="w-3 h-3" />{m.label}
    </span>
  );
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

export default function TeamManagement() {
  const { plan, loading: planLoading } = useUserPlan();
  const [company,  setCompany]  = useState(null);
  const [myRole,   setMyRole]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const [toast,    setToast]    = useState(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole,  setInviteRole]  = useState('member');
  const [inviting,    setInviting]    = useState(false);
  const [inviteLink,  setInviteLink]  = useState('');
  const [copied,      setCopied]      = useState(false);

  const [actionLoading, setActionLoading] = useState({});

  const showToast = (msg, type = 'success') => setToast({ msg, type });
  const canManage = ['owner','admin'].includes(myRole);

  const memberLimit   = getMemberLimit(plan);
  const activeMembers = company?.members?.filter(m => m.inviteStatus === 'accepted').length ?? 0;
  const atLimit       = activeMembers >= memberLimit;

  useEffect(() => { loadCompany(); }, []);

  const loadCompany = async () => {
    setLoading(true);
    try {
      const res = await companyAPI.getMine();
      if (res.data.success) { setCompany(res.data.data); setMyRole(res.data.myRole); }
    } catch {
      showToast('Failed to load company.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return showToast('Enter an email address.', 'error');
    setInviting(true);
    try {
      const res = await companyAPI.invite({ email: inviteEmail.trim(), role: inviteRole });
      // Build join URL from the current browser origin so it always matches the running environment
      const token = res.data.token;
      setInviteLink(token ? `${window.location.origin}/company/join?token=${token}` : '');
      setInviteEmail('');
      showToast('Invite created! Share the link with your team member.');
      loadCompany();
    } catch (err) {
      showToast(err.response?.data?.message || 'Invite failed.', 'error');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId, role) => {
    setActionLoading(p => ({ ...p, [memberId]: true }));
    try {
      await companyAPI.updateRole(memberId, role);
      showToast('Role updated.');
      loadCompany();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update role.', 'error');
    } finally {
      setActionLoading(p => ({ ...p, [memberId]: false }));
    }
  };

  const handleRemove = async (memberId, name) => {
    if (!window.confirm(`Remove ${name || 'this member'} from the team?`)) return;
    setActionLoading(p => ({ ...p, [memberId]: true }));
    try {
      await companyAPI.removeMember(memberId);
      showToast('Member removed.');
      loadCompany();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to remove member.', 'error');
    } finally {
      setActionLoading(p => ({ ...p, [memberId]: false }));
    }
  };

  const handleLeave = async () => {
    if (!window.confirm('Leave this company workspace?')) return;
    try {
      await companyAPI.leave();
      setCompany(null);
      showToast('You have left the workspace.');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to leave.', 'error');
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Workspace Users ────────────────────────────────────────────────────────
  const [wsUsers,      setWsUsers]      = useState([]);
  const [wsLoading,    setWsLoading]    = useState(false);
  const [wsCompanyId,  setWsCompanyId]  = useState('');
  const [showWsForm,   setShowWsForm]   = useState(false);
  const [wsForm,       setWsForm]       = useState({ username: '', password: '', displayName: '', allowedPages: [] });
  const [wsSaving,     setWsSaving]     = useState(false);
  const [wsEditId,     setWsEditId]     = useState(null);
  const [wsCopied,     setWsCopied]     = useState(false);

  useEffect(() => { if (myRole === 'owner') loadWsUsers(); }, [myRole]);

  const loadWsUsers = async () => {
    setWsLoading(true);
    try {
      const res = await companyAPI.listWorkspaceUsers();
      if (res.data.success) { setWsUsers(res.data.data); setWsCompanyId(res.data.companyId); }
    } catch { /* silent */ }
    finally { setWsLoading(false); }
  };

  const wsLoginUrl = wsCompanyId ? `${window.location.origin}/workspace/login?c=${wsCompanyId}` : '';

  const togglePage = (key) => setWsForm(f => ({
    ...f, allowedPages: f.allowedPages.includes(key) ? f.allowedPages.filter(p => p !== key) : [...f.allowedPages, key],
  }));

  const handleWsSave = async () => {
    if (!wsForm.username.trim() || !wsForm.password) { showToast('Username and password are required.', 'error'); return; }
    setWsSaving(true);
    try {
      if (wsEditId) {
        await companyAPI.updateWorkspaceUser(wsEditId, { displayName: wsForm.displayName, allowedPages: wsForm.allowedPages, password: wsForm.password || undefined });
        showToast('Workspace user updated.');
      } else {
        await companyAPI.createWorkspaceUser(wsForm);
        showToast('Workspace user created.');
      }
      setWsForm({ username: '', password: '', displayName: '', allowedPages: [] });
      setShowWsForm(false); setWsEditId(null);
      loadWsUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save.', 'error');
    } finally { setWsSaving(false); }
  };

  const handleWsEdit = (wu) => {
    setWsForm({ username: wu.username, password: '', displayName: wu.displayName, allowedPages: wu.allowedPages });
    setWsEditId(wu._id); setShowWsForm(true);
  };

  const handleWsDelete = async (id, username) => {
    if (!window.confirm(`Remove workspace user "${username}"?`)) return;
    try {
      await companyAPI.deleteWorkspaceUser(id);
      showToast('Workspace user removed.');
      loadWsUsers();
    } catch { showToast('Failed to remove.', 'error'); }
  };

  const copyWsUrl = () => { navigator.clipboard.writeText(wsLoginUrl); setWsCopied(true); setTimeout(() => setWsCopied(false), 2000); };

  if (loading || planLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader className="w-7 h-7 text-indigo-600 animate-spin" />
    </div>
  );

  if (plan === 'free') {
    return (
      <PlanGate
        requiredPlan="starter"
        featureName="Team Management"
        description="Invite team members, assign roles like Capture Manager and Proposal Writer, and collaborate on federal opportunities together."
      />
    );
  }

  if (!company) return (
    <div className="min-h-screen flex items-center justify-center text-center px-4">
      <div>
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-gray-900 mb-2">No Company Workspace</h2>
        <p className="text-gray-500 text-sm mb-4">Create a company profile first to manage your team.</p>
        <a href="/company/profile" className="inline-block bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
          Go to Company Profile
        </a>
      </div>
    </div>
  );

  const accepted = company.members?.filter(m => m.inviteStatus === 'accepted') || [];
  const pending  = company.members?.filter(m => m.inviteStatus === 'pending')  || [];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">Team Members
                <HowItWorks title="Team Management" steps={[
                  { title: 'Invite team members', description: 'Add people by email — they get an invite to join your company workspace' },
                  { title: 'Assign roles', description: 'Owner, Admin, Capture Manager, Proposal Writer, Reviewer, or Member — each role has different page access' },
                  { title: 'Page-level access control', description: 'Control which pages each member can see (opportunities, proposals, pipeline, etc.)' },
                  { title: 'Workspace users', description: 'Create workspace logins with restricted access — separate from main SamBid accounts' },
                ]} dataUsed={['Your Company Workspace', 'Member Invites']} >
                  <p className="text-sm font-semibold text-gray-700 mt-2">Connected to:</p>
                  <ul className="text-xs text-gray-500 list-disc list-inside space-y-0.5 mt-1">
                    <li><strong>Document Library</strong> → shared docs accessible to all team members</li>
                    <li><strong>Company Profile</strong> → team members share the same UEI, certs, and NAICS</li>
                    <li><strong>Managed Service</strong> → team sees bid status and project progress</li>
                  </ul>
                </HowItWorks>
              </h1>
              <p className="text-sm text-gray-500">{company.name} · {accepted.length + 1} active member{accepted.length !== 0 ? 's' : ''}</p>
            </div>
          </div>
          {myRole !== 'owner' && (
            <button onClick={handleLeave}
              className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl text-sm font-medium transition">
              <LogOut className="w-4 h-4" /> Leave
            </button>
          )}
        </div>

        {/* Invite Form */}
        {canManage && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-bold text-gray-900 flex items-center gap-2"><UserPlus className="w-4 h-4 text-indigo-500" /> Invite a Team Member</h2>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${atLimit ? 'bg-red-100 text-red-700' : 'bg-indigo-50 text-indigo-700'}`}>
                {activeMembers} / {memberLimit === Infinity ? '∞' : memberLimit} members
                {plan === 'starter' && ' · Upgrade to Pro for 10'}
                {plan === 'pro' && ' · Upgrade to Enterprise for unlimited'}
              </span>
            </div>

            {atLimit ? (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Team member limit reached</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Your {plan} plan allows up to {memberLimit} active members.{' '}
                    <a href="/pricing" className="underline font-semibold">Upgrade your plan</a> to add more.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 flex-wrap">
                <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleInvite()}
                  placeholder="team@yourcompany.com" type="email"
                  className="flex-1 min-w-0 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  {ASSIGNABLE_ROLES.map(r => (
                    <option key={r} value={r}>{ROLE_META[r].label}</option>
                  ))}
                </select>
                <button onClick={handleInvite} disabled={inviting}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition">
                  {inviting ? <Loader className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Invite
                </button>
              </div>
            )}

            {inviteLink && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-indigo-700 mb-2">Share this invite link with the team member:</p>
                <div className="flex items-center gap-2">
                  <input readOnly value={inviteLink}
                    className="flex-1 bg-white border border-indigo-200 rounded-lg px-3 py-1.5 text-xs font-mono text-gray-700" />
                  <button onClick={copyLink}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${copied ? 'bg-green-600 text-white' : 'bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-100'}`}>
                    {copied ? <><CheckCircle className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </button>
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500">
              <p className="font-semibold mb-1">Role Descriptions:</p>
              <ul className="space-y-0.5">
                <li><strong>Admin</strong> — Full access: invite/remove members, edit company</li>
                <li><strong>Capture Manager</strong> — Manage bid pipeline, assign opportunities</li>
                <li><strong>Proposal Writer</strong> — Write and edit proposals</li>
                <li><strong>Reviewer</strong> — View and comment on proposals and documents</li>
                <li><strong>Member</strong> — View shared content only</li>
              </ul>
            </div>
          </div>
        )}

        {/* Owner */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
          <h2 className="font-bold text-gray-900">Active Members</h2>

          {/* Owner row */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-bold text-sm">
                {(company.owner?.name || 'O').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{company.owner?.name || 'Owner'}</p>
                <p className="text-xs text-gray-500">{company.owner?.email || ''}</p>
              </div>
            </div>
            <RoleBadge role="owner" />
          </div>

          {/* Accepted members */}
          {accepted.length === 0 && (
            <p className="text-sm text-gray-400 py-2">No team members yet. Invite your first teammate above.</p>
          )}
          {accepted.map(m => (
            <div key={m._id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-sm">
                  {(m.user?.name || m.inviteEmail || 'M').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{m.user?.name || 'Team Member'}</p>
                  <p className="text-xs text-gray-500">{m.user?.email || m.inviteEmail}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canManage ? (
                  <>
                    <select
                      value={m.role}
                      disabled={actionLoading[m._id]}
                      onChange={e => handleRoleChange(m._id, e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                      {ASSIGNABLE_ROLES.map(r => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
                    </select>
                    <button onClick={() => handleRemove(m._id, m.user?.name)}
                      disabled={actionLoading[m._id]}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50">
                      {actionLoading[m._id] ? <Loader className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </>
                ) : (
                  <RoleBadge role={m.role} />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Pending invites */}
        {pending.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
            <h2 className="font-bold text-gray-900 flex items-center gap-2"><Clock className="w-4 h-4 text-amber-500" /> Pending Invites</h2>
            {pending.map(m => (
              <div key={m._id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">{m.inviteEmail}</p>
                    <p className="text-xs text-gray-400">Invited · awaiting acceptance</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <RoleBadge role={m.role} />
                  {canManage && (
                    <button onClick={() => handleRemove(m._id, m.inviteEmail)}
                      disabled={actionLoading[m._id]}
                      className="p-1.5 text-red-400 hover:text-red-600 rounded-lg transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Workspace Access Control (owner only) ────────────────────── */}
      {myRole === 'owner' && (
        <div className="bg-white rounded-2xl border border-indigo-100 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900 flex items-center gap-2"><KeyRound className="w-4 h-4 text-indigo-500" /> Workspace Access</h2>
              <p className="text-xs text-gray-500 mt-0.5">Create login accounts with custom page permissions for external collaborators.</p>
            </div>
            <button onClick={() => { setShowWsForm(!showWsForm); setWsEditId(null); setWsForm({ username: '', password: '', displayName: '', allowedPages: [] }); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition">
              <UserPlus className="w-3.5 h-3.5" /> New User
            </button>
          </div>

          {/* Login URL */}
          {wsLoginUrl && (
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <Link2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="text-xs text-gray-600 truncate flex-1">{wsLoginUrl}</span>
              <button onClick={copyWsUrl} className="text-xs text-indigo-600 font-semibold shrink-0 hover:text-indigo-800">
                {wsCopied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}

          {/* Create/Edit form */}
          {showWsForm && (
            <div className="border border-indigo-100 rounded-2xl p-4 space-y-4 bg-indigo-50/40">
              <p className="text-sm font-semibold text-gray-800">{wsEditId ? 'Edit Workspace User' : 'Create Workspace User'}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Username</label>
                  <input value={wsForm.username} onChange={e => setWsForm(f => ({ ...f, username: e.target.value }))}
                    disabled={!!wsEditId} placeholder="e.g. john.doe"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-100" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Display Name</label>
                  <input value={wsForm.displayName} onChange={e => setWsForm(f => ({ ...f, displayName: e.target.value }))}
                    placeholder="John Doe"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">{wsEditId ? 'New Password (leave blank to keep)' : 'Password'}</label>
                  <input type="password" value={wsForm.password} onChange={e => setWsForm(f => ({ ...f, password: e.target.value }))}
                    placeholder={wsEditId ? 'Leave blank to keep' : 'Min 6 chars'}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>

              {/* Page permissions */}
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">Allowed Pages <span className="text-gray-400 font-normal">— only checked pages will be visible</span></p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {ALL_PAGES.map(p => (
                    <label key={p.key} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer text-xs transition ${wsForm.allowedPages.includes(p.key) ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-medium' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      <input type="checkbox" checked={wsForm.allowedPages.includes(p.key)} onChange={() => togglePage(p.key)} className="accent-indigo-600 w-3.5 h-3.5" />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => { setShowWsForm(false); setWsEditId(null); }} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
                <button onClick={handleWsSave} disabled={wsSaving}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 font-semibold">
                  {wsSaving ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {wsEditId ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </div>
          )}

          {/* Workspace users list */}
          {wsLoading ? (
            <div className="flex justify-center py-4"><Loader className="w-5 h-5 text-indigo-400 animate-spin" /></div>
          ) : wsUsers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No workspace users yet. Create one above.</p>
          ) : (
            <div className="space-y-2">
              {wsUsers.map(wu => (
                <div key={wu._id} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{wu.displayName || wu.username}</p>
                    <p className="text-xs text-gray-500">@{wu.username} · {wu.allowedPages.length} pages</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${wu.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {wu.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <button onClick={() => handleWsEdit(wu)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded-lg hover:bg-indigo-50">Edit</button>
                    <button onClick={() => handleWsDelete(wu._id, wu.username)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
