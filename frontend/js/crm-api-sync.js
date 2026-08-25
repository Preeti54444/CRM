// crm-api-sync.js
// Fetch data from FastAPI backend and populate localStorage expected by the client DataStore.

(function(){
  // Use centralized API base from config.js
  const getApiBase = () => {
    if (typeof window.getCRMApiBase === 'function') {
      return window.getCRMApiBase();
    }
    // Fallback if config.js not loaded
    return window.API_BASE || window.location.origin;
  };

  const API_BASE = getApiBase();
  console.log('[crm-api-sync] Using API base:', API_BASE);

  async function fetchJSON(path){
    if (!path) return null;
    const normalizedPath = path.startsWith('/') ? path : '/' + path;
    const session = (() => {
      try { return JSON.parse(localStorage.getItem('crm_session') || '{}') } catch (e) { return {} }
    })();
    const token = session?.access_token || session?.token || null;
    
    // Enhanced logging for authentication debugging
    console.log('[crm-api-sync] fetchJSON:', {
      path,
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      tokenPrefix: token ? token.substring(0, 20) + '...' : 'none',
      hasSession: !!session?.email,
      userEmail: session?.email || 'none'
    });
    
    const authHeader = token ? { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}` } : {};
    const url = path.startsWith('http') ? path : API_BASE + normalizedPath;
    
    try{
      const res = await fetch(url, {
        cache:'no-cache',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          ...authHeader
        }
      });
      if (!res.ok) {
        if ([401, 403, 429].includes(res.status)) {
          console.error('[crm-api-sync] Auth failure:', {
            url,
            status: res.status,
            hasToken: !!token,
            tokenLength: token ? token.length : 0,
            userEmail: session?.email || 'none',
            authHeader: authHeader.Authorization ? 'present' : 'missing'
          });
          return null;
        }
        throw new Error('HTTP '+res.status);
      }
      return await res.json();
    }catch(e){
      console.error('[crm-api-sync] Fetch failed:', {
        url,
        error: e.message,
        hasToken: !!token,
        userEmail: session?.email || 'none'
      });
      return null;
    }
  }

  function normalizeSyncPayload(data, storageKey) {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== 'object') return [];
    
    // Handle paginated responses (e.g., {items: [], total: n})
    if (data.items && Array.isArray(data.items)) return data.items;
    
    // Handle specific endpoint response formats
    if (storageKey === 'crm_tasks' && Array.isArray(data.tasks)) return data.tasks;
    if (storageKey === 'crm_notifications' && Array.isArray(data.notifications)) return data.notifications;
    
    // Handle nested arrays in response objects
    for (const value of Object.values(data)) {
      if (Array.isArray(value)) return value;
    }
    return [];
  }

  function isDatasetPopulated(key) {
    const raw = localStorage.getItem(key)
    if (!raw) return false
    try {
      const data = JSON.parse(raw)
      return Array.isArray(data) && data.length > 0
    } catch (e) {
      return false
    }
  }

  async function syncFromBackend(force = false) {
    // Check if user is authenticated before attempting to sync
    const session = (() => {
      try { return JSON.parse(localStorage.getItem('crm_session') || '{}') } catch (e) { return {} }
    })();
    const token = session?.access_token || session?.token || null;
    
    console.log('[crm-api-sync] Authentication check:', { hasToken: !!token, hasSession: !!session?.email, force });
    
    // Only run if user is authenticated and not already synced in this session (unless forced)
    if (!token) {
      console.log('[crm-api-sync] No auth token found, skipping sync');
      return false;
    }

    const requiredSyncKeys = [
      'crm_leads',
      'crm_leads_journey',
      'crm_eod',
      'crm_wod',
      'crm_tasks',
      'crm_users',
      'crm_notifications',
      'crm_work_sessions',
      'crm_followups',
      'crm_lender',
      'crm_calls',
      'crm_customers'
    ];

    if (!force && sessionStorage.getItem('crm_api_synced') && requiredSyncKeys.every(isDatasetPopulated)) {
      console.log('[crm-api-sync] Already synced, skipping');
      return true;
    }

    let syncedSuccessfully = false;

    // Direct FastAPI backend only: use individual API endpoints instead of legacy combined '/all'.
    // The backend does not expose a combined '/all' route, so we always sync by supported endpoints.

    // Fallback: try individual endpoints for anything missing
    const fallbackEndpoints = [
      { path: '/reports/sod', storageKey: 'crm_leads' },
      { path: '/leads?limit=1000', storageKey: 'crm_leads_journey' },
      { path: '/leads?limit=1000', storageKey: 'crm_leads' },
      { path: '/reports/eod', storageKey: 'crm_eod' },
      { path: '/reports/wod', storageKey: 'crm_wod' },
      { path: '/tasks', storageKey: 'crm_tasks' },
      { path: '/notifications', storageKey: 'crm_notifications' },
      { path: '/lender', storageKey: 'crm_lender' },
      { path: '/users', storageKey: 'crm_users' },
      { path: '/work-sessions', storageKey: 'crm_work_sessions' },
      { path: '/followups', storageKey: 'crm_followups' },
      { path: '/calls', storageKey: 'crm_calls' },
      { path: '/customers', storageKey: 'crm_customers' }
    ];

    for (const { path: endpoint, storageKey } of fallbackEndpoints) {
      if (!force && isDatasetPopulated(storageKey)) continue; // already populated
      const data = await fetchJSON(endpoint).catch(()=>null);
      if (!data) continue;
      try{
        const normalized = normalizeSyncPayload(data, storageKey);
        if (!normalized.length) continue;
        localStorage.setItem(storageKey, JSON.stringify(normalized));
        syncedSuccessfully = true;
        console.log('crm-api-sync: saved (fallback)', storageKey, normalized.length || 0);
      }catch(e){
        console.warn('crm-api-sync: error saving (fallback)', storageKey, e);
      }
    }

    if (syncedSuccessfully) {
      sessionStorage.setItem('crm_api_synced', '1');
      try { window.dispatchEvent(new Event('crm:api_synced')); } catch(e){}
      console.log('[crm-api-sync] Sync completed successfully');
    } else {
      if (force) sessionStorage.removeItem('crm_api_synced');
      console.log('[crm-api-sync] No data synced');
    }
    return syncedSuccessfully;
  }

  // Expose sync function globally
  window.syncCRMFromBackend = syncFromBackend;

  // Auto-sync on page load if authenticated
  (async function autoSync() {
    const session = (() => {
      try { return JSON.parse(localStorage.getItem('crm_session') || '{}') } catch (e) { return {} }
    })();
    const token = session?.access_token || session?.token || null;
    
    if (token) {
      console.log('[crm-api-sync] Auto-syncing on page load');
      await syncFromBackend();
    } else {
      console.log('[crm-api-sync] No auth token on page load, skipping auto-sync');
    }
  })();

  console.log('[crm-api-sync] Module loaded, syncCRMFromBackend() available globally');
})();
