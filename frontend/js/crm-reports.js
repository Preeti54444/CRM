
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
      console.error('SOD backend save failed:', err);
      showToast('Failed to save SOD to backend. Please check your connection.', 'error');
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
  return typeof S !== 'undefined' && S && String(S.role || '').toLowerCase() === 'admin' && String(S.email || '').trim().toLowerCase() === 'shree.rathod@fundingsathi.in'
}

function handleRestrictedReportSubmitAttempt(reportType) {
  if (!isRestrictedReportSubmitUser()) return false
  showToast('Report submission is disabled for this admin user.', 'warning')
  console.warn(`Blocked restricted report submission attempt: ${reportType}`)
  return true
}

const ADMIN_REPORT_NOTIFICATION_EMAIL = 'shree.rathod@fundingsathi.in'
const ADMIN_REPORT_NOTIFICATION_NAME = 'Shree Rathod'

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
      btn.removeAttribute('aria-hidden')
      btn.removeAttribute('data-restricted-report-submit')
    }
  })

  const navButtons = ['sod-form', 'eod-form', 'wod-form']
  navButtons.forEach((sec) => {
    const navBtn = document.querySelector(`.nav-btn[data-sec="${sec}"]`)
    if (!navBtn) return
    if (shouldHide) {
      navBtn.style.display = 'none'
      navBtn.setAttribute('aria-hidden', 'true')
      navBtn.setAttribute('data-restricted-report-nav', 'true')
    } else {
      navBtn.style.display = ''
      navBtn.removeAttribute('aria-hidden')
      navBtn.removeAttribute('data-restricted-report-nav')
    }
  })
}

function notifyAdminReportSubmission(notification = {}) {
  if (typeof S === 'undefined' || !S) {
    console.warn('notifyAdminReportSubmission: No session found')
    return
  }

  // Get all admin users from local storage or backend
  const users = DataStore.getCRMUsers() || []
  const adminEmails = users
    .filter(user => {
      const role = String(user.role || '').toLowerCase()
      return role === 'admin' || role === 'Admin'
    })
    .map(user => String(user.email || '').toLowerCase())
    .filter(Boolean)

  console.debug('Admin users found:', adminEmails)
  console.debug('Current user:', S.email, S.role)

  // If no admins found, use the hardcoded admin email as fallback
  const recipients = adminEmails.length > 0 ? adminEmails : [ADMIN_REPORT_NOTIFICATION_EMAIL]

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
    'timestamp', 'date', 'salesExecutive', 'createdBy', 'email',
    'territory', 'targetLeads', 'keyMeetings', 'industry', 'supportNeeded', 'remarks', 'aiScore',
    'callsMade', 'meetingsHeld', 'keyClients', 'dealsMovedNextStage', 'challengesFaced', 'learnings', 'score', 'isHistorical'
  ];
  const allowed = new Set(priority);
  const excluded = new Set(['id', 'ai_suggestions', 'targetLeads', 'aiScore']);
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
    territory: 'Territory',
    targetLeads: 'Target',
    keyMeetings: 'Meetings',
    focus_industry: 'Industry',
    industry: 'Industry',
    supportNeeded: 'Support',
    remarks: 'Remarks',
    aiScore: 'AI Score',
    aiScore1: 'Productivity',
    aiScore2: 'Pipeline',
    aiScore3: 'Activity',
    isHistorical: 'Historical',
    callsMade: 'Calls Made',
    meetingsHeld: 'Meetings Held',
    keyClients: 'Key Clients',
    dealsMovedNextStage: 'Deals Moved Next Stage',
    challengesFaced: 'Challenges Faced',
    learnings: 'Learnings',
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
    return `<td style="padding:12px 14px;border-bottom:1px solid #f3f4f6;white-space:normal;word-break:break-word;hyphens:auto;">${escapeHtml(value)}</td>`
  }).join('') + '</tr>').join('') + '</tbody>';

  return `<table style="width:100%;border-collapse:collapse;font-size:13px;table-layout:auto;">${header}${body}</table>`;
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

// ═══════════════════════════════════════════════════════════════
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
    callsMade: document.getElementById('eCallsMade')?.value || 0,
    meetingsHeld: document.getElementById('eMeetingsHeld')?.value || 0,
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
      console.error('EOD backend save failed:', err);
      showToast('Failed to save EOD to backend. Please check your connection.', 'error');
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
    (l.remarks && l.remarks.toLowerCase().includes(q))
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
      tbody.innerHTML = '<tr><td colspan="8" style="padding:40px;text-align:center;color:var(--gray-400);">No EOD reports found</td></tr>'
    } else {
      tbody.innerHTML = eods.slice().reverse().map(l => `
        <tr style="border-bottom:1px solid var(--gray-100);">
          <td style="padding:14px 16px;">${escapeHtml(l.date || '—')}</td>
          <td style="padding:14px 16px;">${escapeHtml(l.salesExecutive || '—')}</td>
          <td style="padding:14px 16px;">${escapeHtml(l.callsMade || 0)}</td>
          <td style="padding:14px 16px;">${escapeHtml(l.meetingsHeld || 0)}</td>
          <td style="padding:14px 16px;">${escapeHtml(l.keyClients || '—')}</td>
          <td style="padding:14px 16px;">${escapeHtml(l.dealsMovedNextStage || '—')}</td>
          <td style="padding:14px 16px;">${escapeHtml(l.challengesFaced || '—')}</td>
          <td style="padding:14px 16px;">${escapeHtml(l.learnings || '—')}</td>
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
      console.error('WOD backend save failed:', err);
      showToast('Failed to save Weekly report to backend. Please check your connection.', 'error');
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
      tbody.innerHTML = '<tr><td colspan="9" style="padding:40px;text-align:center;color:var(--gray-400);">No weekly reports found</td></tr>'
    } else {
      tbody.innerHTML = wods.slice().reverse().map(l => `
        <tr style="border-bottom:1px solid var(--gray-100);">
          <td style="padding:14px 16px;">${escapeHtml(l.weekStart || '—')} - ${escapeHtml(l.weekEnd || '—')}</td>
          <td style="padding:14px 16px;">${escapeHtml(l.salesExecutive || '—')}</td>
          <td style="padding:14px 16px;">${escapeHtml(l.target || '—')}</td>
          <td style="padding:14px 16px;">${escapeHtml(l.achieved || '—')}</td>
          <td style="padding:14px 16px;">${escapeHtml(l.dealsClosed || '—')}</td>
          <td style="padding:14px 16px;">${escapeHtml(l.hotLeads || '—')}</td>
          <td style="padding:14px 16px;">${escapeHtml(l.keyWins || '—')}</td>
          <td style="padding:14px 16px;">${escapeHtml(l.lostOpportunities || '—')}</td>
          <td style="padding:14px 16px;">${escapeHtml(l.actionPlan || '—')}</td>
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
  
  // TEMPORARY: Set assigned_to to null to test if user UUID is causing the 500 error
  // Remove this after confirming the issue
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
    assigned_to: null, // TEMPORARY: Testing without assignee
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
    notes: entry.summary || ''
  }
}

