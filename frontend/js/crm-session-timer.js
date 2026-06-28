// CRM Session Timer - CRM-only integration
const CRM_SESSION_TIMER_STORAGE_KEY = 'crm_session_timer_state'
const CRM_SESSION_TIMER_IDLE_WARN_MS = 10 * 60 * 1000
const CRM_SESSION_TIMER_AUTO_PAUSE_MS = 10 * 60 * 1000
const CRM_SESSION_TIMER_SAVE_INTERVAL_MS = 5000
const CRM_SESSION_TIMER_TARGET_SEC = 8 * 3600
const CRM_SESSION_TIMER_CALL_UPLOAD_THRESHOLD_SEC = 10 * 60

const CRM_SESSION_TIMER_DEFAULTS = {
  userId: '',
  userName: '',
  userEmail: '',
  state: 'stopped',
  workSec: 0,
  idleSec: 0,
  callSec: 0,
  callStartedAt: null,
  callCount: 0,
  breakSec: 0,
  meetingSec: 0,
  warningSec: 30,
  breakType: '',
  breakDurationTargetMin: 0,
  breakStartedAt: null,
  autoPaused: false,
  lastActiveTs: Date.now(),
  attendanceLog: [],
  approvals: [],
  approvalHistory: [],
  pendingApprovals: [],
  recordings: [],
  createdAt: Date.now()
}

let crmTimer = null
let crmTimerInterval = null

function loadCrmSessionTimerState() {
  const stored = localStorage.getItem(CRM_SESSION_TIMER_STORAGE_KEY)
  if (!stored) return { ...CRM_SESSION_TIMER_DEFAULTS }
  try {
    const parsed = JSON.parse(stored)
    return { ...CRM_SESSION_TIMER_DEFAULTS, ...parsed }
  } catch (error) {
    console.warn('crm-session-timer: invalid storage payload, resetting', error)
    return { ...CRM_SESSION_TIMER_DEFAULTS }
  }
}

function saveCrmSessionTimerState() {
  if (!crmTimer) return
  crmTimerPersistUserMetrics()
  localStorage.setItem(CRM_SESSION_TIMER_STORAGE_KEY, JSON.stringify(crmTimer))
}

function formatCrmTimerTime(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatCrmTimerClock(ts) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return 'Unknown time'
  }
}

function formatCrmTimerDate(ts) {
  try {
    return new Date(ts).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return 'Unknown date'
  }
}

function crmTimerShowToast(message, type = 'info') {
  if (typeof showToast === 'function') {
    showToast(message, type)
    return
  }
  console.log(`[crm-timer ${type}] ${message}`)
}

function crmTimerEnsurePendingApprovals() {
  if (crmTimer.pendingApprovals && crmTimer.pendingApprovals.length) return
  crmTimer.pendingApprovals = []
}

function crmTimerShowWarningPopup() {
  // Warning popup disabled; keep timer behavior without a modal overlay.
}

function crmTimerHideWarningPopup() {
  // No popup to hide when warning overlay is disabled.
}

function crmTimerInitializePopupContainers() {
  if (document.getElementById('crmTimerCallUploadPopup')) return

  const uploadPopup = document.createElement('div')
  uploadPopup.id = 'crmTimerCallUploadPopup'
  uploadPopup.style.position = 'fixed'
  uploadPopup.style.inset = '0'
  uploadPopup.style.background = 'rgba(0,0,0,0.35)'
  uploadPopup.style.display = 'none'
  uploadPopup.style.alignItems = 'center'
  uploadPopup.style.justifyContent = 'center'
  uploadPopup.style.zIndex = '3100'
  uploadPopup.innerHTML = `
    <div style="width:100%;max-width:460px;background:white;border-radius:18px;padding:24px;box-shadow:0 24px 60px rgba(0,0,0,0.18);">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px;">
        <div>
          <div style="font-size:18px;font-weight:700;color:#111;">Call outcome and recording</div>
          <div style="font-size:13px;color:#666;margin-top:4px;">Save the call result and attach an audio file when the lead is interested.</div>
        </div>
        <button onclick="crmTimerCloseCallUploadPopup()" style="border:none;background:none;font-size:22px;color:#666;cursor:pointer;line-height:1;">×</button>
      </div>
      <div style="display:grid;gap:12px;">
        <div style="font-size:13px;color:#444;">Actual call duration: <span class="crm-timer-call-duration">00:00:00</span></div>
        <label style="font-size:13px;color:#555;">Call outcome</label>
        <select id="crmTimerCallOutcome" onchange="crmTimerToggleCallOutcomeFields()" style="width:100%;padding:10px;border:1px solid #d9d9d9;border-radius:12px;font-size:14px;background:#fff;">
          <option value="interested">Interested</option>
          <option value="reference">Reference</option>
          <option value="other">Other</option>
          <option value="not-interested">Not interested</option>
        </select>
        <div id="crmTimerOtherOutcomeContainer" style="display:none;">
          <label style="font-size:13px;color:#555;">Custom outcome</label>
          <input id="crmTimerOtherOutcome" type="text" placeholder="Explain the call outcome" style="width:100%;padding:10px;border:1px solid #d9d9d9;border-radius:12px;font-size:14px;background:#fff;" />
        </div>
        <label style="font-size:13px;color:#555;">Lead / customer name</label>
        <input id="crmTimerUploadLeadName" type="text" placeholder="Rahul Gupta – Housing Loan" style="width:100%;padding:10px;border:1px solid #d9d9d9;border-radius:12px;font-size:14px;background:#fff;" />
        <div id="crmTimerUploadRecordingSection">
          <label style="font-size:13px;color:#555;">Recording file</label>
          <input id="crmTimerUploadFile" type="file" accept="audio/*,video/*" style="width:100%;padding:10px;border:1px solid #d9d9d9;border-radius:12px;font-size:14px;background:#fff;" />
          <div style="font-size:12px;color:#6b7280;">Attach audio only when lead is interested in a follow-up.</div>
          <label style="font-size:13px;color:#555;">Claimed duration</label>
          <input id="crmTimerClaimDuration" type="text" placeholder="00:09:00" oninput="crmTimerUpdateUploadDurationWarning()" style="width:100%;padding:10px;border:1px solid #d9d9d9;border-radius:12px;font-size:14px;background:#fff;" />
          <div id="crmTimerUploadDurationWarning" style="display:none;font-size:12px;color:#b91c1c;"></div>
        </div>
        <label style="font-size:13px;color:#555;">Notes</label>
        <textarea id="crmTimerUploadNotes" class="crm-timer-call-notes" rows="5" style="width:100%;padding:12px;border:1px solid #d9d9d9;border-radius:12px;font-size:14px;resize:vertical;"></textarea>
        <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end;">
          <button onclick="crmTimerCloseCallUploadPopup()" style="flex:1 1 120px;padding:11px 14px;border:1px solid #c4c4c4;background:white;color:#333;border-radius:12px;cursor:pointer;font-size:13px;">Cancel</button>
          <button onclick="crmTimerSubmitCallUpload()" style="flex:1 1 140px;padding:11px 14px;border:none;background:var(--maroon);color:white;border-radius:12px;cursor:pointer;font-size:13px;">Save outcome</button>
        </div>
      </div>
    </div>`
  document.body.appendChild(uploadPopup)
}

