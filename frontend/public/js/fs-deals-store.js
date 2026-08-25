/*
 * Funding Sathi — Deal Store (browser-side persistence)
 * -----------------------------------------------------
 * Provides list/get/upsert of deals for the Forecast dashboard.
 * Uses localStorage as the primary store so the whole flow works
 * end-to-end without a backend endpoint. If a backend `/api/deals`
 * exists at window.API_BASE it is also queried and merged.
 * The Deal Processing Console (crm1.html) upserts here whenever a
 * user hits "Save Complete Deal Process" or when the calculator's
 * Apply-to-Deal is triggered.
 */
(function (root) {
  "use strict";

  var LS_KEY = "fs_deals_v1";

  // No seed/demo deals by default — use backend-supplied or persisted deals.
  function load() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) {
        // Don't write demo data into localStorage. Return empty list so
        // the UI loads real deals from the backend or other store.
        return [];
      }
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function save(arr) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(arr));
    } catch (e) {}
  }

  function upsert(deal) {
    if (!deal || !deal.dealRef) return;
    var arr = load();
    var idx = arr.findIndex(function (d) { return d.dealRef === deal.dealRef; });
    var payload = Object.assign({}, arr[idx] || {}, deal, { updatedAt: new Date().toISOString().slice(0, 10) });
    if (idx === -1) arr.push(payload);
    else arr[idx] = payload;
    save(arr);
    // Notify open forecast tabs
    window.dispatchEvent(new CustomEvent("fs-deals-updated", { detail: payload }));
    return payload;
  }

  function list() { return load(); }
  function reset() { localStorage.removeItem(LS_KEY); return load(); }

  // Try to fetch latest deals from backend in background and merge into local store.
  var _fs_deals_fetched_once = false;
  async function fetchFromApi() {
    if (_fs_deals_fetched_once) return;
    _fs_deals_fetched_once = true;
    try {
      var session = {};
      try { session = JSON.parse(localStorage.getItem('crm_session') || '{}'); } catch (e) {}
      var token = session && (session.access_token || session.token);
      if (!token) return;

      var apiBase = (typeof window.getCRMApiBase === 'function' ? getCRMApiBase() : (window.API_BASE || window.location.origin));
      if (!apiBase) return;
      apiBase = String(apiBase).replace(/\/$/, '');
      var url = apiBase + '/api/forecast/deals?limit=500';
      var resp = await fetch(url, {
        credentials: 'include',
        cache: 'no-cache',
        headers: {
          'Accept': 'application/json',
          'Authorization': token.startsWith('Bearer ') ? token : 'Bearer ' + token
        }
      });
      if (!resp || !resp.ok) return;
      var j = await resp.json();
      if (!j || j.status !== 'success' || !Array.isArray(j.data)) return;
      var remote = j.data.map(function (d) {
        return {
          dealRef: d.deal_name || ('deal-' + (d.id || d.lead_id || Math.random().toString(36).slice(2,8))),
          customer: d.company_name || d.deal_name || '',
          assignedLender: d.lender || '',
          product: d.product || '',
          vertical: d.vertical || '',
          salesExecutive: d.rm_name || '',
          pipelineStage: d.current_stage || d.currentStage || '',
          sanctionAmount: d.loan_amount || d.sanction_amount || 0,
          updatedAt: d.disbursement_date || d.updated_at || new Date().toISOString(),
          exchangeRate: d.exchange_rate || 96.29,
          _expected_revenue_from_api: d.expected_revenue,
          _weighted_revenue_from_api: d.weighted_revenue
        };
      });

      var arr = load();
      remote.forEach(function (r) {
        var idx = arr.findIndex(function (a) { return a.dealRef === r.dealRef; });
        if (idx === -1) arr.push(r); else arr[idx] = Object.assign({}, arr[idx], r);
      });
      save(arr);
      try { window.dispatchEvent(new CustomEvent('fs-deals-updated', { detail: null })); } catch (e) {}
    } catch (e) {
      // ignore fetch errors — keep local data
    }
  }

  if (typeof window.fetch === 'function') setTimeout(fetchFromApi, 0);

  root.FSDeals = { list: list, upsert: upsert, reset: reset, _fetchFromApi: fetchFromApi };
})(window);
