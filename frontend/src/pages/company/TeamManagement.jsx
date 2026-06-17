import { useState, useEffect } from 'react';
import { Users, UserPlus, Crown, Shield, Briefcase, FileEdit, Eye, User, Loader, Trash2, Copy, CheckCircle, XCircle, Clock, LogOut, AlertTriangle } from 'lucide-react';
import { companyAPI } from '../../services/api';
import { useUserPlan } from '../../hooks/useUserPlan';
import PlanGate from '../../components/PlanGate';

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
              <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
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

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