function crmTimerGetLeadOptions() {
  const leads = [
    { id: 'lead-001', label: 'Rahul Gupta – Housing Loan' },
    { id: 'lead-002', label: 'Simran Sharma – Business Loan' },
    { id: 'lead-003', label: 'Tanya Patel – Education Loan' }
  ]
  return leads
}

function crmTimerPopulateLeadSelect() {
  const select = document.getElementById('crmTimerUploadLeadSelect')
  if (!select) return
  const options = crmTimerGetLeadOptions()
  select.innerHTML = options.map(item => `<option value="${item.id}">${item.label}</option>`).join('')
}

function crmTimerParseDurationInput(value) {
  if (!value || typeof value !== 'string') return null
  const parts = value.trim().split(':').map(part => Number(part.trim()))
  if (parts.some(part => Number.isNaN(part))) return null
  if (parts.length === 1) return parts[0] * 60
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return null
}

function crmTimerUpdateUploadDurationWarning() {
  const warningEl = document.getElementById('crmTimerUploadDurationWarning')
  const claimInput = document.getElementById('crmTimerClaimDuration')
  if (!warningEl || !claimInput || !crmTimer) return
  const claimedSeconds = crmTimerParseDurationInput(claimInput.value)
  const actualSeconds = crmTimer.callSec || 0
  if (claimedSeconds === null) {
    warningEl.style.display = 'block'
    warningEl.textContent = 'Enter claimed duration in HH:MM:SS or MM:SS format.'
    return
  }
  const delta = Math.abs(claimedSeconds - actualSeconds)
  if (delta === 0) {
    warningEl.style.display = 'none'
    warningEl.textContent = ''
    return
  }
  warningEl.style.display = 'block'
  warningEl.textContent = `Duration mismatch: actual ${formatCrmTimerTime(actualSeconds)}, claimed ${formatCrmTimerTime(claimedSeconds)} (${formatCrmTimerTime(delta)} difference).`
}

function crmTimerToggleCallOutcomeFields() {
  const outcomeSelect = document.getElementById('crmTimerCallOutcome')
  const recordingSection = document.getElementById('crmTimerUploadRecordingSection')
  const otherContainer = document.getElementById('crmTimerOtherOutcomeContainer')
  const fileInput = document.getElementById('crmTimerUploadFile')
  if (!outcomeSelect) return
  const value = outcomeSelect.value
  const showRecording = value === 'interested'
  const showOther = value === 'other'
  if (recordingSection) {
    recordingSection.style.display = showRecording ? 'block' : 'none'
  }
  if (otherContainer) {
    otherContainer.style.display = showOther ? 'block' : 'none'
  }
  if (fileInput && !showRecording) {
    fileInput.value = ''
  }
}

function crmTimerOpenCallUploadPopup() {
  const popup = document.getElementById('crmTimerCallUploadPopup')
  if (!popup) return
  const leadInput = document.getElementById('crmTimerUploadLeadName')
  if (leadInput) leadInput.value = ''
  const durationEl = popup.querySelector('.crm-timer-call-duration')
  if (durationEl) durationEl.textContent = formatCrmTimerTime(crmTimer.callSec)
  const claimInput = document.getElementById('crmTimerClaimDuration')
  if (claimInput) claimInput.value = formatCrmTimerTime(crmTimer.callSec)
  const outcomeSelect = document.getElementById('crmTimerCallOutcome')
  if (outcomeSelect) outcomeSelect.value = 'interested'
  const otherInput = document.getElementById('crmTimerOtherOutcome')
  if (otherInput) otherInput.value = ''
  const fileInput = document.getElementById('crmTimerUploadFile')
  if (fileInput) fileInput.value = ''
  const notes = document.getElementById('crmTimerUploadNotes')
  if (notes) notes.value = ''
  crmTimerToggleCallOutcomeFields()
  crmTimerUpdateUploadDurationWarning()
  popup.style.display = 'flex'
}

function crmTimerCloseCallUploadPopup() {
  const popup = document.getElementById('crmTimerCallUploadPopup')
  if (!popup) return
  popup.style.display = 'none'
}

function crmTimerSubmitCallUpload() {
  const popup = document.getElementById('crmTimerCallUploadPopup')
  if (!popup || !crmTimer) return
  const outcomeSelect = document.getElementById('crmTimerCallOutcome')
  const otherOutcome = document.getElementById('crmTimerOtherOutcome')
  const leadInput = document.getElementById('crmTimerUploadLeadName')
  const notes = document.getElementById('crmTimerUploadNotes')
  const fileInput = document.getElementById('crmTimerUploadFile')
  const claimInput = document.getElementById('crmTimerClaimDuration')

  const outcomeValue = outcomeSelect?.value || 'interested'
  let outcomeLabel = 'Interested'
  if (outcomeValue === 'reference') outcomeLabel = 'Reference'
  if (outcomeValue === 'other') {
    outcomeLabel = otherOutcome?.value.trim() || ''
    if (!outcomeLabel) {
      crmTimerShowToast('Enter a custom call outcome when selecting Other.', 'error')
      return
    }
  }
  if (outcomeValue === 'not-interested') outcomeLabel = 'Not interested'

  const leadLabel = leadInput ? leadInput.value.trim() || 'Unknown lead' : 'Unknown lead'
  const noteText = notes ? notes.value.trim() : ''
  const actualSeconds = crmTimer.callSec || 0

  const saveOutcome = (recordData = {}) => {
    crmTimer.recordings.unshift({
      id: `rec-${Date.now()}`,
      lead: leadLabel,
      notes: noteText,
      outcome: outcomeLabel,
      actualDuration: formatCrmTimerTime(actualSeconds),
      uploadedAt: new Date().toLocaleString(),
      ...recordData
    })
    crmTimerEndCall()
    saveCrmSessionTimerState()
    crmTimerUpdateUI()
    crmTimerRenderPanel()
    crmTimerCloseCallUploadPopup()
    crmTimerShowToast(`Call outcome saved${outcomeValue === 'interested' ? ' and recording attached' : ''}.`, 'success')
  }

  if (outcomeValue === 'interested') {
    if (!fileInput || !fileInput.files || !fileInput.files.length) {
      crmTimerShowToast('Please choose a recording file before saving this outcome.', 'error')
      return
    }

    const claimedSeconds = crmTimerParseDurationInput(claimInput?.value || '')
    if (claimedSeconds === null) {
      crmTimerShowToast('Enter claimed duration in HH:MM:SS or MM:SS format.', 'error')
      return
    }

    const file = fileInput.files[0]
    const mismatch = Math.abs(claimedSeconds - actualSeconds) > 60
    if (mismatch) {
      const proceed = confirm(`Claimed duration ${formatCrmTimerTime(claimedSeconds)} does not match actual call duration ${formatCrmTimerTime(actualSeconds)}. Continue saving?`)
      if (!proceed) return
    }

    const reader = new FileReader()
    reader.onload = () => {
      saveOutcome({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        claimedDuration: formatCrmTimerTime(claimedSeconds),
        mismatch,
        fileDataUrl: reader.result
      })
    }
    reader.onerror = () => {
      crmTimerShowToast('Unable to read the recording file.', 'error')
    }
    reader.readAsDataURL(file)
    return
  }

  saveOutcome()
}

