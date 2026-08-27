
// Calculate lead age in days from creation date
function calculateLeadAge(createdDate) {
  if (!createdDate) return '—'
  const leadDate = new Date(createdDate)
  if (isNaN(leadDate.getTime())) return '—'
  const today = new Date()
  const diffTime = Math.abs(today - leadDate)
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return diffDays + ' days'
}

function submitSOD() {
  if (handleRestrictedReportSubmitAttempt('SOD')) return
  const industry = document.getElementById('sIndustry')?.value?.trim()
  const target = document.getElementById('sTarget')?.value?.trim()
  const dateRaw = document.getElementById('sDate')?.value

  if (!industry) { showToast('Please enter the Focus Industry/Segment.', 'error'); return }
  if (!target) { showToast('Please enter your Target for Today.', 'error'); return }
  if (!dateRaw) { showToast('Please select a date.', 'error'); return }

  const supportVal = supportSelected === 'Yes' ? 'Yes – ' + document.getElementById('sSupport')?.value?.trim() : 'No'

  const entry = {
    id: 'SOD-' + Date.now(),
    timestamp: new Date().toLocaleString('en-IN'),
    email: S.email,
    date: fmtDate(dateRaw),
    salesExecutive: S.name,
    createdBy: S.email,
    createdByName: S.name,
    territory: document.getElementById('sTerritory')?.value?.trim() || '',
    targetLeads: target,
    keyMeetings: document.getElementById('sMeetings')?.value?.trim() || '',
    industry,
    supportNeeded: supportVal,
    remarks: document.getElementById('sRemarks')?.value?.trim() || '',
    aiScore1: parseInt(document.getElementById('sScore1')?.value) || 70,
    aiScore2: parseInt(document.getElementById('sScore2')?.value) || 65,
    aiScore3: parseInt(document.getElementById('sScore3')?.value) || 60,
    isHistorical: false
  }

  const btn = document.getElementById('sodSubmitBtn')
  if (btn) {
    btn.disabled = true
    btn.innerHTML = '<div class="spinner"></div> Submitting…'
  }

  // Save to backend FIRST - localStorage is only for caching
  if (typeof saveBackendReport === 'function') {
    saveBackendReport('sod', {
      report_date: dateRaw,
      sales_executive: entry.salesExecutive,
      email: entry.email,
      territory_region: entry.territory,
      target_for_today: entry.targetLeads,
      key_meetings_planned: entry.keyMeetings,
      focus_industry_segment: entry.industry,
      support_needed: entry.supportNeeded,
      support_description: supportSelected === 'Yes' ? document.getElementById('sSupport')?.value?.trim() || '' : '',
      remarks: entry.remarks,
      ai_score: Math.round((entry.aiScore1 + entry.aiScore2 + entry.aiScore3) / 3),
      ai_suggestions: ''
    }, 'SOD report').then(result => {
      console.debug('SOD backend saved:', result);
      // Only cache to localStorage AFTER successful backend save
      const d = getSOD()
      d.push(entry)
      saveSOD(d)
      console.debug('SOD cached locally:', entry.id, 'totalSOD=', getSOD().length)
      
      // Firebase sync (optional)
      if (typeof saveFirebaseEntry === 'function') {
        saveFirebaseEntry('sodReports', entry).catch(err => console.warn('Firebase SOD save failed', err))
      }

      notifyAdminReportSubmission({
        type: 'sod_submitted',
        title: 'SOD Report Submitted',
        message: `${entry.salesExecutive} submitted a SOD report for ${entry.date}.`,
        relatedId: entry.id
      })

      // Reset form
      const sTarget = document.getElementById('sTarget')
      const sIndustry = document.getElementById('sIndustry')
      const sMeetings = document.getElementById('sMeetings')
      const sRemarks = document.getElementById('sRemarks')
      if (sTarget) sTarget.value = ''
      if (sIndustry) sIndustry.value = ''
      if (sMeetings) sMeetings.value = ''
      if (sRemarks) sRemarks.value = ''
      setSupportToggle('No')

      if (btn) {
        btn.disabled = false
        btn.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Submit SOD Report'
      }

      showToast('SOD report submitted successfully', 'success')
      renderDashboard()
      try { renderSODHistory() } catch (e) { /* ignore if view not present */ }
    }).catch(err => {
      console.error('SOD backend save failed, falling back to local cache:', err);
      // Fallback: cache locally so user doesn't lose the entry
      try {
        const d = getSOD()
        d.push(entry)
        saveSOD(d)
        console.debug('SOD cached locally (offline fallback):', entry.id)
        showToast('SOD saved locally (offline). Will sync when backend is available.', 'info')
        renderDashboard()
        try { renderSODHistory() } catch (e) {}
      } catch (cacheErr) {
        console.error('Failed to cache SOD locally as fallback:', cacheErr)
        showToast('Failed to save SOD. Please try again.', 'error')
      }
      if (btn) {
        btn.disabled = false
        btn.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Submit SOD'
      }
    });
  } else {
    console.error('Backend save function not available');
    showToast('Backend unavailable. Cannot save SOD.', 'error');
    if (btn) {
      btn.disabled = false
      btn.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Submit SOD'
    }
  }
}

function isRestrictedReportSubmitUser() {
  return typeof S !== 'undefined' && S && String(S.role || '').toLowerCase() === 'admin'
}

function handleRestrictedReportSubmitAttempt(reportType) {
  if (!isRestrictedReportSubmitUser()) return false
  showToast('Report submission is disabled for admin users.', 'warning')
  console.warn(`Blocked restricted report submission attempt: ${reportType}`)
  return true
}

const ADMIN_REPORT_NOTIFICATION_EMAIL = 'shree.rathod@fundingsathi.in'
const ADMIN_REPORT_NOTIFICATION_NAME = 'Shree Rathod'
const ADMIN_REPORT_ONLY_EMAIL = 'shree.rathod@fundingsathi.in'

function applyRestrictedReportSubmitBehavior() {
  const shouldHide = isRestrictedReportSubmitUser()
  const submitButtons = ['sodSubmitBtn', 'eodSubmitBtn', 'wodSubmitBtn']
  submitButtons.forEach((id) => {
    const btn = document.getElementById(id)
    if (!btn) return
    if (shouldHide) {
      btn.style.display = 'none'
      btn.disabled = true
      btn.setAttribute('aria-hidden', 'true')
      btn.setAttribute('data-restricted-report-submit', 'true')
    } else {
      btn.style.display = ''
      btn.disabled = false
      btn.removeAttribute('aria-hidden')
      btn.removeAttribute('data-restricted-report-submit')
    }
  })

  const navButtons = ['sod-form', 'eod-form', 'wod-form']
  navButtons.forEach((sec) => {
    const navBtn = document.querySelector(`.nav-btn[data-sec="${sec}"]`)
    if (!navBtn) return
    if (shouldHide) {
      navBtn.remove()
    } else {
      navBtn.style.display = ''
      navBtn.removeAttribute('aria-hidden')
      navBtn.removeAttribute('data-restricted-report-nav')
    }
  })

  const reportSections = ['sec-sod-form', 'sec-eod-form', 'sec-wod-form']
  reportSections.forEach((id) => {
    const section = document.getElementById(id)
    if (!section) return
    if (shouldHide) {
      section.remove()
    } else {
      section.style.display = ''
    }
  })
}

function notifyAdminReportSubmission(notification = {}) {
  if (typeof S === 'undefined' || !S) {
    console.warn('notifyAdminReportSubmission: No session found')
    return
  }

  // Always route admin report notifications only to Shree Rathod
  const recipients = [ADMIN_REPORT_ONLY_EMAIL]

  console.debug('Admin users found: only Shree Rathod')
  console.debug('Current user:', S.email, S.role)

  const adminNotification = {
    type: notification.type || 'report_submission',
    title: notification.title || 'Report Submitted',
    message: notification.message || '',
    relatedId: notification.relatedId || notification.id || '',
    createdAt: new Date().toISOString(),
    read: false,
    recipients: recipients,
    recipientEmail: recipients[0] || ADMIN_REPORT_NOTIFICATION_EMAIL,
    recipientName: ADMIN_REPORT_NOTIFICATION_NAME
  }

  console.debug('Creating notification:', adminNotification)

  if (typeof createNotification === 'function') {
    createNotification(adminNotification)
  } else {
    if (!DataStore.get('notifications')) {
      const data = DataStore.getAll()
      data.notifications = []
      DataStore.saveAll(data)
    }
    DataStore.add('notifications', adminNotification)
    if (typeof updateNotificationBadge === 'function') updateNotificationBadge()
    if (typeof renderNotificationPanel === 'function') renderNotificationPanel()
  }
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderReportCell(value, maxWidth = 220) {
  const displayValue = value === null || value === undefined ? '—' : String(value)
  const safeValue = escapeHtml(displayValue)
  return `<td style="padding:12px 14px;max-width:${maxWidth}px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;" title="${safeValue}" data-full-text="${safeValue}" onclick="showEODDetail(event)">${safeValue}</td>`
}

function showEODDetail(event) {
  event = event || window.event
  const td = event.currentTarget || event.target
  const fullText = td?.dataset?.fullText || td?.textContent || ''
  if (!fullText) return

  const overlay = document.createElement('div')
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.72);display:flex;align-items:center;justify-content:center;padding:20px;z-index:99999;'
  overlay.onclick = e => { if (e.target === overlay) overlay.remove() }

  const panel = document.createElement('div')
  panel.style.cssText = 'width:min(860px,100%);max-height:80vh;overflow:hidden;border-radius:18px;background:#ffffff;box-shadow:0 24px 80px rgba(0,0,0,0.24);'

  const header = document.createElement('div')
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid #e5e7eb;'

  const title = document.createElement('div')
  title.textContent = 'Full text'
  title.style.cssText = 'font-size:16px;font-weight:700;color:#111827;'

  const closeButton = document.createElement('button')
  closeButton.type = 'button'
  closeButton.textContent = 'Close'
  closeButton.style.cssText = 'border:none;background:#111827;color:#ffffff;padding:10px 16px;border-radius:10px;cursor:pointer;font-size:14px;'
  closeButton.onclick = () => overlay.remove()

  const body = document.createElement('div')
  body.style.cssText = 'padding:20px;max-height:calc(80vh - 80px);overflow:auto;white-space:pre-wrap;word-break:break-word;color:#111827;font-size:14px;line-height:1.7;'
  body.textContent = fullText

  header.appendChild(title)
  header.appendChild(closeButton)
  panel.appendChild(header)
  panel.appendChild(body)
  overlay.appendChild(panel)
  document.body.appendChild(overlay)
}

function parseAnnualTurnoverInCrores(value) {
  if (!value) return 0
  const text = String(value).trim().toLowerCase().replace(/[₹,]/g, '')
  const croreMatch = text.match(/([\d.]+)\s*(cr|crore|crores)\b/)
  if (croreMatch) return Number(croreMatch[1]) || 0
  const lakhMatch = text.match(/([\d.]+)\s*(lakh|lac|lakhs)\b/)
  if (lakhMatch) return (Number(lakhMatch[1]) || 0) / 100
  const num = Number(text)
  if (Number.isNaN(num)) return 0
  if (num >= 10000000) return num / 10000000
  if (num >= 100000) return num / 100000
  return num
}

function normalizeSODRow(row) {
  if (!row || typeof row !== 'object') return row;
  const normalized = { ...row };

  if ((!normalized.date || normalized.date === '') && normalized.date_col) {
    normalized.date = normalized.date_col;
  }
  if ((!normalized.salesExecutive || normalized.salesExecutive === '') && normalized.sales_executive_name) {
    normalized.salesExecutive = normalized.sales_executive_name;
  }
  if ((!normalized.salesExecutive || normalized.salesExecutive === '') && normalized.sales_executive) {
    normalized.salesExecutive = normalized.sales_executive;
  }
  if ((!normalized.salesExecutive || normalized.salesExecutive === '') && normalized.assignedEmployee) {
    normalized.salesExecutive = normalized.assignedEmployee;
  }
  if ((!normalized.salesExecutive || normalized.salesExecutive === '') && normalized.assignedEmployeeName) {
    normalized.salesExecutive = normalized.assignedEmployeeName;
  }
  if ((!normalized.salesExecutive || normalized.salesExecutive === '') && normalized.assigned_to) {
    normalized.salesExecutive = normalized.assigned_to;
  }
  if ((!normalized.salesExecutive || normalized.salesExecutive === '') && normalized.assignedTo) {
    normalized.salesExecutive = normalized.assignedTo;
  }
  if ((!normalized.createdBy || normalized.createdBy === '') && normalized.createdByName) {
    normalized.createdBy = normalized.createdByName;
  }
  if ((!normalized.createdBy || normalized.createdBy === '') && normalized['Created By']) {
    normalized.createdBy = normalized['Created By'];
  }
  if ((!normalized.createdBy || normalized.createdBy === '') && normalized.created_by) {
    normalized.createdBy = normalized.created_by;
  }
  if ((!normalized.targetLeads || normalized.targetLeads === '') && normalized.target_for_today) {
    normalized.targetLeads = normalized.target_for_today;
  }
  if ((!normalized.leads || normalized.leads === '') && normalized.number_of_leads) {
    normalized.leads = normalized.number_of_leads;
  }
  if ((!normalized.leads || normalized.leads === '') && normalized.numberOfLeads) {
    normalized.leads = normalized.numberOfLeads;
  }
  if ((!normalized.leads || normalized.leads === '') && normalized.eLeads) {
    normalized.leads = normalized.eLeads;
  }
  if ((!normalized.keyMeetings || normalized.keyMeetings === '') && normalized.key_meetings_planned) {
    normalized.keyMeetings = normalized.key_meetings_planned;
  }
  if ((!normalized.supportNeeded || normalized.supportNeeded === '') && normalized.support_needed) {
    normalized.supportNeeded = normalized.support_needed;
  }
  if ((!normalized.supportDescription || normalized.supportDescription === '') && normalized.support_description) {
    normalized.supportDescription = normalized.support_description;
  }
  if ((!normalized.aiScore || normalized.aiScore === '') && normalized.ai_score) {
    normalized.aiScore = normalized.ai_score;
  }
  if ((!normalized.territory || normalized.territory === '') && normalized.territory_region) {
    normalized.territory = normalized.territory_region;
  }
  if ((!normalized.industry || normalized.industry === '') && normalized.focus_industry_segment) {
    normalized.industry = normalized.focus_industry_segment;
  }
  if ((!normalized.industry || normalized.industry === '') && normalized.focus_industry) {
    normalized.industry = normalized.focus_industry;
  }
  if ((!normalized.dealsMovedNextStage || normalized.dealsMovedNextStage === '') && normalized.deals_moved) {
    normalized.dealsMovedNextStage = normalized.deals_moved;
  }
  if ((!normalized.challengesFaced || normalized.challengesFaced === '') && normalized.challenges_faced) {
    normalized.challengesFaced = normalized.challenges_faced;
  }

  delete normalized.date_col;
  delete normalized.sales_executive_name;
  delete normalized.sales_executive;
  delete normalized.assignedEmployee;
  delete normalized.assignedEmployeeName;
  delete normalized.assigned_to;
  delete normalized.assignedTo;
  delete normalized.createdByName;
  delete normalized['Created By'];
  delete normalized.created_by;
  delete normalized.target_for_today;
  delete normalized.support_needed;
  delete normalized.number_of_leads;
  delete normalized.numberOfLeads;
  delete normalized.eLeads;
  delete normalized.e_leads;
  delete normalized.ai_score;
  delete normalized.key_meetings;
  delete normalized.territory_region;
  delete normalized.focus_industry;
  delete normalized.deals_moved;
  delete normalized.challenges_faced;

  return normalized;
}

function getSODTableKeys(rows) {
  const priority = [
    'timestamp', 'salesExecutive', 'email', 'territory', 'targetLeads', 'leads', 'keyMeetings', 'industry', 'supportNeeded', 'remarks'
  ];
  const allowed = new Set(priority);
  const excluded = new Set(['id', 'ai_suggestions', 'aiScore']);
  const keys = new Set();

  rows.forEach(row => Object.keys(row || {}).forEach(k => {
    if (!excluded.has(k) && allowed.has(k)) keys.add(k)
  }));

  const ordered = priority.filter(k => keys.has(k));
  const activeKeys = ordered.filter(k => rows.some(row => {
    const value = row?.[k];
    return value !== null && value !== undefined && String(value).trim() !== '';
  }));

  return activeKeys;
}

function formatTableHeaderLabel(key) {
  const headerLabels = {
    id: 'ID',
    timestamp: 'Timestamp',
    date: 'Date',
    salesExecutive: 'Sales Executive',
    createdByName: 'Name',
    createdBy: 'Created By',
    email: 'Email',
    territory: 'Territory / Region',
    targetLeads: 'Target for Today (₹/Units)',
    keyMeetings: 'Key Meetings Planned',
    focus_industry: 'Focus Industry/Segment',
    industry: 'Focus Industry/Segment',
    supportNeeded: 'Support Needed',
    supportDescription: 'Support Description',
    remarks: 'Remarks',
    aiScore: 'AI Score',
    aiScore1: 'Productivity',
    aiScore2: 'Pipeline',
    aiScore3: 'Activity',
    isHistorical: 'Historical',
    callsMade: 'Number of Calls Made',
    meetingsHeld: 'Number of Meetings Held',
    leads: 'Number of Leads',
    keyClients: 'Key Clients Spoken To',
    dealsMovedNextStage: 'Deals Moved to Next Stage',
    challengesFaced: 'Challenges Faced',
    learnings: 'Learnings Today',
    leads: 'Number of Leads',
    score: 'Score'
  };
  if (headerLabels[key]) return headerLabels[key];
  return String(key)
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, str => str.toUpperCase());
}

function buildSODTable(rows) {
  const normalizedRows = rows.map(normalizeSODRow);
  const keys = getSODTableKeys(normalizedRows);

  const header = '<thead><tr>' + keys.map(k => {
    const label = formatTableHeaderLabel(k);
    return `<th style="padding:12px 14px;border-bottom:1px solid #e5e7eb;text-align:left;white-space:normal;word-break:break-word;hyphens:auto;">${escapeHtml(label)}</th>`
  }).join('') + '</tr></thead>';

  const body = '<tbody>' + normalizedRows.map(row => '<tr>' + keys.map(k => {
    let value = row[k];
    if (value === null || value === undefined) value = '';
    if (typeof value === 'object') value = JSON.stringify(value);
    return renderReportCell(value)
  }).join('') + '</tr>').join('') + '</tbody>';

  return `<table style="width:100%;min-width:1200px;border-collapse:collapse;font-size:13px;table-layout:auto;">${header}${body}</table>`;
}

function renderSODHistory() {
  const q = document.getElementById('histSearch')?.value?.toLowerCase() || ''
  const execF = document.getElementById('histExecF')?.value || ''
  const monthF = document.getElementById('histMonthF')?.value || ''
  let leads = mySOD()

  if (q) leads = leads.filter(l =>
    (l.salesExecutive && l.salesExecutive.toLowerCase().includes(q)) ||
    (l.industry && l.industry.toLowerCase().includes(q)) ||
    (l.targetLeads && l.targetLeads.toLowerCase().includes(q)) ||
    (l.territory && l.territory.toLowerCase().includes(q)) ||
    (l.keyMeetings && l.keyMeetings.toLowerCase().includes(q)) ||
    (l.remarks && l.remarks.toLowerCase().includes(q)) ||
    (l.email && l.email.toLowerCase().includes(q))
  )

  if (execF) leads = leads.filter(l => l.salesExecutive === execF)
  if (monthF) leads = leads.filter(l => {
    const [d, m, y] = (l.date || '').split('/')
    return y && m && `${y}-${m}` === monthF
  })
  const histDateF = document.getElementById('histDateF')?.value || ''
  if (histDateF) {
    const [filterYear, filterMonth, filterDay] = histDateF.split('-').map(Number)
    leads = leads.filter(l => {
      const leadDate = parseLeadDate(l.date || '')
      if (!leadDate) return false
      return leadDate.getFullYear() === filterYear &&
        leadDate.getMonth() === filterMonth - 1 &&
        leadDate.getDate() === filterDay
    })
  }

  const employees = Array.from(new Set(leads.map(l => l.salesExecutive).filter(Boolean))).sort()
  const histExecF = document.getElementById('histExecF')
  if (histExecF) {
    const currentValue = histExecF.value || ''
    histExecF.innerHTML = '<option value="">All Executives</option>' + employees.map(emp => `<option value="${emp}">${emp}</option>`).join('')
    histExecF.value = currentValue
  }

  const tableContainer = document.getElementById('sodHistTableContainer')
  const showing = document.getElementById('sodHistCount')

  if (showing) showing.textContent = leads.length

  if (tableContainer) {
    if (leads.length === 0) {
      tableContainer.innerHTML = '<div style="padding:40px;text-align:center;color:var(--gray-400);">No SOD reports found</div>'
    } else {
      tableContainer.innerHTML = buildSODTable(leads.slice().reverse())
    }
  }
}

function setDealDetailText(selector, text) {
  const el = document.querySelector('.' + selector)
  if (el) el.textContent = text === null || text === undefined ? '—' : String(text)
}

if (typeof window !== 'undefined') {
  window.setDealDetailText = window.setDealDetailText || setDealDetailText
}

// ═══════════════════════════════════════════════════════════════
// Deal detail modal: fetch from backend and populate modal fields
async function openDealDetail(id) {
  if (!id) return
  const modal = document.getElementById('dealDetailModal')
  const backdrop = document.getElementById('modalBackdrop')
  const lookupLeadId = Number.parseInt(String(id || '').replace(/[^0-9]/g, ''), 10)
  const detailLeadId = Number.isFinite(lookupLeadId) ? lookupLeadId : id
  const setDetailField = (selector, text) => {
    const el = document.querySelector('.' + selector)
    if (el) {
      el.textContent = text === null || text === undefined ? '—' : String(text)
    }
  }

  window.currentDealId = id
  if (modal) modal.style.display = 'flex'
  if (backdrop) backdrop.style.display = 'block'

  const resolveBackendLeadId = (deal) => {
    const candidates = [
      deal?.lead_id,
      deal?.leadId,
      deal?.deal_id,
      deal?.dealId,
      deal?.id,
      detailLeadId,
      id
    ]

    for (const candidate of candidates) {
      const numeric = Number.parseInt(String(candidate || '').replace(/[^0-9]/g, ''), 10)
      if (Number.isFinite(numeric) && numeric > 0) {
        return numeric
      }
    }

    return null
  }

  const populateDealFields = (deal) => {
    const stage = String(deal.stage || deal.status || deal.pipeline_stage || '').trim()
    const statusText = stage ? statusLabel(stage) : 'Open'
    const lastUpdated = deal.updatedAt || deal.updated_at || deal.modifiedAt || deal.modified_at || deal.lastActivity || deal.last_activity || ''

    setDetailField('detail-deal-name', deal.deal_name || deal.name || deal.company_name || deal.company || '—')
    setDetailField('detail-deal-id', deal.id || deal.dealId || deal.leadId || deal.lead_id || deal.deal_id || deal.uid || id)
    setDetailField('detail-deal-status', statusText)
    setDetailField('detail-deal-updated', lastUpdated ? formatDateTime(lastUpdated) : 'Last updated just now')
    setDetailField('detail-deal-value', formatINR(deal.loan_amount || deal.deal_value || deal.value || deal.loanAmount || deal.expected_revenue || deal.weighted_revenue || 0))
    setDetailField('detail-expected-revenue', formatINR(deal.expected_revenue || 0))
    setDetailField('detail-weighted-revenue', formatINR(deal.weighted_revenue || 0))
    setDetailField('detail-pf-revenue', formatINR(deal.pf_revenue || 0))
    setDetailField('detail-revenue-sharing', formatINR(deal.revenue_sharing || 0))
    setDetailField('detail-platform-charges', formatINR(deal.platform_charges || 0))
    setDetailField('detail-tranche-charges', formatINR(deal.tranche_charges || 0))
    setDetailField('detail-advisory-fees', formatINR(deal.advisory_fees || 0))
    setDetailField('detail-renewal-charges', formatINR(deal.renewal_charges || 0))
    setDetailField('detail-other-charges', formatINR(deal.other_charges || 0))
    setDetailField('detail-deal-sanctioned', formatINR(deal.sanctioned_amount || deal.sanctionedAmount || deal.sanction_amount || 0))
    setDetailField('detail-deal-disbursed', formatINR(deal.disbursed_amount || deal.disbursedAmount || deal.disbursement_amount || 0))
    setDetailField('detail-expected-close', deal.disbursement_date || deal.expectedClose || deal.expected_close || deal.mandate_date || deal.first_tranche_date || deal.closeDate || deal.close_date || '—')
    setDetailField('detail-account', deal.company_name || deal.company || deal.accountName || deal.account_name || '—')
    setDetailField('detail-owner', deal.rm_name || deal.relationship_manager || deal.assignedTo || deal.salesExecutive || deal.assigned_employee || deal.assignee || '—')
    setDetailField('detail-stage', stage || '—')
    setDetailField('detail-probability', ((deal.probability || deal.stage_probability || deal.probabilityPercent || deal.probability_value || 0) + '%'))
    setDetailField('detail-source', deal.source || deal.leadSource || deal.sourceOfLead || deal.lead_source || '—')
    setDetailField('detail-description', deal.description || deal.notes || deal.deal_summary || deal.summary || '—')
    setDetailField('detail-created', formatDateTime(deal.createdAt || deal.created_at || deal.stageEnteredAt || deal.lastActivity || '—'))
    setDetailField('detail-first-meeting', deal.first_meeting || deal.firstMeeting || '—')
    setDetailField('detail-mandate-received', deal.mandate_date || deal.mandateDate || '—')
    setDetailField('detail-proposal', deal.lender_proposal || deal.proposal || deal.lenderProposal || '—')
    setDetailField('detail-sanctioned-on', deal.sanction_date || deal.sanctionDate || '—')
    setDetailField('detail-disbursement-date', deal.disbursement_date || deal.disbursementDate || '—')
    setDetailField('detail-progress', deal.progress || deal.stage_progress || '—')
    setDetailField('detail-mandates', (deal.mandates && deal.mandates.length) ? deal.mandates.map(m => m.name || m).join(', ') : 'No mandates available')
    // Render lenders as clickable buttons that open the case application form
    (function() {
      const lendersEl = document.querySelector('.detail-lenders')
      if (!lendersEl) return
      if (deal.lenders && deal.lenders.length) {
        lendersEl.innerHTML = deal.lenders.map(l => {
          const name = l.name || l
          return '<button class="btn-link-inline" type="button" onclick="openCaseApplicationFromDeal(' + JSON.stringify(String(deal.id || id || '')) + ', ' + JSON.stringify(String(name)) + ')">' + String(name) + '</button>'
        }).join(', ')
      } else {
        lendersEl.textContent = 'No lenders available'
      }
    })()
    setDetailField('detail-activities', (deal.audit_trail && deal.audit_trail.length) ? deal.audit_trail.slice(0, 5).map(a => `${a.changed_by || a.user || a.by || 'User'}: ${a.field || a.action || ''} → ${a.new_value || a.to || a.value || ''}`).join('\n') : 'No recent activity')
    setDetailField('detail-documents', (deal.documents && deal.documents.length) ? deal.documents.map(x => x.name || x).join(', ') : 'No documents uploaded')
    setDetailField('detail-notes', Array.isArray(deal.notes) ? deal.notes.join('\n') : deal.notes || 'No notes available')
  }

  const cachedDeal = (window.__dealDetailMap || {})[id]

  // show loading placeholders
  setDetailField('detail-deal-name', 'Loading...')
  setDetailField('detail-deal-id', id)
  setDetailField('detail-deal-value', '—')
  setDetailField('detail-expected-revenue', '—')
  setDetailField('detail-weighted-revenue', '—')
  setDetailField('detail-pf-revenue', '—')
  setDetailField('detail-revenue-sharing', '—')
  setDetailField('detail-platform-charges', '—')
  setDetailField('detail-tranche-charges', '—')
  setDetailField('detail-advisory-fees', '—')
  setDetailField('detail-renewal-charges', '—')
  setDetailField('detail-other-charges', '—')
  setDetailField('detail-deal-sanctioned', '—')
  setDetailField('detail-deal-disbursed', '—')
  setDetailField('detail-expected-close', '—')
  setDetailField('detail-probability', '—')
  setDetailField('detail-description', 'Loading deal details…')
  setDetailField('detail-deal-status', '—')
  setDetailField('detail-deal-updated', 'Last updated just now')
  setDetailField('detail-account', '—')
  setDetailField('detail-owner', '—')
  setDetailField('detail-stage', '—')
  setDetailField('detail-source', '—')
  setDetailField('detail-created', '—')
  setDetailField('detail-first-meeting', '—')
  setDetailField('detail-mandate-received', '—')
  setDetailField('detail-proposal', '—')
  setDetailField('detail-sanctioned-on', '—')
  setDetailField('detail-disbursement-date', '—')
  setDetailField('detail-progress', '—')
  setDetailField('detail-mandates', 'No mandates available')
  setDetailField('detail-lenders', 'No lenders available')
  setDetailField('detail-activities', 'No recent activity')
  setDetailField('detail-documents', 'No documents uploaded')
  setDetailField('detail-notes', 'No notes available')

  if (cachedDeal) {
    populateDealFields(cachedDeal)
  }

  // try backend first
  try {
    const apiBase = (typeof window.getCRMApiBase === 'function' ? window.getCRMApiBase() : null)
      || window.API_BASE
      || window.location.origin

    const authToken = window.API?.authToken || (() => {
      try {
        const session = JSON.parse(localStorage.getItem('crm_session') || 'null')
        return session?.access_token || session?.token || null
      } catch (e) {
        return null
      }
    })()

    const backendLeadId = resolveBackendLeadId(cachedDeal)
    const fallbackRouteId = backendLeadId ?? detailLeadId

    const res = await fetch(`${apiBase}/api/forecast/deal/${encodeURIComponent(fallbackRouteId)}`, {
      headers: authToken ? {
        'Authorization': `Bearer ${authToken}`,
        'Accept': 'application/json'
      } : {
        'Accept': 'application/json'
      }
    })

    if (res.ok) {
      const payload = await res.json()
      if (payload && payload.status === 'success' && payload.data) {
        populateDealFields(payload.data)
      } else {
        throw new Error('Empty payload')
      }
    } else {
      throw new Error('Fetch failed: ' + res.status)
    }
  } catch (err) {
    console.warn('Backend fetch failed, falling back to DataStore:', err)
    // fallback to client-side data stored in pipeline deals or local deals
    try {
      const deals = (typeof DataStore !== 'undefined' && DataStore.getPipelineDeals)
        ? DataStore.getPipelineDeals() || []
        : (typeof DataStore !== 'undefined' && DataStore.get)
          ? DataStore.get('deals') || []
          : []
      const found = deals.find(x => String(x.id) === String(id)
        || String(x.dealId || x.leadId || x.lead_id || x.deal_id || x.uid || x.ID || x.IDENTIFIER) === String(id)
        || String(x.name || x.company || x.deal_name || x.company_name) === String(id))
      if (found) {
        setDetailField('detail-deal-name', found.deal_name || found.name || found.company_name || found.company || '—')
        setDetailField('detail-deal-id', found.id || found.dealId || found.leadId || found.lead_id || found.deal_id || found.uid || id)
        setDetailField('detail-deal-value', formatINR(found.loan_amount || found.deal_value || found.value || found.loanAmount || found.expected_revenue || found.weighted_revenue || 0))
        setDetailField('detail-expected-close', found.disbursement_date || found.expectedClose || found.expected_close || found.mandate_date || found.first_tranche_date || found.closeDate || found.close_date || '—')
        setDetailField('detail-probability', ((found.probability || found.stage_probability || found.probabilityPercent || found.probability_value || 0) + '%'))
        setDetailField('detail-description', found.description || found.notes || found.deal_summary || found.summary || '—')
        setDetailField('detail-account', found.company_name || found.company || found.accountName || found.account_name || '—')
        setDetailField('detail-stage', found.current_stage || found.stage || found.pipeline_stage || found.status || '—')
        setDetailField('detail-owner', found.rm_name || found.relationship_manager || found.assignedTo || found.salesExecutive || found.assigned_employee || found.assignee || '—')
        setDetailField('detail-mandates', (found.mandates && found.mandates.length) ? found.mandates.map(m => m.name || m).join(', ') : 'No mandates')
        // Render lenders as clickable buttons in fallback data
        (function() {
          const lendersEl = document.querySelector('.detail-lenders')
          if (!lendersEl) return
          if (found.lenders && found.lenders.length) {
            lendersEl.innerHTML = found.lenders.map(l => {
              const name = l.name || l
              return '<button class="btn-link-inline" type="button" onclick="openCaseApplicationFromDeal(' + JSON.stringify(String(found.id || id || '')) + ', ' + JSON.stringify(String(name)) + ')">' + String(name) + '</button>'
            }).join(', ')
          } else {
            lendersEl.textContent = 'No lenders'
          }
        })()
        setDetailField('detail-activities', (found.audit_trail && found.audit_trail.length) ? found.audit_trail.slice(0, 5).map(a => `${a.changed_by || a.user || a.by}: ${a.field || a.action || ''} → ${a.new_value || a.to || a.value || ''}`).join('\n') : 'No recent activity')
        setDetailField('detail-notes', Array.isArray(found.notes) ? found.notes.join('\n') : found.notes || 'No notes')
        setDetailField('detail-documents', (found.documents && found.documents.length) ? found.documents.map(x => x.name || x).join(', ') : 'No documents')
        setDetailField('detail-progress', found.progress || found.stage_progress || '—')
      } else {
        setDetailField('detail-description', 'Deal not found')
      }
    } catch (e) {
      console.error('Fallback read failed', e)
      setDetailField('detail-description', 'Unable to load deal details')
    }
  }

}

function toggleDealActionsMenu(event) {
  if (event) event.stopPropagation()
  const menu = document.getElementById('dealActionsDropdown')
  if (!menu) return
  menu.style.display = menu.style.display === 'block' ? 'none' : 'block'
}

function closeDealActionsMenu() {
  const menu = document.getElementById('dealActionsDropdown')
  if (menu) menu.style.display = 'none'
}

document.addEventListener('click', function (event) {
  const menu = document.getElementById('dealActionsDropdown')
  if (!menu || menu.style.display !== 'block') return
  const clickedInside = event.target.closest('#dealActionsDropdown') || event.target.closest('.deal-detail-actions')
  if (!clickedInside) {
    menu.style.display = 'none'
  }
})

function copyDealId() {
  const dealId = window.currentDealId || document.querySelector('.detail-deal-id')?.textContent || ''
  if (!dealId) return
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(dealId).then(() => {
      showToast('Deal ID copied to clipboard', 'success')
    }).catch(() => {
      showToast('Unable to copy deal ID', 'error')
    })
  } else {
    const temp = document.createElement('textarea')
    temp.value = dealId
    document.body.appendChild(temp)
    temp.select()
    document.execCommand('copy')
    document.body.removeChild(temp)
    showToast('Deal ID copied to clipboard', 'success')
  }
  closeDealActionsMenu()
}

function closeDealDetail() {
  const modal = document.getElementById('dealDetailModal')
  const backdrop = document.getElementById('modalBackdrop')
  if (modal) modal.style.display = 'none'
  if (backdrop) backdrop.style.display = 'none'
}

function formatINR(num){
  if (!num && num !== 0) return '—'
  try{
    const n = Number(num)
    return '₹' + n.toLocaleString('en-IN', {maximumFractionDigits:0})
  }catch(e){return String(num)}
}
// EOD - END OF DAY
// ═══════════════════════════════════════════════════════════════

function submitEOD() {
  if (handleRestrictedReportSubmitAttempt('EOD')) return
  const dateRaw = document.getElementById('eDate')?.value

  if (!dateRaw) { showToast('Please select a date.', 'error'); return }

  const entry = {
    id: 'EOD-' + Date.now(),
    timestamp: new Date().toLocaleString('en-IN'),
    email: S.email,
    date: fmtDate(dateRaw),
    salesExecutive: S.name,
    createdBy: S.email,
    createdByName: S.name,
    callsMade: parseInt(document.getElementById('eCallsMade')?.value) || 0,
    meetingsHeld: parseInt(document.getElementById('eMeetingsHeld')?.value) || 0,
    leads: parseInt(document.getElementById('eLeads')?.value) || 0,
    keyClients: document.getElementById('eKeyClients')?.value?.trim() || '',
    dealsMovedNextStage: document.getElementById('eDeals')?.value?.trim() || '',
    challengesFaced: document.getElementById('eChallenges')?.value?.trim() || '',
    learnings: document.getElementById('eLearnings')?.value?.trim() || '',
    remarks: document.getElementById('eRemarks')?.value?.trim() || '',
    score: parseInt(document.getElementById('eScore')?.value) || 70,
    aiScore1: parseInt(document.getElementById('eScore')?.value) || 70,
    isHistorical: false
  }

  const btn = document.getElementById('eodSubmitBtn')
  if (btn) {
    btn.disabled = true
    btn.innerHTML = '<div class="spinner"></div> Saving…'
  }

  // Save to backend FIRST - localStorage is only for caching
  if (typeof saveBackendReport === 'function') {
    saveBackendReport('eod', {
      report_date: dateRaw,
      sales_executive: entry.salesExecutive,
      email: entry.email,
      number_of_calls: entry.callsMade,
      meetings_held: entry.meetingsHeld,
      number_of_leads: entry.leads,
      key_clients_spoken: entry.keyClients,
      deals_moved_next_stage: entry.dealsMovedNextStage,
      challenges_faced: entry.challengesFaced,
      learnings_today: entry.learnings,
      remarks: entry.remarks,
      daily_score: entry.score
    }, 'EOD summary').then(result => {
      console.debug('EOD backend saved:', result);
      // Only cache to localStorage AFTER successful backend save
      const d = getEOD()
      d.push(entry)
      saveEOD(d)
      console.debug('EOD cached locally:', entry.id, 'totalEOD=', getEOD().length)
      
      // Firebase sync (optional)
      if (typeof saveFirebaseEntry === 'function') {
        saveFirebaseEntry('eodReports', entry).catch(err => console.warn('Firebase EOD save failed', err))
      }

      notifyAdminReportSubmission({
        type: 'eod_submitted',
        title: 'EOD Summary Submitted',
        message: `${entry.salesExecutive} submitted an EOD summary for ${entry.date}.`,
        relatedId: entry.id
      })

      if (btn) {
        btn.disabled = false
        btn.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Save EOD Summary'
      }

      showToast('EOD summary saved successfully', 'success')
      renderDashboard()
      try { renderEODHistory() } catch (e) { /* ignore if view not present */ }
    }).catch(err => {
        console.error('EOD backend save failed, falling back to local cache:', err);
        try {
          const d = getEOD()
          d.push(entry)
          saveEOD(d)
          console.debug('EOD cached locally (offline fallback):', entry.id)
          showToast('EOD saved locally (offline). Will sync when backend is available.', 'info')
          renderDashboard()
          try { renderEODHistory() } catch (e) {}
        } catch (cacheErr) {
          console.error('Failed to cache EOD locally as fallback:', cacheErr)
          showToast('Failed to save EOD. Please try again.', 'error')
        }
        if (btn) {
          btn.disabled = false
          btn.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Save EOD Summary'
        }
    });
  } else {
    console.error('Backend save function not available');
    showToast('Backend unavailable. Cannot save EOD.', 'error');
    if (btn) {
      btn.disabled = false
      btn.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Save EOD Summary'
    }
  }
}

function renderEOD() {
  const eodDateSub = document.getElementById('eodDateSub')
  if (eodDateSub) eodDateSub.textContent = todayFull()
}

function renderEODHistory() {
  const q = document.getElementById('eodSearch')?.value?.toLowerCase() || ''
  const execF = document.getElementById('eodExecF')?.value || ''
  let eods = myEOD()

  const normalizeEODEntry = l => {
    const salesExecutive = l.salesExecutive || l.sales_executive_name || l.createdByName || l.employeeName || ''
    return {
      ...l,
      date: l.date || l.date_col || l.eod_date || '',
      salesExecutive,
      callsMade: l.callsMade ?? l.calls_made ?? l.number_of_calls ?? l.callCount ?? 0,
      meetingsHeld: l.meetingsHeld ?? l.meetings_held ?? l.meetings ?? 0,
      leads: l.leads ?? l.number_of_leads ?? l.numberOfLeads ?? l.eLeads ?? l.e_leads ?? 0,
      keyClients: l.keyClients || l.key_clients || l.key_clients_spoken || l.clients || '',
      dealsMovedNextStage: l.dealsMovedNextStage || l.deals_moved || l.deals_moved_next_stage || l.dealsMoved || l.deals || '',
      challengesFaced: l.challengesFaced || l.challenges_faced || l.challenges || '',
      learnings: l.learnings || l.learning || l.learnings_today || l.learnings_today || '',
      remarks: l.remarks || l.comment || l.description || '',
      score: l.score ?? l.aiScore ?? l.ai_score ?? l.daily_score ?? ''
    }
  }

  eods = eods.map(normalizeEODEntry)

  if (q) eods = eods.filter(l =>
    (l.salesExecutive && l.salesExecutive.toLowerCase().includes(q)) ||
    (l.keyClients && l.keyClients.toLowerCase().includes(q)) ||
    (l.remarks && l.remarks.toLowerCase().includes(q)) ||
    (l.leads !== undefined && String(l.leads).toLowerCase().includes(q))
  )

  if (execF) eods = eods.filter(l => l.salesExecutive === execF)
  const eodDateF = document.getElementById('eodDateF')?.value || ''
  if (eodDateF) {
    const [filterYear, filterMonth, filterDay] = eodDateF.split('-').map(Number)
    eods = eods.filter(l => {
      const entryDate = parseLeadDate(l.date)
      if (!entryDate) return false
      return entryDate.getFullYear() === filterYear &&
        entryDate.getMonth() === filterMonth - 1 &&
        entryDate.getDate() === filterDay
    })
  }

  const tbody = document.getElementById('eodHistBody')
  const showing = document.getElementById('eodHistCount')

  if (showing) showing.textContent = eods.length

  if (tbody) {
    if (eods.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" style="padding:40px;text-align:center;color:var(--gray-400);">No EOD reports found</td></tr>'
    } else {
      tbody.innerHTML = eods.slice().reverse().map(l => `
        <tr style="border-bottom:1px solid var(--gray-100);">
          ${renderReportCell(l.date || '—', 130)}
          ${renderReportCell(l.salesExecutive || '—', 180)}
          ${renderReportCell(l.callsMade != null ? l.callsMade : 0, 90)}
          ${renderReportCell(l.meetingsHeld != null ? l.meetingsHeld : 0, 90)}
          ${renderReportCell(l.leads != null ? l.leads : 0, 90)}
          ${renderReportCell(l.keyClients || '—', 220)}
          ${renderReportCell(l.dealsMovedNextStage || '—', 220)}
          ${renderReportCell(l.challengesFaced || '—', 220)}
          ${renderReportCell(l.learnings || '—', 220)}
          ${renderReportCell(l.remarks || '—', 260)}
        </tr>
      `).join('')
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// WOD - WEEKLY REPORT
// ═══════════════════════════════════════════════════════════════

function submitWOD() {
  if (handleRestrictedReportSubmitAttempt('WOD')) return
  const startRaw = document.getElementById('wStart')?.value
  const endRaw = document.getElementById('wEnd')?.value

  if (!startRaw || !endRaw) { showToast('Please select week dates.', 'error'); return }

  const entry = {
    id: 'WOD-' + Date.now(),
    timestamp: new Date().toLocaleString('en-IN'),
    email: S.email,
    salesExecutive: document.getElementById('wExec')?.value || S.name,
    createdBy: S.email,
    createdByName: S.name,
    weekStart: fmtDate(startRaw),
    weekEnd: fmtDate(endRaw),
    target: document.getElementById('wTarget')?.value?.trim() || '',
    achieved: document.getElementById('wAchieved')?.value?.trim() || '',
    dealsClosed: document.getElementById('wDeals')?.value?.trim() || '',
    hotLeads: document.getElementById('wHotLeads')?.value?.trim() || '',
    keyWins: document.getElementById('wWins')?.value?.trim() || '',
    lostOpportunities: document.getElementById('wLost')?.value?.trim() || '',
    actionPlan: document.getElementById('wPlan')?.value?.trim() || '',
    remarks: document.getElementById('wRemarks')?.value?.trim() || '',
    isHistorical: false
  }

  const btn = document.getElementById('wodSubmitBtn')
  if (btn) {
    btn.disabled = true
    btn.innerHTML = '<div class="spinner"></div> Saving…'
  }

  // Save to backend FIRST - localStorage is only for caching
  if (typeof saveBackendReport === 'function') {
    saveBackendReport('wod', {
      email: entry.email,
      week_start: entry.weekStart,
      week_end: entry.weekEnd,
      sales_executive: entry.salesExecutive,
      weekly_target: entry.target,
      achieved: entry.achieved,
      deals_closed: entry.dealsClosed,
      hot_leads_in_pipeline: entry.hotLeads,
      key_wins_this_week: entry.keyWins,
      lost_opportunities: entry.lostOpportunities,
      action_plan_next_week: entry.actionPlan,
      remarks: entry.remarks
    }, 'Weekly report').then(result => {
      console.debug('WOD backend saved:', result);
      // Only cache to localStorage AFTER successful backend save
      const d = getWOD()
      d.push(entry)
      saveWOD(d)
      console.debug('WOD cached locally:', entry.id, 'totalWOD=', getWOD().length)
      
      // Firebase sync (optional)
      if (typeof saveFirebaseEntry === 'function') {
        saveFirebaseEntry('wodReports', entry).catch(err => console.warn('Firebase WOD save failed', err))
      }

      notifyAdminReportSubmission({
        type: 'wod_submitted',
        title: 'Weekly Report Submitted',
        message: `${entry.salesExecutive} submitted a weekly report for ${entry.weekStart} to ${entry.weekEnd}.`,
        relatedId: entry.id
      })

      if (btn) {
        btn.disabled = false
        btn.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Submit Weekly Report'
      }

      showToast('Weekly report submitted successfully', 'success')
      renderDashboard()
      try { renderWODHistory() } catch (e) { /* ignore if view not present */ }
    }).catch(err => {
        console.error('WOD backend save failed, falling back to local cache:', err);
        try {
          const d = getWOD()
          d.push(entry)
          saveWOD(d)
          console.debug('WOD cached locally (offline fallback):', entry.id)
          showToast('Weekly report saved locally (offline). Will sync when backend is available.', 'info')
          renderDashboard()
          try { renderWODHistory() } catch (e) {}
        } catch (cacheErr) {
          console.error('Failed to cache WOD locally as fallback:', cacheErr)
          showToast('Failed to save Weekly report. Please try again.', 'error')
        }
        if (btn) {
          btn.disabled = false
          btn.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Submit Weekly Report'
        }
    });
  } else {
    console.error('Backend save function not available');
    showToast('Backend unavailable. Cannot save Weekly report.', 'error');
    if (btn) {
      btn.disabled = false
      btn.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Submit Weekly Report'
    }
  }
}

function renderWODHistory() {
  const q = document.getElementById('wodSearch')?.value?.toLowerCase() || ''
  const execF = document.getElementById('wodExecF')?.value || ''
  let wods = myWOD()

  const normalizeWODEntry = l => {
    let entry = l
    const decodeHtmlEntities = text => typeof text === 'string'
      ? text.replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#39;/g, "'")
      : text

    if (l && typeof l.data === 'string') {
      try {
        entry = JSON.parse(decodeHtmlEntities(l.data))
      } catch (err) {
        console.warn('Unable to parse WOD entry data', err, l.data)
        entry = { ...l }
      }
    } else if (l && l.data && typeof l.data === 'object') {
      entry = { ...l, ...l.data }
    }

    const salesExecutive = entry.salesExecutive || entry.sales_executive_name || entry.createdByName || entry.employeeName || l.salesExecutive || ''
    return {
      ...entry,
      weekStart: entry.weekStart || entry.week_start || entry.start_week || entry.weekStarting || entry.week_starting || '',
      weekEnd: entry.weekEnd || entry.week_end || entry.end_week || entry.weekEnding || entry.week_ending || '',
      salesExecutive,
      target: entry.target || entry.wTarget || entry.w_target || entry.weeklyTarget || entry.weekly_target || '',
      achieved: entry.achieved || entry.wAchieved || entry.w_achieved || '',
      dealsClosed: entry.dealsClosed ?? entry.deals_closed ?? entry.deals ?? 0,
      hotLeads: entry.hotLeads || entry.wHotLeads || entry.hot_leads || '',
      keyWins: entry.keyWins || entry.wins || entry.key_wins || '',
      lostOpportunities: entry.lostOpportunities || entry.lost_opportunities || entry.wLost || entry.lost || '',
      actionPlan: entry.actionPlan || entry.action_plan || entry.wPlan || entry.plan || entry.nextWeekPlan || ''
    }
  }

  wods = wods.map(normalizeWODEntry)

  if (q) wods = wods.filter(l =>
    (l.salesExecutive && l.salesExecutive.toLowerCase().includes(q)) ||
    (l.target && l.target.toLowerCase().includes(q)) ||
    (l.achieved && l.achieved.toLowerCase().includes(q)) ||
    (l.hotLeads && l.hotLeads.toLowerCase().includes(q)) ||
    (l.keyWins && l.keyWins.toLowerCase().includes(q)) ||
    (l.lostOpportunities && l.lostOpportunities.toLowerCase().includes(q)) ||
    (l.actionPlan && l.actionPlan.toLowerCase().includes(q))
  )

  if (execF) wods = wods.filter(l => l.salesExecutive === execF)
  const wodDateF = document.getElementById('wodDateF')?.value || ''
  if (wodDateF) {
    const filterDate = parseLeadDate(wodDateF)
    if (filterDate) {
      wods = wods.filter(l => {
        const startDate = parseLeadDate(l.weekStart)
        const endDate = parseLeadDate(l.weekEnd)
        if (!startDate) return false
        if (!endDate) return filterDate.getTime() === startDate.getTime()
        return filterDate.getTime() >= startDate.getTime() && filterDate.getTime() <= endDate.getTime()
      })
    }
  }

  const tbody = document.getElementById('wodHistBody')
  const showing = document.getElementById('wodHistCount')

  if (showing) showing.textContent = wods.length

  if (tbody) {
    if (wods.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="padding:40px;text-align:center;color:var(--gray-400);">No weekly reports found</td></tr>'
      } else {
      tbody.innerHTML = wods.slice().reverse().map(l => `
        <tr style="border-bottom:1px solid var(--gray-100);">
          ${renderReportCell(l.weekStart || '—', 140)}
          ${renderReportCell(l.weekEnd || '—', 140)}
          ${renderReportCell(l.salesExecutive || '—', 180)}
          ${renderReportCell(l.target || '—', 180)}
          ${renderReportCell(l.achieved || '—', 120)}
          ${renderReportCell(l.dealsClosed || '—', 120)}
          ${renderReportCell(l.hotLeads || '—', 120)}
          ${renderReportCell(l.keyWins || '—', 220)}
          ${renderReportCell(l.lostOpportunities || '—', 240)}
          ${renderReportCell(l.actionPlan || '—', 260)}
        </tr>
      `).join('')
    }
  }
}

function deleteReportHistory(reportType) {
  const config = {
    sod: { save: saveSOD, label: 'SOD history' },
    eod: { save: saveEOD, label: 'EOD history' },
    wod: { save: saveWOD, label: 'WOD history' }
  }[reportType]

  if (!config) return

  if (!confirm(`Delete all ${config.label}? This cannot be undone.`)) return

  config.save([])
  showToast(`${config.label} deleted successfully`, 'info')

  try {
    if (reportType === 'sod') renderSODHistory()
    if (reportType === 'eod') renderEODHistory()
    if (reportType === 'wod') renderWODHistory()
  } catch (e) {
    console.warn('Refresh after delete failed', e)
  }
}

// ═══════════════════════════════════════════════════════════════
// LEADS JOURNEY
// ═══════════════════════════════════════════════════════════════

function normalizeCompanyName(name) {
  if (!name) return ''
  return String(name)
    .toLowerCase()
    .replace(/[.,&\/\\]/g, ' ')
    .replace(/\b(ltd|pvt|private|limited|llp|inc|corp|corporation|co|company|india)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizePhone(value) {
  return String(value || '')
    .replace(/\D+/g, '')
    .replace(/^0+/, '')
    .trim()
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

function normalizePAN(value) {
  return String(value || '').replace(/\s+/g, '').toUpperCase()
}

function getLeadCompanyName(lead) {
  return lead.companyName || lead.company || lead.customerCompany || lead.Company || lead.name || ''
}

function parseLeadDate(value) {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const raw = String(value).trim()
  const isoMatch = /^\d{4}-\d{2}-\d{2}/.test(raw)
  if (isoMatch) {
    const date = new Date(raw)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const dmyMatch = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(raw)
  if (dmyMatch) {
    const day = Number(dmyMatch[1])
    const month = Number(dmyMatch[2])
    const year = Number(dmyMatch[3])
    const date = new Date(year, month - 1, day)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const fallback = new Date(raw)
  return Number.isNaN(fallback.getTime()) ? null : fallback
}

function normalizeLeadValue(value) {
  return String(value || '').trim().toLowerCase()
}

function isLeadOwnedByCurrentUser(lead) {
  const currentUser = [S.name, S.email].filter(Boolean).map(normalizeLeadValue)
  if (currentUser.length === 0) return false

  const candidateValues = [
    lead.salesExecutive,
    lead.createdByName,
    lead.createdBy,
    lead.assignedTo,
    lead.assigned_to,
    lead.assignedEmployee,
    lead.assignedEmployeeName,
    lead.owner,
    lead.ownerName,
    lead.creator,
    lead['Created By'],
    lead['created_by'],
    lead.name
  ].filter(Boolean).map(normalizeLeadValue)

  return candidateValues.some(value =>
    currentUser.includes(value) ||
    currentUser.some(user => value === user.split('@')[0] || user.split('@')[0] === value)
  )
}

function isLeadRecentOrMine(lead, days = 30) {
  if (isLeadOwnedByCurrentUser(lead)) return true

  const rawDate = lead.dateOfEntry || lead.date_of_entry || lead.timestamp || lead.createdAt || lead.dateCreated || lead.DATE || lead.created_at || lead.date
  const existingDate = parseLeadDate(rawDate)
  if (!existingDate) return false

  const ageMs = Date.now() - existingDate.getTime()
  return ageMs >= 0 && ageMs <= days * 24 * 60 * 60 * 1000
}

function getLeadOutcomeText(lead) {
  return String(
    lead.callOutcome ||
    lead.outcome_of_call ||
    lead.call_outcome ||
    lead.outcome ||
    lead.final_outcome ||
    lead.status ||
    ''
  ).trim().toLowerCase()
}

function getLeadOutcomeCategory(lead) {
  const text = getLeadOutcomeText(lead)
  if (!text) return 'unknown'

  if (/\bnot\s*(interested|interest(ed)?)\b|\bno\s*interest\b/.test(text)) {
    return 'not_interested'
  }
  if (/\binterested\b|\binterest\b|\bintrested\b|\bintrest\b/.test(text)) {
    return 'interested'
  }
  return 'other'
}

function getBackendLeadAssigneeId(entry) {
  if (!entry || typeof entry !== 'object') return null
  // Check if it's already a valid UUID
  const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
  const isUUID = (v) => typeof v === 'string' && uuidPattern.test(v.trim())
  
  if (entry.assigned_to && isUUID(entry.assigned_to)) {
    return entry.assigned_to
  }
  if (entry.assignedTo && isUUID(entry.assignedTo)) {
    return entry.assignedTo
  }
  if (typeof S !== 'undefined' && S && S.id && isUUID(S.id)) {
    return S.id
  }
  // Return null instead of invalid string to avoid backend validation error
  return null
}

function mapLeadEntryToBackendPayload(entry) {
  if (!entry || typeof entry !== 'object') return {}
  
  // Validate and clean lead_name
  let leadName = entry.contactPerson || entry.companyName || entry.company || 'Unknown Lead'
  if (!leadName || typeof leadName !== 'string' || leadName.trim() === '') {
    leadName = entry.companyName || entry.company || 'Unknown Lead'
  }
  leadName = String(leadName).trim().substring(0, 255)
  
  // Validate and clean other string fields
  const cleanString = (val, maxLength) => {
    if (!val || typeof val !== 'string') return ''
    return String(val).trim().substring(0, maxLength)
  }
  
  const assigneeId = getBackendLeadAssigneeId(entry)
  const payload = {
    lead_name: leadName,
    company_name: cleanString(entry.companyName || entry.company, 255),
    mobile: cleanString(entry.contactNumber || entry.phone || entry.mobile, 50),
    alternate_mobile: cleanString(entry.alternateMobile || entry.mobileAlternate || entry.altMobile, 50),
    email: cleanString(entry.emailId || entry.email, 255),
    company_email: cleanString(entry.company_email || entry.companyEmail, 255),
    city: cleanString(entry.location || entry.city, 100),
    state: cleanString(entry.state, 100),
    product_type: cleanString(entry.productDiscussed || entry.loanType || entry.product_type, 100),
    funding_amount: Number(String(entry.dealValue || entry.funding_amount || '').replace(/[^0-9.]/g, '')) || undefined,
    lead_source: cleanString(entry.leadSource || entry.source, 100),
    lead_status: cleanString(entry.currentStatus || entry.status || 'New', 100),
    assigned_to: assigneeId || null,
    remarks: cleanString(entry.learningChallenge || entry.remarks || entry.notes, 1000)
  }
  
  // Ensure lead_name is not empty (required field)
  if (!payload.lead_name || payload.lead_name.trim() === '') {
    payload.lead_name = 'Unknown Lead'
  }
  
  console.log('Mapped lead payload:', payload)
  console.log('Assignee ID:', assigneeId)
  console.log('Payload details:', JSON.stringify(payload, null, 2))
  return payload
}

function mapFollowUpEntryToBackendPayload(entry) {
  if (!entry || typeof entry !== 'object') return {}
  // Extract lead_id from entry.leadId or entry.id (frontend uses string IDs, backend expects int)
  const leadId = entry.leadId || entry.id
  const numericLeadId = leadId ? parseInt(String(leadId).replace(/[^0-9]/g, '')) || null : null
  
  return {
    lead_id: numericLeadId,
    followup_date: entry.followupDate || entry.nextFollowUp || entry.when || new Date().toISOString(),
    followup_type: entry.followupType || entry.type || entry.callType || 'Call',
    notes: entry.notes || entry.remarks || entry.learningChallenge || entry.purposeOfCall || '',
    next_followup_date: entry.nextFollowUpDate || entry.nextFollowUp || null,
    status: entry.status || 'scheduled',
    assigned_to: getBackendLeadAssigneeId(entry)
  }
}

function mapCallEntryToBackendPayload(entry) {
  if (!entry || typeof entry !== 'object') return {}
  
  const formatDate = (dateStr) => {
    if (!dateStr) return new Date().toISOString().split('T')[0]
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0]
    return d.toISOString().split('T')[0] // Returns YYYY-MM-DD format
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return null
    // Ensure time is in HH:MM:SS format if provided
    if (timeStr.includes(':')) {
      const parts = timeStr.split(':')
      if (parts.length === 2) return `${timeStr}:00` // Add seconds if missing
      if (parts.length === 3) return timeStr
    }
    return null
  }
  
  const extractPhone = (phone) => {
    if (!phone) return '0000000000' // Default phone to satisfy backend validation
    const cleaned = String(phone).replace(/[^0-9]/g, '').substring(0, 50)
    return cleaned || '0000000000' // Ensure non-empty string
  }
  
  const prefix = entry.prefix || (entry.type === 'call' ? (entry.callType === 'Incoming' ? 'inc' : 'out') : '')
  
  return {
    call_id: entry.id || `CALL-${Date.now()}`,
    call_type: entry.callType || entry.type || 'Outgoing',
    call_date: formatDate(entry.dateOfEntry || entry.dateOfFirstCall),
    call_time: formatTime(entry.time) || null,
    duration_seconds: entry.duration ? parseInt(String(entry.duration)) : null,
    caller_name: entry.salesExecutive || entry.createdByName || '',
    caller_phone: extractPhone(entry.contactNumber || entry.phone),
    receiver_name: entry.contactPerson || '',
    receiver_phone: extractPhone(entry.contactNumber || entry.phone),
    receiver_email: entry.emailId || entry.email || '',
    lead_id: null, // Calls don't require lead_id initially
    purpose: entry.purposeOfCall || entry.action || '',
    description: entry.learningChallenge || entry.remarks || '',
    status: entry.currentStatus || entry.status || 'Completed',
    priority: 'Normal',
    outcome: entry.callOutcome || entry.outcome || '',
    followup_required: entry.nextFollowUp ? 'Yes' : 'No',
    followup_date: entry.nextFollowUp ? formatDate(entry.nextFollowUp) : null,
    followup_notes: entry.notes || '',
    recording_link: '',
    notes: entry.summary || '',
    sale_executive: entry.salesExecutive || entry.createdByName || '',
    product: entry.productDiscussed || entry.product || '',
    source: entry.leadSource || entry.source || '',
    customer_company_name: entry.companyName || entry.company || '',
    contact_person_name: entry.contactPerson || entry.contactPersonName || '',
    designation: entry.designation || '',
    action: entry.action || entry.purposeOfCall || ''
  }
}

function getLeadStageStatusMap() {
  return {
    'New Lead': ['Fresh', 'Assigned', 'Contacted', 'Follow-up Pending'],
    'Product Exploration': ['Requirement Understood', 'Product Suggested', 'Interested', 'Not Interested'],
    'Commercial Fit': ['Commercial Shared', 'Negotiation Ongoing', 'Customer Agreed', 'Customer Declined'],
    'Basic Financial Document': ['Pending', 'Partially Received', 'Completed'],
    'Login with Lender': ['Bank Selected', 'Login Initiated', 'Login Pending'],
    'Login Docs Submitted': ['Submitted', 'Query Raised', 'Query Resolved', 'Re-Submitted'],
    'Approved Limit': ['In Principle Approval Received', 'Limit Approved', 'Partially Approved'],
    'Sanction Docs': ['Pending', 'Collected', 'Submitted'],
    'Pre-Disbursement': ['Agreement Pending', 'Insurance Pending', 'PD Docs Pending', 'Ready for Disbursement'],
    'Disbursement': ['In Process', 'Partially Disbursed', 'Fully Disbursed'],
    'Payout Received': ['Payout Expected', 'Payout Under Process', 'Payout Received'],
    'Closed Won': ['Successfully Closed'],
    'Closed Lost': ['Rejected by Bank', 'Customer Dropped', 'Ineligible', 'Not Interested']
  }
}

function normalizeLeadStage(stage) {
  return String(stage || '').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim()
}

function getLeadStageOptions() {
  return Object.keys(getLeadStageStatusMap())
}

function getLeadStatusOptionsForStage(stage) {
  const leadStageStatusMap = getLeadStageStatusMap()
  const normalizedStage = normalizeLeadStage(stage).toLowerCase()
  if (leadStageStatusMap[stage]) {
    return leadStageStatusMap[stage].slice()
  }

  const fallbackEntry = Object.entries(leadStageStatusMap).find(([key]) => normalizeLeadStage(key).toLowerCase() === normalizedStage)
  return fallbackEntry ? fallbackEntry[1].slice() : []
}


function escapeJsString(text) {
  return String(text || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\"/g, '\\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r')
}

function buildLeadStageOptions(selectedStage) {
  return getLeadStageOptions().map((value) => `<option value="${escapeHtml(value)}"${value === selectedStage ? ' selected' : ''}>${escapeHtml(value)}</option>`).join('')
}

function buildLeadStatusOptions(stage, selectedStatus) {
  const options = getLeadStatusOptionsForStage(stage)
  if (selectedStatus && !options.includes(selectedStatus)) {
    options.unshift(selectedStatus)
  }

  return options.map((value) => `<option value="${escapeHtml(value)}"${value === selectedStatus ? ' selected' : ''}>${escapeHtml(value)}</option>`).join('')
}

function updateLeadStatusOptions() {
  const rawStage = String(document.getElementById('ldPurpose')?.value || '')
  const stage = rawStage.trim()
  const statusSelect = document.getElementById('ldStatus')
  if (!statusSelect) return

  const options = getLeadStatusOptionsForStage(stage)
  statusSelect.innerHTML = ''

  const placeholder = document.createElement('option')
  placeholder.value = ''
  placeholder.textContent = 'Select Status'
  placeholder.disabled = true
  placeholder.selected = true
  statusSelect.appendChild(placeholder)

  options.forEach((value) => {
    const option = document.createElement('option')
    option.value = value
    option.textContent = value
    statusSelect.appendChild(option)
  })

  if (!stage || options.length === 0) {
    statusSelect.setAttribute('disabled', 'disabled')
  } else {
    statusSelect.removeAttribute('disabled')
  }
}

function getPipelineStageFromJourneyLead(lead) {
  const rawStage = String(lead?.lead_stage || lead?.leadStage || lead?.purpose || lead?.ldPurpose || lead?.currentStatus || lead?.status || '').trim()
  if (!rawStage) return ''
  const normalizedStage = rawStage.toLowerCase()
  const exactMatch = PipelineConfig?.stages?.find((value) => String(value).trim().toLowerCase() === normalizedStage)
  if (exactMatch) return exactMatch

  if (typeof PipelineStore !== 'undefined' && PipelineStore && typeof PipelineStore.normalizePipelineStatus === 'function') {
    return PipelineStore.normalizePipelineStatus(rawStage)
  }

  const stageAliases = {
    'fresh': 'New Lead',
    'fresh lead': 'New Lead',
    'contacted': 'New Lead',
    'assigned': 'New Lead',
    'proposal': 'Commercial Fit',
    'qualified': 'Commercial Fit',
    'negotiation': 'Commercial Fit',
    'negotiation ongoing': 'Commercial Fit',
    'approved': 'Approved Limit',
    'approved limit': 'Approved Limit',
    'sanctioned': 'Sanction Docs',
    'disbursed': 'Disbursement',
    'disbursal': 'Disbursement',
    'payout received': 'Payout Received',
    'closed won': 'Closed Won',
    'closed lost': 'Closed Lost'
  }

  return stageAliases[normalizedStage] || ''
}

function updatePipelineLeadForJourney(leadKey, updates = {}) {
  if (typeof PipelineStore === 'undefined' || !PipelineStore || !Array.isArray(PipelineStore.state?.leads) || typeof getLeadsJourney !== 'function') return

  const journeyLeads = getLeadsJourney() || []
  const rawKey = String(leadKey || '').trim()
  const journeyLead = journeyLeads.find((l) => parseLeadIdentifier(l) === rawKey || String(l.id) === rawKey || String(l.lead_id) === rawKey)
  if (!journeyLead) return

  const mergedLead = { ...journeyLead, ...updates }
  const pipelineLead = PipelineStore.normalizeJourneyLead(mergedLead)
  const pipelineStage = getPipelineStageFromJourneyLead(mergedLead)
  if (pipelineStage) {
    pipelineLead.status = pipelineStage
  }

  pipelineLead.lastActivity = new Date().toISOString()
  pipelineLead.stageEnteredAt = new Date().toISOString()
  pipelineLead.assignedEmployee = pipelineLead.assignedEmployee || mergedLead.salesExecutive || mergedLead.assignedTo || mergedLead.createdByName || 'Unassigned'
  pipelineLead.name = pipelineLead.name || mergedLead.contactPerson || mergedLead.companyName || mergedLead.company || 'Unknown Lead'
  pipelineLead.loanAmount = Number(String(mergedLead.dealValue || mergedLead.deal_value || mergedLead.funding_amount || 0).replace(/[^0-9]/g, '')) || pipelineLead.loanAmount || 0

  const existingIndex = PipelineStore.state.leads.findIndex((lead) => String(lead.id) === String(pipelineLead.id))
  if (existingIndex >= 0) {
    PipelineStore.state.leads[existingIndex] = { ...PipelineStore.state.leads[existingIndex], ...pipelineLead }
  } else {
    PipelineStore.state.leads.unshift(pipelineLead)
  }

  try {
    if (typeof PipelineStore.save === 'function') {
      PipelineStore.save()
    }
  } catch (err) {
    console.warn('Failed to persist pipeline lead update:', err)
  }
}

function handleRowLeadStageChange(rawLeadKey, safeLeadKey, newStage) {
  const statusSelect = document.getElementById(`lead-status-${safeLeadKey}`)
  let currentStatus = statusSelect?.value || ''
  let persistedStatus = currentStatus

  if (statusSelect) {
    const options = getLeadStatusOptionsForStage(newStage)
    const isCurrentValid = currentStatus && options.includes(currentStatus)
    if (!isCurrentValid && options.length > 0) {
      persistedStatus = options[0]
    }

    statusSelect.innerHTML = options.map((value) => `<option value="${escapeHtml(value)}"${value === persistedStatus ? ' selected' : ''}>${escapeHtml(value)}</option>`).join('')
    statusSelect.disabled = options.length === 0
    if (statusSelect.value !== persistedStatus) {
      statusSelect.value = persistedStatus
    }
  }

  const updates = {
    lead_stage: newStage,
    leadStage: newStage,
    purpose: newStage
  }
  if (persistedStatus) {
    updates.lead_status = persistedStatus
    updates.currentStatus = persistedStatus
    updates.status = persistedStatus
  }

  saveLeadRowUpdate(rawLeadKey, updates)
}

function handleRowLeadStatusChange(rawLeadKey, newStatus) {
  console.debug('handleRowLeadStatusChange called', { rawLeadKey, newStatus })
  // If user selects the special pipeline action 'Login with Lender',
  // open the lender requirements modal so the user can pick a lender.
  try {
    const normalized = String(newStatus || '').trim().toLowerCase()
    if (normalized === 'login with lender') {
      if (typeof window.openLenderRequirementsModal === 'function') {
        // pass the lead key so modal can prefill or attach recommendations
        window.openLenderRequirementsModal(rawLeadKey)
      }
    }
  } catch (e) {
    console.warn('Failed to open lender modal on status change', e)
  }

  saveLeadRowUpdate(rawLeadKey, {
    lead_status: newStatus,
    currentStatus: newStatus,
    status: newStatus
  })
}

function saveLeadRowUpdate(leadKey, updates) {
  const persistUpdates = () => {
    if (typeof getLeadsJourney === 'function' && typeof saveLeadsJourney === 'function') {
      updateLocalLeadRow(leadKey, updates)
    }
    updatePipelineLeadForJourney(leadKey, updates)
    if (typeof renderDashboard === 'function') renderDashboard()
    if (typeof PipelineUI !== 'undefined' && PipelineUI && typeof PipelineUI.renderBoard === 'function') PipelineUI.renderBoard()
  }

  if (window.API && typeof window.API.updateLead === 'function' && !String(leadKey).startsWith('local-')) {
    window.API.updateLead(leadKey, updates).catch((err) => {
      console.warn('Lead update failed, saving locally instead:', err)
      persistUpdates()
    }).then(() => {
      persistUpdates()
    })
  } else {
    persistUpdates()
  }
}

function updateLocalLeadRow(leadKey, updates) {
  if (typeof getLeadsJourney !== 'function' || typeof saveLeadsJourney !== 'function') return

  const leads = getLeadsJourney() || []
  const updatedLeads = leads.map((lead) => {
    if (parseLeadIdentifier(lead) === leadKey || String(lead.id) === leadKey || String(lead.lead_id) === leadKey) {
      return {
        ...lead,
        ...updates
      }
    }
    return lead
  })

  saveLeadsJourney(updatedLeads)
}

async function submitLead(entryType = 'call', prefixOverride = '') {
  const type = entryType === 'lead' ? 'lead' : 'call'
  const prefix = prefixOverride || (type === 'lead' ? 'ld' : 'l')
  const btnId = type === 'lead' ? 'ldSubmitBtn' : `${prefix}SubmitBtn`
  const successLabel = type === 'lead' ? 'Save Lead' : (prefix === 'inc' ? 'Save Incoming Call' : prefix === 'out' ? 'Save Outgoing Call' : 'Save Call')
  const btn = document.getElementById(btnId)

  const resetSubmitBtn = () => {
    if (!btn) return
    btn.disabled = false
    btn.innerHTML = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> ${successLabel}`
  }

  if (btn) {
    btn.disabled = true
    btn.innerHTML = '<div class="spinner"></div> Checking duplicates…'
  }

  // Enhanced field getter that supports both old and new dynamic form field IDs
  const getFieldValue = (fieldName) => {
    // Try old prefix-based ID first
    const oldId = `${prefix}${fieldName}`
    const oldEl = document.getElementById(oldId)
    if (oldEl) return oldEl.value?.trim() || ''
    
    // Try new dynamic form IDs for lead-specific fields
    if (type === 'lead') {
      const newIdMap = {
        'Turnover': 'turnoverInput',
        'Designation': 'ldDesignation',
        'CreditRating': 'ldCreditRating',
        'EntityType': 'ldEntityType',
        'LenderRelatedDetail': 'ldLenderRelatedDetail'
      }
      const newId = newIdMap[fieldName] || fieldName.toLowerCase()
      const newEl = document.getElementById(newId)
      if (newEl) return newEl.value?.trim() || ''
    }
    
    return ''
  }
  
  const exec = getFieldValue('Exec')
  const company = getFieldValue('Company')
  const contact = getFieldValue('Contact')
  let source = getFieldValue('Source')
  let status = getFieldValue('Status')
  const dateRaw = document.getElementById(`${prefix}Date`)?.value
  const action = getFieldValue('Purpose') || ''
  const turnoverText = getFieldValue('Turnover') || ''
  const turnoverInCrores = parseAnnualTurnoverInCrores(turnoverText)
  const loanType = getFieldValue('LoanType') || ''
  const profitability = getFieldValue('Profitability') || ''
  let remarks = getFieldValue('Remarks') || ''

  try {
    const statusLower = (status || '').toLowerCase()
    if (statusLower === 'other') {
      const statusCustomEl = document.getElementById(`${prefix}StatusCustom`) || document.getElementById('outStatusCustom')
      const customText = statusCustomEl && statusCustomEl.value ? statusCustomEl.value.trim() : ''
      if (customText) {
        remarks = customText
      }
    }
  } catch (e) {
    // ignore
  }

  if (!company) {
    resetSubmitBtn()
    showToast('Please enter the Company Name.', 'error');
    return
  }
  if (!dateRaw) {
    resetSubmitBtn()
    showToast('Please enter the Date of Entry.', 'error');
    return
  }

  if (typeof refreshBackendLeadJourneyData === 'function') {
    await refreshBackendLeadJourneyData().catch(err => console.warn('Lead refresh failed', err))
  }

  const rawOutcome = String(document.getElementById(`${prefix}Outcome`)?.value || '').trim()
  const isInterested = rawOutcome.toLowerCase() === 'interested'
  let callOutcome = rawOutcome
  if (['reference', 'other'].includes(rawOutcome.toLowerCase())) {
    const customOutcome = document.getElementById(`${prefix}OutcomeCustom`)?.value?.trim()
    callOutcome = customOutcome || (rawOutcome.toLowerCase() === 'reference' ? 'Reference' : 'Other')
  }
  if (type === 'lead' && isInterested) {
    if (!contact) { resetSubmitBtn(); showToast('Please enter the Contact Person Name for Interested leads.', 'error'); return }
    if (turnoverInCrores < 100) { resetSubmitBtn(); showToast('Annual turnover must be at least ₹100 Cr for Interested leads.', 'error'); return }
    if (!loanType) { resetSubmitBtn(); showToast('Please enter the Loan Type for Interested leads.', 'error'); return }
    if (!action) { resetSubmitBtn(); showToast('Please select an action for Interested leads.', 'error'); return }
  }

  if (String(source).trim().toLowerCase() === 'other') {
    const customSource = document.getElementById(`${prefix}SourceCustom`)?.value?.trim()
    if (customSource) source = customSource
  }

  if (type === 'lead') {
    const newPhoneNorm = normalizePhone(document.getElementById(`${prefix}Phone`)?.value || '')
    const newEmailNorm = normalizeEmail(document.getElementById(`${prefix}Email`)?.value || '')
    const duplicateCheckPayload = {
      company_name: company || undefined,
      mobile: newPhoneNorm || undefined,
      email: newEmailNorm || undefined
    }

    try {
      let isLeadUnique = true
      if (typeof checkLeadDuplicate === 'function') {
        isLeadUnique = await checkLeadDuplicate(duplicateCheckPayload)
      } else {
        const apiClient = window.CRM_API_CLIENT || window.API || (typeof CRMApiClient !== 'undefined' ? new CRMApiClient() : null)
        if (apiClient && typeof apiClient.checkLeadDuplicates === 'function') {
          const duplicateResult = await apiClient.checkLeadDuplicates(duplicateCheckPayload)
          if (duplicateResult?.duplicate) {
            if (duplicateLeadModal) duplicateLeadModal.show(duplicateResult)
            isLeadUnique = false
          }
        }
      }

      if (!isLeadUnique) {
        resetSubmitBtn()
        return
      }
    } catch (err) {
      console.error('Backend duplicate check failed:', err)
      resetSubmitBtn()
      showToast('Error checking duplicates. Please try again.', 'error')
      return
    }
  }

  const makeField = (name) => document.getElementById(`${prefix}${name}`)?.value?.trim() || ''
  const makeDate = (name) => {
    const rawValue = document.getElementById(`${prefix}${name}`)?.value || ''
    if (!rawValue) return ''
    if (prefix === 'inc' && name === 'Date') {
      const [datePart] = rawValue.split('T')
      return fmtDate(datePart)
    }
    return fmtDate(rawValue) || ''
  }
  const makeRaw = (name) => document.getElementById(`${prefix}${name}`)?.value || ''
  const rawDesignation = makeField('Designation')
  const rawPhone = makeField('Phone')
  const rawEmail = makeField('Email')
  const rawLocation = makeField(prefix === 'inc' ? 'Location' : 'Location')
  const rawProduct = makeField('Product') || makeField('ProductCustom')
  const rawStatus = makeField('Status')
  const rawOutcomeCustom = makeField('OutcomeCustom')
  const rawSourceCustom = makeField('SourceCustom')
  const rawSource = source || rawSourceCustom
  const rawFollowup = makeDate(prefix === 'inc' ? 'FollowupDate' : 'FollowupDate')
  const rawSummary = makeField('Summary')
  const rawCreditRating = makeField('CreditRating')
  const rawRatingDate = makeField('RatingDate')
  const rawRatingAgency = makeField('RatingAgency')
  const rawLenderDetail = makeField('LenderRelatedDetail')

  const entry = {
    id: `${type === 'lead' ? 'LEAD' : prefix.toUpperCase() + '-CALL'}-${Date.now()}`,
    timestamp: new Date().toLocaleString('en-IN'),
    dateOfEntry: makeDate('Date') || fmtDate(dateRaw),
    salesExecutive: exec || S.name,
    createdBy: S.email,
    createdByName: S.name,
    companyName: company,
    contactPerson: contact,
    designation: rawDesignation,
    contactNumber: rawPhone,
    emailId: rawEmail,
    location: rawLocation,
    dateOfFirstCall: makeDate('FirstCall') || makeDate('Date') || '',
    purposeOfCall: action || '',
    productDiscussed: rawProduct || '',
    callOutcome,
    currentStatus: status || rawStatus || '',
    proposalShared: '',
    nextFollowUp: rawFollowup,
    dealValue: '',
    finalOutcome: '',
    learningChallenge: rawSummary || remarks || '',
    leadSource: rawSource || source || '',
    // Company Registration Details
    gstNumber: makeField('GST'),
    panNumber: makeField('PAN'),
    entityType: makeField('EntityType'),
    annualTurnover: turnoverText,
    employees: makeField('Employees'),
    incorporationYear: makeField('IncorporationYear'),
    registeredOffice: makeField('RegisteredOffice'),
    businessDescription: makeField('BusinessDesc'),
    loanType,
    profitableLast3Years: profitability,
    callType: makeField('CallType') || (prefix === 'inc' ? 'Incoming' : prefix === 'out' ? 'Outgoing' : ''),
    date: makeDate('Date') || fmtDate(dateRaw),
    timestamp: new Date().toISOString(),
    industry: makeField('Industry'),
    creditRating: rawCreditRating,
    ratingAgency: rawRatingAgency,
    ratingDate: rawRatingDate,
    lenderRelatedDetail: rawLenderDetail,
    loanRequirement: makeField('LoanRequirement'),
    currentBanker: makeField('CurrentBanker'),
    existingEMI: makeField('ExistingEMI'),
    followupTime: makeRaw('FollowupTime') || '',
    isHistorical: false
  }

  if (btn) {
    btn.disabled = true
    btn.innerHTML = '<div class="spinner"></div> Saving…'
  }

  setTimeout(async () => {
    // Save to appropriate journey collection based on type
    if (type === 'call') {
      const callsJourney = getCallsJourney()
      callsJourney.push(entry)
      saveCallsJourney(callsJourney)
    } else {
      const leadsJourney = getLeadsJourney()
      leadsJourney.push(entry)
      saveLeadsJourney(leadsJourney)
    }

    // Also add to DataStore leads for actual lead entries only
    if (type === 'lead') {
      const leadData = {
        lead_name: contact || company || 'Unnamed Lead',
        company_name: company || '',
        designation: entry.designation || rawDesignation || '',
        email: entry.emailId || '',
        company_email: entry.emailId || '',
        mobile: entry.contactNumber || '',
        alternate_mobile: '',
        location: rawLocation || '',
        city: '',
        state: '',
        product_type: loanType || '',
        funding_amount: parseFloat(entry.dealValue.replace(/[^0-9.]/g, '')) || undefined,
        lead_source: source || rawSource || 'other',
        lead_status: status || 'New',
        assigned_to: (typeof S !== 'undefined' && S?.id) ? S.id : undefined,
        sales_executive: exec || S.name || '',
        date_of_entry: makeDate('Date') || fmtDate(dateRaw) || undefined,
        remarks: entry.learningChallenge || remarks || '',
        followup_date: rawFollowup || undefined,
        next_followup_date: rawFollowup || undefined,
        followup_time: makeRaw('FollowupTime') || undefined,
        followup_type: makeField('FollowupType') || undefined,
        followup_note: makeField('FollowupNote') || '',
        deal_value: parseFloat(entry.dealValue.replace(/[^0-9.]/g, '')) || undefined,
        credit_rating: entry.creditRating || rawCreditRating || '',
        rating_agency: entry.ratingAgency || rawRatingAgency || '',
        rating_date: entry.ratingDate || rawRatingDate || '',
        lender_related_detail: entry.lenderRelatedDetail || rawLenderDetail || '',
        // Company Registration Details
        gst_number: makeField('GST') || '',
        pan_number: makeField('PAN') || '',
        entity_type: makeField('EntityType') || '',
        annual_turnover: turnoverText || '',
        business_vintage: getFieldValue('Vintage') || '',
        number_of_employees: makeField('Employees') ? parseInt(makeField('Employees')) : undefined,
        year_of_incorporation: makeField('IncorporationYear') ? parseInt(makeField('IncorporationYear')) : undefined,
        registered_office_address: makeField('RegisteredOffice') || '',
        business_description: makeField('BusinessDesc') || '',
        // Industry & Credit Profile
        industry: entry.industry || makeField('Industry') || '',
        promoter_cibil_score: getFieldValue('Cibil') || '',
        npa_history: getFieldValue('NpaHistory') || '',
        guarantee_available: getFieldValue('GuaranteeType') || '',
        current_ratio: getFieldValue('CurrentRatio') || '',
        interest_coverage_ratio: getFieldValue('InterestCoverageRatio') || '',
        dscr: getFieldValue('Dscr') || '',
        // Call Details
        date_of_first_call: makeDate('FirstCall') || makeDate('Date') || undefined,
        purpose_of_call: action || '',
        product_service_discussed: rawProduct || '',
        call_outcome: callOutcome || '',
        // Status & Lead Management
        current_status: status || rawStatus || '',
        final_outcome: '',
        lead_stage: makeField('Purpose') || '',
        last_activity_date: makeDate('LastActivity') || undefined,
        pipeline_stage: 'New Leads',
        proposal_shared: '',
        learning_challenge: rawSummary || remarks || ''
      }
      
      // Save to backend database
      const apiClient = window.CRM_API_CLIENT || window.API || (typeof CRMApiClient !== 'undefined' ? new CRMApiClient() : null)
      const saveLeadToBackend = async (payload) => {
        if (apiClient && typeof apiClient.createLead === 'function') {
          return apiClient.createLead(payload)
        }
        if (typeof postToCRMBackendEndpoint === 'function') {
          return postToCRMBackendEndpoint('leads', payload, 'POST')
        }
        throw new Error('Backend save function not available for leads')
      }

      try {
        const createdLead = await saveLeadToBackend(leadData)
        console.log('Lead saved to backend database', createdLead)

        // Add lead contact details to local Contacts store for immediate UI availability
        try {
          const existingContacts = DataStore.get('contacts') || []
          const createdPhone = (createdLead.mobile || createdLead.mobileNumber || '').toString().trim()
          const createdEmail = (createdLead.email || createdLead.emailId || '').toString().trim().toLowerCase()
          const duplicate = existingContacts.some(c => (c.phone && c.phone.toString().trim() === createdPhone && createdPhone) || (c.email && c.email.toString().trim().toLowerCase() === createdEmail && createdEmail))
          if (!duplicate) {
            const contact = {
              id: createdLead.id ? `CONTACT-${createdLead.id}` : `CONTACT-${Date.now()}`,
              name: createdLead.lead_name || createdLead.leadName || createdLead.company_name || createdLead.companyName || '',
              firstName: (createdLead.lead_name || '').split(' ')[0] || '',
              lastName: (createdLead.lead_name || '').split(' ').slice(1).join(' ') || '',
              email: createdEmail || '',
              phone: createdPhone || '',
              company: createdLead.company_name || createdLead.companyName || '',
              title: createdLead.designation || createdLead.title || '',
              type: 'prospect',
              source: createdLead.lead_source || createdLead.source || '',
              notes: '',
              createdAt: new Date().toISOString()
            }
            DataStore.add('contacts', contact)
            if (typeof renderContacts === 'function') renderContacts()
          }

          // Refresh backend contacts so the contact list reflects the saved contact database
          if (apiClient && typeof apiClient.getContacts === 'function') {
            try {
              const backendContacts = await apiClient.getContacts()
              if (Array.isArray(backendContacts) && backendContacts.length) {
                const mergedContacts = DataStore.mergeDatasetById
                  ? DataStore.mergeDatasetById(existingContacts, backendContacts)
                  : [...existingContacts, ...backendContacts]
                DataStore.set('contacts', mergedContacts)
                if (typeof renderContacts === 'function') renderContacts()
              }
            } catch (e) {
              console.warn('Failed to refresh contacts from backend', e)
            }
          }
        } catch (e) {
          console.warn('Failed to add lead to contacts local store', e)
        }

        const followupDate = document.getElementById('followupDate')?.value
        const followupTime = document.getElementById('followupTime')?.value
        const followupType = document.getElementById('followupType')?.value
        const followupNote = document.getElementById('followupNote')?.value

        if (followupDate && createdLead && createdLead.id) {
          try {
            const followupData = {
              lead_id: createdLead.id,
              assigned_to: (typeof S !== 'undefined' && S?.id) ? S.id : undefined,
              followup_date: followupDate,
              followup_time: followupTime || null,
              followup_type: followupType || 'Phone Call',
              notes: followupNote || '',
              next_followup_date: followupDate,
              next_followup_time: followupTime || null
            }

            const followupResponse = await fetch(`${window.API_BASE || window.location.origin}/followups`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${window.CRM_API_CLIENT?.getAuthToken() || JSON.parse(localStorage.getItem('crm_session') || '{}').access_token || ''}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(followupData)
            })

            if (followupResponse.ok) {
              console.log('Follow-up scheduled successfully')
            } else {
              console.warn('Failed to schedule follow-up')
            }
          } catch (err) {
            console.warn('Failed to create follow-up:', err)
          }
        }
      } catch (err) {
        console.error('Failed to save lead to backend:', err)
        throw err
      }
    }

    // Also add to DataStore calls (for call tracker display)
    if (type === 'call') {
      DataStore.add('calls', {
        id: entry.id,
        customerName: entry.contactPerson || entry.companyName || company,
        customer: entry.contactPerson || entry.companyName || company,
        company: entry.companyName || company,
        email: entry.emailId,
        phone: entry.contactNumber,
        date: entry.dateOfEntry,
        time: entry.timestamp,
        duration: 0,
        direction: entry.callType === 'Incoming' ? 'Inbound' : entry.callType === 'Outgoing' ? 'Outbound' : 'Inbound',
        outcome: entry.callOutcome,
        priority: 'Medium',
        nextAction: entry.purposeOfCall || '',
        followupDate: entry.nextFollowUp || '',
        summary: entry.learningChallenge || entry.purposeOfCall || '',
        sentiment: 'Neutral',
        products: entry.productDiscussed || '',
        hasRecording: false,
        recordingSaved: false,
        createdAt: new Date().toISOString()
      })
    }

    const pipelineStatus = (typeof PipelineConfig !== 'undefined' && Array.isArray(PipelineConfig.stages) && PipelineConfig.stages.includes(entry.currentStatus))
      ? entry.currentStatus
      : 'Fresh Lead'
    if (isInterested) {
      const pipelineLead = {
        id: `PL-${Date.now()}`,
        name: entry.contactPerson || entry.companyName || company,
        mobile: entry.contactNumber || '',
        loanAmount: parseInt(entry.dealValue.replace(/[^0-9]/g, '')) || 0,
        loanType: entry.productDiscussed || 'Lead Journey',
        leadScore: Math.min(100, 60 + Math.round(Math.random() * 30)),
        assignedEmployee: S.name,
        source: entry.leadSource || source || 'Lead Journey',
        priority: 'Warm',
        status: pipelineStatus,
        lastActivity: new Date().toISOString(),
        stageEnteredAt: new Date().toISOString(),
        city: entry.location || 'Unknown',
        pinCode: entry.pinCode || '',
        documents: []
      }

      try {
        const pipelineLeads = JSON.parse(localStorage.getItem('crm_pipeline_leads') || '[]')
        pipelineLeads.unshift(pipelineLead)
        localStorage.setItem('crm_pipeline_leads', JSON.stringify(pipelineLeads))
      } catch (err) {
        console.warn('Failed to store pipeline lead locally', err)
      }

      if (typeof PipelineStore !== 'undefined' && PipelineStore && Array.isArray(PipelineStore.state?.leads)) {
        PipelineStore.state.leads.unshift(pipelineLead)
        if (Array.isArray(PipelineStore.state.activities)) {
          PipelineStore.state.activities.unshift({
            id: `ACT-${Date.now() + 10}`,
            leadId: pipelineLead.id,
            type: 'Lead Created',
            user: S?.name || S?.email || 'System',
            timestamp: new Date().toISOString(),
            action: 'Lead created in pipeline',
            oldValue: '',
            newValue: '',
            remarks: 'Generated from lead journey entry'
          })
        }
        if (typeof PipelineStore.save === 'function') {
          PipelineStore.save()
        }
      }

      if (typeof PipelineUI !== 'undefined' && PipelineUI && typeof PipelineUI.renderBoard === 'function') {
        PipelineUI.renderBoard()
      }

      // Save company registration details to crm_customers
      const customers = JSON.parse(localStorage.getItem('crm_customers') || '[]')
      const customerId = entry.id
      const customerEntry = {
        id: customerId,
        companyName: company,
        contactPerson: contact,
        gstNumber: entry.gstNumber,
        panNumber: entry.panNumber,
        entityType: entry.entityType,
        annualTurnover: entry.annualTurnover,
        employees: entry.employees,
        incorporationYear: entry.incorporationYear,
        registeredOffice: entry.registeredOffice,
        businessDescription: entry.businessDescription,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      customers.push(customerEntry)
      localStorage.setItem('crm_customers', JSON.stringify(customers))
    }

    // Reset form
    const cleanupIds = ['Company', 'Contact', 'Designation', 'Phone', 'Email', 'Location', 'FirstCall', 'Purpose', 'Product', 'ProductCustom', 'Outcome', 'OutcomeCustom', 'Status', 'StatusCustom', 'Source', 'SourceCustom', 'Followup', 'FollowupDate', 'FollowupTime', 'Summary', 'DealValue', 'Learning', 'GST', 'PAN', 'EntityType', 'LoanType', 'Profitability', 'Turnover', 'Employees', 'IncorporationYear', 'RegisteredOffice', 'BusinessDesc']
    cleanupIds.forEach(suffix => {
      const el = document.getElementById(`${prefix}${suffix}`)
      if (el) el.value = ''
    })

    if (btn) {
      btn.disabled = false
      btn.innerHTML = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> ${successLabel}`
    }

      const journeyCollection = type === 'lead' ? 'leadJourneys' : 'callJourneys'
      if (typeof saveFirebaseEntry === 'function') {
        saveFirebaseEntry(journeyCollection, entry).catch(err => console.warn(`Firebase ${journeyCollection} save failed`, err))
      }
      if (typeof saveFirebaseEntry === 'function') {
        const targetCollection = type === 'lead' ? 'leads' : 'calls'
        saveFirebaseEntry(targetCollection, {
          id: entry.id,
          name: entry.contactPerson || entry.companyName || entry.company || 'Unknown',
          company: entry.companyName || entry.company || '',
          email: entry.emailId || '',
          phone: entry.contactNumber || '',
          status: (entry.currentStatus || 'new lead').toLowerCase(),
          source: (entry.leadSource || 'other').toLowerCase(),
          dealValue: parseInt((entry.dealValue || '').toString().replace(/[^0-9]/g, '')) || 0,
          assignedTo: S.email,
          createdBy: entry.createdBy,
          createdByName: entry.createdByName,
          dateOfEntry: entry.dateOfEntry,
          timestamp: entry.timestamp
        }).catch(err => console.warn(`Firebase ${targetCollection} save failed`, err))
      }

      notifyAdminReportSubmission({
        type: type === 'lead' ? 'lead_submitted' : 'call_submitted',
        title: type === 'lead' ? 'Lead Journey Submitted' : `${prefix === 'inc' ? 'Incoming Call' : prefix === 'out' ? 'Outgoing Call' : 'Call'} Submitted`,
        message: `${entry.salesExecutive} submitted ${type === 'lead' ? 'a lead journey' : `${prefix === 'inc' ? 'an incoming call' : prefix === 'out' ? 'an outgoing call' : 'a call'}`} for ${entry.companyName || entry.contactPerson || 'a company'}.`,
        relatedId: entry.id
      })

    // Save to backend FIRST - localStorage is only for caching
    if (typeof saveBackendReport === 'function') {
      let backendPayload, backendCollection, entryLabel
      if (type === 'lead') {
        backendPayload = mapLeadEntryToBackendPayload(entry)
        backendCollection = 'leads'
        entryLabel = 'Lead entry'
      } else if (type === 'call') {
        backendPayload = mapCallEntryToBackendPayload(entry)
        backendCollection = 'calls'
        entryLabel = 'Call entry'
      } else {
        backendPayload = mapFollowUpEntryToBackendPayload(entry)
        backendCollection = 'followups'
        entryLabel = 'Follow-up entry'
      }
      console.log(`POST /${backendCollection} payload:`, backendPayload)
      console.log(`Payload details:`, JSON.stringify(backendPayload, null, 2))
      try {
        const result = await saveBackendReport(backendCollection, backendPayload, entryLabel)
        console.debug(`${entryLabel} backend saved:`, result)
      } catch (err) {
        console.error(`${entryLabel} backend save failed:`, err)
        console.error(`Error details:`, err.message, err.stack)
        showToast(`Failed to save to backend. Please try again.`, 'error')
        resetSubmitBtn()
        return
      }
    }

    window.lastCreatedAdminLead = entry
    showLeadSuccessModal(entry)
    showToast(`${successLabel} saved successfully`, 'success')
    renderDashboard()
    if (typeof renderLeads === 'function') renderLeads()
    
    // Navigate to appropriate section based on type
    if (type === 'call') {
      if (typeof renderCalls === 'function') renderCalls()
      const callTrackerBtn = document.querySelector('[data-sec="call-tracker"]')
      if (callTrackerBtn && typeof nav === 'function') {
        nav(callTrackerBtn)
      }
    } else {
      const leadsNavBtn = document.querySelector('[data-sec="leads"]')
      if (leadsNavBtn && typeof nav === 'function') {
        nav(leadsNavBtn)
      }
    }
  }, 400)
}

function toggleCompanyDetailsByOutcome() {
  const outcome = String(document.getElementById('lOutcome')?.value || '').trim().toLowerCase()
  const section = document.getElementById('companyRegistrationSection')
  if (!section) return

  const show = outcome === 'interested'
  section.style.display = show ? '' : 'none'

  if (!show) {
    ;['lGST', 'lPAN', 'lEntityType', 'lTurnover', 'lEmployees', 'lIncorporationYear', 'lRegisteredOffice', 'lBusinessDesc'].forEach(id => {
      const el = document.getElementById(id)
      if (el) el.value = ''
    })
  }
}

function toggleCallOutcomeCustom() {
  const outcome = String(document.getElementById('lOutcome')?.value || '').trim().toLowerCase()
  const customGroup = document.getElementById('lOutcomeCustomGroup')
  if (!customGroup) return

  const show = outcome === 'reference' || outcome === 'other'
  customGroup.style.display = show ? '' : 'none'
  if (!show) {
    const input = document.getElementById('lOutcomeCustom')
    if (input) input.value = ''
  }
}

if (typeof document !== 'undefined') {
  const initLeadForm = () => {
    toggleCompanyDetailsByOutcome()
    toggleCallOutcomeCustom()
    const leadStageSelect = document.getElementById('ldPurpose')
    if (leadStageSelect && typeof updateLeadStatusOptions === 'function') {
      leadStageSelect.addEventListener('change', updateLeadStatusOptions)
      updateLeadStatusOptions()
    }
  }

  if (document.readyState !== 'loading') {
    initLeadForm()
  } else {
    document.addEventListener('DOMContentLoaded', initLeadForm)
  }
}

function showLeadSuccessModal(entry) {
  const modal = document.getElementById('leadSuccessModal')
  const body = document.getElementById('leadSuccessBody')
  if (!modal || !body) return

  const summary = `
    <div style="display:grid;gap:12px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div style="background:#f8fafc;border:1px solid #dbeafe;border-radius:12px;padding:14px;">
          <div style="font-size:12px;color:#64748b;margin-bottom:6px;">Lead ID</div>
          <div style="font-size:16px;font-weight:700;color:#1d4ed8;">${entry.id}</div>
        </div>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px;">
          <div style="font-size:12px;color:#166534;margin-bottom:6px;">Status</div>
          <div style="font-size:16px;font-weight:700;color:#166534;">${entry.currentStatus || 'New Lead'}</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div style="background:#fff7ed;border:1px solid #ffedd5;border-radius:12px;padding:14px;">
          <div style="font-size:12px;color:#92400e;margin-bottom:6px;">Company</div>
          <div style="font-size:16px;font-weight:700;color:#92400e;">${entry.companyName}</div>
        </div>
        <div style="background:#eef2ff;border:1px solid #e0e7ff;border-radius:12px;padding:14px;">
          <div style="font-size:12px;color:#4338ca;margin-bottom:6px;">Contact Person</div>
          <div style="font-size:16px;font-weight:700;color:#4338ca;">${entry.contactPerson || '—'}</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div style="background:#fef9c3;border:1px solid #fef08a;border-radius:12px;padding:14px;">
          <div style="font-size:12px;color:#7c2d12;margin-bottom:6px;">Lead Source</div>
          <div style="font-size:16px;font-weight:700;color:#7c2d12;">${entry.leadSource || 'Other'}</div>
        </div>
        <div style="background:#e0f2fe;border:1px solid #bae6fd;border-radius:12px;padding:14px;">
          <div style="font-size:12px;color:#0c4a6e;margin-bottom:6px;">Created By</div>
          <div style="font-size:16px;font-weight:700;color:#0c4a6e;">${entry.createdByName || entry.createdBy}</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;">
          <div style="font-size:12px;color:#475569;margin-bottom:6px;">Next Follow-up</div>
          <div style="font-size:16px;font-weight:700;color:#0f172a;">${entry.nextFollowUp || 'Not set'}</div>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;">
          <div style="font-size:12px;color:#475569;margin-bottom:6px;">Deal Value</div>
          <div style="font-size:16px;font-weight:700;color:#0f172a;">${entry.dealValue || '—'}</div>
        </div>
      </div>
    </div>
  `

  body.innerHTML = summary
  modal.style.display = 'flex'
}

function closeLeadSuccessModal() {
  const modal = document.getElementById('leadSuccessModal')
  if (modal) modal.style.display = 'none'
}

function openLeadJourneyFromSuccess() {
  closeLeadSuccessModal()
  const target = document.querySelector('[data-sec=leads]')
  if (target) nav(target)
  if (typeof renderLeads === 'function') renderLeads()
}

function addAnotherLeadFromSuccess() {
  closeLeadSuccessModal()
  const target = document.querySelector('[data-sec=lead-form]')
  if (target) nav(target)
  const focusField = document.getElementById('lCompany')
  if (focusField) focusField.focus()
}

// Make globally available for onclick handlers
window.submitLead = submitLead

// Attach event listeners to submit buttons (replacing inline onclick)
document.addEventListener('DOMContentLoaded', function() {
  const incSubmitBtn = document.getElementById('incSubmitBtn')
  const outSubmitBtn = document.getElementById('outSubmitBtn')
  const ldSubmitBtn = document.getElementById('ldSubmitBtn')

  if (incSubmitBtn) {
    incSubmitBtn.addEventListener('click', function() {
      submitLead('call', 'inc')
    })
  }

  if (outSubmitBtn) {
    outSubmitBtn.addEventListener('click', function() {
      submitLead('call', 'out')
    })
  }

  if (ldSubmitBtn) {
    ldSubmitBtn.addEventListener('click', function() {
      submitLead('lead')
    })
  }
})

async function renderLeads() {
  console.log('[renderLeads] Starting renderLeads function')
  
  // Check if API client is available
  if (!window.API) {
    console.error('[renderLeads] window.API is not defined - crm-api-client.js may not have loaded')
    console.log('[renderLeads] Available window properties:', Object.keys(window).filter(k => k.includes('API') || k.includes('api')))
  } else {
    console.log('[renderLeads] window.API is available:', typeof window.API)
  }
  
  const q = document.getElementById('leadSearch')?.value?.toLowerCase() || ''
  const execF = document.getElementById('leadExecF')?.value || ''
  const statusF = document.getElementById('leadStatusF')?.value || ''
  const leadDateFilter = document.getElementById('leadDate')?.value || ''

  const tbody = document.getElementById('leadsBody')
  const showing = document.getElementById('leadsCount')

  console.log('[renderLeads] Filters:', { q, execF, statusF, leadDateFilter })

  // Try to fetch from backend API first
  try {
    if (!window.API) {
      throw new Error('window.API is not defined')
    }
    
    console.log('[renderLeads] Attempting to fetch from backend API')
    const params = {
      skip: 0,
      limit: 1000, // Load more records for initial display
      search: q || undefined,
      lead_status: statusF || undefined
    }
    
    console.log('[renderLeads] API params:', params)
    console.log('[renderLeads] API base URL:', window.API.baseURL)
    console.log('[renderLeads] API auth token present:', !!window.API.authToken)
    
    const response = await window.API.getLeads(params)
    console.log('[renderLeads] API response:', response)
    
    if (response && response.items) {
      console.log('[renderLeads] Backend API returned items:', response.items.length, 'Total:', response.total)
      let filtered = response.items
      
      // Apply date filter if specified
      if (leadDateFilter) {
        const [filterYear, filterMonth, filterDay] = leadDateFilter.split('-').map(Number)
        filtered = filtered.filter(l => {
          if (!l.created_at) return false
          const leadDate = new Date(l.created_at)
          return leadDate.getFullYear() === filterYear &&
            leadDate.getMonth() === filterMonth - 1 &&
            leadDate.getDate() === filterDay
        })
        console.log('[renderLeads] After date filter:', filtered.length)
      }
      
      // Apply executive filter if specified
      if (execF) {
        filtered = filtered.filter(l => (l.assigned_user_name || l.sales_executive || l.salesExecutive) === execF)
        console.log('[renderLeads] After executive filter:', filtered.length)
      }

      console.log('[renderLeads] Final filtered count:', filtered.length)
      console.log('[renderLeads] Sample lead data:', filtered[0])

      if (showing) showing.textContent = `${filtered.length} of ${response.total} entries`

      if (tbody) {
        if (filtered.length === 0) {
          tbody.innerHTML = '<tr><td colspan="20" style="padding:40px;text-align:center;color:var(--gray-400);">No leads found</td></tr>'
        } else {
          tbody.innerHTML = filtered.map((l, idx) => {
            const date = l.created_at ? new Date(l.created_at).toLocaleDateString('en-IN') : '—'
            const exec = l.assigned_user_name || l.sales_executive || l.salesExecutive || '—'
            const comp = l.company_name || l.company || '—'
            const cont = l.lead_name || l.name || l.customerName || '—'
            const phone = l.mobile || l.phone || l.contact_number || l.contactNumber || '—'
            const designation = l.designation || l.Designation || l.ldDesig || l.job_title || '—'
            const email = l.email || l.emailId || l.email_id || '—'
            const location = l.location || l.ldLocation || l.city || l.cityState || l.address || '—'
            const prod = l.product_type || l.product || l.productDiscussed || '—'
            const creditRating = l.credit_rating || l.creditRating || '—'
            const ratingAgency = l.rating_agency || l.ratingAgency || '—'
            const ratingDate = l.rating_date || l.ratingDate || '—'
            const lenderDetails = l.lender_related_detail || l.lenderRelatedDetail || '—'
            const src = l.lead_source || l.source || l.leadSource || '—'
            const stage = l.lead_stage || l.leadStage || l.purpose || l.ldPurpose || '—'
            const stat = l.lead_status || l.currentStatus || l.status || '—'
            const rawLeadKey = String(parseLeadIdentifier(l) || l.id || `local-${idx}`)
            const safeLeadKey = rawLeadKey.replace(/[^a-zA-Z0-9_-]/g, '_')
            const foll = l.followup_date ? new Date(l.followup_date).toLocaleDateString('en-IN') : (l.nextFollowUp ? formatDate(l.nextFollowUp) : '—')
            const lastActivity = l.lastActivity || l.ldLastActivity || l.last_activity || '—'
            let dv = l.deal_value || l.funding_amount || '—'
            if (dv !== '—' && !dv.toString().includes('₹')) dv = '₹' + Number(dv).toLocaleString('en-IN')
            const ageing = calculateLeadAge(l.created_at)

            return `
            <tr style="border-bottom:1px solid var(--gray-100);">
              <td style="padding:14px 16px;">${date}</td>
              <td style="padding:14px 16px;color:var(--gray-700);">${exec}</td>
              <td style="padding:14px 16px;font-weight:500;color:var(--gray-900);">${comp}</td>
              <td style="padding:14px 16px;">
                <div style="display:flex;flex-direction:column;gap:4px;">
                  <span>${cont}</span>
                  <span style="font-size:12px;color:var(--gray-500);">${phone}</span>
                </div>
              </td>
              <td style="padding:14px 16px;">${designation}</td>
              <td style="padding:14px 16px;">${email}</td>
              <td style="padding:14px 16px;">${location}</td>
              <td style="padding:14px 16px;">${prod}</td>
              <td style="padding:14px 16px;">${creditRating}</td>
              <td style="padding:14px 16px;">${ratingAgency}</td>
              <td style="padding:14px 16px;">${ratingDate}</td>
              <td style="padding:14px 16px;">${lenderDetails}</td>
              <td style="padding:14px 16px;"><small>${src}</small></td>
              <td style="padding:14px 16px;">
                <select id="lead-status-${safeLeadKey}" onchange="handleRowLeadStatusChange('${escapeJsString(rawLeadKey)}', this.value)" style="width:100%;min-width:160px;line-height:1.5;">
                  ${buildLeadStatusOptions(stage, stat)}
                </select>
              </td>
              <td style="padding:14px 16px;">
                <select id="lead-stage-${safeLeadKey}" onchange="handleRowLeadStageChange('${escapeJsString(rawLeadKey)}', '${escapeJsString(safeLeadKey)}', this.value)" style="width:100%;min-width:160px;line-height:1.5;">
                  ${buildLeadStageOptions(stage)}
                </select>
              </td>
              <td style="padding:14px 16px;color:var(--gray-700);">${foll}</td>
              <td style="padding:14px 16px;color:var(--gray-700);">${lastActivity}</td>
              <td style="padding:14px 16px;color:var(--gray-700);font-weight:600;">${dv}</td>
              <td style="padding:14px 16px;color:var(--gray-700);text-align:right;">${ageing}</td>
              <td style="padding:14px 16px;display:flex;justify-content:center;gap:8px;">
                <button class="btn-icon" type="button" onclick="openDealModal('${escapeJsString(rawLeadKey)}')" title="Start deal from lead" aria-label="Start deal from lead" style="background:transparent;border:none;cursor:pointer;font-size:16px;color:var(--gray-500);padding:4px 8px;border-radius:4px;transition:all 0.2s;" onmouseover="this.style.color='#059669'" onmouseout="this.style.color='var(--gray-500)'">🤝</button>
                <button class="btn-icon" type="button" onclick="openProfile('lead','${l.id || idx}')" title="View profile" aria-label="View lead profile" style="background:transparent;border:none;cursor:pointer;font-size:16px;color:var(--gray-500);padding:4px 8px;border-radius:4px;transition:all 0.2s;" onmouseover="this.style.color='#9B2335'" onmouseout="this.style.color='var(--gray-500)'">👤</button>
                <button class="btn-icon" type="button" onclick="openLeadCaseManager('${l.id || idx}')" title="Manage lender cases" aria-label="Manage lender cases for lead" style="background:transparent;border:none;cursor:pointer;font-size:16px;color:var(--gray-500);padding:4px 8px;border-radius:4px;transition:all 0.2s;" onmouseover="this.style.color='#0f766e'" onmouseout="this.style.color='var(--gray-500)'">🏦</button>
                <button class="btn-icon" type="button" onclick="changeLeadStatus('${escapeJsString(rawLeadKey)}')" title="Change status" aria-label="Change lead status" style="background:transparent;border:none;cursor:pointer;font-size:16px;color:var(--gray-500);padding:4px 8px;border-radius:4px;transition:all 0.2s;" onmouseover="this.style.color='#0f766e'" onmouseout="this.style.color='var(--gray-500)'">🔄</button>
                <button class="btn-icon" type="button" onclick="deleteLead('${escapeJsString(rawLeadKey)}')" title="Delete lead" aria-label="Delete lead" style="background:transparent;border:none;cursor:pointer;font-size:16px;color:var(--gray-500);padding:4px 8px;border-radius:4px;transition:all 0.2s;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='var(--gray-500)'">🗑️</button>
              </td>
            </tr>
            `
          }).join('')
        }
      }
      console.log('[renderLeads] Successfully rendered from backend API')
      return
    } else {
      console.log('[renderLeads] Backend API response invalid or missing items:', response)
    }
  } catch (err) {
    console.error('[renderLeads] Failed to fetch leads from backend, falling back to localStorage:', err)
  }

  // Fallback to localStorage if backend fails
  if (typeof refreshBackendLeadJourneyData === 'function') {
    refreshBackendLeadJourneyData().catch(err => console.warn('Failed to refresh backend leads:', err))
  }

  // Get leads from both localStorage (manual entries) and sessionStorage (imported data)
  let allLeads = myLeadsJ().map(parseLeadData);
  
  // Also get imported leads from localStorage/sessionStorage, whichever contains the data
  try {
    const importedLeads = []
    ;['local', 'session'].forEach(storage => {
      const raw = (storage === 'session' ? sessionStorage : localStorage).getItem('crm_leads_journey') || '[]'
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          importedLeads.push(...parsed.map(parseLeadData))
        }
      } catch (inner) {
        console.warn(`Error parsing crm_leads_journey from ${storage}Storage:`, inner)
      }
    })
    if (importedLeads.length > 0) {
      allLeads = allLeads.concat(importedLeads)
    }
  } catch (e) {
    console.error('Error loading imported leads:', e)
  }

  // Remove duplicates by ID or composite key (company + contact + date)
  const seen = new Set();
  let filtered = [];
  for (const lead of allLeads) {
    // Use stable ID if available, otherwise create composite key without source to prevent duplicates
    const leadId = lead.id || lead.ID || lead.uniqueId || lead.uid || 
                   `${lead.companyName || lead.company || ''}|${lead.contactPerson || lead.leadName || ''}|${lead.dateOfEntry || lead.created_at || ''}`;
    if (!seen.has(leadId)) {
      seen.add(leadId);
      filtered.push(lead);
    }
  }

  if (q) filtered = filtered.filter(l =>
    (l.companyName && l.companyName.toLowerCase().includes(q)) ||
    (l.contactPerson && l.contactPerson.toLowerCase().includes(q)) ||
    (l.contactNumber && l.contactNumber.toString().toLowerCase().includes(q)) ||
    (l.company && l.company.toLowerCase().includes(q)) ||
    (l.leadName && l.leadName.toLowerCase().includes(q)) ||
    (l.Company && l.Company.toLowerCase().includes(q)) ||
    (l.Contact && l.Contact.toLowerCase().includes(q)) ||
    (l.phone && l.phone.toString().toLowerCase().includes(q)) ||
    (l.mobile && l.mobile.toString().toLowerCase().includes(q))
  )

  if (leadDateFilter) {
    const [filterYear, filterMonth, filterDay] = leadDateFilter.split('-').map(Number)
    filtered = filtered.filter(l => {
      const leadDate = parseLeadDate(l.dateOfEntry || l.DATE || l.timestamp || l.date || l.DATE_OF_ENTRY || l.createdAt || l.created_at || l.dateCreated || l.date_created || l['Date of Entry'] || '')
      if (!leadDate) return false
      return leadDate.getFullYear() === filterYear &&
        leadDate.getMonth() === filterMonth - 1 &&
        leadDate.getDate() === filterDay
    })
  }

  if (execF) filtered = filtered.filter(l => l.salesExecutive === execF)
  if (statusF) filtered = filtered.filter(l => (l.currentStatus || l.status || l.Status) === statusF)

  if (showing) showing.textContent = filtered.length + ' entries'

  if (tbody) {
    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="20" style="padding:40px;text-align:center;color:var(--gray-400);">No leads found</td></tr>'
    } else {
      const displayData = filtered.slice()
      tbody.innerHTML = displayData.map((l, idx) => {
        const date = l.dateOfEntry || l.DATE || l.timestamp || l.date || l.DATE_OF_ENTRY || l.createdAt || l.created_at || l.dateCreated || l.date_created || l['Date of Entry'] || '—'
        const exec = l.salesExecutive || l.assignedEmployee || l.assignedEmployeeName || l.createdByName || l.EXECUTIVE || '—'
        const comp = l.companyName || l.company || l.Company || l.customerCompany || l.customer_company || l.customer_company_name || l.customerCompanyName || l['Customer Company Name'] || l.CustomerCompanyName || l.customerName || l.company_name || '—'
        const cont = l.contactPerson || l.leadName || l.name || l.Contact || l.CONTACT || '—'
        const phone = l.contactNumber || l.phone || l.mobile || l.MobNo || l.mobileNo || l['Contact Number'] || '—'
        const designation = l.designation || l.Designation || l.ldDesig || l.job_title || '—'
        const email = l.email || l.emailId || l.email_id || l.EMAIL || l.emailAddress || l.contactEmail || l.contact_email || '—'
        const location = l.location || l.ldLocation || l.city || l.cityState || l['City/State'] || l.address || '—'
        const prod = l.productDiscussed || l.product || l.PRODUCT || '—'
        const creditRating = l.creditRating || l.credit_rating || l.Rating || l.CREDIT_RATING || '—'
        const ratingAgency = l.ratingAgency || l.rating_agency || l.RatingAgency || l.RATING_AGENCY || '—'
        const ratingDate = l.ratingDate || l.rating_date || l.RatingDate || l.RATING_DATE || '—'
        const lenderDetails = l.lenderRelatedDetail || l.lender_related_detail || l.LenderRelatedDetail || l.LENDER_RELATED_DETAIL || '—'
        const src = l.leadSource || l.source || l.Source || l.SOURCE || '—'
        const stage = l.lead_stage || l.leadStage || l.purpose || l.ldPurpose || '—'
        const stat = l.currentStatus || l.status || l.Status || l.STATUS || l.lead_status || '—'
        const rawLeadKey = String(parseLeadIdentifier(l) || l.id || `local-${idx}`)
        const safeLeadKey = rawLeadKey.replace(/[^a-zA-Z0-9_-]/g, '_')
        const foll = l.nextFollowUp || l.firstCallDate || l['FOLLOW-UP'] || l['Follow-up'] || '—'
        const lastActivity = l.lastActivity || l.ldLastActivity || l.last_activity || l.LastActivity || '—'
        let dv = l.dealValue || l.value || l.VALUE || l['DEAL VALUE'] || '—'
        if (dv !== '—' && !dv.toString().includes('₹')) dv = '₹' + dv
        const ageing = calculateLeadAge(l.dateOfEntry || l.DATE || l.timestamp || l.date || l.DATE_OF_ENTRY || l.createdAt || l.created_at || l.dateCreated || l.date_created || l['Date of Entry'] || '')

        return `
        <tr style="border-bottom:1px solid var(--gray-100);">
          <td style="padding:14px 16px;">${date}</td>
          <td style="padding:14px 16px;color:var(--gray-700);">${exec}</td>
          <td style="padding:14px 16px;font-weight:500;color:var(--gray-900);">${comp}</td>
          <td style="padding:14px 16px;color:var(--gray-700);">
            <div style="display:flex;flex-direction:column;gap:4px;">
              <span>${cont}</span>
              <span style="font-size:12px;color:var(--gray-400);">${phone !== '—' ? phone : ''}</span>
            </div>
          </td>
          <td style="padding:14px 16px;color:var(--gray-700);">${designation}</td>
          <td style="padding:14px 16px;color:var(--gray-700);">${email}</td>
          <td style="padding:14px 16px;color:var(--gray-700);">${location}</td>
          <td style="padding:14px 16px;color:var(--gray-700);">${prod}</td>
          <td style="padding:14px 16px;color:var(--gray-700);">${creditRating}</td>
          <td style="padding:14px 16px;color:var(--gray-700);">${ratingAgency}</td>
          <td style="padding:14px 16px;color:var(--gray-700);">${ratingDate}</td>
          <td style="padding:14px 16px;color:var(--gray-700);">${lenderDetails}</td>
          <td style="padding:14px 16px;color:var(--gray-700);">${src}</td>
          <td style="padding:14px 16px;">
            <select id="lead-status-${safeLeadKey}" onchange="handleRowLeadStatusChange('${escapeJsString(rawLeadKey)}', this.value)" style="width:100%;min-width:160px;line-height:1.5;">
              ${buildLeadStatusOptions(stage, stat)}
            </select>
          </td>
          <td style="padding:14px 16px;">
            <select id="lead-stage-${safeLeadKey}" onchange="handleRowLeadStageChange('${escapeJsString(rawLeadKey)}', '${escapeJsString(safeLeadKey)}', this.value)" style="width:100%;min-width:160px;line-height:1.5;">
              ${buildLeadStageOptions(stage)}
            </select>
          </td>
          <td style="padding:14px 16px;color:var(--gray-700);">${foll}</td>
          <td style="padding:14px 16px;color:var(--gray-700);">${lastActivity}</td>
          <td style="padding:14px 16px;color:var(--gray-700);font-weight:600;">${dv}</td>
          <td style="padding:14px 16px;color:var(--gray-700);text-align:right;">${ageing}</td>
          <td style="padding:14px 16px;text-align:center;display:flex;justify-content:center;gap:8px;">
            <button class="btn-icon" type="button" onclick="openProfile('lead','${l.id || idx}')" title="View profile" aria-label="View lead profile" style="background:transparent;border:none;cursor:pointer;font-size:16px;color:var(--gray-500);padding:4px 8px;border-radius:4px;transition:all 0.2s;" onmouseover="this.style.color='#9B2335'" onmouseout="this.style.color='var(--gray-500)'">👤</button>
            <button class="btn-icon" type="button" onclick="openLeadCaseManager('${l.id || idx}')" title="Manage lender cases" aria-label="Manage lender cases for lead" style="background:transparent;border:none;cursor:pointer;font-size:16px;color:var(--gray-500);padding:4px 8px;border-radius:4px;transition:all 0.2s;" onmouseover="this.style.color='#0f766e'" onmouseout="this.style.color='var(--gray-500)'">🏦</button>
            <button class="btn-icon" type="button" onclick="changeLeadStatus('${String(l.id || idx).replace(/'/g, "\\'")}')" title="Change Status" aria-label="Change lead status" style="background:transparent;border:none;cursor:pointer;font-size:16px;color:var(--gray-500);padding:4px 8px;border-radius:4px;transition:all 0.2s;" onmouseover="this.style.color='#0f766e'" onmouseout="this.style.color='var(--gray-500)'">🔄</button>
            <button class="btn-icon" type="button" onclick="deleteLead('${String(l.id || idx).replace(/'/g, "\\'")}')" title="Delete lead" aria-label="Delete lead" style="background:transparent;border:none;cursor:pointer;font-size:16px;color:var(--gray-500);padding:4px 8px;border-radius:4px;transition:all 0.2s;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='var(--gray-500)'">🗑️</button>
          </td>
        </tr>
      `}).join('')
    }
  }
}

async function changeLeadStatus(leadId) {
  const targetId = String(leadId || '').trim()
  if (!targetId) return

  const currentLead = findLeadById(targetId)
  const currentStatus = currentLead?.lead_status || currentLead?.currentStatus || currentLead?.status || 'Unknown'
  const newStatus = prompt(`Change status for lead ${targetId}\nCurrent status: ${currentStatus}\nEnter new status:`)
  if (!newStatus) return

  const statusValue = newStatus.trim()
  if (!statusValue || statusValue === currentStatus) {
    showToast('Status update canceled or unchanged', 'info')
    return
  }

  try {
    if (window.API && typeof window.API.updateLead === 'function') {
      await window.API.updateLead(targetId, {
        lead_status: statusValue,
        currentStatus: statusValue,
        status: statusValue
      })
      showToast('Lead status updated successfully', 'success')
    }
  } catch (err) {
    console.warn('Backend update failed for lead status:', err)
    showToast('Unable to update status on backend. Saving locally.', 'warning')
  }

  try {
    if (typeof getLeadsJourney === 'function' && typeof saveLeadsJourney === 'function') {
      const allLeads = getLeadsJourney() || []
      const updatedLeads = allLeads.map((lead) => {
        if (parseLeadIdentifier(lead) === targetId) {
          return {
            ...lead,
            lead_status: statusValue,
            currentStatus: statusValue,
            status: statusValue
          }
        }
        return lead
      })
      saveLeadsJourney(updatedLeads)
    }
  } catch (err) {
    console.warn('Local status update failed:', err)
  }

  if (typeof renderLeads === 'function') {
    renderLeads()
  }
}

async function deleteLead(leadId) {
  if (!confirm('Are you sure you want to delete this lead?')) return

  const targetId = String(leadId || '').trim()
  if (!targetId) return

  let allLeads = getLeadsJourney()
  let leadIndex = allLeads.findIndex(l => parseLeadIdentifier(l) === targetId)
  let removedLead = null

  if (leadIndex !== -1) {
    [removedLead] = allLeads.splice(leadIndex, 1)
  } else {
    const removeImported = storage => {
      try {
        const importedLeads = JSON.parse((storage === 'session' ? sessionStorage : localStorage).getItem('crm_leads_journey') || '[]') || []
        const idx = importedLeads.findIndex(raw => parseLeadIdentifier(parseLeadData(raw)) === targetId)
        if (idx === -1) return null
        const [deleted] = importedLeads.splice(idx, 1)
        ;(storage === 'session' ? sessionStorage : localStorage).setItem('crm_leads_journey', JSON.stringify(importedLeads))
        return parseLeadData(deleted)
      } catch (e) {
        return null
      }
    }
    removedLead = removeImported('session') || removeImported('local')
  }

  if (!removedLead) return

  // Delete from backend FIRST - localStorage cleanup happens after
  if (removedLead && removedLead.id) {
    try {
      await postToCRMBackendEndpoint(`leads/${encodeURIComponent(String(removedLead.id))}`, null, 'DELETE')
      console.log('Lead deleted from backend successfully')
    } catch (err) {
      console.warn('Lead delete from backend failed', err)
      showToast('Failed to delete lead from backend. Please try again.', 'error')
      return
    }
  }

  // Only update localStorage AFTER successful backend delete (for caching)
  saveLeadsJourney(allLeads)

  const company = (removedLead.companyName || removedLead.company || '').trim().toLowerCase()
  const contact = (removedLead.contactPerson || removedLead.leadName || '').trim().toLowerCase()
  const email = (removedLead.emailId || '').trim().toLowerCase()
  const phone = (removedLead.contactNumber || '').replace(/[^0-9]/g, '')

  const stored = DataStore.getAll()
  if (stored.leads && Array.isArray(stored.leads)) {
    stored.leads = stored.leads.filter(item => {
      const existingCompany = (item.company || '').trim().toLowerCase()
      const existingContact = (item.name || '').trim().toLowerCase()
      const existingEmail = (item.email || '').trim().toLowerCase()
      const existingPhone = (item.phone || '').replace(/[^0-9]/g, '')

      const sameCompany = company && existingCompany === company
      const sameContact = contact && existingContact === contact
      const sameEmail = email && existingEmail === email
      const samePhone = phone && existingPhone === phone

      return !(sameCompany && (sameContact || sameEmail || samePhone) || sameEmail || samePhone)
    })
    DataStore.saveAll(stored)
  }

  if (typeof deleteFirebaseEntry === 'function') {
    deleteFirebaseEntry('leadJourneys', String(removedLead.id)).catch(err => console.warn('Firebase lead delete failed', err))
    deleteFirebaseEntry('leads', String(removedLead.id)).catch(err => console.warn('Firebase lead delete failed', err))
  }

  showToast('Lead deleted', 'info')
  renderLeads()
}

let currentCaseLeadId = null

function showCaseManagementSection() {
  document.querySelectorAll('.nav-btn').forEach(n => n.classList.remove('active'))
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'))
  const section = document.getElementById('sec-case-management')
  if (section) section.classList.add('active')
  const navBtn = document.querySelector('[data-sec="case-management"]')
  if (navBtn) navBtn.classList.add('active')
  const topTitle = document.getElementById('topTitle')
  if (topTitle) topTitle.textContent = 'Multi-Lender Case Management'

  if (!currentCaseLeadId) {
    const allLeads = typeof getLeadsJourney === 'function' ? getLeadsJourney() : []
    if (allLeads && allLeads.length > 0) {
      currentCaseLeadId = String(allLeads[0].id)
    }
  }

  if (currentCaseLeadId) {
    window.currentCaseLeadId = currentCaseLeadId
    const lead = getLeadsJourney().find(l => String(l.id) === String(currentCaseLeadId))
    if (lead) renderCaseManagementHeader(lead)
  }

  renderLoanApplicationsTable()
}

function triggerLenderImport() {
  const input = document.getElementById('caseLenderImportInput')
  if (input) input.click()
}

function parseCSV(text) {
  const rows = text.split(/\r?\n/).filter(line => line.trim() !== '')
  const parsed = []

  function parseRow(row) {
    const values = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < row.length; i++) {
      const char = row[i]
      if (char === '"') {
        if (inQuotes && row[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current)
        current = ''
      } else {
        current += char
      }
    }
    values.push(current)
    return values
  }

  rows.forEach(row => parsed.push(parseRow(row)))
  return parsed
}

function normalizeLenderImportItem(item, currentLead) {
  const lenderName = item.lenderName || item.LenderName || item.lender || item.name || ''
  const appliedAmount = Number(item.appliedAmount || item.loanAmount || item.applied_amount || item.Amount || item.amount || 0)
  const status = item.applicationStatus || item.status || item.ContactStatus || 'Proposal Shared'
  const submissionDate = item.submissionDate || item.Submission || item.submission || item.createdAt || ''

  return {
    applicationId: item.applicationId || item.id || generateLoanApplicationId(currentLead),
    leadId: currentLead.id,
    leadCompany: currentLead.companyName || currentLead.company || '',
    lenderName,
    productType: item.productType || item.ProductType || item.product || item.loanType || '',
    loanAmount: appliedAmount,
    appliedAmount,
    applicationStatus: status,
    status,
    bankLoginDate: item.bankLoginDate || item.bankLogin || item.bank_login || '',
    bankReferenceNumber: item.bankReferenceNumber || item.bankRef || item.bank_reference || '',
    sanctionedAmount: Number(item.sanctionedAmount || item.sanctionAmount || item.sanctioned_amount || 0),
    sanctionDate: item.sanctionDate || item.sanction_date || '',
    interestRate: Number(item.interestRate || item.rate || 0),
    tenureMonths: Number(item.tenureMonths || item.tenor || item.term || 0),
    emiAmount: Number(item.emiAmount || item.emi || 0),
    disbursalAmount: Number(item.disbursalAmount || item.disbursedAmount || 0),
    disbursalDate: item.disbursalDate || item.disbursal_date || '',
    submissionDate,
    expectedPayoutPercent: Number(item.expectedPayoutPercent || item.payoutPercent || 0),
    expectedPayoutAmount: Number(item.expectedPayoutAmount || item.payoutAmount || 0),
    actualPayoutReceived: Number(item.actualPayoutReceived || item.payoutReceived || 0),
    payoutDate: item.payoutDate || item.payout_date || '',
    remarks: item.remarks || item.notes || '',
    location: item.location || item.Location || '',
    contactPerson: item.contactPersonName || item.ContactPersonName || item.contactPerson || item.ContactPerson || '',
    contactMobile: item.mobNo || item.MobNo || item.mobile || item.phone || '',
    contactStatus: item.contactStatus || item.ContactStatus || '',
    callOutcome: item.Notes || item.notes || '',
    onboardingFormSubmitted: item.onboardingFormSubmitted || item.OnboardingFormSubmitted || 'No',
    linkedInUrl: item.linkedInUrl || item.LinkedInUrl || item.linkedin || item.LinkedIn || ''
  }
}

function mapLoanApplicationToBackendLenderPayload(application) {
  if (!application) return {}
  return {
    application_id: application.applicationId || application.application_id || `${Date.now()}`,
    lead_id: application.leadId || null,
    parent_lead_id: application.parentLeadId || null,
    lead_company: application.companyName || application.leadCompany || '',
    lender_name: application.lenderName || application.lender_name || '',
    product_type: application.productType || application.product_type || '',
    applied_loan_amount: application.appliedAmount || application.loanAmount || application.applied_loan_amount || 0,
    application_status: application.applicationStatus || application.status || application.application_status || '',
    contacted_person_name: application.contactPerson || application.contactPersonName || application.contacted_person_name || '',
    mobile_no: application.contactMobile || application.mobNo || application.mobile_no || '',
    linkedin_url: application.linkedInUrl || application.LinkedInUrl || application.linkedin_url || '',
    outcome_of_call: application.callOutcome || application.outcome_of_call || '',
    lender_onboarding_form: application.onboardingFormSubmitted || application.onboarding_form_submitted || 'No',
    contact_status: application.contactStatus || application.ContactStatus || '',
    bank_login_date: application.bankLoginDate || application.bank_login_date || '',
    bank_reference_number: application.bankReferenceNumber || application.bank_reference_number || '',
    sanction_date: application.sanctionDate || application.sanction_date || '',
    interest_rate: application.interestRate || application.interest_rate || 0,
    tenure_months: application.tenureMonths || application.tenure_months || 0,
    emi_amount: application.emiAmount || application.emi_amount || 0,
    disbursal_amount: application.disbursalAmount || application.disbursal_amount || 0,
    disbursal_date: application.disbursalDate || application.disbursal_date || '',
    expected_payout_percent: application.expectedPayoutPercent || application.expected_payout_percent || 0,
    actual_payout_received: application.actualPayoutReceived || application.actual_payout_received || 0,
    payout_date: application.payoutDate || application.payout_date || '',
    tat_tracker: application.tatTracker || application.tat_tracker || {},
    rejection_reason: application.rejectionReason || application.rejection_reason || '',
    remarks: application.remarks || application.remark || ''
  }
}

async function saveLoanApplicationToBackend(application) {
  if (typeof saveBackendReport !== 'function') return null
  try {
    const payload = mapLoanApplicationToBackendLenderPayload(application)
    if (!payload.application_id) {
      console.warn('Loan application missing application_id for backend save', application)
      return null
    }
    return await saveBackendReport('lender', payload, 'Lender application')
  } catch (err) {
    console.warn('Backend lender save failed:', err)
    if (typeof showToast === 'function') {
      showToast('Lender application saved locally; backend sync failed.', 'warning')
    }
    return null
  }
}

const sampleLenderOnboardingCSV = `srNo,Location,LenderName,ProductType,ContactPersonName,MobNo,ContactStatus,Notes,LinkedInUrl
1,Mumbai,Nabsamruddhi Finance Ltd,microfinance institutions,sachin sharma,9650570688,Invalid number tha,,
2,Mumbai,.KCapital AService Ltd,Project Finance,Snehal Naik,9821092453,Not Answering,,
3,Jaipur,Namdev Finvest Pvt Ltd,"Lap, Green energy Finance",Koshal Vajpeyee,982965093,Not Answering,,
4,Mumbai,Anand Rathi Global Finance Ltd,"Las, Lap Construction Finance",Arvind Bachkar,7738778122,Not Answering,,
5,pune,Capital India Finance Ltd,"Structure Finace Loans, Machinery Finance",Shrikrishna Parse,8855053233,Not Answering,,
6,Mumbai,Apac Financial ServicesPvt Ltd,Lap,Deepak,9932089301,baad me call karega,,
7,Mumbai,RattanIndia Finance PVt Ltd,"Lap, Secured Corporate Funding",Kishan Singh,9004082502,Invalid number tha,,
8,velocity,Quid Capital,Supply Chain Finance,Vijay Navlli,999,Invalid number tha,,
9,Mumbai,Societe Generale Global Solution Centre,Supply Chain Finance,Biju Balan,988988,Invalid number tha,,
10,Raipur,Indostar Finance Capital Ltd,Lap,Anupam Ranjjeet,9993677755,Call kat diya tha,,
11,Gurgaon,Power to sme,Supply Chain Finance,Ashish Chug,9999310304,Waiting for Channel Partner Agreement,,
12,delhi,stride one,SCF,Rohit Rao,9820770691,Need to share Company profile along with the Offering,,
13,heydrabad,Axis bank,SCF/ working capital,Sai Ravindra,7306888899,Day after Tommrow need to rengance since the person is not avaible,,
14,delhi,Kotak Bank,SCF / Working Capital,Anand Tiwari,8318214235,after1 week call karne bola hai.noida,,
15,mumbai,profectus capital pvt ltd,scf,naman kothari,9978632395,baad me call karega bola,,
16,noida UP,c2fo lender,scf,dushant singh,7972312286,leads share karna start karna hoga,,
17,new delhi delhi,air8 finance,export factoring,abhishek verma,956900100,after 2months calling karne bola hai supply chain finance ke liye tab se wo log dsa ke sath kaam karna start karne wale hai currently wo log dsa ke sath kaam nhi kar rahe hai.,,
18,new delhi delhi,pavanam finance,Supply Chain Finance,piyush mishra,8506091652,parimal ne eximpe company ko chod diya hai,,
19,mumbai maharashtra,eximpe finance,supply chain finance & trade finance,parimal ramteke,9595111542,Outcome of call unclear,"https://www.linkedin.com/in/dhirajkumar2501/ usne uske coligue ka reference diya hai deepak chandal karke jo abhi currently supply chain finance handle kar raha hai.",
20,Mumbai,Nabsamruddhi Finance Ltd,microfinance institutions,sachin sharma,7530023462,Invalid number tha,,
21,Mumbai,.KCapital AService Ltd,Project Finance,Snehal Naik,7554428020,Not Answering,,
22,Jaipur,Namdev Finvest Pvt Ltd,"Lap, Green energy Finance",Koshal Vajpeyee,7578832577,Not Answering,,
23,Mumbai,Anand Rathi Global Finance Ltd,"Las, Lap Construction Finance",Arvind Bachkar,7603237134,Not Answering,,
24,pune,Capital India Finance Ltd,"Structure Finace Loans, Machinery Finance",Shrikrishna Parse,7627641691,leads share karna start karna hoga,,
27,mumbai maharashtra,IIFL Finance,"Supply Chain Finance & export Finance",Chinmay Gadekar,9028774215,leads share karna start karna hoga,,
28,mumbai maharashtra,Flexi Payment,Supply Chian Finance,Rajesh Matta,9167334215,aur kal team meeting ha,,`

async function importSampleLenderOnboardingData() {
  if (!currentCaseLeadId) {
    showToast('Select a lead before importing sample lender data.', 'info')
    return
  }

  const currentLead = getLeadsJourney().find(l => String(l.id) === String(currentCaseLeadId))
  if (!currentLead) {
    showToast('Select a valid lead before importing sample lender data.', 'error')
    return
  }

  const rows = parseCSV(sampleLenderOnboardingCSV)
  if (rows.length < 2) {
    showToast('Sample data is not available.', 'error')
    return
  }

  const headers = rows.shift().map(h => h.trim())
  const data = rows.map(row => {
    const item = {}
    headers.forEach((h, idx) => item[h] = (row[idx] || '').trim())
    return item
  })

  data.forEach(item => {
    const record = normalizeLenderImportItem(item, currentLead)
    if (record.lenderName) {
      DataStore.add('loanApplications', record)
      saveLoanApplicationToBackend(record)
    }
  })

  showToast('Sample lender onboarding data imported.', 'success')
  renderLoanApplicationsTable()
  renderCaseManagementHeader(currentLead)
}

function handleLenderImport(event) {
  const file = event.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = function(e) {
    try {
      const text = e.target.result
      let data = []
      if (file.name.toLowerCase().endsWith('.csv')) {
        const rows = parseCSV(text)
        if (rows.length === 0) {
          throw new Error('Empty CSV file')
        }

        const headers = rows.shift().map(h => h.trim())
        data = rows.map(row => {
          const item = {}
          headers.forEach((h, idx) => item[h] = (row[idx] || '').trim())
          return item
        })
      } else {
        data = JSON.parse(text)
      }

      if (!Array.isArray(data)) {
        throw new Error('Imported file must contain an array of lender records')
      }

      const currentLead = getLeadsJourney().find(l => String(l.id) === String(currentCaseLeadId))
      if (!currentLead) {
        showToast('Select a lead before importing lenders.', 'error')
        return
      }

      data.forEach(item => {
        const record = normalizeLenderImportItem(item, currentLead)
        if (record.lenderName) {
          DataStore.add('loanApplications', record)
          saveLoanApplicationToBackend(record)
        }
      })

      showToast('Lenders imported successfully.', 'success')
      renderLoanApplicationsTable()
      renderCaseManagementHeader(currentLead)
    } catch (err) {
      console.error(err)
      showToast('Failed to import lenders. Check file format.', 'error')
    }
  }
  reader.readAsText(file)
  event.target.value = ''
}

function clearLenderApplications() {
  if (typeof currentCaseLeadId === 'undefined' || !currentCaseLeadId) {
    showToast('Select a lead before clearing lenders.', 'info')
    return
  }

  if (!confirm('Clear all lender applications for this lead?')) return
  const stored = DataStore.getAll()
  if (stored.loanApplications && Array.isArray(stored.loanApplications)) {
    stored.loanApplications = stored.loanApplications.filter(app => String(app.leadId) !== String(currentCaseLeadId))
    DataStore.saveAll(stored)
  }
  showToast('Lender applications cleared.', 'success')
  const lead = getLeadsJourney().find(l => String(l.id) === String(currentCaseLeadId))
  renderCaseManagementHeader(lead)
  renderLoanApplicationsTable()
}

function goToLeadsSection() {
  const leadsButton = document.querySelector('[data-sec="leads"]')
  if (leadsButton) {
    nav(leadsButton)
  }
}

async function refreshCaseManagement() {
  showCaseManagementSection()

  // Auto-fetch leads from API if available
  if (typeof window.apiClient === 'undefined' || !window.apiClient) {
    try {
      window.apiClient = new APIClient();
      console.log('[CaseManagement] APIClient initialized');
    } catch (e) {
      console.warn('[CaseManagement] Failed to initialize APIClient:', e);
    }
  }

  // Try to fetch leads from API
  if (window.apiClient && typeof window.apiClient.getLeads === 'function') {
    try {
      console.log('[CaseManagement] Fetching leads from API...');
      const response = await window.apiClient.getLeads({ skip: 0, limit: 100 });
      const leadsFromAPI = response?.items || response || [];
      if (Array.isArray(leadsFromAPI) && leadsFromAPI.length > 0) {
        console.log('[CaseManagement] Fetched leads from API:', leadsFromAPI.length);
        // Merge API leads with local leads
        const localLeads = typeof getLeadsJourney === 'function' ? getLeadsJourney() : [];
        console.log('[CaseManagement] Local leads count before merge:', localLeads.length);
        const mergedLeads = [];
        const seenIds = new Set();
        
        // Add API leads first
        leadsFromAPI.forEach(lead => {
          const leadId = String(lead.id || lead.leadId || lead.lead_id || lead.LeadID || lead.ID || '').trim();
          if (leadId && !seenIds.has(leadId)) {
            mergedLeads.push(lead);
            seenIds.add(leadId);
          }
        });
        
        // Add local leads not in API
        localLeads.forEach(lead => {
          const leadId = String(lead.id || lead.leadId || lead.lead_id || lead.LeadID || lead.ID || '').trim();
          if (leadId && !seenIds.has(leadId)) {
            mergedLeads.push(lead);
            seenIds.add(leadId);
          }
        });
        console.log('[CaseManagement] Merged leads count:', mergedLeads.length);

        // Set default lead if not already set
        if (!currentCaseLeadId && mergedLeads.length > 0) {
          currentCaseLeadId = String(mergedLeads[0].id || mergedLeads[0].leadId || mergedLeads[0].lead_id || mergedLeads[0].LeadID || mergedLeads[0].ID);
          console.log('[CaseManagement] Default currentCaseLeadId set to', currentCaseLeadId);
        }

        // Persist merged lead list so case management can resolve selected lead data
        if (typeof saveLeadsJourney === 'function') {
          try {
            saveLeadsJourney(mergedLeads)
            console.log('[CaseManagement] Saved merged leads to crm_leads_journey');
          } catch (saveError) {
            console.warn('[CaseManagement] saveLeadsJourney failed', saveError)
          }
        }
      }
    } catch (error) {
      console.warn('[CaseManagement] Failed to fetch leads from API:', error);
      // Fallback to local leads
    }
  }

  if (!currentCaseLeadId) {
    const allLeads = typeof getLeadsJourney === 'function' ? getLeadsJourney() : []
    if (allLeads && allLeads.length > 0) {
      currentCaseLeadId = String(allLeads[0].id)
    }
  }

  if (!currentCaseLeadId) {
    renderLoanApplicationsTable()
    showToast('Select a lead from Lead Journey to view cases.', 'info')
    return
  }
  const lead = getLeadsJourney().find(l => {
    const idValues = [l.id, l.leadId, l.lead_id, l.LeadID, l.ID, parseLeadIdentifier(l)]
    return idValues.some(value => String(value) === String(currentCaseLeadId))
  })
  console.log('[CaseManagement] currentCaseLeadId', currentCaseLeadId, 'lead found:', !!lead, lead)
  if (!lead) {
    renderLoanApplicationsTable()
    showToast('Lead not found', 'error')
    return
  }
  renderCaseManagementHeader(lead)
  renderLoanApplicationsTable()
}

function openLeadCaseManager(leadId) {
  const lead = findLeadById(leadId)
  if (!lead) {
    // Try to fetch from API if not found locally
    if (window.apiClient && typeof window.apiClient.get === 'function') {
      window.apiClient.get(`/leads/${encodeURIComponent(leadId)}`).then(apiLead => {
        if (apiLead && apiLead.id) {
          openLeadCaseManagerWithLead(apiLead);
        } else {
          showToast('Lead not found', 'error')
        }
      }).catch(err => {
        console.warn('Failed to fetch lead from API:', err)
        showToast('Lead not found', 'error')
      });
    } else {
      showToast('Lead not found', 'error')
    }
    return
  }
  openLeadCaseManagerWithLead(lead);
}

function openLeadCaseManagerWithLead(lead) {
  if (!lead) {
    showToast('Lead data not available', 'error')
    return
  }
  if (typeof parseLeadData === 'function') {
    lead = parseLeadData(lead)
  }
  if (!lead.companyName) {
    lead.companyName = lead.company || lead.company_name || lead.customerName || lead.lead_name || lead.name || ''
  }
  if (!lead.currentStatus) {
    lead.currentStatus = lead.status || lead.lead_status || lead.current_status || ''
  }
  currentCaseLeadId = String(lead.id || lead.leadId || lead.lead_id || lead.leadID || lead.LeadID || parseLeadIdentifier(lead) || '')
  window.currentCaseLeadId = currentCaseLeadId
  showCaseManagementSection()
  hideCaseApplicationForm()
  renderCaseManagementHeader(lead)
  renderLoanApplicationsTable()

  setTimeout(() => {
    if (typeof openLenderRequirementsModal === 'function') {
      openLenderRequirementsModal(currentCaseLeadId)
    }
  }, 400)
}

function openCaseApplicationFromDeal(leadId, lenderName) {
  try {
    if (typeof openLeadCaseManager === 'function') openLeadCaseManager(leadId)
    // small delay to allow UI to switch to case management and render
    setTimeout(() => {
      if (typeof showCaseApplicationForm === 'function') showCaseApplicationForm()
      const lenderEl = document.getElementById('caseLender')
      if (lenderEl) lenderEl.value = lenderName || ''
      const parentEl = document.getElementById('caseParentLeadId')
      if (parentEl) parentEl.value = String(leadId || '')
    }, 120)
  } catch (e) {
    console.error('openCaseApplicationFromDeal failed', e)
  }
}

function renderCaseManagementHeader(lead) {
  const summary = document.getElementById('caseLeadSummary')
  const stats = document.getElementById('caseSummary')

  const companyName = lead.companyName || lead.company || lead.company_name || lead.customerName || lead.customerCompany || lead.customer_company || lead.lead_name || lead.leadName || lead.name || 'Unknown Company'
  const contactName = lead.contactPerson || lead.contact_name || lead.leadName || lead.lead_name || lead.name || lead.customerName || '—'
  const currentStatus = lead.currentStatus || lead.status || lead.lead_status || lead.current_status || lead.final_outcome || '—'
  const dealValue = Number(lead.dealValue || lead.deal_value || lead.value || lead.deal_value_if_closed || lead.funding_amount || lead.fundingAmount || 0)

  const applications = DataStore.getLoanApplications(lead.id || lead.leadId || lead.lead_id || parseLeadIdentifier(lead))
  const totalValue = applications.reduce((sum, app) => sum + Number(app.appliedAmount || app.loanAmount || 0), 0)
  const openApps = applications.filter(app => !['Rejected', 'Closed'].includes(app.applicationStatus || app.status)).length
  const openQueries = applications.reduce((sum, app) => sum + DataStore.getActiveLenderQueries(app.id).length, 0)
  const totalExpected = applications.reduce((sum, app) => sum + Number(app.expectedPayoutAmount || Math.round((Number(app.appliedAmount || app.loanAmount || 0) * Number(app.expectedPayoutPercent || 0)) / 100)), 0)

  if (summary) {
    summary.innerHTML = `<strong>${companyName}</strong> · Contact: ${contactName} · Status: ${currentStatus} · Deal: ${dealValue ? '₹' + dealValue : '—'}`
  }
  if (stats) {
    stats.innerHTML = [
      `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;min-width:180px;"><div style="font-size:12px;color:#475569;margin-bottom:8px;">Applications</div><div style="font-size:16px;font-weight:700;color:#0f766e;">${applications.length}</div></div>`,
      `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:14px;min-width:180px;"><div style="font-size:12px;color:#7f1d1d;margin-bottom:8px;">Active cases</div><div style="font-size:16px;font-weight:700;color:#991b1b;">${openApps}</div></div>`,
      `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:14px;min-width:180px;"><div style="font-size:12px;color:#1e3a8a;margin-bottom:8px;">Expected payout</div><div style="font-size:16px;font-weight:700;color:#1d4ed8;">₹${totalExpected.toLocaleString()}</div></div>`,
      `<div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:14px;min-width:180px;"><div style="font-size:12px;color:#166534;margin-bottom:8px;">Open queries</div><div style="font-size:16px;font-weight:700;color:#166534;">${openQueries}</div></div>`
    ].join('')
  }
}

function renderLoanApplicationsTable() {
  const tableContainer = document.getElementById('caseApplicationsTableContainer')
  if (!tableContainer) return

  if (!currentCaseLeadId) {
    tableContainer.innerHTML = '<div style="padding:24px;color:var(--gray-500);">Select a lead from Lead Journey to view lender applications. <button class="btn btn-primary" style="margin-top:12px;" onclick="goToLeadsSection()">Go to Leads</button></div>'
    return
  }

  const search = document.getElementById('caseSearch')?.value?.toLowerCase() || ''
  let applications = DataStore.getLoanApplications(currentCaseLeadId)

  if (search) {
    applications = applications.filter(a =>
      [a.lenderName, a.productType, a.applicationStatus || a.status, a.remarks, a.location, a.contactPerson, a.contactMobile, a.contactStatus, a.callOutcome, a.onboardingFormSubmitted].some(value =>
        String(value || '').toLowerCase().includes(search)
      )
    )
  }

  if (applications.length === 0) {
    tableContainer.innerHTML = '<div style="padding:24px;color:var(--gray-500);">No lender applications found for this lead. Click Add Loan Application to create one.</div>'
    return
  }

  tableContainer.innerHTML = `
    <table style="width:100%;border-collapse:collapse;min-width:760px;">
      <thead>
        <tr style="background:#f8fafc;color:#0f172a;text-align:left;font-size:13px;line-height:1.6;">
          <th style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">Lender</th>
          <th style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">Product</th>
          <th style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">Amount</th>
          <th style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">Status</th>
          <th style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">Submission</th>
          <th style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">Contact</th>
          <th style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">Onboarding</th>
          <th style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">Queries</th>
          <th style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">Actions</th>
        </tr>
      </thead>
      <tbody>${applications.map(app => {
        const queryCount = DataStore.getLenderQueries(app.id).length
        return `
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:14px 16px;vertical-align:top;">${app.lenderName || '—'}<br><small style="color:#64748b;">${app.location ? 'Location: ' + app.location : ''}</small></td>
            <td style="padding:14px 16px;vertical-align:top;">${app.productType || '—'}<br><small style="color:#64748b;">${app.contactPerson ? 'Contact: ' + app.contactPerson : ''}${app.contactMobile ? '<br>Mob: ' + app.contactMobile : ''}</small></td>
            <td style="padding:14px 16px;vertical-align:top;">₹${Number(app.loanAmount || app.appliedAmount || 0).toLocaleString()}</td>
            <td style="padding:14px 16px;vertical-align:top;"><span class="badge ${String(app.applicationStatus || app.status || 'unknown').replace(/\s+/g, '-').toLowerCase()}">${app.applicationStatus || app.status || '—'}</span><br><small style="color:#64748b;">${app.contactStatus ? 'Contact status: ' + app.contactStatus : ''}${app.callOutcome ? '<br>Outcome: ' + app.callOutcome : ''}</small></td>
            <td style="padding:14px 16px;vertical-align:top;">${app.submissionDate || '—'}${app.linkedInUrl ? `<br><a href="${app.linkedInUrl}" target="_blank" rel="noopener" style="color:#9B2335;">LinkedIn</a>` : ''}</td>
            <td style="padding:14px 16px;vertical-align:top;"><strong>${app.contactPerson || '—'}</strong><br>${app.contactMobile || '—'}</td>
            <td style="padding:14px 16px;vertical-align:top;">${app.callOutcome ? 'Outcome: ' + app.callOutcome + '<br>' : ''}${app.onboardingFormSubmitted ? 'Form: ' + app.onboardingFormSubmitted : 'Form: No'}</td>
            <td style="padding:14px 16px;vertical-align:top;">${queryCount} logged</td>
            <td style="padding:14px 16px;vertical-align:top;display:flex;gap:8px;flex-wrap:wrap;">
              <button class="btn btn-outline" onclick="openLenderQueryForm('${app.id}')" style="padding:6px 10px;">Add Query</button>
              <button class="btn btn-outline" onclick="deleteLoanApplication('${app.id}')" style="padding:6px 10px;">Delete</button>
            </td>
          </tr>
        `
      }).join('')}</tbody>
    </table>
  `
}

function hideCaseApplicationForm() {
  const form = document.getElementById('caseApplicationForm')
  if (form) form.style.display = 'none'
  const inputs = ['caseApplicationId','caseParentLeadId','caseLender','caseProduct','caseLoanAmount','caseContactPerson','caseContactMobile','caseLinkedInUrl','caseCallOutcome','caseOnboardingForm','caseContactStatus','caseBankLoginDate','caseBankRef','caseSanctionDate','caseInterestRate','caseTenor','caseEMIAmount','caseDisbursalAmount','caseDisbursalDate','caseStatus','caseExecutive','caseRejectionReason','caseExpectedPayoutPercent','caseActualPayoutReceived','casePayoutDate','caseTATTracker','caseRemarks']
  inputs.forEach(id => {
    const el = document.getElementById(id)
    if (el) el.value = ''
  })
  if (document.getElementById('caseStatus')) document.getElementById('caseStatus').value = 'Proposal Shared'
  if (document.getElementById('caseOnboardingForm')) document.getElementById('caseOnboardingForm').value = 'No'
}

function showCaseApplicationForm() {
  if (!currentCaseLeadId) {
    showToast('Open a lead first before adding an application.', 'info')
    return
  }
  const lead = getLeadsJourney().find(l => String(l.id) === String(currentCaseLeadId))
  if (!lead) {
    showToast('Lead not found.', 'error')
    return
  }
  document.getElementById('caseApplicationForm').style.display = 'block'
  document.getElementById('caseApplicationId').value = generateLoanApplicationId(lead)
  document.getElementById('caseParentLeadId').value = String(lead.id)
}

function generateLoanApplicationId(lead) {
  const year = new Date().getFullYear()
  const lender = document.getElementById('caseLender')?.value.trim() || 'LNR'
  const lenderAbbrev = lender.split(' ')[0].substring(0, 3).toUpperCase()
  const leadCode = String(lead.id).padStart(4, '0')
  const random = Math.floor(Math.random() * 900 + 100)
  return `FS-${year}-${lenderAbbrev}-${leadCode}-${random}`
}

function addLoanApplication() {
  if (!currentCaseLeadId) {
    showToast('Open a lead before adding a loan application.', 'error')
    return
  }

  const lender = document.getElementById('caseLender')?.value.trim()
  const product = document.getElementById('caseProduct')?.value.trim()
  const amount = Number(document.getElementById('caseLoanAmount')?.value || 0)
  const bankLoginDate = document.getElementById('caseBankLoginDate')?.value || ''
  const bankRef = document.getElementById('caseBankRef')?.value.trim()
  const sanctionDate = document.getElementById('caseSanctionDate')?.value || ''
  const interestRate = Number(document.getElementById('caseInterestRate')?.value || 0)
  const tenor = Number(document.getElementById('caseTenor')?.value || 0)
  const emiAmount = Number(document.getElementById('caseEMIAmount')?.value || 0)
  const disbursalAmount = Number(document.getElementById('caseDisbursalAmount')?.value || 0)
  const disbursalDate = document.getElementById('caseDisbursalDate')?.value || ''
  const status = document.getElementById('caseStatus')?.value || 'Proposal Shared'
  const executive = document.getElementById('caseExecutive')?.value.trim() || S.name || S.email || 'Unassigned'
  const contactPerson = document.getElementById('caseContactPerson')?.value.trim()
  const contactMobile = document.getElementById('caseContactMobile')?.value.trim()
  const linkedInUrl = document.getElementById('caseLinkedInUrl')?.value.trim()
  const callOutcome = document.getElementById('caseCallOutcome')?.value.trim()
  const onboardingFormSubmitted = document.getElementById('caseOnboardingForm')?.value || 'No'
  const contactStatus = document.getElementById('caseContactStatus')?.value.trim()
  const rejectionReason = document.getElementById('caseRejectionReason')?.value.trim()
  const expectedPayoutPercent = Number(document.getElementById('caseExpectedPayoutPercent')?.value || 0)
  const actualPayoutReceived = Number(document.getElementById('caseActualPayoutReceived')?.value || 0)
  const payoutDate = document.getElementById('casePayoutDate')?.value || ''
  const tatTrackerText = document.getElementById('caseTATTracker')?.value.trim()
  const remarks = document.getElementById('caseRemarks')?.value.trim()
  const applicationId = document.getElementById('caseApplicationId')?.value || ''

  if (!lender || amount <= 0) {
    showToast('Please provide lender name and loan amount.', 'error')
    return
  }

  const lead = getLeadsJourney().find(l => String(l.id) === String(currentCaseLeadId))
  if (!lead) {
    showToast('Lead not found', 'error')
    return
  }

  const expectedPayoutAmount = expectedPayoutPercent > 0 ? Math.round((amount * expectedPayoutPercent) / 100) : 0

  const loanApplication = DataStore.add('loanApplications', {
    applicationId: applicationId || generateLoanApplicationId(lead),
    leadId: Number(currentCaseLeadId),
    parentLeadId: Number(currentCaseLeadId),
    leadCompany: lead.companyName || lead.company || '',
    lenderName: lender,
    productType: product || 'General Loan',
    appliedAmount: amount,
    loanAmount: amount,
    contactPerson,
    contactMobile,
    linkedInUrl,
    callOutcome,
    onboardingFormSubmitted,
    contactStatus,
    bankLoginDate,
    bankReferenceNumber: bankRef,
    sanctionedAmount: 0,
    sanctionDate,
    interestRate,
    tenureMonths: tenor,
    emiAmount,
    disbursalAmount,
    disbursalDate,
    applicationStatus: status,
    assignedExecutive: executive,
    rejectionReason,
    expectedPayoutPercent,
    expectedPayoutAmount,
    actualPayoutReceived,
    payoutDate,
    tatTracker: { notes: tatTrackerText, stageEntryDate: new Date().toISOString() },
    submissionDate: new Date().toISOString().slice(0, 10),
    lastUpdate: new Date().toISOString().slice(0, 10),
    lenderCaseId: `${lender.split(' ')[0].toUpperCase()}-${Date.now()}`,
    remarks
  })

  saveLoanApplicationToBackend(loanApplication)
  showToast('Loan application added successfully.', 'success')
  hideCaseApplicationForm()
  renderCaseManagementHeader(lead)
  renderLoanApplicationsTable()
}

async function deleteLoanApplication(applicationId) {
  if (!confirm('Delete this loan application?')) return
  const id = Number(applicationId)
  const application = DataStore.getById('loanApplications', id)

  if (application && application.applicationId && typeof postToCRMBackendEndpoint === 'function') {
    try {
      await postToCRMBackendEndpoint(`lender/${encodeURIComponent(String(application.applicationId))}`, null, 'DELETE')
      console.log('Lender case deleted from backend:', application.applicationId)
    } catch (err) {
      console.warn('Backend delete failed for lender case:', err)
      showToast('Unable to delete lender case from backend. It will still be removed locally.', 'warning')
    }
  }

  const stored = DataStore.getAll()
  stored.loanApplications = (stored.loanApplications || []).filter(app => Number(app.id) !== id)
  stored.lenderQueries = (stored.lenderQueries || []).filter(q => Number(q.applicationId) !== id)
  DataStore.saveAll(stored)
  showToast('Loan application removed.', 'info')
  renderLoanApplicationsTable()
  if (currentCaseLeadId) {
    const lead = getLeadsJourney().find(l => String(l.id) === String(currentCaseLeadId))
    if (lead) renderCaseManagementHeader(lead)
  }
}

function openLenderQueryForm(applicationId) {
  const app = DataStore.getById('loanApplications', Number(applicationId))
  if (!app) {
    showToast('Application not found.', 'error')
    return
  }

  document.getElementById('queryApplicationId').value = String(applicationId)
  document.getElementById('queryDescription').value = ''
  document.getElementById('queryStatus').value = 'Open'
  document.getElementById('queryPriority').value = 'Normal'
  document.getElementById('queryAssignedHandler').value = typeof S !== 'undefined' ? S.name || S.email || '' : ''
  document.getElementById('queryRequiredDocs').value = ''
  const modal = document.getElementById('queryModal')
  if (modal) modal.style.display = 'flex'
  if (modal) modal.classList.add('open')
}

function closeQueryModal() {
  const modal = document.getElementById('queryModal')
  if (modal) {
    modal.classList.remove('open')
    modal.style.display = 'none'
  }
}

function submitLenderQueryForm() {
  const applicationId = Number(document.getElementById('queryApplicationId').value)
  const app = DataStore.getById('loanApplications', applicationId)
  if (!app) {
    showToast('Loan application not found.', 'error')
    closeQueryModal()
    return
  }

  const description = document.getElementById('queryDescription')?.value.trim()
  const status = document.getElementById('queryStatus')?.value || 'Open'
  const priority = document.getElementById('queryPriority')?.value || 'Normal'
  const assignedHandler = document.getElementById('queryAssignedHandler')?.value.trim() || (typeof S !== 'undefined' ? S.name || S.email : 'System')
  const requiredDocs = document.getElementById('queryRequiredDocs')?.value.trim().split(',').map(d => d.trim()).filter(Boolean)

  if (!description) {
    showToast('Enter the query details before saving.', 'error')
    return
  }

  DataStore.add('lenderQueries', {
    applicationId,
    leadId: Number(app.leadId),
    description,
    status,
    requiredDocs,
    priority,
    assignedHandler,
    raisedBy: assignedHandler,
    createdAt: new Date().toISOString(),
    slaDeadline: new Date(new Date().getTime() + (status === 'Urgent' ? 24 : 48) * 60 * 60 * 1000).toISOString()
  })

  showToast('Lender query logged.', 'success')
  closeQueryModal()
  renderLoanApplicationsTable()
}

// ═══════════════════════════════════════════════════════════════
// PIPELINE & FORECASTING
// ═══════════════════════════════════════════════════════════════

function renderPipeline() {
  const pipelineData = DataStore.getPipelineData()
  // Already handled in dashboard
}

async function getCRMForecastData(path) {
  if (!path) throw new Error('Backend path required')
  const API_BASE = typeof getCRMApiBase === 'function' ? getCRMApiBase() : (window.API_BASE || window.location.origin)
  if (!API_BASE) throw new Error('Backend unavailable')

  const normalizedPath = String(path).replace(/^\/+/, '')
  const endpoint = normalizedPath.startsWith('http') ? normalizedPath : API_BASE + '/' + normalizedPath
  const requestOptions = {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      ...(typeof getCRMBackendAuthHeader === 'function' ? getCRMBackendAuthHeader() : {})
    },
    credentials: 'include'
  }

  const res = await (typeof resolveCRMApiRequest === 'function'
    ? resolveCRMApiRequest(normalizedPath, requestOptions)
    : fetch(endpoint, requestOptions))

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Backend request failed (${res.status}): ${text}`)
  }

  const text = await res.text()
  if (!text || !text.trim()) return null
  return JSON.parse(text)
}

function formatForecastCurrency(value) {
  const numericValue = Number(value || 0)
  if (!Number.isFinite(numericValue)) return '₹0'
  if (numericValue >= 10000000) return `₹${(numericValue / 10000000).toFixed(1)}Cr`
  if (numericValue >= 100000) return `₹${(numericValue / 100000).toFixed(1)}L`
  return `₹${numericValue.toLocaleString('en-IN')}`
}

function getForecastStageBreakdown(leads) {
  const normalizedLeads = Array.isArray(leads) ? leads.filter(Boolean) : []
  const stages = [
    { stage: 'prospecting', label: 'Prospecting', statuses: ['new', 'prospecting', 'contacted'] },
    { stage: 'qualified', label: 'Qualified', statuses: ['qualified', 'warm'] },
    { stage: 'proposal', label: 'Proposal', statuses: ['proposal', 'demo', 'negotiation'] },
    { stage: 'closed-won', label: 'Closed Won', statuses: ['disbursed', 'closed', 'closed won', 'won'] },
    { stage: 'closed-lost', label: 'Closed Lost', statuses: ['closed lost', 'lost'] }
  ]

  return stages.map(stage => {
    const stageLeads = normalizedLeads.filter(lead => {
      const status = String(lead.lead_status || lead.status || '').trim().toLowerCase()
      return stage.statuses.includes(status)
    })

    return {
      stage: stage.stage,
      label: stage.label,
      count: stageLeads.length,
      value: stageLeads.reduce((sum, lead) => sum + Number(lead.deal_value ?? lead.funding_amount ?? 0), 0)
    }
  }).filter(stage => stage.count > 0 || stage.stage === 'prospecting')
}

async function renderForecasting() {
  const forecastContainer = document.getElementById('forecast-by-stage')
  const kpiContainer = document.getElementById('forecast-kpis')
  const quotaContainer = document.getElementById('forecast-quota')
  const accuracyContainer = document.getElementById('forecast-accuracy')
  const closuresContainer = document.getElementById('forecast-closures')
  const highValueContainer = document.getElementById('forecast-high-value')
  const aiContainer = document.getElementById('forecast-ai')
  const healthContainer = document.getElementById('forecast-health')
  const periodEl = document.getElementById('forecastPeriod')

  if (!forecastContainer || !kpiContainer) return

  const period = periodEl?.value || 'month'
  kpiContainer.innerHTML = '<div class="stat-card">Loading…</div>'.repeat(4)
  forecastContainer.innerHTML = '<div style="padding:16px;background:var(--gray-50);border:1px dashed var(--gray-300);border-radius:var(--radius);color:var(--gray-600);">Loading forecast widgets…</div>'

  try {
    const [forecastResponse, pipelineResponse, sanctionsResponse, disbursementResponse, revenueTrendResponse, quotaResponse, accuracyResponse, closuresResponse, highValueResponse, healthResponse, aiResponse] = await Promise.all([
      getCRMForecastData(`api/dashboard/forecast?period=${period}`).catch(() => null),
      getCRMForecastData('api/dashboard/weighted-pipeline').catch(() => null),
      getCRMForecastData('api/dashboard/expected-sanctions').catch(() => null),
      getCRMForecastData('api/dashboard/expected-disbursement').catch(() => null),
      getCRMForecastData(`api/dashboard/revenue-trend?period=${period}`).catch(() => null),
      getCRMForecastData('api/dashboard/quota').catch(() => null),
      getCRMForecastData('api/dashboard/forecast-accuracy').catch(() => null),
      getCRMForecastData('api/dashboard/expected-closures').catch(() => null),
      getCRMForecastData('api/dashboard/high-value-deals').catch(() => null),
      getCRMForecastData('api/dashboard/pipeline-health').catch(() => null),
      getCRMForecastData('api/dashboard/forecast').catch(() => null)
    ])

    const forecast = forecastResponse || {}
    const quota = quotaResponse?.quota || forecast.quota || {}
    const accuracy = accuracyResponse?.forecast_accuracy || forecast.forecast_accuracy || {}
    const closures = closuresResponse?.expected_closures || forecast.expected_closures || {}
    const highValueDeals = highValueResponse?.high_value_deals || forecast.high_value_deals || []
    const health = healthResponse?.pipeline_health || forecast.pipeline_health || {}
    const ai = aiResponse?.ai_prediction || forecast.ai_prediction || {}
    const revenueTrend = revenueTrendResponse?.revenue_trend || forecast.revenue_trend || []
    const stageRows = forecast.pipeline_stages || []
    const weightedPipeline = pipelineResponse?.weighted_pipeline ?? forecast.weighted_pipeline ?? 0
    const expectedSanctions = sanctionsResponse?.expected_sanctions ?? forecast.expected_sanctions ?? 0
    const expectedDisbursement = disbursementResponse?.expected_disbursement ?? forecast.expected_disbursement ?? 0

    const kpis = [
      { label: 'Forecast Revenue', value: forecast.forecast_revenue ?? 0, trend: '+8.4% vs last month' },
      { label: 'Weighted Pipeline', value: weightedPipeline, trend: 'Live pipeline health' },
      { label: 'Expected Sanctions', value: expectedSanctions, trend: `+${sanctionsResponse?.today_increase ?? 0} today` },
      { label: 'Expected Disbursement', value: expectedDisbursement, trend: `+${disbursementResponse?.today_expected_increase ?? 0} today` }
    ]
    kpiContainer.innerHTML = kpis.map(item => `
      <div class="stat-card">
        <div class="stat-label">${item.label}</div>
        <div class="stat-val">${formatForecastCurrency(item.value)}</div>
        <div class="stat-trend">${item.trend}</div>
      </div>
    `).join('')

    if (forecastContainer) {
      if (!stageRows.length) {
        forecastContainer.innerHTML = '<div style="padding:16px;background:var(--gray-50);border:1px dashed var(--gray-300);border-radius:var(--radius);color:var(--gray-600);">No stage data is available yet.</div>'
      } else {
        forecastContainer.innerHTML = stageRows.filter(item => item.stage !== 'lost').map(stage => `
          <div style="margin-bottom:14px;padding:12px 14px;background:#fff;border:1px solid var(--gray-200);border-radius:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <div style="font-weight:600;color:var(--gray-900);">${stage.label}</div>
              <div style="font-size:12px;color:var(--gray-500);">${stage.count} deals</div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="flex:1;height:8px;background:var(--gray-100);border-radius:999px;overflow:hidden;">
                <div style="width:${Math.min(100, Number(stage.percentage_of_total || 0))}%;height:100%;background:var(--maroon);border-radius:999px;"></div>
              </div>
              <div style="font-size:12px;font-weight:600;color:var(--gray-700);min-width:76px;text-align:right;">${formatForecastCurrency(stage.weighted_value)}</div>
            </div>
            <div style="font-size:12px;color:var(--gray-500);margin-top:6px;">${stage.percentage_of_total || 0}% of total pipeline</div>
          </div>
        `).join('')
      }
    }

    quotaContainer.innerHTML = `
      <div style="display:grid;gap:16px;">
        ${['monthly','quarterly','annual'].map(key => {
          const item = quota[key] || {}
          const percent = Math.min(100, Number(item.achievement_percent || 0))
          return `
            <div>
              <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                <span style="font-size:13px;color:var(--gray-600);">${key.charAt(0).toUpperCase() + key.slice(1)} Target</span>
                <span style="font-size:13px;font-weight:600;">${formatForecastCurrency(item.target || 0)}</span>
              </div>
              <div style="height:8px;background:var(--gray-100);border-radius:999px;overflow:hidden;">
                <div style="width:${percent}%;height:100%;background:${key === 'monthly' ? 'var(--maroon)' : key === 'quarterly' ? 'var(--success)' : 'var(--primary)'};border-radius:999px;"></div>
              </div>
              <div style="font-size:12px;color:var(--gray-500);margin-top:4px;">${percent.toFixed(1)}% achieved (${formatForecastCurrency(item.current || 0)})</div>
            </div>
          `
        }).join('')}
      </div>
    `

    accuracyContainer.innerHTML = `
      <div style="display:grid;gap:12px;">
        <div style="padding:12px 14px;border-radius:10px;background:var(--gray-50);">
          <div style="font-size:12px;color:var(--gray-500);">Current Month Accuracy</div>
          <div style="font-size:24px;font-weight:700;color:${Number(accuracy.current_month_accuracy || 0) >= 90 ? 'var(--success)' : Number(accuracy.current_month_accuracy || 0) >= 75 ? 'var(--warning)' : 'var(--danger)'};">${Number(accuracy.current_month_accuracy || 0).toFixed(1)}%</div>
        </div>
        <div style="padding:12px 14px;border-radius:10px;background:var(--gray-50);">
          <div style="font-size:12px;color:var(--gray-500);">Previous Month Accuracy</div>
          <div style="font-size:24px;font-weight:700;color:${Number(accuracy.previous_month_accuracy || 0) >= 90 ? 'var(--success)' : Number(accuracy.previous_month_accuracy || 0) >= 75 ? 'var(--warning)' : 'var(--danger)'};">${Number(accuracy.previous_month_accuracy || 0).toFixed(1)}%</div>
        </div>
        <div style="padding:12px 14px;border-radius:10px;background:var(--gray-50);">
          <div style="font-size:12px;color:var(--gray-500);">Average Accuracy</div>
          <div style="font-size:24px;font-weight:700;color:${Number(accuracy.average_accuracy || 0) >= 90 ? 'var(--success)' : Number(accuracy.average_accuracy || 0) >= 75 ? 'var(--warning)' : 'var(--danger)'};">${Number(accuracy.average_accuracy || 0).toFixed(1)}%</div>
        </div>
      </div>
    `

    closuresContainer.innerHTML = `
      <div style="display:grid;gap:10px;">
        ${[['Today', closures.today || 0], ['Tomorrow', closures.tomorrow || 0], ['This Week', closures.this_week || 0], ['This Month', closures.this_month || 0]].map(([label, value]) => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border:1px solid var(--gray-200);border-radius:10px;background:#fff;">
            <span style="font-size:13px;color:var(--gray-600);">${label}</span>
            <span style="font-size:15px;font-weight:700;color:var(--gray-900);">${value}</span>
          </div>
        `).join('')}
      </div>
    `

    highValueContainer.innerHTML = highValueDeals.length ? highValueDeals.map(item => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border:1px solid var(--gray-200);border-radius:10px;background:#fff;margin-bottom:8px;">
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--gray-900);">${item.company_name}</div>
          <div style="font-size:12px;color:var(--gray-500);">${item.deal_owner} • ${item.stage}</div>
        </div>
        <div style="font-size:13px;font-weight:700;color:var(--maroon);">${formatForecastCurrency(item.amount)}</div>
      </div>
    `).join('') : '<div style="color:var(--gray-500);">No high value deals found.</div>'

    aiContainer.innerHTML = `
      <div style="display:grid;gap:12px;">
        <div style="padding:12px 14px;border-radius:10px;background:var(--gray-50);">
          <div style="font-size:12px;color:var(--gray-500);">Predicted Next Month Revenue</div>
          <div style="font-size:24px;font-weight:700;color:var(--maroon);">${formatForecastCurrency(ai.predicted_next_month_revenue || 0)}</div>
        </div>
        <div style="padding:12px 14px;border-radius:10px;background:var(--gray-50);">
          <div style="font-size:12px;color:var(--gray-500);">Confidence Score</div>
          <div style="font-size:24px;font-weight:700;color:var(--success);">${Number(ai.confidence_score || 0).toFixed(1)}%</div>
        </div>
      </div>
    `

    healthContainer.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;">
        ${[['Healthy Leads', health.healthy_leads_percentage || 0], ['Stuck Deals', health.stuck_deals_percentage || 0], ['Lost Deals', health.lost_deals_percentage || 0]].map(([label, value]) => `
          <div style="padding:12px 14px;border-radius:10px;background:var(--gray-50);">
            <div style="font-size:12px;color:var(--gray-500);">${label}</div>
            <div style="font-size:22px;font-weight:700;color:var(--gray-900);">${Number(value).toFixed(1)}%</div>
          </div>
        `).join('')}
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:12px;">
        ${[['Average Sales Cycle', health.average_sales_cycle || 0, 'days'], ['Conversion Rate', health.conversion_rate || 0, '%'], ['Win Rate', health.win_rate || 0, '%']].map(([label, value, suffix]) => `
          <div style="padding:12px 14px;border-radius:10px;background:var(--gray-50);">
            <div style="font-size:12px;color:var(--gray-500);">${label}</div>
            <div style="font-size:22px;font-weight:700;color:var(--gray-900);">${value}${suffix}</div>
          </div>
        `).join('')}
      </div>
    `

    const chartCanvas = document.getElementById('forecast-chart')
    if (chartCanvas && window.Chart) {
      const ctx = chartCanvas.getContext('2d')
      if (window._forecastChart) window._forecastChart.destroy()
      window._forecastChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: revenueTrend.map(item => item.label),
          datasets: [
            { label: 'Actual Revenue', data: revenueTrend.map(item => item.actual), borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.15)', tension: 0.35, fill: false },
            { label: 'Forecast Revenue', data: revenueTrend.map(item => item.forecast), borderColor: '#16a34a', borderDash: [6, 4], tension: 0.35, fill: false }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { ticks: { callback: value => formatForecastCurrency(value) } } } }
      })
    }
  } catch (error) {
    console.error('[Forecasting] Failed to load backend forecast data:', error)
    // show backend-unavailable message
    forecastContainer.innerHTML = '<div style="padding:16px;background:var(--gray-50);border:1px dashed var(--gray-300);border-radius:var(--radius);color:var(--gray-600);">Forecast data could not be loaded from server.</div>'
    kpiContainer.innerHTML = '<div class="stat-card">Forecast unavailable</div>'.repeat(4)

    // If local renderer exists, run it as an offline fallback and show unobtrusive notice
    try {
      if (typeof renderForecastingLocal === 'function') {
        // unobtrusive banner
        const existing = document.getElementById('forecast-offline-note')
        if (!existing) {
          const note = document.createElement('div')
          note.id = 'forecast-offline-note'
          note.style.cssText = 'margin-bottom:8px;padding:8px;border-radius:6px;background:#fffbeb;color:#92400e;font-size:13px;border:1px solid #f59e0b'
          note.textContent = 'Showing local forecast (offline fallback)'
          forecastContainer.parentNode.insertBefore(note, forecastContainer)
        }
        renderForecastingLocal()
      }
    } catch (e) {
      console.warn('[Forecasting] Local fallback failed:', e)
    }
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const periodEl = document.getElementById('forecastPeriod')
  if (periodEl) {
    periodEl.addEventListener('change', renderForecasting)
  }

  if (document.getElementById('forecast-kpis')) {
    renderForecasting()
  }

  const refreshForecastWhenDealsChange = () => {
    if (document.getElementById('sec-forecasting')?.classList.contains('active')) {
      renderForecasting()
    }
  }

  window.addEventListener('crm-data-sync', refreshForecastWhenDealsChange)
  window.addEventListener('crm:api_synced', refreshForecastWhenDealsChange)
  window.addEventListener('fs-deals-updated', refreshForecastWhenDealsChange)
  // If backend failed earlier, allow local renderer to run as fallback
  window.addEventListener('fs-deals-updated', function () { try { if (document.getElementById('sec-forecasting')?.classList.contains('active')) { if (typeof renderForecastingLocal === 'function') renderForecastingLocal() } } catch (e) {} })
})

// ═══════════════════════════════════════════════════════════════
// ANALYTICS & REPORTS
// ═══════════════════════════════════════════════════════════════

function renderAnalytics() {
  const allSOD = getSOD()
  const allEOD = getEOD()
  const allWOD = getWOD()
  const allLeads = getLeadsJourney()

  const stats = DataStore.getDashboardStats()

  const analyticsStats = document.getElementById('analyticsStats')
  if (analyticsStats) {
    analyticsStats.innerHTML = `
      <div class="stat-card g"><div class="stat-val">${allSOD.length}</div><div class="stat-label">Total SOD Entries</div></div>
      <div class="stat-card b"><div class="stat-val">${allEOD.length}</div><div class="stat-label">Total EOD Entries</div></div>
      <div class="stat-card p"><div class="stat-val">${allWOD.length}</div><div class="stat-label">Total WOD Entries</div></div>
      <div class="stat-card o"><div class="stat-val">${allLeads.length}</div><div class="stat-label">Lead Journey Entries</div></div>
      <div class="stat-card g"><div class="stat-val">${stats.leads.total}</div><div class="stat-label">Total CRM Leads</div></div>
      <div class="stat-card b"><div class="stat-val">${stats.deals.total}</div><div class="stat-label">Total Deals</div></div>
    `
  }
}

function formatReportTitle(reportType) {
  const titles = {
    daily_leads: 'Daily Leads Report',
    monthly_sales: 'Monthly Sales Report',
    employee_performance: 'Employee Performance Report',
    source_performance: 'Source Performance Report',
    lender_approval: 'Lender Approval Report',
    disbursal: 'Disbursal Report'
  }
  return titles[reportType] || String(reportType).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatStatLabel(key) {
  const labels = {
    totalLeads: 'Total Leads',
    newLeadsToday: 'New Leads Today',
    dailyCalls: 'Total Calls',
    incomingCalls: 'Incoming Calls',
    outgoingCalls: 'Outgoing Calls',
    connectedCalls: 'Connected Calls',
    interestedCalls: 'Interested Calls',
    followups: 'Follow-ups',
    meetings: 'Meetings',
    totalRevenue: 'Total Revenue',
    dealsWon: 'Deals Won',
    avgDealSize: 'Average Deal',
    totalEmployees: 'Sales Reps',
    topPerformer: 'Top Performer',
    totalApplications: 'Applications',
    sanctioned: 'Sanctioned',
    disbursed: 'Disbursed',
    pendingDisbursal: 'Pending Disbursal',
    disbursalAmount: 'Disbursal Amount'
  }
  return labels[key] || String(key).replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
}

function parseReportDate(value) {
  if (!value) return null
  const date = new Date(value)
  if (!Number.isNaN(date.getTime())) return date

  const match = String(value).trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
  if (match) {
    const day = Number(match[1])
    const month = Number(match[2]) - 1
    let year = Number(match[3])
    if (year < 100) year += 2000
    return new Date(year, month, day)
  }

  return null
}

function buildReportTable(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return '<div style="padding:20px;color:var(--gray-600);">No report table data available.</div>'
  }

  const keys = Array.from(new Set(rows.flatMap(row => Object.keys(row || {}))))
  const header = '<thead><tr>' + keys.map(key => `<th style="padding:12px 14px;border-bottom:1px solid #e5e7eb;text-align:left;background:#f9fafb;">${escapeHtml(formatStatLabel(key))}</th>`).join('') + '</tr></thead>'
  const body = '<tbody>' + rows.map(row => '<tr>' + keys.map(key => {
    let value = row[key]
    if (value === null || value === undefined) value = ''
    if (typeof value === 'object') value = JSON.stringify(value)
    return `<td style="padding:12px 14px;border-bottom:1px solid #f3f4f6;vertical-align:top;">${escapeHtml(String(value))}</td>`
  }).join('') + '</tr>').join('') + '</tbody>'

  return `<div style="overflow-x:auto;border-radius:12px;border:1px solid #e5e7eb;background:#ffffff;"><table style="width:100%;border-collapse:collapse;font-size:13px;">${header}${body}</table></div>`
}

async function generateReport(btn, reportType) {
  const originalHtml = btn?.innerHTML
  if (btn) {
    btn.disabled = true
    btn.innerHTML = '<div class="spinner"></div> Generating…'
  }

  try {
    const report = await fetchReportData(reportType)
    openReportPage(reportType, report)
    showToast(`${formatReportTitle(reportType)} generated successfully`, 'success')
  } catch (err) {
    console.error(`Failed to generate ${reportType} report:`, err)
    showToast(`Report generation failed. Check console for details.`, 'error')
  } finally {
    if (btn) {
      btn.disabled = false
      btn.innerHTML = originalHtml
    }
  }
}

async function fetchReportData(reportType) {
  const token = localStorage.getItem('auth_token') || ''
  const API_BASE = typeof getCRMApiBase === 'function' ? getCRMApiBase() : (window.API_BASE || window.location.origin)
  const response = await fetch(`${API_BASE}/reports/${encodeURIComponent(reportType)}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return await response.json()
}

function displayReport(reportType, report) {
  closeReportOverlay()

  const summaryHtml = Object.entries(report.summary || {}).map(([key, value]) => `
    <div class="stat-card" style="background:#f8fafc;border:1px solid #e5e7eb;">
      <div class="stat-label">${escapeHtml(formatStatLabel(key))}</div>
      <div class="stat-val" style="font-size:22px;font-weight:700;">${escapeHtml(String(value))}</div>
    </div>
  `).join('')

  const chartHtml = report.chart && Array.isArray(report.chart.labels) && report.chart.labels.length
    ? `<div style="margin-bottom:24px;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><div style="font-size:16px;font-weight:600;color:#111827;">Source Chart</div></div><div id="reportChart"></div></div>`
    : ''

  const tableHtml = buildReportTable(report.rows)

  const overlay = document.createElement('div')
  overlay.id = 'reportOverlay'
  overlay.style.cssText = 'position:fixed;inset:0;z-index:10050;background:rgba(15,23,42,0.65);display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:36px 16px;'
  overlay.innerHTML = `
    <div style="width:min(1200px,100%);background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 30px 80px rgba(15,23,42,0.18);">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;padding:24px 28px;border-bottom:1px solid #e5e7eb;gap:16px;flex-wrap:wrap;">
        <div style="flex:1;min-width:240px;">
          <div style="font-size:24px;font-weight:700;color:#111827;">${escapeHtml(report.title || formatReportTitle(reportType))}</div>
          <div style="margin-top:8px;font-size:14px;color:#6b7280;max-width:800px;">${escapeHtml(report.subtitle || 'Generated report preview.')}</div>
        </div>
        <button onclick="closeReportOverlay()" style="border:none;background:transparent;color:#374151;font-size:22px;cursor:pointer;line-height:1;">✕</button>
      </div>
      <div style="padding:24px 28px;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;">${summaryHtml}</div>
      <div style="padding:0 28px 28px;">
        ${chartHtml}
        ${tableHtml}
      </div>
    </div>
  `

  document.body.appendChild(overlay)
  document.body.style.overflow = 'hidden'

  if (reportType === 'daily_leads' || reportType === 'source_performance') {
    renderSourceChart(report)
  }
}

function closeReportOverlay() {
  const overlay = document.getElementById('reportOverlay')
  if (overlay) overlay.remove()
  document.body.style.overflow = ''
}

function closeReportPage() {
  const page = document.getElementById('reportPage')
  if (page) page.remove()
  document.body.style.overflow = ''
}

// Open a full-page report view (replaces overlay behavior)
function openReportPage(reportType, report) {
  closeReportOverlay()

  // remove any existing report page
  const existing = document.getElementById('reportPage')
  if (existing) existing.remove()

  const container = document.createElement('div')
  container.id = 'reportPage'
  container.style.cssText = 'position:fixed;inset:0;z-index:10050;overflow-y:auto;background:rgba(248,250,252,0.96);padding:24px 16px;'

  const title = escapeHtml(report.title || formatReportTitle(reportType))
  const subtitle = escapeHtml(report.subtitle || '')

  const summaryHtml = Object.entries(report.summary || {}).map(([key, value]) => `
    <div style="background:#fff;border:1px solid #e8eef6;border-radius:10px;padding:14px;min-width:160px;margin-right:12px;">
      <div style="font-size:12px;color:#6b7280">${escapeHtml(formatStatLabel(key))}</div>
      <div style="font-size:20px;font-weight:700;margin-top:6px;">${escapeHtml(String(value))}</div>
    </div>
  `).join('')

  const chartHtml = report.chart && Array.isArray(report.chart.labels) && report.chart.labels.length
    ? `<div id="reportChart" style="margin-top:18px; background:#fff;border:1px solid #e8eef6;border-radius:10px;padding:18px;"></div>`
    : ''

  const tableHtml = buildReportTable(report.rows)

  container.innerHTML = `
    <div style="max-width:1200px;margin:0 auto;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
        <div>
          <div style="font-size:22px;font-weight:700;color:#111827">${title}</div>
          <div style="margin-top:6px;color:#6b7280">${subtitle}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button onclick="closeReportPage()" style="padding:8px 12px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;">← Back</button>
          <button onclick="downloadReportPdf('${reportType}')" style="padding:8px 12px;border-radius:8px;background:#9d174d;color:#fff;border:none;">Download PDF</button>
        </div>
      </div>

      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:18px;">${summaryHtml}</div>

      ${chartHtml}

      <div style="margin-top:18px;background:#fff;border:1px solid #e8eef6;border-radius:10px;padding:18px;">${tableHtml}</div>
    </div>
  `

  document.body.appendChild(container)
  document.body.style.overflow = 'hidden'

  if (reportType === 'daily_leads' || reportType === 'source_performance') {
    renderSourceChart(report)
  }
}

function downloadReportPdf(reportType) {
  showToast('Download PDF not implemented in this demo', 'info')
}

function renderSourceChart(report) {
  const chart = document.getElementById('reportChart')
  if (!chart) return

  const labels = report.chart?.labels || []
  const values = report.chart?.values || []
  const maxValue = values.reduce((max, value) => Math.max(max, Number(value) || 0), 0) || 1

  chart.innerHTML = labels.map((label, index) => {
    const value = Number(values[index] || 0)
    const width = Math.round((value / maxValue) * 100)
    return `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
        <div style="flex:0 0 140px;font-size:12px;color:#4b5563;">${escapeHtml(label)}</div>
        <div style="flex:1;height:10px;background:#e5e7eb;border-radius:999px;overflow:hidden;">
          <div style="width:${width}%;height:100%;background:#9d174d;border-radius:999px;"></div>
        </div>
        <div style="flex:0 0 50px;font-size:12px;color:#111827;text-align:right;">${escapeHtml(String(value))}</div>
      </div>
    `
  }).join('')
}

function renderReports() {
  // Reports section is static with placeholders
}

function renderTeam() {
  if (S.role !== 'admin') return

  const allSOD = getSOD()
  const allEOD = getEOD()
  const allReports = [...allSOD, ...allEOD]
  const employeeNames = Array.from(new Set(allReports.map(entry => {
    return String(entry.salesExecutive || entry.createdByName || entry.assignedEmployee || entry.assignedEmployeeName || '').trim()
  }).filter(Boolean))).sort((a, b) => a.localeCompare(b))

  const rawUsers = localStorage.getItem('crm_users') || '[]'
  const users = (() => {
    try {
      const parsed = JSON.parse(rawUsers)
      if (Array.isArray(parsed)) return parsed
      if (parsed && typeof parsed === 'object') return Object.values(parsed)
    } catch (e) {}
    return []
  })()

  const findUser = name => {
    const lookup = String(name || '').trim().toLowerCase()
    if (!lookup) return null
    return users.find(u => {
      const email = String(u.email || u.userEmail || u.emailAddress || '').trim().toLowerCase()
      const uName = String(u.name || u.fullName || u.displayName || '').trim().toLowerCase()
      return email === lookup || uName === lookup
    }) || null
  }

  const formatTeamInitials = value => {
    const parts = String(value || '').trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return ''
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const parseReportDate = value => {
    if (!value) return 0
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed.getTime()
    const match = String(value).trim().match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)
    if (match) {
      const day = Number(match[1])
      const month = Number(match[2])
      const year = Number(match[3])
      return new Date(year < 100 ? 2000 + year : year, month - 1, day).getTime()
    }
    return 0
  }

  const tbody = document.getElementById('teamBody')
  if (!tbody) return

  if (employeeNames.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="padding:40px;text-align:center;color:var(--gray-400);">No team activity found</td></tr>'
    return
  }

  tbody.innerHTML = employeeNames.map(name => {
    const reports = allReports.filter(entry => {
      const entryName = String(entry.salesExecutive || entry.createdByName || entry.assignedEmployee || entry.assignedEmployeeName || '').trim()
      return entryName === name
    })

    const reportsByDate = reports.slice().sort((a, b) => parseReportDate(a.date || a.timestamp) - parseReportDate(b.date || b.timestamp))
    const latestReport = reportsByDate[reportsByDate.length - 1] || {}
    const sodReports = allSOD.filter(entry => String(entry.salesExecutive || '').trim() === name)
    const latestSOD = sodReports.slice().sort((a, b) => parseReportDate(a.date || a.timestamp) - parseReportDate(b.date || b.timestamp))[sodReports.length - 1] || {}

    const scoreValues = reports.map(entry => {
      const score = entry.score || entry.aiScore || entry.ai_score
      return Number.isFinite(Number(score)) ? Number(score) : NaN
    }).filter(Number.isFinite)
    const averageScore = scoreValues.length ? Math.round(scoreValues.reduce((sum, val) => sum + val, 0) / scoreValues.length) : null
    const user = findUser(name)
    const displayName = user?.name || name
    const initials = formatTeamInitials(displayName)
    const dateValue = latestSOD.date || latestSOD.timestamp || latestReport.date || latestReport.timestamp || '—'
    const territory = latestSOD.territory || latestReport.territory || latestReport.territory_region || user?.territory || '—'
    const target = latestSOD.targetLeads || latestReport.targetLeads || latestReport.target_for_today || '—'
    const industry = latestSOD.industry || latestReport.industry || latestReport.focus_industry || '—'
    const keyMeetings = latestSOD.keyMeetings || latestReport.keyMeetings || latestReport.key_meetings || '—'
    const support = latestSOD.supportNeeded || latestReport.supportNeeded || latestReport.support_needed || 'No'

    return `
      <tr style="border-bottom:1px solid var(--gray-100);">
        <td style="padding:14px 16px;color:var(--gray-700);">${escapeHtml(dateValue)}</td>
        <td style="padding:14px 16px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:36px;height:36px;background:var(--maroon-light);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--maroon);font-weight:600;">${escapeHtml(initials)}</div>
            <div style="font-weight:500;color:var(--gray-900);">${escapeHtml(displayName)}</div>
          </div>
        </td>
        <td style="padding:14px 16px;color:var(--gray-700);">${escapeHtml(territory)}</td>
        <td style="padding:14px 16px;color:var(--gray-700);">${escapeHtml(String(target))}</td>
        <td style="padding:14px 16px;color:var(--gray-700);">${escapeHtml(industry)}</td>
        <td style="padding:14px 16px;color:var(--gray-700);">${escapeHtml(keyMeetings)}</td>
        <td style="padding:14px 16px;color:var(--gray-700);">${escapeHtml(support)}</td>
        <td style="padding:14px 16px;color:var(--gray-700);">${averageScore !== null ? averageScore : '—'}</td>
      </tr>
    `
  }).join('')
}

function renderTargets() {
  const targets = DataStore.get('targets') || []
  const tbody = document.getElementById('targetsTableBody')
  if (!tbody) return

  if (targets.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="padding:40px;text-align:center;color:var(--gray-400);">No target assignments available yet.</td></tr>'
    return
  }

  const today = new Date().toISOString().split('T')[0]
  tbody.innerHTML = targets.map(target => {
    const dueDate = target.dueDate || '—'
    const status = dueDate && dueDate < today ? 'Overdue' : 'Active'
    const callTarget = Number(target.callTarget || target.call || 0)
    const leadTarget = Number(target.leadTarget || target.leads || 0)
    const weekLead = Number(target.weekLeadTarget || target.weekLead || 0)

    return `
      <tr style="border-bottom:1px solid var(--gray-100);">
        <td style="padding:14px 16px;color:var(--gray-700);">${escapeHtml(target.salesExecutive || target.executive || target.owner || '—')}</td>
        <td style="padding:14px 16px;color:var(--gray-700);">${callTarget > 0 ? callTarget.toLocaleString() : '—'}</td>
        <td style="padding:14px 16px;color:var(--gray-700);">${leadTarget > 0 ? leadTarget.toLocaleString() : '—'}</td>
        <td style="padding:14px 16px;color:var(--gray-700);">${weekLead > 0 ? weekLead.toLocaleString() : '—'}</td>
        <td style="padding:14px 16px;color:var(--gray-700);">${escapeHtml(dueDate)}</td>
        <td style="padding:14px 16px;color:${status === 'Overdue' ? '#b91c1c' : '#047857'};font-weight:600;">${status}</td>
        <td style="padding:14px 16px;text-align:center;"><button onclick="deleteTarget('${escapeHtml(target.id)}')" style="background:none;border:none;color:#dc2626;cursor:pointer;font-weight:600;text-decoration:underline;">Delete</button></td>
      </tr>
    `
  }).join('')
}

function openTargetModal() {
  const modal = document.getElementById('targetModal')
  if (!modal) return

  const execSelect = document.getElementById('targetExecutive')
  if (execSelect) {
    const users = DataStore.getCRMUsers() || []
    const employees = DataStore.get('employees') || []
    const options = []
    const seen = new Set()

    employees.forEach(emp => {
      const value = String(emp.id || emp.email || emp.name || '').trim()
      const label = emp.name || emp.email || 'Unnamed executive'
      // Skip Shree Rathod
      if (label.toLowerCase().includes('shree rathod')) return
      if (!value || seen.has(value.toLowerCase())) return
      seen.add(value.toLowerCase())
      options.push({ value, label })
    })

    users.forEach(user => {
      const value = String(user.id || user.email || user.userEmail || user.emailAddress || user.displayName || user.name || '').trim()
      const label = user.name || user.displayName || user.email || 'Unnamed executive'
      const email = String(user.email || user.userEmail || user.emailAddress || '').trim().toLowerCase()
      const name = String(user.name || user.displayName || '').trim().toLowerCase()
      if (!value) return
      if (email === 'admin@fundingsathi.com' || email === 'corporate@fundingsathi.in' || email === 'shree.rathod@fundingsathi.in') return
      if (name.includes('shree rathod')) return
      if (seen.has(value.toLowerCase())) return
      seen.add(value.toLowerCase())
      options.push({ value, label })
    })

    execSelect.innerHTML = '<option value="">Select executive</option>' + options.map(opt => `<option value="${escapeHtml(opt.value)}" data-label="${escapeHtml(opt.label)}">${escapeHtml(opt.label)}</option>`).join('')
  }
  // Make modal visible
  modal.style.display = 'block'
  modal.classList.add('open')
}

function closeTargetModal() {
  const modal = document.getElementById('targetModal')
  if (modal) modal.style.display = 'none'
  if (modal) modal.classList.remove('open')
  clearTargetForm()
}

function clearTargetForm() {
  ;['targetExecutive', 'targetCall', 'targetLead', 'targetWeekLead', 'targetDueDate', 'targetNotes'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.value = ''
  })
  const dueDate = new Date().toISOString().split('T')[0]
  const dueInput = document.getElementById('targetDueDate')
  if (dueInput) dueInput.value = dueDate
}

async function submitTarget() {
  const executive = document.getElementById('targetExecutive')?.value?.trim()
  const executiveLabel = document.getElementById('targetExecutive')?.selectedOptions?.[0]?.textContent?.trim() || executive
  const callTarget = document.getElementById('targetCall')?.value
  const leadTarget = document.getElementById('targetLead')?.value
  const weekLeadTarget = document.getElementById('targetWeekLead')?.value
  const dueDate = document.getElementById('targetDueDate')?.value
  const notes = document.getElementById('targetNotes')?.value?.trim() || ''

  if (!executive) { showToast('Please select a sales executive', 'error'); return }
  if (!dueDate) { showToast('Please select a due date', 'error'); return }

  const target = {
    id: 'TARG-' + Date.now(),
    salesExecutive: executiveLabel,
    callTarget: Number(callTarget) || 0,
    leadTarget: Number(leadTarget) || 0,
    weekLeadTarget: Number(weekLeadTarget) || 0,
    dueDate,
    notes,
    createdAt: new Date().toISOString()
  }

  DataStore.add('targets', target)

  const apiBase = (typeof window.getCRMApiBase === 'function' ? window.getCRMApiBase() : null) || window.API_BASE || window.location.origin
  const token = (window.S && window.S.access_token) || JSON.parse(localStorage.getItem('crm_session') || '{}').access_token || ''

  try {
    const payload = {
      employee_id: executive,
      daily_call_target: Number(callTarget) || 0,
      daily_lead_target: Number(leadTarget) || 0,
      weekly_lead_target: Number(weekLeadTarget) || 0,
      effective_from: dueDate,
    }

    const response = await fetch(`${apiBase}/api/targets/admin/assign-targets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      credentials: 'include',
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`Target API failed: ${response.status} ${errorText}`)
    }
  } catch (err) {
    console.warn('Failed to sync target to backend:', err)
  }

  closeTargetModal()
  renderTargets()
  notifyExecutivePanel(executiveLabel)
  showToast('Sales target assigned successfully', 'success')
}

function notifyExecutivePanel(executiveName) {
  const tbody = document.getElementById('teamBody')
  if (!tbody) return

  const rows = tbody.querySelectorAll('tr')
  rows.forEach(row => {
    const firstTd = row.querySelector('td')
    if (!firstTd) return
    const rowText = firstTd.textContent || ''
    if (rowText.includes(executiveName) || executiveName.includes(rowText.split('\n')[0]?.trim())) {
      row.style.backgroundColor = '#fef3c7'
      row.style.transition = 'background-color 0.3s ease'
      setTimeout(() => { row.style.backgroundColor = '' }, 3000)
      const popElement = document.createElement('div')
      popElement.style.cssText = 'position:absolute;top:10px;right:10px;background:#10b981;color:white;padding:8px 16px;border-radius:6px;font-weight:600;font-size:12px;z-index:1000;animation:slideIn 0.3s ease;'
      popElement.textContent = '✓ Target Assigned'
      if (row.style.position !== 'relative') row.style.position = 'relative'
      row.appendChild(popElement)
      setTimeout(() => { popElement.remove() }, 3000)
    }
  })
}

function deleteTarget(targetId) {
  if (!confirm('Are you sure you want to delete this target?')) return
  const targets = DataStore.get('targets') || []
  const filtered = targets.filter(t => t.id !== targetId)
  DataStore.set('targets', filtered)
  renderTargets()
  showToast('Target deleted successfully', 'success')
}

// Placeholder renderers
function renderAccounts() {
  const accounts = DataStore.get('accounts')
  const tbody = document.getElementById('accountsTableBody')
  if (!tbody) return

  if (accounts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="padding:40px;text-align:center;color:var(--gray-400);">No accounts found</td></tr>'
  } else {
    tbody.innerHTML = accounts.map(a => `
      <tr style="border-bottom:1px solid var(--gray-100);">
        <td style="padding:14px 16px;">
          <div style="font-weight:500;color:var(--gray-900);">${a.name}</div>
          <div style="font-size:12px;color:var(--gray-500);">${a.industry || '—'}</div>
        </td>
        <td style="padding:14px 16px;color:var(--gray-700);">${a.type || '—'}</td>
        <td style="padding:14px 16px;color:var(--gray-700);">₹${(a.revenue / 10000000).toFixed(1)}Cr</td>
        <td style="padding:14px 16px;color:var(--gray-700);">${a.phone || '—'}</td>
      </tr>
    `).join('')
  }
}

function renderContacts() {
  let contacts = DataStore.get('contacts') || []
  const tbody = document.getElementById('contactsTableBody')
  if (!tbody) return

  // Get search query
  const searchQuery = document.getElementById('contactSearch')?.value?.toLowerCase() || ''
  
  // Get filter checkboxes
  const filterAll = document.getElementById('filterAll')?.checked
  const filterCustomer = document.getElementById('filterCustomer')?.checked
  const filterProspect = document.getElementById('filterProspect')?.checked
  const filterPartner = document.getElementById('filterPartner')?.checked

  // Filter by search
  if (searchQuery) {
    contacts = contacts.filter(c => 
      (c.name && c.name.toLowerCase().includes(searchQuery)) ||
      (c.company && c.company.toLowerCase().includes(searchQuery)) ||
      (c.email && c.email.toLowerCase().includes(searchQuery)) ||
      (c.phone && c.phone.toLowerCase().includes(searchQuery))
    )
  }

  // Filter by type (if "All" is not checked and at least one type is checked)
  if (!filterAll && (filterCustomer || filterProspect || filterPartner)) {
    contacts = contacts.filter(c => {
      const type = c.type?.toLowerCase()
      return (filterCustomer && type === 'customer') ||
             (filterProspect && type === 'prospect') ||
             (filterPartner && type === 'partner')
    })
  }

  // Handle "All" checkbox logic - if "All" is checked, uncheck others
  if (filterAll) {
    const customerCb = document.getElementById('filterCustomer')
    const prospectCb = document.getElementById('filterProspect')
    const partnerCb = document.getElementById('filterPartner')
    if (customerCb) customerCb.checked = false
    if (prospectCb) prospectCb.checked = false
    if (partnerCb) partnerCb.checked = false
  }

  if (contacts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="padding:40px;text-align:center;color:var(--gray-400);">No contacts found</td></tr>'
  } else {
    tbody.innerHTML = contacts.map(c => `
      <tr style="border-bottom:1px solid var(--gray-100);">
        <td style="padding:14px 16px;"><input type="checkbox"></td>
        <td style="padding:14px 16px;">
          <div style="font-weight:500;color:var(--gray-900);">${c.name}</div>
          <div style="font-size:12px;color:var(--gray-500);margin-top:4px;">${c.phone || '—'}</div>
        </td>
        <td style="padding:14px 16px;color:var(--gray-700);">${c.company || c.company_name || c.companyName || c.customerCompany || '—'}</td>
        <td style="padding:14px 16px;color:var(--gray-700);">${c.email || '—'}</td>
        <td style="padding:14px 16px;color:var(--gray-700);">${c.phone || '—'}</td>
        <td style="padding:14px 16px;">
          <span class="badge ${c.type}">${c.type || '—'}</span>
        </td>
        <td style="padding:14px 16px;text-align:center;">
          <button class="btn-icon" onclick="openProfile('contact','${c.id}')" title="View profile" style="background:transparent;border:none;cursor:pointer;font-size:16px;color:var(--gray-500);padding:4px 8px;border-radius:4px;transition:all 0.2s;" onmouseover="this.style.color='#2563eb'" onmouseout="this.style.color='var(--gray-500)'">👤</button>
        </td>
      </tr>
    `).join('')
  }

  const showing = document.getElementById('contactsShowing')
  if (showing) showing.textContent = contacts.length
}

function renderDeals() {
  const deals = (typeof DataStore.getPipelineDeals === 'function')
    ? DataStore.getPipelineDeals()
    : DataStore.get('deals') || []

  renderDealMetrics(deals)
  renderDealPipeline(deals)
  renderDealsTable(deals)
}

function renderDealMetrics(deals) {
  const totalValue = deals.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0)
  const openDeals = deals.filter(d => !['closed-won', 'closed-lost'].includes((String(d.stage || d.status || '').toLowerCase()))).length
  const wonDeals = deals.filter(d => String(d.stage || d.status || '').toLowerCase() === 'closed-won').length

  const totalDealsEl = document.getElementById('dealTotalDeals')
  if (totalDealsEl) totalDealsEl.textContent = deals.length

  const totalValueEl = document.getElementById('dealTotalValue')
  if (totalValueEl) totalValueEl.textContent = formatDealValue(totalValue)

  const openDealsEl = document.getElementById('dealOpenDeals')
  if (openDealsEl) openDealsEl.textContent = openDeals

  const wonDealsEl = document.getElementById('dealWonDeals')
  if (wonDealsEl) wonDealsEl.textContent = wonDeals
}

function renderDealPipeline(deals) {
  const pipeline = (typeof DataStore.getPipelineData === 'function')
    ? DataStore.getPipelineData()
    : []

  const stageOrder = [
    { key: 'login-docs-submitted', color: '#14b8a6', accent: '#0f766e' },
    { key: 'approved-limit', color: '#34d399', accent: '#059669' },
    { key: 'sanction-docs', color: '#2dd4bf', accent: '#0f766e' },
    { key: 'pre-disbursement', color: '#fb923c', accent: '#c2410c' },
    { key: 'disbursement', color: '#f97316', accent: '#ea580c' },
    { key: 'payout-received', color: '#10b981', accent: '#047857' },
    { key: 'closed-won', color: '#d1fae5', accent: '#059669' },
    { key: 'closed-lost', color: '#fee2e2', accent: '#ef4444' }
  ]

  const totalValue = pipeline.reduce((sum, item) => sum + (Number(item.value) || 0), 0)

  stageOrder.forEach(stage => {
    const item = pipeline.find(i => i.stage === stage.key) || { count: 0, value: 0 }
    const countEl = document.getElementById(`pipeline-${stage.key}-count`)
    const valueEl = document.getElementById(`pipeline-${stage.key}-value`)
    const barEl = document.getElementById(`pipeline-${stage.key}-bar`)
    const width = totalValue ? Math.max(16, Math.round((item.value / totalValue) * 100)) : 100

    if (countEl) countEl.textContent = item.count || 0
    if (valueEl) valueEl.textContent = formatDealValue(item.value || 0)
    if (barEl) {
      barEl.style.width = `${width}%`
      barEl.style.background = stage.accent
    }
  })
}

function renderDealsTable(deals) {
  const searchValue = String(document.getElementById('dealSearch')?.value || '').trim().toLowerCase()
  const stageFilter = String(document.getElementById('dealStageFilter')?.value || '').trim().toLowerCase()
  const statusFilter = String(document.getElementById('dealStatusFilter')?.value || '').trim().toLowerCase()
  const ownerFilter = String(document.getElementById('dealOwnerFilter')?.value || '').trim().toLowerCase()

  const filtered = deals.filter(d => {
    const name = String(d.name || d.dealName || d.title || '').toLowerCase()
    const company = String(d.company || d.client || '').toLowerCase()
    const owner = String(d.owner || d.assignedTo || d.salesExecutive || '').toLowerCase()
    const stage = String(d.stage || d.status || '').toLowerCase()
    const status = stage === 'closed-won' ? 'won' : stage === 'closed-lost' ? 'lost' : 'open'

    const matchesSearch = !searchValue || name.includes(searchValue) || company.includes(searchValue) || owner.includes(searchValue) || stage.includes(searchValue)
    const matchesStage = !stageFilter || stage === stageFilter
    const matchesStatus = !statusFilter || status === statusFilter
    const matchesOwner = !ownerFilter || ownerFilter === 'me' ? ownerFilter !== 'me' || owner.includes('me') || owner === '' : owner.includes(ownerFilter)

    return matchesSearch && matchesStage && matchesStatus && matchesOwner
  })

  const tbody = document.getElementById('dealsTableBody')
  if (!tbody) return

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="13" style="padding:40px;text-align:center;color:var(--gray-400);">No deals found</td></tr>'
  } else {
    tbody.innerHTML = filtered.map(d => {
      const stage = String(d.stage || d.status || '—')
      const owner = d.owner || d.assignedTo || d.salesExecutive || '—'
      const lastActivity = d.updatedAt || d.updated_at || d.createdAt || d.created_at || ''
      const dealId = d.id || d.dealId || d.deal_id || d.lead_id || d.leadId || d.uid || ''
      const safeDealId = escapeJsString(String(dealId))
      if (dealId) {
        window.__dealDetailMap = window.__dealDetailMap || {}
        window.__dealDetailMap[String(dealId)] = d
      }
      const expectedRevenue = Number(d.expected_revenue || d.expectedRevenue || d.forecast_expected_revenue || 0)
      const weightedRevenue = Number(d.weighted_revenue || d.weightedRevenue || d.forecast_weighted_revenue || 0)
      return `
        <tr
          style="border-bottom:1px solid var(--gray-100);cursor:pointer;"
          onclick="openDealDetail('${safeDealId}')"
          onkeydown="if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openDealDetail('${safeDealId}') }"
          title="Click to view deal details"
          tabindex="0"
          role="button"
          aria-label="Open deal details for ${escapeJsString(String(d.name || d.dealName || d.title || d.company || dealId))}">
          <td style="padding:14px 16px;"><input type="checkbox" onclick="event.stopPropagation()"></td>
          <td style="padding:14px 16px;">
            <div style="font-weight:600;color:var(--gray-900);">${d.name || d.dealName || d.title || '—'}</div>
            <div style="font-size:12px;color:var(--gray-500);">${d.company || d.client || '—'}</div>
          </td>
          <td style="padding:14px 16px;color:var(--gray-700);">${d.company || d.client || '—'}</td>
          <td style="padding:14px 16px;"><span class="badge ${stage.replace(/\s+/g, '-')}">${stage}</span></td>
          <td style="padding:14px 16px;color:var(--gray-700);">${formatDealValue(Number(d.value) || 0)}</td>
          <td style="padding:14px 16px;color:var(--gray-700);">${formatDealValue(expectedRevenue)}</td>
          <td style="padding:14px 16px;color:var(--gray-700);">${formatDealValue(weightedRevenue)}</td>
          <td style="padding:14px 16px;color:var(--gray-700);">${Number(d.probability || 0)}%</td>
          <td style="padding:14px 16px;color:var(--gray-700);">${d.closeDate || d.expectedClose || '—'}</td>
          <td style="padding:14px 16px;color:var(--gray-700);">${owner}</td>
          <td style="padding:14px 16px;"><span class="badge ${statusClass(stage)}">${statusLabel(stage)}</span></td>
          <td style="padding:14px 16px;color:var(--gray-700);">${formatDateTime(lastActivity)}</td>
          <td style="padding:14px 16px;white-space:nowrap;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <button
              type="button"
              aria-label="Open deal info for ${escapeJsString(String(d.name || d.dealName || d.title || d.company || dealId))}"
              title="Open deal info"
              onclick="(function(e){e = e || window.event; if (e && e.stopPropagation) e.stopPropagation(); window.openDealDetail && window.openDealDetail('${safeDealId}')})(event)"
              style="padding:6px 10px;border:1px solid #d1d5db;background:#f8fafc;color:#0f172a;cursor:pointer;font-size:12px;border-radius:8px;display:flex;align-items:center;gap:6px;justify-content:center;min-width:64px;">
              <span style="font-size:14px;">🔎</span><span>Info</span>
            </button>
            <button
              type="button"
              aria-label="Edit deal for ${escapeJsString(String(d.name || d.dealName || d.title || d.company || dealId))}"
              title="Edit deal"
              onclick="(function(e){e = e || window.event; if (e && e.stopPropagation) e.stopPropagation(); window.editDeal && window.editDeal('${safeDealId}')})(event)"
              style="padding:6px 10px;border:1px solid #d1d5db;background:#fff;color:#0f172a;cursor:pointer;font-size:12px;border-radius:8px;display:flex;align-items:center;gap:6px;justify-content:center;min-width:64px;">
              <span style="font-size:14px;">✏️</span><span>Edit</span>
            </button>
          </td>
        </tr>
      `
    }).join('')
  }

  const dealsShowingEl = document.getElementById('dealsShowing')
  if (dealsShowingEl) dealsShowingEl.textContent = filtered.length

  const dealsCountEl = document.getElementById('dealsCount')
  if (dealsCountEl) dealsCountEl.textContent = `Total Records ${filtered.length}`
}

function statusClass(stage) {
  const key = String(stage || '').toLowerCase()
  if (key === 'closed-won') return 'completed'
  if (key === 'closed-lost') return 'cancelled'
  return 'a'
}

function statusLabel(stage) {
  const key = String(stage || '').toLowerCase()
  if (key === 'closed-won') return 'Won'
  if (key === 'closed-lost') return 'Lost'
  return 'Open'
}

function formatDealValue(value) {
  const amount = Number(value) || 0
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`
  }
  return `₹${amount.toLocaleString('en-IN')}`
}

function importDeals() {
  showToast('Import deals is coming soon.', 'info')
}

function renderCampaigns() {
  const campaigns = DataStore.get('campaigns')
  const tbody = document.getElementById('campaignsTableBody')
  if (!tbody) return

  if (campaigns.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="padding:40px;text-align:center;color:var(--gray-400);">No campaigns found</td></tr>'
  } else {
    tbody.innerHTML = campaigns.map(c => `
      <tr style="border-bottom:1px solid var(--gray-100);">
        <td style="padding:14px 16px;">
          <div style="font-weight:500;color:var(--gray-900);">${c.name}</div>
          <div style="font-size:12px;color:var(--gray-500);">${c.type || '—'}</div>
        </td>
        <td style="padding:14px 16px;color:var(--gray-700);">${c.startDate || '—'} - ${c.endDate || '—'}</td>
        <td style="padding:14px 16px;">
          <span class="badge ${c.status?.toLowerCase()}">${c.status || '—'}</span>
        </td>
        <td style="padding:14px 16px;color:var(--gray-700);">${c.leadsGenerated || 0}</td>
        <td style="padding:14px 16px;color:var(--gray-700);">
          <button class="btn-icon" onclick="showToast('Campaign details - Coming Soon', 'info')">📊</button>
        </td>
      </tr>
    `).join('')
  }

  const showing = document.getElementById('campaignsShowing')
  if (showing) showing.textContent = campaigns.length
}

function handleDocumentTypeFilterChange(changedCheckbox) {
  const checkboxes = Array.from(document.querySelectorAll('input[name="documentTypeFilter"]'))
  const allCheckbox = checkboxes.find(cb => cb.value === 'all')

  if (changedCheckbox.value === 'all' && changedCheckbox.checked) {
    checkboxes.forEach(cb => {
      if (cb !== changedCheckbox) cb.checked = false
    })
  } else if (changedCheckbox.value !== 'all' && changedCheckbox.checked) {
    if (allCheckbox) allCheckbox.checked = false
  } else if (changedCheckbox.value !== 'all' && !changedCheckbox.checked) {
    const anySpecific = checkboxes.some(cb => cb.value !== 'all' && cb.checked)
    if (!anySpecific && allCheckbox) allCheckbox.checked = true
  }

  renderDocuments()
}

function getSelectedDocumentTypes() {
  const checkboxes = Array.from(document.querySelectorAll('input[name="documentTypeFilter"]'))
  const allCheckbox = checkboxes.find(cb => cb.value === 'all')
  const selectedTypes = checkboxes
    .filter(cb => cb.value !== 'all' && cb.checked)
    .map(cb => cb.value.toLowerCase())

  if (allCheckbox?.checked || selectedTypes.length === 0) {
    return []
  }

  return selectedTypes
}

function renderDocuments() {
  const documents = DataStore.get('documents') || []
  const tbody = document.getElementById('documentsTableBody')
  const countEl = document.getElementById('documentsCount')
  const showingEl = document.getElementById('documentsShowing')

  if (!tbody) return

  // Filter by search if present
  const search = document.getElementById('documentSearch')?.value?.toLowerCase() || ''
  const selectedTypes = getSelectedDocumentTypes()

  let filtered = documents
  if (search) {
    filtered = filtered.filter(d =>
      d.name?.toLowerCase().includes(search) ||
      d.relatedTo?.toLowerCase().includes(search) ||
      d.type?.toLowerCase().includes(search)
    )
  }

  if (selectedTypes.length > 0) {
    filtered = filtered.filter(d => selectedTypes.includes(d.type?.toLowerCase()))
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="padding:40px;text-align:center;color:var(--gray-400);">No documents found. Click "Upload Document" to add one.</td></tr>'
  } else {
    tbody.innerHTML = filtered.map(d => `
      <tr style="border-bottom:1px solid var(--gray-100);">
        <td style="padding:14px 16px;"><input type="checkbox"></td>
        <td style="padding:14px 16px;">
          <div style="font-weight:500;color:var(--gray-900);">${d.name}</div>
          <div style="font-size:12px;color:var(--gray-500);">${d.fileName || ''}</div>
        </td>
        <td style="padding:14px 16px;">
          <span class="badge ${d.type?.toLowerCase()}">${d.type || 'Other'}</span>
        </td>
        <td style="padding:14px 16px;color:var(--gray-700);">${d.relatedTo || '—'}</td>
        <td style="padding:14px 16px;color:var(--gray-700);">${d.fileSize || '—'}</td>
        <td style="padding:14px 16px;color:var(--gray-700);font-size:12px;">${d.uploadedAt || '—'}</td>
        <td style="padding:14px 16px;text-align:right;">
          <button class="btn-icon" onclick="deleteDocument(${d.id})" title="Delete document">🗑️</button>
        </td>
      </tr>
    `).join('')
  }

  if (countEl) countEl.textContent = `Total Records ${filtered.length}`
  if (showingEl) showingEl.textContent = filtered.length
}

function renderDocumentsLoanApplications() {
  const search = document.getElementById('caseDocSearch')?.value?.toLowerCase() || ''
  const applications = DataStore.get('loanApplications') || []
  const filtered = applications.filter(app => {
    if (!search) return true
    const lead = getLeadsJourney().find(l => String(l.id) === String(app.leadId))
    const leadText = lead?.companyName || lead?.company || app.leadCompany || ''
    return [app.applicationId, app.lenderName, app.productType, app.applicationStatus || app.status, leadText]
      .some(value => String(value || '').toLowerCase().includes(search))
  })

  renderDocumentsCaseSummary(filtered)

  const container = document.getElementById('documentsCaseTableContainer')
  if (!container) return

  if (filtered.length === 0) {
    container.innerHTML = '<div style="padding:24px;color:var(--gray-500);">No loan applications found. Refine the search or use the lead view to create a new application.</div>'
    return
  }

  container.innerHTML = `
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;min-width:860px;">
        <thead>
          <tr style="background:#f8fafc;color:#0f172a;text-align:left;font-size:13px;line-height:1.6;">
            <th style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">Application</th>
            <th style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">Lead</th>
            <th style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">Product</th>
            <th style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">Lender</th>
            <th style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">Applied / Sanctioned</th>
            <th style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">Status</th>
            <th style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">Actions</th>
          </tr>
        </thead>
        <tbody>${filtered.map(app => {
          const lead = getLeadsJourney().find(l => String(l.id) === String(app.leadId))
          const leadName = lead?.companyName || lead?.company || app.leadCompany || 'Unknown'
          const sanctioned = app.sanctionedAmount ? `₹${Number(app.sanctionedAmount).toLocaleString()}` : '—'
          const applied = app.appliedAmount ? `₹${Number(app.appliedAmount).toLocaleString()}` : '—'
          const statusText = app.applicationStatus || app.status || '—'
          const statusClass = String(statusText || 'unknown').replace(/\s+/g, '-').toLowerCase()
          return `
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:14px 16px;vertical-align:top;"><strong>${app.applicationId || '—'}</strong><br><small style="color:#64748b;">${app.lenderCaseId || 'No lender ref'}</small></td>
              <td style="padding:14px 16px;vertical-align:top;">${leadName}</td>
              <td style="padding:14px 16px;vertical-align:top;">${app.productType || '—'}</td>
              <td style="padding:14px 16px;vertical-align:top;">${app.lenderName || '—'}</td>
              <td style="padding:14px 16px;vertical-align:top;">${applied} / ${sanctioned}</td>
              <td style="padding:14px 16px;vertical-align:top;"><span class="badge ${statusClass}">${statusText}</span></td>
              <td style="padding:14px 16px;vertical-align:top;display:flex;gap:8px;flex-wrap:wrap;">
                <button class="btn btn-outline" onclick="openDocumentsLoanApplication('${app.id}')" style="padding:6px 10px;">Open Case</button>
                <button class="btn btn-outline" onclick="openLenderQueryForm('${app.id}')" style="padding:6px 10px;">Add Query</button>
              </td>
            </tr>
          `
        }).join('')}</tbody>
      </table>
    </div>
  `
}

function renderDocumentsCaseSummary(apps) {
  const summary = document.getElementById('documentsCaseSummary')
  if (!summary) return

  const total = apps.length
  const active = apps.filter(app => (app.applicationStatus || app.status) && !['Rejected','Closed'].includes(app.applicationStatus || app.status)).length
  const sanctioned = apps.filter(app => Number(app.sanctionedAmount) > 0).length
  const disbursed = apps.filter(app => Number(app.disbursalAmount) > 0).length

  summary.innerHTML = [
    `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;min-width:150px;"><div style="font-size:12px;color:#475569;margin-bottom:6px;">Applications</div><div style="font-size:16px;font-weight:700;color:#0f766e;">${total}</div></div>`,
    `<div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:14px;min-width:150px;"><div style="font-size:12px;color:#92400e;margin-bottom:6px;">Active</div><div style="font-size:16px;font-weight:700;color:#b45309;">${active}</div></div>`,
    `<div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:14px;min-width:150px;"><div style="font-size:12px;color:#065f46;margin-bottom:6px;">Sanctioned</div><div style="font-size:16px;font-weight:700;color:#047857;">${sanctioned}</div></div>`,
    `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:14px;min-width:150px;"><div style="font-size:12px;color:#1e3a8a;margin-bottom:6px;">Disbursed</div><div style="font-size:16px;font-weight:700;color:#1d4ed8;">${disbursed}</div></div>`
  ].join('')
}

function openDocumentsLoanApplication(applicationId) {
  const app = DataStore.getById('loanApplications', Number(applicationId))
  if (!app) {
    showToast('Loan application not found', 'error')
    return
  }

  let lead = getLeadsJourney().find(l => String(l.id) === String(app.leadId))
  if (!lead) {
    lead = DataStore.get('leads').find(l => String(l.id) === String(app.leadId))
  }

  if (!lead) {
    showToast('Lead for this application could not be located.', 'error')
    return
  }

  openLeadCaseManager(lead.id)
}

function deleteDocument(documentId) {
  if (!confirm('Are you sure you want to delete this document?')) return

  DataStore.delete('documents', documentId)
  renderDocuments()
  showToast('Document deleted successfully', 'info')
}

// Placeholders for other sections
function renderIntegrations() {
  const section = document.getElementById('sec-integrations')
  if (!section) return

  section.innerHTML = `
    <div class="dash-grid">
      <div class="card" style="grid-column: 1 / -1;">
        <div class="card-hd">
          <div>
            <div class="card-title">🔗 Integrations</div>
            <div class="card-subtitle">Connect your CRM with email, sheets, chat, and meeting tools.</div>
          </div>
        </div>
        <div style="padding:24px;">
          <div style="margin-bottom:30px;">
            <div style="font-weight:600;color:var(--gray-800);margin-bottom:16px;font-size:16px;">Connected Apps</div>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;">
              <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:var(--radius);padding:16px;display:flex;align-items:center;gap:12px;">
                <div style="width:40px;height:40px;background:#22c55e;border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;">WA</div>
                <div>
                  <div style="font-weight:600;color:var(--gray-800);">WhatsApp</div>
                  <div style="font-size:12px;color:var(--success);">● Connected</div>
                </div>
              </div>
              <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:var(--radius);padding:16px;display:flex;align-items:center;gap:12px;">
                <div style="width:40px;height:40px;background:#ef4444;border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;">GM</div>
                <div>
                  <div style="font-weight:600;color:var(--gray-800);">Gmail</div>
                  <div style="font-size:12px;color:var(--danger);">○ Not Connected</div>
                </div>
              </div>
              <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:var(--radius);padding:16px;display:flex;align-items:center;gap:12px;">
                <div style="width:40px;height:40px;background:#3b82f6;border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;">ZM</div>
                <div>
                  <div style="font-weight:600;color:var(--gray-800);">Zoom</div>
                  <div style="font-size:12px;color:var(--gray-500);">○ Not Connected</div>
                </div>
              </div>
              <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:var(--radius);padding:16px;display:flex;align-items:center;gap:12px;">
                <div style="width:40px;height:40px;background:#8b5cf6;border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;">GS</div>
                <div>
                  <div style="font-weight:600;color:var(--gray-800);">Google Sheets</div>
                  <div style="font-size:12px;color:var(--gray-500);">○ Not Connected</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div style="font-weight:600;color:var(--gray-800);margin-bottom:16px;font-size:16px;">Available Integrations</div>
            <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:12px;">
              <div style="text-align:center;padding:16px;border:1px solid var(--gray-200);border-radius:var(--radius);cursor:pointer;">📧<div style="font-size:12px;font-weight:500;margin-top:8px;">Outlook</div></div>
              <div style="text-align:center;padding:16px;border:1px solid var(--gray-200);border-radius:var(--radius);cursor:pointer;">📅<div style="font-size:12px;font-weight:500;margin-top:8px;">Calendar</div></div>
              <div style="text-align:center;padding:16px;border:1px solid var(--gray-200);border-radius:var(--radius);cursor:pointer;">💬<div style="font-size:12px;font-weight:500;margin-top:8px;">Slack</div></div>
              <div style="text-align:center;padding:16px;border:1px solid var(--gray-200);border-radius:var(--radius);cursor:pointer;">📹<div style="font-size:12px;font-weight:500;margin-top:8px;">Meet</div></div>
              <div style="text-align:center;padding:16px;border:1px solid var(--gray-200);border-radius:var(--radius);cursor:pointer;">💳<div style="font-size:12px;font-weight:500;margin-top:8px;">Stripe</div></div>
              <div style="text-align:center;padding:16px;border:1px solid var(--gray-200);border-radius:var(--radius);cursor:pointer;">🐙<div style="font-size:12px;font-weight:500;margin-top:8px;">GitHub</div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
}
function renderAutomation() {}

// ═══════════════════════════════════════════════════════════════
// TASK ASSIGNMENT - Admin can assign tasks to employees
// ═══════════════════════════════════════════════════════════════

let currentTaskFilter = 'all'

function renderTaskAssign(clearConfirmation = true) {
  const roleStr = String(S?.role || '').toLowerCase()
  const isAssigner = roleStr === 'admin' || roleStr.includes('manager') || roleStr === 'branch_manager'
  const employees = DataStore.get('employees') || []

  const assignPanel = document.querySelector('#sec-task-assign .leads-filter-panel')
  if (assignPanel) {
    assignPanel.style.display = isAssigner ? '' : 'none'
  }

  // Populate assignee dropdown for assigners
  if (isAssigner) {
    const assigneeSelect = document.getElementById('taskAssignee')
    if (assigneeSelect) {
      assigneeSelect.innerHTML = '<option value="">Select employee</option>'
      const seen = new Set()
      employees.forEach(e => {
        const email = String(e.email || e.user_email || e.username || '').trim().toLowerCase()
        const name = String(e.name || e.fullName || e.displayName || '').trim()
        const key = email || name.toLowerCase()
        if (!key) return
        if (seen.has(key)) return
        if (email === 'admin@fundingsathi.com' || email === 'corporate@fundingsathi.in' || email === 'shree.rathod@fundingsathi.in') return
        if (name.toLowerCase().includes('shree rathod')) return
        seen.add(key)

        const option = document.createElement('option')
        option.value = String(e.id || e.user_id || e.userId || e.employee_id || e.email || '').trim()
        option.textContent = name || email || 'Unnamed employee'
        if (e.email) option.dataset.email = e.email
        assigneeSelect.appendChild(option)
      })
    }
  }

  if (!isAssigner) {
    const taskTitleInput = document.getElementById('taskTitle')
    const assigneeSelect = document.getElementById('taskAssignee')
    const dueDateInput = document.getElementById('taskDueDate')
    const descriptionInput = document.getElementById('taskDescription')
    const taskPriority = document.getElementById('taskPriority')
    const taskRelatedType = document.getElementById('taskRelatedType')
    const submitButton = document.querySelector('#sec-task-assign .btn-primary')

    if (taskTitleInput) taskTitleInput.disabled = true
    if (assigneeSelect) assigneeSelect.disabled = true
    if (dueDateInput) dueDateInput.disabled = true
    if (descriptionInput) descriptionInput.disabled = true
    if (taskPriority) taskPriority.disabled = true
    if (taskRelatedType) taskRelatedType.disabled = true
    if (submitButton) submitButton.style.display = 'none'
  }

  // Clear the previous assign confirmation when opening the task form
  if (clearConfirmation) {
    clearTaskAssignConfirmation()
  }

  // Set default due date
  const dueDateInput = document.getElementById('taskDueDate')
  if (dueDateInput && !dueDateInput.value) {
    dueDateInput.value = new Date().toISOString().split('T')[0]
  }

  // Render task table
  renderTasksTable()
}

function setTaskAssignConfirmation(message, isError = false) {
  const el = document.getElementById('taskAssignConfirmation')
  if (!el) return
  el.textContent = message
  el.style.display = 'block'
  el.style.background = isError ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.12)'
  el.style.color = isError ? '#b91c1c' : '#064e3b'
  el.style.border = isError ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(16,185,129,0.2)'
}

function clearTaskAssignConfirmation() {
  const el = document.getElementById('taskAssignConfirmation')
  if (!el) return
  el.textContent = ''
  el.style.display = 'none'
}

function renderTasksTable() {
  const roleStr = String(S?.role || '').toLowerCase()
  const isAssigner = roleStr === 'admin' || roleStr.includes('manager') || roleStr === 'branch_manager'
  let tasks = DataStore.get('tasks') || []
  const employees = DataStore.get('employees') || []

  // Filter tasks based on role
  if (!isAssigner) {
    const currentUserIds = new Set([
      String(S?.id || ''),
      String(S?.uid || ''),
      String(S?.user_id || ''),
      String(S?.userId || ''),
      String(S?.employee_id || ''),
      String(S?.employeeId || '')
    ].filter(Boolean).map(id => id.toLowerCase()))

    const currentUserAliases = new Set([
      S?.email,
      S?.name,
      S?.displayName,
      S?.id,
      S?.uid,
      S?.user_id,
      S?.userId,
      S?.employee_id,
      S?.employeeId
    ].filter(Boolean).map(value => String(value).toLowerCase()))

    tasks = tasks.filter(t => {
      const assignedToValue = String(t.assignedTo || t.assigned_to || t.assignee || t.assignedToId || t.assigned_to_id || '').toLowerCase()
      const assignedToId = String(t.assignedToId || t.assigned_to || t.assigned_to_id || t.assigneeId || t.assignedToId || t.assignedTo || '').toLowerCase()
      return assignedToValue === 'me' ||
             assignedToValue === 'all' ||
             currentUserAliases.has(assignedToValue) ||
             currentUserIds.has(assignedToId)
    })
  }

  // Apply status filter
  if (currentTaskFilter === 'pending') {
    tasks = tasks.filter(t => !t.completed)
  } else if (currentTaskFilter === 'completed') {
    tasks = tasks.filter(t => t.completed)
  } else if (currentTaskFilter === 'overdue') {
    const today = new Date().toISOString().split('T')[0]
    tasks = tasks.filter(t => !t.completed && t.dueDate && t.dueDate < today)
  }

  // Sort by priority and due date
  const priorityOrder = { urgent: 1, high: 2, medium: 3, low: 4 }
  tasks.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    const priDiff = (priorityOrder[a.priority] || 5) - (priorityOrder[b.priority] || 5)
    if (priDiff !== 0) return priDiff
    return (a.dueDate || '').localeCompare(b.dueDate || '')
  })

  const tbody = document.getElementById('tasksTableBody')
  const countEl = document.getElementById('tasksCount')
  const showingEl = document.getElementById('tasksShowing')

  if (!tbody) return

  if (countEl) countEl.textContent = `Total Records ${tasks.length}`
  if (showingEl) showingEl.textContent = tasks.length

  if (tasks.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="padding:40px;text-align:center;color:var(--gray-400);">${isAssigner ? 'No tasks found. Assign tasks using the form.' : 'No tasks assigned to you yet.'}</td></tr>`
    return
  }

  tbody.innerHTML = tasks.map(task => {
    const isOverdue = !task.completed && task.dueDate && task.dueDate < new Date().toISOString().split('T')[0]
    const assignee = employees.find(e => {
      const email = String(e.email || '').toLowerCase()
      const id = String(e.id || e.user_id || e.userId || e.employee_id || e.employeeId || '').toLowerCase()
      return email === String(task.assignedTo || '').toLowerCase() || id === String(task.assignedToId || task.assigned_to || '').toLowerCase()
    }) || { name: task.assignedTo || 'Unknown' }

    const assigner = employees.find(e => {
      const email = String(e.email || '').toLowerCase()
      const id = String(e.id || e.user_id || e.userId || e.employee_id || e.employeeId || '').toLowerCase()
      return email === String(task.assignedBy || '').toLowerCase() || id === String(task.assignedById || task.assigned_by || '').toLowerCase()
    }) || { name: task.assignedBy || 'Unknown' }
    const displayDate = task.assignedAt || task.created_at || task.createdAt || new Date().toISOString()
    const taskAgeing = getTaskAgeingDays(task)

    return `
      <tr style="border-bottom:1px solid var(--gray-100);">
        <td style="padding:14px 16px;"><input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTaskStatus('${task.id}')"></td>
        <td style="padding:14px 16px;cursor:pointer;" onclick="openTaskDetailModal('${task.id}')" title="Click to view full task description">
          <div style="font-weight:500;color:var(--gray-900);">${task.title}</div>
          <div style="font-size:12px;color:var(--gray-500);">${task.description || task.notes || ''}</div>
        </td>
        <td style="padding:14px 16px;color:var(--gray-700);">${formatDateTime(task.assignedAt || task.created_at || task.createdAt || new Date().toISOString())}</td>
        <td style="padding:14px 16px;color:var(--gray-700);">${assigner.name}</td>
        <td style="padding:14px 16px;color:var(--gray-700);">${assignee.name}</td>
        <td style="padding:14px 16px;color:${isOverdue ? '#ef4444' : 'var(--gray-700)'};font-weight:${isOverdue ? '600' : '400'};">
          ${task.dueDate || '—'}
          ${isOverdue ? ' <span style="color:#ef4444;font-size:11px;">(Overdue)</span>' : ''}
        </td>
        <td style="padding:14px 16px;">
          <span class="badge ${task.priority || 'medium'}">${task.priority || 'medium'}</span>
        </td>
        <td style="padding:14px 16px;">
          <span class="badge ${task.completed ? 'completed' : 'pending'}">${task.completed ? 'Completed' : 'Pending'}</span>
        </td>
        <td style="padding:14px 16px;color:var(--gray-700);">${taskAgeing}</td>
        <td style="padding:14px 16px;text-align:center;">
          ${isAssigner ? `<button class="btn-secondary" onclick="deleteTask('${task.id}')" title="Remove task" style="padding:8px 10px;font-size:13px;min-width:80px;">🗑️ Remove</button>` : '—'}
        </td>
      </tr>
    `
  }).join('')
}

function toggleTaskStatus(taskId) {
  const result = DataStore.toggleTask(taskId)
  if (result) {
    showToast(result.completed ? 'Task completed!' : 'Task reopened', 'success')
    renderTasksTable()
  }
}

function getTaskAgeingDays(task) {
  if (!task) return '—'
  if (!task.completed) return '—'

  const assignedAt = new Date(task.assignedAt || task.created_at || task.createdAt || task.assigned_at)
  const completedAt = new Date(task.completedAt || task.completed_at || task.updatedAt || task.updated_at)
  if (isNaN(assignedAt.getTime()) || isNaN(completedAt.getTime())) return '—'

  const diffMs = completedAt.getTime() - assignedAt.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return diffDays >= 0 ? diffDays : '—'
}

function renderTaskList() {
  const isAdmin = String(S?.role || '').toLowerCase() === 'admin'
  let tasks = DataStore.get('tasks') || []
  const employees = DataStore.get('employees') || []

  // Filter tasks based on role and current filter
  if (!isAdmin) {
    // Employees see only tasks assigned to them (by email, name, or backend user ID)
    const currentUserIds = new Set([
      String(S?.id || ''),
      String(S?.uid || ''),
      String(S?.user_id || ''),
      String(S?.userId || ''),
      String(S?.employee_id || ''),
      String(S?.employeeId || '')
    ].filter(Boolean).map(id => id.toLowerCase()))

    const currentUserAliases = new Set([
      S?.email,
      S?.name,
      S?.displayName,
      S?.id,
      S?.uid,
      S?.user_id,
      S?.userId,
      S?.employee_id,
      S?.employeeId
    ].filter(Boolean).map(value => String(value).toLowerCase()))

    tasks = tasks.filter(t => {
      const assignedToValue = String(t.assignedTo || t.assigned_to || t.assignee || t.assignedToId || t.assigned_to_id || '').toLowerCase()
      const assignedToId = String(t.assignedToId || t.assigned_to || t.assigned_to_id || t.assigneeId || t.assignedToId || t.assignedTo || '').toLowerCase()
      return assignedToValue === 'me' ||
             assignedToValue === 'all' ||
             currentUserAliases.has(assignedToValue) ||
             currentUserIds.has(assignedToId)
    })
  }

  // Apply status filter
  if (currentTaskFilter === 'pending') {
    tasks = tasks.filter(t => !t.completed)
  } else if (currentTaskFilter === 'completed') {
    tasks = tasks.filter(t => t.completed)
  } else if (currentTaskFilter === 'overdue') {
    const today = new Date().toISOString().split('T')[0]
    tasks = tasks.filter(t => !t.completed && t.dueDate && t.dueDate < today)
  }

  // Sort by priority and due date
  const priorityOrder = { urgent: 1, high: 2, medium: 3, low: 4 }
  tasks.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    const priDiff = (priorityOrder[a.priority] || 5) - (priorityOrder[b.priority] || 5)
    if (priDiff !== 0) return priDiff
    return (a.dueDate || '').localeCompare(b.dueDate || '')
  })

  // Update count
  const countEl = document.getElementById('taskCount')
  if (countEl) countEl.textContent = tasks.length

  if (tasks.length === 0) {
    return `
      <div style="padding:60px 20px;text-align:center;color:var(--gray-400);">
        <div style="font-size:48px;margin-bottom:16px;">📋</div>
        <div style="font-size:16px;font-weight:500;margin-bottom:8px;">No tasks found</div>
        <div style="font-size:14px;">${isAdmin ? 'Assign tasks to your team members using the form above' : 'No tasks assigned to you yet'}</div>
      </div>
    `
  }

  let html = `
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr style="background:var(--gray-50);border-bottom:1px solid var(--gray-200);">
          <th style="padding:12px 16px;text-align:left;font-weight:600;color:var(--gray-700);font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Status</th>
          <th style="padding:12px 16px;text-align:left;font-weight:600;color:var(--gray-700);font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Task</th>
          ${isAdmin ? `<th style="padding:12px 16px;text-align:left;font-weight:600;color:var(--gray-700);font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Assigned To</th>` : ''}
          <th style="padding:12px 16px;text-align:left;font-weight:600;color:var(--gray-700);font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Assigned By</th>
          <th style="padding:12px 16px;text-align:left;font-weight:600;color:var(--gray-700);font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Date</th>
          <th style="padding:12px 16px;text-align:left;font-weight:600;color:var(--gray-700);font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Due Date</th>
          <th style="padding:12px 16px;text-align:left;font-weight:600;color:var(--gray-700);font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Priority</th>
          ${isAdmin ? `<th style="padding:12px 16px;text-align:center;font-weight:600;color:var(--gray-700);font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Actions</th>` : ''}
        </tr>
      </thead>
      <tbody>
  `

  tasks.forEach(task => {
    const isOverdue = !task.completed && task.dueDate && task.dueDate < new Date().toISOString().split('T')[0]
    const priorityClass = task.priority || 'medium'
    const priorityColors = {
      urgent: '#dc2626',
      high: '#ea580c',
      medium: '#2563eb',
      low: '#16a34a'
    }

    const assignee = employees.find(e => {
      const email = String(e.email || '').toLowerCase()
      const id = String(e.id || e.user_id || e.userId || e.employee_id || e.employeeId || '').toLowerCase()
      return email === String(task.assignedTo || '').toLowerCase() || id === String(task.assignedToId || task.assigned_to || '').toLowerCase()
    }) || (task.assignedTo === 'me' ? { name: 'Me', initials: 'ME' } : null)

    const currentUserIds = new Set([
      String(S?.id || ''),
      String(S?.uid || ''),
      String(S?.user_id || ''),
      String(S?.userId || ''),
      String(S?.employee_id || ''),
      String(S?.employeeId || '')
    ].filter(Boolean).map(id => id.toLowerCase()))

    const currentUserAliases = new Set([
      S?.email,
      S?.name,
      S?.displayName,
      S?.id,
      S?.uid,
      S?.user_id,
      S?.userId,
      S?.employee_id,
      S?.employeeId
    ].filter(Boolean).map(value => String(value).toLowerCase()))

    const assignedToValue = String(task.assignedTo || task.assigned_to || task.assignee || '').toLowerCase()
    const assignedToId = String(task.assignedToId || task.assigned_to_id || task.assigned_to || task.assigneeId || '').toLowerCase()
    const isAssignedToCurrentUser = assignedToValue === 'me' || currentUserAliases.has(assignedToValue) || currentUserIds.has(assignedToId)
    const canDeleteTask = isAdmin || isAssignedToCurrentUser

    const actionsCell = canDeleteTask
      ? `
          <td style="padding:14px 16px;text-align:center;">
            <button class="btn-secondary" onclick="deleteTask('${task.id}')" title="Delete task" style="padding:8px 10px;font-size:13px;min-width:80px;">🗑️ Remove</button>
          </td>
        `
      : `
          <td style="padding:14px 16px;text-align:center;color:var(--gray-500);font-size:13px;">—</td>
        `

    const assigner = employees.find(e => {
      const email = String(e.email || '').toLowerCase()
      const id = String(e.id || e.user_id || e.userId || e.employee_id || e.employeeId || '').toLowerCase()
      return email === String(task.assignedBy || '').toLowerCase() || id === String(task.assignedById || task.assigned_by || '').toLowerCase()
    }) || { name: task.assignedBy || 'Unknown' }

    html += `
      <tr style="border-bottom:1px solid var(--gray-100);${task.completed ? 'opacity:0.6;background:#f9fafb;' : ''}">
        <td style="padding:14px 16px;">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="completeAssignedTask('${task.id}')" style="width:18px;height:18px;accent-color:var(--maroon);cursor:pointer;">
            <span style="font-size:12px;color:var(--gray-500);">${task.completed ? 'Done' : 'Pending'}</span>
          </label>
        </td>
        <td style="padding:14px 16px;cursor:pointer;" onclick="openTaskDetailModal('${task.id}')" title="Click to view full task description">
          <div style="font-weight:500;color:var(--gray-900);${task.completed ? 'text-decoration:line-through;' : ''}">${task.title}</div>
          <div style="font-size:12px;color:var(--gray-500);margin-top:2px;">
            ${task.relatedTo ? `<span style="margin-right:8px;">📎 ${task.relatedTo}</span>` : ''}
            <span style="text-transform:capitalize;">${task.type || 'task'}</span>
          </div>
          ${task.notes ? `<div style="font-size:12px;color:var(--gray-400);margin-top:4px;font-style:italic;">${task.notes}</div>` : ''}
        </td>
        <td style="padding:14px 16px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:28px;height:28px;border-radius:50%;background:var(--maroon);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;">
              ${assignee ? assignee.initials || assignee.name?.charAt(0) : '?'}
            </div>
            <div>
              <div style="font-size:13px;font-weight:500;color:var(--gray-900);">${assignee ? assignee.name : task.assignedTo || 'Unknown'}</div>
              ${assignee?.territory ? `<div style="font-size:11px;color:var(--gray-400);">${assignee.territory}</div>` : ''}
            </div>
          </div>
        </td>
        <td style="padding:14px 16px;color:var(--gray-700);">${assigner.name}</td>
        <td style="padding:14px 16px;color:var(--gray-700);">${formatDateTime(displayDate)}</td>
        <td style="padding:14px 16px;">
          <div style="font-size:13px;color:${isOverdue ? '#dc2626' : 'var(--gray-700)'};font-weight:${isOverdue ? '600' : '400'};">
            ${task.dueDate ? formatDate(task.dueDate) : '—'}
            ${isOverdue ? '<span style="margin-left:4px;">⚠️</span>' : ''}
          </div>
        </td>
        <td style="padding:14px 16px;">
          <span style="display:inline-block;padding:4px 10px;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;background:${priorityColors[priorityClass]}15;color:${priorityColors[priorityClass]};">
            ${task.priority || 'medium'}
          </span>
        </td>
        <td style="padding:14px 16px;text-align:center;">
          <span class="badge ${task.completed ? 'completed' : 'pending'}">${task.completed ? 'Completed' : 'Pending'}</span>
        </td>
        ${actionsCell}
      </tr>
    `
  })

  html += `</tbody></table>`
  return html
}

function filterTasks(filter) {
  currentTaskFilter = filter
  const tabs = document.querySelectorAll('#sec-task-assign .view-tabs .view-tab')
  tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.filter === filter))
  renderTaskAssign()
}

function resolveCRMUserId(value) {
  if (!value) return null
  const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
  const isUUID = v => typeof v === 'string' && uuidPattern.test(v.trim())
  const normalizeValue = v => typeof v === 'string' ? v.trim() : v != null ? String(v).trim() : ''

  if (typeof value === 'object') {
    if (value === null) return null
    const candidateIds = [value.id, value.user_id, value.userId, value.employee_id, value.employeeId]
    for (const candidate of candidateIds) {
      if (isUUID(candidate)) return String(candidate).trim()
    }
    const firstCandidate = candidateIds.find(candidate => candidate != null && String(candidate).trim() !== '')
    if (firstCandidate) return String(firstCandidate).trim()
    if (value.email) return resolveCRMUserId(value.email)
    if (value.name) return resolveCRMUserId(value.name)
    if (value.fullName) return resolveCRMUserId(value.fullName)
    if (value.displayName) return resolveCRMUserId(value.displayName)
    return null
  }

  const normalized = normalizeValue(value)
  if (!normalized) return null
  if (isUUID(normalized)) return normalized
  const lookup = normalized.toLowerCase()

  const getMatchId = record => {
    if (!record || typeof record !== 'object') return null
    const candidates = [record.id, record.user_id, record.userId, record.employeeId, record.employee_id]
      .filter(val => val != null && String(val).trim() !== '')
    if (!candidates.length) return null
    return String(candidates[0]).trim() || null
  }

  if (/^\d+$/.test(lookup)) {
    const employees = DataStore.get('employees') || []
    const employee = employees.find(e => [e.id, e.uid, e.user_id, e.userId, e.employee_id, e.employeeId]
      .some(id => String(id || '').trim().toLowerCase() === lookup))
    if (employee) {
      const resolved = resolveCRMUserId(employee.email)
      if (resolved) return resolved
      const id = getMatchId(employee)
      if (id) return String(id).trim()
    }
  }

  const userList = DataStore.getCRMUsers()
  if (Array.isArray(userList)) {
    const matched = userList.find(u => {
      const email = String(u.email || '').trim().toLowerCase()
      const name = String(u.name || u.fullName || u.displayName || '').trim().toLowerCase()
      const id = String(u.id || u.user_id || u.userId || u.employee_id || u.employeeId || '').trim().toLowerCase()
      return email === lookup || name === lookup || id === lookup
    })
    const id = getMatchId(matched)
    if (id) return String(id).trim()
    if (matched?.email) return String(matched.email).trim()
  }

  const employees = DataStore.get('employees') || []
  const employee = employees.find(e => {
    const email = String(e.email || '').trim().toLowerCase()
    const name = String(e.name || e.fullName || e.displayName || '').trim().toLowerCase()
    const id = String(e.id || e.uid || e.user_id || e.userId || e.employee_id || e.employeeId || '').trim().toLowerCase()
    return email === lookup || name === lookup || id === lookup
  })
  const empId = getMatchId(employee)
  if (empId) return String(empId).trim()
  if (employee?.email) {
    const resolved = resolveCRMUserId(employee.email)
    if (resolved) return resolved
  }

  if (S) {
    const currentUserEmail = String(S.email || '').trim().toLowerCase()
    const currentUserName = String(S.name || S.displayName || '').trim().toLowerCase()
    const currentUserId = String(S.id || S.uid || S.user_id || S.userId || '').trim()
    if (lookup === currentUserEmail || lookup === currentUserName || lookup === currentUserId) {
      if (isUUID(currentUserId)) return currentUserId
    }
  }

  return null
}

async function postToCRMBackendEndpoint(path, payload, method = 'POST') {
  if (!path) throw new Error('Backend path required')
  const API_BASE = getCRMApiBase()
  if (!API_BASE) throw new Error('Backend unavailable')
  const normalizedPath = String(path).replace(/^\/+/, '')
  const endpoint = normalizedPath.startsWith('http')
    ? normalizedPath
    : API_BASE + '/' + normalizedPath
  const requestOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...getCRMBackendAuthHeader()
    },
    credentials: 'include'
  }
  if (payload !== undefined && payload !== null) {
    requestOptions.body = JSON.stringify(payload)
  }
  const res = await (typeof resolveCRMApiRequest === 'function'
    ? resolveCRMApiRequest(normalizedPath, requestOptions)
    : fetch(endpoint, requestOptions))

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Backend request failed (${res.status}): ${text}`)
  }

  const text = await res.text()
  if (!text || !text.trim()) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch (err) {
    const trimmed = String(text || '').trim()
    if (trimmed.startsWith('<?php') || trimmed.toLowerCase().includes('<!doctype html') || trimmed.toLowerCase().includes('<html')) {
      throw new Error(`Backend returned invalid JSON (${res.status}): HTML content was returned instead of JSON.`)
    }
    throw new Error(`Backend returned invalid JSON (${res.status}): ${text}`)
  }
}

async function saveTaskToBackend(task) {
  if (!task || (!task.assignedTo && !task.assignedToId)) throw new Error('Task payload is invalid')
  const assignedToId = task.assignedToId || resolveCRMUserId(task.assignedTo || task.assignedToId)
  const assignedById = task.assignedById || resolveCRMUserId(task.assignedBy || S?.email || S?.id || S?.user_id || S?.userId || S?.employee_id)
  if (!assignedToId) throw new Error('Unable to resolve assignee to backend user ID')
  if (!assignedById) throw new Error('Unable to resolve current user to backend user ID')

  task.assignedToId = assignedToId
  task.assignedById = assignedById

  const payload = {
    title: task.title,
    description: task.notes || task.description || '',
    task_type: task.type || task.task_type || 'task',
    lead_id: task.leadId || task.lead_id || null,
    notes: task.notes || task.description || '',
    assigned_to: assignedToId,
    assigned_by: assignedById,
    due_date: task.dueDate || task.due_date || '',
    priority: task.priority || 'medium',
    status: task.status || 'pending'
  }

  return await postToCRMBackendEndpoint('tasks', payload)
}

async function updateTaskInBackend(task) {
  if (!task || !task.id) throw new Error('Task object missing id for backend update')
  const payload = {
    title: task.title,
    description: task.notes || task.description || '',
    task_type: task.type || task.task_type || 'task',
    lead_id: task.leadId || task.lead_id || null,
    notes: task.notes || task.description || '',
    status: task.status || (task.completed ? 'done' : 'pending'),
    due_date: task.dueDate || task.due_date || '',
    priority: task.priority || 'medium'
  }

  const assignedToId = task.assignedToId || (task.assignedTo ? resolveCRMUserId(task.assignedTo) : null)
  const assignedById = task.assignedById || (task.assignedBy ? resolveCRMUserId(task.assignedBy) : null)

  if (task.assignedTo || task.assignedToId) {
    if (!assignedToId) throw new Error('Unable to resolve assignee to backend user ID')
    payload.assigned_to = assignedToId
  }
  if (task.assignedBy || task.assignedById) {
    if (!assignedById) throw new Error('Unable to resolve current user to backend user ID')
    payload.assigned_by = assignedById
  }

  return await postToCRMBackendEndpoint(`tasks/${encodeURIComponent(task.id)}`, payload, 'PUT')
}

async function assignTask() {
  const roleStr = String(S?.role || '').toLowerCase()
  const isAssigner = roleStr === 'admin' || roleStr.includes('manager')
  if (!isAssigner) {
    showToast('Only admins and managers can assign tasks', 'error')
    return
  }

  const title = document.getElementById('taskTitle')?.value?.trim()
  const assignee = document.getElementById('taskAssignee')?.value
  const dueDate = document.getElementById('taskDueDate')?.value
  const priority = document.getElementById('taskPriority')?.value || 'medium'
  const type = document.getElementById('taskType')?.value || 'task'
  const relatedTo = document.getElementById('taskRelatedType')?.value?.trim()
  const notes = document.getElementById('taskNotes')?.value?.trim() || document.getElementById('taskDescription')?.value?.trim()

  if (!title) {
    showToast('Please enter a task title', 'error')
    setTaskAssignConfirmation('Task assignment failed: title is required.', true)
    return
  }
  if (!assignee) {
    showToast('Please select an employee to assign this task', 'error')
    setTaskAssignConfirmation('Task assignment failed: assignee is required.', true)
    return
  }
  if (!dueDate) {
    showToast('Please select a due date', 'error')
    setTaskAssignConfirmation('Task assignment failed: due date is required.', true)
    return
  }

  const employees = DataStore.get('employees') || []
  const assigneeDetails = employees.find(e => String(e.id || e.uid || e.user_id || e.userId || e.employee_id || e.email || '').trim() === String(assignee).trim()) || {}
  const assigneeEmail = assigneeDetails.email || assignee
  const assigneeCandidate = assignee || assigneeEmail || assigneeDetails.email || assigneeDetails.name || assigneeDetails.id || assigneeDetails.user_id || assigneeDetails.userId || assigneeDetails.employee_id || assigneeDetails.employeeId
  const assignedToUuid = resolveCRMUserId(assigneeCandidate) || String(assigneeCandidate || assigneeEmail || '').trim()
  const assignedByCandidate = S?.email || S?.id || S?.user_id || S?.userId || S?.employee_id || S?.employeeId
  const assignedByUuid = resolveCRMUserId(assignedByCandidate) || String(assignedByCandidate || S?.email || '').trim() || 'admin'
  if (!assignedToUuid) {
    showToast('Unable to resolve assignee to backend user ID', 'error')
    setTaskAssignConfirmation('Task assignment failed: assignee could not be mapped to backend user.', true)
    return
  }

  const task = {
    id: Date.now(),
    title,
    assignedTo: assigneeEmail,
    assignedToId: assignedToUuid,
    dueDate,
    priority,
    type,
    relatedTo: relatedTo || '',
    notes: notes || '',
    completed: false,
    status: 'pending',
    assignedBy: S?.email || S?.name || 'admin',
    assignedById: assignedByUuid,
    assignedAt: new Date().toISOString()
  }

  // Save to backend FIRST - DataStore is only for caching
  try {
    const backendResult = await saveTaskToBackend(task)
    if (backendResult && backendResult.task_id) {
      task.id = backendResult.task_id
    } else if (backendResult && backendResult.id) {
      task.id = backendResult.id
    }
    // Only cache to DataStore AFTER successful backend save
    savedTask = DataStore.add('tasks', task)
  } catch (err) {
    console.error('Task backend save failed:', err)
    showToast('Failed to save task to backend. Please check your connection.', 'error')
    setTaskAssignConfirmation(`Task assignment failed: ${err.message}`, true)
    return
  }
  const assigneeDetailsFinal = assigneeDetails || {}
  const assigneeDisplayName = assigneeDetailsFinal.name || assigneeEmail || assignee
  if (typeof createNotification === 'function') {
    createNotification({
      type: 'task_assigned',
      title: 'New Task Assigned',
      message: `Task "${savedTask.title}" is due on ${savedTask.dueDate}.`,
      relatedId: savedTask.id,
      recipients: [assigneeEmail, assigneeDisplayName, assignedToUuid].filter(Boolean),
      recipientEmail: assigneeEmail,
      recipientName: assigneeDisplayName,
      recipientId: assignedToUuid,
      assignedTo: assigneeEmail,
      assignedToId: assignedToUuid
    })
  } else {
    if (!DataStore.get('notifications')) {
      const data = DataStore.getAll()
      data.notifications = []
      DataStore.saveAll(data)
    }
    DataStore.add('notifications', {
      id: Date.now(),
      type: 'task_assigned',
      title: 'New Task Assigned',
      message: `Task "${savedTask.title}" is due on ${savedTask.dueDate}.`,
      relatedId: savedTask.id,
      createdAt: new Date().toISOString(),
      read: false,
      recipientEmail: assigneeEmail,
      recipientName: assigneeDisplayName,
      recipientId: assignedToUuid,
      assignedTo: assigneeEmail,
      assignedToId: assignedToUuid,
      recipients: [assigneeEmail, assigneeDisplayName, assignedToUuid].filter(Boolean)
    })
    if (typeof updateNotificationBadge === 'function') updateNotificationBadge()
    if (typeof isNotificationForCurrentUser === 'function') {
      const notification = {
        recipientEmail: assigneeEmail,
        recipientName: assigneeDisplayName
      }
      if (isNotificationForCurrentUser(notification)) {
        showToast(`New Task Assigned: Task "${savedTask.title}" is due on ${savedTask.dueDate}.`, 'info')
      }
    }
  }

  const assigneeName = assigneeDetails.name || savedTask.assignedTo
  showToast('Task assigned successfully!', 'success')
  setTaskAssignConfirmation(`Task "${savedTask.title}" has been assigned to ${assigneeName}.`)
  clearTaskForm()
  renderTaskAssign(false)
  if (typeof renderEmployees === 'function') renderEmployees()
  if (typeof renderDashboard === 'function') renderDashboard()
}

function clearTaskForm() {
  ;['taskTitle', 'taskAssignee', 'taskDueDate', 'taskDescription'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.value = ''
  })
  // Reset dropdowns
  const priority = document.getElementById('taskPriority')
  const type = document.getElementById('taskType')
  if (priority) priority.value = 'medium'
  if (type) type.value = 'task'

  // Keep due date as today
  const dueDate = document.getElementById('taskDueDate')
  if (dueDate) dueDate.value = new Date().toISOString().split('T')[0]
}

// Alias for HTML onclick handler
function submitTask() {
  return assignTask()
}

async function completeAssignedTask(taskId) {
  const task = DataStore.toggleTask(taskId)
  if (task) {
    try {
      await updateTaskInBackend(task)
    } catch (err) {
      console.warn('Failed to update task completion status on backend:', err)
      showToast('Task status updated locally, but backend sync failed.', 'warning')
    }
    const msg = task.completed ? 'Task marked as completed!' : 'Task marked as pending'
    showToast(msg, task.completed ? 'success' : 'info')
    renderTaskAssign()
  }
}

async function deleteTask(taskId) {
  const task = (DataStore.get('tasks') || []).find(t => String(t.id) === String(taskId))
  if (!task) {
    showToast('Task not found.', 'error')
    return
  }

  const roleStr = String(S?.role || '').toLowerCase()
  const isAdmin = roleStr === 'admin'
  const currentUserIds = new Set([
    String(S?.id || ''),
    String(S?.uid || ''),
    String(S?.user_id || ''),
    String(S?.userId || ''),
    String(S?.employee_id || ''),
    String(S?.employeeId || '')
  ].filter(Boolean).map(id => id.toLowerCase()))

  const currentUserAliases = new Set([
    S?.email,
    S?.name,
    S?.displayName,
    S?.id,
    S?.uid,
    S?.user_id,
    S?.userId,
    S?.employee_id,
    S?.employeeId
  ].filter(Boolean).map(value => String(value).toLowerCase()))

  const assignedToValue = String(task.assignedTo || task.assigned_to || task.assignee || '').toLowerCase()
  const assignedToId = String(task.assignedToId || task.assigned_to_id || task.assigned_to || task.assigneeId || '').toLowerCase()
  const isAssignedToCurrentUser = assignedToValue === 'me' || currentUserAliases.has(assignedToValue) || currentUserIds.has(assignedToId)

  if (!isAdmin && !isAssignedToCurrentUser) {
    showToast('You are not allowed to remove this task.', 'error')
    return
  }

  // Delete from backend FIRST - localStorage cleanup happens after.
  let backendDeleteFailed = false
  try {
    if (typeof postToCRMBackendEndpoint === 'function') {
      await postToCRMBackendEndpoint(`tasks/${encodeURIComponent(String(taskId))}`, null, 'DELETE');
    }
  } catch (err) {
    console.warn('Task backend delete failed:', err);
    backendDeleteFailed = true
    showToast('Backend delete failed; task will still be removed locally.', 'warning');
  }

  // Remove task locally regardless of backend availability to keep UI responsive.
  DataStore.delete('tasks', taskId)

  try {
    const rawBackendTasks = localStorage.getItem('crm_tasks')
    if (rawBackendTasks) {
      const backendTasks = JSON.parse(rawBackendTasks)
      if (Array.isArray(backendTasks)) {
        const filteredBackendTasks = backendTasks.filter(item => {
          const currentId = String(item.id || item.task_id || item.taskId || '').trim()
          return currentId !== String(taskId).trim()
        })
        if (filteredBackendTasks.length !== backendTasks.length) {
          localStorage.setItem('crm_tasks', JSON.stringify(filteredBackendTasks))
        }
      }
    }
  } catch (err) {
    console.warn('Failed to remove backend cached task from crm_tasks:', err)
  }

  const button = document.querySelector(`button[onclick="deleteTask('${taskId}')"]`)
  if (button) {
    const row = button.closest('tr')
    if (row) row.remove()
  }

  showToast('Task deleted successfully', 'success')

  renderTaskAssign()
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const date = parseDateAsUTC(dateStr)
  if (!date) return '—'

  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const dateIso = date.toLocaleDateString('en-CA', { timeZone: CRM_TIMEZONE })
  const todayIso = today.toLocaleDateString('en-CA', { timeZone: CRM_TIMEZONE })
  const tomorrowIso = tomorrow.toLocaleDateString('en-CA', { timeZone: CRM_TIMEZONE })

  if (dateIso === todayIso) return 'Today'
  if (dateIso === tomorrowIso) return 'Tomorrow'

  return date.toLocaleDateString('en-IN', { timeZone: CRM_TIMEZONE, day: 'numeric', month: 'short', year: 'numeric' })
}

// ═══════════════════════════════════════════════════════════════
// MODAL BACKDROP HELPERS
// ═══════════════════════════════════════════════════════════════

function closeAllModals() {
  ;['contactModal', 'dealModal', 'campaignModal', 'documentModal', 'todayDoneModal', 'visitModal', 'projectModal', 'profileModal', 'taskDetailModal'].forEach(id => {
    const modal = document.getElementById(id)
    if (modal) modal.style.display = 'none'
  })
  const backdrop = document.getElementById('modalBackdrop')
  if (backdrop) backdrop.style.display = 'none'
}

function openTaskDetailModal(taskId) {
  const task = DataStore.getById('tasks', taskId)
  if (!task) {
    showToast('Task details could not be found.', 'error')
    return
  }

  const assigneeName = task.assignedTo || task.assigned_to || task.assignee || 'Unassigned'
  const assignerName = task.assignedBy || task.assigned_by || task.assigner || 'Unknown'
  const dueDateText = formatDate(task.dueDate || task.due_date || '')
  const assignedDateText = formatDateTime(task.assignedAt || task.assigned_at || task.created_at || task.createdAt || '')
  const completedText = task.completed ? 'Completed' : 'Pending'
  const priorityText = task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : 'Medium'
  const statusText = task.status ? String(task.status).charAt(0).toUpperCase() + String(task.status).slice(1) : completedText
  const descriptionText = task.description || task.notes || task.details || task.summary || 'No additional description provided.'
  const relatedToText = task.relatedTo || task.related_to || task.related || '—'
  const taskTypeText = task.type || task.task_type || 'Task'
  const createdAtText = formatDateTime(task.createdAt || task.created_at || task.assignedAt || task.assigned_at || '')
  const completedAtText = task.completedAt || task.completed_at || task.updatedAt || task.updated_at || ''
  const updatedAtText = task.updatedAt || task.updated_at || ''

  const modal = document.getElementById('taskDetailModal')
  if (!modal) return

  const titleEl = modal.querySelector('.modal-title')
  if (titleEl) titleEl.textContent = task.title || 'Task Details'
  const bodyEl = modal.querySelector('.modal-body')
  if (bodyEl) bodyEl.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:14px;line-height:1.65;color:var(--gray-800);">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div><strong>Assigned To:</strong> ${assigneeName}</div>
        <div><strong>Assigned By:</strong> ${assignerName}</div>
        <div><strong>Task Type:</strong> ${taskTypeText}</div>
        <div><strong>Status:</strong> ${statusText}</div>
        <div><strong>Priority:</strong> ${priorityText}</div>
        <div><strong>Due Date:</strong> ${formatDate(dueDateText)}</div>
        <div><strong>Assigned Date:</strong> ${formatDateTime(assignedDateText)}</div>
        <div><strong>Completed At:</strong> ${completedAtText === '—' ? '—' : formatDateTime(completedAtText)}</div>
      </div>
      <div><strong>Related To:</strong> ${relatedToText}</div>
      <div><strong>Description:</strong></div>
      <div style="padding:14px;background:var(--gray-50);border-radius:14px;color:var(--gray-800);white-space:pre-wrap;">${descriptionText}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:14px;background:rgba(248,250,252,0.8);border-radius:14px;">
        <div><strong>Task ID:</strong> ${task.id || task.task_id || '—'}</div>
        <div><strong>Last Updated:</strong> ${updatedAtText === '—' ? '—' : formatDateTime(updatedAtText)}</div>
      </div>
    </div>
  `

  modal.style.display = 'flex'
  const backdrop = document.getElementById('modalBackdrop')
  if (backdrop) backdrop.style.display = 'block'
}

function closeTaskDetailModal() {
  const modal = document.getElementById('taskDetailModal')
  if (modal) modal.style.display = 'none'
  const backdrop = document.getElementById('modalBackdrop')
  if (backdrop) backdrop.style.display = 'none'
}

function parseLeadIdentifier(lead) {
  return String(lead?.id || lead?.ID || lead?.leadId || lead?.LeadID || lead?.lead_id || lead?.leadID || lead?.uid || lead?.UID || lead?.uniqueId || lead?.UNIQUEID || lead?.IDENTIFIER || lead?.customerId || lead?.customer_id || '').trim()
}

function findLeadById(leadId) {
  const targetId = String(leadId || '').trim()
  if (!targetId) return null

  const localLead = myLeadsJ().find(l => parseLeadIdentifier(l) === targetId)
  if (localLead) return localLead

  const searchImported = storageKey => {
    try {
      const importedLeads = JSON.parse((storageKey === 'session' ? sessionStorage : localStorage).getItem('crm_leads_journey') || '[]') || []
      return importedLeads.map(parseLeadData).find(l => parseLeadIdentifier(l) === targetId) || null
    } catch (e) {
      return null
    }
  }

  return searchImported('session') || searchImported('local')
}

function openProfile(type, profileId) {
  let profile
  if (type === 'contact') {
    const contacts = DataStore.get('contacts') || []
    profile = contacts.find(c => String(c.id) === String(profileId))
  } else if (type === 'lead') {
    profile = findLeadById(profileId)
  }

  if (!profile) {
    showToast('Profile not found', 'error')
    return
  }

  // Store profile data and navigate to full profile page
  sessionStorage.setItem('selectedProfile', JSON.stringify(profile))
  sessionStorage.setItem('profileType', type)
  window.location.href = 'customer-profile-new.html?id=' + profileId + '&type=' + type
}

function renderProfileModal(type, profile) {
  const titleEl = document.getElementById('profileModalTitle')
  const bodyEl = document.getElementById('profileModalContent')
  if (!bodyEl || !titleEl) return

  const formatRow = (label, value) => `
    <div style="display:grid;grid-template-columns:160px 1fr;gap:12px;align-items:flex-start;margin-bottom:10px;">
      <div style="font-weight:600;color:var(--gray-700);font-size:13px;">${label}</div>
      <div style="color:var(--gray-900);font-size:13px;">${value || '—'}</div>
    </div>`

  const formatSection = (title) => `
    <h4 style="margin:0 0 12px 0;font-size:14px;font-weight:600;color:var(--gray-800);border-bottom:1px solid var(--gray-200);padding-bottom:8px;">${title}</h4>
  `

  let name = ''
  if (type === 'contact') {
    name = profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Contact Profile'
  } else {
    name = profile.companyName || profile.company || profile.leadName || 'Lead Profile'
  }
  titleEl.textContent = name

  // Use lead_details if available (from customer profile with lead details)
  const lead = profile.lead_details || profile

  // Tab content for each section
  const basicInfoTab = `
    <div style="display:grid;gap:14px;">
      ${formatSection('Basic Information')}
      ${formatRow('Lead Name', lead.lead_name || lead.leadName || lead.contactPerson || '—')}
      ${formatRow('Company Name', lead.company_name || lead.companyName || '—')}
      ${formatRow('Designation', lead.designation || lead.title || '—')}
      ${formatRow('Location', lead.location || '—')}
      ${formatRow('City', lead.city || '—')}
      ${formatRow('State', lead.state || '—')}
      ${formatRow('Mobile', lead.mobile || lead.contactNumber || lead.phone || '—')}
      ${formatRow('Alternate Mobile', lead.alternate_mobile || '—')}
      ${formatRow('Email', lead.email || lead.emailId || '—')}
      ${formatRow('Company Email', lead.company_email || '—')}
      ${formatRow('Sales Executive', lead.sales_executive || '—')}
      ${formatRow('Date of Entry', lead.date_of_entry || lead.dateOfEntry || '—')}
      ${formatRow('Lead Source', lead.lead_source || lead.leadSource || '—')}
    </div>`

  const companyDetailsTab = `
    <div style="display:grid;gap:14px;">
      ${formatSection('Company Registration Details')}
      ${formatRow('GST Number', lead.gst_number || lead.gst || '—')}
      ${formatRow('PAN Number', lead.pan_number || lead.pan || '—')}
      ${formatRow('Entity Type', lead.entity_type || lead.entityType || '—')}
      ${formatRow('Annual Turnover', lead.annual_turnover || lead.annualTurnover ? (lead.annual_turnover || lead.annualTurnover).toString().startsWith('₹') ? (lead.annual_turnover || lead.annualTurnover) : '₹' + (lead.annual_turnover || lead.annualTurnover) : '—')}
      ${formatRow('Business Vintage', lead.business_vintage || lead.businessVintage || '—')}
      ${formatRow('Number of Employees', lead.number_of_employees || lead.employees || lead.numberOfEmployees || '—')}
      ${formatRow('Year of Incorporation', lead.year_of_incorporation || lead.yearOfIncorporation || '—')}
      ${formatRow('Registered Office Address', lead.registered_office_address || lead.registeredOfficeAddress || lead.address || '—')}
      ${formatRow('Business Description', lead.business_description || lead.businessDescription || '—')}
    </div>`

  const creditProfileTab = `
    <div style="display:grid;gap:14px;">
      ${formatSection('Industry & Credit Profile')}
      ${formatRow('Industry', lead.industry || '—')}
      ${formatRow('Credit Rating', lead.credit_rating || lead.creditRating || '—')}
      ${formatRow('Rating Date', lead.rating_date || lead.ratingDate || '—')}
      ${formatRow('Rating Agency', lead.rating_agency || lead.ratingAgency || '—')}
      ${formatRow('Promoter CIBIL Score', lead.promoter_cibil_score || '—')}
      ${formatRow('NPA History', lead.npa_history || '—')}
      ${formatRow('Guarantee Available', lead.guarantee_available || '—')}
      ${formatRow('Current Ratio', lead.current_ratio || '—')}
      ${formatRow('Interest Coverage Ratio', lead.interest_coverage_ratio || '—')}
      ${formatRow('DSCR', lead.dscr || '—')}
      ${formatRow('Lender Related Detail', lead.lender_related_detail || lead.lenderRelatedDetail || '—')}
    </div>`

  const productFundingTab = `
    <div style="display:grid;gap:14px;">
      ${formatSection('Product & Funding')}
      ${formatRow('Product Type', lead.product_type || lead.productType || '—')}
      ${formatRow('Funding Amount', lead.funding_amount ? (lead.funding_amount.toString().startsWith('₹') ? lead.funding_amount : '₹' + lead.funding_amount) : '—')}
      ${formatRow('Deal Value', lead.deal_value || lead.dealValue ? (lead.deal_value || lead.dealValue).toString().startsWith('₹') ? (lead.deal_value || lead.dealValue) : '₹' + (lead.deal_value || lead.dealValue) : '—')}
    </div>`

  const callDetailsTab = `
    <div style="display:grid;gap:14px;">
      ${formatSection('Call Details')}
      ${formatRow('Date of First Call', lead.date_of_first_call || lead.dateOfFirstCall || lead.firstCallDate || '—')}
      ${formatRow('Purpose of Call', lead.purpose_of_call || lead.purposeOfCall || '—')}
      ${formatRow('Product/Service Discussed', lead.product_service_discussed || lead.productDiscussed || lead.productDiscussed || '—')}
      ${formatRow('Call Outcome', lead.call_outcome || lead.callOutcome || lead.outcome || '—')}
    </div>`

  const statusTab = `
    <div style="display:grid;gap:14px;">
      ${formatSection('Status & Lead Management')}
      ${formatRow('Lead Status', lead.lead_status || lead.leadStatus || lead.status || '—')}
      ${formatRow('Current Status', lead.current_status || lead.currentStatus || '—')}
      ${formatRow('Final Outcome', lead.final_outcome || lead.finalOutcome || '—')}
      ${formatRow('Lead Stage', lead.lead_stage || lead.leadStage || '—')}
      ${formatRow('Pipeline Stage', lead.pipeline_stage || lead.pipelineStage || '—')}
      ${formatRow('Last Activity Date', lead.last_activity_date || lead.lastActivityDate || '—')}
      ${formatRow('Proposal Shared', lead.proposal_shared || lead.proposalShared || '—')}
    </div>`

  const followupTab = `
    <div style="display:grid;gap:14px;">
      ${formatSection('Follow-up Details')}
      ${formatRow('Next Follow-up Date', lead.next_followup_date || lead.nextFollowupDate || lead.followup_date || lead.followupDate || '—')}
      ${formatRow('Follow-up Time', lead.followup_time || '—')}
      ${formatRow('Follow-up Type', lead.followup_type || '—')}
      ${formatRow('Follow-up Note', lead.followup_note || '—')}
    </div>`

  const notesTab = `
    <div style="display:grid;gap:14px;">
      ${formatSection('Notes & Learning')}
      ${formatRow('Remarks', lead.remarks || '—')}
      ${formatRow('Learning Challenge', lead.learning_challenge || lead.learningChallenge || lead.notes || '—')}
    </div>`

  // Tabs HTML
  const tabsHTML = `
    <div style="display:flex;gap:4px;border-bottom:1px solid var(--gray-200);margin-bottom:16px;overflow-x:auto;">
      <button class="profile-tab-btn" data-tab="basic" onclick="switchProfileTab('basic')" style="padding:10px 16px;font-size:12px;font-weight:500;color:var(--gray-500);border:none;background:none;border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap;transition:all 0.2s;flex-shrink:0;">Basic Info</button>
      <button class="profile-tab-btn" data-tab="company" onclick="switchProfileTab('company')" style="padding:10px 16px;font-size:12px;font-weight:500;color:var(--gray-500);border:none;background:none;border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap;transition:all 0.2s;flex-shrink:0;">Company Details</button>
      <button class="profile-tab-btn" data-tab="credit" onclick="switchProfileTab('credit')" style="padding:10px 16px;font-size:12px;font-weight:500;color:var(--gray-500);border:none;background:none;border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap;transition:all 0.2s;flex-shrink:0;">Credit Profile</button>
      <button class="profile-tab-btn" data-tab="funding" onclick="switchProfileTab('funding')" style="padding:10px 16px;font-size:12px;font-weight:500;color:var(--gray-500);border:none;background:none;border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap;transition:all 0.2s;flex-shrink:0;">Product & Funding</button>
      <button class="profile-tab-btn" data-tab="call" onclick="switchProfileTab('call')" style="padding:10px 16px;font-size:12px;font-weight:500;color:var(--gray-500);border:none;background:none;border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap;transition:all 0.2s;flex-shrink:0;">Call Details</button>
      <button class="profile-tab-btn" data-tab="status" onclick="switchProfileTab('status')" style="padding:10px 16px;font-size:12px;font-weight:500;color:var(--gray-500);border:none;background:none;border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap;transition:all 0.2s;flex-shrink:0;">Status</button>
      <button class="profile-tab-btn" data-tab="followup" onclick="switchProfileTab('followup')" style="padding:10px 16px;font-size:12px;font-weight:500;color:var(--gray-500);border:none;background:none;border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap;transition:all 0.2s;flex-shrink:0;">Follow-up</button>
      <button class="profile-tab-btn" data-tab="notes" onclick="switchProfileTab('notes')" style="padding:10px 16px;font-size:12px;font-weight:500;color:var(--gray-500);border:none;background:none;border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap;transition:all 0.2s;flex-shrink:0;">Notes</button>
    </div>

    <div id="profileTabBasic" class="profile-tab-content" style="display:block;">${basicInfoTab}</div>
    <div id="profileTabCompany" class="profile-tab-content" style="display:none;">${companyDetailsTab}</div>
    <div id="profileTabCredit" class="profile-tab-content" style="display:none;">${creditProfileTab}</div>
    <div id="profileTabFunding" class="profile-tab-content" style="display:none;">${productFundingTab}</div>
    <div id="profileTabCall" class="profile-tab-content" style="display:none;">${callDetailsTab}</div>
    <div id="profileTabStatus" class="profile-tab-content" style="display:none;">${statusTab}</div>
    <div id="profileTabFollowup" class="profile-tab-content" style="display:none;">${followupTab}</div>
    <div id="profileTabNotes" class="profile-tab-content" style="display:none;">${notesTab}</div>
  `

  bodyEl.innerHTML = tabsHTML

  // Set active tab styling
  const firstBtn = bodyEl.querySelector('[data-tab="basic"]')
  if (firstBtn) {
    firstBtn.style.color = 'var(--primary)'
    firstBtn.style.borderBottomColor = 'var(--primary)'
  }
}

function switchProfileTab(tabName) {
  // Hide all tab contents
  document.querySelectorAll('.profile-tab-content').forEach(el => {
    el.style.display = 'none'
  })

  // Remove active styling from all buttons
  document.querySelectorAll('.profile-tab-btn').forEach(btn => {
    btn.style.color = 'var(--gray-500)'
    btn.style.borderBottomColor = 'transparent'
  })

  // Show selected tab content
  const selectedContent = document.getElementById('profileTab' + tabName.charAt(0).toUpperCase() + tabName.slice(1))
  if (selectedContent) {
    selectedContent.style.display = 'block'
  }

  // Highlight active button
  const activeBtn = document.querySelector(`[data-tab="${tabName}"]`)
  if (activeBtn) {
    activeBtn.style.color = 'var(--primary)'
    activeBtn.style.borderBottomColor = 'var(--primary)'
  }
}

function closeProfileModal() {
  const modal = document.getElementById('profileModal')
  const backdrop = document.getElementById('modalBackdrop')
  if (modal) modal.style.display = 'none'
  if (backdrop) backdrop.style.display = 'none'
}

// ═══════════════════════════════════════════════════════════════
// CONTACT MODAL FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function openContactModal() {
  console.log('openContactModal called')
  const modal = document.getElementById('contactModal')
  const backdrop = document.getElementById('modalBackdrop')
  console.log('modal found:', modal)
  if (modal) {
    modal.style.display = 'flex'
    if (backdrop) backdrop.style.display = 'block'
    console.log('modal opened')
  }
}

function closeContactModal() {
  const modal = document.getElementById('contactModal')
  const backdrop = document.getElementById('modalBackdrop')
  if (modal) modal.style.display = 'none'
  if (backdrop) backdrop.style.display = 'none'
  clearContactForm()
}

function clearContactForm() {
  ;['contactFirstName', 'contactLastName', 'contactEmail', 'contactPhone', 'contactCompany', 'contactTitle', 'contactAddress', 'contactNotes'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.value = ''
  })
  ;['contactType', 'contactSource'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.selectedIndex = 0
  })
}

function submitContact() {
  const firstName = document.getElementById('contactFirstName')?.value?.trim()
  const lastName = document.getElementById('contactLastName')?.value?.trim()
  const email = document.getElementById('contactEmail')?.value?.trim()

  if (!firstName || !lastName) { showToast('Please enter first and last name', 'error'); return }
  if (!email) { showToast('Please enter email address', 'error'); return }

  const contact = {
    id: 'CONTACT-' + Date.now(),
    firstName,
    lastName,
    name: `${firstName} ${lastName}`,
    email,
    phone: document.getElementById('contactPhone')?.value?.trim() || '',
    company: document.getElementById('contactCompany')?.value?.trim() || '',
    title: document.getElementById('contactTitle')?.value?.trim() || '',
    type: document.getElementById('contactType')?.value || 'prospect',
    source: document.getElementById('contactSource')?.value || 'other',
    address: document.getElementById('contactAddress')?.value?.trim() || '',
    notes: document.getElementById('contactNotes')?.value?.trim() || '',
    createdAt: new Date().toISOString()
  }

  DataStore.add('contacts', contact)
  closeContactModal()
  renderContacts()
  showToast('Contact created successfully', 'success')
}

// ═══════════════════════════════════════════════════════════════
// DEAL MODAL FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function openDealModal(leadId) {
  const modal = document.getElementById('dealModal')
  const backdrop = document.getElementById('modalBackdrop')
  const modalTitle = document.getElementById('dealModalTitle')
  const editingId = window.__editingDealId || null
  if (modal) {
    modal.style.display = 'flex'
    modal.style.zIndex = '1301'
    modal.setAttribute('aria-hidden', 'false')
    if (modalTitle) {
      modalTitle.textContent = editingId ? 'Edit Deal' : 'Create Deal'
    }
    if (backdrop) backdrop.style.display = 'block'
    clearDealForm()

    if (window.FSRevenue && typeof window.FSRevenue.fetchLiveRate === 'function') {
      window.FSRevenue.fetchLiveRate().then(function (rate) {
        const rateInput = document.getElementById('dmInpRate')
        if (rateInput) {
          rateInput.value = Number(rate).toFixed(4)
        }
      }).catch(function (err) {
        console.warn('[Deal] Live USD-INR rate fetch failed:', err)
      })
    }

    if (editingId) {
      const deal = DataStore.getById('deals', editingId) || (window.__dealDetailMap || {})[editingId]
      if (deal) {
        if (document.getElementById('dealName')) document.getElementById('dealName').value = deal.name || deal.deal_name || ''
        if (document.getElementById('dealCompany')) document.getElementById('dealCompany').value = deal.company || deal.company_name || ''
        if (document.getElementById('dealContact')) document.getElementById('dealContact').value = deal.contact || ''
        if (document.getElementById('dealValue')) document.getElementById('dealValue').value = deal.value || deal.deal_value || deal.loan_amount || ''
        if (document.getElementById('dealStage')) document.getElementById('dealStage').value = deal.stage || deal.status || 'prospecting'
        if (document.getElementById('dealCloseDate')) document.getElementById('dealCloseDate').value = deal.closeDate || deal.close_date || deal.disbursement_date || ''
        if (document.getElementById('dealProbability')) document.getElementById('dealProbability').value = String(deal.probability || Math.round((deal.stage_probability || 0) * 100) || getStageProbability(document.getElementById('dealStage')?.value || 'prospecting'))
        if (document.getElementById('dealSource')) document.getElementById('dealSource').value = deal.source || ''
        if (document.getElementById('dealDescription')) document.getElementById('dealDescription').value = deal.description || deal.notes || ''
        if (document.getElementById('dealPfPercentage')) document.getElementById('dealPfPercentage').value = deal.pf_percentage || ''
        if (document.getElementById('dealRevenueSharePercentage')) document.getElementById('dealRevenueSharePercentage').value = deal.revenue_share_percentage || ''
        if (document.getElementById('dealDirectRevenue')) document.getElementById('dealDirectRevenue').value = deal.direct_revenue || ''
        if (document.getElementById('dealPlatformCharges')) document.getElementById('dealPlatformCharges').value = deal.platform_charges || ''
        if (document.getElementById('dealTrancheCharges')) document.getElementById('dealTrancheCharges').value = deal.tranche_charges || ''
        if (document.getElementById('dealAdvisoryFees')) document.getElementById('dealAdvisoryFees').value = deal.advisory_fees || ''
        if (document.getElementById('dealRenewalCharges')) document.getElementById('dealRenewalCharges').value = deal.renewal_charges || ''
        if (document.getElementById('dealOtherCharges')) document.getElementById('dealOtherCharges').value = deal.other_charges || ''
        if (document.getElementById('dealServiceFee')) document.getElementById('dealServiceFee').value = deal.mandate_service_fee_input || deal.service_fee_input || ''
        if (document.getElementById('dealPlatformFee')) document.getElementById('dealPlatformFee').value = deal.platform_fee_percentage || ''
        if (document.getElementById('dealAdvisoryFee')) document.getElementById('dealAdvisoryFee').value = deal.advisory_fee_percentage || ''
        if (document.getElementById('dealSuccessFee')) document.getElementById('dealSuccessFee').value = deal.success_fee_percentage || ''
        if (document.getElementById('dealLegalValFee')) document.getElementById('dealLegalValFee').value = deal.legal_val_fee_percentage || ''
        if (document.getElementById('dealLeadId')) document.getElementById('dealLeadId').value = deal.leadId || deal.lead_id || deal.id || ''
        if (deal.leadId || deal.lead_id) {
          loadDealLeadSummary(deal.leadId || deal.lead_id)
        }
      }
    }

    if (!editingId && leadId !== undefined && leadId !== null && leadId !== '') {
      const dealLeadIdInput = document.getElementById('dealLeadId')
      if (dealLeadIdInput) {
        dealLeadIdInput.value = String(leadId)
        if (typeof fetchAndPopulateDealSummary === 'function') {
          fetchAndPopulateDealSummary().catch(() => {})
        }
      }
    }

    if (typeof resetDealStepState === 'function') {
      resetDealStepState();
    }
    if (typeof renderDealStepUI === 'function') {
      renderDealStepUI();
    }

    const dealStageField = document.getElementById('dealStage')
    const dealProbabilityField = document.getElementById('dealProbability')
    if (dealStageField) {
      dealStageField.onchange = () => {
        syncDealProbabilityFromStage(dealStageField.value)
      }
    }

    const dealLeadIdInput = document.getElementById('dealLeadId')
    const selectedLeadId = dealLeadIdInput?.value || window.lastCreatedLeadId || ''
    if (selectedLeadId) {
      loadDealLeadSummary(selectedLeadId)
      updateDealForecastPreview()
    }

    const forecastInputs = ['dealValue', 'dealProbability', 'dealPfPercentage', 'dealRevenueSharePercentage', 'dealDirectRevenue', 'dealPlatformCharges', 'dealTrancheCharges', 'dealAdvisoryFees', 'dealRenewalCharges', 'dealOtherCharges', 'dealServiceFee', 'dealPlatformFee', 'dealAdvisoryFee', 'dealSuccessFee', 'dealLegalValFee']
    forecastInputs.forEach(id => {
      const el = document.getElementById(id)
      if (el) {
        el.oninput = updateDealForecastPreview
      }
    })

    if (dealProbabilityField) {
      dealProbabilityField.value = String(getStageProbability(dealStageField?.value || 'prospecting'))
    }

    setTimeout(() => {
      const firstField = document.getElementById('dealName')
      if (firstField) {
        firstField.focus()
        firstField.select?.()
      }
    }, 40)
  }
}

function closeDealModal() {
  const modal = document.getElementById('dealModal')
  const backdrop = document.getElementById('modalBackdrop')
  if (modal) {
    modal.style.display = 'none'
    modal.setAttribute('aria-hidden', 'true')
  }
  if (backdrop) backdrop.style.display = 'none'
  if (typeof window.dealCloseCalculator === 'function') {
    window.dealCloseCalculator()
  }
  if (typeof resetDealStepState === 'function') {
    resetDealStepState()
  }
  clearDealForm()
  window.__editingDealId = null
  window.currentDealStep = 1
}

function clearDealForm() {
  ;['dealName', 'dealCompany', 'dealContact', 'dealValue', 'dealCloseDate', 'dealProbability', 'dealDescription', 'dealPfPercentage', 'dealRevenueSharePercentage', 'dealDirectRevenue', 'dealPlatformCharges', 'dealTrancheCharges', 'dealAdvisoryFees', 'dealRenewalCharges', 'dealOtherCharges', 'dealServiceFee', 'dealPlatformFee', 'dealAdvisoryFee', 'dealSuccessFee', 'dealLegalValFee'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.value = ''
  })
  ;['dealStage', 'dealSource'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.selectedIndex = 0
  })
  const previewIds = ['dealPfRevenuePreview', 'dealRevenueSharingPreview', 'dealExpectedRevenuePreview', 'dealWeightedRevenuePreview']
  const previewValues = ['dealMandateFeeTotal', 'dealFeeSummary']
  previewIds.forEach(id => {
    const el = document.getElementById(id)
    if (el) el.textContent = '₹0'
  })
  previewValues.forEach(id => {
    const el = document.getElementById(id)
    if (el) el.value = id === 'dealFeeSummary' ? '' : '₹0'
  })
  const leadSummaryIds = ['dealLeadCompany', 'dealLeadContactPerson', 'dealLeadContactNumber', 'dealLeadLocation', 'dealLeadTurnover', 'dealLeadVintage', 'dealLeadAmount', 'dealLeadVertical']
  leadSummaryIds.forEach(id => {
    const el = document.getElementById(id)
    if (el) el.textContent = '—'
  })
  const dealLeadIdInput = document.getElementById('dealLeadId')
  if (dealLeadIdInput) dealLeadIdInput.value = ''
}

function showDealStep(step = 1) {
  const stepCards = Array.from(document.querySelectorAll('.deal-step-card'))
  const stepItems = Array.from(document.querySelectorAll('.deal-stepper .deal-step-item'))
  const stepNumber = Number(step) || 1

  stepCards.forEach(card => {
    if (Number(card.dataset.step) === stepNumber) {
      card.classList.add('active')
    } else {
      card.classList.remove('active')
    }
  })

  stepItems.forEach(item => {
    const itemStep = Number(item.dataset.step)
    item.classList.remove('active', 'done')
    if (itemStep === stepNumber) {
      item.classList.add('active')
    } else if (itemStep < stepNumber) {
      item.classList.add('done')
    }
  })

  window.currentDealStep = stepNumber
}

function validateDealStep(step = 1) {
  const currentStep = Number(step) || 1
  if (currentStep === 1) {
    const leadId = document.getElementById('dealLeadId')?.value?.trim()
    const dealName = document.getElementById('dealName')?.value?.trim()
    if (!leadId && !dealName) {
      showToast('Select a lead or enter a deal name before continuing.', 'error')
      return false
    }
  }
  if (currentStep === 2) {
    const serviceFee = document.getElementById('dealServiceFee')?.value?.trim()
    if (!serviceFee) {
      showToast('Enter the service fee before continuing.', 'error')
      return false
    }
  }
  if (currentStep === 3) {
    const lender = document.getElementById('dealLenderSelect')?.value
    if (!lender) {
      showToast('Select an assigned lender before continuing.', 'error')
      return false
    }
  }
  if (currentStep === 5) {
    const approvedLimit = document.getElementById('dealLenderApprovedLimit')?.value
    if (!approvedLimit) {
      showToast('Enter the lender approved limit before continuing.', 'error')
      return false
    }
  }
  if (currentStep === 6) {
    const pdStatus = document.getElementById('dealPdStatus')?.value
    if (!pdStatus) {
      showToast('Select PD status before continuing.', 'error')
      return false
    }
  }
  if (currentStep === 7) {
    const sanctionStatus = document.getElementById('dealSanctionStatus')?.value
    if (!sanctionStatus) {
      showToast('Select sanction status before continuing.', 'error')
      return false
    }
  }
  if (currentStep === 8) {
    const disbursementStatus = document.getElementById('dealDisbursementStatus')?.value
    if (!disbursementStatus) {
      showToast('Select disbursement status before continuing.', 'error')
      return false
    }
  }
  return true
}

function getStageProbability(stage) {
  const normalized = String(stage || '').trim().toLowerCase().replace(/\s+/g, '-')
  const stageProbabilityMap = {
    'login-with-lender': 15,
    'login-docs-submitted': 30,
    'approved-limit': 50,
    'sanction-docs': 70,
    'pre-disbursement': 80,
    'disbursement': 90,
    'payout-received': 95,
    'closed-won': 100,
    'closed-lost': 0
  }
  return stageProbabilityMap[normalized] ?? 20
}

function syncDealProbabilityFromStage(stageValue = '') {
  const probabilityInput = document.getElementById('dealProbability')
  if (!probabilityInput) return

  probabilityInput.value = String(getStageProbability(stageValue))
  updateDealForecastPreview()
}

function parsePercentageOrAmount(input, loanAmount = 0, treatPlainAsPercent = false) {
  if (!input && input !== 0) return 0
  const raw = String(input).trim()
  if (!raw) return 0
  const percentMatch = raw.match(/^([0-9]+(?:\.[0-9]+)?)\s*%$/)
  if (percentMatch) {
    return Number(percentMatch[1]) / 100 * loanAmount
  }
  const amountMatch = raw.replace(/[₹,\s]/g, '')
  const amount = Number(amountMatch)
  if (Number.isNaN(amount)) return 0
  return treatPlainAsPercent ? amount / 100 * loanAmount : amount
}

function getDealRevenueFormValues() {
  const stage = document.getElementById('dealStage')?.value || 'prospecting'
  const probability = Number(document.getElementById('dealProbability')?.value || getStageProbability(stage))
  const loanAmount = Number(document.getElementById('dealValue')?.value || 0)

  return {
    loan_amount: loanAmount,
    pf_percentage: Number(document.getElementById('dealPfPercentage')?.value || 0),
    revenue_share_percentage: Number(document.getElementById('dealRevenueSharePercentage')?.value || 0),
    direct_revenue: Number(document.getElementById('dealDirectRevenue')?.value || 0),
    platform_charges: Number(document.getElementById('dealPlatformCharges')?.value || 0),
    tranche_charges: Number(document.getElementById('dealTrancheCharges')?.value || 0),
    advisory_fees: Number(document.getElementById('dealAdvisoryFees')?.value || 0),
    renewal_charges: Number(document.getElementById('dealRenewalCharges')?.value || 0),
    other_charges: Number(document.getElementById('dealOtherCharges')?.value || 0),
    mandate_service_fee: parsePercentageOrAmount(document.getElementById('dealServiceFee')?.value || '', loanAmount, false),
    mandate_platform_fee: parsePercentageOrAmount(document.getElementById('dealPlatformFee')?.value || '', loanAmount, true),
    mandate_advisory_fee: parsePercentageOrAmount(document.getElementById('dealAdvisoryFee')?.value || '', loanAmount, true),
    mandate_success_fee: parsePercentageOrAmount(document.getElementById('dealSuccessFee')?.value || '', loanAmount, true),
    mandate_legal_val_fee: parsePercentageOrAmount(document.getElementById('dealLegalValFee')?.value || '', loanAmount, true),
    stage_probability: Math.max(0, Math.min(1, probability / 100))
  }
}

function getMandateFeeSummary(values) {
  const items = [
    { label: 'Service Fee', value: values.mandate_service_fee },
    { label: 'Platform Fee', value: values.mandate_platform_fee },
    { label: 'Advisory Fee', value: values.mandate_advisory_fee },
    { label: 'Success Fee', value: values.mandate_success_fee },
    { label: 'Legal & Valuation Fee', value: values.mandate_legal_val_fee }
  ]

  const total = items.reduce((sum, item) => sum + (item.value || 0), 0)
  const lines = items.map(item => `${item.label}: ₹${Number(item.value || 0).toLocaleString('en-IN')}`)
  return { total, summaryText: lines.join('\n') }
}

function updateDealForecastPreview() {
  const values = getDealRevenueFormValues()
  const summary = calculateCommercialRevenueSummary(values)
  const mandateSummary = getMandateFeeSummary(values)

  const previewMap = {
    dealPfRevenuePreview: summary.pfRevenue,
    dealRevenueSharingPreview: summary.revenueSharing,
    dealExpectedRevenuePreview: summary.expectedRevenue,
    dealWeightedRevenuePreview: summary.weightedRevenue
  }

  Object.entries(previewMap).forEach(([id, value]) => {
    const el = document.getElementById(id)
    if (el) el.textContent = '₹' + Number(value || 0).toLocaleString('en-IN')
  })

  const mandateTotalEl = document.getElementById('dealMandateFeeTotal')
  const mandateSummaryEl = document.getElementById('dealFeeSummary')
  if (mandateTotalEl) mandateTotalEl.value = '₹' + Number(mandateSummary.total || 0).toLocaleString('en-IN')
  if (mandateSummaryEl) mandateSummaryEl.value = mandateSummary.summaryText
}

function loadDealLeadSummary(leadId) {
  if (!leadId) return
  const normalizedId = String(leadId).trim()
  let lead = null

  if (typeof getLeadsJourney === 'function') {
    lead = getLeadsJourney().find(item => String(item.id) === normalizedId || String(item.leadId) === normalizedId || String(item.lead_id) === normalizedId)
  }
  if (!lead && typeof DataStore !== 'undefined') {
    lead = DataStore.getById('leads', normalizedId) || DataStore.get('leads').find(item => String(item.id) === normalizedId || String(item.leadId) === normalizedId || String(item.lead_id) === normalizedId)
  }

  const setText = (id, value) => {
    const el = document.getElementById(id)
    if (el) el.textContent = value || '—'
  }

  const company = lead?.company || lead?.companyName || lead?.company_name || ''
  const contactPerson = lead?.contactPerson || lead?.name || lead?.contact_person || lead?.lead_name || ''
  const contactNumber = lead?.mobile || lead?.phone || lead?.contactNumber || lead?.contact_number || ''
  const location = lead?.city || lead?.location || lead?.area || lead?.state || ''
  const turnover = lead?.turnover || lead?.annualTurnover || lead?.annual_turnover || lead?.deal_value || lead?.funding_amount || ''
  const vintage = lead?.vintage || lead?.experience || lead?.yearsInBusiness || ''
  const amount = lead?.deal_value || lead?.dealValue || lead?.funding_amount || lead?.loanAmount || lead?.value || ''
  const vertical = lead?.vertical || lead?.businessVertical || lead?.business_vertical || lead?.industry || ''

  setText('dealLeadCompany', company)
  setText('dealLeadContactPerson', contactPerson)
  setText('dealLeadContactNumber', contactNumber)
  setText('dealLeadLocation', location)
  setText('dealLeadTurnover', turnover)
  setText('dealLeadVintage', vintage)
  setText('dealLeadAmount', amount)
  setText('dealLeadVertical', vertical)

  const leadInput = document.getElementById('dealLeadId')
  if (leadInput) leadInput.value = normalizedId

  const setIfBlank = (id, value) => {
    const el = document.getElementById(id)
    if (el && !String(el.value || '').trim() && value) el.value = value
  }

  if (lead) {
    setIfBlank('dealName', contactPerson || company)
    setIfBlank('dealCompany', company)
    setIfBlank('dealContact', contactNumber)
    setIfBlank('dealValue', amount)
    setIfBlank('dealDescription', lead?.description || lead?.notes || '')
    setIfBlank('dealSource', lead?.source || lead?.leadSource || lead?.lead_source || '')
    setIfBlank('dealStage', lead?.pipeline_stage || lead?.status || lead?.lead_status || '')
    if (lead?.pipeline_stage || lead?.status || lead?.lead_status) {
      syncDealProbabilityFromStage(document.getElementById('dealStage')?.value || '')
    }
  }
}

async function saveDealCommercialRevenue(leadId, payload) {
  const apiBase = (typeof window.getCRMApiBase === 'function' ? window.getCRMApiBase() : null)
    || window.API_BASE
    || window.location.origin

  const authToken = window.API?.authToken || (() => {
    try {
      const session = JSON.parse(localStorage.getItem('crm_session') || 'null')
      return session?.access_token || session?.token || null
    } catch (e) {
      return null
    }
  })()

  const response = await fetch(`${apiBase}/api/forecast/deal/${encodeURIComponent(leadId)}/commercial-revenue`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `Forecast save failed with ${response.status}`)
  }

  return response.json()
}

function submitDeal() {
  const name = document.getElementById('dealName')?.value?.trim()
  const company = document.getElementById('dealCompany')?.value?.trim()
  const value = document.getElementById('dealValue')?.value

  if (!name) { showToast('Please enter deal name', 'error'); return }
  if (!company) { showToast('Please enter company name', 'error'); return }
  if (!value) { showToast('Please enter deal value', 'error'); return }

  const forecastInputs = getDealRevenueFormValues()
  const mandateSummary = getMandateFeeSummary(forecastInputs)
  const payload = {
    name,
    company,
    contact: document.getElementById('dealContact')?.value?.trim() || '',
    value: parseFloat(value) || 0,
    stage: document.getElementById('dealStage')?.value || 'prospecting',
    closeDate: document.getElementById('dealCloseDate')?.value || '',
    probability: parseInt(document.getElementById('dealProbability')?.value) || 20,
    source: document.getElementById('dealSource')?.value || 'other',
    description: document.getElementById('dealDescription')?.value?.trim() || '',
    assignedTo: S?.email || '',
    pf_percentage: forecastInputs.pf_percentage,
    revenue_share_percentage: forecastInputs.revenue_share_percentage,
    direct_revenue: forecastInputs.direct_revenue,
    platform_charges: forecastInputs.platform_charges,
    tranche_charges: forecastInputs.tranche_charges,
    advisory_fees: forecastInputs.advisory_fees,
    renewal_charges: forecastInputs.renewal_charges,
    other_charges: forecastInputs.other_charges,
    mandate_fees: mandateSummary.total,
    mandate_service_fee_input: document.getElementById('dealServiceFee')?.value?.trim() || '',
    platform_fee_percentage: Number(document.getElementById('dealPlatformFee')?.value || 0),
    advisory_fee_percentage: Number(document.getElementById('dealAdvisoryFee')?.value || 0),
    success_fee_percentage: Number(document.getElementById('dealSuccessFee')?.value || 0),
    legal_val_fee_percentage: Number(document.getElementById('dealLegalValFee')?.value || 0),
    mandate_service_fee_amount: forecastInputs.mandate_service_fee,
    stage_probability: forecastInputs.stage_probability
  }

  const editingId = window.__editingDealId || null
  const editingDeal = editingId ? (DataStore.getById('deals', editingId) || (window.__dealDetailMap || {})[editingId]) : null
  const leadId = document.getElementById('dealLeadId')?.value || editingDeal?.leadId || editingDeal?.lead_id || editingDeal?.id || null

  if (editingId) {
    const leadPayload = {
      lead_name: payload.name,
      company_name: payload.company,
      mobile: payload.contact,
      deal_value: payload.value,
      lead_status: payload.stage,
      lead_source: payload.source,
      remarks: payload.description,
      followup_date: payload.closeDate || null,
      assigned_to: editingDeal?.assignedTo || editingDeal?.assigned_to || null,
      funding_amount: payload.value,
      pipeline_stage: payload.stage
    }

    const persistEdit = async () => {
      try {
        let updatedLead = null
        if (leadId && typeof window.API?.updateLead === 'function') {
          updatedLead = await window.API.updateLead(Number(leadId), leadPayload)
        }

        const commercialPayload = {
          loan_amount: payload.value,
          pf_percentage: payload.pf_percentage,
          revenue_share_percentage: payload.revenue_share_percentage,
          platform_charges: payload.platform_charges,
          tranche_charges: payload.tranche_charges,
          advisory_fees: payload.advisory_fees,
          renewal_charges: payload.renewal_charges,
          other_charges: payload.other_charges,
          mandate_fees: payload.mandate_fees || 0,
          mandate_service_fee_input: payload.mandate_service_fee_input || '',
          platform_fee_percentage: payload.platform_fee_percentage || 0,
          advisory_fee_percentage: payload.advisory_fee_percentage || 0,
          success_fee_percentage: payload.success_fee_percentage || 0,
          legal_val_fee_percentage: payload.legal_val_fee_percentage || 0,
          mandate_service_fee_amount: payload.mandate_service_fee_amount || 0,
          override_reason: 'Deal edit sync',
          remarks: payload.description
        }

        let forecastResult = null
        if (leadId) {
          try {
            forecastResult = await saveDealCommercialRevenue(Number(leadId), commercialPayload)
          } catch (forecastError) {
            console.warn('Commercial revenue sync failed:', forecastError)
          }
        }

        const merged = {
          ...editingDeal,
          ...payload,
          leadId,
          name: updatedLead?.lead_name || payload.name,
          company: updatedLead?.company_name || payload.company,
          contact: updatedLead?.mobile || payload.contact,
          value: updatedLead?.deal_value || payload.value,
          stage: updatedLead?.lead_status || payload.stage,
          source: updatedLead?.lead_source || payload.source,
          description: updatedLead?.remarks || payload.description,
          closeDate: updatedLead?.followup_date || payload.closeDate,
          loan_amount: payload.value,
          expected_revenue: forecastResult?.data?.expected_revenue || editingDeal?.expected_revenue || 0,
          weighted_revenue: forecastResult?.data?.weighted_revenue || editingDeal?.weighted_revenue || 0,
          pf_revenue: forecastResult?.data?.pf_revenue || editingDeal?.pf_revenue || 0,
          revenue_sharing: forecastResult?.data?.revenue_sharing || editingDeal?.revenue_sharing || 0,
          platform_charges: forecastResult?.data?.platform_charges || payload.platform_charges,
          tranche_charges: forecastResult?.data?.tranche_charges || payload.tranche_charges,
          advisory_fees: forecastResult?.data?.advisory_fees || payload.advisory_fees,
          renewal_charges: forecastResult?.data?.renewal_charges || payload.renewal_charges,
          other_charges: forecastResult?.data?.other_charges || payload.other_charges,
          mandate_fees: forecastResult?.data?.mandate_fees || payload.mandate_fees || editingDeal?.mandate_fees || 0,
          mandate_service_fee_input: payload.mandate_service_fee_input,
          platform_fee_percentage: payload.platform_fee_percentage,
          advisory_fee_percentage: payload.advisory_fee_percentage,
          success_fee_percentage: payload.success_fee_percentage,
          legal_val_fee_percentage: payload.legal_val_fee_percentage,
          mandate_service_fee_amount: payload.mandate_service_fee_amount,
          updatedAt: new Date().toISOString()
        }

        const savedDeal = DataStore.update('deals', editingId, merged) || DataStore.add('deals', { ...merged, id: editingId, createdAt: merged.createdAt || new Date().toISOString() })
        const dealMap = window.__dealDetailMap || {}
        dealMap[String(editingId)] = savedDeal
        window.__dealDetailMap = dealMap
        window.__editingDealId = null
        closeDealModal()
        renderDeals()
        renderDashboard()
        showToast('Deal updated successfully', 'success')
      } catch (backendError) {
        console.warn('Backend deal save failed, falling back to local store:', backendError)
        const updated = DataStore.update('deals', editingId, { ...editingDeal, ...payload, id: editingId, updatedAt: new Date().toISOString() }) || DataStore.add('deals', { ...editingDeal, ...payload, id: editingId, createdAt: editingDeal?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() })
        window.__editingDealId = null
        closeDealModal()
        renderDeals()
        renderDashboard()
        showToast('Deal updated successfully', 'success')
      }
    }

    persistEdit()
    return
  }

  const deal = Object.assign({ id: 'DEAL-' + Date.now(), createdAt: new Date().toISOString() }, payload)
  if (leadId) {
    deal.leadId = leadId
    deal.lead_id = leadId
  }
  DataStore.add('deals', deal)
  closeDealModal()
  renderDeals()
  renderDashboard()
  showToast('Deal created successfully', 'success')
}

function saveDealProgress() {
  const name = document.getElementById('dealName')?.value?.trim()
  const company = document.getElementById('dealCompany')?.value?.trim()

  if (!name && !company) {
    showToast('Enter some deal data before saving progress', 'error')
    return
  }

  const payload = {
    name: name || 'Draft deal',
    company: company || 'Draft company',
    contact: document.getElementById('dealContact')?.value?.trim() || '',
    value: parseFloat(document.getElementById('dealValue')?.value) || 0,
    stage: document.getElementById('dealStage')?.value || 'prospecting',
    closeDate: document.getElementById('dealCloseDate')?.value || '',
    probability: parseInt(document.getElementById('dealProbability')?.value) || 20,
    source: document.getElementById('dealSource')?.value || 'other',
    description: document.getElementById('dealDescription')?.value?.trim() || '',
    pf_percentage: Number(document.getElementById('dealPfPercentage')?.value || 0),
    revenue_share_percentage: Number(document.getElementById('dealRevenueSharePercentage')?.value || 0),
    direct_revenue: Number(document.getElementById('dealDirectRevenue')?.value || 0),
    platform_charges: Number(document.getElementById('dealPlatformCharges')?.value || 0),
    tranche_charges: Number(document.getElementById('dealTrancheCharges')?.value || 0),
    advisory_fees: Number(document.getElementById('dealAdvisoryFees')?.value || 0),
    renewal_charges: Number(document.getElementById('dealRenewalCharges')?.value || 0),
    other_charges: Number(document.getElementById('dealOtherCharges')?.value || 0),
    mandate_service_fee_input: document.getElementById('dealServiceFee')?.value?.trim() || '',
    platform_fee_percentage: Number(document.getElementById('dealPlatformFee')?.value || 0),
    advisory_fee_percentage: Number(document.getElementById('dealAdvisoryFee')?.value || 0),
    success_fee_percentage: Number(document.getElementById('dealSuccessFee')?.value || 0),
    legal_val_fee_percentage: Number(document.getElementById('dealLegalValFee')?.value || 0),
    mandate_service_fee_amount: parsePercentageOrAmount(document.getElementById('dealServiceFee')?.value || '', Number(document.getElementById('dealValue')?.value || 0), false),
    stage_probability: Math.max(0, Math.min(1, (parseInt(document.getElementById('dealProbability')?.value) || 20) / 100)),
    updatedAt: new Date().toISOString()
  }

  const dealLeadId = document.getElementById('dealLeadId')?.value || window.currentCaseLeadId || window.currentLeadId || ''
  if (dealLeadId) {
    payload.leadId = dealLeadId
    payload.lead_id = dealLeadId
  }

  const currentStep = window.currentDealStep || 1
  if (!validateDealStep(currentStep)) return

  const editingId = window.__editingDealId || null
  if (editingId) {
    DataStore.update('deals', editingId, payload)
    renderDeals()
    renderDashboard()
    if (currentStep < 8) {
      showDealStep(currentStep + 1)
      showToast(`Step ${currentStep} saved. Continue to step ${currentStep + 1}.`, 'success')
      return
    }
    showToast('Deal progress saved. Continue your deal later.', 'success')
    return
  }

  const draft = Object.assign({ id: 'DEAL-DRAFT-' + Date.now(), createdAt: new Date().toISOString() }, payload)
  DataStore.add('deals', draft)
  window.__editingDealId = draft.id
  renderDeals()
  renderDashboard()
  if (currentStep < 8) {
    showDealStep(currentStep + 1)
    showToast(`Step ${currentStep} saved. Continue to step ${currentStep + 1}.`, 'success')
    return
  }
  showToast('Deal progress saved. You can continue editing now.', 'success')
}

// ═══════════════════════════════════════════════════════════════
// Deal Actions: Edit, Change Stage, Add Note, View Activities
// ═══════════════════════════════════════════════════════════════

function editDeal(id) {
  if (!id) return showToast('No deal selected', 'error')
  const deal = DataStore.getById('deals', id) || (window.__dealDetailMap || {})[id]
  if (!deal) return showToast('Deal not found', 'error')

  const localDeal = DataStore.getById('deals', id)
  if (!localDeal) {
    DataStore.add('deals', {
      ...deal,
      id: id,
      createdAt: deal.createdAt || new Date().toISOString(),
      updatedAt: deal.updatedAt || new Date().toISOString()
    })
  }

  window.__editingDealId = id
  closeDealDetail()
  openDealModal()

  // Prefill form after opening so the modal isn't wiped by the generic clear step
  document.getElementById('dealName').value = deal.name || deal.deal_name || ''
  document.getElementById('dealCompany').value = deal.company || deal.company_name || ''
  document.getElementById('dealContact').value = deal.contact || ''
  document.getElementById('dealValue').value = deal.value || deal.deal_value || deal.loan_amount || ''
  if (document.getElementById('dealLeadId')) document.getElementById('dealLeadId').value = deal.leadId || deal.lead_id || deal.id || ''
  if (document.getElementById('dealStage')) document.getElementById('dealStage').value = deal.stage || deal.status || 'prospecting'
  if (document.getElementById('dealCloseDate')) document.getElementById('dealCloseDate').value = deal.closeDate || deal.close_date || deal.disbursement_date || ''
  if (document.getElementById('dealProbability')) {
    const stageValue = document.getElementById('dealStage')?.value || deal.stage || deal.status || 'prospecting'
    const fallbackProbability = deal.probability || Math.round((deal.stage_probability || 0) * 100)
    document.getElementById('dealProbability').value = fallbackProbability || String(getStageProbability(stageValue))
  }
  if (document.getElementById('dealSource')) document.getElementById('dealSource').value = deal.source || ''
  if (document.getElementById('dealDescription')) document.getElementById('dealDescription').value = deal.description || deal.notes || ''
  if (document.getElementById('dealPfPercentage')) document.getElementById('dealPfPercentage').value = deal.pf_percentage || ''
  if (document.getElementById('dealRevenueSharePercentage')) document.getElementById('dealRevenueSharePercentage').value = deal.revenue_share_percentage || ''
  if (document.getElementById('dealDirectRevenue')) document.getElementById('dealDirectRevenue').value = deal.direct_revenue || ''
  if (document.getElementById('dealPlatformCharges')) document.getElementById('dealPlatformCharges').value = deal.platform_charges || ''
  if (document.getElementById('dealTrancheCharges')) document.getElementById('dealTrancheCharges').value = deal.tranche_charges || ''
  if (document.getElementById('dealAdvisoryFees')) document.getElementById('dealAdvisoryFees').value = deal.advisory_fees || ''
  if (document.getElementById('dealRenewalCharges')) document.getElementById('dealRenewalCharges').value = deal.renewal_charges || ''
  if (document.getElementById('dealOtherCharges')) document.getElementById('dealOtherCharges').value = deal.other_charges || ''
  if (document.getElementById('dealServiceFee')) document.getElementById('dealServiceFee').value = deal.mandate_service_fee_input || deal.service_fee_input || deal.service_fee || ''
  if (document.getElementById('dealPlatformFee')) document.getElementById('dealPlatformFee').value = deal.platform_fee_percentage || deal.mandate_platform_fee_percentage || ''
  if (document.getElementById('dealAdvisoryFee')) document.getElementById('dealAdvisoryFee').value = deal.advisory_fee_percentage || deal.mandate_advisory_fee_percentage || ''
  if (document.getElementById('dealSuccessFee')) document.getElementById('dealSuccessFee').value = deal.success_fee_percentage || deal.mandate_success_fee_percentage || ''
  if (document.getElementById('dealLegalValFee')) document.getElementById('dealLegalValFee').value = deal.legal_val_fee_percentage || deal.mandate_legal_val_fee_percentage || ''
  if (document.getElementById('dealServiceFee')) document.getElementById('dealServiceFee').value = deal.mandate_service_fee_input || deal.service_fee_input || deal.service_fee || ''
  if (document.getElementById('dealPlatformFee')) document.getElementById('dealPlatformFee').value = deal.platform_fee_percentage || deal.mandate_platform_fee_percentage || ''
  if (document.getElementById('dealAdvisoryFee')) document.getElementById('dealAdvisoryFee').value = deal.advisory_fee_percentage || deal.mandate_advisory_fee_percentage || ''
  if (document.getElementById('dealSuccessFee')) document.getElementById('dealSuccessFee').value = deal.success_fee_percentage || deal.mandate_success_fee_percentage || ''
  if (document.getElementById('dealLegalValFee')) document.getElementById('dealLegalValFee').value = deal.legal_val_fee_percentage || deal.mandate_legal_val_fee_percentage || ''

  updateDealForecastPreview()
  closeDealActionsMenu()
}

function changeDealStage(id) {
  if (!id) return showToast('No deal selected', 'error')
  const deal = DataStore.getById('deals', id) || (window.__dealDetailMap || {})[id]
  if (!deal) return showToast('Deal not found', 'error')
  // Open modal and set selected value
  const modal = document.getElementById('changeStageModal')
  const sel = document.getElementById('changeStageSelect')
  if (sel) sel.value = deal.stage || deal.status || 'prospecting'
  if (modal) modal.style.display = 'flex'
  const backdrop = document.getElementById('modalBackdrop')
  if (backdrop) backdrop.style.display = 'block'
  // remember current deal id for modal submit
  window.__changeStageDealId = id
  closeDealActionsMenu()
}

function addDealNote(id) {
  if (!id) return showToast('No deal selected', 'error')
  // open Add Note modal
  const modal = document.getElementById('addNoteModal')
  const ta = document.getElementById('addNoteTextarea')
  if (ta) ta.value = ''
  if (modal) modal.style.display = 'flex'
  const backdrop = document.getElementById('modalBackdrop')
  if (backdrop) backdrop.style.display = 'block'
  window.__addNoteDealId = id
  closeDealActionsMenu()
}

function submitChangeStageModal() {
  const id = window.__changeStageDealId
  if (!id) return showToast('No deal selected', 'error')
  const sel = document.getElementById('changeStageSelect')
  const newStage = sel?.value || ''
  if (!newStage) return showToast('Select a stage', 'error')

  const deal = DataStore.getById('deals', id) || (window.__dealDetailMap || {})[id]
  if (deal && deal.leadId) {
    const stageMap = {
      'login-docs-submitted': 'Login Docs Submitted',
      'approved-limit': 'Approved Limit',
      'sanction-docs': 'Sanction Docs',
      'pre-disbursement': 'Pre-Disbursement',
      'disbursement': 'Disbursement',
      'payout-received': 'Payout Received',
      'closed-won': 'Closed Won',
      'closed-lost': 'Closed Lost'
    }

    const leadStage = stageMap[String(newStage).toLowerCase()] || String(newStage)
    const leadList = DataStore.get('leads') || []
    const leadIndex = leadList.findIndex(lead => String(lead.id || lead.lead_id || lead.leadId || '') === String(deal.leadId))
    if (leadIndex !== -1) {
      leadList[leadIndex] = {
        ...leadList[leadIndex],
        lead_status: leadStage,
        currentStatus: leadStage,
        status: leadStage,
        pipeline_stage: leadStage,
        lead_stage: leadStage,
        purpose: leadStage,
        updated_at: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      }
      DataStore.set('leads', leadList)

      const storedPipelineLeads = JSON.parse(localStorage.getItem('crm_pipeline_leads') || '[]')
      const pipelineIndex = storedPipelineLeads.findIndex(item => String(item.id || item.lead_id || item.leadId || '') === String(deal.leadId))
      if (pipelineIndex !== -1) {
        storedPipelineLeads[pipelineIndex] = {
          ...storedPipelineLeads[pipelineIndex],
          lead_status: leadStage,
          currentStatus: leadStage,
          status: leadStage,
          pipeline_stage: leadStage,
          lead_stage: leadStage,
          purpose: leadStage,
          updated_at: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        }
        localStorage.setItem('crm_pipeline_leads', JSON.stringify(storedPipelineLeads))
      }
    }
  }

  DataStore.update('deals', id, { stage: newStage })
  document.querySelector('.detail-stage') && (document.querySelector('.detail-stage').textContent = newStage)
  renderDeals()
  if (typeof refreshPipelineBoard === 'function') refreshPipelineBoard()
  showToast('Deal stage updated', 'success')
  closeChangeStageModal()
}

function closeChangeStageModal() {
  const modal = document.getElementById('changeStageModal')
  const backdrop = document.getElementById('modalBackdrop')
  if (modal) modal.style.display = 'none'
  if (backdrop) backdrop.style.display = 'none'
  window.__changeStageDealId = null
}

function submitAddNoteModal() {
  const id = window.__addNoteDealId
  if (!id) return showToast('No deal selected', 'error')
  const ta = document.getElementById('addNoteTextarea')
  const note = ta?.value?.trim()
  if (!note) return showToast('Please enter a note', 'error')
  const deal = DataStore.getById('deals', id) || (window.__dealDetailMap || {})[id]
  if (!deal) return showToast('Deal not found', 'error')
  const notes = Array.isArray(deal.notes) ? deal.notes.slice() : (deal.notes ? [deal.notes] : [])
  notes.unshift(new Date().toLocaleString('en-IN') + ' — ' + note)
  DataStore.update('deals', id, { notes })
  const notesEl = document.querySelector('.detail-notes')
  if (notesEl) notesEl.textContent = notes.join('\n')
  showToast('Note added to deal', 'success')
  closeAddNoteModal()
}

function closeAddNoteModal() {
  const modal = document.getElementById('addNoteModal')
  const backdrop = document.getElementById('modalBackdrop')
  if (modal) modal.style.display = 'none'
  if (backdrop) backdrop.style.display = 'none'
  window.__addNoteDealId = null
}

function openAssignOwnerModal(id) {
  if (!id) return showToast('No deal selected', 'error')
  const modal = document.getElementById('assignOwnerModal')
  const input = document.getElementById('assignOwnerInput')
  const datalist = document.getElementById('assignOwnerList')
  // populate owners from employees list
  const employees = DataStore.get('employees') || []
  // cache employees for interactive search
  window.__assignOwnerEmployees = employees
  if (datalist) {
    datalist.innerHTML = employees.map(e => `<option value="${escapeHtml(e.email||e.id||e.name)}">`).join('')
  }
  // render interactive results
  const results = document.getElementById('assignOwnerResults')
  if (results) {
    results.innerHTML = employees.map(e => {
      const display = escapeHtml(e.name || e.email || e.id || '')
      const sub = escapeHtml(e.email || '')
      return `<div class="assign-owner-item" data-value="${escapeHtml(e.email||e.id||e.name)}" style="padding:10px;border-bottom:1px solid var(--gray-100);cursor:pointer;">
          <div style="font-weight:600;color:var(--gray-800)">${display}</div>
          <div style="font-size:12px;color:var(--gray-500);margin-top:4px">${sub}</div>
        </div>`
    }).join('')
    results.style.display = employees.length ? 'block' : 'none'
    Array.from(results.querySelectorAll('.assign-owner-item')).forEach(el => el.addEventListener('click', (ev) => {
      const v = ev.currentTarget.getAttribute('data-value')
      selectAssignOwner(v)
    }))
  }
  if (input) {
    input.value = ''
    input.oninput = function(e) { filterAssignOwnerList(e.target.value || '') }
  }
  if (modal) modal.style.display = 'flex'
  const backdrop = document.getElementById('modalBackdrop')
  if (backdrop) backdrop.style.display = 'block'
  window.__assignOwnerDealId = id
}

function submitAssignOwnerModal() {
  const id = window.__assignOwnerDealId
  if (!id) return showToast('No deal selected', 'error')
  const owner = (window.__selectedAssignOwner || document.getElementById('assignOwnerInput')?.value || '').trim()
  if (!owner) return showToast('Select an owner', 'error')
  DataStore.update('deals', id, { assignedTo: owner })
  document.querySelector('.detail-owner') && (document.querySelector('.detail-owner').textContent = owner)
  renderDeals()
  showToast('Owner assigned', 'success')
  closeAssignOwnerModal()
}

function closeAssignOwnerModal() {
  const modal = document.getElementById('assignOwnerModal')
  const backdrop = document.getElementById('modalBackdrop')
  if (modal) modal.style.display = 'none'
  if (backdrop) backdrop.style.display = 'none'
  // clear temporary globals
  window.__assignOwnerEmployees = window.__selectedAssignOwner = window.__assignOwnerDealId = undefined
}

function filterAssignOwnerList(q) {
  const list = (window.__assignOwnerEmployees || [])
  const results = document.getElementById('assignOwnerResults')
  if (!results) return
  const ql = String(q||'').toLowerCase()
  const filtered = list.filter(e => ((e.name||'') + ' ' + (e.email||'') + ' ' + (e.id||'')).toLowerCase().includes(ql))
  results.innerHTML = filtered.map(e => {
    const display = escapeHtml(e.name || e.email || e.id || '')
    const sub = escapeHtml(e.email || '')
    return `<div class="assign-owner-item" data-value="${escapeHtml(e.email||e.id||e.name)}" style="padding:10px;border-bottom:1px solid var(--gray-100);cursor:pointer;">
          <div style="font-weight:600;color:var(--gray-800)">${display}</div>
          <div style="font-size:12px;color:var(--gray-500);margin-top:4px">${sub}</div>
        </div>`
  }).join('')
  results.style.display = filtered.length ? 'block' : 'none'
  Array.from(results.querySelectorAll('.assign-owner-item')).forEach(el => el.addEventListener('click', (ev) => {
    const v = ev.currentTarget.getAttribute('data-value')
    selectAssignOwner(v)
  }))
}

function selectAssignOwner(val) {
  const input = document.getElementById('assignOwnerInput')
  const results = document.getElementById('assignOwnerResults')
  if (input) input.value = val
  window.__selectedAssignOwner = val
  if (results) results.style.display = 'none'
}

// Owner Picker modal functions
function openOwnerPicker() {
  const modal = document.getElementById('ownerPickerModal')
  const search = document.getElementById('ownerPickerSearch')
  if (modal) modal.style.display = 'flex'
  const backdrop = document.getElementById('modalBackdrop')
  if (backdrop) backdrop.style.display = 'block'
  if (search) {
    search.value = ''
    search.oninput = function() { renderOwnerPicker() }
  }
  renderOwnerPicker()
}

function closeOwnerPicker() {
  const modal = document.getElementById('ownerPickerModal')
  if (modal) modal.style.display = 'none'
  const backdrop = document.getElementById('modalBackdrop')
  if (backdrop) backdrop.style.display = 'none'
}

function renderOwnerPicker() {
  const listEl = document.getElementById('ownerPickerList')
  const q = (document.getElementById('ownerPickerSearch')?.value || '').toLowerCase()
  const employees = DataStore.get('employees') || []
  const filtered = employees.filter(e => ((e.name||'') + ' ' + (e.email||'') + ' ' + (e.id||'')).toLowerCase().includes(q))
  if (!listEl) return
  listEl.innerHTML = filtered.map(e => {
    const name = escapeHtml(e.name || e.email || e.id || '')
    const email = escapeHtml(e.email || '')
    const id = escapeHtml(e.email || e.id || e.name)
    return `<div class="owner-card" style="padding:10px;border:1px solid var(--gray-100);border-radius:10px;display:flex;flex-direction:column;gap:8px;">` +
      `<div style="font-weight:700;color:var(--gray-800)">${name}</div>` +
      `<div style="font-size:13px;color:var(--gray-600)">${email}</div>` +
      `<div style="margin-top:auto;display:flex;justify-content:flex-end;"><button class="btn" onclick="selectOwnerFromPicker('${id}')">Select</button></div>` +
      `</div>`
  }).join('')
}

function selectOwnerFromPicker(val) {
  selectAssignOwner(val)
  // also close picker modal
  closeOwnerPicker()
}

function exportDealPdf(id) {
  if (!id) return showToast('No deal selected', 'error')
  const deal = DataStore.getById('deals', id) || (window.__dealDetailMap || {})[id]
  if (!deal) return showToast('Deal not found', 'error')
  // Build printable HTML
  const wrapper = document.createElement('div')
  wrapper.style.fontFamily = 'Arial, sans-serif'
  wrapper.style.padding = '18px'
  wrapper.innerHTML = `
    <h2 style="margin-bottom:6px;">${escapeHtml(deal.name || 'Deal')}</h2>
    <div style="margin-bottom:8px;">Deal ID: <strong>${escapeHtml(deal.id || '')}</strong></div>
    <div style="margin-bottom:8px;">Company: <strong>${escapeHtml(deal.company || '')}</strong></div>
    <div style="margin-bottom:8px;">Value: <strong>${escapeHtml(String(deal.value || ''))}</strong></div>
    <div style="margin-bottom:8px;">Stage: <strong>${escapeHtml(deal.stage || '')}</strong></div>
    <div style="margin-bottom:8px;">Probability: <strong>${escapeHtml(String(deal.probability || ''))}%</strong></div>
    <div style="margin-bottom:8px;">Assigned To: <strong>${escapeHtml(deal.assignedTo || '')}</strong></div>
    <hr />
    <h4>Description</h4>
    <div style="white-space:pre-wrap;">${escapeHtml(deal.description || '')}</div>
  `

  // Prefer to export the visible deal detail modal if present
  const detailModal = document.getElementById('dealDetailModal')
  let sourceNode = wrapper
  if (detailModal && detailModal.style.display !== 'none') {
    // clone modal content to avoid manipulating live DOM
    const clone = detailModal.cloneNode(true)
    // ensure it's visible for rendering
    clone.style.display = 'block'
    sourceNode = clone
  }

  // Use html2pdf if available for nicer PDF generation
  if (typeof html2pdf === 'function') {
    const opt = {
      margin:       10,
      filename:     `${(deal.name||'deal').replace(/\s+/g,'_')}_${id}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }
    html2pdf().set(opt).from(sourceNode).save().then(() => {
      showToast('PDF exported', 'success')
    }).catch(() => {
      showToast('Export failed', 'error')
    })
  } else {
    // Fallback: download plain text
    const content = `Deal: ${deal.name || ''}\nDeal ID: ${deal.id || ''}\nCompany: ${deal.company || ''}\nValue: ${deal.value || ''}\nStage: ${deal.stage || ''}\nProbability: ${deal.probability || ''}%\nAssigned To: ${deal.assignedTo || ''}\n\nDescription:\n${deal.description || ''}`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(deal.name||'deal').replace(/\s+/g,'_')}_${id}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast('Deal exported (text)', 'success')
  }
  closeDealActionsMenu()
}

function viewDealActivities(id) {
  if (!id) return showToast('No deal selected', 'error')
  const deal = DataStore.getById('deals', id) || (window.__dealDetailMap || {})[id]
  if (!deal) return showToast('Deal not found', 'error')
  const activities = deal.audit_trail || deal.audit || deal.activities || []
  const modal = document.getElementById('profileModal')
  const titleEl = document.getElementById('profileModalTitle')
  const bodyEl = document.getElementById('profileModalContent')
  if (titleEl && bodyEl && modal) {
    titleEl.textContent = 'Deal Activities'
    if (!activities || activities.length === 0) {
      bodyEl.innerHTML = '<div style="padding:20px;color:var(--gray-600);">No recent activity</div>'
    } else {
      bodyEl.innerHTML = '<div style="display:grid;gap:10px;padding:8px;">' + activities.map(a => `<div style="padding:10px;background:var(--gray-50);border-radius:8px;"><div style="font-weight:600;color:var(--gray-700)">${a.changed_by||a.user||a.by||'User'}</div><div style="font-size:13px;color:var(--gray-700);margin-top:6px;white-space:pre-wrap">${a.field||a.action||''} → ${a.new_value||a.to||a.value||''}<div style="font-size:12px;color:var(--gray-500);margin-top:6px">${a.timestamp||a.updatedAt||a.updated_at||''}</div></div></div>`).join('') + '</div>'
    }
    modal.style.display = 'flex'
    const backdrop = document.getElementById('modalBackdrop')
    if (backdrop) backdrop.style.display = 'block'
  }
  closeDealActionsMenu()
}

// ═══════════════════════════════════════════════════════════════
// CAMPAIGN MODAL FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function openCampaignModal() {
  const modal = document.getElementById('campaignModal')
  if (modal) modal.style.display = 'flex'
}

function closeCampaignModal() {
  const modal = document.getElementById('campaignModal')
  if (modal) modal.style.display = 'none'
  clearCampaignForm()
}

function clearCampaignForm() {
  ;['campaignName', 'campaignStartDate', 'campaignEndDate', 'campaignBudget', 'campaignTarget', 'campaignDescription', 'campaignGoals'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.value = ''
  })
  ;['campaignType', 'campaignStatus'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.selectedIndex = 0
  })
}

function submitCampaign() {
  const name = document.getElementById('campaignName')?.value?.trim()
  const type = document.getElementById('campaignType')?.value

  if (!name) { showToast('Please enter campaign name', 'error'); return }

  const campaign = {
    id: 'CAMP-' + Date.now(),
    name,
    type,
    status: document.getElementById('campaignStatus')?.value || 'draft',
    startDate: document.getElementById('campaignStartDate')?.value || '',
    endDate: document.getElementById('campaignEndDate')?.value || '',
    budget: parseFloat(document.getElementById('campaignBudget')?.value) || 0,
    target: document.getElementById('campaignTarget')?.value?.trim() || '',
    description: document.getElementById('campaignDescription')?.value?.trim() || '',
    goals: document.getElementById('campaignGoals')?.value?.trim() || '',
    createdAt: new Date().toISOString(),
    leads: 0,
    conversions: 0
  }

  DataStore.add('campaigns', campaign)
  closeCampaignModal()
  renderCampaigns()
  showToast('Campaign created successfully', 'success')
}

// ═══════════════════════════════════════════════════════════════
// DOCUMENT MODAL FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function openDocumentModal() {
  const modal = document.getElementById('documentModal')
  if (modal) modal.style.display = 'flex'
}

function closeDocumentModal() {
  const modal = document.getElementById('documentModal')
  if (modal) modal.style.display = 'none'
  clearDocumentForm()
}

function clearDocumentForm() {
  ;['docName', 'docRelated', 'docDescription', 'docFile'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.value = ''
  })
  document.getElementById('docType').selectedIndex = 0
  document.getElementById('docFileName').textContent = 'No file selected'
}

function handleFileSelect() {
  const fileInput = document.getElementById('docFile')
  const fileName = fileInput?.files?.[0]?.name || 'No file selected'
  document.getElementById('docFileName').textContent = fileName
}

function submitDocument() {
  const name = document.getElementById('docName')?.value?.trim()
  const type = document.getElementById('docType')?.value
  const fileInput = document.getElementById('docFile')
  const file = fileInput?.files?.[0]

  if (!name) { showToast('Please enter document name', 'error'); return }
  if (!file) { showToast('Please select a file', 'error'); return }

  // Simulate file upload - store metadata only
  const docData = {
    id: 'DOC-' + Date.now(),
    name,
    type,
    relatedTo: document.getElementById('docRelated')?.value?.trim() || '',
    description: document.getElementById('docDescription')?.value?.trim() || '',
    fileName: file.name,
    fileSize: formatFileSize(file.size),
    uploadedAt: new Date().toLocaleString('en-IN'),
    uploadedBy: S?.name || 'User'
  }

  DataStore.add('documents', docData)
  closeDocumentModal()
  renderDocuments()
  showToast('Document uploaded successfully', 'success')
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Make modal functions globally available
window.openContactModal = openContactModal
window.closeContactModal = closeContactModal
window.submitContact = submitContact
window.openDealModal = openDealModal
window.closeDealModal = closeDealModal
window.submitDeal = submitDeal
window.openDealDetail = openDealDetail
window.toggleDealActionsMenu = toggleDealActionsMenu
window.copyDealId = copyDealId
window.closeDealActionsMenu = closeDealActionsMenu
window.editDeal = editDeal
window.changeDealStage = changeDealStage
window.addDealNote = addDealNote
window.viewDealActivities = viewDealActivities
window.openAssignOwnerModal = openAssignOwnerModal
window.submitAssignOwnerModal = submitAssignOwnerModal
window.closeAssignOwnerModal = closeAssignOwnerModal
window.exportDealPdf = exportDealPdf
window.openOwnerPicker = openOwnerPicker
window.closeOwnerPicker = closeOwnerPicker
window.renderOwnerPicker = renderOwnerPicker
window.selectOwnerFromPicker = selectOwnerFromPicker
window.closeDealDetail = closeDealDetail
window.openCampaignModal = openCampaignModal
window.closeCampaignModal = closeCampaignModal
window.submitCampaign = submitCampaign
window.openDocumentModal = openDocumentModal
window.closeDocumentModal = closeDocumentModal
window.submitDocument = submitDocument
window.handleFileSelect = handleFileSelect
// ═══════════════════════════════════════════════════════════════
// TODAY'S DONE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

let currentTodayDoneFilter = 'all'

function openTodayDoneModal() {
  const modal = document.getElementById('todayDoneModal')
  const backdrop = document.getElementById('modalBackdrop')
  if (modal) {
    modal.style.display = 'flex'
    if (backdrop) backdrop.style.display = 'block'
  }
}

function closeTodayDoneModal() {
  const modal = document.getElementById('todayDoneModal')
  const backdrop = document.getElementById('modalBackdrop')
  if (modal) modal.style.display = 'none'
  if (backdrop) backdrop.style.display = 'none'
  clearTodayDoneForm()
}

function clearTodayDoneForm() {
  ;['tdActivityType', 'tdActivityTypeOther', 'tdDescription', 'tdRelatedTo'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.value = ''
  })
  const otherGroup = document.getElementById('tdActivityTypeOtherGroup')
  if (otherGroup) otherGroup.style.display = 'none'
  const status = document.getElementById('tdStatus')
  if (status) status.value = 'completed'
}

function toggleTodayDoneOtherType() {
  const type = document.getElementById('tdActivityType')?.value
  const otherGroup = document.getElementById('tdActivityTypeOtherGroup')
  if (otherGroup) otherGroup.style.display = type === 'other' || type === 'reference' ? 'block' : 'none'
  if (type !== 'other' && type !== 'reference') {
    const otherInput = document.getElementById('tdActivityTypeOther')
    if (otherInput) otherInput.value = ''
  }
}

function submitTodayDone() {
  let type = document.getElementById('tdActivityType')?.value
  if (type === 'other' || type === 'reference') {
    type = document.getElementById('tdActivityTypeOther')?.value?.trim()
  }
  const description = document.getElementById('tdDescription')?.value?.trim()

  if (!type) { showToast('Please select activity type', 'error'); return }
  if (!description) { showToast('Please enter description', 'error'); return }

  const activity = {
    id: 'ACT-' + Date.now(),
    type,
    description,
    relatedTo: document.getElementById('tdRelatedTo')?.value?.trim() || '',
    status: document.getElementById('tdStatus')?.value || 'completed',
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date().toLocaleString('en-IN'),
    createdBy: S?.name || 'User'
  }

  DataStore.add('activities', activity)
  closeTodayDoneModal()
  renderTodayDone()
  showToast('Activity logged successfully', 'success')
}

function renderTodayDone() {
  const activities = DataStore.get('activities') || []
  const tbody = document.getElementById('todayDoneTableBody')
  const countEl = document.getElementById('todayDoneCount')

  if (!tbody) return

  let filtered = activities
  if (currentTodayDoneFilter !== 'all') {
    filtered = activities.filter(a => a.type === currentTodayDoneFilter)
  }

  if (countEl) countEl.textContent = filtered.length + ' activities'

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="padding:40px;text-align:center;color:var(--gray-400);">No activities logged yet</td></tr>'
  } else {
    tbody.innerHTML = filtered.slice().reverse().map(a => `
      <tr style="border-bottom:1px solid var(--gray-100);">
        <td style="padding:14px 16px;">${a.date || '—'}</td>
        <td style="padding:14px 16px;"><span class="badge ${a.type}">${a.type}</span></td>
        <td style="padding:14px 16px;">${a.description}</td>
        <td style="padding:14px 16px;"><span class="badge ${a.status}">${a.status}</span></td>
      </tr>
    `).join('')
  }
}

function filterTodayDone(filter) {
  currentTodayDoneFilter = filter
  renderTodayDone()
  
  // Update active tab styling
  const buttons = document.querySelectorAll('#sec-today-done .view-tab')
  buttons.forEach(btn => {
    btn.classList.remove('active')
    if (btn.textContent.toLowerCase().includes(filter) || 
        (filter === 'all' && btn.textContent.includes('All'))) {
      btn.classList.add('active')
    }
  })
}

// ═══════════════════════════════════════════════════════════════
// VISITS FUNCTIONS
// ═══════════════════════════════════════════════════════════════

let currentVisitFilter = 'all'

function openVisitModal() {
  const modal = document.getElementById('visitModal')
  const backdrop = document.getElementById('modalBackdrop')
  if (modal) {
    modal.style.display = 'flex'
    if (backdrop) backdrop.style.display = 'block'
  }
}

function closeVisitModal() {
  const modal = document.getElementById('visitModal')
  const backdrop = document.getElementById('modalBackdrop')
  if (modal) modal.style.display = 'none'
  if (backdrop) backdrop.style.display = 'none'
  clearVisitForm()
}

function clearVisitForm() {
  ;['visitClient', 'visitLocation', 'visitDate', 'visitNotes'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.value = ''
  })
  ;['visitType', 'visitOutcome'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.selectedIndex = 0
  })
}

function submitVisit() {
  const client = document.getElementById('visitClient')?.value?.trim()
  const type = document.getElementById('visitType')?.value
  const location = document.getElementById('visitLocation')?.value?.trim()
  const date = document.getElementById('visitDate')?.value

  if (!client) { showToast('Please enter client name', 'error'); return }
  if (!type) { showToast('Please select visit type', 'error'); return }
  if (!location) { showToast('Please enter location', 'error'); return }
  if (!date) { showToast('Please select date', 'error'); return }

  const visit = {
    id: 'VISIT-' + Date.now(),
    client,
    type,
    location,
    date,
    outcome: document.getElementById('visitOutcome')?.value || '',
    notes: document.getElementById('visitNotes')?.value?.trim() || '',
    status: 'completed',
    createdAt: new Date().toLocaleString('en-IN'),
    createdBy: S?.name || 'User'
  }

  DataStore.add('visits', visit)
  closeVisitModal()
  renderVisits()
  showToast('Visit logged successfully', 'success')
}

function renderVisits() {
  const visits = DataStore.get('visits') || []
  const tbody = document.getElementById('visitsTableBody')
  const countEl = document.getElementById('visitsCount')

  if (!tbody) return

  let filtered = visits
  if (currentVisitFilter !== 'all') {
    filtered = visits.filter(v => v.status === currentVisitFilter)
  }

  if (countEl) countEl.textContent = filtered.length + ' visits'

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="padding:40px;text-align:center;color:var(--gray-400);">No visits logged yet</td></tr>'
  } else {
    tbody.innerHTML = filtered.slice().reverse().map(v => `
      <tr style="border-bottom:1px solid var(--gray-100);">
        <td style="padding:14px 16px;">${v.date || '—'}</td>
        <td style="padding:14px 16px;font-weight:500;">${v.client}</td>
        <td style="padding:14px 16px;"><span class="badge ${v.type}">${v.type}</span></td>
        <td style="padding:14px 16px;color:var(--gray-700);">${v.location}</td>
        <td style="padding:14px 16px;"><span class="badge ${v.status}">${v.status}</span></td>
        <td style="padding:14px 16px;color:var(--gray-700);">${v.outcome || '—'}</td>
      </tr>
    `).join('')
  }
}

function filterVisits(filter) {
  currentVisitFilter = filter
  renderVisits()
  
  // Update active tab styling
  const buttons = document.querySelectorAll('#sec-visits .view-tab')
  buttons.forEach(btn => {
    btn.classList.remove('active')
    if (btn.textContent.toLowerCase().includes(filter) || 
        (filter === 'all' && btn.textContent.includes('All'))) {
      btn.classList.add('active')
    }
  })
}

// ═══════════════════════════════════════════════════════════════
// PROJECTS FUNCTIONS
// ═══════════════════════════════════════════════════════════════

let currentProjectFilter = 'all'

function openProjectModal() {
  const modal = document.getElementById('projectModal')
  const backdrop = document.getElementById('modalBackdrop')
  if (modal) {
    modal.style.display = 'flex'
    if (backdrop) backdrop.style.display = 'block'
  }
}

function closeProjectModal() {
  const modal = document.getElementById('projectModal')
  const backdrop = document.getElementById('modalBackdrop')
  if (modal) modal.style.display = 'none'
  if (backdrop) backdrop.style.display = 'none'
  clearProjectForm()
}

function clearProjectForm() {
  ;['projectName', 'projectClient', 'projectStartDate', 'projectDueDate', 'projectDescription'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.value = ''
  })
  const status = document.getElementById('projectStatus')
  if (status) status.value = 'active'
}

function submitProject() {
  const name = document.getElementById('projectName')?.value?.trim()
  const client = document.getElementById('projectClient')?.value?.trim()

  if (!name) { showToast('Please enter project name', 'error'); return }
  if (!client) { showToast('Please enter client name', 'error'); return }

  const project = {
    id: 'PROJ-' + Date.now(),
    name,
    client,
    startDate: document.getElementById('projectStartDate')?.value || '',
    dueDate: document.getElementById('projectDueDate')?.value || '',
    description: document.getElementById('projectDescription')?.value?.trim() || '',
    status: document.getElementById('projectStatus')?.value || 'active',
    progress: 0,
    createdAt: new Date().toLocaleString('en-IN'),
    createdBy: S?.name || 'User'
  }

  DataStore.add('projects', project)
  closeProjectModal()
  renderProjects()
  showToast('Project created successfully', 'success')
}

function renderProjects() {
  const projects = DataStore.get('projects') || []
  const tbody = document.getElementById('projectsTableBody')
  const countEl = document.getElementById('projectsCount')

  if (!tbody) return

  let filtered = projects
  if (currentProjectFilter !== 'all') {
    filtered = projects.filter(p => p.status === currentProjectFilter)
  }

  if (countEl) countEl.textContent = filtered.length + ' projects'

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="padding:40px;text-align:center;color:var(--gray-400);">No projects yet. Create your first project!</td></tr>'
  } else {
    tbody.innerHTML = filtered.slice().reverse().map(p => `
      <tr style="border-bottom:1px solid var(--gray-100);">
        <td style="padding:14px 16px;font-weight:500;">${p.name}</td>
        <td style="padding:14px 16px;color:var(--gray-700);">${p.client}</td>
        <td style="padding:14px 16px;"><span class="badge ${p.status}">${p.status}</span></td>
        <td style="padding:14px 16px;">
          <div style="width:100px;height:8px;background:var(--gray-200);border-radius:4px;overflow:hidden;">
            <div style="width:${p.progress}%;height:100%;background:var(--maroon);"></div>
          </div>
          <span style="font-size:11px;color:var(--gray-500);">${p.progress}%</span>
        </td>
        <td style="padding:14px 16px;color:var(--gray-700);">${p.dueDate || '—'}</td>
        <td style="padding:14px 16px;">
          <button class="btn-icon" onclick="showToast('Edit project - Coming Soon', 'info')">✏️</button>
        </td>
      </tr>
    `).join('')
  }
}

function filterProjects(filter) {
  currentProjectFilter = filter
  renderProjects()
  
  // Update active tab styling
  const buttons = document.querySelectorAll('#sec-projects .view-tab')
  buttons.forEach(btn => {
    btn.classList.remove('active')
    if (btn.textContent.toLowerCase().includes(filter) || 
        (filter === 'all' && btn.textContent.includes('All'))) {
      btn.classList.add('active')
    }
  })
}

// ═══════════════════════════════════════════════════════════════
// WINDOW EXPORTS
// ═══════════════════════════════════════════════════════════════

window.closeAllModals = closeAllModals
window.renderTasksTable = renderTasksTable
window.toggleTaskStatus = toggleTaskStatus
window.filterTasks = filterTasks
window.submitTask = submitTask
window.assignTask = assignTask

// Today's Done exports
window.openTodayDoneModal = openTodayDoneModal
window.closeTodayDoneModal = closeTodayDoneModal
window.submitTodayDone = submitTodayDone
window.renderTodayDone = renderTodayDone
window.filterTodayDone = filterTodayDone

// Visits exports
window.openVisitModal = openVisitModal
window.closeVisitModal = closeVisitModal
window.submitVisit = submitVisit
window.renderVisits = renderVisits
window.filterVisits = filterVisits

// Projects exports
window.openProjectModal = openProjectModal
window.closeProjectModal = closeProjectModal
window.submitProject = submitProject
window.renderProjects = renderProjects
window.filterProjects = filterProjects

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    submitSOD, renderSODHistory,
    submitEOD, renderEOD, renderEODHistory,
    submitWOD, renderWODHistory,
    submitLead, renderLeads,
    renderPipeline, renderForecasting,
    renderAnalytics, renderReports, renderTeam,
    renderAccounts, renderContacts, renderDeals, renderCampaigns,
    openContactModal, closeContactModal, submitContact,
    openDealModal, closeDealModal, submitDeal,
    openDealDetail, closeDealDetail,
    openCampaignModal, closeCampaignModal, submitCampaign,
    openDocumentModal, closeDocumentModal, submitDocument,
    openProfile, closeProfileModal, switchProfileTab,
    submitTask, assignTask, toggleTaskStatus
  }
}

// ═══════════════════════════════════════════════════════════════
// CALLS/TELEPHONY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function renderCalls() {
  const calls = DataStore.get('calls') || []
  const tbody = document.getElementById('callBody')
  const countEl = document.getElementById('callCount')
  
  if (!tbody) return

  // Debug: log first call to see what data we have
  if (calls.length > 0) {
    console.log('First call data:', calls[0])
  }

  // Get filter values
  const search = document.getElementById('callSearch')?.value?.toLowerCase() || ''
  const statusF = document.getElementById('callStatusFHeader')?.value || ''
  const priorityF = document.getElementById('callPriorityF')?.value || ''
  const dateF = document.getElementById('callDateFilter')?.value || ''

  // Filter calls
  let filtered = calls
  if (search) {
    filtered = filtered.filter(c => {
      const customer = (c.customer || c.customerName || c.company || '').toString().toLowerCase()
      const phone = (c.phone || '').toString().toLowerCase()
      return customer.includes(search) || phone.includes(search)
    })
  }
  if (statusF) filtered = filtered.filter(c => c.outcome === statusF)
  if (priorityF) filtered = filtered.filter(c => c.priority === priorityF)
  if (dateF) {
    const filterDate = parseLeadDate(dateF)
    filtered = filtered.filter(c => {
      const callDate = parseLeadDate(c.date || c.timestamp)
      return callDate && filterDate && callDate.toDateString() === filterDate.toDateString()
    })
  }

  if (countEl) countEl.textContent = filtered.length + ' calls'

  // helper to select first present field from many possible keys
  const pick = (obj, ...keys) => {
    for (const k of keys) {
      if (!obj) continue
      const v = obj[k]
      if (v !== undefined && v !== null && String(v).trim() !== '') return v
    }
    return null
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="15" style="padding:40px;text-align:center;color:var(--gray-400);">No calls found</td></tr>'
  } else {
    tbody.innerHTML = filtered.slice().reverse().map(c => `
      <tr style="border-bottom:1px solid var(--gray-100);">
        <td style="padding:14px 16px;">${pick(c, 'timestamp','date','call_date','createdAt','created_at') || '—'}</td>
        <td style="padding:14px 16px;color:var(--gray-700);">${pick(c, 'agent','sale_executive','salesExecutive','sales_executive','agentName','agent_name','owner','assignedTo','createdBy') || '—'}</td>
        <td style="padding:14px 16px;color:var(--gray-700);">${pick(c, 'source','leadSource','lead_source','origin','sourse') || '—'}</td>
        <td style="padding:14px 16px;color:var(--gray-700);">${pick(c, 'customer_company_name','company','companyName','customerCompany') || '—'}</td>
        <td style="padding:14px 16px;color:var(--gray-700);">${pick(c, 'contact_person_name','customer','customerName','contactPerson','contactPersonName') || '—'}</td>
        <td style="padding:14px 16px;color:var(--gray-700);">${pick(c, 'designation') || '—'}</td>
        <td style="padding:14px 16px;color:var(--gray-700);">${c.phone || pick(c, 'contactNumber','mobile','contact_number') || '—'}</td>
        <td style="padding:14px 16px;color:var(--gray-700);">${pick(c, 'email','emailId','email_address') || '—'}</td>
        <td style="padding:14px 16px;color:var(--gray-700);">${pick(c, 'purpose','purposeOfCall','purpose_of_call','callPurpose') || '—'}</td>
        <td style="padding:14px 16px;color:var(--gray-700);">${pick(c, 'product','productName','productDiscussed','product_discussed') || '—'}</td>
        <td style="padding:14px 16px;"><span class="badge ${((pick(c,'outcome','status','callOutcome')||'')+'').toLowerCase().replace(/\s+/g,'-')}">${pick(c,'outcome','status','callOutcome') || '—'}</span></td>
        <td style="padding:14px 16px;color:var(--gray-700);">${pick(c, 'followupDate','nextFollowUp','followup','next_follow_up_date') || '—'}</td>
        <td style="padding:14px 16px;">${c.recording ? '▶️' : '—'}</td>
        <td style="padding:14px 16px;">
          <button class="btn-icon" onclick="showToast('Call details - Coming Soon', 'info')" title="View Details">👁️</button>
          <button class="btn-icon" onclick="goToLeadFormWithCallDetails('${c.id}')" title="Go to Lead Form">📝</button>
        </td>
      </tr>
    `).join('')
  }
}

// Async function to fetch fresh data and re-render
async function refreshCalls() {
  await DataStore.fetchCallsFromBackend()
  renderCalls()
}

// Initialize call tracker when section becomes active
document.addEventListener('DOMContentLoaded', function() {
  const callTrackerBtn = document.querySelector('[data-sec="call-tracker"]')
  if (callTrackerBtn) {
    callTrackerBtn.addEventListener('click', function() {
      setTimeout(() => refreshCalls(), 100)
    })
  }
  
  // Also refresh when call tracker section is directly loaded
  if (document.querySelector('[data-sec="call-tracker"]')?.classList.contains('active')) {
    setTimeout(() => refreshCalls(), 500)
  }
})

// Make globally available
window.renderCalls = renderCalls
window.refreshCalls = refreshCalls
window.renderDocuments = renderDocuments
window.renderSODHistory = renderSODHistory
window.renderEODHistory = renderEODHistory
window.renderWODHistory = renderWODHistory
window.renderLeads = renderLeads

if (typeof window.renderDocuments !== 'function') {
  window.renderDocuments = function() {
    const container = document.getElementById('documentsContainer')
    if (!container) return
    container.innerHTML = '<div style="padding:20px;color:var(--gray-500);">Documents will appear here.</div>'
  }
}

window.renderEOD = renderEOD
window.renderTeam = renderTeam
window.renderTargets = renderTargets
window.renderAnalytics = renderAnalytics
window.renderAccounts = renderAccounts
window.renderContacts = renderContacts
window.renderDeals = renderDeals
window.renderCampaigns = renderCampaigns
window.renderPipeline = renderPipeline
window.renderForecasting = renderForecasting
window.renderReports = renderReports
window.renderIntegrations = renderIntegrations
window.renderAutomation = renderAutomation
window.renderTaskAssign = renderTaskAssign
window.renderTodayDone = renderTodayDone
window.renderVisits = renderVisits
window.renderProjects = renderProjects
window.openTargetModal = openTargetModal
window.closeTargetModal = closeTargetModal
window.submitTarget = submitTarget
window.deleteTarget = deleteTarget
window.notifyExecutivePanel = notifyExecutivePanel

// Ensure the Add Target button always opens the modal (fallback for inline onclick issues)
try {
  const _addTargetBtn = document.getElementById('addTargetBtn')
  if (_addTargetBtn && !_addTargetBtn._openTargetBound) {
    _addTargetBtn.addEventListener('click', (e) => { try { e.preventDefault(); openTargetModal(); } catch(_){} })
    _addTargetBtn._openTargetBound = true
  }
} catch (err) { /* ignore in environments where DOM not ready */ }

// ═══════════════════════════════════════════════════════════════
// WORKQUEUE SIMPLE FILTER
// ═══════════════════════════════════════════════════════════════

function filterWq(el, type) {
  // Update active state on sidebar items
  document.querySelectorAll('#sec-workqueue .wq-list:first-of-type .wq-item').forEach(item => {
    item.classList.remove('active')
  })
  el.classList.add('active')
  
  // Update the title
  const titleEl = document.getElementById('wqTitle')
  if (titleEl) {
    titleEl.textContent = type.charAt(0).toUpperCase() + type.slice(1)
  }
  
  const tbody = document.getElementById('wqTableBody')
  if (!tbody) return

  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--gray-400);padding:20px;">No records available</td></tr>'

  const totalEl = document.getElementById('wqTotalRecords')
  if (totalEl) {
    totalEl.textContent = 'Total Records 0'
  }
}

// Make globally available
window.filterWq = filterWq

