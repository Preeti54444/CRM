console.log("CRM INIT VERSION: 20260627-v3 - FILE LOADED");

// ═══════════════════════════════════════════════════════════════
// CRM INITIALIZATION - Session, Data Seeding & Setup
// ═══════════════════════════════════════════════════════════════

function titleCase(text) {
  return String(text || '').trim().replace(/\w\S*/g, word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
}

function inferFullName(name, email) {
  const trimmed = String(name || '').trim()
  if (trimmed && trimmed.split(/\s+/).length > 1) return titleCase(trimmed)
  if (trimmed) return titleCase(trimmed)
  if (!email) return ''

  const userPart = email.split('@')[0].replace(/[_]/g, '.').trim()
  const pieces = userPart.split('.').filter(Boolean)
  return pieces.length ? pieces.map(titleCase).join(' ') : titleCase(userPart)
}

function getUserDisplayName(user) {
  if (!user) return ''
  const rawName = user.displayName || user.name || ''
  return inferFullName(rawName, user.email)
}

// Firebase sync helpers are disabled for phpMyAdmin/local-only operation
let firebaseSyncEnabled = false
let firebaseSyncModules = null

async function loadFirebaseSyncModules() {
  return null
}

async function getFirebaseUser() {
  return null
}

async function initFirebaseSync() {
  return false
}

function mergeFirebaseEntries(existing = [], incoming = []) {
  const merged = new Map()
  existing.forEach(item => merged.set(String(item.id), item))
  incoming.forEach(item => {
    const id = String(item.id || '')
    if (!id) return
    const existingItem = merged.get(id)
    merged.set(id, existingItem ? { ...existingItem, ...item } : item)
  })
  return Array.from(merged.values())
}

async function fetchFirebaseCollection(collectionName) {
  return []
}

async function saveFirebaseEntry(collectionName, entry) {
  return
}

async function deleteFirebaseEntry(collectionName, entryId) {
  return
}

let firebaseListeners = []

function stopFirebaseListeners() {
  firebaseListeners = []
}

async function startFirebaseListeners() {
  return
}

async function syncFirebaseData() {
  return
}

// Initialize session
async function initSession() {
  const raw = localStorage.getItem('crm_session')
  const session = getCRMSession()
  if (!session || !session.email) {
    try { localStorage.removeItem('crm_session') } catch (e) { /* ignore */ }
    window.location.href = 'login.html'
    return
  }
  S = session
  S.role = String(S.role || '').toLowerCase()
  S.id = S.id || S.uid || S.user_id || S.userId || S.employee_id || S.employeeId || ''
  S.name = inferFullName(S.name || S.displayName || '', S.email)
  if (!S.initials) {
    S.initials = String(S.name || '')
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .toUpperCase()
  }
  localStorage.setItem('crm_session', JSON.stringify(S))
  if (S.role === 'admin') document.body.classList.add('admin')

  // Update UI with user info
  const sbAvatar = document.getElementById('sbAvatar')
  const sbName = document.getElementById('sbName')
  const sbTitle = document.getElementById('sbTitle')
  const topName = document.getElementById('topName')
  const topRole = document.getElementById('topRole')

  if (sbAvatar) sbAvatar.textContent = S.initials || ini(S.name)
  if (sbName) sbName.textContent = S.name
  if (sbTitle) sbTitle.textContent = S.title
  if (topName) topName.textContent = S.name
  if (topRole) {
    const roleLabels = {
      admin: 'Admin',
      sales_executive: 'Sales Executive',
      branch_manager: 'Branch Manager',
      loan_processing_executive: 'Loan Processing Executive',
      sub_dsa_connector: 'Sub-DSA Connector',
      finance_accounts: 'Finance Accounts',
      employee: 'Employee'
    }
    const roleText = roleLabels[S.role] || S.role?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Employee'
    topRole.textContent = roleText
    topRole.className = 'role-pill ' + (S.role === 'admin' ? 'admin' : 'employee')
  }

  updateNotificationBadge()
  await Promise.all([startNotificationPolling(), startBackendTaskSync()])
  try { startRealtimeSocket() } catch (e) { console.warn('Realtime socket init failed', e) }
  showPendingNotifications()

  // Display lender permissions for current user
  displayLenderPermissions(S.role);
  if (typeof applyRestrictedReportSubmitBehavior === 'function') {
    applyRestrictedReportSubmitBehavior()
  }

  // Auto-update calls count field in daily activities
  setTimeout(() => {
    if (typeof autoUpdateCallsCount === 'function') {
      autoUpdateCallsCount()
    }
  }, 500)

  // Remove demo seed data from local storage
  try {
    const existingSOD = JSON.parse(localStorage.getItem('crm_leads') || '[]').filter(l => !l.isHistorical)
    localStorage.setItem('crm_leads', JSON.stringify(existingSOD))
    const existingEOD = JSON.parse(localStorage.getItem('crm_eod') || '[]').filter(l => !l.isHistorical)
    localStorage.setItem('crm_eod', JSON.stringify(existingEOD))
    const existingWOD = JSON.parse(localStorage.getItem('crm_wod') || '[]').filter(l => !l.isHistorical)
    localStorage.setItem('crm_wod', JSON.stringify(existingWOD))
    const existingLeads = JSON.parse(localStorage.getItem('crm_leads_journey') || '[]').filter(l => !l.isHistorical)
    localStorage.setItem('crm_leads_journey', JSON.stringify(existingLeads))
    localStorage.removeItem('crm_seeded')
  } catch (e) {
    console.warn('Seed cleanup error', e)
  }

  // One-time admin backend sync from FastAPI into localStorage (safeguarded by session flag)
  (function adminSyncReports(){
    try {
      if (typeof S !== 'undefined' && S && S.role === 'admin' && S.backendAuth === true && !sessionStorage.getItem('crm_api_admin_synced')) {
        const apiBase = getCRMApiBase();
        const reportEndpoints = [
          { path: 'sod', save: saveSOD, getExisting: getSOD },
          { path: 'eod', save: saveEOD, getExisting: getEOD },
          { path: 'wod', save: saveWOD, getExisting: getWOD },
          { path: 'leads', save: saveLeadsJourney, getExisting: getLeadsJourney }
        ];

        Promise.all(reportEndpoints.map(async endpoint => {
          try {
            const response = typeof resolveCRMApiRequest === 'function'
              ? await resolveCRMApiRequest(`/${endpoint.path}`, { method: 'GET', credentials: 'include', headers: { 'Accept': 'application/json' } })
              : await fetch(`${apiBase}/${endpoint.path}`, { credentials: 'include' })
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            const data = await response.json()
            if (Array.isArray(data) && data.length) {
              endpoint.save(mergeDatasetById(endpoint.getExisting(), data))
              console.info(`Admin ${endpoint.path.toUpperCase()} sync: saved ${data.length} rows`)
            }
          } catch (err) {
            console.warn(`Admin ${endpoint.path.toUpperCase()} sync failed`, err)
          }
        })).finally(() => {
          sessionStorage.setItem('crm_api_admin_synced', '1')
          try { window.dispatchEvent(new Event('crm:api_synced')) } catch (e) { /* ignore */ }
          if (typeof renderAll === 'function') renderAll()
          if (typeof renderLeads === 'function') renderLeads()
        })
      }
    } catch (e) {
      console.warn('Admin API sync error', e)
    }
  })();

  // Initialize employees data if missing (for task assignment feature)
  const crmData = JSON.parse(localStorage.getItem('crm_data') || '{}')
  if (!crmData.employees || crmData.employees.length === 0) {
    crmData.employees = []
    localStorage.setItem('crm_data', JSON.stringify(crmData))
  }

  // Initialize meetings if empty - removed sample data
  if (!localStorage.getItem('crm_meetings')) {
    localStorage.setItem('crm_meetings', JSON.stringify([]))
  }

  // Sample calls data - removed sample data
  if (!localStorage.getItem('crm_calls')) {
    localStorage.setItem('crm_calls', JSON.stringify([]))
  }

  // Check for today's meetings
  checkTodaysMeetings()

  // Admin vs Employee UI adjustments
  const isAdminRole = String(S.role || '').toLowerCase() === 'admin'
  if (isAdminRole) {
    const histExecF = document.getElementById('histExecF')
    const eodExecF = document.getElementById('eodExecF')
    const wodExecF = document.getElementById('wodExecF')
    const leadExecF = document.getElementById('leadExecF')
    const sodSection = document.getElementById('sec-sod-form')
    const eodSection = document.getElementById('sec-eod-form')
    const wodSection = document.getElementById('sec-wod-form')
    const reportSubmitButtons = ['sodSubmitBtn', 'eodSubmitBtn', 'wodSubmitBtn']
    const restrictedMenuKeys = ['sod-form', 'eod-form', 'wod-form']

    if (histExecF) histExecF.style.display = 'block'
    if (eodExecF) eodExecF.style.display = 'block'
    if (wodExecF) wodExecF.style.display = 'block'
    if (leadExecF) leadExecF.style.display = 'block'
    restrictedMenuKeys.forEach(key => {
      document.querySelectorAll(`.nav-btn[data-sec="${key}"]`).forEach(el => {
        el.style.display = 'none'
        el.remove()
      })
    })
    if (sodSection) sodSection.style.display = 'none'
    if (eodSection) eodSection.style.display = 'none'
    if (wodSection) wodSection.style.display = 'none'
    reportSubmitButtons.forEach(id => {
      const btn = document.getElementById(id)
      if (btn) {
        btn.style.display = 'none'
        btn.disabled = true
      }
    })

    updateElementText('leadsTitle', 'All Lead Journeys')
    updateElementText('leadsSub', 'Complete database from all executives')
    updateElementText('sodHistTitle', 'All SOD Reports')
    updateElementText('sodHistSub', 'Every SOD from all team members')
    updateElementText('eodHistSub', 'Every EOD from all team members')
    updateElementText('wodHistSub', 'All weekly reports')
  } else {
    updateElementText('leadsTitle', 'My Leads')
    updateElementText('leadsSub', 'Your personal lead entries')
    updateElementText('sodHistSub', 'Your submitted SOD reports')
    updateElementText('eodHistSub', 'Your submitted EOD reports')
    updateElementText('wodHistSub', 'Your weekly reports')
  }

  // Show Meet Tools for all users
  const meetToolsNav = document.getElementById('nav-meet-tools')
  if (meetToolsNav) meetToolsNav.style.display = 'flex'

  // Show Task Assign only for roles that can assign tasks (admin/managers)
  const initRole = String(S.role || '').toLowerCase()
  const taskAssignNav = document.getElementById('nav-task-assign')
  if (taskAssignNav) {
    taskAssignNav.style.display = (initRole === 'admin' || initRole.includes('manager') || initRole === 'branch_manager') ? 'flex' : 'none'
  }

  buildMonthFilter()
  prefillForms()
  
  // Initialize meetings module
  if (typeof initMeetingsModule === 'function') {
    initMeetingsModule()
  }
  
  if (typeof renderAll === 'function') {
    renderAll()
  } else {
    console.warn('renderAll is not available at initSession time')
  }
  if (typeof initPerformanceDashboard === 'function') {
    try { initPerformanceDashboard() } catch (e) { console.warn('initPerformanceDashboard failed', e) }
  }

  // If there are notifications for this user, show them on login
  if (getNotificationCount() > 0 && typeof showNotifications === 'function') {
    showNotifications()
  }
}

// Helper to safely update element text
function updateElementText(id, text) {
  const el = document.getElementById(id)
  if (el) el.textContent = text
}

function getNotificationRecipients(notification) {
  if (!notification) return []
  const recipients = new Set()
  const addRecipient = value => {
    if (value == null) return
    if (Array.isArray(value)) return value.forEach(addRecipient)
    if (typeof value === 'object') {
      addRecipient(value.email)
      addRecipient(value.name)
      addRecipient(value.recipientEmail)
      addRecipient(value.recipientName)
      addRecipient(value.assigneeEmail)
      addRecipient(value.assigneeName)
      addRecipient(value.assignedTo)
      addRecipient(value.assigned_to)
      addRecipient(value.assignedToId)
      addRecipient(value.assigneeId)
      addRecipient(value.user_id)
      addRecipient(value.userId)
      addRecipient(value.uid)
      addRecipient(value.recipientId)
      addRecipient(value.id)
      return
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      const normalized = String(value).trim()
      if (normalized) recipients.add(normalized)
    }
  }

  addRecipient(notification.recipients)
  addRecipient(notification.recipientEmails)
  addRecipient(notification.recipientEmail)
  addRecipient(notification.recipientName)
  addRecipient(notification.notificationRecipient)
  addRecipient(notification.recipient)
  addRecipient(notification.assignedTo)
  addRecipient(notification.assigneeEmail)
  addRecipient(notification.assigneeName)
  addRecipient(notification.to)
  addRecipient(notification.user_id)
  addRecipient(notification.userId)
  addRecipient(notification.recipientId)
  addRecipient(notification.assigned_to)
  addRecipient(notification.assignedToId)
  addRecipient(notification.assigneeId)

  return Array.from(recipients)
}

function isNotificationForCurrentUser(notification) {
  if (!notification || !S) return false
  const currentEmail = String(S.email || '').trim().toLowerCase()
  const currentName = String(S.name || '').trim().toLowerCase()
  const currentId = String(S.id || S.uid || S.user_id || S.userId || S.employee_id || S.employeeId || '').trim().toLowerCase()
  const recipients = getNotificationRecipients(notification)
  
  // Admin users should see only form submission notifications, not employee task notifications
  if (S.role === 'admin') {
    // Filter out task-related notifications for admin
    const notificationType = String(notification.type || '').toLowerCase()
    const isTaskNotification = notificationType.includes('task') || 
                              notificationType.includes('meeting') ||
                              notificationType.includes('reminder')
    
    if (isTaskNotification) {
      console.log('Admin filtering out task notification:', notificationType)
      return false
    }
    
    console.log('Admin showing form submission notification:', notificationType)
    return true
  }
  
  // Also check if notification has a direct user_id match
  const notificationUserId = String(notification.user_id || notification.recipientId || '').trim().toLowerCase()
  
  if (!recipients.length && !notificationUserId) return true

  // Check direct user_id match first (most reliable for backend notifications)
  if (notificationUserId && notificationUserId === currentId) {
    return true
  }

  return recipients.some(recipient => {
    const value = String(recipient || '').trim().toLowerCase()
    return value && (value === currentEmail || value === currentName || value === currentId)
  })
}

function getUserNotifications(collection = 'notifications') {
  if (typeof DataStore === 'undefined') return []
  const notifications = DataStore.get(collection) || []
  return notifications.filter(isNotificationForCurrentUser)
}

function getNotificationCount() {
  return getUserNotifications('notifications').length + getUserNotifications('meetingNotifications').length
}

function updateNotificationBadge() {
  const badge = document.getElementById('notificationBadge')
  if (!badge) return
  const count = getNotificationCount()
  badge.textContent = count
  badge.style.display = count > 0 ? 'inline-flex' : 'none'
}

function normalizeNotificationTimestamp(timestamp) {
  if (!timestamp) return new Date().toISOString()

  if (typeof timestamp === 'number' || /^[0-9]+$/.test(String(timestamp))) {
    const date = new Date(Number(timestamp))
    if (!Number.isNaN(date.getTime())) return date.toISOString()
  }

  const value = String(timestamp).trim()
  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()

  const match = value.match(/^([0-9]{1,2})[\/\-]([0-9]{1,2})[\/\-]([0-9]{2,4})(?:[ T]([0-9]{1,2}):([0-9]{2})(?::([0-9]{2}))?)?/) 
  if (match) {
    const [, day, month, year, hour = '00', minute = '00', second = '00'] = match
    const iso = new Date(`${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`)
    if (!Number.isNaN(iso.getTime())) return iso.toISOString()
  }

  return new Date().toISOString()
}

function createNotification(notification = {}) {
  const normalized = {
    id: notification.id || notification.notification_id || Date.now(),
    createdAt: normalizeNotificationTimestamp(notification.createdAt || notification.created_at),
    read: notification.read == null ? false : Boolean(notification.read),
    type: notification.type || 'notification',
    title: notification.title || notification.message || 'Notification',
    message: notification.message || '',
    relatedId: notification.relatedId || notification.related_id || '',
    recipientEmail: notification.recipientEmail || notification.email || '',
    recipientName: notification.recipientName || notification.name || '',
    recipientId: String(notification.recipientId || notification.user_id || notification.userId || notification.assigned_to || notification.assignedToId || notification.assigneeId || '').trim(),
    assignedTo: notification.assignedTo || notification.assigned_to || '',
    assignedToId: notification.assignedToId || notification.assigned_to || notification.assigneeId || '',
    recipients: Array.isArray(notification.recipients)
      ? notification.recipients.map(r => String(r).trim()).filter(Boolean)
      : notification.recipients
        ? [String(notification.recipients).trim()]
        : []
  }

  if (normalized.recipientEmail) normalized.recipients.push(normalized.recipientEmail)
  if (normalized.recipientName) normalized.recipients.push(normalized.recipientName)
  if (normalized.recipientId) normalized.recipients.push(normalized.recipientId)
  if (normalized.assignedTo) normalized.recipients.push(String(normalized.assignedTo).trim())
  if (normalized.assignedToId) normalized.recipients.push(String(normalized.assignedToId).trim())
  normalized.recipients = Array.from(new Set(normalized.recipients.filter(Boolean)))

  if (!DataStore.get('notifications')) {
    const data = DataStore.getAll()
    data.notifications = []
    DataStore.saveAll(data)
  }

  DataStore.add('notifications', normalized)
  updateNotificationBadge()
  renderNotificationPanel()

  if (isNotificationForCurrentUser(normalized)) {
    const toastMessage = normalized.message ? `${normalized.title}: ${normalized.message}` : normalized.title
    showToast(toastMessage, 'info')
    showDesktopNotification(normalized)
    // Auto-show notification panel for current user
    if (typeof showNotifications === 'function') {
      const panel = document.getElementById('notificationPanel')
      if (panel && (panel.style.display === 'none' || !panel.classList.contains('show'))) {
        showNotifications()
      }
    }
  }

  return normalized
}

function showDesktopNotification(notification = {}) {
  if (typeof window === 'undefined' || !('Notification' in window)) return

  const title = notification.title || 'CRM Notification'
  const body = notification.message || ''
  const options = {
    body,
    tag: String(notification.id || Date.now()),
    renotify: true
  }

  try {
    if (Notification.permission === 'granted') {
      new Notification(title, options)
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, options)
        }
      }).catch(() => {})
    }
  } catch (error) {
    console.warn('Desktop notification failed', error)
  }
}