function crmTimerIsAdmin() {
  const sessionData = localStorage.getItem('crm_session')
  if (!sessionData) return false
  try {
    const currentUser = JSON.parse(sessionData)
    return String(currentUser.role || '').toLowerCase() === 'admin'
  } catch (error) {
    return false
  }
}

function crmTimerReviewCallApproval(requestId, decision) {
  if (!crmTimer) return
  if (!crmTimerIsAdmin()) {
    crmTimerShowToast('Only admins can approve or reject call approvals.', 'error')
    return
  }
  const request = crmTimer.pendingApprovals.find(r => r.id === requestId)
  if (!request) return
  request.status = decision
  request.reviewedAt = new Date().toLocaleString()
  crmTimer.approvalHistory.unshift({ ...request })
  crmTimer.pendingApprovals = crmTimer.pendingApprovals.filter(r => r.id !== requestId)
  saveCrmSessionTimerState()
  crmTimerRenderPanel()
  crmTimerRenderAdminApprovals()
  crmTimerShowToast(`Request ${decision}ed.`, decision === 'approved' ? 'success' : 'error')
}

function crmTimerRenderAdminApprovals() {
  const target = document.getElementById('crmAdminApprovalsBody')
  if (!target || !crmTimer) return

  crmTimerEnsurePendingApprovals()

  const isAdmin = crmTimerIsAdmin()
  const pendingMarkup = crmTimer.pendingApprovals.length
    ? crmTimer.pendingApprovals.map(req => {
      const buttons = isAdmin
        ? `
            <button onclick="crmTimerReviewCallApproval('${req.id}', 'approved')" style="border:none;background:#7c3aed;color:white;padding:8px 10px;border-radius:10px;font-size:12px;cursor:pointer;">Approve</button>
            <button onclick="crmTimerReviewCallApproval('${req.id}', 'rejected')" style="border:1px solid #d1d5db;background:white;color:#111;padding:8px 10px;border-radius:10px;font-size:12px;cursor:pointer;">Reject</button>
          `
        : `<span style="font-size:12px;color:#6b7280;">Only admins can review approvals.</span>`
      return `
      <div style="padding:12px 14px;margin-bottom:12px;border:1px solid #e5e7eb;border-radius:14px;background:#fff;">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
          <div>
            <div style="font-size:13px;font-weight:700;color:#111;">${req.title}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:4px;">${req.details}</div>
          </div>
          <div style="text-align:right;min-width:88px;">
            <div style="font-size:11px;color:${req.type === 'flagged' ? '#b91c1c' : '#2563eb'};font-weight:700;text-transform:uppercase;">${req.type}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:6px;">${req.duration}</div>
          </div>
        </div>
        <div style="margin-top:12px;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center;">
          <div style="font-size:12px;color:${req.status === 'pending' ? '#92400e' : '#065f46'};font-weight:700;text-transform:capitalize;">${req.status}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">${buttons}</div>
        </div>
      </div>`
    }).join('')
    : '<div style="color:#6b7280;font-size:13px;">No pending approvals currently.</div>'

  const historyMarkup = crmTimer.approvalHistory.length
    ? crmTimer.approvalHistory.slice(0, 3).map(req => `
      <div style="padding:12px 14px;margin-bottom:10px;border-radius:12px;background:#f9fafb;border:1px solid #e5e7eb;">
        <div style="font-size:13px;font-weight:600;color:#111;">${req.title || req.user || 'Approval item'}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px;">${req.reviewedAt || req.approvedAt || req.requestedAt || ''} • ${req.status}</div>
      </div>`).join('')
    : '<div style="color:#6b7280;font-size:13px;">No approval history yet.</div>'

  target.innerHTML = `
    <div style="display:grid;gap:16px;">
      <div>
        ${pendingMarkup}
      </div>
      <div>
        <div style="font-size:13px;font-weight:700;color:#111;margin-bottom:8px;">Recent approval history</div>
        ${historyMarkup}
      </div>
    </div>`
}

function crmTimerGetUserName() {
  if (crmTimer?.userName) return crmTimer.userName
  const session = localStorage.getItem('crm_session')
  if (!session) return 'Unknown'
  try {
    const data = JSON.parse(session)
    return data.name || data.displayName || data.email || 'Unknown'
  } catch {
    return 'Unknown'
  }
}

function crmTimerUpdateUserFromSession() {
  const session = localStorage.getItem('crm_session')
  if (!session) return
  try {
    const data = JSON.parse(session)
    if (!data) return
    crmTimer.userEmail = crmTimer.userEmail || data.email || data.uid || data.id || ''
    crmTimer.userId = crmTimer.userId || data.email || data.uid || data.id || ''
    crmTimer.userName = crmTimer.userName || data.name || data.displayName || data.email || 'Unknown'
    crmTimer.loginTime = crmTimer.loginTime || data.loginTime || data.lastActive || ''
  } catch (error) {
    console.warn('crm-timer: failed to read crm_session', error)
  }
}

function crmTimerGetSessionUserEmail() {
  if (crmTimer?.userEmail) return crmTimer.userEmail
  const session = localStorage.getItem('crm_session')
  if (!session) return null
  try {
    const data = JSON.parse(session)
    return data.email || data.uid || null
  } catch (error) {
    return null
  }
}

