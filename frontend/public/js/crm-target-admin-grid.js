/**
 * CRM Target Admin Grid - Live employee performance monitoring
 */
(function () {
  const GRID_ID = 'crmAdminTargetGrid'
  const KPI_ID = 'crmAdminTargetKPIs'
  const POLL_INTERVAL = 20000
  let pollTimer = null

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

  function zoneDot(zone) {
    return `<span class="zone-dot ${zone || 'gray'}"></span>`
  }

  function renderKPIs(kpis) {
    const container = document.getElementById(KPI_ID)
    if (!container || !kpis) return
    const items = [
      { num: kpis.green_zone_employees, lbl: 'Green Zone', color: '#059669' },
      { num: kpis.yellow_zone_employees, lbl: 'Yellow Zone', color: '#d97706' },
      { num: kpis.red_zone_employees, lbl: 'Red Zone', color: '#dc2626' },
      { num: kpis.gray_zone_employees, lbl: 'No Activity', color: '#9ca3af' },
      { num: kpis.total_calls_today, lbl: 'Calls Today', color: '#9B2335' },
      { num: kpis.total_leads_today, lbl: 'Leads Today', color: '#7c3aed' },
      { num: kpis.pending_calls, lbl: 'Pending Calls', color: '#dc2626' },
      { num: kpis.pending_leads, lbl: 'Pending Leads', color: '#dc2626' },
      { num: kpis.carry_forward_calls, lbl: 'CF Calls', color: '#b45309' },
      { num: kpis.carry_forward_leads, lbl: 'CF Leads', color: '#b45309' },
      { num: `${kpis.weekly_completion_pct}%`, lbl: 'Weekly %', color: '#059669' },
      { num: kpis.avg_calls_per_employee, lbl: 'Avg Calls/Emp', color: '#374151' },
    ]
    container.innerHTML = items.map(i => `
      <div class="admin-target-kpi">
        <div class="kpi-num" style="color:${i.color}">${i.num}</div>
        <div class="kpi-lbl">${i.lbl}</div>
      </div>`).join('')
  }

  function renderGrid(rows) {
    const container = document.getElementById(GRID_ID)
    if (!container) return
    if (!rows || !rows.length) {
      container.innerHTML = '<p style="padding:20px;color:#6b7280;">No employee target data available.</p>'
      return
    }
    container.innerHTML = `
      <div style="overflow-x:auto;">
        <table class="admin-target-grid">
          <thead><tr>
            <th>Employee</th><th>Calls</th><th>Leads</th>
            <th>Remaining C</th><th>Remaining L</th>
            <th>CF Calls</th><th>CF Leads</th>
            <th>Daily %</th><th>Weekly %</th><th>Mid-Week %</th>
            <th>Status</th><th>Zone</th>
            <th>Last Activity</th><th>Logout OK</th>
            <th>Login</th><th>Est. Finish</th><th>Trend</th>
          </tr></thead>
          <tbody>${rows.map(r => `<tr>
            <td><strong>${r.employee_name}</strong></td>
            <td>${r.today_calls}</td>
            <td>${r.today_leads}</td>
            <td style="color:${r.remaining_calls > 0 ? '#dc2626' : '#059669'}">${r.remaining_calls}</td>
            <td style="color:${r.remaining_leads > 0 ? '#dc2626' : '#059669'}">${r.remaining_leads}</td>
            <td>${r.carry_forward_calls}</td>
            <td>${r.carry_forward_leads}</td>
            <td>${r.daily_pct}%</td>
            <td>${r.weekly_pct}%</td>
            <td>${r.midweek_pct}%</td>
            <td>${r.status}</td>
            <td>${zoneDot(r.zone)}${r.zone}</td>
            <td>${r.last_activity ? new Date(r.last_activity).toLocaleTimeString() : '—'}</td>
            <td>${r.logout_eligible ? '✅' : '❌'}</td>
            <td>${r.office_login_time || '—'}</td>
            <td>${r.expected_finish_time || '—'}</td>
            <td>${r.performance_trend === 'up' ? '📈' : '📉'}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>`
  }

  async function refresh() {
    const role = (window.S?.role || '').toLowerCase()
    if (role !== 'admin') return

    try {
      const [gridResp, kpiResp] = await Promise.all([
        fetch(`${getApiBase()}/targets/admin/grid`, { headers: getAuthHeaders() }),
        fetch(`${getApiBase()}/targets/admin/kpis`, { headers: getAuthHeaders() }),
      ])
      if (gridResp.ok) renderGrid(await gridResp.json())
      if (kpiResp.ok) renderKPIs(await kpiResp.json())
      // If backend calls failed, fall back to client-side computed targets
      if ((!gridResp || !gridResp.ok) || (!kpiResp || !kpiResp.ok)) {
        if (window.TargetsEngine && typeof window.TargetsEngine.computeAllEmployees === 'function') {
          try {
            const live = window.TargetsEngine.computeAllEmployees()
            const rows = Object.values(live).map(v => ({
              employee_name: v.employee_name,
              today_calls: v.calls_completed,
              today_leads: v.leads_completed,
              remaining_calls: v.calls_remaining,
              remaining_leads: v.leads_remaining,
              carry_forward_calls: v.carry_forward_calls,
              carry_forward_leads: v.carry_forward_leads,
              daily_pct: v.calls_progress_pct,
              weekly_pct: Math.round((v.weekly_calls_completed / Math.max(1, v.weekly_calls_target)) * 100),
              midweek_pct: Math.round((v.midweek_calls_completed / Math.max(1, v.midweek_calls_target)) * 100),
              status: v.status,
              zone: v.zone,
              last_activity: v.last_activity,
              logout_eligible: (v.calls_remaining <= 0 && v.leads_remaining <= 0),
              office_login_time: '—',
              expected_finish_time: v.expected_completion_time,
              performance_trend: 'up',
            }))
            renderGrid(rows)
            renderKPIs({
              green_zone_employees: rows.filter(r => r.zone === 'green').length,
              yellow_zone_employees: rows.filter(r => r.zone === 'yellow').length,
              red_zone_employees: rows.filter(r => r.zone === 'red').length,
              gray_zone_employees: rows.filter(r => r.zone === 'gray').length,
              total_calls_today: rows.reduce((s, r) => s + (r.today_calls || 0), 0),
              total_leads_today: rows.reduce((s, r) => s + (r.today_leads || 0), 0),
              pending_calls: rows.reduce((s, r) => s + (r.remaining_calls || 0), 0),
              pending_leads: rows.reduce((s, r) => s + (r.remaining_leads || 0), 0),
              carry_forward_calls: rows.reduce((s, r) => s + (r.carry_forward_calls || 0), 0),
              carry_forward_leads: rows.reduce((s, r) => s + (r.carry_forward_leads || 0), 0),
              weekly_completion_pct: Math.round(rows.reduce((s, r) => s + (r.weekly_pct || 0), 0) / Math.max(1, rows.length)),
              avg_calls_per_employee: Math.round(rows.reduce((s, r) => s + (r.today_calls || 0), 0) / Math.max(1, rows.length)),
            })
          } catch (e) {
            console.warn('TargetsEngine fallback failed:', e)
          }
        }
      }
    } catch (e) {
      console.warn('Admin target grid fetch failed:', e)
    }
  }

  window.CRMAdminTargetGrid = {
    init() {
      const role = (window.S?.role || '').toLowerCase()
      if (role !== 'admin') return
      refresh()
      pollTimer = setInterval(refresh, POLL_INTERVAL)
    },
    refresh,
    destroy() { if (pollTimer) clearInterval(pollTimer) }
  }

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      if (window.S) window.CRMAdminTargetGrid.init()
    }, 2000)
  })
})()
