// ═══════════════════════════════════════════════════════════════
// CRM DASHBOARD - Dashboard Rendering & KPI Functions
// ═══════════════════════════════════════════════════════════════

// Main render function
function renderAll() {
  renderDashboard()
}

function getDashboardEmployeeFilter() {
  return document.getElementById('dashboardEmployeeFilter')?.value?.trim() || ''
}

function matchesEmployee(item, employeeName) {
  if (!employeeName) return true
  const lowerName = employeeName.toLowerCase()
  const matchFields = [
    item.salesExecutive, item.sales_executive, item.assignedTo, item.assigned_to,
    item.assignedBy, item.assigned_by, item.createdBy, item.createdByName,
    item.owner, item.ownerName, item.agentName, item.agentEmail,
    item.attendee, item.attendeeName, item.contactPerson, item.contact_name,
    item.customerName, item.company, item.companyName
  ].filter(Boolean)

  return matchFields.some(value => String(value).toLowerCase().includes(lowerName))
}

function filterByEmployee(records, employeeName) {
  if (!employeeName || !Array.isArray(records)) return records || []
  return records.filter(record => matchesEmployee(record, employeeName))
}

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase()
}

function decodeHtmlEntities(value) {
  if (typeof value !== 'string') return value
  const txt = document.createElement('textarea')
  txt.innerHTML = value
  return txt.value
}

function parseLeadData(lead) {
  if (!lead || typeof lead !== 'object') return {}
  const normalized = { ...lead }
  const data = normalized.data

  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data)
      if (parsed && typeof parsed === 'object') {
        Object.assign(normalized, parsed)
      }
    } catch (e) {
      try {
        const parsed = JSON.parse(decodeHtmlEntities(data))
        if (parsed && typeof parsed === 'object') {
          Object.assign(normalized, parsed)
        }
      } catch (inner) {
        // ignore invalid nested JSON
      }
    }
  } else if (data && typeof data === 'object') {
    Object.assign(normalized, data)
  }

  return normalized
}

function dashboardGetLeadCompanyName(lead) {
  if (!lead || typeof lead !== 'object') return '—'
  const nested = parseLeadData(lead)
  return nested.companyName || nested.company || nested.Company || nested.customerCompany || nested.customerName || nested.customer_name || nested.CompanyName || nested.CustomerName || nested.CUSTOMER_NAME || nested.customer || lead.companyName || lead.company || lead.Company || lead.customerCompany || lead.customerName || lead.customer_name || lead.CompanyName || lead.CustomerName || lead.CUSTOMER_NAME || lead.customer || '—'
}

function dashboardGetLeadDisplayName(lead, fallback) {
  if (!lead || typeof lead !== 'object') return fallback || 'Unknown'
  const nested = parseLeadData(lead)
  return nested.contactPerson || nested.Contact || nested.CONTACT || nested.contact_name || nested.contactName || nested.ContactName || nested.name || nested.leadName || nested.LeadName || lead.contactPerson || lead.Contact || lead.CONTACT || lead.contact_name || lead.contactName || lead.ContactName || lead.name || lead.leadName || lead.LeadName || fallback || 'Unknown'
}

function initDashboardFilters() {
  const select = document.getElementById('dashboardEmployeeFilter')
  if (!select || typeof DataStore === 'undefined') return

  const employees = DataStore.get('employees') || []
  const uniqueEmployees = []
  const seen = new Set()

  employees.forEach(emp => {
    const label = emp.name || emp.email || 'Unknown'
    const value = String(emp.email || emp.name || label).trim()
    if (!value || seen.has(value.toLowerCase())) return
    seen.add(value.toLowerCase())
    uniqueEmployees.push({ label, value })
  })

  select.innerHTML = [
    `<option value="">All Executives</option>`,
    ...uniqueEmployees.map(emp => `<option value="${emp.value}">${emp.label}</option>`)
  ].join('')
}

// Render Follow-up Reminders Widget
async function renderFollowupRemindersWidget() {
  const widgetContainer = document.getElementById('followupRemindersWidget')
  if (!widgetContainer) return

  try {
    const response = await fetch(`${window.API_BASE}/followups/statistics`, {
      headers: {
        'Authorization': `Bearer ${S?.access_token || JSON.parse(localStorage.getItem('crm_session') || '{}').access_token}`
      }
    })

    if (response.ok) {
      const stats = await response.json()
      widgetContainer.innerHTML = `
        <div class="dashboard-widget">
          <div class="dashboard-widget-title">Follow-up Reminders</div>
          <div class="followup-widget-stats">
            <div class="followup-widget-stat">
              <div class="followup-widget-stat-value">${stats.total_today || 0}</div>
              <div class="followup-widget-stat-label">Today's Follow-ups</div>
            </div>
            <div class="followup-widget-stat">
              <div class="followup-widget-stat-value">${stats.completed_today || 0}</div>
              <div class="followup-widget-stat-label">Completed</div>
            </div>
            <div class="followup-widget-stat">
              <div class="followup-widget-stat-value">${stats.pending_today || 0}</div>
              <div class="followup-widget-stat-label">Pending</div>
            </div>
            <div class="followup-widget-stat">
              <div class="followup-widget-stat-value" style="color:#ef4444;">${stats.overdue_today || 0}</div>
              <div class="followup-widget-stat-label">Overdue</div>
            </div>
          </div>
          <div class="followup-widget-list" id="followupWidgetList">
            <div style="padding:20px;text-align:center;color:var(--gray-500);">Loading...</div>
          </div>
        </div>
      `

      // Load today's follow-ups for the list
      loadFollowupWidgetList()
    } else {
      widgetContainer.innerHTML = `
        <div class="dashboard-widget">
          <div class="dashboard-widget-title">Follow-up Reminders</div>
          <div style="padding:20px;text-align:center;color:var(--gray-500);">Failed to load follow-up data</div>
        </div>
      `
    }
  } catch (error) {
    console.error('Failed to load follow-up statistics:', error)
    widgetContainer.innerHTML = `
      <div class="dashboard-widget">
        <div class="dashboard-widget-title">Follow-up Reminders</div>
        <div style="padding:20px;text-align:center;color:var(--gray-500);">Failed to load follow-up data</div>
      </div>
    `
  }
}

