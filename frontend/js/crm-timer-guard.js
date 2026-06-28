const CRM_TIMER_GUARD_MODAL_ID = 'crmTimerGuardModal'
const CRM_TIMER_GUARD_TARGET_SEC = CRM_SESSION_TIMER_TARGET_SEC || 8 * 3600
const CRM_TIMER_GUARD_API_PATH = '/timer/early-logout'

function crmTimerGuardGetAuthToken() {
  const session = (() => {
    try { return JSON.parse(localStorage.getItem('crm_session') || '{}') } catch (e) { return {} }
  })()
  return session?.access_token || session?.token || session?.accessToken || null
}

function crmTimerGuardGetApiCandidates() {
  const candidates = []
  if (window.CRM_API_BASE) candidates.push(String(window.CRM_API_BASE).replace(/\/$/, ''))
  if (window.API_BASE) candidates.push(String(window.API_BASE).replace(/\/$/, ''))
  try {
    const storedBase = localStorage.getItem('crm_api_base')
    if (storedBase) candidates.push(String(storedBase).replace(/\/$/, ''))
  } catch (e) {
    /* ignore */
  }
  const host = window.location.hostname || 'localhost'
  const port = window.location.port ? ':' + window.location.port : ''
  const origin = window.location.protocol + '//' + host + port
  if (window.location.protocol === 'file:' || host === 'localhost' || host === '127.0.0.1') {
    candidates.push(origin)
  }
  if (origin) candidates.push(origin)
  return [...new Set(candidates.filter(Boolean))]
}