function showNotifications() {
  const panel = document.getElementById('notificationPanel')
  if (!panel) return
  renderNotificationPanel()
  if (panel.style.display === 'none' || !panel.classList.contains('show')) {
    panel.style.display = 'flex'
    panel.classList.add('show')
    setTimeout(() => panel.classList.add('show'), 10)
  } else {
    closeNotificationPanel()
  }
}

function closeNotificationPanel() {
  const panel = document.getElementById('notificationPanel')
  if (!panel) return
  panel.classList.remove('show')
  setTimeout(() => {
    panel.style.display = 'none'
  }, 300)
}

function renderNotificationPanel() {
  const panel = document.getElementById('notificationPanel')
  const list = document.getElementById('notificationList')
  if (!panel || !list) return

  const notifications = getUserNotifications('notifications').concat(getUserNotifications('meetingNotifications'))

  if (notifications.length === 0) {
    list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--gray-500);">No notifications</div>'
    return
  }

  const formatNotificationDateTime = (isoStr) => {
    const date = new Date(normalizeNotificationTimestamp(isoStr))
    if (Number.isNaN(date.getTime())) return 'Unknown'
    return date.toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }

  list.innerHTML = notifications.map(notif => {
    const iconMap = {
      'task_assigned': '✓',
      'meeting_scheduled': '📅',
      'meeting_updated': '📝'
    }
    const icon = iconMap[notif.type] || '🔔'
    return `
      <div class="notification-item ${notif.type}" onclick="handleNotificationClick('${notif.id}')">
        <div class="notification-item-icon">${icon}</div>
        <div class="notification-item-content">
          <div class="notification-item-title">${notif.title || 'Notification'}</div>
          <div class="notification-item-message">${notif.message || ''}</div>
          <div class="notification-item-time">${formatNotificationDateTime(notif.createdAt)}</div>
        </div>
        <button type="button" class="notification-item-close" onclick="dismissNotification(event, '${notif.id}'); event.stopPropagation();" title="Dismiss">×</button>
      </div>
    `
  }).join('')
}