// Load follow-up list for widget
async function loadFollowupWidgetList() {
  const listContainer = document.getElementById('followupWidgetList')
  if (!listContainer) return

  try {
    const response = await fetch(`${window.API_BASE}/followups/today`, {
      headers: {
        'Authorization': `Bearer ${S?.access_token || JSON.parse(localStorage.getItem('crm_session') || '{}').access_token}`
      }
    })

    if (response.ok) {
      const followups = await response.json()
      
      if (!followups || followups.length === 0) {
        listContainer.innerHTML = `
          <div style="padding:20px;text-align:center;color:var(--gray-500);">No follow-ups scheduled for today</div>
        `
        return
      }

      listContainer.innerHTML = followups.slice(0, 5).map(followup => {
        const timeStr = followup.followup_time 
          ? new Date(`2000-01-01T${followup.followup_time}`).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
          : ''
        
        return `
          <div class="followup-widget-item" onclick="FollowUpReminders.openLead(${followup.lead_id})">
            <div class="followup-widget-item-info">
              <div class="followup-widget-item-name">${followup.lead_name || 'N/A'}</div>
              <div class="followup-widget-item-time">${timeStr || 'All day'} - ${followup.company_name || ''}</div>
            </div>
            <button class="btn btn-sm btn-primary followup-widget-item-action" onclick="event.stopPropagation(); FollowUpReminders.callCustomer('${followup.mobile || ''}')">Call</button>
          </div>
        `
      }).join('')
    }
  } catch (error) {
    console.error('Failed to load follow-up list:', error)
  }
}

let dashboardKpiRefreshHandle = null

function formatINR(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function formatCount(value) {
  return Number(value || 0).toLocaleString('en-IN')
}

function renderBackendKpis(backendStats) {
  if (!backendStats) return

  const kpiLeads = document.getElementById('kpi-leads')
  const kpiClients = document.getElementById('kpi-clients')
  const kpiDeals = document.getElementById('kpi-deals')
  const kpiRevenue = document.getElementById('kpi-revenue')
  const kpiLogins = document.getElementById('kpi-logins')
  const kpiSanctions = document.getElementById('kpi-sanctions')
  const kpiDisbursement = document.getElementById('kpi-disbursement')
  const kpiFundingShare = document.getElementById('kpi-funding-share')
  const kpiWeightedPipeline = document.getElementById('kpi-weighted-pipeline')
  const kpiConversionRate = document.getElementById('kpi-conversion-rate')

  if (kpiLeads && backendStats.total_leads !== undefined) {
    kpiLeads.textContent = formatCount(backendStats.total_leads)
  }
  if (kpiClients && backendStats.total_clients !== undefined) {
    kpiClients.textContent = formatCount(backendStats.total_clients)
  }
  if (kpiDeals && backendStats.total_deals !== undefined) {
    kpiDeals.textContent = formatCount(backendStats.total_deals)
  }
  if (kpiRevenue && backendStats.total_revenue !== undefined) {
    kpiRevenue.textContent = formatINR(backendStats.total_revenue)
  }
  if (kpiLogins && backendStats.total_logins !== undefined) {
    kpiLogins.textContent = formatCount(backendStats.total_logins)
  }
  if (kpiSanctions && backendStats.total_sanctions !== undefined) {
    kpiSanctions.textContent = formatCount(backendStats.total_sanctions)
  }
  if (kpiDisbursement && backendStats.total_disbursement !== undefined) {
    kpiDisbursement.textContent = formatINR(backendStats.total_disbursement)
  }
  if (kpiFundingShare && backendStats.funding_sathi_revenue_share !== undefined) {
    kpiFundingShare.textContent = formatINR(backendStats.funding_sathi_revenue_share)
  }
  if (kpiWeightedPipeline && backendStats.weighted_pipeline !== undefined) {
    kpiWeightedPipeline.textContent = formatINR(backendStats.weighted_pipeline)
  }
  if (kpiConversionRate && backendStats.conversion_rate !== undefined) {
    kpiConversionRate.textContent = `${Number(backendStats.conversion_rate).toFixed(1)}%`
  }
}

async function fetchDashboardKpis() {
  if (!window.API || typeof window.API.getDashboardStats !== 'function') return
  try {
    const backendStats = await window.API.getDashboardStats()
    renderBackendKpis(backendStats)
  } catch (error) {
    console.error('[Dashboard] Failed to refresh KPI metrics:', error)
  }
}

function startDashboardKpiRefresh() {
  if (dashboardKpiRefreshHandle) return
  dashboardKpiRefreshHandle = setInterval(fetchDashboardKpis, 60000)
}

function updateDashboardEmployeeFilter() {
  renderDashboard()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboardFilters)
} else {
  initDashboardFilters()
}

window.addEventListener('crm:api_synced', () => {
  initDashboardFilters()
  renderDashboard()
  startDashboardKpiRefresh()
})

window.addEventListener('crm-target-data-updated', () => {
  renderDashboard()
})

// Prefer explicit DataStore sync events instead of broadly watching many storage keys.
// Other modules should dispatch `crm-data-sync` when leads/calls/tasks/etc. are updated.
let isProcessingSync = false
window.addEventListener('crm-data-sync', () => {
  if (isProcessingSync) return
  isProcessingSync = true
  try {
    initDashboardFilters()
    renderDashboard()
  } finally {
    setTimeout(() => { isProcessingSync = false }, 0)
  }
})

// Keep a minimal storage listener for session changes only.
window.addEventListener('storage', event => {
  if (event.key === 'crm_session') {
    initDashboardFilters()
    renderDashboard()
  }
})