function crmTimerPersistUserMetrics() {
  if (!crmTimer) return
  const email = crmTimerGetSessionUserEmail()
  if (!email) return
  try {
    const users = JSON.parse(localStorage.getItem('crm_users') || '{}')
    const key = email.toLowerCase()
    const existing = users[key] || users[email] || {}
    users[key] = {
      ...existing,
      ...existing,
      email,
      displayName: existing.displayName || crmTimer.userName || email,
      role: existing.role || 'sales_executive',
      loginTime: crmTimer.loginTime || existing.loginTime || new Date().toISOString(),
      lastActive: new Date().toLocaleString(),
      workSeconds: crmTimer.workSec,
      callSeconds: crmTimer.callSec,
      breakSeconds: crmTimer.breakSec,
      meetingSeconds: crmTimer.meetingSec,
      callCount: crmTimer.callCount
    }
    localStorage.setItem('crm_users', JSON.stringify(users))
  } catch (error) {
    console.warn('crm-timer: unable to persist session metrics for user', error)
  }
}

function crmTimerSetState(nextState, { autoPaused = false } = {}) {
  if (!crmTimer) return
  const prev = crmTimer.state
  crmTimer.state = nextState
  crmTimer.autoPaused = autoPaused
  crmTimer.lastActiveTs = Date.now()

  if (nextState === 'active' && prev !== 'active') {
    crmTimer.attendanceLog.unshift({
      id: `att-${Date.now()}`,
      event: prev === 'warning' || prev === 'stopped' || prev === 'break' || prev === 'meeting'
        ? 'Shift resumed'
        : 'Shift started',
      time: new Date().toLocaleTimeString(),
      state: nextState
    })
  }

  if (nextState === 'stopped' && prev !== 'stopped') {
    crmTimer.attendanceLog.unshift({
      id: `att-${Date.now()}`,
      event: 'Shift paused',
      time: new Date().toLocaleTimeString(),
      state: nextState
    })
  }

  if (nextState === 'warning') {
    crmTimer.warningSec = 30
  }

  crmTimerSaveStateDebounced()
  crmTimerUpdateUI()
}

function crmTimerSaveStateDebounced() {
  if (!crmTimer) return
  saveCrmSessionTimerState()
}

function crmTimerUpdateUI() {
  const statusEl = document.getElementById('crmSessionTimerStatus')
  const valueEl = document.getElementById('crmSessionTimerValue')
  const targetEl = document.getElementById('crmSessionTimerTarget')
  const callValueEl = document.getElementById('crmSessionTimerCallValue')
  const nowEl = document.getElementById('crmSessionTimerNow')
  const dateEl = document.getElementById('crmSessionTimerDate')
  const actionBtn = document.getElementById('crmSessionTimerAction')
  const callBtn = document.getElementById('crmSessionTimerCall')
  const meetingBtn = document.getElementById('crmSessionTimerMeeting')
  const teaBreakBtn = document.getElementById('crmSessionTimerTeaBreak')
  const lunchBreakBtn = document.getElementById('crmSessionTimerLunchBreak')
  const endBreakBtn = document.getElementById('crmSessionTimerEndBreak')
  const logBtn = document.getElementById('crmSessionTimerLog')
  const breakInfo = document.getElementById('crmTimerBreakInfo')

  if (!statusEl || !valueEl || !actionBtn || !callBtn || !logBtn) return

  let statusText = 'Idle'
  switch (crmTimer.state) {
    case 'active': statusText = 'Working'; break
    case 'oncall': statusText = 'On Call'; break
    case 'meeting': statusText = 'In Meeting'; break
    case 'break': statusText = crmTimer.breakType ? `${crmTimer.breakType} Break` : 'On Break'; break
    case 'warning': statusText = `Idle warning (${crmTimer.warningSec}s)`; break
    case 'stopped': statusText = crmTimer.autoPaused ? 'Paused (idle)' : 'Paused'; break
    case 'loggedout': statusText = 'Logged out'; break
    default: statusText = crmTimer.state
  }

  statusEl.textContent = statusText
  if (crmTimer.state === 'active') {
    valueEl.textContent = formatCrmTimerTime(crmTimer.workSec)
  } else if (crmTimer.state === 'oncall') {
    valueEl.textContent = formatCrmTimerTime(crmTimer.callSec)
  } else if (crmTimer.state === 'meeting') {
    valueEl.textContent = formatCrmTimerTime(crmTimer.meetingSec)
  } else if (crmTimer.state === 'break') {
    valueEl.textContent = formatCrmTimerTime(crmTimer.breakSec)
  } else if (crmTimer.state === 'stopped') {
    valueEl.textContent = formatCrmTimerTime(crmTimer.idleSec)
  } else {
    const totalSec = crmTimer.workSec + crmTimer.callSec + crmTimer.idleSec + crmTimer.breakSec + crmTimer.meetingSec
    valueEl.textContent = formatCrmTimerTime(totalSec)
  }

  actionBtn.textContent = crmTimer.state === 'active' || crmTimer.state === 'oncall' || crmTimer.state === 'meeting' || crmTimer.state === 'break' ? 'Pause' : 'Start'
  callBtn.textContent = crmTimer.state === 'oncall' ? 'End Call' : 'On Call'
  if (meetingBtn) meetingBtn.textContent = crmTimer.state === 'meeting' ? 'End Meeting' : 'Meeting'
  if (endBreakBtn) endBreakBtn.textContent = crmTimer.state === 'break' ? 'End Break' : 'End Break'
  if (teaBreakBtn) teaBreakBtn.disabled = crmTimer.state !== 'active'
  if (lunchBreakBtn) lunchBreakBtn.disabled = crmTimer.state !== 'active'

  callBtn.disabled = ['stopped', 'loggedout', 'warning', 'break', 'meeting'].includes(crmTimer.state)
  if (meetingBtn) meetingBtn.disabled = ['stopped', 'loggedout', 'warning', 'break', 'oncall'].includes(crmTimer.state)
  if (actionBtn) actionBtn.disabled = crmTimer.state === 'loggedout' || crmTimer.state === 'warning'

  logBtn.textContent = crmTimer.state === 'oncall' ? `Calls (${crmTimer.callCount})` : `Log (${crmTimer.attendanceLog.length})`

  if (callValueEl) {
    callValueEl.textContent = formatCrmTimerTime(crmTimer.callSec || 0)
  }
  if (nowEl) {
    nowEl.textContent = formatCrmTimerClock(Date.now())
  }
  if (dateEl) {
    dateEl.textContent = formatCrmTimerDate(Date.now())
  }
  if (targetEl) {
    const remaining = Math.max(0, CRM_SESSION_TIMER_TARGET_SEC - crmTimer.workSec)
    targetEl.textContent = formatCrmTimerTime(remaining)
  }

  if (breakInfo) {
    if (crmTimer.state === 'break' && crmTimer.breakType) {
      const startedAtText = crmTimer.breakStartedAt ? ` since ${formatCrmTimerClock(crmTimer.breakStartedAt)}` : ''
      breakInfo.textContent = `${crmTimer.breakType} break in progress${startedAtText} • ${formatCrmTimerTime(crmTimer.breakSec)} / ${crmTimer.breakDurationTargetMin} min`
    } else if (crmTimer.state === 'meeting') {
      breakInfo.textContent = 'Meeting in progress. Work timer is paused while meetings are active.'
    } else if (crmTimer.state === 'oncall') {
      breakInfo.textContent = 'Call in progress. Use End Call to return to work.'
    } else if (crmTimer.state === 'warning') {
      breakInfo.textContent = 'No activity detected. Interact to resume before the session auto-pauses.'
    } else if (crmTimer.state === 'stopped' && crmTimer.autoPaused) {
      breakInfo.textContent = 'Auto-paused after inactivity. Click Start or interact to resume.'
    } else {
      breakInfo.textContent = 'Use the controls to start work, call, meeting or break time.'
    }
  }
}

