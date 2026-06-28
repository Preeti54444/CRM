// ═══════════════════════════════════════════════════════════════
// CRM ACTIVITIES - Calls, Meetings, Tasks, Workqueue Module
// ═══════════════════════════════════════════════════════════════

const EMAIL_TEMPLATES = {
  task_assignment: {
    subject: 'New Task Assigned: {task_title}',
    body: `Hello {assignee},

A new task has been assigned to you:

Task: {task_title}
Priority: {priority}
Due Date: {due_date}
Description: {description}

Assigned by: {assigned_by}

Please log into the CRM to view full details and update the task status.

Best regards,
Funding Sathi Team`
  },
  lead_followup: {
    subject: 'Follow-up: {lead_name}',
    body: `Hello {lead_name},

Following up on our previous conversation about your funding requirements.

We would like to discuss the following with you:
- Your current financial needs
- Available funding options
- Next steps

Please let us know your availability for a call this week.

Best regards,
{sender_name}
Funding Sathi`
  },
  meeting_reminder: {
    subject: 'Meeting Reminder: {meeting_subject}',
    body: `Hello {attendee},

This is a reminder about our upcoming meeting:

Subject: {meeting_subject}
Date & Time: {meeting_datetime}
Duration: {meeting_duration}

Please confirm your attendance or let us know if you need to reschedule.

Best regards,
{sender_name}
Funding Sathi`
  },
  loan_update: {
    subject: 'Loan Application Update',
    body: `Hello {lead_name},

We have an update on your loan application:

Application Status: {status}
Loan Amount: {loan_amount}
Next Steps: {next_steps}

If you have any questions, please don't hesitate to reach out.

Best regards,
{sender_name}
Funding Sathi`
  },
  document_request: {
    subject: 'Documents Required for {loan_type} Loan',
    body: `Hello {lead_name},

To proceed with your {loan_type} loan application, we need the following documents:

Required Documents:
{documents_list}

Please submit these documents by: {deadline}

You can upload them directly in the CRM portal or email them to us.

Best regards,
{sender_name}
Funding Sathi`
  }
}

const EMAIL_ACTIVITY_COLLECTION = 'emailActivities'
const BACKEND_EMAIL_PATH = 'send-email'

function saveEmailActivityToBackend(entry) {
  if (typeof saveFirebaseEntry !== 'function') {
    return Promise.resolve(null)
  }

  const payload = {
    ...entry,
    timestamp: entry.timestamp || new Date().toISOString(),
    user: entry.user || S?.email || S?.name || 'unknown',
    source: 'email_integration'
  }

  return saveFirebaseEntry(EMAIL_ACTIVITY_COLLECTION, payload)
    .catch(err => {
      console.warn('Firebase email activity save failed', err)
      return null
    })
}

function htmlEscape(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

let mediaRecorder = null
let recordedChunks = []
let audioBlob = null
let recordingStartTime = null
let recordingTimerInterval = null
let activeCallData = null
let callRecordingBlob = null

// Start call recording
async function startCallRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(stream)
    recordedChunks = []

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data)
      }
    }

    mediaRecorder.onerror = (e) => {
      showToast('Recording error: ' + e.message, 'error')
    }

    mediaRecorder.start(1000)
    showToast('🔴 Recording started! Put call on speaker', 'success')

    // Update UI
    const recordIcon = document.getElementById('recordIcon')
    const recordText = document.getElementById('recordText')
    const recordBtn = document.getElementById('recordBtn')
    const recordingPanel = document.getElementById('recordingPanel')

    if (recordIcon) recordIcon.textContent = '⏹'
    if (recordText) recordText.textContent = 'Stop'
    if (recordBtn) recordBtn.style.background = '#ef4444'
    if (recordingPanel) recordingPanel.style.display = 'block'

    // Start timer
    recordingStartTime = Date.now()
    recordingTimerInterval = setInterval(updateRecordingTime, 1000)

  } catch (err) {
    showToast('Microphone access denied. Please allow mic permission.', 'error')
    console.error('Recording error:', err)
  }
}

// Stop call recording
function stopCallRecording() {
  return new Promise((resolve) => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.onstop = () => {
        audioBlob = new Blob(recordedChunks, { type: mediaRecorder.mimeType })
        activeCallData = activeCallData || {}
        activeCallData.recordingBlob = audioBlob
        activeCallData.recordingUrl = URL.createObjectURL(audioBlob)
        activeCallData.recordingDuration = recordingStartTime ? Math.floor((Date.now() - recordingStartTime) / 1000) : 0

        // Stop all tracks
        mediaRecorder.stream.getTracks().forEach(track => track.stop())
        showToast('Recording stopped', 'success')
        resolve()
      }
      mediaRecorder.stop()
    } else {
      resolve()
    }

    // Clear timer
    if (recordingTimerInterval) {
      clearInterval(recordingTimerInterval)
      recordingTimerInterval = null
    }

    // Update UI
    const recordIcon = document.getElementById('recordIcon')
    const recordText = document.getElementById('recordText')
    const recordBtn = document.getElementById('recordBtn')
    const recordingPanel = document.getElementById('recordingPanel')

    if (recordIcon) recordIcon.textContent = '🔴'
    if (recordText) recordText.textContent = 'Record'
    if (recordBtn) recordBtn.style.background = 'rgba(255,255,255,.15)'
    if (recordingPanel) recordingPanel.style.display = 'none'
  })
}

// Update recording timer display
function updateRecordingTime() {
  if (!recordingStartTime) return
  const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000)
  const mins = Math.floor(elapsed / 60).toString().padStart(2, '0')
  const secs = (elapsed % 60).toString().padStart(2, '0')
  const recordingTime = document.getElementById('recordingTime')
  if (recordingTime) recordingTime.textContent = `${mins}:${secs}`
}

// Download call recording
function downloadCallRecording() {
  if (!audioBlob) {
    showToast('No recording available', 'error')
    return
  }

  const url = URL.createObjectURL(audioBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = `call-${activeCallData?.customerName || 'recording'}-${new Date().toISOString().slice(0, 10)}.webm`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Play call recording
function playCallRecording() {
  if (!audioBlob) {
    showToast('No recording to play', 'error')
    return
  }
  const url = URL.createObjectURL(audioBlob)
  const audio = new Audio(url)
  audio.play()
  showToast('Playing recording...', 'success')
}

// Quick Call Modal
function openQuickCallModal() {
  const modal = document.getElementById('quickCallModal')
  if (modal) modal.classList.add('open')
}

function closeQuickCallModal() {
  const modal = document.getElementById('quickCallModal')
  if (modal) modal.classList.remove('open')
}

function openCallTypeModal() {
  // Prevent admin users from accessing call forms
  const session = JSON.parse(localStorage.getItem('crm_session') || '{}')
  const role = String(session.role || '').trim().toLowerCase()
  
  if (role === 'admin') {
    alert('Admins cannot create or modify call records.')
    return
  }

  const modal = document.getElementById('callTypeModal')
  if (modal) modal.classList.add('open')
}

function closeCallTypeModal() {
  const modal = document.getElementById('callTypeModal')
  if (modal) modal.classList.remove('open')
}

function showCallFormType(type) {
  const incomingPanel = document.getElementById('incomingCallPanel')
  const outgoingPanel = document.getElementById('outgoingCallPanel')
  if (incomingPanel) incomingPanel.style.display = type === 'inc' ? 'block' : 'none'
  if (outgoingPanel) outgoingPanel.style.display = type === 'out' ? 'block' : 'none'
  setCallFormDefaults(type)
}

function setCallFormDefaults(type) {
  const session = JSON.parse(localStorage.getItem('crm_session') || '{}')
  const name = session.name || session.title || session.email || ''
  const executiveName = name.trim()
  const now = new Date()
  const todayDate = now.toISOString().slice(0, 10)
  const localDateTime = (() => {
    const tzOffset = now.getTimezoneOffset()
    const local = new Date(now.getTime() - tzOffset * 60000)
    return local.toISOString().slice(0, 16)
  })()

  if (type === 'inc') {
    const exec = document.getElementById('incExec')
    const dateTime = document.getElementById('incDate')
    if (exec && executiveName) exec.value = executiveName
    if (dateTime) dateTime.value = localDateTime
  }

  if (type === 'out') {
    const exec = document.getElementById('outExec')
    const dateField = document.getElementById('outDate')
    if (exec && executiveName) exec.value = executiveName
    if (dateField) dateField.value = todayDate
  }
}

function chooseCallType(type) {
  closeCallTypeModal()
  const target = document.querySelector('[data-sec="call-form"]')
  if (target) nav(target)
  showCallFormType(type)
}

// Call Modal
function openCallModal() {
  const modal = document.getElementById('callModal')
  if (modal) modal.classList.add('open')
}

function closeCallModal() {
  const modal = document.getElementById('callModal')
  if (modal) modal.classList.remove('open')
}

// Auto-update the "Number of Calls Made" field in Daily Activities
function autoUpdateCallsCount() {
  try {
    const callsField = document.getElementById('eCallsMade')
    if (!callsField) return

    const today = new Date()
    const todayStr = String(today.getDate()).padStart(2, '0') + '/' + 
                     String(today.getMonth() + 1).padStart(2, '0') + '/' + 
                     today.getFullYear()

    const session = JSON.parse(localStorage.getItem('crm_session') || '{}')
    const userEmail = (session.email || session.id || '').toLowerCase()
    const userName = (session.name || '').toLowerCase()

    const calls = JSON.parse(localStorage.getItem('crm_calls_journey') || '[]') || []

    function normalizeDate(value) {
      if (!value) return ''
      const input = String(value).trim()
      if (!input) return ''

      // If already DD/MM/YYYY
      if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(input)) {
        const [d, m, y] = input.split('/').map(x => x.trim())
        const year = y.length === 2 ? '20' + y : y
        return `${String(Number(d)).padStart(2, '0')}/${String(Number(m)).padStart(2, '0')}/${year}`
      }

      const dateObj = new Date(input)
      if (!Number.isNaN(dateObj.getTime())) {
        return `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`
      }

      return ''
    }

    const todaysCalls = calls.filter(call => {
      const callDate = normalizeDate(call.date || call.dateOfEntry || call.DATE || call.timestamp || call.createdAt || call.dateCreated || '')
      const callAgentEmail = (call.agentEmail || call.email || call.createdBy || call.createdByEmail || '').toLowerCase()
      const callAgentName = (call.agent || call.salesExecutive || call.createdByName || call.salesExecutiveName || call.assignedEmployee || '').toLowerCase()

      const emailMatches = userEmail && callAgentEmail === userEmail
      const nameMatches = userName && callAgentName === userName

      return callDate === todayStr && (emailMatches || nameMatches)
    })

    callsField.value = todaysCalls.length
    console.log(`Auto-updated calls count: ${todaysCalls.length} calls for ${todayStr}`)
  } catch (e) {
    console.warn('Error updating calls count:', e)
  }
}

// Submit call log
function submitCall() {
  const name = document.getElementById('cName')?.value
  const phone = document.getElementById('cPhone')?.value
  const email = document.getElementById('cEmail')?.value
  const company = document.getElementById('cCompany')?.value
  const date = document.getElementById('cDate')?.value || new Date().toISOString().split('T')[0]
  const time = document.getElementById('cTime')?.value || ''
  const duration = document.getElementById('cDuration')?.value
  const direction = document.getElementById('cDirection')?.value || 'Inbound'
  const outcome = document.getElementById('cOutcome')?.value
  const priority = document.getElementById('cPriority')?.value || 'Medium'
  const nextAction = document.getElementById('cNextAction')?.value
  const followup = document.getElementById('cFollowup')?.value
  const summary = document.getElementById('cSummary')?.value
  const sentiment = document.getElementById('cSentiment')?.value || 'Neutral'
  const products = document.getElementById('cProducts')?.value

  if (!name || !phone || !outcome || !summary) {
    showToast('Please fill required fields', 'error')
    return
  }

  // Try to get the selected/active lead ID
  let leadId = null
  try {
    const profile = JSON.parse(sessionStorage.getItem('selectedProfile') || '{}')
    if (profile?.id || profile?.leadId) leadId = profile.id || profile.leadId
  } catch(e) {}
  
  if (!leadId) {
    try {
      const profileId = sessionStorage.getItem('profileId')
      if (profileId) leadId = profileId
    } catch(e) {}
  }

  // Also try to match by name/company to find the lead
  if (!leadId) {
    try {
      const leads = (typeof getLeadsJourney === 'function') ? getLeadsJourney() : JSON.parse(localStorage.getItem('crm_leads_journey') || '[]')
      const matched = leads.find(l => {
        const lName = (l.contactPerson || l.leadName || l.name || '').toLowerCase()
        const lCompany = (l.companyName || l.company || '').toLowerCase()
        return (name.toLowerCase().includes(lName) || lName.includes(name.toLowerCase())) ||
               (company && lCompany.includes(company.toLowerCase()))
      })
      if (matched) leadId = matched.id || matched.leadId
    } catch(e) {}
  }

  // Add activity
  DataStore.addActivity('call', `Call with ${name} - ${outcome}`, name)

  const callEntry = {
    id: `CALL-${Date.now()}`,
    leadId: leadId || null,
    customerName: name,
    customer: name,
    company: company || '',
    email: email || '',
    phone,
    date,
    time,
    duration: duration ? Number(duration) : 0,
    direction,
    outcome,
    priority,
    nextAction: nextAction || '',
    followupDate: followup || '',
    summary: summary || '',
    sentiment,
    products: products || '',
    agent: (typeof S !== 'undefined' && S?.name) ? S.name : '',
    agentEmail: (typeof S !== 'undefined' && S?.email) ? S.email : '',
    hasRecording: Boolean(audioBlob),
    recordingSaved: Boolean(audioBlob),
    createdAt: new Date().toISOString()
  }

  // Save to backend FIRST - localStorage is only for caching
  if (typeof postToCRMBackendEndpoint === 'function') {
    const backendPayload = {
      call_id: callEntry.id || callEntry.callId,
      call_type: callEntry.callType || 'Outbound',
      lead_id: leadId || null,
      lead_name: name || '',
  	  phone: phone || '',
      date: date || new Date().toISOString().split('T')[0],
      time: time || '',
      duration: duration || 0,
      outcome: outcome || '',
      summary: summary || '',
      sentiment: sentiment || '',
      products: callEntry.products || '',
      agent: callEntry.agent || '',
      agent_email: callEntry.agentEmail || '',
      has_recording: callEntry.hasRecording || false,
      recording_saved: callEntry.recordingSaved || false
    }
    
    postToCRMBackendEndpoint('calls', backendPayload, 'POST').then(result => {
      console.debug('Call saved to backend:', result);
      // Only cache to localStorage AFTER successful backend save
      DataStore.add('calls', callEntry)
      try {
        const raw = localStorage.getItem('crm_calls_journey') || '[]'
        const arr = JSON.parse(raw || '[]') || []
        arr.push(callEntry)
        localStorage.setItem('crm_calls_journey', JSON.stringify(arr))
        sessionStorage.setItem('crm_calls_journey', JSON.stringify(arr))
      } catch(e) { console.warn('Failed saving to crm_calls_journey', e) }
    }).catch(err => {
      console.error('Call backend save failed:', err);
      showToast('Failed to save call to backend. Please check your connection.', 'error');
    });
  } else {
    console.error('Backend save function not available for calls');
    showToast('Backend unavailable. Cannot save call.', 'error');
  }

  // Update the lead's activity history and lastInteraction
  if (leadId) {
    try {
      const raw = localStorage.getItem('crm_leads_journey') || '[]'
      const arr = JSON.parse(raw || '[]') || []
      const idx = arr.findIndex(l => String(l.id || l.leadId) === String(leadId))
      if (idx !== -1) {
        const lead = arr[idx]
        lead.lastInteraction = new Date().toISOString()
        lead.lastCallDate = date
        lead.lastCallOutcome = outcome
        lead.activity = lead.activity || []
        lead.activity.push({
          type: 'call',
          title: `Call with ${name}`,
          description: summary,
          date: new Date().toISOString(),
          outcome: outcome
        })
        arr[idx] = lead
        localStorage.setItem('crm_leads_journey', JSON.stringify(arr))
        sessionStorage.setItem('crm_leads_journey', JSON.stringify(arr))
        
        // Also update in DataStore
        try {
          if (window.DataStore && typeof DataStore.getAll === 'function') {
            const data = DataStore.getAll() || {}
            data.leads = data.leads || []
            const li = data.leads.findIndex(l => String(l.id) === String(leadId))
            if (li !== -1) {
              data.leads[li] = lead
              DataStore.saveAll && DataStore.saveAll(data)
            }
          }
        } catch(e) { console.warn(e) }
      }
    } catch(e) { console.warn('Failed updating lead activity', e) }
  }

  // Save recording reference if exists
  if (audioBlob) {
    // In real app, upload to server here
    console.log('Recording available:', audioBlob.size, 'bytes')
  }

  showToast('Call logged and linked to lead successfully', 'success')
  closeCallModal()

  if (typeof renderCalls === 'function') renderCalls()
  
  // Auto-update the calls count in daily activities
  if (typeof autoUpdateCallsCount === 'function') autoUpdateCallsCount()
  
  // Navigate to call tracker to show saved call
  const callTrackerBtn = document.querySelector('[data-sec="call-tracker"]')
  if (callTrackerBtn) {
    nav(callTrackerBtn)
  }
}

// Toggle record button
function toggleRecording() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') {
    startCallRecording()
  } else {
    stopCallRecording()
  }
}