function getDashboardGreeting(date = new Date()) {
  const hours = date.getHours()
  if (hours < 12) return 'Good morning'
  if (hours < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDashboardDate(date = new Date()) {
  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

function getDailyDashboardQuote(date = new Date()) {
  const quotes = [
    "Success comes from completing today's priorities.",
    'Small progress each day adds up to big results.',
    'A strong pipeline starts with purposeful outreach.',
    'Each new day is a fresh opportunity to move deals forward.',
    'Lead with empathy, follow up with clarity, and close with confidence.',
    'Track what matters today and the results will follow tomorrow.',
    'Consistent action turns good prospects into great customers.'
  ]
  const index = Math.abs(Math.floor(date.getTime() / 86400000)) % quotes.length
  return quotes[index]
}

function updateDashboardHeader() {
  const session = window.S || JSON.parse(localStorage.getItem('crm_session') || '{}')
  const name = String(session?.name || session?.displayName || session?.email || 'Team').trim() || 'Team'
  const greetingEl = document.getElementById('dashboardGreeting')
  if (greetingEl) {
    greetingEl.textContent = `${getDashboardGreeting()}, ${name}! 👋`
  }
  const quoteEl = document.getElementById('dashboardQuoteText')
  if (quoteEl) {
    quoteEl.textContent = `📌 "${getDailyDashboardQuote()}"`
  }
  const dateEl = document.getElementById('todayDate')
  if (dateEl) {
    dateEl.textContent = formatDashboardDate()
  }
}

function getDashboardMetricDateKey(value) {
  if (!value) return ''
  const date = new Date(value)
  if (!isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10)
  }
  if (typeof value === 'string' && value.length >= 10) {
    return value.slice(0, 10)
  }
  return ''
}

function renderDashboardTargetCards() {
  const calls = DataStore.get('calls') || []
  const leads = DataStore.get('leads') || []
  const tasks = DataStore.get('tasks') || []
  const meetings = DataStore.get('meetings') || []
  const targetData = (window.CRMTargetPanel && typeof window.CRMTargetPanel.getData === 'function') ? window.CRMTargetPanel.getData() : null
  const todayKey = new Date().toISOString().slice(0, 10)

  const callsToday = calls.filter(call => {
    const dateKey = getDashboardMetricDateKey(call.date || call.timestamp || call.call_date || call.createdAt || call.created_at)
    return dateKey === todayKey
  }).length
  const leadsToday = leads.filter(lead => {
    const dateKey = getDashboardMetricDateKey(lead.createdAt || lead.created_at || lead.created_date || lead.addedAt || lead.added_date || lead.date)
    return dateKey === todayKey
  }).length
  const meetingsToday = meetings.filter(meeting => {
    const dateKey = getDashboardMetricDateKey(meeting.date || meeting.meetingDate || meeting.meeting_date)
    return dateKey === todayKey && String(meeting.status || '').toLowerCase() !== 'cancelled'
  })
  const meetingsCompleted = meetingsToday.filter(m => String(m.status || '').toLowerCase() === 'completed').length
  const tasksToday = tasks.filter(task => {
    const dateKey = getDashboardMetricDateKey(task.dueDate || task.due_date || task.due)
    return dateKey === todayKey
  })
  const tasksCompletedToday = tasksToday.filter(task => task.completed === true || String(task.status || '').toLowerCase() === 'completed' || String(task.status || '').toLowerCase() === 'done').length

  const callsTarget = targetData ? Number(targetData.daily_calls_target || 0) : 0
  const callsCompleted = targetData ? Number(targetData.calls_completed || callsToday) : callsToday
  const callsRemaining = targetData ? Number(targetData.calls_remaining || Math.max(0, callsTarget - callsCompleted)) : 0
  const callsPct = callsTarget > 0 ? Math.round((callsCompleted / callsTarget) * 100) : (callsCompleted > 0 ? 100 : 0)

  const leadsTarget = targetData ? Number(targetData.daily_leads_target || 0) : 0
  const leadsCompleted = targetData ? Number(targetData.leads_completed || leadsToday) : leadsToday
  const leadsRemaining = targetData ? Number(targetData.leads_remaining || Math.max(0, leadsTarget - leadsCompleted)) : 0
  const leadsPct = leadsTarget > 0 ? Math.round((leadsCompleted / leadsTarget) * 100) : (leadsCompleted > 0 ? 100 : 0)

  const meetingsTarget = meetingsToday.length
  const meetingsPct = meetingsTarget > 0 ? Math.round((meetingsCompleted / meetingsTarget) * 100) : 0

  const tasksTarget = tasksToday.length
  const tasksPct = tasksTarget > 0 ? Math.round((tasksCompletedToday / tasksTarget) * 100) : 0

  const setCard = (valueElId, barElId, textElId, valueText, pct, text, barColor) => {
    const valueEl = document.getElementById(valueElId)
    const barEl = document.getElementById(barElId)
    const textEl = document.getElementById(textElId)
    if (valueEl) valueEl.textContent = valueText
    if (barEl) barEl.style.width = `${Math.min(100, pct)}%`
    if (textEl) textEl.textContent = text
    if (barEl) barEl.style.background = barColor
  }

  setCard(
    'dashboardCallsTargetValue',
    'dashboardCallsTargetBar',
    'dashboardCallsTargetText',
    `${callsCompleted} / ${callsTarget}`,
    callsPct,
    callsTarget > 0 ? `${callsPct}% completed` : `${callsCompleted} calls today`,
    '#dc2626'
  )

  setCard(
    'dashboardLeadsTargetValue',
    'dashboardLeadsTargetBar',
    'dashboardLeadsTargetText',
    `${leadsCompleted} / ${leadsTarget}`,
    leadsPct,
    leadsTarget > 0 ? `${leadsPct}% completed` : `${leadsCompleted} leads today`,
    '#16a34a'
  )

  setCard(
    'dashboardMeetingsTargetValue',
    'dashboardMeetingsTargetBar',
    'dashboardMeetingsTargetText',
    `${meetingsCompleted} / ${meetingsTarget}`,
    meetingsPct,
    meetingsTarget > 0 ? `${meetingsPct}% completed` : `${meetingsToday} meetings today`,
    '#7c3aed'
  )

  setCard(
    'dashboardTasksTargetValue',
    'dashboardTasksTargetBar',
    'dashboardTasksTargetText',
    `${tasksCompletedToday} / ${tasksTarget}`,
    tasksPct,
    tasksTarget > 0 ? `${tasksPct}% completed` : `${tasksCompletedToday} tasks completed`,
    '#d97706'
  )
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateDashboardHeader)
} else {
  updateDashboardHeader()
}

// Dashboard renderer
function renderDashboard() {
  updateDashboardHeader()
  const employeeFilter = getDashboardEmployeeFilter()
  const leads = DataStore.get('leads')
  const filteredLeads = filterByEmployee(leads, employeeFilter)
  const role = normalizeRole(S?.role)
  const isAdmin = role === 'admin'
  const isManager = role === 'manager'

  const kpiLeads = document.getElementById('kpi-leads')
  const kpiClients = document.getElementById('kpi-clients')
  const kpiDeals = document.getElementById('kpi-deals')
  const kpiRevenue = document.getElementById('kpi-revenue')
  const kpiLogins = document.getElementById('kpi-logins')
  const kpiSanctions = document.getElementById('kpi-sanctions')
  const kpiDisbursement = document.getElementById('kpi-disbursement')
  const kpiFundingShare = document.getElementById('kpi-funding-share')
  const kpiWeightedPipeline = document.getElementById('kpi-weighted-pipeline')
  const kpiConversionRate = document.getElementById('kpi-conversion-rate')

  const renderBackendKpis = backendStats => {
    if (!backendStats) return
    if (kpiLeads && backendStats.total_leads !== undefined) {
      kpiLeads.textContent = formatCount(backendStats.total_leads)
    }
    if (kpiClients && backendStats.total_clients !== undefined) {
      kpiClients.textContent = formatCount(backendStats.total_clients)
    }
    if (kpiDeals && backendStats.total_deals !== undefined) {
      kpiDeals.textContent = formatCount(backendStats.total_deals)
    }
    if (kpiRevenue && backendStats.total_revenue !== undefined) {
      kpiRevenue.textContent = formatINR(backendStats.total_revenue)
    }
    if (kpiLogins && backendStats.total_logins !== undefined) {
      kpiLogins.textContent = formatCount(backendStats.total_logins)
    }
    if (kpiSanctions && backendStats.total_sanctions !== undefined) {
      kpiSanctions.textContent = formatCount(backendStats.total_sanctions)
    }
    if (kpiDisbursement && backendStats.total_disbursement !== undefined) {
      kpiDisbursement.textContent = formatINR(backendStats.total_disbursement)
    }
    if (kpiFundingShare && backendStats.funding_sathi_revenue_share !== undefined) {
      kpiFundingShare.textContent = formatINR(backendStats.funding_sathi_revenue_share)
    }
    if (kpiWeightedPipeline && backendStats.weighted_pipeline !== undefined) {
      kpiWeightedPipeline.textContent = formatINR(backendStats.weighted_pipeline)
    }
    if (kpiConversionRate && backendStats.conversion_rate !== undefined) {
      kpiConversionRate.textContent = `${Number(backendStats.conversion_rate).toFixed(1)}%`
    }
  }

  const renderLocalKpis = stats => {
    if (!stats) return
    if (kpiLeads) kpiLeads.textContent = formatCount(stats.leads.total)
    if (kpiClients) kpiClients.textContent = formatCount(stats.contacts.toString())
    if (kpiDeals) kpiDeals.textContent = formatCount(stats.deals.total)
    if (kpiRevenue) kpiRevenue.textContent = formatINR(stats.revenue.currentMonth)
    if (kpiLogins) kpiLogins.textContent = formatCount(0)
    if (kpiSanctions) kpiSanctions.textContent = formatCount(0)
    if (kpiDisbursement) kpiDisbursement.textContent = formatINR(0)
    if (kpiFundingShare) kpiFundingShare.textContent = formatINR(0)
    if (kpiWeightedPipeline) kpiWeightedPipeline.textContent = formatINR(0)
    if (kpiConversionRate) kpiConversionRate.textContent = '0%'
  }

  const stats = DataStore.getDashboardStats(employeeFilter ? record => matchesEmployee(record, employeeFilter) : null)
  renderLocalKpis(stats)

  const salesOverviewContainer = document.getElementById('salesOverviewContainer')
  const leadsBySourceContainer = document.getElementById('leadsBySourceContainer')
  if (salesOverviewContainer) {
    const revenueCurrent = stats.revenue.currentMonth || 0
    const revenueLast = stats.revenue.lastMonth || 0
    const revenueTrend = revenueCurrent >= revenueLast ? 'up' : 'down'
    salesOverviewContainer.innerHTML = `
      <div style="padding:18px;display:grid;gap:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <div>
            <div style="font-size:12px;color:var(--gray-500);">This month revenue</div>
            <div style="font-size:24px;font-weight:700;color:var(--gray-900);">₹${formatINR(revenueCurrent)}</div>
          </div>
          <div style="font-size:12px;color:${revenueTrend === 'up' ? '#16a34a' : '#ef4444'};font-weight:700;">${revenueTrend === 'up' ? '▲' : '▼'} ${revenueCurrent === revenueLast ? 'Flat' : Math.abs(revenueCurrent - revenueLast) > 0 ? 'vs last month' : ''}</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
          <div style="background:#f8fafc;border-radius:12px;padding:14px;">
            <div style="font-size:12px;color:var(--gray-500);">Open deals</div>
            <div style="font-size:20px;font-weight:700;color:var(--gray-900);">${stats.deals.open}</div>
          </div>
          <div style="background:#f8fafc;border-radius:12px;padding:14px;">
            <div style="font-size:12px;color:var(--gray-500);">Deals won</div>
            <div style="font-size:20px;font-weight:700;color:var(--gray-900);">${stats.deals.won}</div>
          </div>
          <div style="background:#f8fafc;border-radius:12px;padding:14px;">
            <div style="font-size:12px;color:var(--gray-500);">Total leads</div>
            <div style="font-size:20px;font-weight:700;color:var(--gray-900);">${stats.leads.total}</div>
          </div>
        </div>
      </div>
    `
  }
  if (leadsBySourceContainer) {
    const leads = filterByEmployee(DataStore.get('leads'), employeeFilter)
    const sourceCounts = leads.reduce((acc, lead) => {
      const source = String(lead.source || lead.leadSource || lead.lead_source || lead.sourceType || 'Other').trim() || 'Other'
      acc[source] = (acc[source] || 0) + 1
      return acc
    }, {})
    const sortedSources = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)
    leadsBySourceContainer.innerHTML = sortedSources.length === 0
      ? '<div style="min-height:240px;display:flex;align-items:center;justify-content:center;color:var(--gray-400);">No lead source data available</div>'
      : `<div style="padding:18px;display:grid;gap:10px;">${sortedSources.map(([source, count]) => `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
              <span style="font-size:13px;color:var(--gray-700);">${source}</span>
              <span style="font-size:13px;font-weight:700;color:var(--gray-900);">${count}</span>
            </div>
          `).join('')}</div>`
  }

  window.API.getDashboardStats()
    .then(backendStats => {
      console.log('[Dashboard] Backend stats:', backendStats)
      renderBackendKpis(backendStats)
    })
    .catch(err => {
      console.error('[Dashboard] Failed to fetch backend stats:', err)
    })

  // Filter tasks by user role
  let allTasks = DataStore.get('tasks')
  if (!isAdmin) {
    // Employees see only tasks assigned to them
    allTasks = allTasks.filter(t => {
      const assignedTo = t.assignedTo?.toLowerCase() || ''
      return assignedTo === S?.email?.toLowerCase() ||
             assignedTo === 'me' ||
             assignedTo === S?.name?.toLowerCase()
    })
  }
  if (employeeFilter) {
    allTasks = filterByEmployee(allTasks, employeeFilter)
  }
  const tasks = allTasks.filter(t => !t.completed)
  const activities = filterByEmployee(DataStore.get('activities'), employeeFilter).slice(0, 8)

  // Update KPI Cards - use local stats for employees and fallback while admin/manager loads backend data
  const kpiWon = document.getElementById('kpi-won')
  const kpiConversion = document.getElementById('kpi-conversion')

  if (kpiWon) kpiWon.textContent = '₹' + (stats.deals.wonValue / 1000000).toFixed(1) + 'Cr'
  if (kpiConversion) kpiConversion.textContent = stats.conversionRate + '%'

  // Update Report Summary counts
  const sodCountEl = document.getElementById('report-sod-count')
  const eodCountEl = document.getElementById('report-eod-count')
  const wodCountEl = document.getElementById('report-wod-count')
  const sodReports = typeof getSOD === 'function' ? getSOD() : []
  const eodReports = typeof getEOD === 'function' ? getEOD() : []
  const wodReports = typeof getWOD === 'function' ? getWOD() : []

  if (sodCountEl) sodCountEl.textContent = sodReports.length.toLocaleString()
  if (eodCountEl) eodCountEl.textContent = eodReports.length.toLocaleString()
  if (wodCountEl) wodCountEl.textContent = wodReports.length.toLocaleString()

  // Render Tasks Chart
  renderTasksChart(allTasks)

  // Update Pipeline stages with REAL data from DataStore
  let pipelineDeals = DataStore.getPipelineDeals() || []
  if (employeeFilter) {
    pipelineDeals = filterByEmployee(pipelineDeals, employeeFilter)
  }

  // Count deals by stage
  const stages = [
    { id: 'login-docs-submitted', name: 'Login Docs Submitted' },
    { id: 'approved-limit', name: 'Approved Limit' },
    { id: 'sanction-docs', name: 'Sanction Docs' },
    { id: 'pre-disbursement', name: 'Pre-Disbursement' },
    { id: 'disbursement', name: 'Disbursement' },
    { id: 'payout-received', name: 'Payout Received' },
    { id: 'closed-won', name: 'Closed Won' },
    { id: 'closed-lost', name: 'Closed Lost' }
  ]
  
  let totalPipelineValue = 0
  stages.forEach(stage => {
    const stageDeals = pipelineDeals.filter(d => {
      const dealStage = (d.stage || d.Stage || d.status || d.Status || '').toLowerCase().replace(/\s+/g, '-')
      return dealStage === stage.id || dealStage.includes(stage.name.toLowerCase())
    })
    
    const count = stageDeals.length
    const value = stageDeals.reduce((sum, d) => sum + (parseFloat(d.value || d.Value || d.dealValue || 0) || 0), 0)
    totalPipelineValue += value
    
    const countEl = document.getElementById(`pipeline-${stage.id}-count`)
    const valueEl = document.getElementById(`pipeline-${stage.id}-value`)
    
    if (countEl) countEl.textContent = count + ' deals'
    if (valueEl) valueEl.textContent = '₹' + (value / 10000000).toFixed(1) + 'Cr'
  })
  
  // Update total pipeline value
  const totalEl = document.querySelector('.section-subtitle')
  if (totalEl && totalEl.textContent.includes('total pipeline')) {
    totalEl.textContent = '₹' + (totalPipelineValue / 10000000).toFixed(1) + 'Cr total pipeline value'
  }

  // Update Tasks Subtitle
  const tasksSubtitle = document.getElementById('tasksSubtitle')
  if (tasksSubtitle) {
    tasksSubtitle.textContent = `${tasks.length} pending${isAdmin ? '' : ' for you'}`
  }

  // Render Follow-up Reminders Widget
  renderFollowupRemindersWidget()

  // Render Tasks Panel
  const tasksList = document.getElementById('tasksList')
  const employees = DataStore.get('employees') || []
  const now = new Date()
  const totalCount = allTasks.length
  const completedCount = allTasks.filter(t => t.completed).length
  const overdueCount = allTasks.filter(t => {
    if (t.completed || !t.dueDate) return false
    const due = new Date(t.dueDate)
    return !isNaN(due) && due < now
  }).length
  const inProgressCount = allTasks.filter(t => !t.completed && String(t.status || '').toLowerCase().includes('progress')).length
  const pendingCount = allTasks.filter(t => !t.completed && (!t.status || String(t.status).toLowerCase() === 'pending')).length

  const formatDateLabel = (dateText) => {
    if (!dateText) return 'No due date'
    const parsed = new Date(dateText)
    if (isNaN(parsed)) return dateText
    return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  }

  const statusLabel = (task) => {
    if (task.completed) return 'Completed'
    if (task.status) return task.status
    return 'Pending'
  }

  const statusClass = (task) => {
    const status = String(statusLabel(task)).toLowerCase()
    if (status.includes('complete')) return 'completed'
    if (status.includes('overdue')) return 'overdue'
    if (status.includes('progress')) return 'in-progress'
    if (status.includes('pending')) return 'pending'
    return 'pending'
  }

  if (tasksList) {
    if (tasks.length === 0) {
      tasksList.innerHTML = `<div style="padding:20px;text-align:center;color:var(--gray-400);">${isAdmin ? 'No pending tasks' : 'No tasks assigned to you'}</div>`
    } else if (isAdmin) {
      tasksList.innerHTML = `
        <div class="task-summary-grid">
          <div class="task-summary-card">
            <div class="summary-value">${totalCount.toLocaleString()}</div>
            <div class="summary-label">Total Tasks</div>
          </div>
          <div class="task-summary-card">
            <div class="summary-value">${completedCount.toLocaleString()}</div>
            <div class="summary-label">Completed</div>
          </div>
          <div class="task-summary-card">
            <div class="summary-value">${inProgressCount.toLocaleString()}</div>
            <div class="summary-label">In Progress</div>
          </div>
          <div class="task-summary-card">
            <div class="summary-value">${pendingCount.toLocaleString()}</div>
            <div class="summary-label">Pending</div>
          </div>
          <div class="task-summary-card">
            <div class="summary-value">${overdueCount.toLocaleString()}</div>
            <div class="summary-label">Overdue</div>
          </div>
        </div>
        <div class="admin-task-list">
          ${tasks.slice(0, 5).map(task => {
            const assignee = employees.find(e => e.email === task.assignedTo) ||
                            (task.assignedTo === 'me' ? { name: 'Me', initials: 'ME' } : null)
            const assigneeHtml = assignee ? `<div class="task-assignee">${assignee.name}</div>` : ''
            return `
              <div class="task-row">
                <div class="task-main">
                  <div class="task-row-title">${task.title}</div>
                  <div class="task-row-info">${task.relatedTo || '—'} • ${formatDateLabel(task.dueDate)}</div>
                  ${assigneeHtml}
                </div>
                <div class="task-tags">
                  <span class="task-chip status ${statusClass(task)}">${statusLabel(task)}</span>
                  <span class="task-chip priority ${String(task.priority || 'medium').toLowerCase()}">${String(task.priority || 'Medium')}</span>
                </div>
              </div>
            `
          }).join('')}
        </div>
      `
    } else {
      tasksList.innerHTML = tasks.slice(0, 5).map(task => {
        const assignee = employees.find(e => e.email === task.assignedTo) ||
                        (task.assignedTo === 'me' ? { name: 'Me', initials: 'ME' } : null)
        const assigneeHtml = isAdmin && assignee ? `
          <div style="display:flex;align-items:center;gap:6px;margin-top:4px;">
            <div style="width:16px;height:16px;border-radius:50%;background:var(--maroon);color:#fff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:600;">${assignee.initials || assignee.name?.charAt(0)}</div>
            <span style="font-size:10px;color:var(--gray-500);">${assignee.name}</span>
          </div>
        ` : ''
        return `
        <div class="task-item" style="display:flex;align-items:center;gap:10px;padding:10px;border-bottom:1px solid var(--gray-100);">
          <input type="checkbox" onchange="completeTask(${task.id})" style="cursor:pointer;">
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:500;color:var(--gray-800);">${task.title}</div>
            <div style="font-size:11px;color:var(--gray-500);">${task.relatedTo || '—'} • ${task.dueDate || 'No due date'}</div>
            ${assigneeHtml}
          </div>
          <span class="badge ${task.priority}" style="font-size:10px;padding:2px 8px;border-radius:4px;">${task.priority}</span>
        </div>
      `}).join('')
    }
  }

  // Render Recent Leads from DataStore
  const recentLeadsBody = document.getElementById('recentLeadsBody')
  if (recentLeadsBody) {
    const allLeads = DataStore.get('leads') || []
    const filteredRecentLeads = employeeFilter ? allLeads.filter(lead => matchesEmployee(lead, employeeFilter)) : allLeads
    const recentLeads = filteredRecentLeads.slice(-5).reverse()
    
    if (recentLeads.length === 0) {
      recentLeadsBody.innerHTML = '<tr><td colspan="5" style="padding:20px;text-align:center;color:var(--gray-400);">No leads yet</td></tr>'
    } else {
      recentLeadsBody.innerHTML = recentLeads.map(lead => {
        // Extract lead info with property name flexibility
        const company = dashboardGetLeadCompanyName(lead)
        const name = dashboardGetLeadDisplayName(lead, company)
        const source = lead.leadSource || lead.source || lead.Source || lead.SOURCE || '—'
        const status = lead.currentStatus || lead.status || lead.Status || lead.STATUS || 'new'
        const value = lead.dealValue || lead.value || lead.VALUE || '0'
        const dateValue = lead.date || lead.createdAt || lead.created_date || lead.createdDate || lead.addedAt || lead.addedDate || ''
        const parsedDate = dateValue ? new Date(dateValue) : new Date()
        const dateDisplay = isNaN(parsedDate.getTime()) ? new Date().toLocaleDateString('en-GB') : parsedDate.toLocaleDateString('en-GB')
        const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        
        // Format value with proper handling
        let formattedValue = value
        if (typeof value === 'number') {
          formattedValue = '₹' + (value / 100000).toFixed(1) + 'L'
        } else if (typeof value === 'string' && value.includes('₹')) {
          formattedValue = value
        } else if (typeof value === 'string') {
          const numVal = parseFloat(value)
          if (!isNaN(numVal)) {
            formattedValue = '₹' + (numVal / 100000).toFixed(1) + 'L'
          } else {
            formattedValue = value || '₹0L'
          }
        }
        
        return `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);">
            <div style="display:flex;align-items:center;gap:8px;">
              <div class="av" style="width:28px;height:28px;font-size:12px;background:var(--maroon-light);color:var(--maroon);border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:600;">${initials}</div>
              <div>
                <div style="font-size:13px;font-weight:500;color:var(--gray-800);">${company}</div>
                <div style="font-size:11px;color:var(--gray-500);">${name}</div>
              </div>
            </div>
          </td>
          <td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);font-size:12px;color:var(--gray-600);">${dateDisplay}</td>
          <td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);font-size:12px;color:var(--gray-600);">${source}</td>
          <td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);">
            <span class="status-badge ${status.toLowerCase().replace(/\s+/g, '-')}" style="display:inline-block;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:500;${getStatusColor(status)}">${status}</span>
          </td>
          <td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);font-size:12px;color:var(--gray-600);">${formattedValue}</td>
        </tr>
      `}).join('')
    }
  }
  
  function getStatusColor(status) {
    const lower = status.toLowerCase()
    if (lower.includes('hot') || lower.includes('closed won')) return 'background:#dcfce7;color:#166534;'
    if (lower.includes('warm')) return 'background:#fef3c7;color:#92400e;'
    if (lower.includes('cold') || lower.includes('closed lost')) return 'background:#f3f4f6;color:#6b7280;'
    return 'background:#e0e7ff;color:#4338ca;'
  }

  // Render Top Deals table
  const topDealsBody = document.getElementById('topDealsBody')
  if (topDealsBody) {
    let allDeals = DataStore.getPipelineDeals() || []
    
    // Filter by employee if needed
    if (employeeFilter) {
      allDeals = filterByEmployee(allDeals, employeeFilter)
    }
    
    // Filter by employee if needed
    if (employeeFilter) {
      allDeals = filterByEmployee(allDeals, employeeFilter)
    }
    
    // Sort by value (highest first) and take top 5
    const topDeals = allDeals
      .sort((a, b) => (parseFloat(b.value || 0) || 0) - (parseFloat(a.value || 0) || 0))
      .slice(0, 5)
    
    if (topDeals.length === 0) {
      topDealsBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--gray-400);">No deals available</td></tr>'
    } else {
      topDealsBody.innerHTML = topDeals.map(deal => {
        const value = parseFloat(deal.value || 0) || 0
        const formattedValue = '₹' + value.toLocaleString('en-IN')
        const stage = deal.stage || deal.status || '—'
        const closeDate = deal.closeDate || deal.expectedClose || '—'
        
        return `
          <tr>
            <td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);font-size:13px;color:var(--gray-800);">${deal.dealName || deal.title || '—'}</td>
            <td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);font-size:12px;color:var(--gray-600);">${deal.client || '—'}</td>
            <td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);font-size:12px;color:var(--gray-600);">${formattedValue}</td>
            <td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);">
              <span class="status-badge" style="display:inline-block;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:500;background:#e0e7ff;color:#4338ca;">${stage}</span>
            </td>
            <td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);font-size:12px;color:var(--gray-600);">${closeDate}</td>
          </tr>
        `
      }).join('')
    }
  }

  // Render Team Performance table
  const teamPerformanceBody = document.getElementById('teamPerformanceBody')
  if (teamPerformanceBody && isAdmin) {
    const employees = DataStore.get('employees') || []
    const storageDeals = DataStore.getPipelineDeals() || []
    
    // Calculate performance for each employee
    const employeeStats = employees.map(emp => {
      const empDeals = storageDeals.filter(d => matchesEmployee(d, emp.name || emp.email))
      const dealsWon = empDeals.filter(d => {
        const stage = (d.stage || d.status || '').toLowerCase()
        return stage.includes('closed won') || stage.includes('won')
      })
      const totalRevenue = dealsWon.reduce((sum, d) => sum + (parseFloat(d.value || 0) || 0), 0)
      const winRate = empDeals.length > 0 ? Math.round((dealsWon.length / empDeals.length) * 100) : 0
      
      return {
        name: emp.name || emp.email || 'Unknown',
        dealsWon: dealsWon.length,
        revenue: totalRevenue,
        winRate: winRate
      }
    }).filter(s => s.dealsWon > 0) // Only show employees with won deals
    
    // Sort by revenue (highest first)
    employeeStats.sort((a, b) => b.revenue - a.revenue)
    
    if (employeeStats.length === 0) {
      teamPerformanceBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--gray-400);">No data available</td></tr>'
    } else {
      teamPerformanceBody.innerHTML = employeeStats.map(stat => {
        const formattedRevenue = '₹' + stat.revenue.toLocaleString('en-IN')
        return `
          <tr>
            <td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);font-size:13px;color:var(--gray-800);">${stat.name}</td>
            <td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);font-size:12px;color:var(--gray-600);">${stat.dealsWon}</td>
            <td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);font-size:12px;color:var(--gray-600);">${formattedRevenue}</td>
            <td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);font-size:12px;color:var(--gray-600);">${stat.winRate}%</td>
          </tr>
        `
      }).join('')
    }
  } else if (teamPerformanceBody && !isAdmin) {
    // Hide team performance for non-admin users
    teamPerformanceBody.parentElement.parentElement.style.display = 'none'
  }

  // Render Lead Funnel
  const funnelLeadsCount = document.getElementById('funnel-leads-count')
  const funnelContactedCount = document.getElementById('funnel-contacted-count')
  const funnelQualifiedCount = document.getElementById('funnel-qualified-count')
  const funnelProposalCount = document.getElementById('funnel-proposal-count')
  const funnelNegotiationCount = document.getElementById('funnel-negotiation-count')
  const funnelWonCount = document.getElementById('funnel-won-count')
  
  if (funnelLeadsCount) {
    // Count leads by funnel stage
    const totalLeads = filteredLeads.length
    const contactedLeads = filteredLeads.filter(l => {
      const status = (l.status || l.currentStatus || '').toLowerCase()
      return status.includes('contacted') || status.includes('in progress')
    }).length
    const qualifiedLeads = filteredLeads.filter(l => {
      const status = (l.status || l.currentStatus || '').toLowerCase()
      return status.includes('qualified') || status.includes('hot')
    }).length
    const proposalLeads = filteredLeads.filter(l => {
      const stage = (l.stage || l.status || '').toLowerCase()
      return stage.includes('proposal')
    }).length
    const negotiationLeads = filteredLeads.filter(l => {
      const stage = (l.stage || l.status || '').toLowerCase()
      return stage.includes('negotiation')
    }).length
    const wonLeads = filteredLeads.filter(l => {
      const stage = (l.stage || l.status || '').toLowerCase()
      return stage.includes('won') || stage.includes('closed won')
    }).length
    
    funnelLeadsCount.textContent = totalLeads
    funnelContactedCount.textContent = contactedLeads
    funnelQualifiedCount.textContent = qualifiedLeads
    funnelProposalCount.textContent = proposalLeads
    funnelNegotiationCount.textContent = negotiationLeads
    funnelWonCount.textContent = wonLeads
    
    // Calculate drop percentages
    const contactedDrop = totalLeads > 0 ? Math.round(((totalLeads - contactedLeads) / totalLeads) * 100) : 0
    const qualifiedDrop = contactedLeads > 0 ? Math.round(((contactedLeads - qualifiedLeads) / contactedLeads) * 100) : 0
    const proposalDrop = qualifiedLeads > 0 ? Math.round(((qualifiedLeads - proposalLeads) / qualifiedLeads) * 100) : 0
    const negotiationDrop = proposalLeads > 0 ? Math.round(((proposalLeads - negotiationLeads) / proposalLeads) * 100) : 0
    const wonRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0
    
    const contactedDropEl = document.getElementById('funnel-contacted-drop')
    const qualifiedDropEl = document.getElementById('funnel-qualified-drop')
    const proposalDropEl = document.getElementById('funnel-proposal-drop')
    const negotiationDropEl = document.getElementById('funnel-negotiation-drop')
    const wonRateEl = document.getElementById('funnel-won-rate')
    
    if (contactedDropEl) contactedDropEl.textContent = `-${contactedDrop}%`
    if (qualifiedDropEl) qualifiedDropEl.textContent = `-${qualifiedDrop}%`
    if (proposalDropEl) proposalDropEl.textContent = `-${proposalDrop}%`
    if (negotiationDropEl) negotiationDropEl.textContent = `-${negotiationDrop}%`
    if (wonRateEl) wonRateEl.textContent = `${wonRate}% conv.`
  }

  // Render Revenue by Source
  const revenueChart = document.getElementById('revenueChart')
  if (revenueChart) {
    let allDeals = DataStore.getPipelineDeals() || []
    
    // Group by source
    const sourceGroups = {}
    allDeals.forEach(deal => {
      const source = deal.source || deal.leadSource || 'Other'
      const value = parseFloat(deal.value || 0) || 0
      if (!sourceGroups[source]) {
        sourceGroups[source] = { total: 0, count: 0 }
      }
      sourceGroups[source].total += value
      sourceGroups[source].count += 1
    })
    
    // Convert to array and sort by value
    const sources = Object.entries(sourceGroups)
      .map(([source, data]) => ({ source, ...data }))
      .sort((a, b) => b.total - a.total)
    
    if (sources.length === 0) {
      revenueChart.innerHTML = '<div style="padding:20px;text-align:center;color:var(--gray-400);">No revenue data available</div>'
    } else {
      const maxValue = sources[0].total
      const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444']
      
      revenueChart.innerHTML = sources.map((source, index) => {
        const percentage = maxValue > 0 ? Math.round((source.total / maxValue) * 100) : 0
        const color = colors[index % colors.length]
        const formattedValue = '₹' + (source.total / 10000000).toFixed(1) + 'Cr'
        
        return `
          <div class="revenue-bar-item">
            <div class="revenue-label">${source.source}</div>
            <div class="revenue-bar-wrap">
              <div class="revenue-bar" style="width:${percentage}%;background:${color};"></div>
              <span class="revenue-value">${formattedValue}</span>
            </div>
            <div class="revenue-count">${source.count} deals</div>
          </div>
        `
      }).join('')
    }
    
    // Update revenue stats
    const totalRevenue = sources.reduce((sum, s) => sum + s.total, 0)
    const totalDeals = sources.reduce((sum, s) => sum + s.count, 0)
    const avgDealSize = totalDeals > 0 ? totalRevenue / totalDeals : 0
    const winRate = filteredLeads && filteredLeads.length > 0 ? Math.round((sources.reduce((sum, s) => sum + s.count, 0) / filteredLeads.length) * 100) : 0
    
    const avgDealEl = document.getElementById('revenue-avg-deal')
    const salesCycleEl = document.getElementById('revenue-sales-cycle')
    const winRateEl = document.getElementById('revenue-win-rate')
    
    if (avgDealEl) avgDealEl.textContent = '₹' + (avgDealSize / 100000).toFixed(0) + 'L'
    if (salesCycleEl) salesCycleEl.textContent = '30 days' // Placeholder - calculate from actual data
    if (winRateEl) winRateEl.textContent = winRate + '%'
  }

  // Render Quota Attainment
  const quotaMonthlyTarget = document.getElementById('quota-monthly-target')
  const quotaQuarterlyTarget = document.getElementById('quota-quarterly-target')
  const quotaAnnualTarget = document.getElementById('quota-annual-target')
  
  if (quotaMonthlyTarget) {
    // Get actual revenue from pipeline deals
    const storageDeals = DataStore.getPipelineDeals() || []
    const wonDeals = storageDeals.filter(d => {
      const stage = (d.stage || d.status || '').toLowerCase()
      return stage.includes('won') || stage.includes('closed won')
    })
    
    const totalRevenue = wonDeals.reduce((sum, d) => sum + (parseFloat(d.value || 0) || 0), 0)
    
    // Set default quotas (these should come from user settings or database)
    const monthlyQuota = 15000000000 // ₹15Cr in rupees
    const quarterlyQuota = 45000000000 // ₹45Cr in rupees
    const annualQuota = 180000000000 // ₹180Cr in rupees
    
    // Calculate achievement
    const monthlyAchieved = Math.min(100, Math.round((totalRevenue / monthlyQuota) * 100))
    const quarterlyAchieved = Math.min(100, Math.round((totalRevenue / quarterlyQuota) * 100))
    const annualAchieved = Math.min(100, Math.round((totalRevenue / annualQuota) * 100))
    
    // Update UI
    quotaMonthlyTarget.textContent = '₹' + (monthlyQuota / 10000000).toFixed(0) + 'Cr'
    quotaQuarterlyTarget.textContent = '₹' + (quarterlyQuota / 10000000).toFixed(0) + 'Cr'
    quotaAnnualTarget.textContent = '₹' + (annualQuota / 10000000).toFixed(0) + 'Cr'
    
    const monthlyBar = document.getElementById('quota-monthly-bar')
    const quarterlyBar = document.getElementById('quota-quarterly-bar')
    const annualBar = document.getElementById('quota-annual-bar')
    
    if (monthlyBar) monthlyBar.style.width = monthlyAchieved + '%'
    if (quarterlyBar) quarterlyBar.style.width = quarterlyAchieved + '%'
    if (annualBar) annualBar.style.width = annualAchieved + '%'
    
    const monthlyText = document.getElementById('quota-monthly-text')
    const quarterlyText = document.getElementById('quota-quarterly-text')
    const annualText = document.getElementById('quota-annual-text')
    
    if (monthlyText) monthlyText.textContent = `${monthlyAchieved}% achieved (₹${(totalRevenue / 10000000).toFixed(1)}Cr)`
    if (quarterlyText) quarterlyText.textContent = `${quarterlyAchieved}% achieved (₹${(totalRevenue / 10000000).toFixed(1)}Cr)`
    if (annualText) annualText.textContent = `${annualAchieved}% achieved (₹${(totalRevenue / 10000000).toFixed(1)}Cr)`
  }

  // Render Activity Feed
  const activityList = document.getElementById('activityList')
  if (activityList) {
    if (activities.length === 0) {
      activityList.innerHTML = '<div style="padding:20px;text-align:center;color:var(--gray-400);">No recent activity</div>'
    } else {
      activityList.innerHTML = activities.map(act => `
        <div class="activity-item" style="display:flex;gap:12px;padding:12px;border-bottom:1px solid var(--gray-100);">
          <div class="activity-icon ${act.type}" style="width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:var(--gray-100);">
            ${getActivityIcon(act.type)}
          </div>
          <div style="flex:1;">
            <div style="font-size:13px;color:var(--gray-800);">${act.description}</div>
            <div style="font-size:11px;color:var(--gray-500);margin-top:2px;">${formatTime(act.timestamp)}</div>
          </div>
        </div>
      `).join('')
    }
  }
}