function crmTimerTick() {
  if (!crmTimer) return
  const now = Date.now()
  const inactivityMs = now - crmTimer.lastActiveTs

  if (crmTimer.state === 'active') {
    if (inactivityMs >= CRM_SESSION_TIMER_AUTO_PAUSE_MS) {
      crmTimerSetState('stopped', { autoPaused: true })
      crmTimerShowToast('Inactive for 10 minutes. Session paused due to inactivity.', 'error')
    } else {
      crmTimer.workSec += 1
    }
  }

  if (crmTimer.state === 'oncall') {
    crmTimer.callSec += 1
  }

  if (crmTimer.state === 'meeting') {
    crmTimer.meetingSec += 1
  }

  if (crmTimer.state === 'break') {
    crmTimer.breakSec += 1
  }

  if (crmTimer.state === 'stopped') {
    crmTimer.idleSec += 1
  }

  crmTimerUpdateUI()
}

function crmTimerStartLoop() {
  if (crmTimerInterval) clearInterval(crmTimerInterval)
  crmTimerInterval = setInterval(() => {
    crmTimerTick()
    saveCrmSessionTimerState()
  }, 1000)
}

function crmTimerHandleActivity() {
  if (!crmTimer || crmTimer.state === 'loggedout') return
  if (crmTimer.state === 'warning') {
    crmTimerSetState('active')
    crmTimerHideWarningPopup()
    crmTimerShowToast('Session resumed from idle warning.', 'success')
    return
  }

  if (crmTimer.state === 'stopped' && crmTimer.autoPaused) {
    crmTimerSetState('active')
    crmTimerShowToast('Session resumed after idle pause.', 'success')
    return
  }

  crmTimer.lastActiveTs = Date.now()
}

function crmTimerHandleVisibilityChange() {
  if (!crmTimer || crmTimer.state === 'loggedout') return
  if (document.hidden && crmTimer.state === 'active') {
    // Keep running for up to the idle timeout window.
    // Actual pause happens after 10 minutes of no activity.
  }
}

function crmTimerToggleShift() {
  if (!crmTimer) return
  if (['active', 'oncall', 'meeting', 'break'].includes(crmTimer.state)) {
    if (crmTimer.state === 'oncall') {
      crmTimerEndCall()
    }
    if (crmTimer.state === 'meeting') {
      crmTimerEndMeeting()
    }
    if (crmTimer.state === 'break') {
      crmTimerEndBreak()
    }
    crmTimerSetState('stopped', { autoPaused: false })
    crmTimerShowToast('Shift paused.', 'info')
    return
  }
  crmTimerSetState('active')
  crmTimerShowToast('Shift started.', 'success')
}

function crmTimerToggleCall() {
  if (!crmTimer) return
  if (crmTimer.state === 'oncall') {
    crmTimerOpenCallUploadPopup()
    return
  }
  if (crmTimer.state !== 'active') {
    crmTimerShowToast('Please start your shift before going on call.', 'error')
    return
  }
  crmTimer.state = 'oncall'
  crmTimer.callStartedAt = Date.now()
  crmTimer.callCount += 1
  crmTimer.lastActiveTs = Date.now()
  crmTimer.attendanceLog.unshift({
    id: `att-${Date.now()}`,
    event: 'Call started',
    time: new Date().toLocaleTimeString(),
    state: 'oncall'
  })
  crmTimerSaveStateDebounced()
  crmTimerUpdateUI()
}

function crmTimerEndCall() {
  if (!crmTimer) return
  if (crmTimer.state !== 'oncall') return
  crmTimer.state = 'active'
  crmTimer.callSec = 0
  crmTimer.callStartedAt = null
  crmTimer.lastActiveTs = Date.now()
  crmTimer.attendanceLog.unshift({
    id: `att-${Date.now()}`,
    event: 'Call ended',
    time: new Date().toLocaleTimeString(),
    state: 'active'
  })
  crmTimerSaveStateDebounced()
  crmTimerUpdateUI()
}

function crmTimerToggleMeeting() {
  if (!crmTimer) return
  if (crmTimer.state === 'meeting') {
    crmTimerEndMeeting()
    return
  }
  if (crmTimer.state !== 'active') {
    crmTimerShowToast('Please start your shift before entering a meeting.', 'error')
    return
  }
  crmTimer.state = 'meeting'
  crmTimer.lastActiveTs = Date.now()
  crmTimer.attendanceLog.unshift({
    id: `att-${Date.now()}`,
    event: 'Meeting started',
    time: new Date().toLocaleTimeString(),
    state: 'meeting'
  })
  crmTimerSaveStateDebounced()
  crmTimerUpdateUI()
}

function crmTimerEndMeeting() {
  if (!crmTimer) return
  if (crmTimer.state !== 'meeting') return
  crmTimer.state = 'active'
  crmTimer.lastActiveTs = Date.now()
  crmTimer.attendanceLog.unshift({
    id: `att-${Date.now()}`,
    event: 'Meeting ended',
    time: new Date().toLocaleTimeString(),
    state: 'active'
  })
  crmTimerSaveStateDebounced()
  crmTimerUpdateUI()
}