function crmTimerGuardRenderModal(request = null, statusMessage = '', isSubmitting = false) {
  let modal = document.getElementById(CRM_TIMER_GUARD_MODAL_ID)
  if (!modal) {
    modal = document.createElement('div')
    modal.id = CRM_TIMER_GUARD_MODAL_ID
    modal.style.position = 'fixed'
    modal.style.inset = '0'
    modal.style.background = 'rgba(0,0,0,0.45)'
    modal.style.display = 'flex'
    modal.style.alignItems = 'center'
    modal.style.justifyContent = 'center'
    modal.style.zIndex = '99999'
    modal.innerHTML = `
      <div style="width:100%;max-width:520px;background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 30px 90px rgba(0,0,0,0.18);">
        <div style="background:#7b1535;color:white;padding:20px 24px;display:flex;justify-content:space-between;align-items:start;gap:16px;">
          <div>
            <div style="font-size:20px;font-weight:800;line-height:1.1;">Logout guard</div>
            <div style="margin-top:6px;font-size:13px;opacity:.92;">8-hour shift enforcement with manager approval for early logout.</div>
          </div>
          <button type="button" id="crmTimerGuardCloseBtn" style="border:none;background:transparent;color:white;font-size:24px;line-height:1;cursor:pointer;">×</button>
        </div>
        <div style="padding:24px;display:grid;gap:18px;">
          <div id="crmTimerGuardStatusText" style="font-size:14px;color:#111;"></div>
          <div id="crmTimerGuardDetails" style="font-size:13px;color:#475569;line-height:1.6;"></div>
          <div id="crmTimerGuardInteractive" style="display:grid;gap:14px;"></div>
          <div id="crmTimerGuardMessage" style="font-size:13px;color:#7b1535;font-weight:700;"></div>
          <div style="display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;">
            <button type="button" id="crmTimerGuardCancelBtn" style="padding:12px 16px;border:1px solid #cbd5e1;background:white;color:#111;border-radius:12px;cursor:pointer;font-size:13px;">Close</button>
            <button type="button" id="crmTimerGuardActionBtn" style="padding:12px 16px;border:none;background:#7b1535;color:white;border-radius:12px;cursor:pointer;font-size:13px;">Request early logout</button>
          </div>
        </div>
      </div>`
    document.body.appendChild(modal)
    document.getElementById('crmTimerGuardCloseBtn')?.addEventListener('click', crmTimerGuardCloseModal)
    document.getElementById('crmTimerGuardCancelBtn')?.addEventListener('click', crmTimerGuardCloseModal)
  }

  const target = document.getElementById('crmTimerGuardInteractive')
  const statusText = document.getElementById('crmTimerGuardStatusText')
  const details = document.getElementById('crmTimerGuardDetails')
  const msg = document.getElementById('crmTimerGuardMessage')
  const actionBtn = document.getElementById('crmTimerGuardActionBtn')

  const workSec = crmTimer?.workSec || 0
  const remainingSec = Math.max(0, CRM_TIMER_GUARD_TARGET_SEC - workSec)
  const remainingText = formatCrmTimerTime(remainingSec)
  const workedText = formatCrmTimerTime(workSec)

  if (request) {
    statusText.textContent = `You have worked ${workedText}. Early logout request status: ${request.status.toUpperCase()}.`
    if (request.status === 'pending') {
      details.textContent = `A request was sent on ${new Date(request.requested_at).toLocaleString()}. Please wait for manager review.`
      actionBtn.textContent = 'Refresh request status'
      target.innerHTML = `
        <div style="padding:14px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;">
          <div style="font-size:13px;color:#334155;font-weight:700;">Requested reason</div>
          <div style="margin-top:8px;font-size:13px;color:#475569;white-space:pre-wrap;">${request.request_reason || 'No reason provided.'}</div>
        </div>`
    } else if (request.status === 'approved') {
      details.textContent = `Approved by ${request.reviewer_name || 'manager'} on ${request.reviewed_at ? new Date(request.reviewed_at).toLocaleString() : 'N/A'}.` 
      target.innerHTML = `
        <div style="padding:14px;border-radius:14px;background:#ecfdf5;border:1px solid #d1fae5;">
          <div style="font-size:13px;color:#065f46;">You may logout early because this request has been approved.</div>
        </div>`
      actionBtn.textContent = 'Continue to logout'
    } else if (request.status === 'rejected') {
      details.textContent = `Rejected by ${request.reviewer_name || 'manager'} on ${request.reviewed_at ? new Date(request.reviewed_at).toLocaleString() : 'N/A'}.` 
      target.innerHTML = `
        <div style="padding:14px;border-radius:14px;background:#fef2f2;border:1px solid #fecaca;">
          <div style="font-size:13px;color:#991b1b;">Your last request was rejected.</div>
          <div style="margin-top:8px;font-size:13px;color:#475569;white-space:pre-wrap;">${request.review_comment || 'No comment provided.'}</div>
        </div>
        <textarea id="crmTimerGuardReason" placeholder="Provide a clear reason for early logout" rows="4" style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:12px;font-size:13px;color:#0f172a;"></textarea>`
      actionBtn.textContent = 'Request again'
    } else {
      details.textContent = `The latest request is ${request.status}.` 
      target.innerHTML = `
        <textarea id="crmTimerGuardReason" placeholder="Describe why you need early logout" rows="4" style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:12px;font-size:13px;color:#0f172a;"></textarea>`
      actionBtn.textContent = 'Request early logout'
    }
  } else {
    if (remainingSec <= 0) {
      statusText.textContent = `You have worked ${workedText}, which meets the 8-hour shift requirement.`
      details.textContent = 'Logout is permitted without approval.'
      target.innerHTML = ''
      actionBtn.textContent = 'Continue to logout'
    } else {
      statusText.textContent = `You have worked ${workedText}. ${remainingText} remain to complete the required 8-hour shift.`
      details.textContent = 'Early logout requires manager approval unless 8 hours are completed.'
      target.innerHTML = `
        <textarea id="crmTimerGuardReason" placeholder="Describe why you need early logout" rows="4" style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:12px;font-size:13px;color:#0f172a;"></textarea>`
      actionBtn.textContent = 'Request early logout'
    }
  }

  msg.textContent = statusMessage || ''
  actionBtn.disabled = isSubmitting
  actionBtn.style.opacity = isSubmitting ? '0.65' : '1'

  actionBtn.onclick = async () => {
    if (isSubmitting) return
    if (request?.status === 'approved' || remainingSec <= 0) {
      crmTimerGuardCloseModal()
      crmTimerGuardProceedToLogout()
      return
    }
    if (request?.status === 'pending') {
      const refreshed = await crmTimerGuardGetLatestRequest()
      crmTimerGuardRenderModal(refreshed || request, 'Refresh complete. Current request status updated.')
      return
    }
    await crmTimerGuardSubmitRequest()
  }

  modal.style.display = 'flex'
}

function crmTimerGuardCloseModal() {
  const modal = document.getElementById(CRM_TIMER_GUARD_MODAL_ID)
  if (modal) modal.style.display = 'none'
}

function crmTimerGuardProceedToLogout() {
  if (typeof window.crmTimerGuardOriginalLogout === 'function') {
    window.crmTimerGuardOriginalLogout()
    return
  }
  if (typeof window.logout === 'function' && window.logout !== crmTimerGuardLogout) {
    window.logout()
    return
  }
  localStorage.removeItem('crm_session')
  window.location.href = 'login.html'
}