// Complete a task
function completeTask(taskId) {
  DataStore.toggleTask(taskId)
  renderDashboard()
  showToast('Task completed!', 'success')
}

// Filter dashboard activities
function filterActivity(type) {
  const activities = DataStore.get('activities')
  const filtered = type === 'all' ? activities.slice(0, 8) : activities.filter(a => a.type === type).slice(0, 8)

  const activityList = document.getElementById('activityList')
  if (activityList) {
    activityList.innerHTML = filtered.map(act => `
      <div class="activity-item" style="display:flex;gap:12px;padding:12px;border-bottom:1px solid var(--gray-100);">
        <div class="activity-icon ${act.type}" style="width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:var(--gray-100);">
          ${getActivityIcon(act.type)}
        </div>
        <div style="flex:1;">
          <div style="font-size:13px;color:var(--gray-800);">${act.description}</div>
          <div style="font-size:11px;color:var(--gray-500);margin-top:2px;">${formatTime(act.timestamp)}</div>
        </div>
      </div>
    `).join('')
  }

  // Update active filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === type)
  })
}

// Static HTML activity filter (for non-DataStore lists)
function filterStaticActivity(filterType) {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active')
    if (btn.dataset.filter === filterType) {
      btn.classList.add('active')
    }
  })

  const activities = document.querySelectorAll('.activity-item')
  activities.forEach(item => {
    if (filterType === 'all' || item.dataset.type === filterType) {
      item.style.display = 'flex'
    } else {
      item.style.display = 'none'
    }
  })
}