function crmTimerStartBreak(type, durationMin) {
  if (!crmTimer) return
  if (crmTimer.state !== 'active') {
    crmTimerShowToast('Please start your shift before taking a break.', 'error')
    return
  }
  crmTimer.state = 'break'
  crmTimer.breakType = type
  crmTimer.breakDurationTargetMin = durationMin
  crmTimer.breakStartedAt = Date.now()
  crmTimer.lastActiveTs = Date.now()
  crmTimer.attendanceLog.unshift({
    id: `att-${Date.now()}`,
    event: `${type} break started at ${formatCrmTimerClock(crmTimer.breakStartedAt)}`,
    time: new Date().toLocaleTimeString(),
    state: 'break'
  })
  crmTimerSaveStateDebounced()
  crmTimerUpdateUI()
}

function crmTimerEndBreak() {
  if (!crmTimer) return
  if (crmTimer.state !== 'break') return
  const endedType = crmTimer.breakType || 'Break'
  crmTimer.state = 'active'
  crmTimer.breakType = ''
  crmTimer.breakDurationTargetMin = 0
  crmTimer.breakStartedAt = null
  crmTimer.lastActiveTs = Date.now()
  crmTimer.attendanceLog.unshift({
    id: `att-${Date.now()}`,
    event: `${endedType} ended`,
    time: new Date().toLocaleTimeString(),
    state: 'active'
  })
  crmTimerSaveStateDebounced()
  crmTimerUpdateUI()
}

function crmTimerOpenPanel() {
  const panel = document.getElementById('crmSessionTimerPanel')
  if (!panel) return
  panel.style.display = panel.style.display === 'block' ? 'none' : 'block'
  crmTimerRenderPanel()
}

function crmTimerClosePanel() {
  const panel = document.getElementById('crmSessionTimerPanel')
  if (!panel) return
  panel.style.display = 'none'
}

function crmTimerRequestApproval() {
  if (!crmTimer) return
  const request = {
    id: `apr-${Date.now()}`,
    user: crmTimerGetUserName(),
    requestedAt: new Date().toLocaleString(),
    status: 'pending',
    comment: 'Approval requested from admin'
  }
  crmTimer.approvals.unshift(request)
  crmTimer.pendingApprovals.unshift({
    ...request,
    title: request.user,
    details: request.comment,
    type: 'admin-request',
    duration: '00:00:00',
    hasRecording: false
  })
  crmTimer.attendanceLog.unshift({
    id: `att-${Date.now()}`,
    event: 'Approval requested',
    time: new Date().toLocaleTimeString(),
    state: 'pending-approval'
  })
  saveCrmSessionTimerState()
  crmTimerRenderPanel()
  crmTimerShowToast('Approval request sent to admin.', 'success')
}

function crmTimerApproveRequest(requestId) {
  if (!crmTimer) return
  const request = crmTimer.approvals.find(r => r.id === requestId)
  if (!request) return
  request.status = 'approved'
  request.approvedAt = new Date().toLocaleString()
  crmTimer.approvalHistory.unshift(request)
  crmTimer.approvals = crmTimer.approvals.filter(r => r.id !== requestId)
  saveCrmSessionTimerState()
  crmTimerRenderPanel()
  crmTimerShowToast('Approval request approved.', 'success')
}

