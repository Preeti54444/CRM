// ═══════════════════════════════════════════════════════════════
// CRM NAVIGATION - Section Switching & Routing Module
// ═══════════════════════════════════════════════════════════════

// Main navigation function
function nav(btn) {
  // Prevent admin users from accessing restricted forms
  const key = btn.dataset.sec
  const session = JSON.parse(localStorage.getItem('crm_session') || '{}')
  const role = String(session.role || '').trim().toLowerCase()
  if (role === 'admin' && ['call-form', 'sod-form', 'eod-form', 'wod-form'].includes(key)) {
    alert('Admins cannot access this form.')
    return
  }

  // Remove active from all nav buttons
  document.querySelectorAll('.nav-btn').forEach(n => n.classList.remove('active'))
  // Remove active from all sections
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'))

  // Activate clicked button
  btn.classList.add('active')

  // Expand parent submenu if a sub-item was clicked
  const submenu = btn.closest('.nav-submenu')
  if (submenu && !submenu.classList.contains('expanded')) {
    submenu.classList.add('expanded')
    submenu.classList.remove('collapsed')
    const expandIcon = submenu.parentElement?.querySelector('.nav-expandable .expand-icon')
    if (expandIcon) expandIcon.style.transform = 'rotate(180deg)'
  }

  // Get section key
  if (!key) return

  // Activate section
  const section = document.getElementById('sec-' + key)
  if (section) section.classList.add('active')

  // Update page title
  const topTitle = document.getElementById('topTitle')
  if (topTitle) topTitle.textContent = SEC_TITLES[key] || key

  // Render section-specific content
  renderSection(key)

  // Close mobile menu after navigation
  if (window.innerWidth <= 768) {
    closeMobileMenu()
  }
}

function callRenderer(rendererName) {
  let attempts = 0

  const tryRenderer = () => {
    const renderer = window[rendererName]
    if (typeof renderer === 'function') {
      renderer()
      return
    }

    attempts += 1
    if (attempts >= 20) {
      console.warn(`Renderer ${rendererName} is still unavailable after ${attempts} retries.`)
      return
    }

    console.warn(`Renderer ${rendererName} is not available yet. Retrying (${attempts}/20)...`)
    setTimeout(tryRenderer, 150)
  }

  tryRenderer()
}

// Render specific section content
function renderSection(key) {
  const renderers = {
    'workqueue': 'renderWorkqueue',
    'sod-history': 'renderSODHistory',
    'eod-history': 'renderEODHistory',
    'wod-history': 'renderWODHistory',
    'leads': 'renderLeads',
    'eod': 'renderEOD',
    'team': 'renderTeam',
    'analytics': 'renderAnalytics',
    'logout-approvals': 'renderLogoutApprovals',
    'meetings': 'renderMeetingsDashboard',
    'call-tracker': 'renderCalls',
    'accounts': 'renderAccounts',
    'contacts': 'renderContacts',
    'deals': 'renderDeals',
    'case-management': 'refreshCaseManagement',
    'multi-lender-cases': 'renderMultiLenderCases',
    'activities': 'renderActivities',
    'documents': 'renderDocuments',
    'campaigns': 'renderCampaigns',
    'pipeline': 'renderPipeline',
    'forecasting': 'renderForecasting',
    'reports': 'renderReports',
    'integrations': 'renderIntegrations',
    'automation': 'renderAutomation',
    'task-assign': 'renderTaskAssign',
    'targets': 'renderTargets',
    'calendar': 'renderCalendar',
    'today-done': 'renderTodayDone',
    'visits': 'renderVisits',
    'google-sheets': 'renderGoogleSheets',
    'meet-tools': 'renderMeetTools',
    'whatsapp': 'renderWhatsApp',
    'email': 'renderEmail',
    'projects': 'renderProjects',
    'ai-assistant': 'renderAIAssistant'
  }

  const rendererName = renderers[key]
  if (rendererName) {
    callRenderer(rendererName)
  }
}

function renderTargets() {
  const topTitle = document.getElementById('topTitle')
  if (topTitle) {
    topTitle.textContent = 'Sales Targets'
  }
}

function handleTopbarAdd() {
  // Prevent admin users from using the Add button
  const session = JSON.parse(localStorage.getItem('crm_session') || '{}')
  const role = String(session.role || '').trim().toLowerCase()
  
  if (role === 'admin') {
    alert('Admins can only view leads, not create new leads.')
    return
  }

  const activeSection = document.querySelector('.section.active')
  const activeKey = activeSection?.id?.replace(/^sec-/, '')

  if (activeKey === 'call-tracker' || activeKey === 'call-form') {
    openCallTypeModal()
    return
  }

  const leadFormBtn = document.querySelector('[data-sec="lead-form"]')
  if (leadFormBtn) {
    nav(leadFormBtn)
  }
}

function renderMultiLenderCases() {
  const topTitle = document.getElementById('topTitle')
  if (topTitle) {
    topTitle.textContent = 'Multi-Lender Case Management'
  }
}

// Toggle expandable menu sections
function toggleExpand(btn) {
  const parent = btn.closest('.nav-grp')
  if (!parent) return

  const submenu = parent.querySelector('.nav-submenu')
  const icon = btn.querySelector('.expand-icon')

  if (submenu) {
    submenu.classList.toggle('expanded')
    submenu.classList.toggle('collapsed')
  }
  if (icon) {
    icon.style.transform = submenu && submenu.classList.contains('expanded') ? 'rotate(180deg)' : 'rotate(0deg)'
  }
}

// Handle mobile nav
function handleMobileNav(btn) {
  nav(btn)
  if (window.innerWidth <= 768) {
    closeMobileMenu()
  }
}

// Navigation for workqueue submenu
window.currentWQFilter = window.currentWQFilter || 'calls'

function navWorkqueue(btn, filterType) {
  window.currentWQFilter = filterType

  // Remove active from all workqueue items (main nav)
  document.querySelectorAll('[data-parent="workqueue"] .nav-btn').forEach(b => {
    b.classList.remove('active')
  })

  // Add active to clicked item (main nav)
  btn.classList.add('active')

  // Navigate to workqueue section
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'))
  const wqSection = document.getElementById('sec-workqueue')
  if (wqSection) wqSection.classList.add('active')

  // Update title
  const topTitle = document.getElementById('topTitle')
  if (topTitle) topTitle.textContent = 'Workqueue'

  // Also sync the workqueue section sidebar
  document.querySelectorAll('#wqActivityList .wq-item').forEach(item => {
    item.classList.remove('active')
    if (item.dataset.type === filterType) {
      item.classList.add('active')
    }
  })

  // Render workqueue with filter
  renderWorkqueue()
}

// Update workqueue counts in nav
function updateWorkqueueCounts() {
  const tasks = DataStore.get('tasks').filter(t => !t.completed)
  const meetings = DataStore.get('meetings')
  const calls = DataStore.get('calls')

  // Find count elements and update
  const counts = {
    'tasks': tasks.length,
    'meetings': meetings.length,
    'calls': calls.length
  }

  document.querySelectorAll('[data-parent="workqueue"] .nav-btn').forEach(btn => {
    const filter = btn.dataset.filter
    if (filter && counts[filter] !== undefined) {
      const countEl = btn.querySelector('.nav-count')
      if (countEl) countEl.textContent = counts[filter]
    }
  })
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { nav, navWorkqueue, toggleExpand, updateWorkqueueCounts }
}
