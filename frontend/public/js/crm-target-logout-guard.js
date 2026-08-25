/**
 * CRM Target Logout Guard - Blocks logout until targets are met
 */
(function () {
  const MODAL_ID = 'crmTargetLogoutModal'

  function getAuthHeaders() {
    const session = (() => {
      try { return JSON.parse(localStorage.getItem('crm_session') || '{}') } catch (e) { return {} }
    })()
    const token = session?.access_token || session?.token || ''
    return token ? { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' }
  }

  function getApiBase() {
    if (window.getCRMApiBase) return window.getCRMApiBase()
    if (window.CRM_API_BASE) return window.CRM_API_BASE
    return 'http://127.0.0.1:8085'
  }

  function closeModal() {
    const m = document.getElementById(MODAL_ID)
    if (m) m.remove()
  }

  function showModal(data) {
    closeModal()
    const modal = document.createElement('div')
    modal.id = MODAL_ID
    modal.className = 'target-logout-modal'
    modal.innerHTML = `
      <div class="target-logout-content">
        <div class="target-logout-header">
          <h3 style="margin:0;font-size:18px;">Pending Targets</h3>
          <p style="margin:6px 0 0;font-size:13px;opacity:0.9;">You cannot logout until your daily targets are complete.</p>
        </div>
        <div class="target-logout-body">
          <p style="font-size:14px;color:#374151;line-height:1.6;">${data.message || 'You still have pending targets.'}</p>
          <div class="target-logout-stats">
            <div class="target-logout-stat"><div class="num">${data.remaining_calls || 0}</div><div class="lbl">Remaining Calls</div></div>
            <div class="target-logout-stat"><div class="num">${data.remaining_leads || 0}</div><div class="lbl">Remaining Leads</div></div>
            <div class="target-logout-stat"><div class="num">${data.carry_forward_calls || 0}</div><div class="lbl">Carry Fwd Calls</div></div>
            <div class="target-logout-stat"><div class="num">${data.carry_forward_leads || 0}</div><div class="lbl">Carry Fwd Leads</div></div>
          </div>
          <div id="targetLogoutRequestForm" style="display:none;margin-top:12px;">
            <textarea id="targetLogoutReason" rows="3" placeholder="Reason for early logout (required)"
              style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;"></textarea>
            <textarea id="targetLogoutNote" rows="2" placeholder="Supporting note (optional)"
              style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;margin-top:8px;"></textarea>
            <div id="targetLogoutMsg" style="font-size:13px;color:#dc2626;margin-top:8px;"></div>
          </div>
          <div class="target-logout-actions">
            <button class="btn-return" id="targetLogoutReturn">Return to Dashboard</button>
            <button class="btn-request" id="targetLogoutRequest">Request Early Logout</button>
          </div>
        </div>
      </div>`
    document.body.appendChild(modal)

    document.getElementById('targetLogoutReturn').onclick = closeModal
    modal.onclick = (e) => { if (e.target === modal) closeModal() }

    const requestBtn = document.getElementById('targetLogoutRequest')
    const form = document.getElementById('targetLogoutRequestForm')
    let formVisible = false

    requestBtn.onclick = async () => {
      if (!formVisible) {
        form.style.display = 'block'
        formVisible = true
        requestBtn.textContent = 'Submit Request'
        return
      }
      const reason = document.getElementById('targetLogoutReason')?.value?.trim()
      const note = document.getElementById('targetLogoutNote')?.value?.trim()
      const msgEl = document.getElementById('targetLogoutMsg')
      if (!reason || reason.length < 5) {
        if (msgEl) msgEl.textContent = 'Please provide a reason (min 5 characters).'
        return
      }
      requestBtn.disabled = true
      try {
        const resp = await fetch(`${getApiBase()}/targets/early-logout/request`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ reason, supporting_note: note }),
        })
        if (resp.ok) {
          if (msgEl) msgEl.style.color = '#059669'
          if (msgEl) msgEl.textContent = 'Request submitted. Awaiting admin approval.'
          requestBtn.textContent = 'Request Sent'
        } else {
          const err = await resp.json().catch(() => ({}))
          if (msgEl) msgEl.textContent = err.detail || 'Request failed.'
          requestBtn.disabled = false
        }
      } catch (e) {
        if (msgEl) msgEl.textContent = 'Network error. Try again.'
        requestBtn.disabled = false
      }
    }
  }

  async function checkTargetLogout() {
    const role = (window.S?.role || '').toLowerCase()
    if (role !== 'employee') return { can_logout: true }

    try {
      const resp = await fetch(`${getApiBase()}/targets/logout-check`, {
        method: 'POST',
        headers: getAuthHeaders(),
      })
      if (!resp.ok) return { can_logout: true }
      const data = await resp.json()
      return { can_logout: data.can_logout, data }
    } catch (e) {
      // Backend unavailable — fall back to client-side TargetsEngine if present
      try {
        if (window.TargetsEngine && typeof window.TargetsEngine.computeForCurrentUser === 'function') {
          const local = window.TargetsEngine.computeForCurrentUser()
          if (local) {
            const allowed = (local.calls_remaining <= 0 && local.leads_remaining <= 0)
            return { can_logout: allowed, data: local }
          }
        }
      } catch (inner) {}
      return { can_logout: true }
    }
  }

  window.CRMTargetLogoutGuard = {
    async interceptLogout() {
      const result = await checkTargetLogout()
      if (result.can_logout) return true
      showModal(result.data || {})
      return false
    },
    check: checkTargetLogout,
  }

  const origCanLogout = window.canLogoutWithBackend
  window.canLogoutWithBackend = async function () {
    const role = (window.S?.role || '').toLowerCase()
    if (role === 'employee' && window.CRMTargetLogoutGuard) {
      const result = await window.CRMTargetLogoutGuard.check()
      if (!result.can_logout) {
        return { allowed: false, ...result.data }
      }
    }
    if (typeof origCanLogout === 'function') return origCanLogout()
    return { allowed: true }
  }
})()