function crmTimerRenderPanel() {
  const panel = document.getElementById('crmSessionTimerPanel')
  if (!panel) return
  if (panel.style.display !== 'block') return

  crmTimerEnsurePendingApprovals()
  const isAdmin = crmTimerIsAdmin()

  const summary = `Work ${formatCrmTimerTime(crmTimer.workSec)} · Call ${formatCrmTimerTime(crmTimer.callSec)} · Idle ${formatCrmTimerTime(crmTimer.idleSec)}`
  const approvalRows = crmTimer.pendingApprovals.length
    ? crmTimer.pendingApprovals.map(req => {
      const actionHtml = isAdmin
        ? `
            <button onclick="crmTimerReviewCallApproval('${req.id}', 'approved')" style="border:none;background:var(--maroon);color:white;padding:6px 10px;border-radius:10px;font-size:11px;cursor:pointer;">Approve</button>
            <button onclick="crmTimerReviewCallApproval('${req.id}', 'rejected')" style="border:1px solid #d1d5db;background:white;color:#111;padding:6px 10px;border-radius:10px;font-size:11px;cursor:pointer;">Reject</button>
          `
        : `<span style="font-size:12px;color:var(--gray-500);">Only admins can review approvals.</span>`
      return `
      <div style="padding:10px 12px;margin-bottom:10px;border:1px solid var(--gray-200);border-radius:12px;background:#fff;">
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
          <div>
            <div style="font-size:13px;font-weight:700;color:var(--gray-900);">${req.title}</div>
            <div style="font-size:12px;color:var(--gray-600);margin-top:4px;">${req.details}</div>
          </div>
          <div style="text-align:right;min-width:88px;">
            <div style="font-size:11px;color:${req.type === 'flagged' ? '#b91c1c' : '#2563eb'};font-weight:700;text-transform:uppercase;">${req.type}</div>
            <div style="font-size:12px;color:var(--gray-500);margin-top:6px;">${req.duration}</div>
          </div>
        </div>
        <div style="margin-top:12px;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center;">
          <div style="font-size:11px;color:${req.status === 'pending' ? '#92400e' : '#065f46'};font-weight:700;text-transform:capitalize;">${req.status}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">${actionHtml}</div>
        </div>
      </div>`
    }).join('')
    : '<div style="color:var(--gray-500);font-size:12px;padding:12px 0;">No pending approvals</div>'

  const requestRows = crmTimer.approvals.length
    ? crmTimer.approvals.map(req => `
      <div style="padding:10px 12px;margin-bottom:10px;border:1px solid var(--gray-200);border-radius:12px;background:#fff;">
        <div style="font-size:13px;font-weight:700;color:var(--gray-900);">${req.user}</div>
        <div style="font-size:12px;color:var(--gray-600);margin-top:4px;">${req.requestedAt} • ${req.status}</div>
      </div>`).join('')
    : '<div style="color:var(--gray-500);font-size:12px;padding:12px 0;">No approval requests</div>'

  const attendanceRows = crmTimer.attendanceLog.slice(0, 6).map(entry => `
      <div style="padding:10px 0;border-bottom:1px solid rgba(0,0,0,0.05);display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
        <div style="font-size:12px;color:var(--gray-700);">${entry.event}</div>
        <div style="font-size:11px;color:var(--gray-500);white-space:nowrap;">${entry.time}</div>
      </div>`).join('')

  const recordingRows = crmTimer.recordings.length
    ? crmTimer.recordings.slice(0, 4).map(entry => `
      <div style="padding:10px 12px;margin-bottom:10px;border:1px solid var(--gray-200);border-radius:12px;background:#fff;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
          <div>
            <div style="font-size:13px;font-weight:700;color:#111;">${entry.lead}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:4px;">Outcome: ${entry.outcome}</div>
            <div style="font-size:12px;color:#4b5563;margin-top:6px;">${entry.notes || 'No notes'}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:8px;">${entry.actualDuration}${entry.claimedDuration ? ' • claimed ' + entry.claimedDuration : ''}</div>
            ${entry.fileName ? `<div style="font-size:11px;color:#6b7280;margin-top:4px;">${entry.fileName}</div>` : ''}
          </div>
          <div style="text-align:right;min-width:100px;">
            <div style="font-size:11px;color:#6b7280;">${entry.uploadedAt}</div>
          </div>
        </div>
        ${entry.fileDataUrl ? `<audio controls style="width:100%;margin-top:12px;"><source src="${entry.fileDataUrl}" type="${entry.fileType || 'audio/mpeg'}" /></audio>` : ''}
      </div>`).join('')
    : '<div style="color:var(--gray-500);font-size:12px;padding:12px 0;">No recent call outcomes recorded.</div>'

  panel.innerHTML = `
    <div style="padding:18px;display:flex;flex-direction:column;gap:14px;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
        <div>
          <div style="font-size:14px;font-weight:700;color:var(--gray-900);">Work Session</div>
          <div style="font-size:12px;color:var(--gray-500);">${crmTimerGetUserName()}</div>
        </div>
        <button onclick="crmTimerClosePanel()" style="background:none;border:none;color:var(--gray-500);font-size:18px;line-height:1;cursor:pointer;">×</button>
      </div>
      <div style="background:var(--gray-50);padding:14px;border-radius:14px;border:1px solid var(--gray-200);">
        <div style="font-size:12px;color:var(--gray-500);margin-bottom:6px;">Current status</div>
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;">
          <div style="font-weight:700;color:var(--gray-900);">${crmTimer.state.toUpperCase()}</div>
          <div style="font-size:13px;color:var(--gray-700);">${summary}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div style="background:#fff;padding:12px;border-radius:12px;border:1px solid var(--gray-200);">
          <div style="font-size:12px;color:var(--gray-500);">Shift Time</div>
          <div style="font-weight:700;color:var(--gray-900);">${formatCrmTimerTime(crmTimer.workSec)}</div>
        </div>
        <div style="background:#fff;padding:12px;border-radius:12px;border:1px solid var(--gray-200);">
          <div style="font-size:12px;color:var(--gray-500);">Call Time</div>
          <div style="font-weight:700;color:var(--gray-900);">${formatCrmTimerTime(crmTimer.callSec)}</div>
        </div>
      </div>
      <div style="background:#fff;padding:12px;border-radius:12px;border:1px solid var(--gray-200);">
        <div style="font-size:12px;color:var(--gray-500);margin-bottom:10px;">Attendance log</div>
        ${attendanceRows || '<div style="font-size:12px;color:var(--gray-500);">No attendance events yet.</div>'}
      </div>
      <div style="background:#fff;padding:12px;border-radius:12px;border:1px solid var(--gray-200);">
        <div style="font-size:12px;color:var(--gray-500);margin-bottom:10px;">Recent call outcomes</div>
        ${recordingRows}
      </div>
      <div style="background:#fff;padding:12px;border-radius:12px;border:1px solid var(--gray-200);">
        <div style="font-size:12px;color:var(--gray-500);margin-bottom:10px;">Pending approvals</div>
        ${approvalRows}
      </div>
      <div style="background:#fff;padding:12px;border-radius:12px;border:1px solid var(--gray-200);">
        <div style="font-size:12px;color:var(--gray-500);margin-bottom:10px;">Approval requests</div>
        ${requestRows}
      </div>
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">
        <button onclick="crmTimerRequestApproval()" style="width:100%;padding:10px 12px;border:none;background:var(--maroon);color:white;border-radius:10px;cursor:pointer;font-size:12px;">Request Approval</button>
        <button onclick="crmTimerReset()" style="width:100%;padding:10px 12px;border:1px solid var(--gray-300);background:white;color:var(--gray-700);border-radius:10px;cursor:pointer;font-size:12px;">Reset Session</button>
      </div>
    </div>`
}

function crmTimerReset() {
  if (!confirm('Reset the work timer and clear session log?')) return
  crmTimer = { ...CRM_SESSION_TIMER_DEFAULTS }
  crmTimerUpdateUserFromSession()
  saveCrmSessionTimerState()
  crmTimerUpdateUI()
  crmTimerRenderPanel()
  crmTimerShowToast('Session timer reset.', 'success')
}

