// ═══════════════════════════════════════════════════════════════
// CRM ADMIN LOGOUT APPROVALS - Manage Employee Logout Requests
// ═══════════════════════════════════════════════════════════════

// Track last known request IDs to detect new ones
let lastKnownRequestIds = new Set()
let pollingInterval = null
const POLLING_INTERVAL_MS = 30000 // Check every 30 seconds

// Show popup notification for new early logout request
function showEarlyLogoutNotification(request) {
  const notification = document.createElement('div')
  notification.className = 'early-logout-notification'
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border-left: 4px solid #dc2626;
    border-radius: 8px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.15);
    padding: 16px 20px;
    max-width: 400px;
    z-index: 10001;
    animation: slideInRight 0.3s ease-out;
    font-family: system-ui, -apple-system, sans-serif;
  `
  
  const employeeName = request.userName || request.employee_name || 'Unknown Employee'
  const reason = request.reason || request.request_reason || 'No reason provided'
  const requestedTime = new Date(request.requestedAt || request.created_at).toLocaleTimeString()
  const requestType = request.source === 'target' ? 'Target-based' : 'Timer-based'
  
  notification.innerHTML = `
    <div style="display: flex; align-items: flex-start; gap: 12px;">
      <div style="background: #fef2f2; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
        <svg width="20" height="20" fill="none" stroke="#dc2626" stroke-width="2" viewBox="0 0 24 24">
          <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
          <line x1="12" y1="2" x2="12" y2="12"/>
        </svg>
      </div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-weight: 600; font-size: 14px; color: #1f2937; margin-bottom: 4px;">
          Early Logout Request
        </div>
        <div style="font-size: 13px; color: #6b7280; margin-bottom: 8px;">
          <strong>${employeeName}</strong> requested early logout at ${requestedTime}
        </div>
        <div style="background: #f9fafb; border-radius: 6px; padding: 10px; margin-bottom: 12px;">
          <div style="font-size: 12px; color: #9ca3af; margin-bottom: 4px;">Reason:</div>
          <div style="font-size: 13px; color: #374151; line-height: 1.4; word-wrap: break-word;">${reason}</div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <span style="font-size: 11px; background: #e5e7eb; color: #4b5563; padding: 2px 8px; border-radius: 4px;">${requestType}</span>
          <button onclick="this.closest('.early-logout-notification').remove()" style="font-size: 12px; color: #6b7280; background: none; border: none; cursor: pointer; margin-left: auto;">Dismiss</button>
        </div>
      </div>
    </div>
  `
  
  // Add animation keyframes if not exists
  if (!document.getElementById('notification-animations')) {
    const style = document.createElement('style')
    style.id = 'notification-animations'
    style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `
    document.head.appendChild(style)
  }
  
  document.body.appendChild(notification)
  
  // Auto-dismiss after 15 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideInRight 0.3s ease-out reverse'
      setTimeout(() => notification.remove(), 300)
    }
  }, 15000)
}

function getLogoutApprovalsSession() {
  if (typeof S !== 'undefined' && S) {
    return S
  }
  try {
    return JSON.parse(localStorage.getItem('crm_session') || '{}')
  } catch (err) {
    console.warn('[LogoutApprovals] Failed to parse crm_session', err)
    return {}
  }
}

function isLogoutApprovalsAuthorized() {
  const session = getLogoutApprovalsSession()
  const role = String(session.role || '').trim().toLowerCase()
  return role === 'admin' || role === 'manager' || role === 'branch_manager' || role === 'branch manager'
}

function getLogoutApprovalsDeniedMessage() {
  return '<div style="text-align:center;padding:40px;color:var(--gray-400);">You do not have permission to view logout approval requests.</div>'
}