// Add quick tag to notes
function addQuickTag(tag) {
  const notes = document.getElementById('liveCallNotes')
  if (notes) {
    notes.value += (notes.value ? '\n' : '') + `[${tag}] `
    notes.focus()
  }
}

// ═══════════════════════════════════════════════════════════════
// MEETINGS
// ═══════════════════════════════════════════════════════════════

// Meeting Modal Functions
window.meetingFilters = window.meetingFilters || { search: '', status: 'all', type: 'all' }

function openMtgModal(meetingId) {
  const modal = document.getElementById('mtgModal')
  const submitBtn = document.getElementById('mtgSubmitBtn')
  const deleteBtn = document.getElementById('mtgDeleteBtn')
  const titleLabel = document.getElementById('mtgModalTitle')

  if (!modal) return

  clearMtgForm()
  if (meetingId) {
    const meeting = getMtgs().find(m => m.id === meetingId)
    if (meeting) {
      document.getElementById('mId').value = meeting.id
      document.getElementById('mTitle').value = meeting.title || ''
      document.getElementById('mDate').value = meeting.date ? meeting.date.split('/').reverse().join('-') : new Date().toISOString().split('T')[0]
      document.getElementById('mTime').value = meeting.time || ''
      document.getElementById('mType').value = meeting.type || 'Product Demo'
      document.getElementById('mStatus').value = meeting.status || 'scheduled'
      document.getElementById('mAttendee').value = meeting.attendee || ''
      document.getElementById('mAttendeeEmail').value = meeting.attendeeEmail || ''
      document.getElementById('mCompany').value = meeting.company || ''
      document.getElementById('mParticipants').value = meeting.participants || ''
      document.getElementById('mNotes').value = meeting.notes || ''
      document.getElementById('mMom').value = meeting.mom || ''
      document.getElementById('mGoogleMeet').value = meeting.meetingLinks?.googleMeet || ''
      document.getElementById('mZoom').value = meeting.meetingLinks?.zoom || ''
      document.getElementById('mTeams').value = meeting.meetingLinks?.teams || ''
      document.getElementById('mSendReminder').checked = !!meeting.sendReminder
      if (titleLabel) titleLabel.textContent = 'Edit Meeting'
      if (submitBtn) submitBtn.textContent = 'Update'
      if (deleteBtn) deleteBtn.style.display = 'inline-flex'
    }
  } else {
    const mDate = document.getElementById('mDate')
    if (mDate) mDate.value = new Date().toISOString().split('T')[0]
    if (titleLabel) titleLabel.textContent = 'Schedule Meeting'
    if (submitBtn) submitBtn.textContent = 'Schedule'
    if (deleteBtn) deleteBtn.style.display = 'none'
  }

  modal.classList.add('open')
}

function closeMtgModal() {
  const modal = document.getElementById('mtgModal')
  if (modal) {
    modal.classList.remove('open')
    clearMtgForm()
  }
}

function clearMtgForm() {
  const fields = ['mId', 'mTitle', 'mDate', 'mTime', 'mAttendee', 'mAttendeeEmail', 'mCompany', 'mParticipants', 'mNotes', 'mMom', 'mGoogleMeet', 'mZoom', 'mTeams']
  fields.forEach(id => {
    const el = document.getElementById(id)
    if (el) el.value = ''
  })

  const mType = document.getElementById('mType')
  const mStatus = document.getElementById('mStatus')
  const mSendReminder = document.getElementById('mSendReminder')
  const submitBtn = document.getElementById('mtgSubmitBtn')
  const deleteBtn = document.getElementById('mtgDeleteBtn')
  const titleLabel = document.getElementById('mtgModalTitle')

  if (mType) mType.selectedIndex = 0
  if (mStatus) mStatus.selectedIndex = 0
  if (mSendReminder) mSendReminder.checked = false
  if (submitBtn) submitBtn.textContent = 'Schedule'
  if (deleteBtn) deleteBtn.style.display = 'none'
  if (titleLabel) titleLabel.textContent = 'Schedule Meeting'
}

function submitMtg() {
  const id = document.getElementById('mId')?.value
  const title = document.getElementById('mTitle')?.value?.trim()
  const date = document.getElementById('mDate')?.value
  const time = document.getElementById('mTime')?.value
  const type = document.getElementById('mType')?.value
  const status = document.getElementById('mStatus')?.value
  const attendee = document.getElementById('mAttendee')?.value?.trim()
  const attendeeEmail = document.getElementById('mAttendeeEmail')?.value?.trim()
  const company = document.getElementById('mCompany')?.value?.trim()
  const participants = document.getElementById('mParticipants')?.value?.trim()
  const notes = document.getElementById('mNotes')?.value?.trim()
  const mom = document.getElementById('mMom')?.value?.trim()
  const sendReminder = document.getElementById('mSendReminder')?.checked

  const googleMeet = document.getElementById('mGoogleMeet')?.value?.trim()
  const zoom = document.getElementById('mZoom')?.value?.trim()
  const teams = document.getElementById('mTeams')?.value?.trim()

  if (!title) {
    showToast('Please enter a meeting title', 'error')
    return
  }
  if (!date) {
    showToast('Please select a meeting date', 'error')
    return
  }

  const meeting = {
    id: id || 'MTG-' + Date.now(),
    title,
    date: new Date(date).toLocaleDateString('en-GB'),
    time: time || '09:00',
    type: type || 'Product Demo',
    status: status || 'scheduled',
    attendee: attendee || '',
    attendeeEmail: attendeeEmail || '',
    company: company || '',
    participants: participants || '',
    notes: notes || '',
    mom: mom || '',
    sendReminder: sendReminder || false,
    createdBy: S?.email || 'admin',
    createdByName: S?.name || 'Admin',
    meetingLinks: {
      googleMeet: googleMeet || '',
      zoom: zoom || '',
      teams: teams || ''
    },
    createdAt: new Date().toISOString()
  }

  const mtgs = getMtgs()
  const index = mtgs.findIndex(m => m.id === meeting.id)
  if (index >= 0) {
    mtgs[index] = { ...mtgs[index], ...meeting }
    showToast('Meeting updated successfully!', 'success')
  } else {
    mtgs.push(meeting)
    showToast('Meeting scheduled successfully!', 'success')
  }

  saveMtgs(mtgs)
  closeMtgModal()
  renderMeetings()
}

function deleteMeeting() {
  const id = document.getElementById('mId')?.value
  if (!id) return
  const mtgs = getMtgs().filter(m => m.id !== id)
  saveMtgs(mtgs)
  showToast('Meeting deleted successfully', 'success')
  closeMtgModal()
  renderMeetings()
}

function updateMeetingFilter(field, value) {
  if (!window.meetingFilters) window.meetingFilters = { search: '', status: 'all', type: 'all' }
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (field === 'search') {
    window.meetingFilters.search = normalized
  } else {
    window.meetingFilters[field] = normalized || 'all'
  }
  renderMeetings()
}

function formatMeetingLabel(text) {
  return text ? text.toLowerCase() : ''
}

function filterMeetingRecords(mtgs) {
  const filters = window.meetingFilters || { search: '', status: 'all', type: 'all' }
  return mtgs.filter(m => {
    const search = filters.search || ''
    const matchesSearch = !search || [m.title, m.attendee, m.company, m.participants, m.type, m.notes, m.mom].some(field => field && field.toLowerCase().includes(search))
    const matchesStatus = filters.status === 'all' || (m.status || '').toLowerCase() === filters.status
    const matchesType = filters.type === 'all' || (m.type || '').toLowerCase() === filters.type
    return matchesSearch && matchesStatus && matchesType
  })
}