function crmTimerInitializePlaceholder() {
  if (document.getElementById('crmSessionTimer')) return true
  const dashboardContainer = document.getElementById('crmTimerDashboardCard')
  const topbarRight = document.querySelector('.topbar-right')
  const target = dashboardContainer || topbarRight
  if (!target) return false
  target.insertAdjacentHTML('beforeend', `
    <div id="crmSessionTimer" style="background:#fff;border:1px solid rgba(148,163,184,0.25);border-radius:18px;padding:18px;display:grid;gap:14px;box-shadow:0 10px 30px rgba(15,23,42,0.06);">
      <div style="display:flex;justify-content:space-between;align-items:start;gap:16px;flex-wrap:wrap;">
        <div>
          <div style="font-size:16px;font-weight:700;color:#111;">Work Timer</div>
          <div style="font-size:13px;color:#4b5563;margin-top:4px;max-width:420px;">Track your 8-hour day with idle auto-pause, call/meeting pause, and break time control.</div>
        </div>
        <div style="text-align:right;min-width:120px;">
          <div style="font-size:11px;color:#6b7280;">Remaining</div>
          <div id="crmSessionTimerTarget" style="font-size:18px;font-weight:700;color:#111;">08:00:00</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;">
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:14px;">
          <div style="font-size:11px;color:#6b7280;">Status</div>
          <div id="crmSessionTimerStatus" style="margin-top:6px;font-size:18px;font-weight:700;color:#111;">Idle</div>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:14px;">
          <div style="font-size:11px;color:#6b7280;">Timer</div>
          <div id="crmSessionTimerValue" style="margin-top:6px;font-size:18px;font-weight:700;color:#111;">00:00:00</div>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:14px;">
          <div style="font-size:11px;color:#6b7280;">Call Time</div>
          <div id="crmSessionTimerCallValue" style="margin-top:6px;font-size:18px;font-weight:700;color:#111;">00:00:00</div>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:14px;">
          <div style="font-size:11px;color:#6b7280;">Now</div>
          <div id="crmSessionTimerNow" style="margin-top:6px;font-size:18px;font-weight:700;color:#111;">00:00:00</div>
          <div id="crmSessionTimerDate" style="margin-top:4px;font-size:11px;color:#6b7280;">Today</div>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:14px;">
          <div style="font-size:11px;color:#6b7280;">Auto-pause</div>
          <div style="margin-top:6px;font-size:16px;font-weight:700;color:#111;">10 min idle</div>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;">
        <button type="button" id="crmSessionTimerAction" style="padding:11px 16px;border-radius:12px;border:1px solid #cbd5e1;background:#fff;color:#111;font-weight:700;cursor:pointer;min-width:120px;">Start</button>
        <button type="button" id="crmSessionTimerCall" style="padding:11px 16px;border-radius:12px;border:1px solid #cbd5e1;background:#fff;color:#111;font-weight:700;cursor:pointer;min-width:120px;">On Call</button>
        <button type="button" id="crmSessionTimerMeeting" style="padding:11px 16px;border-radius:12px;border:1px solid #cbd5e1;background:#fff;color:#111;font-weight:700;cursor:pointer;min-width:120px;">Meeting</button>
        <button type="button" id="crmSessionTimerTeaBreak" style="padding:11px 16px;border-radius:12px;border:1px solid #cbd5e1;background:#fff;color:#111;font-weight:700;cursor:pointer;min-width:120px;">Tea Break</button>
        <button type="button" id="crmSessionTimerLunchBreak" style="padding:11px 16px;border-radius:12px;border:1px solid #cbd5e1;background:#fff;color:#111;font-weight:700;cursor:pointer;min-width:120px;">Lunch Break</button>
        <button type="button" id="crmSessionTimerEndBreak" style="padding:11px 16px;border-radius:12px;border:1px solid #cbd5e1;background:#fff;color:#111;font-weight:700;cursor:pointer;min-width:120px;">End Break</button>
        <button type="button" id="crmSessionTimerLog" style="padding:11px 16px;border-radius:12px;border:1px solid #cbd5e1;background:#fff;color:#111;font-weight:700;cursor:pointer;min-width:120px;">Log</button>
      </div>
      <div id="crmTimerBreakInfo" style="font-size:13px;color:#4b5563;">Use the controls to start work, call, meeting or break time.</div>
    </div>`)
  return true
}

function crmTimerRenderPlaceholderAndInit() {
  if (crmTimerIsAdmin()) {
    return
  }

  let initialized = false

  const tryInitialize = () => {
    if (initialized) return
    if (!crmTimerInitializePlaceholder()) return
    crmTimerInitialize()
    initialized = true
    clearInterval(initInterval)
  }

  const initInterval = setInterval(tryInitialize, 250)

  tryInitialize()
  setTimeout(() => clearInterval(initInterval), 10000)
}

function crmTimerInitializePanel() {
  if (document.getElementById('crmSessionTimerPanel')) return
  const container = document.createElement('div')
  container.id = 'crmSessionTimerPanel'
  container.style.position = 'absolute'
  container.style.top = '68px'
  container.style.right = '20px'
  container.style.width = '360px'
  container.style.maxWidth = 'calc(100vw - 24px)'
  container.style.zIndex = '2000'
  container.style.display = 'none'
  container.style.boxShadow = '0 24px 60px rgba(0,0,0,0.12)'
  container.style.borderRadius = '18px'
  container.style.background = 'white'
  container.style.border = '1px solid rgba(0,0,0,0.08)'
  document.body.appendChild(container)
}

function crmTimerAttachEvents() {
  const actionBtn = document.getElementById('crmSessionTimerAction')
  const callBtn = document.getElementById('crmSessionTimerCall')
  const meetingBtn = document.getElementById('crmSessionTimerMeeting')
  const teaBreakBtn = document.getElementById('crmSessionTimerTeaBreak')
  const lunchBreakBtn = document.getElementById('crmSessionTimerLunchBreak')
  const endBreakBtn = document.getElementById('crmSessionTimerEndBreak')
  const logBtn = document.getElementById('crmSessionTimerLog')

  if (actionBtn) actionBtn.addEventListener('click', crmTimerToggleShift)
  if (callBtn) callBtn.addEventListener('click', crmTimerToggleCall)
  if (meetingBtn) meetingBtn.addEventListener('click', crmTimerToggleMeeting)
  if (teaBreakBtn) teaBreakBtn.addEventListener('click', () => crmTimerStartBreak('Tea', 15))
  if (lunchBreakBtn) lunchBreakBtn.addEventListener('click', () => crmTimerStartBreak('Lunch', 45))
  if (endBreakBtn) endBreakBtn.addEventListener('click', crmTimerEndBreak)
  if (logBtn) logBtn.addEventListener('click', crmTimerOpenPanel)

  document.addEventListener('click', event => {
    if (!crmTimer) return
    const panel = document.getElementById('crmSessionTimerPanel')
    const isInsidePanel = panel && (panel.contains(event.target) || event.target === panel)
    const isTimerButton = ['crmSessionTimerAction', 'crmSessionTimerCall', 'crmSessionTimerMeeting', 'crmSessionTimerTeaBreak', 'crmSessionTimerLunchBreak', 'crmSessionTimerEndBreak', 'crmSessionTimerLog'].includes(event.target.id)
    if (!isInsidePanel && !isTimerButton) {
      if (panel) panel.style.display = 'none'
    }
  })

  document.addEventListener('keydown', crmTimerHandleActivity)
  document.addEventListener('click', crmTimerHandleActivity)
  document.addEventListener('mousemove', crmTimerHandleActivity)
  document.addEventListener('visibilitychange', crmTimerHandleVisibilityChange)
  window.addEventListener('beforeunload', saveCrmSessionTimerState)
}

function crmTimerInitialize() {
  crmTimer = loadCrmSessionTimerState()
  crmTimerUpdateUserFromSession()
  crmTimerInitializePanel()
  crmTimerInitializePopupContainers()
  crmTimerAttachEvents()

  const hasSession = !!localStorage.getItem('crm_session')
  if (hasSession && crmTimer.state === 'stopped' && !crmTimer.autoPaused) {
    crmTimerSetState('active')
    crmTimerShowToast('Shift started automatically on login.', 'success')
  }

  crmTimerUpdateUI()
  crmTimerStartLoop()
  crmTimerRenderPanel()
}

window.addEventListener('DOMContentLoaded', () => {
  crmTimerRenderPlaceholderAndInit()
})