function handleNotificationClick(notifId) {
  const notifications = DataStore.get('notifications') || []
  const notif = notifications.find(n => n.id == notifId)
  if (!notif) return

  if (notif.type === 'task_assigned' && notif.relatedId) {
    closeNotificationPanel()
    showToast(`Task opened: ${notif.title}`, 'info')
  } else if (notif.type && notif.type.includes('meeting') && notif.relatedId) {
    closeNotificationPanel()
    showToast(`Meeting opened: ${notif.title}`, 'info')
  }
}

function dismissNotification(event, notifId) {
  event.stopPropagation()
  const notifications = DataStore.get('notifications') || []
  const idx = notifications.findIndex(n => n.id == notifId)
  if (idx !== -1) {
    notifications.splice(idx, 1)
    DataStore.set('notifications', notifications)
    updateNotificationBadge()
    renderNotificationPanel()
  }
}

function clearAllNotifications() {
  if (!confirm('Clear all notifications?')) return
  DataStore.set('notifications', [])
  DataStore.set('meetingNotifications', [])
  updateNotificationBadge()
  renderNotificationPanel()
  showToast('All notifications cleared', 'success')
}

let notificationPollTimer = null
let backendNotificationsEnabled = true
let backendTaskSyncTimer = null

function stopNotificationPolling() {
  if (notificationPollTimer) {
    clearInterval(notificationPollTimer)
    notificationPollTimer = null
  }
  backendNotificationsEnabled = false
}

function stopBackendTaskSync() {
  if (backendTaskSyncTimer) {
    clearInterval(backendTaskSyncTimer)
    backendTaskSyncTimer = null
  }
}

function clearBackendAuthSession() {
  if (typeof S !== 'undefined' && S && S.backendAuth === true) {
    S.backendAuth = false
    localStorage.setItem('crm_session', JSON.stringify(S))
    console.info('Backend auth disabled for current session due to invalid backend credentials')
  }
}

function isBackendNotificationsEnabled() {
  return backendNotificationsEnabled && typeof resolveCRMApiRequest === 'function' && getCRMApiBase() && typeof S !== 'undefined' && S.backendAuth === true
}

function isBackendTaskSyncEnabled() {
  return typeof resolveCRMApiRequest === 'function' && getCRMApiBase() && typeof S !== 'undefined' && S.backendAuth === true
}

async function startBackendTaskSync(intervalMs = 60000) {
  stopBackendTaskSync()
  if (!isBackendTaskSyncEnabled()) return
  await refreshBackendTasks()
  backendTaskSyncTimer = setInterval(refreshBackendTasks, intervalMs)
}

function getBackendTaskIds(tasks = []) {
  return new Set((tasks || []).map(item => String(item.id || item.task_id || '').trim()).filter(Boolean))
}

async function refreshBackendTasks() {
  if (!isBackendTaskSyncEnabled()) {
    return
  }

  try {
    let response = await resolveCRMApiRequest('/tasks', {
      method: 'GET',
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    })

    if (!response || !response.ok) {
      if (response && [401, 403].includes(response.status)) {
        stopBackendTaskSync()
        clearBackendAuthSession()
      }
      if (response) {
        const bodyText = await response.clone().text().catch(() => '')
        console.warn('Backend task refresh failed:', response.status, bodyText)
      } else {
        console.warn('Backend task refresh failed: no response')
      }
      return
    }

    const data = await response.json()
    const tasks = Array.isArray(data)
      ? data
      : Array.isArray(data.tasks)
        ? data.tasks
        : Array.isArray(data.data)
          ? data.data
          : []

    if (!tasks.length) return

    localStorage.setItem('crm_tasks', JSON.stringify(tasks))

    const existingTasks = DataStore.get('tasks') || []
    const existingIds = getBackendTaskIds(existingTasks)
    const newTasks = tasks.filter(task => {
      const id = String(task.id || task.task_id || '').trim()
      return id && !existingIds.has(id)
    })

    if (newTasks.length === 0) return

    const mergedTasks = DataStore.mergeDatasetById(existingTasks, DataStore.normalizeBackendTasks(tasks))
    const allData = DataStore.getAll()
    allData.tasks = mergedTasks
    DataStore.saveAll(allData)
  } catch (error) {
    console.warn('Failed to refresh backend tasks:', error)
  }
}

function getBackendNotificationIds(notifications = []) {
  return new Set((notifications || []).map(item => String(item.id || item.notification_id || '').trim()).filter(Boolean))
}

async function refreshBackendNotifications() {
  if (!isBackendNotificationsEnabled()) {
    return
  }

  try {
    const response = await resolveCRMApiRequest('/notifications', {
      method: 'GET',
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    })
    if (!response || !response.ok) {
      if (response && [401, 403].includes(response.status)) {
        stopNotificationPolling()
        clearBackendAuthSession()
        console.warn('Backend notification polling disabled due to auth failure:', response.status)
      }
      if (response) {
        const bodyText = await response.clone().text().catch(() => '')
        console.warn('Backend notification refresh failed:', response.status, bodyText)
      } else {
        console.warn('Backend notification refresh failed: no response')
      }
      return
    }
    const data = await response.json()
    const notifications = Array.isArray(data)
      ? data
      : Array.isArray(data.notifications)
        ? data.notifications
        : Array.isArray(data.data)
          ? data.data
          : []

    if (!notifications.length) return

    const existingNotifications = DataStore.get('notifications') || []
    const existingIds = getBackendNotificationIds(existingNotifications)
    const normalizedNotifications = DataStore.normalizeBackendNotifications(notifications)

    localStorage.setItem('crm_notifications', JSON.stringify(notifications))
    DataStore.set('notifications', normalizedNotifications)
    updateNotificationBadge()
    renderNotificationPanel()

    const newNotifications = normalizedNotifications.filter(notification => {
      const id = String(notification.id || notification.notification_id || '').trim()
      return id && !existingIds.has(id)
    })

    if (newNotifications.length === 0) return

    newNotifications.forEach(notification => {
      if (isNotificationForCurrentUser(notification)) {
        const toastMessage = notification.message ? `${notification.title}: ${notification.message}` : notification.title
        showToast(toastMessage, 'info')
        showDesktopNotification(notification)
      }
    })
  } catch (error) {
    console.warn('Failed to refresh backend notifications:', error)
  }
}

async function startNotificationPolling(intervalMs = 60000) {
  if (notificationPollTimer) clearInterval(notificationPollTimer)
  if (!isBackendNotificationsEnabled()) return
  await refreshBackendNotifications()
  notificationPollTimer = setInterval(refreshBackendNotifications, intervalMs)
}

// Real-time WebSocket connection for notifications
let _realtimeSocket = null
let _realtimeReconnectTimer = null

