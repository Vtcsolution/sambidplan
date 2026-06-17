import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Building2, Users, Crown, Shield, Briefcase, FileEdit, Eye, User,
  CheckCircle, XCircle, Loader, LogIn, UserPlus
} from 'lucide-react';
import { companyAPI } from '../../services/api';

const ROLE_META = {
  owner:           { label: 'Owner',           icon: Crown,     color: 'text-amber-600',  bg: 'bg-amber-50  border-amber-200' },
  admin:           { label: 'Admin',            icon: Shield,    color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
  capture_manager: { label: 'Capture Manager',  icon: Briefcase, color: 'text-blue-600',   bg: 'bg-blue-50   border-blue-200' },
  proposal_writer: { label: 'Proposal Writer',  icon: FileEdit,  color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
  reviewer:        { label: 'Reviewer',          icon: Eye,       color: 'text-teal-600',   bg: 'bg-teal-50   border-teal-200' },
  member:          { label: 'Member',            icon: User,      color: 'text-gray-600',   bg: 'bg-gray-50   border-gray-200' },
};

const ROLE_PERMS = {
  admin:           ['View all opportunities', 'Manage bid pipeline', 'Write & edit proposals', 'Invite / remove members', 'Edit company profile'],
  capture_manager: ['View all opportunities', 'Manage bid pipeline', 'Assign opportunities to team'],
  proposal_writer: ['View all opportunities', 'Write & edit proposals', 'Upload documents'],
  reviewer:        ['View opportunities', 'Comment on proposals & documents', 'Download shared files'],
  member:          ['View shared opportunities', 'Access document library'],
};

export default function CompanyJoin() {
  const [searchParams] = useSearchParams();
  const navigate        = useNavigate();
  const token           = searchParams.get('token');

  const [invite,    setInvite]    = useState(null);   // preview data
  const [status,    setStatus]    = useState('loading'); // loading | preview | accepting | success | error | no_token
  const [errorMsg,  setErrorMsg]  = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (!token) { setStatus('no_token'); return; }

    // Check if user is logged in (authToken in storage)
    const userToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    setIsLoggedIn(!!userToken);

    // Load preview — public endpoint, no auth required
    companyAPI.previewInvite(token)
      .then(res => {
        if (res.data.success) { setInvite(res.data.data); setStatus('preview'); }
        else { setErrorMsg(res.data.message); setStatus('error'); }
      })
      .catch(err => {
        setErrorMsg(err.response?.data?.message || 'This invite link is invalid or has expired.');
        setStatus('error');
      });
  }, [token]);

  const handleAccept = async () => {
    setStatus('accepting');
    try {
      await companyAPI.acceptInvite(token);
      setStatus('success');
      setTimeout(() => navigate('/company/team'), 2500);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to accept invitation. Please try again.');
      setStatus('error');
    }
  };

  const loginRedirect = `/login?redirect=${encodeURIComponent(`/company/join?token=${token}`)}`;
  const signupRedirect = `/signup?redirect=${encodeURIComponent(`/company/join?token=${token}`)}`;

  // ── Render states ──────────────────────────────────────────────────────────
  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader className="w-8 h-8 text-indigo-600 animate-spin" />
    </div>
  );

  if (status === 'no_token') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-sm">
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Invite Link</h2>
        <p className="text-gray-500 text-sm mb-6">No invitation token was found in this link.</p>
        <Link to="/" className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
          Go Home
        </Link>
      </div>
    </div>
  );

  if (status === 'error') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-sm">
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Invite Unavailable</h2>
        <p className="text-gray-500 text-sm mb-6">{errorMsg}</p>
        <Link to="/" className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
          Go Home
        </Link>
      </div>
    </div>
  );

  if (status === 'success') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">You're in!</h2>
        <p className="text-gray-500 text-sm mb-1">
          Welcome to <strong>{invite?.companyName}</strong>.
        </p>
        <p className="text-xs text-gray-400">Redirecting to your team workspace…</p>
      </div>
    </div>
  );

  // ── Preview state ──────────────────────────────────────────────────────────
  const roleMeta  = ROLE_META[invite?.role] || ROLE_META.member;
  const RoleIcon  = roleMeta.icon;
  const perms     = ROLE_PERMS[invite?.role] || ROLE_PERMS.member;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-6 py-8 text-center text-white">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <p className="text-indigo-200 text-sm mb-1">You've been invited to join</p>
            <h1 className="text-2xl font-bold">{invite?.companyName}</h1>
            <p className="text-indigo-200 text-xs mt-1">Invited by {invite?.invitedBy}</p>
          </div>

          <div className="p-6 space-y-5">

            {/* Role badge */}
            <div className={`flex items-center gap-3 p-4 rounded-xl border ${roleMeta.bg}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white border ${roleMeta.bg.split(' ')[1]}`}>
                <RoleIcon className={`w-5 h-5 ${roleMeta.color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Your role</p>
                <p className={`text-base font-bold ${roleMeta.color}`}>{roleMeta.label}</p>
              </div>
            </div>

            {/* Permissions */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">What you can do</p>
              <ul className="space-y-1.5">
                {perms.map(p => (
                  <li key={p} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            {/* Invite email note */}
            {invite?.inviteEmail && (
              <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                This invitation was sent to <strong>{invite.inviteEmail}</strong>.
                {!isLoggedIn && ' Please log in with that email to accept.'}
              </p>
            )}

            {/* CTA */}
            {!isLoggedIn ? (
              <div className="space-y-2">
                <p className="text-sm text-center text-gray-500">Log in to accept this invitation</p>
                <Link to={loginRedirect}
                  className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold text-sm transition">
                  <LogIn className="w-4 h-4" /> Log In to Accept
                </Link>
                <Link to={signupRedirect}
                  className="flex items-center justify-center gap-2 w-full border border-gray-200 hover:bg-gray-50 text-gray-700 py-3 rounded-xl font-semibold text-sm transition">
                  <UserPlus className="w-4 h-4" /> Create an Account
                </Link>
              </div>
            ) : (
              <button
                onClick={handleAccept}
                disabled={status === 'accepting'}
                className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-3 rounded-xl font-semibold text-sm transition">
                {status === 'accepting'
                  ? <><Loader className="w-4 h-4 animate-spin" /> Joining…</>
                  : <><Users className="w-4 h-4" /> Accept Invitation</>}
              </button>
            )}

          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          FedNotify · Federal Contract Intelligence Platform
        </p>
      </div>
    </div>
  );
}
