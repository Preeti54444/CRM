/**
 * Targets Engine - computes employee targets, carry-forward, and live performance
 * - Listens to `crm-data-sync` events and recomputes live target state
 * - Persists carry-forward in `localStorage` under `target_carry_forward`
 * - Exposes `window.TargetsEngine.getLive(employeeId)` and dispatches `crm-target-data-updated`
 */
(function () {
  const STORAGE_KEY = 'employee_targets'
  const CARRY_KEY = 'target_carry_forward'
  const LOCAL_LIVE_KEY = 'targets_live_local'

  // Default target configuration (per assignment in prompt)
  const DEFAULT_CONFIG = {
    'vaibhav.borge@fundingsathi.in': { daily_calls: 35, daily_leads: 3, midweek_calls: 90, midweek_leads: 9, weekly_calls: 160, weekly_leads: 15 },
    'saleem.k@fundingsathi.in': { daily_calls: 35, daily_leads: 3, midweek_calls: 90, midweek_leads: 9, weekly_calls: 160, weekly_leads: 15 },
    'r.chavan@fundingsathi.in': { daily_calls: 30, daily_leads: 2, midweek_calls: 75, midweek_leads: 6, weekly_calls: 120, weekly_leads: 10 }
  }

  function nowDateKey(date = new Date()) {
    return date.toISOString().slice(0, 10) // YYYY-MM-DD
  }

  function loadTargetsConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return DEFAULT_CONFIG
      const parsed = JSON.parse(raw)
      return Object.assign({}, DEFAULT_CONFIG, parsed || {})
    } catch (e) { return DEFAULT_CONFIG }
  }

  function loadCarryForward() {
    try { return JSON.parse(localStorage.getItem(CARRY_KEY) || '{}') } catch (e) { return {} }
  }

  function saveCarryForward(obj) {
    try { localStorage.setItem(CARRY_KEY, JSON.stringify(obj || {})) } catch (e) {}
  }

  function saveLocalLive(obj) {
    try { localStorage.setItem(LOCAL_LIVE_KEY, JSON.stringify(obj || {})) } catch (e) {}
  }

  function getEmployeeIdentifier(emp) {
    if (!emp) return ''
    return (emp.email || emp.id || emp.name || '').toString().toLowerCase()
  }

  function isQualifiedLead(lead) {
    if (!lead) return false
    const st = String(lead.status || lead.lead_status || lead.stage || '').toLowerCase()
    if (['qualified', 'hot', 'converted'].includes(st)) return true
    if (lead.quality && String(lead.quality).toLowerCase().includes('qual')) return true
    return false
  }

  function countCallsForPeriod(employee, startDate, endDate) {
    const calls = (typeof DataStore !== 'undefined') ? DataStore.get('calls') : JSON.parse(localStorage.getItem('crm_calls') || '[]')
    if (!Array.isArray(calls)) return 0
    const idOrEmail = getEmployeeIdentifier(employee)
    const start = new Date(startDate)
    const end = new Date(endDate)
    return calls.filter(c => {
      try {
        const ts = new Date(c.date || c.timestamp || c.call_date || c.createdAt || c.created_at || '')
        if (isNaN(ts.getTime())) return false
        if (ts < start || ts > end) return false
        const agent = (c.agent || c.agentEmail || c.owner || c.assignedTo || c.createdBy || '')
        return String(agent).toLowerCase().includes(idOrEmail) || String(c.agentEmail || '').toLowerCase().includes(idOrEmail)
      } catch (e) { return false }
    }).length
  }

  function countLeadsForPeriod(employee, startDate, endDate) {
    const leads = (typeof DataStore !== 'undefined') ? DataStore.get('leads') : JSON.parse(localStorage.getItem('crm_leads') || '[]')
    if (!Array.isArray(leads)) return 0
    const idOrEmail = getEmployeeIdentifier(employee)
    const start = new Date(startDate)
    const end = new Date(endDate)
    return leads.filter(l => {
      try {
        const ts = new Date(l.createdAt || l.created_at || l.date || l.addedAt || '')
        if (isNaN(ts.getTime())) return false
        if (ts < start || ts > end) return false
        const owner = (l.assignedTo || l.salesExecutive || l.assignedEmployee || l.createdBy || '')
        if (!String(owner).toLowerCase().includes(idOrEmail)) return false
        return isQualifiedLead(l)
      } catch (e) { return false }
    }).length
  }

  function computeForEmployee(employee) {
    if (!employee) return null
    const cfgs = loadTargetsConfig()
    const id = getEmployeeIdentifier(employee)
    const cfg = cfgs[id] || { daily_calls: 30, daily_leads: 2, midweek_calls: 75, midweek_leads: 6, weekly_calls: 120, weekly_leads: 10 }

    const today = new Date()
    const dayKey = nowDateKey(today)
    const startOfDay = new Date(dayKey + 'T00:00:00')
    const endOfDay = new Date(dayKey + 'T23:59:59')

    // Week: Monday (ISO 1) to Saturday
    const weekday = today.getDay() // 0 Sun .. 6 Sat
    const monday = new Date(today)
    const diffToMon = (weekday + 6) % 7 // days since Monday
    monday.setDate(today.getDate() - diffToMon)
    monday.setHours(0,0,0,0)
    const saturday = new Date(monday)
    saturday.setDate(monday.getDate() + 5)
    saturday.setHours(23,59,59,999)

    // Midweek window: Monday-Wednesday
    const wed = new Date(monday)
    wed.setDate(monday.getDate() + 2)
    wed.setHours(23,59,59,999)

    const callsToday = countCallsForPeriod(employee, startOfDay, endOfDay)
    const leadsToday = countLeadsForPeriod(employee, startOfDay, endOfDay)
    const callsWeek = countCallsForPeriod(employee, monday, saturday)
    const leadsWeek = countLeadsForPeriod(employee, monday, saturday)
    const callsMid = countCallsForPeriod(employee, monday, wed)
    const leadsMid = countLeadsForPeriod(employee, monday, wed)

    const carry = loadCarryForward()[id] || { calls: 0, leads: 0, asOf: null }

    const remainingCallsToday = Math.max(0, (cfg.daily_calls || 0) - callsToday + (carry.calls || 0))
    const remainingLeadsToday = Math.max(0, (cfg.daily_leads || 0) - leadsToday + (carry.leads || 0))

    const callsPct = Math.round(((callsToday) / Math.max(1, (cfg.daily_calls || 1) + (carry.calls || 0))) * 100)
    const leadsPct = Math.round(((leadsToday) / Math.max(1, (cfg.daily_leads || 1) + (carry.leads || 0))) * 100)
    const overallPct = Math.round((callsPct + leadsPct) / 2)

    const zone = overallPct >= 100 ? 'green' : (overallPct >= 70 ? 'yellow' : (overallPct > 0 ? 'red' : 'gray'))

    // expected finish time: naive estimate using calls per hour
    const hoursWorked = Math.max(1, (new Date().getHours() - 9)) // assume start 9am
    const avgCallsPerHour = hoursWorked > 0 ? (callsToday / hoursWorked) : 0
    let estFinish = '—'
    try {
      const remaining = Math.max(0, remainingCallsToday)
      if (avgCallsPerHour > 0) {
        const hoursLeft = remaining / avgCallsPerHour
        const est = new Date(Date.now() + hoursLeft * 3600 * 1000)
        estFinish = est.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    } catch (e) {}

    const data = {
      employee_id: id,
      employee_name: employee.name || employee.email || id,
      date: dayKey,
      daily_calls_target: cfg.daily_calls || 0,
      daily_leads_target: cfg.daily_leads || 0,
      midweek_calls_target: cfg.midweek_calls || cfg.daily_calls * 3 || 0,
      midweek_leads_target: cfg.midweek_leads || cfg.daily_leads * 3 || 0,
      weekly_calls_target: cfg.weekly_calls || cfg.daily_calls * 6 || 0,
      weekly_leads_target: cfg.weekly_leads || cfg.daily_leads * 6 || 0,
      calls_completed: callsToday,
      leads_completed: leadsToday,
      weekly_calls_completed: callsWeek,
      weekly_leads_completed: leadsWeek,
      midweek_calls_completed: callsMid,
      midweek_leads_completed: leadsMid,
      carry_forward_calls: carry.calls || 0,
      carry_forward_leads: carry.leads || 0,
      calls_remaining: remainingCallsToday,
      leads_remaining: remainingLeadsToday,
      calls_progress_pct: callsPct,
      leads_progress_pct: leadsPct,
      overall_progress_pct: overallPct,
      zone,
      status: zone === 'green' ? 'On Track' : (zone === 'yellow' ? 'Needs Attention' : (zone === 'red' ? 'Poor Performance' : 'No Activity')),
      expected_completion_time: estFinish,
      performance_score: Math.min(100, overallPct),
      last_activity: null
    }

    return data
  }

  function computeAllEmployees() {
    const employees = (typeof DataStore !== 'undefined') ? DataStore.get('employees') : JSON.parse(localStorage.getItem('crm_users') || '[]')
    const res = {}
    if (!Array.isArray(employees)) return res
    employees.forEach(emp => {
      const obj = computeForEmployee(emp)
      if (obj) res[getEmployeeIdentifier(emp)] = obj
    })
    saveLocalLive(res)
    try { window._targetsLiveLocal = res } catch (e) {}
    window.dispatchEvent(new CustomEvent('crm-target-data-updated', { detail: res }))
    return res
  }

  function computeForCurrentUser() {
    const session = (() => { try { return JSON.parse(localStorage.getItem('crm_session')||'{}') } catch (e) { return {} } })()
    const email = (session.email || session.id || session.user || '').toString().toLowerCase()
    const employees = (typeof DataStore !== 'undefined') ? DataStore.get('employees') : []
    const emp = employees.find(e => getEmployeeIdentifier(e) === email) || { email, name: session.name || session.user || email }
    const data = computeForEmployee(emp)
    try {
      const live = JSON.parse(localStorage.getItem(LOCAL_LIVE_KEY) || '{}')
      live[getEmployeeIdentifier(emp)] = data
      saveLocalLive(live)
      window._targetsLiveLocal = live
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('crm-target-data-updated', { detail: data }))
    return data
  }

  // Listen for DataStore updates
  function onDataSync() {
    computeForCurrentUser()
    computeAllEmployees()
  }

  // Public API
  window.TargetsEngine = {
    init() {
      computeForCurrentUser()
      computeAllEmployees()
      document.addEventListener('crm-data-sync', onDataSync)
      // recompute every minute to keep estimates fresh
      setInterval(onDataSync, 60 * 1000)
    },
    getLive(employeeId) {
      try {
        const live = JSON.parse(localStorage.getItem(LOCAL_LIVE_KEY) || '{}')
        if (!employeeId) {
          return live
        }
        return live[employeeId.toString().toLowerCase()] || null
      } catch (e) { return null }
    },
    computeForEmployee, computeAllEmployees, computeForCurrentUser,
    // carry-forward helpers
    addCarryForward(employeeId, calls, leads) {
      const carry = loadCarryForward()
      const id = (employeeId || '').toString().toLowerCase()
      carry[id] = carry[id] || { calls: 0, leads: 0, asOf: null }
      carry[id].calls = (carry[id].calls || 0) + Number(calls || 0)
      carry[id].leads = (carry[id].leads || 0) + Number(leads || 0)
      carry[id].asOf = nowDateKey()
      saveCarryForward(carry)
      computeAllEmployees()
    }
  }

  document.addEventListener('DOMContentLoaded', () => { setTimeout(() => { try { window.TargetsEngine.init() } catch (e) {} }, 1000) })
})()