function updateRealtimeIndicator(status) {
  const indicator = document.getElementById('realtimeIndicator')
  const statusDot = document.getElementById('realtimeStatusDot')
  const statusText = document.getElementById('realtimeStatusText')
  
  if (!indicator) return
  
  indicator.className = 'realtime-indicator'
  indicator.style.display = 'flex'
  
  switch(status) {
    case 'connected':
      indicator.classList.add('connected')
      statusText.textContent = 'Live'
      break
    case 'disconnected':
      indicator.classList.add('disconnected')
      statusText.textContent = 'Offline'
      break
    case 'connecting':
      indicator.classList.add('connecting')
      statusText.textContent = 'Connecting...'
      break
    default:
      statusText.textContent = 'Unknown'
  }
}

function startRealtimeSocket() {
  try {
    if (!isBackendNotificationsEnabled()) return
    const session = S || JSON.parse(localStorage.getItem('crm_session') || '{}')
    const token = session?.access_token
    if (!token) return
    
    updateRealtimeIndicator('connecting')
    
    const apiBase = getCRMApiBase()
    const wsProtocol = apiBase.startsWith('https') ? 'wss' : 'ws'
    const host = apiBase.replace(/^https?:\/\//, '')
    const url = `${wsProtocol}://${host}/ws/notifications?token=${encodeURIComponent(token)}`

    if (_realtimeSocket) try { _realtimeSocket.close() } catch(e){/* ignore */}
    _realtimeSocket = new WebSocket(url)

    _realtimeSocket.onopen = () => {
      console.info('Realtime notifications socket connected')
      updateRealtimeIndicator('connected')
      if (_realtimeReconnectTimer) { clearTimeout(_realtimeReconnectTimer); _realtimeReconnectTimer = null }
    }

    _realtimeSocket.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data)
        if (data?.type === 'notification_event') {
          // Normalize and save to local DataStore
          const normalized = DataStore.normalizeBackendNotificationRow(data.payload || data)
          if (normalized) {
            DataStore.add('notifications', normalized)
            showToast(`${data.payload?.title || data.title}: ${data.payload?.message || data.message}`, 'info')
            updateNotificationBadge()
            renderNotificationPanel()
          }
        } else if (data?.type === 'data_sync_event') {
          // Handle data synchronization events
          handleDataSyncEvent(data)
        }
      } catch (e) { console.warn('Invalid realtime message', e) }
    }

    _realtimeSocket.onclose = (ev) => {
      console.warn('Realtime socket closed', ev)
      _realtimeSocket = null
      updateRealtimeIndicator('disconnected')
      if (!_realtimeReconnectTimer) _realtimeReconnectTimer = setTimeout(startRealtimeSocket, 5000)
    }

    _realtimeSocket.onerror = (err) => {
      console.error('Realtime socket error', err)
      try { _realtimeSocket.close() } catch(e){}
    }
  } catch (e) {
    console.warn('Failed to start realtime socket', e)
  }
}

function showPendingNotifications() {
  const count = getNotificationCount()
  if (!count) return

  const notifications = getUserNotifications('notifications').concat(getUserNotifications('meetingNotifications'))
  const summaryText = count === 1
    ? notifications[0]?.message || notifications[0]?.title || 'You have 1 new notification.'
    : `You have ${count} new notifications.`

  showToast(summaryText, 'info')
  showBellPopup(summaryText)
  if (typeof showNotifications === 'function') {
    showNotifications()
  }
  showDesktopNotification({
    title: 'CRM Notifications',
    message: summaryText,
    id: `login-summary-${Date.now()}`
  })
}

function showBellPopup(message) {
  const btn = document.getElementById('topNotificationsBtn')
  if (!btn || !message) return

  let popup = document.getElementById('notificationBellPopup')
  if (!popup) {
    popup = document.createElement('div')
    popup.id = 'notificationBellPopup'
    popup.className = 'notification-bell-popup'
    document.body.appendChild(popup)
  }

  popup.textContent = message
  const rect = btn.getBoundingClientRect()
  popup.style.top = `${rect.bottom + 10}px`
  popup.style.left = `${Math.max(12, rect.left + rect.width / 2 - 160)}px`
  popup.classList.add('show')

  clearTimeout(popup.hideTimer)
  popup.hideTimer = setTimeout(() => popup.classList.remove('show'), 4200)
}

// Handle data synchronization events from WebSocket
function handleDataSyncEvent(data) {
  try {
    const { entity_type, action, payload } = data
    console.info('[Data Sync] Received sync event:', { entity_type, action, payload })

    // Map entity types to localStorage keys
    const entityKeyMap = {
      'lead': 'crm_leads',
      'leads': 'crm_leads',
      'lead_journey': 'crm_leads_journey',
      'task': 'crm_tasks',
      'tasks': 'crm_tasks',
      'sod': 'crm_eod',
      'eod': 'crm_eod',
      'wod': 'crm_wod',
      'notification': 'crm_notifications',
      'notifications': 'crm_notifications',
      'call': 'crm_calls',
      'calls': 'crm_calls'
    }

    const storageKey = entityKeyMap[entity_type]
    if (!storageKey) {
      console.warn('[Data Sync] Unknown entity type:', entity_type)
      return
    }

    // Get existing data
    const existingData = JSON.parse(localStorage.getItem(storageKey) || '[]')
    let updatedData = [...existingData]

    // Handle different actions
    switch (action) {
      case 'create':
      case 'update':
        // Find and replace or add the item
        const itemId = payload.id || payload.lead_id || payload.task_id || payload.call_id
        if (itemId) {
          const index = updatedData.findIndex(item => 
            item.id === itemId || 
            item.lead_id === itemId || 
            item.task_id === itemId ||
            item.call_id === itemId
          )
          if (index >= 0) {
            updatedData[index] = { ...updatedData[index], ...payload }
          } else {
            updatedData.push(payload)
          }
        } else {
          updatedData.push(payload)
        }
        break

      case 'delete':
        const deleteId = payload.id || payload.lead_id || payload.task_id || payload.call_id
        if (deleteId) {
          updatedData = updatedData.filter(item => 
            item.id !== deleteId && 
            item.lead_id !== deleteId && 
            item.task_id !== deleteId &&
            item.call_id !== deleteId
          )
        }
        break

      case 'sync':
        // Full sync - replace entire dataset
        if (Array.isArray(payload)) {
          updatedData = payload
        }
        break

      default:
        console.warn('[Data Sync] Unknown action:', action)
        return
    }

    // Save updated data
    localStorage.setItem(storageKey, JSON.stringify(updatedData))

    // Update DataStore if available
    if (typeof DataStore !== 'undefined') {
      DataStore.set(storageKey, updatedData)
    }

    // Trigger UI refresh if available
    if (typeof renderAll === 'function') {
      renderAll()
    }
    if (typeof renderLeads === 'function' && (entity_type === 'lead' || entity_type === 'leads')) {
      renderLeads()
    }

    console.info('[Data Sync] Successfully synced', entity_type, action)
  } catch (e) {
    console.error('[Data Sync] Error handling sync event:', e)
  }
}

// Display lender permissions for current user role
function displayLenderPermissions(role) {
  console.log('🏦 Lender Access Permissions for ' + role + ':');

  const permissions = {
    admin: {
      getLenders: '✅ Full access - Can view all lenders',
      getActiveLenders: '✅ Full access - Can view active lenders',
      createLender: '✅ Full access - Can create new lenders',
      updateLender: '✅ Full access - Can update lender details',
      deleteLender: '✅ Full access - Can delete lenders',
      getLenderById: '✅ Full access - Can view specific lenders'
    },
    branch_manager: {
      getLenders: '❌ Access denied - Admin only',
      getActiveLenders: '✅ Read-only - Can view active lenders for reference',
      createLender: '❌ Access denied - Admin only',
      updateLender: '❌ Access denied - Admin only',
      deleteLender: '❌ Access denied - Admin only',
      getLenderById: '✅ Read-only - Can view specific active lenders'
    },
    sales_executive: {
      getLenders: '❌ Access denied - Admin only',
      getActiveLenders: '✅ Read-only - Can view active lenders for reference',
      createLender: '❌ Access denied - Admin only',
      updateLender: '❌ Access denied - Admin only',
      deleteLender: '❌ Access denied - Admin only',
      getLenderById: '✅ Read-only - Can view specific active lenders'
    },
    loan_processing_executive: {
      getLenders: '❌ Access denied - Admin only',
      getActiveLenders: '✅ Read-only - Can view active lenders for reference',
      createLender: '❌ Access denied - Admin only',
      updateLender: '❌ Access denied - Admin only',
      deleteLender: '❌ Access denied - Admin only',
      getLenderById: '✅ Read-only - Can view specific active lenders'
    },
    sub_dsa_connector: {
      getLenders: '❌ Access denied',
      getActiveLenders: '❌ Access denied',
      createLender: '❌ Access denied',
      updateLender: '❌ Access denied',
      deleteLender: '❌ Access denied',
      getLenderById: '❌ Access denied'
    },
    finance_accounts: {
      getLenders: '❌ Access denied',
      getActiveLenders: '❌ Access denied',
      createLender: '❌ Access denied',
      updateLender: '❌ Access denied',
      deleteLender: '❌ Access denied',
      getLenderById: '❌ Access denied'
    }
  };

  const userPerms = permissions[role] || permissions['sub_dsa_connector'];
  Object.entries(userPerms).forEach(([method, access]) => {
    console.log(`  ${method}(): ${access}`);
  });

  console.log('\n💡 Note: These permissions apply to Firebase-based lender management.');
  console.log('   The localStorage-based CRM may have different access controls.');
}