// Start polling for new requests
function startLogoutRequestPolling() {
  if (!isLogoutApprovalsAuthorized()) {
    console.debug('[LogoutApprovals] Polling disabled for non-admin/manager role')
    stopLogoutRequestPolling()
    return
  }

  if (pollingInterval) {
    clearInterval(pollingInterval)
  }
  
  // Initial check
  refreshLogoutApprovalsBadge()
  
  // Poll periodically
  pollingInterval = setInterval(() => {
    refreshLogoutApprovalsBadge()
  }, POLLING_INTERVAL_MS)
}

// Stop polling
function stopLogoutRequestPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
}

async function refreshLogoutApprovalsBadge() {
  if (!isLogoutApprovalsAuthorized()) {
    stopLogoutRequestPolling()
    return
  }

  const navButton = document.querySelector('.nav-btn[data-sec="logout-approvals"]')
  if (!navButton) return

  try {
    const requests = await getLogoutRequests()
    const pendingRequests = Array.isArray(requests)
      ? requests.filter(r => String(r.status || '').toLowerCase() === 'pending')
      : []
    const pendingCount = pendingRequests.length

    // Detect new requests and show notifications
    const currentRequestIds = new Set(pendingRequests.map(r => String(r.id)))
    const newRequests = pendingRequests.filter(r => !lastKnownRequestIds.has(String(r.id)))
    
    if (newRequests.length > 0) {
      newRequests.forEach(req => {
        showEarlyLogoutNotification(req)
      })
    }
    
    // Update tracking set
    lastKnownRequestIds = currentRequestIds

    let badge = navButton.querySelector('.logout-approvals-badge')
    if (pendingCount > 0) {
      if (!badge) {
        badge = document.createElement('span')
        badge.className = 'logout-approvals-badge'
        navButton.appendChild(badge)
      }
      badge.textContent = pendingCount
      badge.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:#dc2626;color:#fff;font-size:11px;font-weight:700;margin-left:8px;'
      navButton.setAttribute('data-pending-count', String(pendingCount))
    } else {
      if (badge) badge.remove()
      navButton.removeAttribute('data-pending-count')
    }

    const activeSection = document.querySelector('.section.active')
    if (activeSection && activeSection.id === 'sec-logout-approvals') {
      await renderLogoutApprovals()
    }
  } catch (err) {
    console.warn('[LogoutApprovals] Failed to refresh badge', err)
  }
}

