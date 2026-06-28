// ═══════════════════════════════════════════════════════════════
// CRM ADMIN LOGOUT APPROVALS - Manage Employee Logout Requests
// ═══════════════════════════════════════════════════════════════

// Render the logout approvals dashboard
async function renderLogoutApprovals() {
  const container = document.getElementById('logoutApprovalsBody')
  if (!container) return

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
        <td style="padding:12px;color:var(--gray-600);font-size:13px;">${requestedTime}</td>
        <td style="padding:12px;text-align:center;display:flex;gap:8px;justify-content:center;pointer-events:auto;">
          <button class="btn btn-success logout-approve-btn" data-request-id="${req.id}" type="button" style="padding:6px 12px;font-size:12px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>Approve
          </button>
          <button class="btn btn-danger logout-reject-btn" data-request-id="${req.id}" type="button" style="padding:6px 12px;font-size:12px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
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
        approveLogoutRequest(requestId)
      })
    })

    rejectButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        const requestId = btn.getAttribute('data-request-id')
        rejectLogoutRequest(requestId)
      })
    })
  }, 0)
}

// Get all logout requests from backend API
async function getLogoutRequests() {
  try {
    console.log('[LogoutApprovals] Attempting to fetch from backend API...')
    // Fetch from backend API only - no localStorage fallback
    if (typeof resolveCRMApiRequest === 'function') {
      const response = await resolveCRMApiRequest('/timer/early-logout/requests', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      })
      console.log('[LogoutApprovals] Backend API response:', response)
      if (response && Array.isArray(response)) {
        console.log('[LogoutApprovals] Got array from backend, length:', response.length)
        // Map backend response to frontend format
        return response.map(req => ({
          id: req.id,
          status: req.status,
          userName: req.requester_name || 'Unknown User',
          email: 'Employee', // requester_id is UUID, not email - use placeholder
          reason: req.request_reason || '(No reason provided)',
          requestedAt: req.requested_at || req.created_at,
          approvedBy: req.reviewer_name,
          approvedAt: req.reviewed_at,
          rejectedBy: req.reviewer_name,
          rejectedAt: req.reviewed_at,
          rejectionReason: req.review_comment
        }))
      }
      console.error('[LogoutApprovals] Backend response is not an array')
      return []
    } else {
      console.error('[LogoutApprovals] resolveCRMApiRequest is not available')
      return []
    }
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
function approveLogoutRequest(requestId) {
  try {
    if (!requestId) {
      console.error('No request ID provided')
      return
    }

    // Show confirmation modal
    showApprovalConfirmationModal(requestId)
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
function showApprovalConfirmationModal(requestId) {
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
    processApproval(requestId)
  })

  // Allow Escape to cancel
  backdrop.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      backdrop.remove()
    }
  })
}

// Process the approval
async function processApproval(requestId) {
  try {
    if (!requestId) {
      console.error('No request ID provided')
      return
    }

    // Approve via backend API only - no localStorage fallback
    if (typeof resolveCRMApiRequest === 'function') {
      try {
        const response = await resolveCRMApiRequest('/timer/early-logout/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            request_id: requestId,
            decision: 'approved',
            comment: null
          })
        })
        
        if (typeof showToast === 'function') {
          showToast(`Logout request approved`, 'success')
        } else {
          alert(`Request approved`)
        }
        
        // Refresh the display
        setTimeout(() => renderLogoutApprovals(), 500)
        return
      } catch (err) {
        console.error('Backend approval failed:', err)
        if (typeof showToast === 'function') {
          showToast('Backend approval failed: ' + err.message, 'error')
        }
        return
      }
    } else {
      console.error('resolveCRMApiRequest is not available')
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
function rejectLogoutRequest(requestId) {
  try {
    if (!requestId) {
      console.error('No request ID provided')
      return
    }

    // Show custom modal for rejection reason
    showRejectionReasonModal(requestId)
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
function showRejectionReasonModal(requestId) {
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
    processRejection(requestId, reason)
  })

  // Allow Enter key to submit
  reasonInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      const reason = reasonInput.value.trim()
      backdrop.remove()
      processRejection(requestId, reason)
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
async function processRejection(requestId, reason) {
  try {
    if (!reason) {
      if (typeof showToast === 'function') {
        showToast('Please provide a rejection reason', 'error')
      }
      return
    }

    // Reject via backend API only - no localStorage fallback
    if (typeof resolveCRMApiRequest === 'function') {
      try {
        const response = await resolveCRMApiRequest('/timer/early-logout/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            request_id: requestId,
            decision: 'rejected',
            comment: reason
          })
        })
        
        if (typeof showToast === 'function') {
          showToast(`Logout request rejected`, 'success')
        } else {
          alert(`Request rejected`)
        }
        
        // Refresh the display
        setTimeout(() => renderLogoutApprovals(), 500)
        return
      } catch (err) {
        console.error('Backend rejection failed:', err)
        if (typeof showToast === 'function') {
          showToast('Backend rejection failed: ' + err.message, 'error')
        }
        return
      }
    } else {
      console.error('resolveCRMApiRequest is not available')
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
  document.addEventListener('DOMContentLoaded', installLogoutApprovalsStyles)
} else {
  installLogoutApprovalsStyles()
}