// Logout helpers
async function canLogoutWithBackend() {
  if (typeof resolveCRMApiRequest !== 'function' || !getCRMApiBase() || typeof S === 'undefined' || !S || S.backendAuth !== true) {
    return { allowed: true }
  }

  try {
    const response = await resolveCRMApiRequest('/performance/logout-check', {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      credentials: 'include'
    })

    if (!response.ok) {
      console.warn('logout-check returned non-ok status', response.status)
      return { allowed: true }
    }

    const data = await response.json()
    if (data && typeof data.allowed === 'boolean') {
      return data
    }
  } catch (error) {
    console.warn('logout-check failed', error)
  }

  return { allowed: true }
}

// Show logout approval modal
// Perform direct logout (for admins and approved employees)
function performDirectLogout() {
  try {
    // Stop timer
    if (typeof crmTimerStop === 'function') {
      crmTimerStop()
    }

    // Clear session
    localStorage.removeItem('crm_session')
    // crm_logout_requests no longer uses localStorage - removed
    
    // Try backend logout if available
    if (typeof resolveCRMApiRequest === 'function' && getCRMApiBase()) {
      resolveCRMApiRequest('/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).catch(e => console.warn('Backend logout failed', e))
    }
    
    // Redirect to login
    window.location.href = 'login.html'
  } catch (error) {
    console.error('Logout error:', error)
    window.location.href = 'login.html'
  }
}

function showLogoutApprovalModal() {
  const modalId = 'logoutApprovalModal'
  let modal = document.getElementById(modalId)
  
  if (!modal) {
    modal = document.createElement('div')
    modal.id = modalId
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:99999;'
    modal.innerHTML = `
      <div style="width:100%;max-width:480px;background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.2);overflow:hidden;animation:slideIn 0.3s ease;">
        <div style="background:linear-gradient(135deg, #7b1535 0%, #5a0f28 100%);color:white;padding:24px;">
          <div style="font-size:20px;font-weight:700;margin-bottom:8px;">Logout Request</div>
          <div style="font-size:13px;opacity:0.9;">Manager approval required to sign out</div>
        </div>
        <div style="padding:24px;display:grid;gap:16px;">
          <div style="background:#f8fafc;border-left:4px solid #7b1535;padding:12px;border-radius:8px;">
            <div style="font-size:12px;color:#64748b;margin-bottom:4px;">USER</div>
            <div style="font-size:14px;font-weight:600;color:#0f172a;" id="logoutUserName">—</div>
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:8px;">Reason for Logout *</label>
            <textarea id="logoutReasonText" placeholder="Please provide a reason for signing out..." style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;font-family:inherit;min-height:80px;resize:vertical;"></textarea>
          </div>
          <div style="background:#fef3f4;border:1px solid #fecaca;border-radius:8px;padding:12px;">
            <div style="font-size:12px;color:#7b1535;line-height:1.5;">Your logout request will be sent to your manager for approval. You will not be able to access the system until approved.</div>
          </div>
          <div style="display:flex;gap:10px;justify-content:flex-end;">
            <button id="logoutCancelBtn" style="padding:10px 16px;border:1px solid #cbd5e1;background:#fff;color:#0f172a;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;transition:all 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#fff'">Cancel</button>
            <button id="logoutSubmitBtn" style="padding:10px 16px;border:none;background:#7b1535;color:#fff;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;transition:all 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">Request Logout</button>
          </div>
        </div>
      </div>
      <style>
        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      </style>
    `
    document.body.appendChild(modal)
    
    document.getElementById('logoutCancelBtn').addEventListener('click', () => {
      modal.style.display = 'none'
    })
    
    document.getElementById('logoutSubmitBtn').addEventListener('click', proceedWithLogoutRequest)
  }
  
  // Update user name
  const userNameEl = document.getElementById('logoutUserName')
  if (userNameEl && typeof S !== 'undefined' && S && S.name) {
    userNameEl.textContent = S.name
  }
  
  // Clear previous reason
  const reasonEl = document.getElementById('logoutReasonText')
  if (reasonEl) {
    reasonEl.value = ''
    reasonEl.focus()
  }
  
  // Reset submit button
  const submitBtn = document.getElementById('logoutSubmitBtn')
  if (submitBtn) {
    submitBtn.disabled = false
    submitBtn.textContent = 'Request Logout'
  }
  
  modal.style.display = 'flex'
}

// Process logout request
async function proceedWithLogoutRequest() {
  const reasonEl = document.getElementById('logoutReasonText')
  const reason = reasonEl ? reasonEl.value.trim() : ''
  
  if (!reason) {
    showToast('Please provide a reason for logout', 'error')
    return
  }
  
  const submitBtn = document.getElementById('logoutSubmitBtn')
  if (submitBtn) {
    submitBtn.disabled = true
    submitBtn.textContent = 'Submitting...'
  }
  
  try {
    // Get work seconds from timer if available
    const workSeconds = (typeof crmTimer !== 'undefined' && crmTimer.workSec) ? crmTimer.workSec : 0
    
    // Send to backend API only - no localStorage fallback
    if (typeof resolveCRMApiRequest === 'function' && getCRMApiBase()) {
      try {
        await resolveCRMApiRequest('/timer/early-logout/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            work_seconds: workSeconds,
            request_reason: reason
          }),
          credentials: 'include'
        })
        showToast('Logout request submitted. Awaiting manager approval.', 'success')
        
        // Close modal and show pending status
        const modal = document.getElementById('logoutApprovalModal')
        if (modal) {
          modal.style.display = 'none'
        }
        
        // Show pending notification
        setTimeout(() => {
          showToast('Your account remains active. Please wait for manager approval.', 'info')
        }, 1000)
        return
      } catch (e) {
        console.error('Backend logout request failed:', e)
        showToast('Error submitting logout request. Backend may be unavailable.', 'error')
        if (submitBtn) {
          submitBtn.disabled = false
          submitBtn.textContent = 'Request Logout'
        }
        return
      }
    } else {
      console.error('resolveCRMApiRequest is not available')
      showToast('Backend API not available. Cannot submit logout request.', 'error')
      if (submitBtn) {
        submitBtn.disabled = false
        submitBtn.textContent = 'Request Logout'
      }
      return
    }
    
  } catch (error) {
    console.error('Logout request error:', error)
    showToast('Error submitting logout request. Please try again.', 'error')
    
    if (submitBtn) {
      submitBtn.disabled = false
      submitBtn.textContent = 'Request Logout'
    }
  }
}

async function logout(event) {
  if (event && typeof event.preventDefault === 'function') {
    event.preventDefault()
  }

  // Check if admin can logout directly without approval
  try {
    const sessionStr = localStorage.getItem('crm_session')
    if (sessionStr) {
      const session = JSON.parse(sessionStr)
      // Admin can logout directly without approval
      if (session && session.role === 'admin') {
        performDirectLogout()
        return
      }

      // Non-admin: check if they have an approved request via backend only
      const userEmail = session.email || session.id || ''
      if (userEmail) {
        // Check backend for approved request - no localStorage fallback
        if (typeof resolveCRMApiRequest === 'function' && getCRMApiBase()) {
          try {
            const response = await resolveCRMApiRequest('/timer/early-logout/pending', {
              method: 'GET',
              headers: { 'Accept': 'application/json' }
            })
            if (response && response.status === 'approved') {
              // Has approved request - allow logout and stop timer
              if (typeof crmTimerStop === 'function') {
                crmTimerStop()
              }
              performDirectLogout()
              return
            }
          } catch (e) {
            // 404 means no pending request exists - this is normal, not an error
            if (e.message && e.message.includes('404')) {
              console.log('No pending early logout request found')
            } else {
              console.error('Backend check for approved request failed:', e)
              showToast('Error checking logout approval status. Please try again.', 'error')
              return
            }
          }
        } else {
          console.error('resolveCRMApiRequest is not available')
          showToast('Backend API not available. Cannot check approval status.', 'error')
          return
        }
      }
    }
  } catch (e) {
    console.error('Error checking session for logout:', e)
    showToast('Error checking logout status. Please try again.', 'error')
    return
  }

  // No admin, no approved request - show approval modal
  showLogoutApprovalModal()
}