// Toggle task completion in UI
function toggleTask(taskId) {
  const taskItem = document.querySelector(`[data-task-id="${taskId}"]`)
  if (!taskItem) return

  const checkbox = taskItem.querySelector('input[type="checkbox"]')
  if (checkbox && checkbox.checked) {
    taskItem.classList.add('completed')
    const tag = taskItem.querySelector('.task-tag')
    if (tag) {
      tag.className = 'task-tag completed'
      tag.textContent = 'Done'
    }
  } else {
    taskItem.classList.remove('completed')
  }

  updateTaskCount()
}

// Update task count display
function updateTaskCount() {
  const totalTasks = document.querySelectorAll('.task-item').length
  const completedTasks = document.querySelectorAll('.task-item.completed').length
  const pendingTasks = totalTasks - completedTasks

  const subtitle = document.getElementById('tasksSubtitle')
  if (subtitle) {
    subtitle.textContent = `${pendingTasks} pending`
  }
}

// Render Tasks Chart
function renderTasksChart(tasks) {
  const canvas = document.getElementById('tasksChart')
  if (!canvas) return

  const now = new Date()
  const pendingCount = tasks.filter(t => !t.completed && (!t.status || String(t.status).toLowerCase() === 'pending')).length
  const inProgressCount = tasks.filter(t => !t.completed && String(t.status || '').toLowerCase().includes('progress')).length
  const overdueCount = tasks.filter(t => {
    if (t.completed || !t.dueDate) return false
    const due = new Date(t.dueDate)
    return !isNaN(due) && due < now
  }).length
  const completedCount = tasks.filter(t => t.completed).length

  if (window.tasksChartInstance) {
    window.tasksChartInstance.destroy()
  }

  const ctx = canvas.getContext('2d')
  window.tasksChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Pending', 'In Progress', 'Overdue', 'Completed'],
      datasets: [{
        data: [pendingCount, inProgressCount, overdueCount, completedCount],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(249, 115, 22, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(34, 197, 94, 0.8)'
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(249, 115, 22, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(34, 197, 94, 1)'
        ],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 15,
            usePointStyle: true,
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0)
              const value = context.parsed
              const percentage = total > 0 ? Math.round((value / total) * 100) : 0
              return `${context.label}: ${value} (${percentage}%)`
            }
          }
        }
      }
    }
  })
}

// Add new task - redirect to Task Assign section for proper task assignment
function addTask() {
  const isAdmin = S?.role === 'admin'
  if (isAdmin) {
    // Navigate to Task Assign section
    const taskAssignBtn = document.querySelector('[data-sec="task-assign"]')
    if (taskAssignBtn) taskAssignBtn.click()
  } else {
    // For employees, show a message to contact admin
    showToast('Please contact admin to assign you new tasks', 'info')
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderDashboard, renderAll, completeTask, filterActivity, toggleTask, addTask }
}
