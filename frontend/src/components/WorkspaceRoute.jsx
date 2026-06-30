import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getWorkspaceSession, canAccessPage, PATH_TO_PAGE_KEY, PAGE_KEY_TO_PATH } from '../hooks/useWorkspace';

export default function WorkspaceRoute({ children }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const session = getWorkspaceSession();

  useEffect(() => {
    if (!session) return; // normal user — no restriction

    const pageKey = PATH_TO_PAGE_KEY[pathname];
    if (!pageKey) return; // page not in the controlled list (e.g. /settings) — allow

    if (!canAccessPage(pageKey)) {
      // Redirect to first allowed page
      const first = session.allowedPages?.[0];
      navigate(first ? (PAGE_KEY_TO_PATH[first] || '/dashboard') : '/dashboard', { replace: true });
    }
  }, [pathname, session, navigate]);

  return children;
}