// Build month filter for history
function buildMonthFilter() {
  const all = [...getSOD(), ...getEOD(), ...getWOD()]
  const months = new Set()
  all.forEach(l => {
    const dateValue = l.date || l.date_col || ''
    if (dateValue) {
      const [d, m, y] = dateValue.split('/')
      if (y && m) months.add(`${y}-${m}`)
    }
  })
  const sorted = [...months].sort().reverse()
  const sel = document.getElementById('histMonthF')
  if (sel) {
    sel.innerHTML = '<option value="">All Months</option>' + sorted.map(m => {
      const [y, mo] = m.split('-')
      const label = new Date(`${y}-${mo}-01`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
      return `<option value="${m}">${label}</option>`
    }).join('')
  }
}

// Data accessors
function getSOD() { return JSON.parse(localStorage.getItem('crm_leads') || '[]') }
function saveSOD(d) { localStorage.setItem('crm_leads', JSON.stringify(d)) }
function getEOD() { return JSON.parse(localStorage.getItem('crm_eod') || '[]') }
function saveEOD(d) { localStorage.setItem('crm_eod', JSON.stringify(d)) }
function getWOD() { return JSON.parse(localStorage.getItem('crm_wod') || '[]') }
function saveWOD(d) { localStorage.setItem('crm_wod', JSON.stringify(d)) }
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
        const decoded = normalized.data.replace(/&quot;/g, '"')
        const parsed = JSON.parse(decoded)
        if (parsed && typeof parsed === 'object') {
          Object.assign(normalized, parsed)
        }
      } catch (inner) {
        // ignore invalid nested lead payload
      }
    }
  } else if (data && typeof data === 'object') {
    Object.assign(normalized, data)
  }

  if (!normalized.createdByName) {
    normalized.createdByName = normalized.assignedEmployee || normalized.assignedEmployeeName || normalized.salesExecutive || normalized.sales_executive || normalized.sales_executive_name || normalized.assigned_to_name || normalized.ownerName || normalized.owner || normalized.createdBy || normalized.creator || normalized['Created By'] || normalized['created_by'] || ''
  }
  if (!normalized.id) {
    normalized.id = normalized.id || normalized.ID || normalized.leadId || normalized.LeadID || normalized.lead_id || normalized.leadID || normalized.uid || normalized.UID || normalized.uniqueId || normalized.UNIQUEID || normalized.IDENTIFIER || normalized.customerId || normalized.customer_id || ''
    if (typeof normalized.id === 'string') normalized.id = normalized.id.trim()
  }
  if (!normalized.salesExecutive) {
    normalized.salesExecutive = normalized.assignedEmployee || normalized.assignedEmployeeName || normalized.salesExecutive || normalized.sales_executive || normalized.sales_executive_name || normalized.ownerName || normalized.assigned_to || normalized.assignedTo || ''
  }
  if (!normalized.email) {
    normalized.email = normalized.email_id || normalized.email_address || normalized.emailId || normalized.EMAIL || normalized.emailAddress || ''
  }
  if (!normalized.contactNumber) {
    normalized.contactNumber = normalized.contact_number || normalized.phone || normalized.mobile || ''
  }
  if (!normalized.companyName) {
    normalized.companyName = normalized.company || normalized.Company || normalized.company_name || normalized.companyName || normalized.customerName || normalized.customerCompany || normalized.customer_name || normalized.customerCompanyName || normalized.CustomerName || normalized.CustomerCompany || normalized.customer || ''
  }
  if (!normalized.contactPerson) {
    normalized.contactPerson = normalized.contact_name || normalized.Contact || normalized.CONTACT || normalized.leadName || normalized.name || ''
  }
  if (!normalized.productDiscussed) {
    normalized.productDiscussed = normalized.product_service || normalized.product || normalized.PRODUCT || normalized.loanType || ''
  }
  if (!normalized.leadSource) {
    normalized.leadSource = normalized.source || normalized.Source || normalized.SOURCE || normalized.lead_source || ''
  }
  if (!normalized.currentStatus) {
    normalized.currentStatus = normalized.status || normalized.Status || normalized.STATUS || normalized.current_status || normalized.final_outcome || ''
  }
  if (!normalized.nextFollowUp) {
    normalized.nextFollowUp = normalized.next_follow_up_date || normalized.follow_up || normalized['FOLLOW-UP'] || normalized['Follow-up'] || ''
  }
  if (!normalized.dealValue) {
    normalized.dealValue = normalized.deal_value || normalized.value || normalized.VALUE || normalized.loanAmount || ''
  }
  if (!normalized.dateOfEntry) {
    normalized.dateOfEntry = normalized.date_of_entry || normalized.DATE || normalized.timestamp || ''
  }
  return normalized
}
window.getLeadsJourney = function() {
  const leads = JSON.parse(localStorage.getItem('crm_leads_journey') || '[]') || []
  return leads.map(parseLeadData)
}
window.saveLeadsJourney = function(d) { localStorage.setItem('crm_leads_journey', JSON.stringify(d)) }
window.getCallsJourney = function() {
  const calls = JSON.parse(localStorage.getItem('crm_calls_journey') || '[]') || []
  return calls.map(parseLeadData)
}
window.saveCallsJourney = function(d) { localStorage.setItem('crm_calls_journey', JSON.stringify(d)) }
function getMtgs() { return JSON.parse(localStorage.getItem('crm_meetings') || '[]') }
function saveMtgs(d) { localStorage.setItem('crm_meetings', JSON.stringify(d)) }

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

function mergeDatasetById(existing, incoming) {
  if (!Array.isArray(existing)) existing = []
  if (!Array.isArray(incoming)) incoming = []
  const ids = new Set(existing.map(item => String(item?.id ?? '')))
  const merged = existing.slice()
  incoming.forEach(item => {
    const itemId = String(item?.id ?? '')
    if (!itemId || !ids.has(itemId)) {
      merged.push(item)
      if (itemId) ids.add(itemId)
    }
  })
  return merged
}

function getCRMApiBaseCandidates() {
  const candidates = [];

  if (window.API_BASE) {
    candidates.push(window.API_BASE);
  }

  // NOTE: REMOVED recursive call to window.getCRMApiBase() - was causing infinite loop
  // getCRMApiBaseCandidates() should only gather static candidates, not call getCRMApiBase()
  // to avoid: getCRMApiBase() -> getCRMApiBaseCandidates() -> getCRMApiBase() -> ...

  if (window.location.origin && !candidates.includes(window.location.origin)) {
    candidates.push(window.location.origin);
  }

  return candidates.filter(Boolean);
}

function getCRMSession() {
  try {
    const raw = localStorage.getItem('crm_session')
    if (!raw) return null
    const session = JSON.parse(raw)
    if (!session || typeof session !== 'object') return null
    return session
  } catch (err) {
    console.warn('Unable to parse crm_session', err)
    return null
  }
}

function getCRMBackendAuthStatus() {
  const session = getCRMSession()
  const token = session?.access_token || session?.token || session?.accessToken || null
  const status = {
    hasToken: !!token,
    tokenPreview: token ? `${token.slice(0, 20)}...` : null,
    session
  }
  console.debug('[CRM Auth] Auth status:', { hasToken: status.hasToken, hasSession: !!session, email: session?.email })
  return status
}