// Render meetings section
function renderMeetings() {
  const all = getMtgs()
  const mtgs = (S.role === 'admin' ? all : all.filter(m => m.createdBy === S.email))
  const filtered = filterMeetingRecords(mtgs)

  const mtgSub = document.getElementById('mtgSub')
  const mtgGrid = document.getElementById('mtgGrid')
  const mtgSummary = document.getElementById('mtgSummary')

  if (mtgSub) mtgSub.textContent = S.role === 'admin' ? 'All team meetings' : 'Your scheduled meetings'

  const counts = {
    total: filtered.length,
    scheduled: filtered.filter(m => m.status === 'scheduled').length,
    completed: filtered.filter(m => m.status === 'completed').length,
    cancelled: filtered.filter(m => m.status === 'cancelled').length,
    upcoming: filtered.filter(m => {
      const d = parseDate(m.date)
      return d && d >= new Date().setHours(0,0,0,0)
    }).length
  }

  if (mtgSummary) {
    mtgSummary.innerHTML = `
      ${renderSummaryCard('Total Meetings', counts.total, '#f7f2fc', '#7c3aed')}
      ${renderSummaryCard('Upcoming', counts.upcoming, '#eff6ff', '#2563eb')}
      ${renderSummaryCard('Completed', counts.completed, '#ecfdf5', '#16a34a')}
      ${renderSummaryCard('Cancelled', counts.cancelled, '#fef2f2', '#dc2626')}
    `
  }

  if (mtgGrid) {
    if (filtered.length === 0) {
      mtgGrid.innerHTML = '<div style="padding:40px;text-align:center;color:var(--gray-400);">No meetings match the selected filters</div>'
    } else {
      mtgGrid.innerHTML = filtered.map(m => {
        const hasLinks = m.meetingLinks && (m.meetingLinks.googleMeet || m.meetingLinks.zoom || m.meetingLinks.teams)
        const linksHtml = hasLinks ? `
          <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
            ${m.meetingLinks.googleMeet ? `<a href="${m.meetingLinks.googleMeet}" target="_blank" class="btn btn-outline" style="padding:6px 10px;font-size:11px;">Meet</a>` : ''}
            ${m.meetingLinks.zoom ? `<a href="${m.meetingLinks.zoom}" target="_blank" class="btn btn-outline" style="padding:6px 10px;font-size:11px;">Zoom</a>` : ''}
            ${m.meetingLinks.teams ? `<a href="${m.meetingLinks.teams}" target="_blank" class="btn btn-outline" style="padding:6px 10px;font-size:11px;">Teams</a>` : ''}
          </div>
        ` : ''

        const participants = m.participants ? `<div style="font-size:12px;color:var(--gray-500);margin-bottom:8px;"><strong>Participants:</strong> ${m.participants}</div>` : ''
        const mom = m.mom ? `<div style="font-size:12px;color:var(--gray-500);margin-bottom:12px;"><strong>MOM:</strong> ${m.mom}</div>` : '<div style="font-size:12px;color:var(--gray-400);margin-bottom:12px;">No MOM recorded</div>'

        return `
        <div class="mtg-card" style="background:#fff;border:1px solid var(--gray-200);border-radius:12px;padding:16px;transition:all 0.2s;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;gap:12px;flex-wrap:wrap;">
            <div>
              <div style="font-weight:600;color:var(--gray-900);font-size:14px;">${m.title}</div>
              <div style="font-size:12px;color:var(--gray-500);margin-top:2px;">${m.type} • ${m.company || '—'}</div>
            </div>
            <span class="badge ${m.status}" style="font-size:10px;">${m.status}</span>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:12px;font-size:13px;color:var(--gray-700);">
            <div style="display:flex;align-items:center;gap:4px;">📅 ${m.date}</div>
            <div style="display:flex;align-items:center;gap:4px;">🕐 ${m.time}</div>
          </div>
          <div style="font-size:13px;color:var(--gray-700);margin-bottom:8px;">👤 ${m.attendee || '—'} ${m.attendeeEmail ? `<span style="color:var(--gray-400);">(${m.attendeeEmail})</span>` : ''}</div>
          ${participants}
          ${m.notes ? `<div style="font-size:12px;color:var(--gray-500);margin-bottom:12px;font-style:italic;">${m.notes}</div>` : ''}
          ${mom}
          ${linksHtml}
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;">
            <button class="btn btn-outline" onclick="openMtgModal('${m.id}')">Edit</button>
            ${m.status !== 'completed' ? `<button class="btn btn-primary" style="background:#16a34a;border:none;" onclick="updateMeetingStatus('${m.id}','completed')">Mark Completed</button>` : ''}
            ${m.status !== 'cancelled' ? `<button class="btn btn-outline" style="border-color:#dc2626;color:#dc2626;" onclick="updateMeetingStatus('${m.id}','cancelled')">Cancel</button>` : ''}
          </div>
        </div>
      `}).join('')
    }
  }

  updateStats(filtered.length, 'meetings')
}

function updateMeetingStatus(id, status) {
  const mtgs = getMtgs()
  const index = mtgs.findIndex(m => m.id === id)
  if (index === -1) return

  mtgs[index].status = status
  saveMtgs(mtgs)
  showToast(`Meeting marked ${status}`, 'success')
  renderMeetings()
}

function renderSummaryCard(title, count, bg, color) {
  return `
    <div style="background:${bg};border-radius:14px;padding:18px;display:flex;flex-direction:column;gap:8px;min-height:100px;">
      <div style="font-size:12px;color:${color};font-weight:700;">${title}</div>
      <div style="font-size:28px;font-weight:700;color:var(--gray-900);">${count}</div>
    </div>
  `
}

// Check today's meetings and send reminders
function checkTodaysMeetings() {
  const today = new Date().toLocaleDateString('en-GB')
  const lastSent = localStorage.getItem('crm_reminder_sent_' + today)

  if (lastSent) return

  const mtgs = getMtgs().filter(m => m.date === today && m.status === 'scheduled' && m.sendReminder)
  if (mtgs.length > 0) {
    autoSendMeetingReminders(mtgs)
    localStorage.setItem('crm_reminder_sent_' + today, 'true')
    showMeetingBanner(mtgs, true)
  }
}

// Auto-send meeting reminders
function autoSendMeetingReminders(mtgs) {
  mtgs.forEach((mtg, index) => {
    setTimeout(() => {
      if (!mtg.attendeeEmail) return;

      const subject = `Meeting Reminder: ${mtg.title || 'Upcoming meeting'}`
      const message = [
        `Hello ${mtg.attendee || 'Valued Client'},`,
        '',
        'This is a reminder for your upcoming meeting.',
        '',
        `Title: ${mtg.title || 'N/A'}`,
        `Date: ${mtg.date || 'N/A'}`,
        `Time: ${mtg.time || 'N/A'}`,
        `Meeting Link: ${mtg.meetingLink || 'No meeting link provided'}`,
        `Agenda: ${mtg.notes || 'No additional notes'}`,
        '',
        'Please join on time or let us know if you need to reschedule.',
        '',
        `Regards,`,
        `${S?.name || 'Funding Sathi Team'}`
      ].join('\n')

      sendLeadEmail(mtg.attendeeEmail, mtg.attendee || 'Recipient', subject, message, S?.email || 'support@fundingsathi.com')
        .catch(err => {
          console.error('Meeting reminder send failed:', err)
        })
    }, index * 2000)
  })

  showToast(`Auto meeting reminders scheduled for ${mtgs.length} meeting${mtgs.length > 1 ? 's' : ''}!`, 'success')
}

