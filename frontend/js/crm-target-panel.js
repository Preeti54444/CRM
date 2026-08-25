/**
 * CRM Target Panel - Today's Target with live updates
 */
(function () {
  const POLL_INTERVAL = 15000
  const PANEL_ID = 'crmTargetPanel'
  let pollTimer = null
  let lastData = null

  function getAuthHeaders() {
    const session = (() => {
      try { return JSON.parse(localStorage.getItem('crm_session') || '{}') } catch (e) { return {} }
    })()
    const token = session?.access_token || session?.token || ''
    return token ? { Authorization: `Bearer ${token}`, Accept: 'application/json' } : { Accept: 'application/json' }
  }

  function getApiBase() {
    if (window.getCRMApiBase) return window.getCRMApiBase()
    if (window.CRM_API_BASE) return window.CRM_API_BASE
    return 'http://127.0.0.1:8085'
  }

  function zoneClass(zone) {
    return `target-zone-${zone || 'gray'}`
  }

  function progressColor(pct, zone) {
    if (zone === 'gray') return 'gray'
    if (pct >= 100) return 'green'
    if (pct >= 70) return 'yellow'
    return 'red'
  }

  function renderCircular(pct, color) {
    const r = 34
    const circ = 2 * Math.PI * r
    const offset = circ - (pct / 100) * circ
    const colors = { green: '#059669', yellow: '#d97706', red: '#dc2626', gray: '#9ca3af' }
    return `<div class="target-circular">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="${r}" fill="none" stroke="#e5e7eb" stroke-width="6"/>
        <circle cx="40" cy="40" r="${r}" fill="none" stroke="${colors[color] || colors.gray}"
          stroke-width="6" stroke-dasharray="${circ}" stroke-dashoffset="${offset}" stroke-linecap="round"/>
      </svg>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:14px;font-weight:800;">${pct}%</div>
    </div>`
  }

  function renderMetricCard(label, completed, remaining, target, carryForward, pct, zone) {
    const color = progressColor(pct, zone)
    const cfHtml = carryForward > 0
      ? `<div class="target-carry-forward"><span>Carry Forward: ${carryForward}</span><span>Total Required: ${target + carryForward}</span></div>`
      : ''
    return `<div class="target-metric-card">
      <div class="target-metric-label">${label}</div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;">
        <div>
          <div class="target-metric-value">${completed}</div>
          <div style="font-size:12px;color:#6b7280;">Completed</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:20px;font-weight:700;color:#dc2626;">${remaining}</div>
          <div style="font-size:12px;color:#6b7280;">Remaining</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:16px;font-weight:600;">${target}</div>
          <div style="font-size:12px;color:#6b7280;">Target</div>
        </div>
      </div>
      ${cfHtml}
      <div class="target-progress-bar"><div class="target-progress-fill ${color}" style="width:${Math.min(100, pct)}%"></div></div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px;">Progress: ${pct}%</div>
    </div>`
  }

  function renderPanel(data) {
    const container = document.getElementById(PANEL_ID)
    if (!container || !data) return

    const zone = data.zone || 'gray'
    const overallPct = data.overall_progress_pct || 0
    const color = progressColor(overallPct, zone)
    const badges = (data.badges || []).map(b => `<span class="target-badge">${b}</span>`).join('')

    container.innerHTML = `
      <div class="target-panel">
        <div class="target-panel-header">
          <div class="target-panel-title">Today's Target</div>
          <span class="target-status-badge ${zoneClass(zone)}">${data.status || 'On Track'}</span>
        </div>
        <div class="target-metrics-grid">
          ${renderMetricCard('Calls', data.calls_completed, data.calls_remaining, data.daily_calls_target, data.carry_forward_calls, data.calls_progress_pct, zone)}
          ${renderMetricCard('Leads', data.leads_completed, data.leads_remaining, data.daily_leads_target, data.carry_forward_leads, data.leads_progress_pct, zone)}
        </div>
        <div class="target-overall">
          <div>
            <div style="font-size:13px;color:#6b7280;font-weight:600;">Overall Progress</div>
            <div class="target-overall-pct ${zoneClass(zone)}" style="background:transparent;padding:0;">${overallPct}%</div>
            <div style="font-size:12px;color:#6b7280;margin-top:4px;">
              Expected finish: ${data.expected_completion_time || '—'}
              ${data.current_rank ? ` · Rank #${data.current_rank}` : ''}
              · Score: ${data.performance_score || 0}/100
            </div>
          </div>
          <div style="position:relative;width:80px;height:80px;">
            ${renderCircular(overallPct, color)}
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px;">
          <div style="background:#f0fdf4;padding:12px;border-radius:8px;font-size:12px;">
            <strong>Weekly:</strong> ${data.weekly_calls_completed}/${data.weekly_calls_target} calls,
            ${data.weekly_leads_completed}/${data.weekly_leads_target} leads (${data.weekly_progress_pct}%)
          </div>
          <div style="background:#eff6ff;padding:12px;border-radius:8px;font-size:12px;">
            <strong>Mid-Week:</strong> ${data.midweek_calls_completed}/${data.midweek_calls_target} calls,
            ${data.midweek_leads_completed}/${data.midweek_leads_target} leads
            <span style="color:${data.midweek_risk_level === 'high' ? '#dc2626' : '#059669'}">
              (${data.midweek_risk_level} risk)
            </span>
          </div>
        </div>
        ${badges ? `<div class="target-badges">${badges}</div>` : ''}
      </div>`
  }

  async function fetchTargetData() {
    const role = (window.S?.role || '').toLowerCase()
    if (role !== 'employee') return null
    // Prefer backend live endpoint when available; otherwise fallback to local TargetsEngine
    try {
      if (getApiBase() && window.fetch) {
        try {
          const resp = await fetch(`${getApiBase()}/targets/live`, { headers: getAuthHeaders() })
          if (resp && resp.ok) return await resp.json()
        } catch (e) {
          // backend unavailable, fallback below
        }
      }
      if (window.TargetsEngine && typeof window.TargetsEngine.getLive === 'function') {
        const session = (() => { try { return JSON.parse(localStorage.getItem('crm_session')||'{}') } catch (e) { return {} } })()
        const id = (session.email || session.id || session.user || '').toString().toLowerCase()
        const live = window.TargetsEngine.getLive(id)
        if (live) return live
      }
    } catch (e) {
      console.warn('Target panel fetch fallback failed:', e)
    }
    return null
  }

  async function refreshPanel() {
    const data = await fetchTargetData()
    if (data) {
      lastData = data
      renderPanel(data)
      window._crmTargetData = data
      window.dispatchEvent(new CustomEvent('crm-target-data-updated', { detail: data }))
    }
  }

  function startPolling() {
    if (pollTimer) clearInterval(pollTimer)
    refreshPanel()
    pollTimer = setInterval(refreshPanel, POLL_INTERVAL)
  }

  function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
  }

  function onDataSync(event) {
    if (event?.type === 'call' || event?.type === 'lead' || event?.entity === 'calls' || event?.entity === 'leads') {
      refreshPanel()
    }
  }

  window.CRMTargetPanel = {
    init() {
      const role = (window.S?.role || '').toLowerCase()
      if (role !== 'employee') return
      startPolling()
      document.addEventListener('crm-data-sync', onDataSync)
      window.addEventListener('crm-target-refresh', refreshPanel)
    },
    refresh: refreshPanel,
    getData: () => lastData,
    destroy: () => { stopPolling(); document.removeEventListener('crm-data-sync', onDataSync) }
  }

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      if (window.S) window.CRMTargetPanel.init()
    }, 1500)
  })
})()