async function crmTimerGuardFetchJson(path, init = {}) {
  const authToken = crmTimerGuardGetAuthToken()
  const headers = {
    Accept: 'application/json',
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...(authToken ? { Authorization: authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}` } : {}),
    ...init.headers,
  }
  const candidates = crmTimerGuardGetApiCandidates()
  if (!candidates.length) return null

  for (const base of candidates) {
    const url = `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`
    try {
      const response = await fetch(url, {
        ...init,
        headers,
        credentials: 'include',
      })
      if (!response.ok) {
        if ([401, 403, 404].includes(response.status)) {
          continue
        }
        const text = await response.text().catch(() => '')
        throw new Error(`HTTP ${response.status}: ${text}`)
      }
      return await response.json()
    } catch (error) {
      console.warn('crm-timer-guard:', error)
    }
  }
  return null
}

async function crmTimerGuardGetLatestRequest() {
  return await crmTimerGuardFetchJson(`${CRM_TIMER_GUARD_API_PATH}/pending`)
}

async function crmTimerGuardSubmitRequest() {
  const reasonInput = document.getElementById('crmTimerGuardReason')
  const reasonText = reasonInput ? reasonInput.value.trim() : ''
  if (!reasonText) {
    crmTimerShowToast('Please describe why you are requesting early logout.', 'error')
    return
  }

  const workSeconds = crmTimer?.workSec || 0
  const payload = { work_seconds: workSeconds, request_reason: reasonText }
  const modal = document.getElementById(CRM_TIMER_GUARD_MODAL_ID)
  const message = document.getElementById('crmTimerGuardMessage')
  const actionBtn = document.getElementById('crmTimerGuardActionBtn')
  if (message) message.textContent = 'Submitting early logout request...' 
  if (actionBtn) actionBtn.disabled = true

  const result = await crmTimerGuardFetchJson(`${CRM_TIMER_GUARD_API_PATH}/request`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  if (!result) {
    if (message) message.textContent = 'Unable to submit request. Check your connection or authentication.'
    if (actionBtn) actionBtn.disabled = false
    return
  }

  crmTimerShowToast('Early logout request submitted. Awaiting manager review.', 'success')
  crmTimerGuardRenderModal(result, 'Your request has been sent to a manager.')
}

function crmTimerGuardIsAdmin() {
  const sessionData = localStorage.getItem('crm_session')
  if (!sessionData) return false
  try {
    const currentUser = JSON.parse(sessionData)
    return String(currentUser.role || '').toLowerCase() === 'admin'
  } catch (error) {
    return false
  }
}

async function crmTimerGuardCheckPerformanceLogout() {
  const response = await crmTimerGuardFetchJson('/performance/logout-check', {
    method: 'POST',
    headers: { 'Accept': 'application/json' }
  })
  return response
}

async function crmTimerGuardLogout(event) {
  if (event && typeof event.preventDefault === 'function') {
    event.preventDefault()
  }

  // Check if admin can logout directly
  try {
    const sessionStr = localStorage.getItem('crm_session')
    if (sessionStr) {
      const session = JSON.parse(sessionStr)
      if (session && session.role === 'admin') {
        // Admin can logout directly
        if (typeof performDirectLogout === 'function') {
          performDirectLogout()
          return
        }
      }
    }
  } catch (e) {
    console.warn('Error checking session in timer guard logout:', e)
  }

  // Non-admin users require approval - call original logout
  if (typeof window.crmTimerGuardOriginalLogout === 'function') {
    window.crmTimerGuardOriginalLogout(event)
    return
  }

  // Fallback: show approval modal
  if (typeof showLogoutApprovalModal === 'function') {
    showLogoutApprovalModal()
    return
  }
}

function crmTimerGuardInstall() {
  // All users require approval for logout (including admins)
  if (typeof window.logout === 'function' && window.crmTimerGuardOriginalLogout === undefined) {
    window.crmTimerGuardOriginalLogout = window.logout
  }
  window.logout = crmTimerGuardLogout
  const logoutButtons = document.querySelectorAll('.sb-logout')
  logoutButtons.forEach(btn => {
    btn.removeAttribute('onclick')
    btn.addEventListener('click', crmTimerGuardLogout)
  })
}

window.addEventListener('DOMContentLoaded', () => {
  crmTimerGuardInstall()
})