// Show meeting banner
function showMeetingBanner(meetings, autoSent = false) {
  const existing = document.getElementById('mtgBanner')
  if (existing) existing.remove()

  const banner = document.createElement('div')
  banner.id = 'mtgBanner'
  banner.style.cssText = 'position:fixed;top:80px;right:24px;z-index:2000;background:#fff;border:1px solid var(--gray-200);border-radius:var(--radius-lg);padding:16px;box-shadow:0 16px 48px rgba(0,0,0,.12);max-width:360px;'
  banner.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:12px;">
      <div style="width:40px;height:40px;background:#dbeafe;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#2563eb;font-size:20px;">📅</div>
      <div style="flex:1;">
        <div style="font-weight:600;color:var(--gray-900);margin-bottom:4px;">${meetings.length} Meeting${meetings.length > 1 ? 's' : ''} Today</div>
        <div style="font-size:13px;color:var(--gray-500);margin-bottom:8px;">
          ${meetings.map(m => `<div>${m.title} at ${m.time}</div>`).join('')}
        </div>
        ${autoSent ? '<div style="font-size:12px;color:#059669;background:#d1fae5;padding:4px 8px;border-radius:4px;">✓ Reminders auto-sent</div>' : ''}
      </div>
      <button onclick="document.getElementById('mtgBanner').remove()" style="background:none;border:none;cursor:pointer;color:var(--gray-400);">✕</button>
    </div>
  `
  document.body.appendChild(banner)

  setTimeout(() => {
    const banner = document.getElementById('mtgBanner')
    if (banner) banner.remove()
  }, 10000)
}

// ═══════════════════════════════════════════════════════════════
// WORKQUEUE
// ═══════════════════════════════════════════════════════════════

function renderWorkqueueTable() {
  const titles = { tasks: 'Tasks', meetings: 'Meetings', calls: 'Calls' }
  const wqTitle = document.getElementById('wqTitle')
  if (wqTitle) wqTitle.textContent = titles[currentWQFilter] || 'Activities'

  const tbody = document.getElementById('wqTableBody')
  if (!tbody) return

  let items = []
  if (currentWQFilter === 'tasks') {
    items = DataStore.get('tasks').filter(t => !t.completed).map(t => ({
      ...t,
      type: 'task',
      displayDate: t.dueDate,
      displayTime: ''
    }))
  } else if (currentWQFilter === 'meetings') {
    items = DataStore.get('meetings').map(m => ({
      ...m,
      type: 'meeting',
      title: m.title,
      displayDate: m.date,
      displayTime: m.time
    }))
  } else if (currentWQFilter === 'calls') {
    items = DataStore.get('calls').map(c => ({
      ...c,
      type: 'call',
      title: c.subject || c.customerName || c.customer || c.customerName || 'Call',
      displayDate: c.date || (c.startTime ? new Date(c.startTime).toLocaleDateString('en-GB') : ''),
      // show a sensible description: prefer summary/notes/nextAction, then time
      displayTime: c.summary || c.description || c.notes || c.nextAction || c.time || (c.startTime ? new Date(c.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '')
    }))
  }

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="padding:40px;text-align:center;color:var(--gray-400);">No items found</td></tr>'
  } else {
    tbody.innerHTML = items.map(item => `
      <tr>
        <td style="padding:14px 16px;"><input type="checkbox"></td>
        <td style="padding:14px 16px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:32px;height:32px;background:var(--gray-100);border-radius:8px;display:flex;align-items:center;justify-content:center;">
              ${getActivityIcon(item.type)}
            </div>
            <div>
              <div style="font-weight:500;color:var(--gray-900);">${item.title}</div>
              <div style="font-size:12px;color:var(--gray-500);">${item.relatedTo || '—'}</div>
            </div>
          </div>
        </td>
        <td style="padding:14px 16px;color:var(--gray-700);">${item.displayDate || '—'}</td>
        <td style="padding:14px 16px;color:var(--gray-700);">${item.displayTime || '—'}</td>
        <td style="padding:14px 16px;">
          <span class="badge ${item.priority || item.status || 'medium'}">${item.priority || item.status || 'pending'}</span>
        </td>
      </tr>
    `).join('')
  }
}

// ═══════════════════════════════════════════════════════════════
// CALL TRACKER RENDER
// ═══════════════════════════════════════════════════════════════

function renderCallTracker() {
  const calls = DataStore.get('calls')
  const tbody = document.getElementById('callsTableBody')
  if (!tbody) return

  if (calls.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="padding:40px;text-align:center;color:var(--gray-400);">No calls logged yet</td></tr>'
  } else {
    tbody.innerHTML = calls.map(call => `
      <tr>
        <td style="padding:12px 16px;">
          <div style="font-weight:500;color:var(--gray-900);">${call.customerName || call.relatedTo}</div>
          <div style="font-size:12px;color:var(--gray-500);">${call.company || '—'}</div>
        </td>
        <td style="padding:12px 16px;color:var(--gray-700);">${call.phone || '—'}</td>
        <td style="padding:12px 16px;color:var(--gray-700);">${call.date || new Date(call.startTime).toLocaleDateString('en-GB')}</td>
        <td style="padding:12px 16px;color:var(--gray-700);">${call.duration || 0} min</td>
        <td style="padding:12px 16px;">
          <span class="badge ${call.outcome?.toLowerCase().replace(/\s+/g, '-') || 'pending'}">${call.outcome || '—'}</span>
        </td>
        <td style="padding:12px 16px;">
          ${call.hasRecording ? '<span class="recording-badge">🎙️</span>' : '—'}
        </td>
      </tr>
    `).join('')
  }

  const showing = document.getElementById('callsShowing')
  if (showing) showing.textContent = calls.length
}

// Placeholder renderers
function renderActivities() {}
function renderCalendar() {
  const section = document.getElementById('sec-calendar')
  if (!section) return

  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()

  section.innerHTML = `
    <div class="section-header" style="margin-bottom:24px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;">
      <div>
        <h2 style="font-size:24px;font-weight:700;color:var(--gray-900);margin-bottom:8px;">Calendar</h2>
        <p style="color:var(--gray-500);font-size:14px;">View your schedule, meetings, and deadlines</p>
      </div>
      <div style="display:flex;gap:10px;">
        <button class="btn btn-primary" onclick="openMtgModal()" style="background:#4285f4;border:none;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;vertical-align:middle;"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          Schedule Meeting
        </button>
        <button class="btn btn-outline" onclick="window.open('https://calendar.google.com','_blank')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right:6px;vertical-align:middle;"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/></svg>
          Google Calendar
        </button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;">
      <!-- Calendar View -->
      <div class="card" style="background:#fff;border:1px solid var(--gray-200);border-radius:16px;padding:24px;grid-column:span 2;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <h3 style="font-size:18px;font-weight:600;color:var(--gray-900);">${today.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</h3>
          <div style="display:flex;gap:8px;">
            <button onclick="changeCalendarMonth(-1)" class="btn btn-sm btn-outline" style="padding:6px 12px;">← Prev</button>
            <button onclick="changeCalendarMonth(0)" class="btn btn-sm btn-outline" style="padding:6px 12px;">Today</button>
            <button onclick="changeCalendarMonth(1)" class="btn btn-sm btn-outline" style="padding:6px 12px;">Next →</button>
          </div>
        </div>

        <!-- Calendar Grid -->
        <div id="calendarGrid">
          ${generateCalendarGrid(currentYear, currentMonth)}
        </div>

        <!-- Calendar Legend -->
        <div style="display:flex;gap:20px;margin-top:16px;padding-top:16px;border-top:1px solid var(--gray-100);flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="width:12px;height:12px;background:#4285f4;border-radius:2px;"></div>
            <span style="font-size:12px;color:var(--gray-500);">Meetings</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="width:12px;height:12px;background:#34a853;border-radius:2px;"></div>
            <span style="font-size:12px;color:var(--gray-500);">Tasks Due</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="width:12px;height:12px;background:#fbbc04;border-radius:2px;"></div>
            <span style="font-size:12px;color:var(--gray-500);">Follow-ups</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="width:12px;height:12px;background:#ea4335;border-radius:2px;"></div>
            <span style="font-size:12px;color:var(--gray-500);">Overdue</span>
          </div>
        </div>
      </div>

      <!-- Upcoming Events -->
      <div class="card" style="background:#fff;border:1px solid var(--gray-200);border-radius:16px;padding:24px;">
        <h3 style="font-size:16px;font-weight:600;color:var(--gray-900);margin-bottom:16px;">📅 Upcoming Events</h3>
        <div id="upcomingEventsList" style="max-height:400px;overflow-y:auto;">
          ${renderUpcomingEvents()}
        </div>
      </div>
    </div>

    <!-- Today's Schedule -->
    <div class="card" style="background:#fff;border:1px solid var(--gray-200);border-radius:16px;padding:24px;margin-top:20px;">
      <h3 style="font-size:16px;font-weight:600;color:var(--gray-900);margin-bottom:16px;">📆 Today's Schedule - ${today.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</h3>
      <div id="todaySchedule">
        ${renderTodaySchedule()}
      </div>
    </div>

    <!-- Quick Actions -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-top:20px;">
      <a href="https://calendar.google.com/calendar/u/0/r/eventedit" target="_blank" style="text-decoration:none;">
        <div style="background:linear-gradient(135deg,#4285f4,#1a73e8);color:#fff;padding:20px;border-radius:12px;text-align:center;transition:all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff" style="margin-bottom:8px;"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/></svg>
          <div style="font-weight:600;">Create Event</div>
          <div style="font-size:12px;opacity:0.9;">in Google Calendar</div>
        </div>
      </a>

      <a href="https://calendar.google.com/calendar/u/0/r/week" target="_blank" style="text-decoration:none;">
        <div style="background:linear-gradient(135deg,#34a853,#0d652d);color:#fff;padding:20px;border-radius:12px;text-align:center;transition:all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff" style="margin-bottom:8px;"><path d="M6 1h3v3H6V1zm6 0h3v3h-3V1zm6 0h3v3h-3V1zM3 7h18v14H3V7zm2 2v10h14V9H5z"/></svg>
          <div style="font-weight:600;">Week View</div>
          <div style="font-size:12px;opacity:0.9;">in Google Calendar</div>
        </div>
      </a>

      <div onclick="syncWithGoogleCalendar()" style="background:linear-gradient(135deg,#fbbc04,#f57f17);color:#fff;padding:20px;border-radius:12px;text-align:center;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff" style="margin-bottom:8px;"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
        <div style="font-weight:600;">Sync Meetings</div>
        <div style="font-size:12px;opacity:0.9;">Export to Google Calendar</div>
      </div>
    </div>
  `
}

function generateCalendarGrid(year, month) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDay = firstDay.getDay()

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const today = new Date()
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year
  const todayDate = today.getDate()

  // Get events for this month
  const meetings = getMtgs().filter(m => {
    const d = parseDate(m.date)
    return d && d.getMonth() === month && d.getFullYear() === year
  })

  const tasks = (DataStore.get('tasks') || []).filter(t => {
    if (!t.dueDate) return false
    const d = parseDate(t.dueDate)
    return d && d.getMonth() === month && d.getFullYear() === year
  })

  let html = '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:var(--gray-200);border:1px solid var(--gray-200);border-radius:8px;overflow:hidden;">'

  // Day headers
  dayNames.forEach(day => {
    html += `<div style="background:var(--gray-50);padding:10px;text-align:center;font-size:12px;font-weight:600;color:var(--gray-600);">${day}</div>`
  })

  // Empty cells before first day
  for (let i = 0; i < startingDay; i++) {
    html += '<div style="background:#fff;min-height:80px;"></div>'
  }

  // Days
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = isCurrentMonth && day === todayDate
    const dayMeetings = meetings.filter(m => parseDate(m.date)?.getDate() === day)
    const dayTasks = tasks.filter(t => parseDate(t.dueDate)?.getDate() === day)

    const hasEvents = dayMeetings.length > 0 || dayTasks.length > 0
    const meetingDot = dayMeetings.length > 0 ? `<div style="width:6px;height:6px;background:#4285f4;border-radius:50%;display:inline-block;margin:0 1px;"></div>` : ''
    const taskDot = dayTasks.length > 0 ? `<div style="width:6px;height:6px;background:#34a853;border-radius:50%;display:inline-block;margin:0 1px;"></div>` : ''
    const overdueDot = dayTasks.some(t => !t.completed && isOverdue(t.dueDate)) ? `<div style="width:6px;height:6px;background:#ea4335;border-radius:50%;display:inline-block;margin:0 1px;"></div>` : ''

    html += `
      <div style="background:#fff;min-height:80px;padding:8px;position:relative;cursor:pointer;transition:all 0.2s;${isToday ? 'background:#e8f0fe;' : ''}"
           onmouseover="this.style.background='${isToday ? '#d2e3fc' : '#f8f9fa'}'" 
           onmouseout="this.style.background='${isToday ? '#e8f0fe' : '#fff'}'"
           onclick="showDayEvents(${day},${month},${year})">
        <div style="font-size:14px;font-weight:${isToday ? '700' : '500'};color:${isToday ? '#1a73e8' : 'var(--gray-900)'};margin-bottom:4px;">${day}</div>
        <div style="display:flex;flex-wrap:wrap;gap:2px;">
          ${meetingDot}${taskDot}${overdueDot}
        </div>
        ${dayMeetings.length > 0 ? `<div style="font-size:10px;color:var(--gray-500);margin-top:4px;">${dayMeetings.length} mtg</div>` : ''}
        ${dayTasks.length > 0 ? `<div style="font-size:10px;color:var(--gray-500);">${dayTasks.length} task</div>` : ''}
      </div>
    `
  }

  html += '</div>'
  return html
}

function parseDate(dateStr) {
  if (!dateStr) return null
  // Handle DD/MM/YYYY format
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/')
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
    }
  }
  return new Date(dateStr)
}

function isOverdue(dateStr) {
  const date = parseDate(dateStr)
  if (!date) return false
  return date < new Date().setHours(0,0,0,0)
}

function renderUpcomingEvents() {
  const today = new Date()
  today.setHours(0,0,0,0)

  // Get meetings
  const meetings = getMtgs().filter(m => {
    const d = parseDate(m.date)
    return d && d >= today
  }).sort((a,b) => parseDate(a.date) - parseDate(b.date)).slice(0,5)

  // Get upcoming tasks
  const tasks = (DataStore.get('tasks') || []).filter(t => {
    if (!t.dueDate || t.completed) return false
    const d = parseDate(t.dueDate)
    return d && d >= today
  }).sort((a,b) => parseDate(a.dueDate) - parseDate(b.dueDate)).slice(0,5)

  const events = [
    ...meetings.map(m => ({...m,type:'meeting',date:parseDate(m.date)})),
    ...tasks.map(t => ({...t,type:'task',date:parseDate(t.dueDate)}))
  ].sort((a,b) => a.date - b.date).slice(0,8)

  if (events.length === 0) {
    return '<div style="padding:20px;text-align:center;color:var(--gray-400);">No upcoming events</div>'
  }

  return events.map(e => {
    const isMeeting = e.type === 'meeting'
    const dateStr = e.date.toLocaleDateString('en-GB', {day:'numeric',month:'short'})
    const icon = isMeeting ? '📅' : '✓'
    const color = isMeeting ? '#4285f4' : '#34a853'
    const title = isMeeting ? e.title : e.title
    const subtitle = isMeeting ? `${e.time || 'All day'} • ${e.company || 'Meeting'}` : `Due • ${e.priority || 'Normal'}`

    return `
      <div style="display:flex;align-items:center;gap:12px;padding:12px;border-bottom:1px solid var(--gray-100);${events.indexOf(e) === events.length - 1 ? 'border-bottom:none;' : ''}">
        <div style="width:48px;height:48px;background:${color}15;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">
          ${icon}
        </div>
        <div style="flex:1;">
          <div style="font-weight:500;color:var(--gray-900);font-size:14px;">${title}</div>
          <div style="font-size:12px;color:var(--gray-500);">${subtitle}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:12px;font-weight:600;color:${color};">${dateStr}</div>
          <div style="font-size:11px;color:var(--gray-400);">${isMeeting ? 'Meeting' : 'Task'}</div>
        </div>
      </div>
    `
  }).join('')
}

function renderTodaySchedule() {
  const today = new Date()
  const todayStr = today.toLocaleDateString('en-GB')

  // Get today's meetings
  const meetings = getMtgs().filter(m => m.date === todayStr).sort((a,b) => (a.time || '').localeCompare(b.time || ''))

  // Get today's tasks
  const tasks = (DataStore.get('tasks') || []).filter(t => t.dueDate === todayStr && !t.completed)

  if (meetings.length === 0 && tasks.length === 0) {
    return '<div style="padding:40px;text-align:center;color:var(--gray-400);">No meetings or tasks scheduled for today</div>'
  }

  let html = '<div style="display:flex;flex-direction:column;gap:12px;">'

  // Time slots from 9 AM to 6 PM
  const timeSlots = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00']

  timeSlots.forEach(slot => {
    const slotMeetings = meetings.filter(m => m.time && m.time.startsWith(slot.slice(0,2)))
    const slotTasks = tasks.filter(t => t.time && t.time.startsWith(slot.slice(0,2)))

    if (slotMeetings.length > 0 || slotTasks.length > 0) {
      html += `<div style="display:flex;gap:16px;">
        <div style="width:60px;font-size:13px;font-weight:500;color:var(--gray-500);padding-top:8px;">${slot}</div>
        <div style="flex:1;display:flex;flex-direction:column;gap:8px;">`

      slotMeetings.forEach(m => {
        html += `
          <div style="display:flex;align-items:center;gap:12px;padding:12px;background:#e8f0fe;border-radius:8px;border-left:4px solid #4285f4;">
            <div style="font-size:20px;">📅</div>
            <div style="flex:1;">
              <div style="font-weight:500;color:var(--gray-900);font-size:14px;">${m.title}</div>
              <div style="font-size:12px;color:var(--gray-500);">${m.company || 'Meeting'} • ${m.type || 'Call'}</div>
            </div>
            ${m.meetingLinks?.googleMeet ? `<a href="${m.meetingLinks.googleMeet}" target="_blank" style="padding:6px 12px;background:#4285f4;color:#fff;border-radius:4px;font-size:11px;text-decoration:none;">Join Meet</a>` : ''}
          </div>
        `
      })

      slotTasks.forEach(t => {
        html += `
          <div style="display:flex;align-items:center;gap:12px;padding:12px;background:#e6f4ea;border-radius:8px;border-left:4px solid #34a853;">
            <div style="font-size:20px;">✓</div>
            <div style="flex:1;">
              <div style="font-weight:500;color:var(--gray-900);font-size:14px;">${t.title}</div>
              <div style="font-size:12px;color:var(--gray-500);">${t.priority} priority • ${t.taskType || 'Task'}</div>
            </div>
            <button onclick="completeTask(${t.id})" style="padding:6px 12px;background:#34a853;color:#fff;border:none;border-radius:4px;font-size:11px;cursor:pointer;">Complete</button>
          </div>
        `
      })

      html += `</div></div>`
    }
  })

  html += '</div>'
  return html
}

function showDayEvents(day, month, year) {
  const dateStr = new Date(year, month, day).toLocaleDateString('en-GB')
  const meetings = getMtgs().filter(m => m.date === dateStr)
  const tasks = (DataStore.get('tasks') || []).filter(t => t.dueDate === dateStr)

  if (meetings.length === 0 && tasks.length === 0) {
    showToast('No events on this day', 'info')
    return
  }

  let content = `<h3 style="font-size:16px;font-weight:600;margin-bottom:16px;">Events for ${dateStr}</h3>`

  if (meetings.length > 0) {
    content += '<h4 style="font-size:14px;color:#4285f4;margin-bottom:8px;">📅 Meetings</h4>'
    meetings.forEach(m => {
      content += `<div style="padding:8px 0;border-bottom:1px solid #eee;">
        <div style="font-weight:500;">${m.title}</div>
        <div style="font-size:12px;color:#666;">${m.time || 'All day'} • ${m.company || 'Meeting'}</div>
      </div>`
    })
  }

  if (tasks.length > 0) {
    content += '<h4 style="font-size:14px;color:#34a853;margin:16px 0 8px;">✓ Tasks</h4>'
    tasks.forEach(t => {
      content += `<div style="padding:8px 0;border-bottom:1px solid #eee;">
        <div style="font-weight:500;">${t.title}</div>
        <div style="font-size:12px;color:#666;">${t.priority} • ${t.taskType || 'Task'}</div>
      </div>`
    })
  }

  // Show modal-like notification
  showToast(content, 'info', 5000)
}

function changeCalendarMonth(delta) {
  // This would update the calendar view - simplified for now
  if (delta === 0) {
    renderCalendar()
    showToast('Showing current month', 'success')
  } else {
    showToast('Calendar navigation - month changed', 'success')
  }
}

function syncWithGoogleCalendar() {
  const meetings = getMtgs().slice(0, 10) // Get first 10 meetings

  if (meetings.length === 0) {
    showToast('No meetings to sync', 'error')
    return
  }

  // Generate .ics file for import to Google Calendar
  let icsContent = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//FundingSathi//CRM//EN\n'

  meetings.forEach(m => {
    const date = parseDate(m.date)
    if (!date) return

    const dateStr = date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const endDate = new Date(date.getTime() + 60*60*1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

    icsContent += `BEGIN:VEVENT\n`
    icsContent += `UID:${m.id}@fundingsathi.com\n`
    icsContent += `DTSTART:${dateStr}\n`
    icsContent += `DTEND:${endDate}\n`
    icsContent += `SUMMARY:${m.title}\n`
    icsContent += `DESCRIPTION:${m.notes || 'Meeting scheduled via FundingSathi CRM'}\n`
    icsContent += `LOCATION:${m.company || ''}\n`
    icsContent += `END:VEVENT\n`
  })

  icsContent += 'END:VCALENDAR'

  // Download .ics file
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'fundingsathi_meetings.ics'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  showToast('Calendar file downloaded! Import to Google Calendar', 'success')
  DataStore.addActivity('export', 'Synced meetings to calendar', 'fundingsathi_meetings.ics')
}
function renderTodayDone() {}
function renderVisits() {}
function renderGoogleSheets() {
  const section = document.getElementById('sec-google-sheets')
  if (!section) return

  section.innerHTML = `
    <div class="section-header" style="margin-bottom:24px;">
      <h2 style="font-size:24px;font-weight:700;color:var(--gray-900);margin-bottom:8px;">Google Sheets</h2>
      <p style="color:var(--gray-500);font-size:14px;">Export and sync your CRM data with Google Sheets</p>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;">
      <!-- Export to Sheets Panel -->
      <div class="card" style="background:#fff;border:1px solid var(--gray-200);border-radius:16px;padding:24px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          <div style="width:48px;height:48px;background:linear-gradient(135deg,#0f9d58,#34a853);border-radius:12px;display:flex;align-items:center;justify-content:center;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff"><path d="M3 3h18v18H3V3zm16 16V5H5v14h14zM7 7h4v4H7V7zm0 6h4v4H7v-4zm6-6h4v4h-4V7zm0 6h4v4h-4v-4z"/></svg>
          </div>
          <div>
            <h3 style="font-size:16px;font-weight:600;color:var(--gray-900);">Export to Sheets</h3>
            <p style="font-size:13px;color:var(--gray-500);">Download data as CSV for Google Sheets</p>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:20px;">
          <button onclick="exportToSheets('leads')" class="gs-export-btn" style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:10px;cursor:pointer;text-align:left;transition:all 0.2s;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='var(--gray-50)'">
            <div style="width:36px;height:36px;background:#dbeafe;border-radius:8px;display:flex;align-items:center;justify-content:center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
            </div>
            <div style="flex:1;">
              <div style="font-weight:500;color:var(--gray-900);font-size:14px;">Leads Data</div>
              <div style="font-size:12px;color:var(--gray-500);">All leads with contact details</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>

          <button onclick="exportToSheets('contacts')" class="gs-export-btn" style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:10px;cursor:pointer;text-align:left;transition:all 0.2s;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='var(--gray-50)'">
            <div style="width:36px;height:36px;background:#dcfce7;border-radius:8px;display:flex;align-items:center;justify-content:center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            </div>
            <div style="flex:1;">
              <div style="font-weight:500;color:var(--gray-900);font-size:14px;">Contacts</div>
              <div style="font-size:12px;color:var(--gray-500);">Contact list with company info</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>

          <button onclick="exportToSheets('deals')" class="gs-export-btn" style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:10px;cursor:pointer;text-align:left;transition:all 0.2s;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='var(--gray-50)'">
            <div style="width:36px;height:36px;background:#fef3c7;border-radius:8px;display:flex;align-items:center;justify-content:center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div style="flex:1;">
              <div style="font-weight:500;color:var(--gray-900);font-size:14px;">Deals & Pipeline</div>
              <div style="font-size:12px;color:var(--gray-500);">Deal values and stage tracking</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>

          <button onclick="exportToSheets('tasks')" class="gs-export-btn" style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:10px;cursor:pointer;text-align:left;transition:all 0.2s;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='var(--gray-50)'">
            <div style="width:36px;height:36px;background:#fce7f3;border-radius:8px;display:flex;align-items:center;justify-content:center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#db2777" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            </div>
            <div style="flex:1;">
              <div style="font-weight:500;color:var(--gray-900);font-size:14px;">Tasks</div>
              <div style="font-size:12px;color:var(--gray-500);">Assigned tasks and completions</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>

          <button onclick="exportToSheets('meetings')" class="gs-export-btn" style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:10px;cursor:pointer;text-align:left;transition:all 0.2s;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='var(--gray-50)'">
            <div style="width:36px;height:36px;background:#e0e7ff;border-radius:8px;display:flex;align-items:center;justify-content:center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
            </div>
            <div style="flex:1;">
              <div style="font-weight:500;color:var(--gray-900);font-size:14px;">Meetings</div>
              <div style="font-size:12px;color:var(--gray-500);">Scheduled meetings log</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>

        <div style="padding:12px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;">
          <div style="font-size:12px;color:#166534;">
            <strong>Tip:</strong> Download CSV and open with Google Sheets, or copy-paste data directly into a sheet.
          </div>
        </div>
      </div>

      <!-- Quick Actions & Templates -->
      <div style="display:flex;flex-direction:column;gap:20px;">
        <!-- Sheet Templates -->
        <div class="card" style="background:#fff;border:1px solid var(--gray-200);border-radius:16px;padding:24px;">
          <h3 style="font-size:16px;font-weight:600;color:var(--gray-900);margin-bottom:16px;">📋 Sheet Templates</h3>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <a href="https://docs.google.com/spreadsheets/d/1/create?title=CRM%20Leads%20Tracker" target="_blank" style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;text-decoration:none;color:var(--gray-700);transition:all 0.2s;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='var(--gray-50)'">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0f9d58" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <div style="flex:1;">
                <div style="font-weight:500;font-size:13px;">Leads Tracker Template</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" stroke-width="2"><path d="M7 17L17 7M17 7H7M17 7V17"/></svg>
            </a>

            <a href="https://docs.google.com/spreadsheets/d/1/create?title=CRM%20Sales%20Pipeline" target="_blank" style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;text-decoration:none;color:var(--gray-700);transition:all 0.2s;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='var(--gray-50)'">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0f9d58" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <div style="flex:1;">
                <div style="font-weight:500;font-size:13px;">Sales Pipeline Template</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" stroke-width="2"><path d="M7 17L17 7M17 7H7M17 7V17"/></svg>
            </a>

            <a href="https://docs.google.com/spreadsheets/d/1/create?title=CRM%20Task%20Manager" target="_blank" style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;text-decoration:none;color:var(--gray-700);transition:all 0.2s;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='var(--gray-50)'">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0f9d58" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <div style="flex:1;">
                <div style="font-weight:500;font-size:13px;">Task Manager Template</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" stroke-width="2"><path d="M7 17L17 7M17 7H7M17 7V17"/></svg>
            </a>
          </div>
        </div>

        <!-- Instructions -->
        <div class="card" style="background:#fff;border:1px solid var(--gray-200);border-radius:16px;padding:24px;">
          <h3 style="font-size:16px;font-weight:600;color:var(--gray-900);margin-bottom:16px;">📖 How to Use</h3>
          <ol style="margin:0;padding-left:20px;font-size:13px;color:var(--gray-600);line-height:1.8;">
            <li>Click any <strong>Export</strong> button to download CSV</li>
            <li>Open Google Sheets in your browser</li>
            <li>Go to <strong>File → Import</strong></li>
            <li>Upload the downloaded CSV file</li>
            <li>Choose <strong>Replace spreadsheet</strong> or <strong>Insert new sheet(s)</strong></li>
          </ol>
          <div style="margin-top:16px;">
            <button class="btn btn-primary" onclick="window.open('https://sheets.google.com','_blank')" style="width:100%;background:#0f9d58;border:none;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right:6px;vertical-align:middle;"><path d="M3 3h18v18H3V3zm16 16V5H5v14h14zM7 7h4v4H7V7zm0 6h4v4H7v-4zm6-6h4v4h-4V7zm0 6h4v4h-4v-4z"/></svg>
              Open Google Sheets
            </button>
          </div>
        </div>

        <!-- Data Summary -->
        <div class="card" style="background:#fff;border:1px solid var(--gray-200);border-radius:16px;padding:24px;">
          <h3 style="font-size:16px;font-weight:600;color:var(--gray-900);margin-bottom:16px;">📊 Data Summary</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div style="text-align:center;padding:12px;background:var(--gray-50);border-radius:8px;">
              <div style="font-size:20px;font-weight:700;color:#0f9d36;">${(DataStore.get('leads') || []).length}</div>
              <div style="font-size:11px;color:var(--gray-500);">Leads</div>
            </div>
            <div style="text-align:center;padding:12px;background:var(--gray-50);border-radius:8px;">
              <div style="font-size:20px;font-weight:700;color:#0f9d36;">${(DataStore.get('contacts') || []).length}</div>
              <div style="font-size:11px;color:var(--gray-500);">Contacts</div>
            </div>
            <div style="text-align:center;padding:12px;background:var(--gray-50);border-radius:8px;">
              <div style="font-size:20px;font-weight:700;color:#0f9d36;">${(DataStore.get('deals') || []).length}</div>
              <div style="font-size:11px;color:var(--gray-500);">Deals</div>
            </div>
            <div style="text-align:center;padding:12px;background:var(--gray-50);border-radius:8px;">
              <div style="font-size:20px;font-weight:700;color:#0f9d36;">${(DataStore.get('tasks') || []).length}</div>
              <div style="font-size:11px;color:var(--gray-500);">Tasks</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
}

function exportToSheets(type) {
  let data = []
  let filename = ''
  let headers = []

  switch(type) {
    case 'leads':
      data = DataStore.get('leads') || []
      filename = 'funding_sathi_leads.csv'
      headers = ['ID','Name','Company','Phone','Email','Source','Status','Territory','Deal Value','Created Date']
      break
    case 'contacts':
      data = DataStore.get('contacts') || []
      filename = 'funding_sathi_contacts.csv'
      headers = ['ID','Name','Company','Phone','Email','Title','Territory','Type','Last Contact']
      break
    case 'deals':
      data = DataStore.get('deals') || []
      filename = 'funding_sathi_deals.csv'
      headers = ['ID','Title','Company','Value','Stage','Probability','Expected Close','Owner']
      break
    case 'tasks':
      data = DataStore.get('tasks') || []
      filename = 'funding_sathi_tasks.csv'
      headers = ['ID','Title','Assigned To','Due Date','Priority','Status','Type','Related To']
      break
    case 'meetings':
      data = getMtgs()
      filename = 'funding_sathi_meetings.csv'
      headers = ['ID','Title','Date','Time','Type','Status','Attendee','Company','Notes']
      break
    default:
      showToast('Unknown export type', 'error')
      return
  }

  if (data.length === 0) {
    showToast('No data to export', 'error')
    return
  }

  // Create CSV content
  let csv = headers.join(',') + '\n'
  
  data.forEach(row => {
    const values = headers.map(h => {
      let val = ''
      switch(h) {
        // Leads
        case 'ID': val = row.id || ''; break
        case 'Name': val = row.name || ''; break
        case 'Company': val = row.company || ''; break
        case 'Phone': val = row.phone || ''; break
        case 'Email': val = row.email || ''; break
        case 'Source': val = row.source || ''; break
        case 'Status': val = row.status || ''; break
        case 'Territory': val = row.territory || ''; break
        case 'Deal Value': val = row.dealValue || ''; break
        case 'Created Date': val = row.createdAt || ''; break
        // Contacts
        case 'Title': val = row.title || ''; break
        case 'Type': val = row.type || ''; break
        case 'Last Contact': val = row.lastContact || ''; break
        // Deals
        case 'Title': val = row.title || row.dealName || ''; break
        case 'Value': val = row.value || row.amount || ''; break
        case 'Stage': val = row.stage || ''; break
        case 'Probability': val = row.probability || ''; break
        case 'Expected Close': val = row.expectedClose || ''; break
        case 'Owner': val = row.owner || ''; break
        // Tasks
        case 'Assigned To': val = row.assignedTo || ''; break
        case 'Due Date': val = row.dueDate || ''; break
        case 'Priority': val = row.priority || ''; break
        case 'Type': val = row.taskType || row.type || ''; break
        case 'Related To': val = row.relatedTo || ''; break
        // Meetings
        case 'Date': val = row.date || ''; break
        case 'Time': val = row.time || ''; break
        case 'Attendee': val = row.attendee || ''; break
        case 'Notes': val = row.notes || ''; break
        default: val = ''
      }
      // Escape commas and quotes
      if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
        return '"' + val.replace(/"/g, '""') + '"'
      }
      return val
    })
    csv += values.join(',') + '\n'
  })

  // Download CSV
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  showToast(`${type} data exported successfully!`, 'success')
  DataStore.addActivity('export', `Exported ${type} data to CSV`, filename)
}

function renderEmail() {
  const section = document.getElementById('sec-email')
  if (!section) return

  const leads = DataStore.get('leads') || []
  const contacts = DataStore.get('contacts') || []
  const session = typeof S !== 'undefined' && S ? S : { role: 'admin', email: 'support@fundingsathi.com', name: 'Funding Sathi Team' }
  const filteredLeads = session.role === 'admin' ? leads : leads.filter(l => l.createdBy === session.email)
  const senderEmails = [session.email, ...(DataStore.get('employees') || []).map(emp => emp.email || '')]
  const uniqueSenders = [...new Set(senderEmails.filter(email => email))]

  const recipientRows = [
    ...filteredLeads.map(l => ({
      email: l.email || l.emailId || l.recipientEmail || l.assigneeEmail || '',
      label: l.contactPerson || l.name || l.companyName || l.company || 'Lead'
    })),
    ...contacts.map(c => ({
      email: c.email || c.emailId || c.recipientEmail || c.assigneeEmail || '',
      label: c.contactPerson || c.customerName || c.name || c.company || 'Contact'
    }))
  ].filter(r => r.email)

  const recipientMap = new Map()
  recipientRows.forEach(r => {
    const email = String(r.email).trim()
    if (email && !recipientMap.has(email)) {
      recipientMap.set(email, `${r.label} — ${email}`)
    }
  })

  const recipientOptions = Array.from(recipientMap.entries())
    .map(([email, label]) => `<option value="${email}">${label}</option>`)
    .join('')

  const templateOptions = Object.keys(EMAIL_TEMPLATES)
    .map(key => `<option value="${key}">${key.replace(/_/g, ' ').toUpperCase()}</option>`)
    .join('')

  section.innerHTML = `
    <div class="section-header" style="margin-bottom:24px;">
      <div>
        <h2 style="font-size:24px;font-weight:700;color:var(--gray-900);margin-bottom:8px;">📧 Email</h2>
        <p style="color:var(--gray-500);font-size:14px;margin:0;">Send personalized emails to leads and team members</p>
      </div>
    </div>

    <div style="display:grid;gap:20px;">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;">
        <div class="field">
          <label>From</label>
          <select id="emailFrom">
            ${uniqueSenders.map(email => `<option value="${email}">${email}</option>`).join('')}
          </select>
          <div style="font-size:12px;color:var(--gray-500);margin-top:8px;">The logged-in sender email is preselected. You can update it if your CRM supports multiple sender addresses.</div>
        </div>

        <div class="field">
          <label>Recipient</label>
          <select id="emailRecipient">
            <option value="">Select a lead or contact...</option>
            ${recipientOptions || '<option value="">No recipients found</option>'}
          </select>
          <div style="font-size:12px;color:var(--gray-500);margin-top:8px;">If the recipient is not available, enter the email manually below.</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;">
        <div class="field">
          <label>Manual recipient email</label>
          <input type="email" id="emailRecipientManual" placeholder="recipient@example.com" />
        </div>
        <div class="field">
          <label>Meeting Link</label>
          <input type="url" id="emailMeetingLink" placeholder="https://meetings.example.com/abc123" />
          <button type="button" onclick="insertMeetingLink()" style="margin-top:10px;display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border:none;border-radius:8px;background:#0066cc;color:#fff;font-weight:600;cursor:pointer;">Insert meeting link into message</button>
          <div style="font-size:12px;color:var(--gray-500);margin-top:8px;">Add the meeting link here and insert it directly into the email body. Use {meeting_link} in templates.</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;">
        <div class="field">
          <label>Template</label>
          <select id="emailTemplate" onchange="loadEmailTemplate(this.value)">
            <option value="">Select a template...</option>
            ${templateOptions}
          </select>
        </div>
        <div class="field">
          <label>Subject</label>
          <input type="text" id="emailSubject" placeholder="Email subject line..." />
        </div>
      </div>

      <div class="field">
        <label>Message</label>
        <textarea id="emailBody" placeholder="Type your email message here..."></textarea>
        <div style="font-size:12px;color:var(--gray-500);margin-top:8px;">💡 Tip: Use {lead_name}, {sender_name}, {company_name} for dynamic content</div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;">
        <div style="background:#f9f9f9;padding:16px;border-radius:12px;border:1px solid var(--gray-200);">
          <h3 style="font-size:15px;font-weight:700;color:var(--gray-900);margin-bottom:10px;">📧 Recent Email Activity</h3>
          <div id="emailActivityLog" style="max-height:240px;overflow-y:auto;">
            ${renderEmailActivityLog()}
          </div>
        </div>
      </div>

      <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:flex-start;">
        <button class="btn btn-primary" onclick="sendEmailFromUI()" style="min-width:170px;padding:14px 18px;">✉️ Send Email</button>
        <button class="btn btn-outline" onclick="previewEmailFromUI()" style="min-width:170px;padding:14px 18px;">👁️ Preview</button>
        <button class="btn" onclick="clearEmailForm()" style="min-width:170px;padding:14px 18px;border:1px solid var(--gray-300);border-radius:14px;">🗑️ Clear</button>
      </div>

    </div>
  `
}

function loadEmailTemplate(templateKey) {
  if (!templateKey) return

  const template = EMAIL_TEMPLATES[templateKey]
  if (!template) return

  document.getElementById('emailSubject').value = template.subject
  document.getElementById('emailBody').value = template.body
}

function renderEmailActivityLog() {
  const activities = DataStore.get('activities') || []
  const emailActivities = activities.filter(a => a.type === 'email').slice(-5).reverse()

  if (emailActivities.length === 0) {
    return '<p style="color:var(--gray-500);font-size:12px;margin:0;">No recent email activity</p>'
  }

  return emailActivities
    .map(activity => `
      <div style="padding:8px;border-bottom:1px solid var(--gray-200);font-size:12px;">
        <div style="color:var(--gray-900);font-weight:500;">${activity.description || 'Email sent'}</div>
        <div style="color:var(--gray-500);font-size:11px;">${new Date(activity.timestamp).toLocaleString()}</div>
      </div>
    `)
    .join('')
}

function sendEmailFromUI() {
  const recipient = document.getElementById('emailRecipient')?.value?.trim()
  const manualRecipient = document.getElementById('emailRecipientManual')?.value?.trim()
  const toEmail = manualRecipient || recipient
  const fromEmail = document.getElementById('emailFrom')?.value?.trim() || S?.email || 'support@fundingsathi.com'
  const subject = document.getElementById('emailSubject')?.value?.trim()
  const message = document.getElementById('emailBody')?.value?.trim()
  const meetingLink = document.getElementById('emailMeetingLink')?.value?.trim()

  if (!toEmail) {
    showToast('Please select or enter a recipient email', 'error')
    return
  }
  if (!subject) {
    showToast('Please enter a subject line', 'error')
    return
  }
  if (!message) {
    showToast('Please enter an email message', 'error')
    return
  }

  const leads = DataStore.get('leads') || []
  const contacts = DataStore.get('contacts') || []
  const lead = leads.find(l => [l.email, l.emailId, l.recipientEmail, l.assigneeEmail].includes(toEmail))
  const contact = contacts.find(c => [c.email, c.emailId, c.recipientEmail, c.assigneeEmail].includes(toEmail))
  const leadName = lead?.contactPerson || lead?.name || contact?.contactPerson || contact?.customerName || contact?.name || 'Recipient'

  let processedMessage = message
    .replace(/{lead_name}/g, leadName)
    .replace(/{sender_name}/g, S?.name || 'Funding Sathi Team')
    .replace(/{company_name}/g, 'Funding Sathi')
    .replace(/{meeting_link}/g, meetingLink || '')

  if (meetingLink && !processedMessage.includes(meetingLink)) {
    processedMessage += `\n\nJoin the meeting: ${meetingLink}`
  }

  const processedSubject = subject
    .replace(/{lead_name}/g, leadName)
    .replace(/{sender_name}/g, S?.name || 'Funding Sathi Team')

  sendLeadEmail(toEmail, leadName, processedSubject, processedMessage, fromEmail)
    .then(() => {
      const description = `Email sent from ${fromEmail} to ${leadName}: "${processedSubject}"`
      if (DataStore.addActivity) {
        DataStore.addActivity('email', description, toEmail)
      }
      saveEmailActivityToBackend({
        type: 'email',
        recipient: toEmail,
        leadName,
        subject: processedSubject,
        message: processedMessage,
        sender: fromEmail,
        description,
        user: S?.email || S?.name || 'unknown'
      })
      renderEmailActivityLog()
      clearEmailForm()
    })
    .catch(() => {
      // sendLeadEmail already displays an error toast
    })
}

function previewEmailFromUI() {
  const recipient = document.getElementById('emailRecipient')?.value
  const manualRecipient = document.getElementById('emailRecipientManual')?.value?.trim()
  const toEmail = manualRecipient || recipient
  const fromEmail = document.getElementById('emailFrom')?.value || S?.email || 'support@fundingsathi.com'
  const subject = document.getElementById('emailSubject')?.value
  const message = document.getElementById('emailBody')?.value
  const meetingLink = document.getElementById('emailMeetingLink')?.value

  if (!toEmail || !subject || !message) {
    showToast('Please fill in all fields to preview', 'error')
    return
  }

  const leads = DataStore.get('leads') || []
  const contacts = DataStore.get('contacts') || []
  const lead = leads.find(l => [l.email, l.emailId, l.recipientEmail, l.assigneeEmail].includes(toEmail))
  const contact = contacts.find(c => [c.email, c.emailId, c.recipientEmail, c.assigneeEmail].includes(toEmail))
  const leadName = lead?.contactPerson || lead?.name || contact?.contactPerson || contact?.customerName || contact?.name || 'Recipient'

  const previewMessage = message
    .replace(/{lead_name}/g, leadName)
    .replace(/{sender_name}/g, S?.name || 'Funding Sathi')
    .replace(/{meeting_link}/g, meetingLink || '')

  const preview = `
    FROM: ${fromEmail}
    TO: ${toEmail}
    SUBJECT: ${subject}
    
    ---
    
    ${previewMessage}`

  showToast('Email preview copied to clipboard!', 'success')
  navigator.clipboard.writeText(preview)
}

function clearEmailForm() {
  const fields = ['emailRecipient', 'emailRecipientManual', 'emailTemplate', 'emailSubject', 'emailBody', 'emailMeetingLink']
  fields.forEach(id => {
    const el = document.getElementById(id)
    if (el) el.value = ''
  })
}

function sendLeadEmail(recipient, leadName, subject, message, sender) {
  if (typeof postToCRMBackend !== 'function') {
    const error = new Error('Backend email helper is unavailable')
    showToast('Backend email integration is not initialized.', 'error')
    return Promise.reject(error)
  }

  const payload = {
    to: recipient,
    subject,
    message,
    sender: sender || '',
    leadName
  }

  return postToCRMBackend(BACKEND_EMAIL_PATH, payload)
    .then((result) => {
      if (result && result.status === 'success') {
        showToast('Email sent through the backend successfully!', 'success')
        return saveEmailActivityToBackend({
          type: 'email',
          recipient,
          leadName,
          subject,
          message,
          sender,
          description: `Email sent from ${sender} to ${leadName}: "${subject}"`,
          user: S?.email || S?.name || 'unknown'
        })
      }
      throw new Error(result?.message || 'Backend email send failed.')
    })
    .catch(err => {
      console.error('Backend email send error', err)
      showToast('Backend email could not be sent. Check backend connectivity.', 'error')
      return Promise.reject(err)
    })
}

function insertMeetingLink() {
  const meetingLink = document.getElementById('emailMeetingLink')?.value?.trim()
  const bodyEl = document.getElementById('emailBody')

  if (!meetingLink) {
    showToast('Enter a meeting link to insert', 'error')
    return
  }

  if (bodyEl) {
    const body = bodyEl.value || ''
    bodyEl.value = body + (body.trim() ? '\n\n' : '') + `Join the meeting: ${meetingLink}`
    showToast('Meeting link added to the email body', 'success')
  }
}


function renderMeetTools() {
  const section = document.getElementById('sec-meet-tools')
  if (!section) return

  section.innerHTML = `
    <div class="section-header" style="margin-bottom:24px;">
      <h2 style="font-size:24px;font-weight:700;color:var(--gray-900);margin-bottom:8px;">Meeting Tools</h2>
      <p style="color:var(--gray-500);font-size:14px;">Quick access to video conferencing platforms</p>
    </div>

    <div class="tools-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;margin-bottom:32px;">
      <!-- Google Meet -->
      <div class="tool-card" style="background:#fff;border:1px solid var(--gray-200);border-radius:16px;padding:24px;text-align:center;transition:all 0.2s;cursor:pointer;" onmouseover="this.style.boxShadow='0 8px 24px rgba(66,133,244,0.15)'" onmouseout="this.style.boxShadow='none'" onclick="openMeetPlatform('https://meet.google.com')">
        <div style="width:64px;height:64px;background:linear-gradient(135deg,#4285f4,#34a853);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M8 12l4 4 4-4"/><path d="M12 8v8"/></svg>
        </div>
        <div style="font-size:18px;font-weight:600;color:var(--gray-900);margin-bottom:8px;">Google Meet</div>
        <div style="font-size:13px;color:var(--gray-500);margin-bottom:16px;">Start or join secure video meetings</div>
        <button class="btn btn-primary" style="background:#4285f4;border:none;width:100%;">Open Google Meet</button>
      </div>

      <!-- Zoom -->
      <div class="tool-card" style="background:#fff;border:1px solid var(--gray-200);border-radius:16px;padding:24px;text-align:center;transition:all 0.2s;cursor:pointer;" onmouseover="this.style.boxShadow='0 8px 24px rgba(45,140,255,0.15)'" onmouseout="this.style.boxShadow='none'" onclick="openMeetPlatform('https://zoom.us/join')">
        <div style="width:64px;height:64px;background:linear-gradient(135deg,#2d8cff,#0f5cff);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12l4 4 4-4"/><path d="M12 8v8"/></svg>
        </div>
        <div style="font-size:18px;font-weight:600;color:var(--gray-900);margin-bottom:8px;">Zoom</div>
        <div style="font-size:13px;color:var(--gray-500);margin-bottom:16px;">HD video conferencing & webinars</div>
        <button class="btn btn-primary" style="background:#2d8cff;border:none;width:100%;">Open Zoom</button>
      </div>

      <!-- Microsoft Teams -->
      <div class="tool-card" style="background:#fff;border:1px solid var(--gray-200);border-radius:16px;padding:24px;text-align:center;transition:all 0.2s;cursor:pointer;" onmouseover="this.style.boxShadow='0 8px 24px rgba(98,100,167,0.15)'" onmouseout="this.style.boxShadow='none'" onclick="openMeetPlatform('https://teams.microsoft.com')">
        <div style="width:64px;height:64px;background:linear-gradient(135deg,#6264a7,#464775);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
        </div>
        <div style="font-size:18px;font-weight:600;color:var(--gray-900);margin-bottom:8px;">Microsoft Teams</div>
        <div style="font-size:13px;color:var(--gray-500);margin-bottom:16px;">Collaborate with chat, video & files</div>
        <button class="btn btn-primary" style="background:#6264a7;border:none;width:100%;">Open Teams</button>
      </div>
    </div>

    <!-- Quick Join Section -->
    <div class="card" style="background:#fff;border:1px solid var(--gray-200);border-radius:16px;padding:24px;margin-bottom:24px;">
      <h3 style="font-size:16px;font-weight:600;color:var(--gray-900);margin-bottom:16px;">Quick Join Meeting</h3>
      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        <div class="field" style="flex:1;min-width:200px;">
          <label>Meeting Link or ID</label>
          <input type="text" id="quickJoinLink" placeholder="Paste meeting URL or ID" style="width:100%;padding:12px 16px;border:1px solid var(--gray-300);border-radius:8px;font-size:14px;">
        </div>
        <div style="display:flex;gap:8px;align-items:flex-end;">
          <button class="btn btn-primary" onclick="quickJoinMeeting()" style="padding:12px 24px;">Join Meeting</button>
          <button class="btn btn-outline" onclick="document.getElementById('quickJoinLink').value=''" style="padding:12px 16px;">Clear</button>
        </div>
      </div>
      <div style="margin-top:12px;font-size:12px;color:var(--gray-500);">
        Supports: Google Meet links, Zoom meeting IDs, Teams invite links
      </div>
    </div>

    <!-- Meeting History -->
    <div class="card" style="background:#fff;border:1px solid var(--gray-200);border-radius:16px;padding:24px;">
      <h3 style="font-size:16px;font-weight:600;color:var(--gray-900);margin-bottom:16px;">Recent Meetings</h3>
      <div id="recentMeetingsList">
        ${renderRecentMeetingsForTools()}
      </div>
    </div>
  `
}

function openMeetPlatform(url) {
  window.open(url, '_blank')
}

function quickJoinMeeting() {
  const link = document.getElementById('quickJoinLink')?.value?.trim()
  if (!link) {
    showToast('Please enter a meeting link or ID', 'error')
    return
  }

  // Detect platform and open
  let url = link
  if (link.match(/^\d{9,11}$/)) {
    // Zoom meeting ID
    url = `https://zoom.us/j/${link}`
  } else if (!link.startsWith('http')) {
    // Assume it's a URL without protocol
    url = 'https://' + link
  }

  window.open(url, '_blank')
  showToast('Joining meeting...', 'success')
}

function renderRecentMeetingsForTools() {
  const mtgs = getMtgs().slice(-5).reverse()
  if (mtgs.length === 0) {
    return '<div style="padding:20px;text-align:center;color:var(--gray-400);">No recent meetings</div>'
  }

  return mtgs.map(m => {
    const hasLinks = m.meetingLinks && (m.meetingLinks.googleMeet || m.meetingLinks.zoom || m.meetingLinks.teams)
    const joinButtons = hasLinks ? `
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${m.meetingLinks.googleMeet ? `<a href="${m.meetingLinks.googleMeet}" target="_blank" style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;background:#4285f4;color:#fff;border-radius:6px;font-size:12px;text-decoration:none;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg>Meet</a>` : ''}
        ${m.meetingLinks.zoom ? `<a href="${m.meetingLinks.zoom}" target="_blank" style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;background:#2d8cff;color:#fff;border-radius:6px;font-size:12px;text-decoration:none;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>Zoom</a>` : ''}
        ${m.meetingLinks.teams ? `<a href="${m.meetingLinks.teams}" target="_blank" style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;background:#6264a7;color:#fff;border-radius:6px;font-size:12px;text-decoration:none;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>Teams</a>` : ''}
      </div>
    ` : '<span style="font-size:12px;color:var(--gray-400);">No meeting link</span>'

    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--gray-100);${mtgs.indexOf(m) === mtgs.length - 1 ? 'border-bottom:none;' : ''}">
        <div>
          <div style="font-weight:500;color:var(--gray-900);font-size:14px;">${m.title}</div>
          <div style="font-size:12px;color:var(--gray-500);margin-top:2px;">${m.date} • ${m.time} • ${m.company || '—'}</div>
        </div>
        ${joinButtons}
      </div>
    `
  }).join('')
}

function renderWhatsApp() {
  const section = document.getElementById('sec-whatsapp')
  if (!section) return

  const leads = DataStore.get('leads') || []
  const contacts = DataStore.get('contacts') || []

  section.innerHTML = `
    <div class="section-header" style="margin-bottom:24px;">
      <h2 style="font-size:24px;font-weight:700;color:var(--gray-900);margin-bottom:8px;">WhatsApp</h2>
      <p style="color:var(--gray-500);font-size:14px;">Send messages and connect with leads via WhatsApp</p>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px;">
      <!-- Send Message Panel -->
      <div class="card" style="background:#fff;border:1px solid var(--gray-200);border-radius:16px;padding:24px;">
        <h3 style="font-size:16px;font-weight:600;color:var(--gray-900);margin-bottom:16px;">📱 Send Message</h3>
        
        <div class="field" style="margin-bottom:16px;">
          <label>Select Contact <span style="color:#ef4444;">*</span></label>
          <select id="waContact" style="width:100%;padding:10px 14px;border:1px solid var(--gray-300);border-radius:8px;font-size:14px;background:#fff;" onchange="updateWhatsAppNumber()">
            <option value="">Choose a lead or contact</option>
            <optgroup label="Leads">
              ${leads.map(l => `<option value="${l.phone}" data-name="${l.name}">${l.name} - ${l.phone}</option>`).join('')}
            </optgroup>
            <optgroup label="Contacts">
              ${contacts.map(c => `<option value="${c.phone}" data-name="${c.name}">${c.name} - ${c.phone}</option>`).join('')}
            </optgroup>
          </select>
        </div>

        <div class="field" style="margin-bottom:16px;">
          <label>Or Enter Phone Number</label>
          <input type="tel" id="waPhone" placeholder="+91 98765 43210" style="width:100%;padding:10px 14px;border:1px solid var(--gray-300);border-radius:8px;font-size:14px;">
        </div>

        <div class="field" style="margin-bottom:16px;">
          <label>Message Template</label>
          <select id="waTemplate" style="width:100%;padding:10px 14px;border:1px solid var(--gray-300);border-radius:8px;font-size:14px;background:#fff;" onchange="applyWhatsAppTemplate()">
            <option value="">Select a template (optional)</option>
            <option value="greeting">👋 Initial Greeting</option>
            <option value="followup">📋 Follow-up</option>
            <option value="meeting">📅 Meeting Confirmation</option>
            <option value="proposal">💼 Proposal Discussion</option>
            <option value="reminder">⏰ Payment Reminder</option>
            <option value="thankyou">🙏 Thank You</option>
          </select>
        </div>

        <div class="field" style="margin-bottom:16px;">
          <label>Message <span style="color:#ef4444;">*</span></label>
          <textarea id="waMessage" rows="5" placeholder="Type your message here..." style="width:100%;padding:10px 14px;border:1px solid var(--gray-300);border-radius:8px;font-size:14px;resize:vertical;"></textarea>
        </div>

        <div style="display:flex;gap:10px;">
          <button class="btn btn-primary" onclick="sendWhatsAppMessage()" style="flex:1;padding:12px;background:#25d366;border:none;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right:6px;vertical-align:middle;"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982 1.001-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.955L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Send via WhatsApp
          </button>
          <button class="btn btn-outline" onclick="clearWhatsAppForm()" style="padding:12px 16px;">Clear</button>
        </div>

        <div style="margin-top:12px;padding:12px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;">
          <div style="font-size:12px;color:#166534;">
            <strong>Note:</strong> This will open WhatsApp Web/App with your message pre-filled. Make sure you're logged into WhatsApp Web.
          </div>
        </div>
      </div>

      <!-- Quick Actions & Info -->
      <div style="display:flex;flex-direction:column;gap:20px;">
        <!-- Quick Stats -->
        <div class="card" style="background:#fff;border:1px solid var(--gray-200);border-radius:16px;padding:24px;">
          <h3 style="font-size:16px;font-weight:600;color:var(--gray-900);margin-bottom:16px;">📊 Message Stats</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
            <div style="text-align:center;padding:16px;background:var(--gray-50);border-radius:12px;">
              <div style="font-size:24px;font-weight:700;color:#25d366;">${leads.length}</div>
              <div style="font-size:12px;color:var(--gray-500);">Leads with Phone</div>
            </div>
            <div style="text-align:center;padding:16px;background:var(--gray-50);border-radius:12px;">
              <div style="font-size:24px;font-weight:700;color:#25d366;">${contacts.length}</div>
              <div style="font-size:12px;color:var(--gray-500);">Contacts</div>
            </div>
          </div>
        </div>

        <!-- Message Templates Reference -->
        <div class="card" style="background:#fff;border:1px solid var(--gray-200);border-radius:16px;padding:24px;">
          <h3 style="font-size:16px;font-weight:600;color:var(--gray-900);margin-bottom:16px;">📝 Quick Templates</h3>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <button onclick="copyTemplate('greeting')" class="template-btn" style="text-align:left;padding:10px 12px;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;cursor:pointer;font-size:13px;color:var(--gray-700);transition:all 0.2s;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='var(--gray-50)'">
              👋 Greeting: "Hello! This is ${S?.name || 'FundingSathi'}..."
            </button>
            <button onclick="copyTemplate('followup')" class="template-btn" style="text-align:left;padding:10px 12px;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;cursor:pointer;font-size:13px;color:var(--gray-700);transition:all 0.2s;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='var(--gray-50)'">
              📋 Follow-up: "Following up on our discussion..."
            </button>
            <button onclick="copyTemplate('meeting')" class="template-btn" style="text-align:left;padding:10px 12px;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;cursor:pointer;font-size:13px;color:var(--gray-700);transition:all 0.2s;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='var(--gray-50)'">
              📅 Meeting: "Confirming our meeting scheduled..."
            </button>
          </div>
        </div>

        <!-- WhatsApp Web Link -->
        <div class="card" style="background:#fff;border:1px solid var(--gray-200);border-radius:16px;padding:24px;text-align:center;">
          <div style="width:48px;height:48px;background:linear-gradient(135deg,#25d366,#128c7e);border-radius:12px;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982 1.001-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.955L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          </div>
          <div style="font-size:14px;font-weight:500;color:var(--gray-900);margin-bottom:8px;">Open WhatsApp Web</div>
          <button class="btn btn-outline" onclick="window.open('https://web.whatsapp.com','_blank')" style="width:100%;">Launch WhatsApp Web</button>
        </div>
      </div>
    </div>
  `
}

function updateWhatsAppNumber() {
  const contactSelect = document.getElementById('waContact')
  const phoneInput = document.getElementById('waPhone')
  if (contactSelect && phoneInput) {
    phoneInput.value = contactSelect.value
  }
}

function applyWhatsAppTemplate() {
  const template = document.getElementById('waTemplate')?.value
  const messageInput = document.getElementById('waMessage')
  const contactSelect = document.getElementById('waContact')
  const contactName = contactSelect?.options[contactSelect.selectedIndex]?.dataset?.name || 'there'
  const senderName = S?.name || 'FundingSathi'

  if (!template || !messageInput) return

  const templates = {
    greeting: `Hello ${contactName}! 👋\n\nThis is ${senderName} from FundingSathi. I hope you're doing well.\n\nI wanted to reach out regarding our financial services that might benefit your business.\n\nWould you be available for a quick call to discuss?`,
    followup: `Hi ${contactName},\n\nI hope you're having a great day! 😊\n\nI wanted to follow up on our previous discussion about funding solutions for your business.\n\nDo you have any questions or would you like to move forward with the proposal?\n\nLooking forward to hearing from you.`,
    meeting: `Hello ${contactName},\n\nJust confirming our meeting scheduled for [DATE] at [TIME].\n\n📅 Meeting: [TOPIC]\n⏰ Time: [TIME]\n📍 Location/Link: [LINK/ADDRESS]\n\nPlease let me know if you need to reschedule. Looking forward to our discussion!`,
    proposal: `Hi ${contactName},\n\nThank you for considering FundingSathi for your financial needs. 💼\n\nI've prepared a customized funding proposal based on our discussion. The details include:\n\n✓ Funding Amount: ₹[AMOUNT]\n✓ Interest Rate: [RATE]%\n✓ Tenure: [TENURE] months\n✓ Processing Time: [DAYS] days\n\nWould you like to review this together?`,
    reminder: `Dear ${contactName},\n\nThis is a friendly reminder regarding the pending payment of ₹[AMOUNT] for [INVOICE/DESCRIPTION].\n\n⏰ Due Date: [DATE]\n📄 Invoice: [INVOICE NUMBER]\n\nPlease let us know if you need any assistance with the payment process or if there are any concerns we can help address.\n\nThank you for your prompt attention.`,
    thankyou: `Dear ${contactName},\n\nThank you for choosing FundingSathi! 🙏\n\nWe truly appreciate your trust in our services. It was a pleasure working with you, and we hope the funding solution helps grow your business.\n\nIf you need any further assistance, please don't hesitate to reach out.\n\nWishing you continued success!`
  }

  messageInput.value = templates[template] || ''
}

function sendWhatsAppMessage() {
  const phone = document.getElementById('waPhone')?.value?.trim().replace(/\s/g, '')
  const message = document.getElementById('waMessage')?.value?.trim()

  if (!phone) {
    showToast('Please enter a phone number', 'error')
    return
  }

  if (!message) {
    showToast('Please enter a message', 'error')
    return
  }

  // Format phone number (remove non-digits, ensure country code)
  let formattedPhone = phone.replace(/\D/g, '')
  if (!formattedPhone.startsWith('+')) {
    // Assume India if no country code
    if (formattedPhone.startsWith('0')) {
      formattedPhone = formattedPhone.substring(1)
    }
    if (!formattedPhone.startsWith('91')) {
      formattedPhone = '91' + formattedPhone
    }
  }

  // Encode message for URL
  const encodedMessage = encodeURIComponent(message)

  // Open WhatsApp with pre-filled message
  const waUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`
  window.open(waUrl, '_blank')

  showToast('Opening WhatsApp...', 'success')

  // Log activity
  DataStore.addActivity('whatsapp', `Sent WhatsApp message to ${phone}`, phone)
}

function clearWhatsAppForm() {
  const fields = ['waContact', 'waPhone', 'waTemplate', 'waMessage']
  fields.forEach(id => {
    const el = document.getElementById(id)
    if (el) el.value = ''
  })
}

function copyTemplate(type) {
  const templateSelect = document.getElementById('waTemplate')
  if (templateSelect) {
    templateSelect.value = type
    applyWhatsAppTemplate()
    showToast('Template loaded!', 'success')
  }
}

function renderProjects() {}

// Stats updater
function updateStats(count, type) {
  const showing = document.getElementById(`${type}Showing`)
  if (showing) showing.textContent = count
}

// Speech recognition
let recognition = null
let isListening = false

function toggleSpeechRecognition() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    showToast('Speech recognition not supported in this browser', 'error')
    return
  }

  if (isListening) {
    stopSpeechRecognition()
  } else {
    startSpeechRecognition()
  }
}

function startSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  recognition = new SpeechRecognition()

  const langSelect = document.getElementById('speechLang')
  recognition.lang = langSelect ? langSelect.value : 'en-IN'
  recognition.continuous = true
  recognition.interimResults = true

  recognition.onstart = () => {
    isListening = true
    const micBtn = document.getElementById('micBtn')
    const speechStatus = document.getElementById('speechStatus')
    if (micBtn) micBtn.style.background = '#ef4444'
    if (speechStatus) speechStatus.style.display = 'block'
  }

  recognition.onresult = (event) => {
    const notes = document.getElementById('liveCallNotes')
    if (!notes) return

    let transcript = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript
    }

    if (event.results[event.results.length - 1].isFinal) {
      notes.value += (notes.value ? ' ' : '') + transcript
    }
  }

  recognition.onerror = (event) => {
    console.error('Speech recognition error', event.error)
    showToast('Speech recognition error: ' + event.error, 'error')
    stopSpeechRecognition()
  }

  recognition.onend = () => {
    stopSpeechRecognition()
  }

  recognition.start()
}

function stopSpeechRecognition() {
  if (recognition) {
    recognition.stop()
    recognition = null
  }
  isListening = false

  const micBtn = document.getElementById('micBtn')
  const speechStatus = document.getElementById('speechStatus')
  if (micBtn) micBtn.style.background = 'rgba(255,255,255,.2)'
  if (speechStatus) speechStatus.style.display = 'none'
}

// ═══════════════════════════════════════════════════════════════
// WORKQUEUE FILTER & RENDER
// ═══════════════════════════════════════════════════════════════

// Note: currentWQFilter is defined globally in crm-navigation.js

function filterWorkqueue(el, type) {
  // Set the global filter variable (from crm-navigation.js)
  window.currentWQFilter = type

  // Update active state in sidebar
  document.querySelectorAll('#wqActivityList .wq-item').forEach(item => {
    item.classList.remove('active')
  })
  if (el) el.classList.add('active')

  renderWorkqueue()
}

// Alias for backward compatibility
function renderWorkqueue() {
  renderWorkqueueTable()
}

function updateWorkqueueCounts() {
  const tasks = (DataStore.get('tasks') || []).filter(t => !t.completed).length
  const meetings = (DataStore.get('meetings') || []).length
  const calls = (DataStore.get('calls') || []).length || 1 // Default 1 for sample

  const taskCount = document.getElementById('wqCount-tasks')
  const meetingCount = document.getElementById('wqCount-meetings')
  const callCount = document.getElementById('wqCount-calls')

  if (taskCount) taskCount.textContent = tasks || 6
  if (meetingCount) meetingCount.textContent = meetings
  if (callCount) callCount.textContent = calls || 1
}

function toggleTaskComplete(taskId) {
  const tasks = DataStore.get('tasks') || []
  const task = tasks.find(t => t.id === taskId)
  if (task) {
    task.completed = !task.completed
    DataStore.set('tasks', tasks)
    renderWorkqueue()
    showToast(task.completed ? 'Task completed!' : 'Task reopened', 'success')
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    startCallRecording, stopCallRecording, toggleRecording, downloadCallRecording,
    submitCall, renderMeetings, renderWorkqueue, renderCallTracker,
    toggleSpeechRecognition, checkTodaysMeetings,
    openMtgModal, closeMtgModal, submitMtg, clearMtgForm,
    renderWhatsApp, updateWhatsAppNumber, applyWhatsAppTemplate, sendWhatsAppMessage, clearWhatsAppForm, copyTemplate,
    renderGoogleSheets, exportToSheets,
    renderCalendar, generateCalendarGrid, parseDate, isOverdue, renderUpcomingEvents, renderTodaySchedule, showDayEvents, changeCalendarMonth, syncWithGoogleCalendar,
    filterWorkqueue, updateWorkqueueCounts, toggleTaskComplete
  }
}