function getCRMBackendAuthHeader() {
  const session = getCRMSession()
  const token = session?.access_token || session?.token || session?.accessToken || null
  if (!token) return {}
  return { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}` }
}

function getCRMApiBase() {
  const candidates = getCRMApiBaseCandidates()
  return candidates.length ? candidates[0] : ''
}

function getCRMApiUrl(path, base) {
  if (!path || !base) return ''
  const normalizedPath = String(path).replace(/^\/+/, '')
  if (normalizedPath.startsWith('http')) {
    return normalizedPath
  }
  return base.replace(/\/$/, '') + '/' + normalizedPath
}

async function resolveCRMApiRequest(path, options = {}) {
  const candidateBases = getCRMApiBaseCandidates()
  const authStatus = getCRMBackendAuthStatus()
  console.debug('[CRM API] resolve request', { path, candidateBases, authStatus, options })
  let lastError = null

  for (const base of candidateBases) {
    const url = getCRMApiUrl(path, base)
    try {
      const requestOptions = {
        ...options,
        headers: {
          ...(options.headers || {}),
          ...getCRMBackendAuthHeader()
        }
      }
      const response = await fetch(url, requestOptions)
      console.debug('[CRM API] response', { url, status: response.status, ok: response.ok })
      if (response.ok) return response
      if ([401, 403, 429].includes(response.status)) {
        console.warn('[CRM API] auth or rate limit response', { url, status: response.status })
        return response
      }
      lastError = new Error(`HTTP ${response.status} for ${url}`)
    } catch (error) {
      console.warn('[CRM API] fetch error', { url, error })
      lastError = error
    }
  }

  if (lastError) throw lastError
  throw new Error(`Unable to resolve CRM API endpoint for ${path}`)
}

let backendHealthCache = {
  available: null,
  checkedAt: 0
};

async function checkBackendHealth(forceRefresh = false) {
  const cacheTTL = 30 * 1000;
  const now = Date.now();
  const API_BASE = getCRMApiBase();
  const authStatus = getCRMBackendAuthStatus();
  console.debug('[CRM API] health check', { API_BASE, authStatus, forceRefresh, cached: backendHealthCache })
  if (!API_BASE) {
    backendHealthCache = { available: false, checkedAt: now };
    return false;
  }
  if (!forceRefresh && backendHealthCache.checkedAt && (now - backendHealthCache.checkedAt) < cacheTTL) {
    return backendHealthCache.available;
  }

  const endpointOptions = {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    credentials: 'include',
    signal: typeof controller !== 'undefined' && controller ? controller.signal : undefined
  };

  try {
    const res = typeof resolveCRMApiRequest === 'function'
      ? await resolveCRMApiRequest('/health', endpointOptions)
      : await fetch(getCRMApiBase() + '/health', endpointOptions);

    if (!res.ok) {
      if ([401, 403, 429].includes(res.status)) {
        backendHealthCache = { available: true, checkedAt: now };
        return true;
      }
      backendHealthCache = { available: false, checkedAt: now };
      return false;
    }

    try {
      const text = await res.text();
      JSON.parse(text);
      backendHealthCache = { available: true, checkedAt: now };
      return true;
    } catch (err) {
      backendHealthCache = { available: false, checkedAt: now };
      return false;
    }
  } catch (err) {
    backendHealthCache = { available: false, checkedAt: now };
    return false;
  } finally {
    if (typeof timeoutId !== 'undefined' && timeoutId) clearTimeout(timeoutId);
  }
}

async function postToCRMBackend(path, payload) {
  if (!path) throw new Error('Backend path required');
  const endpointPath = '/' + String(path).replace(/^\/+/, '');
  console.log(`[postToCRMBackend] Requesting: ${endpointPath}`, payload);
  
  const res = await resolveCRMApiRequest(endpointPath, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify(payload || {})
  });

  console.log(`[postToCRMBackend] Response status: ${res.status}`, res.statusText);
  const text = await res.text();
  console.log(`[postToCRMBackend] Response body:`, text);
  
  if (!res.ok) {
    throw new Error(`Backend save failed (${res.status}): ${text}`);
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`Backend returned invalid JSON (${res.status}): ${text}`);
  }
}

async function saveBackendReport(path, payload, label) {
  const authStatus = getCRMBackendAuthStatus();
  if (!authStatus.hasToken) {
    throw new Error('Backend authentication required. Please log in again.');
  }
  const online = await checkBackendHealth(true);
  if (!online) {
    throw new Error('Backend unavailable');
  }
  const result = await postToCRMBackend(path, payload);
  if (label) {
    showToast(`${label} synced to backend`, 'success');
  }
  return result;
}

async function refreshBackendLeadJourneyData() {
  if (typeof resolveCRMApiRequest !== 'function' || !getCRMApiBase() || typeof S === 'undefined' || !S || S.backendAuth !== true) {
    return false
  }

  try {
    const response = await resolveCRMApiRequest('/leads', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'include'
    })

    if (!response.ok) {
      return false
    }

    const data = await response.json()
    const normalized = Array.isArray(data) ? data : Object.values(data || {})
    if (!Array.isArray(normalized) || normalized.length === 0) {
      return false
    }

    localStorage.setItem('crm_leads_journey', JSON.stringify(normalized))
    console.log('[refreshBackendLeadJourneyData] Synced', normalized.length, 'leads from backend')
    return true
  } catch (err) {
    console.warn('refreshBackendLeadJourneyData failed', err)
    return false
  }
}

async function refreshBackendCallsData() {
  if (typeof resolveCRMApiRequest !== 'function' || !getCRMApiBase() || typeof S === 'undefined' || !S || S.backendAuth !== true) {
    return false
  }

  try {
    const response = await resolveCRMApiRequest('/calls', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'include'
    })

    if (!response.ok) {
      return false
    }

    const data = await response.json()
    const normalized = Array.isArray(data) ? data : Object.values(data || {})
    if (!Array.isArray(normalized) || normalized.length === 0) {
      return false
    }

    localStorage.setItem('crm_calls', JSON.stringify(normalized))
    console.log('[refreshBackendCallsData] Synced', normalized.length, 'calls from backend')
    return true
  } catch (err) {
    console.warn('refreshBackendCallsData failed', err)
    return false
  }
}

async function refreshBackendFollowUpsData() {
  if (typeof resolveCRMApiRequest !== 'function' || !getCRMApiBase() || typeof S === 'undefined' || !S || S.backendAuth !== true) {
    return false
  }

  try {
    const response = await resolveCRMApiRequest('/followups', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'include'
    })

    if (!response.ok) {
      return false
    }

    const data = await response.json()
    const normalized = Array.isArray(data) ? data : Object.values(data || {})
    if (!Array.isArray(normalized) || normalized.length === 0) {
      return false
    }

    localStorage.setItem('crm_followups', JSON.stringify(normalized))
    console.log('[refreshBackendFollowUpsData] Synced', normalized.length, 'follow-ups from backend')
    return true
  } catch (err) {
    console.warn('refreshBackendFollowUpsData failed', err)
    return false
  }
}

async function refreshBackendTasksData() {
  if (typeof resolveCRMApiRequest !== 'function' || !getCRMApiBase() || typeof S === 'undefined' || !S || S.backendAuth !== true) {
    return false
  }

  try {
    const response = await resolveCRMApiRequest('/tasks', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'include'
    })

    if (!response.ok) {
      return false
    }

    const data = await response.json()
    const normalized = Array.isArray(data) ? data : Object.values(data || {})
    if (!Array.isArray(normalized) || normalized.length === 0) {
      return false
    }

    localStorage.setItem('crm_tasks', JSON.stringify(normalized))
    console.log('[refreshBackendTasksData] Synced', normalized.length, 'tasks from backend')
    return true
  } catch (err) {
    console.warn('refreshBackendTasksData failed', err)
    return false
  }
}

async function refreshBackendNotificationsData() {
  if (typeof resolveCRMApiRequest !== 'function' || !getCRMApiBase() || typeof S === 'undefined' || !S || S.backendAuth !== true) {
    return false
  }

  try {
    const response = await resolveCRMApiRequest('/notifications', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'include'
    })

    if (!response.ok) {
      return false
    }

    const data = await response.json()
    const normalized = Array.isArray(data) ? data : Object.values(data || {})
    if (!Array.isArray(normalized) || normalized.length === 0) {
      return false
    }

    localStorage.setItem('crm_notifications', JSON.stringify(normalized))
    console.log('[refreshBackendNotificationsData] Synced', normalized.length, 'notifications from backend')
    return true
  } catch (err) {
    console.warn('refreshBackendNotificationsData failed', err)
    return false
  }
}

// Periodic refresh for cross-device sync (every 30 seconds)
let periodicRefreshInterval = null
function startPeriodicBackendRefresh() {
  if (periodicRefreshInterval) return // Already started
  
  periodicRefreshInterval = setInterval(() => {
    // Refresh all data types
    const refreshPromises = []
    
    if (typeof refreshBackendLeadJourneyData === 'function') {
      refreshPromises.push(refreshBackendLeadJourneyData().catch(err => 
        console.warn('[Periodic Refresh] Failed to refresh backend leads:', err)
      ))
    }
    
    if (typeof refreshBackendCallsData === 'function') {
      refreshPromises.push(refreshBackendCallsData().catch(err => 
        console.warn('[Periodic Refresh] Failed to refresh backend calls:', err)
      ))
    }
    
    if (typeof refreshBackendFollowUpsData === 'function') {
      refreshPromises.push(refreshBackendFollowUpsData().catch(err => 
        console.warn('[Periodic Refresh] Failed to refresh backend follow-ups:', err)
      ))
    }
    
    if (typeof refreshBackendTasksData === 'function') {
      refreshPromises.push(refreshBackendTasksData().catch(err => 
        console.warn('[Periodic Refresh] Failed to refresh backend tasks:', err)
      ))
    }
    
    if (typeof refreshBackendNotificationsData === 'function') {
      refreshPromises.push(refreshBackendNotificationsData().catch(err => 
        console.warn('[Periodic Refresh] Failed to refresh backend notifications:', err)
      ))
    }
    
    Promise.allSettled(refreshPromises)
  }, 30000) // 30 seconds
  
  console.log('[Periodic Refresh] Started - refreshing all backend data every 30 seconds')
}

function stopPeriodicBackendRefresh() {
  if (periodicRefreshInterval) {
    clearInterval(periodicRefreshInterval)
    periodicRefreshInterval = null
    console.log('[Periodic Refresh] Stopped')
  }
}

// Start periodic refresh when page loads
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      startPeriodicBackendRefresh()
    }, 5000) // Start after 5 seconds to allow initial sync
  })
}

// Role-based data access
function normalizeReportRow(row) {
  if (!row || typeof row !== 'object') return row;
  const normalized = { ...row };
  const pick = keys => keys.reduce((found, key) => (found !== undefined && found !== '' ? found : normalized[key]), undefined);

  normalized.salesExecutive = normalized.salesExecutive || pick(['sales_executive_name', 'createdByName', 'employeeName', 'Sales Executive', 'Executive', 'executive']);
  normalized.createdBy = normalized.createdBy || pick(['Created By', 'created_by', 'createdByName', 'employeeName']);
  normalized.email = normalized.email || pick(['EMAIL', 'emailId', 'email_id', 'emailAddress']);
  normalized.date = normalized.date || pick(['date_col', 'eod_date', 'Date', 'DATE', 'dateCol']);
  normalized.callsMade = normalized.callsMade || pick(['calls_made', 'callCount', 'Calls', 'calls']);
  normalized.meetingsHeld = normalized.meetingsHeld || pick(['meetings_held', 'Meetings', 'meetings']);
  normalized.keyClients = normalized.keyClients || pick(['key_clients', 'clients', 'Key Clients']);
  normalized.dealsMovedNextStage = normalized.dealsMovedNextStage || pick(['deals_moved', 'Deals Moved', 'DealsMoved']);
  normalized.challengesFaced = normalized.challengesFaced || pick(['challenges_faced', 'Challenges', 'challenges']);
  normalized.learnings = normalized.learnings || pick(['learning', 'Learnings', 'learnings']);
  normalized.remarks = normalized.remarks || pick(['Remarks', 'remarks', 'comment', 'description']);

  return normalized;
}
function mySOD() {
  const all = getSOD().map(normalizeReportRow);
  if (String(S.role || '').toLowerCase() === 'admin') return all;
  return all.filter(l =>
    l.createdBy === S.email ||
    l.email === S.email ||
    l.salesExecutive === S.name ||
    l.sales_executive_name === S.name ||
    l.employeeName === S.name ||
    l.createdByName === S.name
  );
}
function myEOD() {
  const all = getEOD().map(normalizeReportRow);
  if (String(S.role || '').toLowerCase() === 'admin') return all;
  return all.filter(l =>
    l.createdBy === S.email ||
    l.email === S.email ||
    l.salesExecutive === S.name ||
    l.sales_executive_name === S.name ||
    l.employeeName === S.name ||
    l.createdByName === S.name
  );
}
function myWOD() {
  const all = getWOD().map(normalizeReportRow);
  if (String(S.role || '').toLowerCase() === 'admin') return all;
  return all.filter(l =>
    l.createdBy === S.email ||
    l.email === S.email ||
    l.salesExecutive === S.name ||
    l.sales_executive_name === S.name ||
    l.employeeName === S.name ||
    l.createdByName === S.name
  );
}
function normalizeLeadValue(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}
function leadMatchesCurrentUser(lead) {
  const userEmail = normalizeLeadValue(S?.email)
  const userName = normalizeLeadValue(S?.name)
  const candidateValues = [
    lead.createdBy,
    lead.createdByName,
    lead.email,
    lead.EMAIL,
    lead.emailId,
    lead.email_id,
    lead.emailAddress,
    lead.salesExecutive,
    lead.sales_executive_name,
    lead.sales_executive,
    lead.employeeName,
    lead.employee_name,
    lead.assignedEmployee,
    lead.assignedEmployeeName,
    lead.assigned_to,
    lead.assigned_to_name,
    lead.assignedTo,
    lead.assignedBy,
    lead.assignedByName,
    lead.owner,
    lead.ownerName,
    lead.creator,
    lead['Created By'],
    lead['created_by'],
    lead['createdByName']
  ].filter(Boolean).map(normalizeLeadValue)

  if (candidateValues.length === 0) {
    return true
  }
  return candidateValues.some(v => v === userEmail || v === userName)
}
function myLeadsJ() {
  const leads = (typeof getLeadsJourney === 'function') ? getLeadsJourney() : [];
  if (typeof S === 'undefined' || !S) return leads
  const allowFullLeadAccess = ['admin', 'branch_manager', 'manager', 'sales_manager'];
  const role = String(S.role || '').trim().toLowerCase();
  if (allowFullLeadAccess.includes(role)) return leads;
  return leads.filter(leadMatchesCurrentUser);
}
function myMtgs() {
  const all = getMtgs();
  const role = String(S.role || '').trim().toLowerCase();
  return role === 'admin' ? all : all.filter(m => m.createdBy === S.email)
}

// Support toggle
function setSupportToggle(val) {
  supportSelected = val
  const suppNo = document.getElementById('suppNo')
  const suppYes = document.getElementById('suppYes')
  const supportField = document.getElementById('supportField')
  const suppHint = document.getElementById('suppHint')
  const sSupport = document.getElementById('sSupport')

  if (suppNo) suppNo.classList.toggle('selected', val === 'No')
  if (suppYes) suppYes.classList.toggle('selected', val === 'Yes')
  if (supportField) supportField.style.display = val === 'Yes' ? 'block' : 'none'
  if (suppHint) suppHint.textContent = val === 'Yes' ? 'Describe the support needed:' : 'No support needed'
  if (val === 'Yes') {
    if (sSupport) sSupport.focus()
  } else {
    if (sSupport) sSupport.value = ''
  }
}

// Prefill forms with defaults
function prefillForms() {
  const now = new Date()
  const todayVal = now.toISOString().split('T')[0]

  const sDate = document.getElementById('sDate')
  const eDate = document.getElementById('eDate')
  const lDate = document.getElementById('lDate')
  const lFirstCall = document.getElementById('lFirstCall')

  if (sDate) sDate.value = todayVal
  if (eDate) eDate.value = todayVal
  if (lDate) lDate.value = todayVal
  if (lFirstCall) lFirstCall.value = todayVal

  // Week start (Monday) and end (Sunday)
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const wStart = document.getElementById('wStart')
  const wEnd = document.getElementById('wEnd')
  if (wStart) wStart.value = monday.toISOString().split('T')[0]
  if (wEnd) wEnd.value = sunday.toISOString().split('T')[0]

  const sEmail = document.getElementById('sEmail')
  const sodHeroDate = document.getElementById('sodHeroDate')
  const sodHeroUser = document.getElementById('sodHeroUser')
  const eodHeroDate = document.getElementById('eodHeroDate')
  const eodHeroUser = document.getElementById('eodHeroUser')
  const wodHeroUser = document.getElementById('wodHeroUser')
  const leadHeroUser = document.getElementById('leadHeroUser')
  const histDateF = document.getElementById('histDateF')
  const eodDateF = document.getElementById('eodDateF')
  const wodDateF = document.getElementById('wodDateF')

  if (sEmail) sEmail.value = S.email
  if (sodHeroDate) sodHeroDate.textContent = todayFull()
  if (sodHeroUser) sodHeroUser.textContent = S.name
  if (eodHeroDate) eodHeroDate.textContent = todayFull()
  if (eodHeroUser) eodHeroUser.textContent = S.name
  if (wodHeroUser) wodHeroUser.textContent = S.name
  if (leadHeroUser) leadHeroUser.textContent = S.name
  if (histDateF) histDateF.value = todayVal
  if (eodDateF) eodDateF.value = todayVal
  if (wodDateF) wodDateF.value = todayVal

  // Auto-populate Sales Executive fields with logged-in user's name
  const sExec = document.getElementById('sExec')
  const eExec = document.getElementById('eExec')
  const wExec = document.getElementById('wExec')
  const lExec = document.getElementById('lExec')

  if (sExec) sExec.value = S.name
  if (eExec) eExec.value = S.name
  if (wExec) wExec.value = S.name
  if (lExec) lExec.value = S.name

  populateExecSelectors()

  // Set territory based on email for sales executives and employees
  const isSalesExecutive = S.role === 'employee' || S.role === 'sales_executive'
  if (isSalesExecutive) {
    const tMap = { 'vaibhav@fundingsathi.com': 'Thane', 'saleem@fundingsathi.com': 'Thane', 'roshan@fundingsathi.com': 'Mumbai' }
    const sTerritory = document.getElementById('sTerritory')
    if (sTerritory) sTerritory.value = tMap[S.email] || ''
  }
}

function populateExecSelectors() {
  const storedUsers = JSON.parse(localStorage.getItem('crm_users') || '{}')
  const normalizedUsers = {}
  Object.entries(storedUsers).forEach(([email, user]) => {
    const displayName = getUserDisplayName(user)
    normalizedUsers[email] = {
      ...user,
      name: displayName,
      displayName: displayName,
      initials: user.initials || String(displayName || '')
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .join('')
        .toUpperCase()
    }
  })
  if (JSON.stringify(normalizedUsers) !== JSON.stringify(storedUsers)) {
    localStorage.setItem('crm_users', JSON.stringify(normalizedUsers))
  }

  const finalNames = Object.values(normalizedUsers)
    .map(user => user.name)
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
  const defaultNames = ['Vaibhav Borge', 'Saleem Khan', 'Roshan Chawan']
  const execNames = finalNames.length ? finalNames : defaultNames
  const isEmployeeLike = S?.role === 'employee' || S?.role === 'sales_executive'
  const loggedInName = S?.name?.trim() || ''

  ;['sExec', 'eExec', 'wExec', 'lExec'].forEach(id => {
    const el = document.getElementById(id)
    if (!el) return

    if (isEmployeeLike) {
      el.innerHTML = loggedInName
        ? `<option value="${loggedInName}">${loggedInName}</option>`
        : '<option value="">Select Executive</option>'
      el.disabled = true
      return
    }

    el.disabled = false
    el.innerHTML = '<option value="">Select Executive</option>'
    execNames.forEach(name => {
      const option = document.createElement('option')
      option.value = name
      option.textContent = name
      el.appendChild(option)
    })
  })
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
  // Zia input Enter key support
  const ziaInput = document.getElementById('zia-input')
  if (ziaInput) {
    ziaInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter' && typeof askZia === 'function') askZia()
    })
  }
})

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initSession, logout, getSOD, saveSOD, getEOD, saveEOD, getWOD, saveWOD, getMtgs, saveMtgs, mySOD, myEOD, myWOD, myMtgs }
}
