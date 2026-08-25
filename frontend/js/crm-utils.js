// ═══════════════════════════════════════════════════════════════
// CRM UTILITIES - Helper Functions & Common Utilities
// ═══════════════════════════════════════════════════════════════

let S = null
let supportSelected = 'No'

// Toast notification
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast')
  if (!t) return
  t.textContent = msg
  t.className = `toast ${type}`
  t.classList.add('show')
  setTimeout(() => t.classList.remove('show'), 3200)
}

// Date formatting helpers
const CRM_TIMEZONE = 'Asia/Kolkata'

function parseDateAsUTC(value) {
  if (!value && value !== 0) return null
  if (value instanceof Date) return value

  const raw = String(value).trim()
  if (!raw) return null

  if (/^[0-9]+$/.test(raw)) {
    const epoch = Number(raw)
    const date = new Date(epoch)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const isoDateOnly = raw.match(/^(\d{4}-\d{2}-\d{2})$/)
  if (isoDateOnly) {
    const date = new Date(`${isoDateOnly[1]}T00:00:00Z`)
    if (!Number.isNaN(date.getTime())) return date
  }

  const isoNoZone = raw.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/)
  if (isoNoZone) {
    const date = new Date(`${raw}Z`)
    if (!Number.isNaN(date.getTime())) return date
  }

  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

function today() {
  return new Date().toLocaleDateString('en-GB', { timeZone: CRM_TIMEZONE })
}

function todayFull() {
  return new Date().toLocaleDateString('en-GB', { timeZone: CRM_TIMEZONE, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function fmtDate(d) {
  if (!d) return ''
  const date = parseDateAsUTC(d)
  if (!date) return ''
  return date.toLocaleDateString('en-IN', { timeZone: CRM_TIMEZONE, day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(timestamp) {
  const date = parseDateAsUTC(timestamp)
  if (!date) return '—'
  return date.toLocaleTimeString('en-IN', { timeZone: CRM_TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatTimeAgo(timestamp) {
  const date = parseDateAsUTC(timestamp)
  if (!date) return '—'
  const now = new Date()
  const diff = Math.floor((now - date) / 1000 / 60)
  
  if (diff < 1) return 'Just now'
  if (diff < 60) return `${diff} min ago`
  if (diff < 1440) return `${Math.floor(diff / 60)} hours ago`
  return `${Math.floor(diff / 1440)} days ago`
}

function formatDateTime(timestamp) {
  const date = parseDateAsUTC(timestamp) || new Date()
  if (!date || isNaN(date.getTime())) return '—'
  const datePart = date.toLocaleDateString('en-IN', {
    timeZone: CRM_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
  const timePart = date.toLocaleTimeString('en-IN', {
    timeZone: CRM_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
  return `${datePart} ${timePart}`
}

// Initials generator
function ini(name) {
  if (!name) return 'U'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// Activity icons
function getActivityIcon(type) {
  const icons = {
    call: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    email: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
    meeting: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>',
    task: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>'
  }
  return icons[type] || icons.task
}

// Navigation section titles
const SEC_TITLES = {
  dashboard: 'Dashboard',
  workqueue: 'Workqueue',
  sod: 'Start of Day',
  'sod-history': 'SOD History',
  eod: 'End of Day',
  'eod-history': 'EOD History',
  wod: 'Weekly Report',
  'wod-history': 'WOD History',
  leads: 'Lead Management',
  'case-management': 'Lender Cases',
  'multi-lender-cases': 'Multi-Lender Case Management',
  'leads-journey': 'Leads Journey',
  'call-form': 'Call Forms',
  'call-tracker': 'Call Tracker',
  meetings: 'Meetings',
  'today-done': 'My To-Do',
  forecasting: 'Forecasting',
  forecast: 'Revenue Forecast',
  analytics: 'Analytics',
  'logout-approvals': 'Logout Approvals',
  pipeline: 'Pipeline',
  reports: 'Reports',
  team: 'Team Performance',
  accounts: 'Accounts',
  contacts: 'Contacts',
  deals: 'Deals',
  activities: 'Activities',
  campaigns: 'Campaigns',
  documents: 'Documents',
  calendar: 'Calendar',
  visits: 'Visits',
  'task-assign': 'Task Assignment',
  targets: 'Sales Targets',
  integrations: 'Integrations',
  automation: 'Automation',
  'google-sheets': 'Google Sheets',
  email: 'Email',
  'meet-tools': 'Meeting Tools',
  whatsapp: 'WhatsApp',
  projects: 'Projects',
  'ai-assistant': 'Zia AI Assistant',
  'followup-reminders': 'Follow-up Reminders',
  settings: 'Settings'
}

// Mobile menu functions
function toggleMobileMenu() {
  const sidebar = document.getElementById('sidebar')
  const backdrop = document.getElementById('sidebarBackdrop')
  const toggle = document.getElementById('menuToggle')
  if (sidebar && backdrop) {
    const isOpen = !sidebar.classList.contains('open')
    sidebar.classList.toggle('open')
    backdrop.classList.toggle('show')
    if (toggle) {
      toggle.style.display = isOpen ? 'none' : ''
      toggle.setAttribute('aria-expanded', String(isOpen))
    }
    sidebar.setAttribute('aria-hidden', String(!isOpen))
  }
}

function closeMobileMenu() {
  const sidebar = document.getElementById('sidebar')
  const backdrop = document.getElementById('sidebarBackdrop')
  const toggle = document.getElementById('menuToggle')
  if (sidebar && backdrop) {
    sidebar.classList.remove('open')
    backdrop.classList.remove('show')
    if (toggle) {
      toggle.style.display = ''
      toggle.setAttribute('aria-expanded', 'false')
    }
    sidebar.setAttribute('aria-hidden', 'true')
  }
}

// Modal close on backdrop click
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.modal-ov').forEach(o => {
    o.addEventListener('click', e => {
      if (e.target === o) o.classList.remove('open')
    })
  })
})

// Export functions for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { showToast, today, todayFull, fmtDate, formatTime, ini, getActivityIcon, SEC_TITLES }
}