// Render the logout approvals dashboard
async function renderLogoutApprovals() {
  const container = document.getElementById('logoutApprovalsBody')
  if (!container) return

  if (!isLogoutApprovalsAuthorized()) {
    container.innerHTML = getLogoutApprovalsDeniedMessage()
    return
  }

  // Show loading state
  container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--gray-400);">Loading logout requests...</div>'

  // Get logout requests from backend API
  const requests = await getLogoutRequests()
  console.log('[LogoutApprovals] Fetched requests:', requests)
  
  const pendingRequests = requests.filter(r => r.status === 'pending')
  console.log('[LogoutApprovals] Pending requests:', pendingRequests)

  // If no pending requests
  if (pendingRequests.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:40px;color:var(--gray-400);">
        <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin:0 auto 16px;opacity:0.5;"><path d="M9 11l3 3L22 4"/><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <div style="font-size:16px;font-weight:500;margin-bottom:8px;">No Pending Requests</div>
        <div style="font-size:13px;">All employees are approved to sign out</div>
      </div>
    `
    return
  }

  // Build table with pending requests
  let html = `
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:1px solid var(--gray-200);background:var(--gray-50);">
            <th style="padding:12px;text-align:left;font-weight:600;font-size:13px;color:var(--gray-600);">Employee</th>
            <th style="padding:12px;text-align:left;font-weight:600;font-size:13px;color:var(--gray-600);">Email</th>
            <th style="padding:12px;text-align:left;font-weight:600;font-size:13px;color:var(--gray-600);">Reason</th>
            <th style="padding:12px;text-align:left;font-weight:600;font-size:13px;color:var(--gray-600);">Type</th>
            <th style="padding:12px;text-align:left;font-weight:600;font-size:13px;color:var(--gray-600);">Requested At</th>
            <th style="padding:12px;text-align:center;font-weight:600;font-size:13px;color:var(--gray-600);">Actions</th>
          </tr>
        </thead>
        <tbody>
  `

  pendingRequests.forEach((req, idx) => {
    const requestedTime = new Date(req.requestedAt).toLocaleString()
    const emailDisplay = req.email || 'unknown@example.com'
    const reasonDisplay = req.reason || '(No reason provided)'

    html += `
      <tr style="border-bottom:1px solid var(--gray-100);">
        <td style="padding:12px;font-weight:500;color:var(--gray-900);">${req.userName || 'Unknown User'}</td>
        <td style="padding:12px;color:var(--gray-600);font-size:13px;">${emailDisplay}</td>
        <td style="padding:12px;color:var(--gray-600);font-size:13px;max-width:250px;white-space:pre-wrap;word-break:break-word;">${reasonDisplay}</td>
        <td style="padding:12px;color:var(--gray-600);font-size:13px;">${req.source === 'target' ? 'Target' : 'Timer'}</td>
        <td style="padding:12px;color:var(--gray-600);font-size:13px;">${requestedTime}</td>
        <td style="padding:12px;text-align:center;display:flex;gap:8px;justify-content:center;pointer-events:auto;">
          <button class="btn btn-success logout-approve-btn" data-request-id="${req.id}" data-request-source="${req.source || 'timer'}" type="button" style="padding:6px 12px;font-size:12px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>Approve
          </button>
          <button class="btn btn-danger logout-reject-btn" data-request-id="${req.id}" data-request-source="${req.source || 'timer'}" type="button" style="padding:6px 12px;font-size:12px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>Reject
          </button>
        </td>
      </tr>
    `
  })

  html += `
        </tbody>
      </table>
    </div>
    <div style="margin-top:16px;padding:12px;background:var(--gray-50);border-radius:6px;font-size:13px;color:var(--gray-600);">
      <strong>${pendingRequests.length}</strong> pending request${pendingRequests.length !== 1 ? 's' : ''} waiting for approval
    </div>
  `

  container.innerHTML = html

  // Add event listeners for approve and reject buttons
  setTimeout(() => {
    const approveButtons = container.querySelectorAll('.logout-approve-btn')
    const rejectButtons = container.querySelectorAll('.logout-reject-btn')

    approveButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        const requestId = btn.getAttribute('data-request-id')
        const source = btn.getAttribute('data-request-source') || 'timer'
        approveLogoutRequest(requestId, source)
      })
    })

    rejectButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        const requestId = btn.getAttribute('data-request-id')
        const source = btn.getAttribute('data-request-source') || 'timer'
        rejectLogoutRequest(requestId, source)
      })
    })
  }, 0)
}

// Get all logout requests from backend API
async function resolveLogoutApprovalsApi(path, options = {}) {
  if (typeof resolveCRMApiRequest !== 'function') {
    throw new Error('resolveCRMApiRequest is not available')
  }

  const paths = [path, `/api${path}`]
  let lastError = null

  for (const p of paths) {
    try {
      const res = await resolveCRMApiRequest(p, { credentials: 'include', ...options })
      console.log('[LogoutApprovals] Trying path:', p, 'status:', res && res.status)
      if (res && res.ok) return res
      if (res && res.status === 400) {
        console.warn('[LogoutApprovals] Ignoring invalid optional approval request:', p)
        return null
      }
      if (res && [401, 403, 404, 429].includes(res.status)) {
        lastError = new Error(`HTTP ${res.status} for ${p}`)
      }
    } catch (err) {
      lastError = err
    }
  }

  if (lastError) throw lastError
  return null
}

async function getLogoutRequests() {
  if (!isLogoutApprovalsAuthorized()) {
    console.debug('[LogoutApprovals] Skipping fetch for unauthorized session')
    return []
  }

  try {
    console.log('[LogoutApprovals] Attempting to fetch from backend API...')
    const headers = { 'Accept': 'application/json' }
    const allRequests = []

    // Timer-based early logout requests
    try {
      const res = await resolveLogoutApprovalsApi('/timer/early-logout/requests', {
        method: 'GET',
        headers
      })
      if (res && res.ok) {
        const data = await res.json().catch(() => [])
        if (Array.isArray(data)) {
          allRequests.push(...data.map(req => ({
            id: req.id,
            source: 'timer',
            status: req.status,
            userName: req.requester_name || 'Unknown User',
            email: 'Employee',
            reason: req.request_reason || '(No reason provided)',
            requestedAt: req.requested_at || req.created_at,
            approvedBy: req.reviewer_name,
            approvedAt: req.reviewed_at,
            rejectedBy: req.reviewer_name,
            rejectedAt: req.reviewed_at,
            rejectionReason: req.review_comment
          })))
        }
      }
    } catch (err) {
      console.warn('[LogoutApprovals] Timer requests fetch failed:', err)
    }

    // Target-based early logout requests
    try {
      const res = await resolveLogoutApprovalsApi('/targets/early-logout/requests', {
        method: 'GET',
        headers
      })
      if (res && res.ok) {
        const data = await res.json().catch(() => [])
        if (Array.isArray(data)) {
          allRequests.push(...data.map(req => ({
            id: req.id,
            source: 'target',
            status: req.status,
            userName: req.employee_name || 'Unknown User',
            email: 'Employee',
            reason: `${req.reason || '(No reason)'} [Pending: ${req.remaining_calls} calls, ${req.remaining_leads} leads]`,
            requestedAt: req.created_at,
            approvedBy: req.reviewer_name,
            approvedAt: req.reviewed_at,
            rejectedBy: req.reviewer_name,
            rejectedAt: req.reviewed_at,
            rejectionReason: req.review_comment
          })))
        }
      }
    } catch (err) {
      console.warn('[LogoutApprovals] Target requests fetch failed:', err)
    }

    return allRequests
  } catch (e) {
    console.error('[LogoutApprovals] Error reading logout requests from backend:', e)
    return []
  }
}

// Save logout requests to localStorage - REMOVED: No longer using localStorage
function saveLogoutRequests(requests) {
  // No-op - all data now comes from PostgreSQL backend
  console.warn('[LogoutApprovals] saveLogoutRequests called but localStorage is deprecated')
}

// Approve a logout request
function approveLogoutRequest(requestId, source = 'timer') {
  try {
    if (!requestId) {
      console.error('No request ID provided')
      return
    }

    showApprovalConfirmationModal(requestId, source)
  } catch (err) {
    console.error('Error initiating logout request approval:', err.message, err.stack)
    if (typeof showToast === 'function') {
      showToast('Error approving request: ' + err.message, 'error')
    } else {
      alert('Error approving request: ' + err.message)
    }
  }
}

// Show a confirmation modal for approval
function showApprovalConfirmationModal(requestId, source = 'timer') {
  const backdrop = document.createElement('div')
  backdrop.id = 'approvalConfirmBackdrop'
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    font-family: system-ui, -apple-system, sans-serif;
  `

  const modal = document.createElement('div')
  modal.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    animation: slideIn 0.3s ease-out;
  `

  modal.innerHTML = `
    <div style="margin-bottom: 20px;">
      <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 8px 0; color: #1f2937;">Approve Logout Request?</h2>
      <p style="font-size: 14px; color: #6b7280; margin: 0;">This employee will be allowed to sign out.</p>
    </div>
    
    <div style="display: flex; gap: 8px; justify-content: flex-end;">
      <button id="approvalCancel" type="button" style="
        padding: 8px 16px;
        border: 1px solid #d1d5db;
        background: white;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        color: #374151;
      ">Cancel</button>
      <button id="approvalConfirm" type="button" style="
        padding: 8px 16px;
        background: #10b981;
        color: white;
        border: 1px solid #10b981;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
      ">Approve</button>
    </div>
  `

  backdrop.appendChild(modal)
  document.body.appendChild(backdrop)

  const cancelBtn = modal.querySelector('#approvalCancel')
  const confirmBtn = modal.querySelector('#approvalConfirm')

  cancelBtn.addEventListener('click', () => {
    backdrop.remove()
  })

  confirmBtn.addEventListener('click', () => {
    backdrop.remove()
    processApproval(requestId, source)
  })

  // Allow Escape to cancel
  backdrop.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      backdrop.remove()
    }
  })
}

// Process the approval
async function processApproval(requestId, source = 'timer') {
  try {
    if (!requestId) {
      console.error('No request ID provided')
      return
    }

    if (typeof resolveLogoutApprovalsApi === 'function') {
      try {
        const endpoint = source === 'target'
          ? '/targets/early-logout/review'
          : '/timer/early-logout/review'
        const body = source === 'target'
          ? { request_id: parseInt(requestId, 10), decision: 'approved', comment: null }
          : { request_id: requestId, decision: 'approved', comment: null }

        await resolveLogoutApprovalsApi(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(body)
        })
        
        if (typeof showToast === 'function') {
          showToast(`Logout request approved`, 'success')
        } else {
          alert(`Request approved`)
        }
        
        // Refresh the display and badge
        setTimeout(() => {
          renderLogoutApprovals()
          refreshLogoutApprovalsBadge()
        }, 500)
        return
      } catch (err) {
        console.error('Backend approval failed:', err)
        if (typeof showToast === 'function') {
          showToast('Backend approval failed: ' + err.message, 'error')
        }
        return
      }
    } else {
      console.error('resolveLogoutApprovalsApi is not available')
      if (typeof showToast === 'function') {
        showToast('Backend API not available', 'error')
      }
      return
    }
  } catch (err) {
    console.error('Error processing approval:', err.message, err.stack)
    if (typeof showToast === 'function') {
      showToast('Error approving request: ' + err.message, 'error')
    } else {
      alert('Error approving request: ' + err.message)
    }
  }
}

// Reject a logout request
function rejectLogoutRequest(requestId, source = 'timer') {
  try {
    if (!requestId) {
      console.error('No request ID provided')
      return
    }

    showRejectionReasonModal(requestId, source)
  } catch (err) {
    console.error('Error initiating logout request rejection:', err.message, err.stack)
    if (typeof showToast === 'function') {
      showToast('Error rejecting request: ' + err.message, 'error')
    } else {
      alert('Error rejecting request: ' + err.message)
    }
  }
}

// Show a modal dialog for rejection reason
function showRejectionReasonModal(requestId, source = 'timer') {
  const backdrop = document.createElement('div')
  backdrop.id = 'rejectionReasonBackdrop'
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    font-family: system-ui, -apple-system, sans-serif;
  `

  const modal = document.createElement('div')
  modal.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    animation: slideIn 0.3s ease-out;
  `

  modal.innerHTML = `
    <div style="margin-bottom: 16px;">
      <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 8px 0; color: #1f2937;">Reject Logout Request</h2>
      <p style="font-size: 14px; color: #6b7280; margin: 0;">Please provide a reason for rejection</p>
    </div>
    
    <textarea id="rejectionReason" placeholder="Enter rejection reason..." style="
      width: 100%;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 10px;
      font-size: 14px;
      font-family: inherit;
      resize: vertical;
      min-height: 80px;
      box-sizing: border-box;
      margin-bottom: 16px;
    "></textarea>
    
    <div style="display: flex; gap: 8px; justify-content: flex-end;">
      <button id="rejectionCancel" type="button" style="
        padding: 8px 16px;
        border: 1px solid #d1d5db;
        background: white;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        color: #374151;
      ">Cancel</button>
      <button id="rejectionSubmit" type="button" style="
        padding: 8px 16px;
        background: #ef4444;
        color: white;
        border: 1px solid #ef4444;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
      ">Reject</button>
    </div>
  `

  backdrop.appendChild(modal)
  document.body.appendChild(backdrop)

  const reasonInput = modal.querySelector('#rejectionReason')
  const cancelBtn = modal.querySelector('#rejectionCancel')
  const submitBtn = modal.querySelector('#rejectionSubmit')

  // Focus the textarea
  setTimeout(() => reasonInput.focus(), 100)

  cancelBtn.addEventListener('click', () => {
    backdrop.remove()
  })

  submitBtn.addEventListener('click', () => {
    const reason = reasonInput.value.trim()
    backdrop.remove()
    processRejection(requestId, reason, source)
  })

  // Allow Enter key to submit
  reasonInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      const reason = reasonInput.value.trim()
      backdrop.remove()
      processRejection(requestId, reason, source)
    }
  })

  // Allow Escape to cancel
  backdrop.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      backdrop.remove()
    }
  })
}

// Process the rejection after getting the reason
async function processRejection(requestId, reason, source = 'timer') {
  try {
    if (!reason) {
      if (typeof showToast === 'function') {
        showToast('Please provide a rejection reason', 'error')
      }
      return
    }

    if (typeof resolveLogoutApprovalsApi === 'function') {
      try {
        const endpoint = source === 'target'
          ? '/targets/early-logout/review'
          : '/timer/early-logout/review'
        const body = source === 'target'
          ? { request_id: parseInt(requestId, 10), decision: 'rejected', comment: reason }
          : { request_id: requestId, decision: 'rejected', comment: reason }

        await resolveLogoutApprovalsApi(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(body)
        })
        
        if (typeof showToast === 'function') {
          showToast(`Logout request rejected`, 'success')
        } else {
          alert(`Request rejected`)
        }
        
        // Refresh the display and badge
        setTimeout(() => {
          renderLogoutApprovals()
          refreshLogoutApprovalsBadge()
        }, 500)
        return
      } catch (err) {
        console.error('Backend rejection failed:', err)
        if (typeof showToast === 'function') {
          showToast('Backend rejection failed: ' + err.message, 'error')
        }
        return
      }
    } else {
      console.error('resolveLogoutApprovalsApi is not available')
      if (typeof showToast === 'function') {
        showToast('Backend API not available', 'error')
      }
      return
    }
  } catch (err) {
    console.error('Error processing rejection:', err.message, err.stack)
    if (typeof showToast === 'function') {
      showToast('Error rejecting request: ' + err.message, 'error')
    } else {
      alert('Error rejecting request: ' + err.message)
    }
  }
}

// Add CSS styles for the dashboard
function installLogoutApprovalsStyles() {
  const styleId = 'crm-logout-approvals-styles'
  if (document.getElementById(styleId)) return

  const style = document.createElement('style')
  style.id = styleId
  style.textContent = `
    .btn.btn-success {
      background-color: #10b981;
      color: white;
      border: 1px solid #10b981;
      cursor: pointer;
      border-radius: 6px;
      transition: all 0.2s;
      pointer-events: auto;
    }
    
    .btn.btn-success:hover {
      background-color: #059669;
      border-color: #059669;
    }

    .btn.btn-success:active {
      transform: scale(0.98);
    }
    
    .btn.btn-danger {
      background-color: #ef4444;
      color: white;
      border: 1px solid #ef4444;
      cursor: pointer;
      border-radius: 6px;
      transition: all 0.2s;
      pointer-events: auto;
    }
    
    .btn.btn-danger:hover {
      background-color: #dc2626;
      border-color: #dc2626;
    }

    .btn.btn-danger:active {
      transform: scale(0.98);
    }
  `
  document.head.appendChild(style)
}

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    installLogoutApprovalsStyles()
    startLogoutRequestPolling()
  })
} else {
  installLogoutApprovalsStyles()
  startLogoutRequestPolling()
}

// Stop polling when page is unloaded
window.addEventListener('beforeunload', () => {
  stopLogoutRequestPolling()
})
