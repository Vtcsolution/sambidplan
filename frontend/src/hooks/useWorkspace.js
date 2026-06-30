const WS_KEY = 'workspaceSession';

export function getWorkspaceSession() {
  // sessionStorage is per-tab — owner on Tab 1 is unaffected by workspace login on Tab 2
  try { return JSON.parse(sessionStorage.getItem(WS_KEY) || 'null'); }
  catch { return null; }
}

export function saveWorkspaceSession(data, token) {
  sessionStorage.setItem(WS_KEY, JSON.stringify({ ...data, token }));
}

export function clearWorkspaceSession() {
  sessionStorage.removeItem(WS_KEY);
}

export function isWorkspaceMode() {
  return !!getWorkspaceSession();
}

export function canAccessPage(pageKey) {
  const session = getWorkspaceSession();
  if (!session) return true;
  return session.allowedPages?.includes(pageKey);
}

// Map route path → page key
export const PATH_TO_PAGE_KEY = {
  '/dashboard':            'dashboard',
  '/opportunities':        'opportunities',
  '/saved':                'saved',
  '/pipeline':             'bid-pipeline',
  '/calendar':             'calendar',
  '/alerts':               'alerts',
  '/winning-bids':         'winning-bids',
  '/proposal-builder':     'proposal-builder',
  '/rfp-analyzer':         'rfp-analyzer',
  '/go-no-go':             'go-no-go',
  '/teaming-finder':       'teaming-finder',
  '/contract-vehicles':    'contract-vehicles',
  '/market-research':      'market-research',
  '/past-performance':     'past-performance',
  '/sources-sought':       'sources-sought',
  '/ai-predictions':       'ai-predictions',
  '/referral':             'referral',
  '/company/profile':           'company-profile',
  '/company/team':              'company-team',
  '/company/documents':         'company-documents',
  '/capability-statement':      'capability-statement',
  '/company/managed-service':   'company-managed-service',
};

export const PAGE_KEY_TO_PATH = Object.fromEntries(
  Object.entries(PATH_TO_PAGE_KEY).map(([p, k]) => [k, p])
);