function updateLeadStatusOptions() {
  const rawStage = String(document.getElementById('ldPurpose')?.value || '')
  const stage = rawStage.trim()
  const normalizedStage = stage.replace(/\s+/g, ' ').toLowerCase()
  const statusSelect = document.getElementById('ldStatus')
  if (!statusSelect) return

  const leadStageStatusMap = {
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

  const normalizedStageMap = Object.entries(leadStageStatusMap).reduce((map, [key, value]) => {
    const normalizedKey = key.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
    map[normalizedKey] = value
    return map
  }, {})

  const options = leadStageStatusMap[stage] || normalizedStageMap[normalizedStage] || []
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

  const getFieldValue = (fieldName) => document.getElementById(`${prefix}${fieldName}`)?.value?.trim() || ''
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

  const existingJourneyLeads = getLeadsJourney() || []
  const existingCallsJourney = (typeof getCallsJourney === 'function') ? getCallsJourney() || [] : []
  const existingLeads = (() => {
    try {
      return JSON.parse(localStorage.getItem('crm_leads') || '[]') || []
    } catch (err) {
      console.warn('Invalid crm_leads data, resetting storage', err)
      localStorage.setItem('crm_leads', '[]')
      return []
    }
  })()
  const allLeads = existingLeads.concat(existingJourneyLeads).concat(existingCallsJourney)
  const newCompanyNorm = normalizeCompanyName(company)
  const newPhoneNorm = normalizePhone(document.getElementById(`${prefix}Phone`)?.value)
  const newEmailNorm = normalizeEmail(document.getElementById(`${prefix}Email`)?.value)
  const newPanNorm = normalizePAN(document.getElementById(`${prefix}PAN`)?.value)

  let duplicateLead = null
  const duplicateExists = allLeads.some(lead => {
    const existingCompanyNorm = normalizeCompanyName(getLeadCompanyName(lead))
    const existingPhoneNorm = normalizePhone(lead.contactNumber || lead.phone || lead.mobile || lead.mobileNumber || lead.contactPhone || lead.cell || '')
    const existingEmailNorm = normalizeEmail(lead.emailId || lead.email || lead.emailAddress || lead.contactEmail || lead.email_id || '')
    const existingPanNorm = normalizePAN(lead.panNumber || lead.PAN || lead.pan || lead.pan_number || '')

    const companyMatch = existingCompanyNorm && newCompanyNorm && existingCompanyNorm === newCompanyNorm
    const phoneMatch = newPhoneNorm && existingPhoneNorm && newPhoneNorm === existingPhoneNorm
    const emailMatch = newEmailNorm && existingEmailNorm && newEmailNorm === existingEmailNorm
    const panMatch = newPanNorm && existingPanNorm && newPanNorm === existingPanNorm

    // Debug log to see what's matching (commented out to reduce console spam)
    // console.log('Duplicate check:', {
    //   newCompany: company,
    //   newCompanyNorm,
    //   existingCompany: getLeadCompanyName(lead),
    //   existingCompanyNorm,
    //   companyMatch,
    //   newPhoneNorm,
    //   existingPhoneNorm,
    //   phoneMatch,
    //   newEmailNorm,
    //   existingEmailNorm,
    //   emailMatch,
    //   newPanNorm,
    //   existingPanNorm,
    //   panMatch
    // })

    if (!companyMatch && !phoneMatch && !emailMatch && !panMatch) {
      return false
    }

    if (isLeadOwnedByCurrentUser(lead)) {
      return false
    }

    const existingOutcomeCategory = getLeadOutcomeCategory(lead)
    if (existingOutcomeCategory === 'not_interested') {
      return false
    }

    const isExistingInterested = existingOutcomeCategory === 'interested'
    const isRecentDuplicate = isLeadRecentOrMine(lead, 30)
    if (!isExistingInterested && !isRecentDuplicate) {
      return false
    }

    duplicateLead = lead
    return true
  })

  if (duplicateExists) {
    resetSubmitBtn()
    
    // The assigned_to field contains a UUID, need to fetch user name
    const assignedToUuid = duplicateLead.assigned_to || duplicateLead.assignedTo || duplicateLead.salesExecutive || duplicateLead.createdByName || duplicateLead.owner
    console.log('[Duplicate Check] Duplicate lead:', duplicateLead)
    console.log('[Duplicate Check] Assigned to UUID:', assignedToUuid)
    let cleanName = 'Unknown'
    
    // If it's a UUID pattern, try to get user name from backend or localStorage
    if (assignedToUuid && typeof assignedToUuid === 'string' && assignedToUuid.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      console.log('[Duplicate Check] UUID pattern matched, fetching user name')
      // Try to get user name from localStorage users cache first
      try {
        const users = JSON.parse(localStorage.getItem('crm_users') || '[]')
        console.log('[Duplicate Check] Users from localStorage:', users)
        const user = users.find(u => u.id === assignedToUuid)
        console.log('[Duplicate Check] Found user in localStorage:', user)
        if (user && user.full_name) {
          cleanName = user.full_name
        } else if (user && user.email) {
          cleanName = user.email.split('@')[0]
        } else {
          // If not in localStorage, try to fetch from backend using public endpoint
          console.log('[Duplicate Check] User not in localStorage, fetching from backend')
          try {
            const userResponse = await fetch(`${getCRMApiBase()}/users/${assignedToUuid}/name`)
            console.log('[Duplicate Check] Backend response status:', userResponse.status)
            if (userResponse.ok) {
              const userData = await userResponse.json()
              console.log('[Duplicate Check] Backend user data:', userData)
              cleanName = userData.full_name || userData.email?.split('@')[0] || 'Unknown'
            } else {
              console.log('[Duplicate Check] Backend request failed')
              cleanName = 'another team member'
            }
          } catch (e) {
            console.log('[Duplicate Check] Backend fetch error:', e)
            cleanName = 'another team member'
          }
        }
      } catch (e) {
        console.log('[Duplicate Check] localStorage error:', e)
        cleanName = 'another team member'
      }
    } else if (assignedToUuid && typeof assignedToUuid === 'string') {
      // If it's not a UUID, treat it as a name
      console.log('[Duplicate Check] Not a UUID, treating as name:', assignedToUuid)
      cleanName = assignedToUuid.trim().split('@')[0] || 'Unknown'
    } else {
      console.log('[Duplicate Check] No assigned_to field found')
    }
    
    console.log('[Duplicate Check] Final user name:', cleanName)
    const outcomeCategory = getLeadOutcomeCategory(duplicateLead)
    const reason = outcomeCategory === 'interested'
      ? 'This company is already marked Interested'
      : 'This company already exists as a recent/relevant duplicate'
    showToast(`${reason} and is currently being handled by ${cleanName}. Please update the existing lead instead.`, 'error')
    return
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
        name: contact || company,
        company: company,
        email: entry.emailId,
        phone: entry.contactNumber,
        status: (status || 'new lead').toLowerCase(),
        source: (source || 'other').toLowerCase(),
        deal_value: parseInt(entry.dealValue.replace(/[^0-9]/g, '')) || 0,
        assigned_to: S.email,
        sales_executive: S.name,
        created_by_name: S.name
      }
      
      // Save to backend database
      const apiClient = window.CRM_API_CLIENT || (typeof CRMApiClient !== 'undefined' ? new CRMApiClient() : null)
      if (apiClient) {
        apiClient.createLead(leadData).then(async (createdLead) => {
          console.log('Lead saved to backend database', createdLead)
          
          // Create follow-up if scheduled
          const followupDate = document.getElementById('followupDate')?.value
          const followupTime = document.getElementById('followupTime')?.value
          const followupType = document.getElementById('followupType')?.value
          const followupNote = document.getElementById('followupNote')?.value
          
          if (followupDate && createdLead && createdLead.id) {
            try {
              const followupData = {
                lead_id: createdLead.id,
                assigned_to: S.id || S.email,
                followup_date: followupDate,
                followup_time: followupTime || null,
                followup_type: followupType || 'Phone Call',
                notes: followupNote || '',
                next_followup_date: followupDate,
                next_followup_time: followupTime || null
              }
              
              const followupResponse = await fetch(`${window.API_BASE}/followups`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${window.CRM_API_CLIENT?.getAuthToken() || localStorage.getItem('crm_session')?.access_token}`,
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
        }).catch(err => {
          console.warn('Failed to save lead to backend, saving locally only:', err)
        })
      }
      
      // Also save to DataStore as fallback
      DataStore.add('leads', leadData)
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
        filtered = filtered.filter(l => l.assigned_user_name === execF)
        console.log('[renderLeads] After executive filter:', filtered.length)
      }

      console.log('[renderLeads] Final filtered count:', filtered.length)
      console.log('[renderLeads] Sample lead data:', filtered[0])

      if (showing) showing.textContent = `${filtered.length} of ${response.total} entries`

      if (tbody) {
        if (filtered.length === 0) {
          tbody.innerHTML = '<tr><td colspan="10" style="padding:40px;text-align:center;color:var(--gray-400);">No leads found</td></tr>'
        } else {
          tbody.innerHTML = filtered.map((l, idx) => {
            const date = l.created_at ? new Date(l.created_at).toLocaleDateString('en-IN') : '—'
            const exec = l.assigned_user_name || '—'
            const comp = l.company_name || '—'
            const cont = l.lead_name || '—'
            const phone = l.mobile || '—'
            const prod = l.product_type || '—'
            const src = l.lead_source || '—'
            const stat = l.lead_status || '—'
            const foll = l.followup_date ? new Date(l.followup_date).toLocaleDateString('en-IN') : '—'
            let dv = l.deal_value || l.funding_amount || '—'
            if (dv !== '—' && !dv.toString().includes('₹')) dv = '₹' + Number(dv).toLocaleString('en-IN')

            return `
            <tr style="border-bottom:1px solid var(--gray-100);">
              <td style="padding:14px 16px;">${date}</td>
              <td style="padding:14px 16px;color:var(--gray-700);">${exec}</td>
              <td style="padding:14px 16px;font-weight:500;color:var(--gray-900);">${comp}</td>
              <td style="padding:14px 16px;">${cont}<br><small style="color:var(--gray-500);">${phone}</small></td>
              <td style="padding:14px 16px;">${prod}</td>
              <td style="padding:14px 16px;"><small>${src}</small></td>
              <td style="padding:14px 16px;"><span class="status-badge" data-status="${stat}">${stat}</span></td>
              <td style="padding:14px 16px;"><small>${foll}</small></td>
              <td style="padding:14px 16px;font-weight:600;">${dv}</td>
              <td style="padding:14px 16px;">
                <button class="btn-icon" onclick="viewLeadDetails(${l.id})" title="View Details">👁️</button>
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

  // Remove duplicates by ID, but preserve rows that only differ by date/source when there is no stable ID.
  const seen = new Set();
  let filtered = [];
  for (const lead of allLeads) {
    const leadId = lead.id || lead.ID || lead.uniqueId || lead.uid || `${lead.companyName}|${lead.contactPerson}|${lead.dateOfEntry || lead.created_at || ''}|${lead.leadSource || ''}`;
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
      tbody.innerHTML = '<tr><td colspan="10" style="padding:40px;text-align:center;color:var(--gray-400);">No leads found</td></tr>'
    } else {
      const displayData = filtered.slice()
      tbody.innerHTML = displayData.map((l, idx) => {
        const date = l.dateOfEntry || l.DATE || l.timestamp || '—'
        const exec = l.salesExecutive || l.EXECUTIVE || '—'
        const comp = l.companyName || l.company || l.Company || l.customerCompany || l.customerName || l.company_name || '—'
        const cont = l.contactPerson || l.leadName || l.Contact || l.CONTACT || '—'
        const phone = l.contactNumber || l.phone || l.mobile || l.MobNo || l.mobileNo || l['Contact Number'] || '—'
        const prod = l.productDiscussed || l.product || l.PRODUCT || '—'
        const src = l.leadSource || l.source || l.Source || l.SOURCE || '—'
        const stat = l.currentStatus || l.status || l.Status || l.STATUS || '—'
        const foll = l.nextFollowUp || l.firstCallDate || l['FOLLOW-UP'] || l['Follow-up'] || '—'
        let dv = l.dealValue || l.value || l.VALUE || l['DEAL VALUE'] || '—'
        if (dv !== '—' && !dv.toString().includes('₹')) dv = '₹' + dv

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
          <td style="padding:14px 16px;color:var(--gray-700);">${prod}</td>
          <td style="padding:14px 16px;color:var(--gray-700);">${src}</td>
          <td style="padding:14px 16px;">
            <span class="badge ${stat.replace(/\s+/g, '-').toLowerCase()}">${stat}</span>
          </td>
          <td style="padding:14px 16px;color:var(--gray-700);">${foll}</td>
          <td style="padding:14px 16px;color:var(--gray-700);">${dv}</td>
          <td style="padding:14px 16px;text-align:center;display:flex;justify-content:center;gap:8px;">
            <button class="btn-icon" onclick="openProfile('lead','${l.id || idx}')" title="View profile" style="background:transparent;border:none;cursor:pointer;font-size:16px;color:var(--gray-500);padding:4px 8px;border-radius:4px;transition:all 0.2s;" onmouseover="this.style.color='#2563eb'" onmouseout="this.style.color='var(--gray-500)'">👤</button>
            <button class="btn-icon" onclick="openLeadCaseManager('${l.id || idx}')" title="Manage lender cases" style="background:transparent;border:none;cursor:pointer;font-size:16px;color:var(--gray-500);padding:4px 8px;border-radius:4px;transition:all 0.2s;" onmouseover="this.style.color='#0f766e'" onmouseout="this.style.color='var(--gray-500)'">🏦</button>
            <button class="btn-icon" onclick="deleteLead('${l.id || idx}')" title="Delete lead" style="background:transparent;border:none;cursor:pointer;font-size:16px;color:var(--gray-500);padding:4px 8px;border-radius:4px;transition:all 0.2s;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='var(--gray-500)'">🗑️</button>
          </td>
        </tr>
      `}).join('')
    }
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

function refreshCaseManagement() {
  showCaseManagementSection()

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
  const lead = getLeadsJourney().find(l => String(l.id) === String(currentCaseLeadId))
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
    showToast('Lead not found', 'error')
    return
  }
  currentCaseLeadId = String(leadId)
  showCaseManagementSection()
  hideCaseApplicationForm()
  renderCaseManagementHeader(lead)
  renderLoanApplicationsTable()
}

function renderCaseManagementHeader(lead) {
  const summary = document.getElementById('caseLeadSummary')
  const stats = document.getElementById('caseSummary')
  const applications = DataStore.getLoanApplications(lead.id)
  const totalValue = applications.reduce((sum, app) => sum + Number(app.appliedAmount || app.loanAmount || 0), 0)
  const openApps = applications.filter(app => !['Rejected', 'Closed'].includes(app.applicationStatus || app.status)).length
  const openQueries = applications.reduce((sum, app) => sum + DataStore.getActiveLenderQueries(app.id).length, 0)
  const totalExpected = applications.reduce((sum, app) => sum + Number(app.expectedPayoutAmount || Math.round((Number(app.appliedAmount || app.loanAmount || 0) * Number(app.expectedPayoutPercent || 0)) / 100)), 0)

  if (summary) {
    summary.innerHTML = `<strong>${lead.companyName || lead.company || 'Unknown Company'}</strong> · Contact: ${lead.contactPerson || lead.leadName || '—'} · Status: ${lead.currentStatus || lead.status || '—'} · Deal: ${lead.dealValue ? '₹' + lead.dealValue : '—'}`
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
            <td style="padding:14px 16px;vertical-align:top;">${app.submissionDate || '—'}${app.linkedInUrl ? `<br><a href="${app.linkedInUrl}" target="_blank" rel="noopener" style="color:#2563eb;">LinkedIn</a>` : ''}</td>
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

function deleteLoanApplication(applicationId) {
  if (!confirm('Delete this loan application?')) return
  const id = Number(applicationId)
  const stored = DataStore.getAll()
  stored.loanApplications = stored.loanApplications.filter(app => Number(app.id) !== id)
  stored.lenderQueries = stored.lenderQueries.filter(q => Number(q.applicationId) !== id)
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

function renderForecasting() {
  const pipelineData = DataStore.getPipelineData()
  const forecastContainer = document.getElementById('forecast-by-stage')

  if (!forecastContainer) return

  const totalValue = pipelineData.reduce((sum, s) => sum + s.value, 0)

  forecastContainer.innerHTML = pipelineData.map(stage => {
    const percentage = totalValue > 0 ? Math.round((stage.value / totalValue) * 100) : 0
    const weightedValue = Math.round(stage.value * (stage.stage === 'closed-won' ? 1 : stage.stage === 'closed-lost' ? 0 : 0.3))

    return `
      <div class="forecast-stage" style="margin-bottom:20px;padding:16px;background:#fff;border:1px solid var(--gray-200);border-radius:var(--radius);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div style="font-weight:600;color:var(--gray-900);">${stage.label}</div>
          <div style="font-size:12px;color:var(--gray-500);">${stage.count} deals</div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <div style="flex:1;height:8px;background:var(--gray-100);border-radius:4px;overflow:hidden;">
            <div style="width:${percentage}%;height:100%;background:var(--maroon);border-radius:4px;"></div>
          </div>
          <div style="font-size:13px;font-weight:500;color:var(--gray-700);min-width:80px;text-align:right;">₹${(stage.value / 100000).toFixed(1)}L</div>
        </div>
        <div style="font-size:12px;color:var(--gray-500);">Weighted: ₹${(weightedValue / 100000).toFixed(1)}L</div>
      </div>
    `
  }).join('')

  // Summary
  const totalOpen = pipelineData.filter(s => !['closed-won', 'closed-lost'].includes(s.stage)).reduce((sum, s) => sum + s.value, 0)
  const wonValue = pipelineData.find(s => s.stage === 'closed-won')?.value || 0

  const forecastSummary = document.getElementById('forecast-summary')
  if (forecastSummary) {
    forecastSummary.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding:20px;background:var(--gray-50);border-radius:var(--radius);">
        <div style="text-align:center;">
          <div style="font-size:24px;font-weight:700;color:var(--gray-900);">₹${(totalOpen / 100000).toFixed(1)}L</div>
          <div style="font-size:12px;color:var(--gray-500);">Pipeline Value</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:24px;font-weight:700;color:var(--success);">₹${(wonValue / 100000).toFixed(1)}L</div>
          <div style="font-size:12px;color:var(--gray-500);">Won This Month</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:24px;font-weight:700;color:var(--maroon);">₹${(totalOpen * 0.3 / 100000).toFixed(1)}L</div>
          <div style="font-size:12px;color:var(--gray-500);">Forecast (30%)</div>
        </div>
      </div>
    `
  }
}

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
  const response = await fetch(`http://localhost:8000/reports/${encodeURIComponent(reportType)}`, {
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
      const value = String(emp.email || emp.name || emp.id || '').trim()
      const label = emp.name || emp.email || 'Unnamed executive'
      // Skip Shree Rathod
      if (label.toLowerCase().includes('shree rathod')) return
      if (!value || seen.has(value.toLowerCase())) return
      seen.add(value.toLowerCase())
      options.push({ value, label })
    })

    users.forEach(user => {
      const value = String(user.email || user.userEmail || user.emailAddress || user.displayName || user.name || '').trim()
      const label = user.name || user.displayName || user.email || 'Unnamed executive'
      // Skip Shree Rathod
      if (label.toLowerCase().includes('shree rathod')) return
      if (!value || seen.has(value.toLowerCase())) return
      seen.add(value.toLowerCase())
      options.push({ value, label })
    })

    execSelect.innerHTML = '<option value="">Select executive</option>' + options.map(opt => `<option value="${escapeHtml(opt.value)}">${escapeHtml(opt.label)}</option>`).join('')
  }

  clearTargetForm()
  modal.classList.add('open')
  modal.style.display = 'flex'
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

function submitTarget() {
  const executive = document.getElementById('targetExecutive')?.value?.trim()
  const callTarget = document.getElementById('targetCall')?.value
  const leadTarget = document.getElementById('targetLead')?.value
  const weekLeadTarget = document.getElementById('targetWeekLead')?.value
  const dueDate = document.getElementById('targetDueDate')?.value
  const notes = document.getElementById('targetNotes')?.value?.trim() || ''

  if (!executive) { showToast('Please select a sales executive', 'error'); return }
  if (!dueDate) { showToast('Please select a due date', 'error'); return }

  const target = {
    id: 'TARG-' + Date.now(),
    salesExecutive: executive,
    callTarget: Number(callTarget) || 0,
    leadTarget: Number(leadTarget) || 0,
    weekLeadTarget: Number(weekLeadTarget) || 0,
    dueDate,
    notes,
    createdAt: new Date().toISOString()
  }

  DataStore.add('targets', target)
  closeTargetModal()
  renderTargets()
  notifyExecutivePanel(executive)
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
        <td style="padding:14px 16px;color:var(--gray-700);">${c.company || '—'}</td>
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
  const deals = DataStore.get('deals')
  const tbody = document.getElementById('dealsTableBody')
  if (!tbody) return

  if (deals.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="padding:40px;text-align:center;color:var(--gray-400);">No deals found</td></tr>'
  } else {
    tbody.innerHTML = deals.map(d => `
      <tr style="border-bottom:1px solid var(--gray-100);">
        <td style="padding:14px 16px;">
          <div style="font-weight:500;color:var(--gray-900);">${d.name}</div>
          <div style="font-size:12px;color:var(--gray-500);">${d.company || '—'}</div>
        </td>
        <td style="padding:14px 16px;color:var(--gray-700);">₹${(d.value / 100000).toFixed(1)}L</td>
        <td style="padding:14px 16px;">
          <span class="badge ${d.stage}">${d.stage || '—'}</span>
        </td>
        <td style="padding:14px 16px;color:var(--gray-700);">${d.probability || 0}%</td>
        <td style="padding:14px 16px;color:var(--gray-700);">${d.closeDate || '—'}</td>
      </tr>
    `).join('')
  }

  const showing = document.getElementById('dealsShowing')
  if (showing) showing.textContent = deals.length
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
function renderIntegrations() {}
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
    if (assigneeSelect && assigneeSelect.options.length <= 1) {
      employees.forEach(e => {
        const option = document.createElement('option')
        option.value = String(e.id || e.user_id || e.userId || e.employee_id || e.email || '').trim()
        option.textContent = e.name
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
    tbody.innerHTML = `<tr><td colspan="7" style="padding:40px;text-align:center;color:var(--gray-400);">${isAssigner ? 'No tasks found. Assign tasks using the form.' : 'No tasks assigned to you yet.'}</td></tr>`
    return
  }

  tbody.innerHTML = tasks.map(task => {
    const isOverdue = !task.completed && task.dueDate && task.dueDate < new Date().toISOString().split('T')[0]
    const assignee = employees.find(e => {
      const email = String(e.email || '').toLowerCase()
      const id = String(e.id || e.user_id || e.userId || e.employee_id || e.employeeId || '').toLowerCase()
      return email === String(task.assignedTo || '').toLowerCase() || id === String(task.assignedToId || task.assigned_to || '').toLowerCase()
    }) || { name: task.assignedTo || 'Unknown' }

    return `
      <tr style="border-bottom:1px solid var(--gray-100);">
        <td style="padding:14px 16px;"><input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTaskStatus('${task.id}')"></td>
        <td style="padding:14px 16px;cursor:pointer;" onclick="openTaskDetailModal('${task.id}')" title="Click to view full task description">
          <div style="font-weight:500;color:var(--gray-900);">${task.title}</div>
          <div style="font-size:12px;color:var(--gray-500);">${task.description || task.notes || ''}</div>
        </td>
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
        <td style="padding:14px 16px;text-align:center;">
          ${isAssigner ? `<button class="btn-secondary" onclick="deleteTask('${task.id}')" title="Remove task" style="padding:8px 10px;font-size:13px;min-width:80px;">🗑️ Remove</button>` : '—'}
        </td>
      </tr>
    `
  }).join('')
}

function toggleTaskStatus(taskId) {
  const tasks = DataStore.get('tasks') || []
  const task = tasks.find(t => t.id === taskId)
  if (task) {
    task.completed = !task.completed
    DataStore.set('tasks', tasks)
    showToast(task.completed ? 'Task completed!' : 'Task reopened', 'success')
    renderTasksTable()
  }
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

  // Delete from backend FIRST - localStorage cleanup happens after
  try {
    if (typeof postToCRMBackendEndpoint === 'function') {
      await postToCRMBackendEndpoint(`tasks/${encodeURIComponent(String(taskId))}`, null, 'DELETE');
    }
  } catch (err) {
    console.error('Task backend delete failed:', err);
    showToast('Failed to delete task from backend. Please check your connection.', 'error');
    return;
  }

  // Only remove from localStorage AFTER successful backend delete (for caching)
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
  const date = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (dateStr === today.toISOString().split('T')[0]) return 'Today'
  if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Tomorrow'

  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
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
  const dueDateText = task.dueDate ? formatDate(task.dueDate) : 'Not set'
  const completedText = task.completed ? 'Completed' : 'Pending'
  const priorityText = task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : 'Medium'
  const descriptionText = task.description || task.notes || 'No additional description provided.'

  const modal = document.getElementById('taskDetailModal')
  if (!modal) return

  const titleEl = modal.querySelector('.modal-title')
  if (titleEl) titleEl.textContent = task.title || 'Task Details'
  const bodyEl = modal.querySelector('.modal-body')
  if (bodyEl) bodyEl.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:12px;line-height:1.6;">
      <div><strong>Status:</strong> ${completedText}</div>
      <div><strong>Assigned To:</strong> ${assigneeName}</div>
      <div><strong>Priority:</strong> ${priorityText}</div>
      <div><strong>Due Date:</strong> ${dueDateText}</div>
      <div><strong>Description:</strong></div>
      <div style="padding:12px;background:var(--gray-50);border-radius:12px;color:var(--gray-800);white-space:pre-wrap;">${descriptionText}</div>
      ${task.relatedTo ? `<div><strong>Related To:</strong> ${task.relatedTo}</div>` : ''}
      ${task.type ? `<div><strong>Task Type:</strong> ${task.type}</div>` : ''}
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
    <div style="display:grid;grid-template-columns:140px 1fr;gap:12px;align-items:flex-start;margin-bottom:12px;">
      <div style="font-weight:600;color:var(--gray-700);">${label}</div>
      <div style="color:var(--gray-900);">${value || '—'}</div>
    </div>`

  const formatRowTwoCol = (label, value) => `
    <div style="display:flex;gap:12px;flex-direction:column;">
      <div style="font-weight:600;color:var(--gray-700);font-size:12px;">${label}</div>
      <div style="color:var(--gray-900);">${value || '—'}</div>
    </div>`

  let name = ''
  if (type === 'contact') {
    name = profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Contact Profile'
  } else {
    name = profile.companyName || profile.company || profile.leadName || 'Lead Profile'
  }
  titleEl.textContent = name

  // Tab content for each section
  const customerDetailsTab = `
    <div style="display:grid;gap:14px;">
      ${formatRow('Customer ID', profile.customerId || profile.leadId || '—')}
      ${formatRow('Industry', profile.industry || '—')}
      ${formatRow('Entity Type', profile.entityType || profile.type || '—')}
      ${formatRow('GST', profile.gst || '—')}
      ${formatRow('PAN', profile.pan || '—')}
    </div>`

  const companyInfoTab = `
    <div style="display:grid;gap:14px;">
      ${formatRow('Company Name', profile.companyName || profile.company || '—')}
      ${formatRow('Annual Turnover', profile.annualTurnover ? (profile.annualTurnover.toString().startsWith('₹') ? profile.annualTurnover : '₹' + profile.annualTurnover) : '—')}
      ${formatRow('Registered City', profile.registeredCity || profile.city || '—')}
      ${formatRow('Employees', profile.employees || profile.numberOfEmployees || '—')}
      ${formatRow('Address', profile.address || '—')}
      ${formatRow('Registration Date', profile.registrationDate || '—')}
    </div>`

  const contactDetailsTab = `
    <div style="display:grid;gap:14px;">
      ${formatRow('Contact Person', profile.contactPerson || profile.leadName || '—')}
      ${formatRow('Title', profile.title || '—')}
      ${formatRow('Email', profile.emailId || profile.email || '—')}
      ${formatRow('Phone', profile.contactNumber || profile.phone || '—')}
      ${formatRow('Relationship Manager', profile.relationshipManager || profile.accountManager || '—')}
      ${formatRow('Source', profile.leadSource || profile.source || '—')}
    </div>`

  const fundingTab = `
    <div style="display:grid;gap:14px;">
      ${formatRow('Total Funding Required', profile.totalFunding ? (profile.totalFunding.toString().startsWith('₹') ? profile.totalFunding : '₹' + profile.totalFunding) : '—')}
      ${formatRow('Best Offer Received', profile.bestOffer ? (profile.bestOffer.toString().startsWith('₹') ? profile.bestOffer : '₹' + profile.bestOffer) : '—')}
      ${formatRow('Lenders Approached', profile.lendersApproached || '—')}
      ${formatRow('Current Status', profile.currentStatus || profile.status || '—')}
      ${formatRow('Deal Value', profile.dealValue ? (profile.dealValue.toString().startsWith('₹') ? profile.dealValue : '₹' + profile.dealValue) : '—')}
      ${formatRow('Funding Stage', profile.fundingStage || '—')}
    </div>`

  const documentVaultTab = `
    <div style="display:grid;gap:14px;">
      <div style="padding:12px;background:var(--gray-50);border-radius:6px;border:1px dashed var(--gray-300);color:var(--gray-600);font-size:13px;text-align:center;">
        <div style="margin-bottom:8px;">📄</div>
        Documents: ${profile.documents && profile.documents.length > 0 ? profile.documents.length + ' file(s)' : 'No documents uploaded'}
      </div>
      ${profile.documents && profile.documents.length > 0 ? `
        <div style="display:grid;gap:8px;">
          ${profile.documents.map((doc, idx) => `
            <div style="padding:8px 12px;background:var(--gray-50);border-radius:4px;display:flex;justify-content:space-between;align-items:center;font-size:12px;">
              <span>${doc.name || 'Document ' + (idx + 1)}</span>
              <span style="color:var(--gray-500);">${doc.type || 'file'}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${formatRow('Last Updated', profile.documentsUpdated || '—')}
    </div>`

  const supportingSectionsTab = `
    <div style="display:grid;gap:16px;">
      <div style="border-bottom:1px solid var(--gray-200);padding-bottom:12px;">
        <h4 style="margin:0 0 8px 0;font-size:13px;font-weight:600;color:var(--gray-800);">Lender Query</h4>
        <div style="color:var(--gray-700);font-size:12px;line-height:1.5;">
          ${profile.lenderQuery || profile.notes || 'No queries registered'}
        </div>
      </div>
      <div style="border-bottom:1px solid var(--gray-200);padding-bottom:12px;">
        <h4 style="margin:0 0 8px 0;font-size:13px;font-weight:600;color:var(--gray-800);">Timeline</h4>
        <div style="display:grid;gap:8px;font-size:12px;">
          ${formatRow('Created', profile.dateOfEntry || profile.timestamp || '—')}
          ${formatRow('Last Follow-up', profile.nextFollowUp || profile.firstCallDate || '—')}
          ${formatRow('Expected Closure', profile.expectedClosure || profile.closureDate || '—')}
        </div>
      </div>
      <div style="border-bottom:1px solid var(--gray-200);padding-bottom:12px;">
        <h4 style="margin:0 0 8px 0;font-size:13px;font-weight:600;color:var(--gray-800);">Tasks</h4>
        <div style="padding:8px 12px;background:var(--gray-50);border-radius:4px;font-size:12px;color:var(--gray-600);">
          ${profile.tasks && profile.tasks.length > 0 ? profile.tasks.length + ' task(s)' : 'No active tasks'}
        </div>
      </div>
      <div style="border-bottom:1px solid var(--gray-200);padding-bottom:12px;">
        <h4 style="margin:0 0 8px 0;font-size:13px;font-weight:600;color:var(--gray-800);">Meetings</h4>
        <div style="padding:8px 12px;background:var(--gray-50);border-radius:4px;font-size:12px;color:var(--gray-600);">
          ${profile.meetings && profile.meetings.length > 0 ? profile.meetings.length + ' meeting(s) scheduled' : 'No meetings scheduled'}
        </div>
      </div>
      <div>
        <h4 style="margin:0 0 8px 0;font-size:13px;font-weight:600;color:var(--gray-800);">Deal Summary</h4>
        <div style="color:var(--gray-700);font-size:12px;line-height:1.5;">
          ${profile.dealSummary || 'No summary available'}
        </div>
      </div>
    </div>`

  // Tabs HTML
  const tabsHTML = `
    <div style="display:flex;gap:4px;border-bottom:1px solid var(--gray-200);margin-bottom:16px;overflow-x:auto;">
      <button class="profile-tab-btn" data-tab="customer" onclick="switchProfileTab('customer')" style="padding:10px 16px;font-size:12px;font-weight:500;color:var(--gray-500);border:none;background:none;border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap;transition:all 0.2s;flex-shrink:0;">Customer Details</button>
      <button class="profile-tab-btn" data-tab="company" onclick="switchProfileTab('company')" style="padding:10px 16px;font-size:12px;font-weight:500;color:var(--gray-500);border:none;background:none;border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap;transition:all 0.2s;flex-shrink:0;">Company Info</button>
      <button class="profile-tab-btn" data-tab="contact" onclick="switchProfileTab('contact')" style="padding:10px 16px;font-size:12px;font-weight:500;color:var(--gray-500);border:none;background:none;border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap;transition:all 0.2s;flex-shrink:0;">Contact Details</button>
      <button class="profile-tab-btn" data-tab="funding" onclick="switchProfileTab('funding')" style="padding:10px 16px;font-size:12px;font-weight:500;color:var(--gray-500);border:none;background:none;border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap;transition:all 0.2s;flex-shrink:0;">Funding</button>
      <button class="profile-tab-btn" data-tab="documents" onclick="switchProfileTab('documents')" style="padding:10px 16px;font-size:12px;font-weight:500;color:var(--gray-500);border:none;background:none;border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap;transition:all 0.2s;flex-shrink:0;">Documents</button>
      <button class="profile-tab-btn" data-tab="supporting" onclick="switchProfileTab('supporting')" style="padding:10px 16px;font-size:12px;font-weight:500;color:var(--gray-500);border:none;background:none;border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap;transition:all 0.2s;flex-shrink:0;">Supporting Info</button>
    </div>

    <div id="profileTabCustomer" class="profile-tab-content" style="display:block;">${customerDetailsTab}</div>
    <div id="profileTabCompany" class="profile-tab-content" style="display:none;">${companyInfoTab}</div>
    <div id="profileTabContact" class="profile-tab-content" style="display:none;">${contactDetailsTab}</div>
    <div id="profileTabFunding" class="profile-tab-content" style="display:none;">${fundingTab}</div>
    <div id="profileTabDocuments" class="profile-tab-content" style="display:none;">${documentVaultTab}</div>
    <div id="profileTabSupporting" class="profile-tab-content" style="display:none;">${supportingSectionsTab}</div>
  `

  bodyEl.innerHTML = tabsHTML

  // Set active tab styling
  const firstBtn = bodyEl.querySelector('[data-tab="customer"]')
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

function openDealModal() {
  const modal = document.getElementById('dealModal')
  if (modal) modal.style.display = 'flex'
}

function closeDealModal() {
  const modal = document.getElementById('dealModal')
  if (modal) modal.style.display = 'none'
  clearDealForm()
}

function clearDealForm() {
  ;['dealName', 'dealCompany', 'dealContact', 'dealValue', 'dealCloseDate', 'dealProbability', 'dealDescription'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.value = ''
  })
  ;['dealStage', 'dealSource'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.selectedIndex = 0
  })
}

function submitDeal() {
  const name = document.getElementById('dealName')?.value?.trim()
  const company = document.getElementById('dealCompany')?.value?.trim()
  const value = document.getElementById('dealValue')?.value

  if (!name) { showToast('Please enter deal name', 'error'); return }
  if (!company) { showToast('Please enter company name', 'error'); return }
  if (!value) { showToast('Please enter deal value', 'error'); return }

  const deal = {
    id: 'DEAL-' + Date.now(),
    name,
    company,
    contact: document.getElementById('dealContact')?.value?.trim() || '',
    value: parseFloat(value) || 0,
    stage: document.getElementById('dealStage')?.value || 'prospecting',
    closeDate: document.getElementById('dealCloseDate')?.value || '',
    probability: parseInt(document.getElementById('dealProbability')?.value) || 20,
    source: document.getElementById('dealSource')?.value || 'other',
    description: document.getElementById('dealDescription')?.value?.trim() || '',
    createdAt: new Date().toISOString(),
    assignedTo: S?.email || ''
  }

  DataStore.add('deals', deal)
  closeDealModal()
  renderDeals()
  renderDashboard()
  showToast('Deal created successfully', 'success')
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

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="padding:40px;text-align:center;color:var(--gray-400);">No calls found</td></tr>'
  } else {
    tbody.innerHTML = filtered.slice().reverse().map(c => `
      <tr style="border-bottom:1px solid var(--gray-100);">
        <td style="padding:14px 16px;">${c.date || '—'}<br><span style="font-size:11px;color:var(--gray-500);">${c.time || ''}</span></td>
        <td style="padding:14px 16px;font-weight:500;">${c.customer || c.customerName || '—'}</td>
        <td style="padding:14px 16px;color:var(--gray-700);">${c.company || '—'}</td>
        <td style="padding:14px 16px;color:var(--gray-700);">${c.email || '—'}</td>
        <td style="padding:14px 16px;color:var(--gray-700);">${c.phone || '—'}</td>
        <td style="padding:14px 16px;color:var(--gray-700);">${c.direction || c.callType || '—'}</td>
        <td style="padding:14px 16px;color:var(--gray-700);">${c.duration || '—'}</td>
        <td style="padding:14px 16px;"><span class="badge ${c.outcome?.toLowerCase().replace(/\s+/g, '-')}">${c.outcome || '—'}</span></td>
        <td style="padding:14px 16px;"><span class="badge ${c.priority?.toLowerCase()}">${c.priority || '—'}</span></td>
        <td style="padding:14px 16px;color:var(--gray-700);">${c.followupDate || '—'}</td>
        <td style="padding:14px 16px;color:var(--gray-700);">${c.agent || c.agentName || '—'}</td>
        <td style="padding:14px 16px;">${c.recording ? '▶️' : '—'}</td>
        <td style="padding:14px 16px;"><button class="btn-icon" onclick="showToast('Call details - Coming Soon', 'info')">👁️</button></td>
      </tr>
    `).join('')
  }
}

// Make globally available
window.renderCalls = renderCalls
window.renderDocuments = renderDocuments
window.renderSODHistory = renderSODHistory
window.renderEODHistory = renderEODHistory
window.renderWODHistory = renderWODHistory
window.renderLeads = renderLeads
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

