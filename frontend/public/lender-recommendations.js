// Guided lender recommendation workflow for the CRM
let lenderApiBase = (window.API_BASE || (window.getCRMApiBase && window.getCRMApiBase && window.getCRMApiBase()) || '')
if (typeof lenderApiBase === 'function') lenderApiBase = lenderApiBase()
lenderApiBase = (lenderApiBase || '').replace(/\/$/, '')
if (!lenderApiBase && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  lenderApiBase = 'http://127.0.0.1:8085'
}
function lenderApiPath(path) {
  if (!path.startsWith('/')) path = '/' + path
  return lenderApiBase ? lenderApiBase + path : path
}

function resolveLeadId(explicitLeadId) {
  let leadIdValue = String(explicitLeadId || window.currentCaseLeadId || (typeof currentCaseLeadId !== 'undefined' && currentCaseLeadId) || window.currentLeadId || document.getElementById('caseParentLeadId')?.value || '').trim()
  if (!leadIdValue) {
    try {
      const journeyLeads = typeof getLeadsJourney === 'function' ? getLeadsJourney() || [] : []
      const firstJourneyLead = journeyLeads[0]
      if (firstJourneyLead) {
        leadIdValue = String(firstJourneyLead.id || firstJourneyLead.lead_id || firstJourneyLead.leadId || '').trim()
      }
    } catch (e) {
      // ignore
    }
  }
  if (!leadIdValue && typeof window.DataStore === 'object' && typeof window.DataStore.get === 'function') {
    try {
      const storeLeads = window.DataStore.get('leads') || []
      const firstStoreLead = Array.isArray(storeLeads) ? storeLeads[0] : null
      if (firstStoreLead) {
        leadIdValue = String(firstStoreLead.id || firstStoreLead.lead_id || firstStoreLead.leadId || '').trim()
      }
    } catch (e) {
      // ignore
    }
  }
  return leadIdValue
}

function findWorkflowLead(leadId) {
  const targetId = resolveLeadId(leadId)
  const candidates = [
    targetId,
    document.getElementById('caseParentLeadId')?.value || '',
    window.currentCaseLeadId || '',
    window.currentWorkflowLeadId || '',
    window.currentLeadId || ''
  ].map(v => String(v || '').trim()).filter(Boolean)

  const searchJourney = () => {
    if (typeof getLeadsJourney !== 'function') return null
    const leads = getLeadsJourney() || []
    return leads.find(lead => {
      const leadIds = [lead.id, lead.lead_id, lead.leadId, lead.LeadID, lead.ID, lead.uid, lead.UID]
      return leadIds.some(id => String(id || '').trim() && candidates.includes(String(id || '').trim()))
    }) || null
  }

  const searchDataStore = () => {
    if (typeof window.DataStore !== 'object' || typeof window.DataStore.get !== 'function') return null
    const leads = window.DataStore.get('leads') || []
    return Array.isArray(leads)
      ? leads.find(lead => {
          const leadIds = [lead.id, lead.lead_id, lead.leadId, lead.LeadID, lead.ID, lead.uid, lead.UID]
          return leadIds.some(id => String(id || '').trim() && candidates.includes(String(id || '').trim()))
        }) || null
      : null
  }

  const searchByHelper = () => {
    if (typeof findLeadById !== 'function') return null
    return findLeadById(targetId)
  }

  return searchJourney() || searchDataStore() || searchByHelper() || null
}

function buildLenderRequestPayloadFromLead(lead) {
  if (!lead || typeof lead !== 'object') return null
  const productValue = lead.productType || lead.product_type || lead.loanType || lead.productDiscussed || lead.product || lead.product_service || lead.PRODUCT || ''
  if (!productValue) return null

  const rawAmount = Number(lead.dealValue || lead.funding_amount || lead.deal_value || lead.loanAmount || lead.appliedAmount || 0)
  const loanAmountLakhs = rawAmount ? Number((rawAmount / 100000).toFixed(2)) : 1000
  const turnoverRaw = Number(lead.turnover || lead.annualTurnover || lead.annual_turnover || lead.turnover_cr || 0)
  const annualTurnoverCr = turnoverRaw || 20

  return {
    product_type: productValue,
    business_type: lead.business_type || lead.industry || lead.lead_source || 'manufacturing',
    vintage_years: Number(lead.vintage_years || lead.vintage || 3),
    annual_turnover_cr: Number(annualTurnoverCr),
    cibil: Number(lead.cibil || lead.cibil_score || 700),
    atnw_positive: lead.atnw_positive !== undefined ? Boolean(lead.atnw_positive) : true,
    dscr: Number(lead.dscr || 1.2),
    loan_amount_lakhs: Number(lead.loan_amount_lakhs || loanAmountLakhs),
    loan_tenure_days: Number(lead.loan_tenure_days || lead.tenure_days || 90),
    owned_property: lead.owned_property !== undefined ? Boolean(lead.owned_property) : false,
    sector: lead.sector || null,
  }
}

function normalizeProductString(value) {
  if (value === null || value === undefined) return ''
  return String(value).trim().toLowerCase()
}

function parseLenderProducts(products) {
  if (Array.isArray(products)) {
    return products.map(p => normalizeProductString(p)).filter(Boolean)
  }
  if (typeof products === 'string') {
    try {
      const parsed = JSON.parse(products)
      if (Array.isArray(parsed)) {
        return parseLenderProducts(parsed)
      }
    } catch (e) {
      // not JSON, continue with raw string
    }
    return [normalizeProductString(products)].filter(Boolean)
  }
  return []
}

function mapLeadProductToProductTokens(product) {
  const normalized = normalizeProductString(product)
  if (!normalized) return []

  const tokens = [normalized]
  if (normalized.includes('working capital') || normalized.includes('wctl')) {
    tokens.push('wctl', 'working capital')
  }
  if (normalized.includes('invoice') || normalized.includes('sid') || normalized.includes('supply chain') || normalized.includes('discounting')) {
    tokens.push('sid', 'invoice', 'supply chain', 'treds')
  }
  if (normalized.includes('supply chain') || normalized.includes('scf') || normalized.includes('treds') || normalized.includes('anchor')) {
    tokens.push('scf', 'treds', 'anchor-led', 'anchor led', 'anchor')
  }
  if (normalized.includes('term loan') || normalized.includes('business loan') || normalized.includes('bl')) {
    tokens.push('term loan', 'business loan', 'pid')
  }
  if (normalized.includes('loan against property') || normalized.includes('lap')) {
    tokens.push('loan against property', 'lap')
  }
  if (normalized.includes('home loan') || normalized.includes('hl')) {
    tokens.push('home loan', 'hl')
  }
  if (normalized.includes('personal loan') || normalized.includes('pl')) {
    tokens.push('personal loan', 'pl')
  }
  if (normalized.includes('equipment') || normalized.includes('msme')) {
    tokens.push('equipment loan', 'msme')
  }

  return Array.from(new Set(tokens))
}

function doesLenderProductMatchLeadProduct(product, lenderProducts) {
  const leadProduct = normalizeProductString(product)
  if (!leadProduct) return false

  const lenderList = parseLenderProducts(lenderProducts)
  if (!lenderList.length) return false

  const leadTokens = mapLeadProductToProductTokens(leadProduct)
  return lenderList.some(lenderProduct => {
    if (!lenderProduct) return false
    if (lenderProduct.includes(leadProduct) || leadProduct.includes(lenderProduct)) return true
    return leadTokens.some(token => lenderProduct.includes(token) || token.includes(lenderProduct))
  })
}

async function openLenderRecommendationsForLead(lead, leadId) {
  const payload = buildLenderRequestPayloadFromLead(lead)
  if (!payload) return false

  const btn = document.getElementById('lr_submit_button')
  if (btn) {
    btn.disabled = true
    btn.textContent = 'Finding lenders…'
  }

  try {
    const saveUrl = lenderApiPath(`/api/leads/${encodeURIComponent(leadId)}/capture-lender-requirements`)
    const reqRes = await fetch(saveUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
    if (!reqRes.ok) {
      const txt = await reqRes.text().catch(() => '')
      throw new Error('Unable to save lender requirements: ' + (txt || reqRes.status))
    }

    const recUrl = lenderApiPath(`/api/leads/${encodeURIComponent(leadId)}/recommendations`)
    const res = await fetch(recUrl)
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error('Unable to load lender recommendations: ' + (txt || res.status))
    }
    const data = await res.json()
    renderLenderRecommendations(data.results || [], leadId)
    return true
  } catch (err) {
    console.error('openLenderRecommendationsForLead failed', err)
    if (typeof showToast === 'function') showToast('Failed to load lender recommendations: ' + (err.message || ''), 'error')
    return false
  } finally {
    if (btn) {
      btn.disabled = false
      btn.textContent = 'Find lenders'
    }
  }
}

function ensureBackdrop() {
  const existing = document.getElementById('modalBackdrop')
  if (existing) return existing
  const backdrop = document.createElement('div')
  backdrop.id = 'modalBackdrop'
  backdrop.style.position = 'fixed'
  backdrop.style.inset = '0'
  backdrop.style.background = 'rgba(15, 23, 42, 0.65)'
  backdrop.style.backdropFilter = 'blur(4px)'
  backdrop.style.zIndex = '1000'
  backdrop.onclick = () => { closeLenderRequirementsModal(); closeLosModal(); }
  document.body.appendChild(backdrop)
  return backdrop
}

function openLenderRequirementsModal(leadId) {
  const effectiveLeadId = resolveLeadId(leadId)
  window.currentWorkflowLeadId = effectiveLeadId
  const lead = findWorkflowLead(effectiveLeadId)

  if (!effectiveLeadId || !lead) {
    if (typeof showToast === 'function') showToast('Please select a valid lead before suggesting lenders', 'error')
    else alert('Please select a valid lead before suggesting lenders')
    return
  }

  const payload = buildLenderRequestPayloadFromLead(lead)
  if (!payload) {
    if (typeof showToast === 'function') showToast('Unable to infer lender requirements from this lead', 'error')
    else alert('Unable to infer lender requirements from this lead')
    return
  }

  // If the lead contains a product, try to show matching lenders directly
  (async function showLendersByProduct() {
    try {
      const product = payload.product_type
      if (product) {
        const url = lenderApiPath('/lenders-management/')
        const res = await fetch(url)
        if (res.ok) {
          const all = await res.json()
          const matches = (all || []).filter(item => {
            try {
              const products = item.products || item.product || []
              return doesLenderProductMatchLeadProduct(product, products)
            } catch (e) { return false }
          }).map(item => ({
            lender_id: item.id || item.lender_id || item.slug || item.name,
            lender_name: item.name || item.slug || item.lender_name || 'Lender',
            roi: item.roi || item.rates || null,
            match_score: 100,
            reason: `Matches product ${product}`
          }))

          if (matches.length) {
            renderLenderRecommendations(matches, effectiveLeadId)
            return
          }
        }
      }
    } catch (e) {
      console.warn('Failed to fetch lenders by product', e)
    }

    // fallback to the full recommendations flow if no direct matches found
    openLenderRecommendationsForLead(lead, effectiveLeadId)
  })()
}

function closeLenderRequirementsModal() {
  const modal = document.getElementById('lenderRequirementsModal')
  if (modal) modal.style.display = 'none'
  const backdrop = document.getElementById('modalBackdrop')
  if (backdrop) backdrop.style.display = 'none'
}


function renderLenderRecommendations(list, leadId) {
  let container = document.getElementById('lenderRecommendationsContainer')
  if (!container) {
    container = document.createElement('div')
    container.id = 'lenderRecommendationsContainer'
    container.style.position = 'fixed'
    container.style.right = '20px'
    container.style.top = '20px'
    container.style.width = '440px'
    container.style.maxHeight = '90vh'
    container.style.overflow = 'auto'
    container.style.background = '#fff'
    container.style.borderRadius = '18px'
    container.style.boxShadow = '0 20px 60px rgba(0,0,0,0.2)'
    container.style.border = '1px solid #e5e7eb'
    container.style.zIndex = '1200'
    document.body.appendChild(container)
  }

  container.innerHTML = `
    <div style="padding:16px 16px 0;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <div>
          <div style="font-size:12px;color:#6366f1;font-weight:700;text-transform:uppercase;letter-spacing:.16em;">Step 2</div>
          <div style="font-size:20px;font-weight:700;color:#0f172a;">Recommended lenders</div>
        </div>
        <button type="button" onclick="document.getElementById('lenderRecommendationsContainer').remove()" style="border:0;background:transparent;cursor:pointer;font-size:20px;">×</button>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;">
        <label style="font-size:13px;color:#475569;">Sort<select id="lr_sort" style="margin-left:8px;padding:8px 10px;border:1px solid #dbe4f0;border-radius:8px;"><option value="score">Match %</option><option value="roi">ROI</option></select></label>
        <label style="font-size:13px;color:#475569;">Min match<input id="lr_min_match" type="number" value="0" min="0" max="100" style="margin-left:8px;width:64px;padding:8px 10px;border:1px solid #dbe4f0;border-radius:8px;"/></label>
      </div>
    </div>
  `

  const sortBy = document.getElementById('lr_sort')?.value || 'score'
  const minMatch = Number(document.getElementById('lr_min_match')?.value || 0)
  const normalized = (list || []).slice().map(item => ({ ...item, _match_score: Number(item.match_score ?? item.score ?? 0) }))
  normalized.sort((a, b) => {
    if (sortBy === 'roi') {
      const aRoi = parseFloat(String(a.roi || '').replace(/[^\d.\-]/g, '')) || 0
      const bRoi = parseFloat(String(b.roi || '').replace(/[^\d.\-]/g, '')) || 0
      return bRoi - aRoi
    }
    return b._match_score - a._match_score
  })

  const visibleResults = normalized.filter(item => item._match_score >= minMatch)
  if (visibleResults.length === 0) {
    const empty = document.createElement('div')
    empty.style.padding = '0 16px 16px'
    empty.style.color = '#64748b'
    empty.textContent = 'No lenders match the current criteria. Try lowering the threshold or widening the requirements.'
    container.appendChild(empty)
    return
  }

  const resultsWrapper = document.createElement('div')
  resultsWrapper.style.padding = '0 16px 16px'
  container.appendChild(resultsWrapper)

  visibleResults.forEach(item => {
    const card = document.createElement('div')
    card.style.border = '1px solid #e5e7eb'
    card.style.borderRadius = '14px'
    card.style.padding = '12px'
    card.style.marginBottom = '10px'
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <img id="lr_logo_${item.lender_id}" src="" style="width:44px;height:36px;object-fit:contain;border-radius:8px;border:1px solid #f3f4f6;padding:6px;background:#fff;" />
          <div>
            <div id="lr_name_${item.lender_id}" style="font-weight:700;color:#0f172a;">${item.lender_name || 'Lender'}</div>
            <div id="lr_roi_${item.lender_id}" style="font-size:13px;color:#64748b;">ROI: ${item.roi || 'N/A'}</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:700;color:#4f46e5;">${Math.round(item._match_score)}%</div>
          <div style="font-size:12px;color:#64748b;">Match</div>
        </div>
      </div>
      <div style="margin-top:10px;font-size:13px;color:#475569;line-height:1.5;">${(item.reason || 'Meets eligibility checks').slice(0, 140)}</div>
      <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end;">
        <button class="btn-outline" type="button" onclick="viewLenderDetails(${item.lender_id})" style="padding:8px 12px;border:1px solid #dbe4f0;background:#fff;border-radius:8px;cursor:pointer;">View</button>
        <button class="btn-primary" type="button" onclick="proceedWithLender('${item.lender_id}', '${leadId || ''}')" style="padding:8px 12px;border:0;border-radius:8px;background:#4f46e5;color:#fff;cursor:pointer;font-weight:600;">Proceed</button>
      </div>
    `
    resultsWrapper.appendChild(card)

    ;(async function(id) {
      try {
        const r = await fetch(lenderApiPath(`/api/lenders/${id}`))
        if (!r.ok) return
        const info = await r.json()
        const logoEl = document.getElementById(`lr_logo_${id}`)
        const nameEl = document.getElementById(`lr_name_${id}`)
        const roiEl = document.getElementById(`lr_roi_${id}`)
        if (logoEl && info.logo) logoEl.src = info.logo
        if (nameEl && info.name) nameEl.textContent = info.name
        if (roiEl && info.roi) roiEl.textContent = `ROI: ${info.roi}`
      } catch (e) {
        console.warn('Failed to fetch lender metadata', e)
      }
    })(item.lender_id)
  })

  document.getElementById('lr_sort').onchange = () => renderLenderRecommendations(list, leadId)
  document.getElementById('lr_min_match').oninput = () => renderLenderRecommendations(list, leadId)
}

function viewLenderDetails(lenderId) {
  window.open(lenderApiPath(`/api/lenders/${lenderId}`))
}

async function proceedWithLender(lenderId, leadId) {
  const targetLeadId = resolveLeadId(leadId || window.currentWorkflowLeadId)
  if (!targetLeadId) {
    if (typeof showToast === 'function') showToast('Lead not selected', 'error')
    else alert('Lead not selected')
    return
  }

  const res = await fetch(lenderApiPath(`/api/leads/${encodeURIComponent(targetLeadId)}/select-lender/${lenderId}`), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ note: 'Selected from CRM lender workflow' })
  })
  const data = await res.json()

  try {
    const leadSnapshot = (typeof getLeadsJourney === 'function' ? getLeadsJourney() : []).find(item => {
      const candidates = [item.id, item.lead_id, item.leadId, item.id?.toString?.()]
      return candidates.some(candidate => String(candidate || '').trim() === String(targetLeadId).trim())
    })

    const storeLead = window.DataStore?.get?.('leads')?.find(item => {
      const candidates = [item.id, item.lead_id, item.leadId]
      return candidates.some(candidate => String(candidate || '').trim() === String(targetLeadId).trim())
    })

    const leadRecord = leadSnapshot || storeLead
    if (leadRecord && typeof window.DataStore?.syncLeadToDeal === 'function') {
      window.DataStore.syncLeadToDeal(leadRecord)
    }
  } catch (e) {
    console.warn('Failed to sync lender lead to deal', e)
  }

  if (data.portal) openLosModal(data.portal)
  if (data.mapping_id) pollMappingStatus(data.mapping_id, targetLeadId)
  openCommercialRevenueModal(targetLeadId)
  if (typeof showToast === 'function') showToast('Lender workflow completed for the selected lead', 'success')
}

function calculateCommercialRevenueSummary(values) {
  const loanAmount = Number(values.loan_amount || 0)
  const pfPercentage = Number(values.pf_percentage || 0)
  const revenueSharePercentage = Number(values.revenue_share_percentage || 0)
  const platformCharges = Number(values.platform_charges || 0)
  const trancheCharges = Number(values.tranche_charges || 0)
  const advisoryFees = Number(values.advisory_fees || 0)
  const renewalCharges = Number(values.renewal_charges || 0)
  const otherCharges = Number(values.other_charges || 0)
  const stageProbability = Number(values.stage_probability || 0.6)

  const pfRevenue = loanAmount * (pfPercentage / 100)
  const fundingSathiRevenueShare = pfRevenue * (revenueSharePercentage / 100)
  const directRevenue = Number(values.direct_revenue || 0)
  // Total revenue Funding Sathi receives from this deal = share from PF + any direct revenue
  const totalFundingSathiRevenue = fundingSathiRevenueShare + directRevenue
  // Expected revenue (company-facing) = pfRevenue + all charges - fundingSathiRevenueShare + directRevenue
  const expectedRevenue = pfRevenue + platformCharges + trancheCharges + advisoryFees + renewalCharges + otherCharges - fundingSathiRevenueShare + directRevenue
  const weightedRevenue = expectedRevenue * stageProbability

  return {
    pfRevenue,
    fundingSathiRevenueShare,
    directRevenue,
    revenueSharing: totalFundingSathiRevenue,
    expectedRevenue,
    weightedRevenue,
    stageProbability
  }
}

function openCommercialRevenueModal(leadId) {
  const targetLeadId = resolveLeadId(leadId)
  if (!targetLeadId) return

  ensureBackdrop().style.display = 'block'

  let modal = document.getElementById('commercialRevenueModal')
  if (!modal) {
    modal = document.createElement('div')
    modal.id = 'commercialRevenueModal'
    modal.style.position = 'fixed'
    modal.style.inset = '0'
    modal.style.zIndex = '1250'
    modal.style.display = 'flex'
    modal.style.alignItems = 'center'
    modal.style.justifyContent = 'center'
    modal.style.padding = '24px'
    modal.innerHTML = `
      <div style="width:min(920px,100%);background:#fff;border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.22);overflow:hidden;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #e5e7eb;background:#f8fafc;">
          <div>
            <div style="font-size:12px;text-transform:uppercase;letter-spacing:.18em;color:#6366f1;font-weight:700;">Revenue Engine</div>
            <div style="font-size:20px;font-weight:700;color:#0f172a;">Commercial revenue details</div>
          </div>
          <button type="button" onclick="closeCommercialRevenueModal()" style="border:0;background:transparent;cursor:pointer;font-size:20px;">×</button>
        </div>
        <div style="padding:20px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">
          <label style="display:flex;flex-direction:column;gap:6px;font-size:13px;color:#334155;">Loan Amount (₹)<input id="cr_loan_amount" type="number" step="0.01" style="padding:10px 12px;border:1px solid #dbe4f0;border-radius:10px;" /></label>
          <label style="display:flex;flex-direction:column;gap:6px;font-size:13px;color:#334155;">Lender PF %<input id="cr_pf_percentage" type="number" step="0.01" value="2" style="padding:10px 12px;border:1px solid #dbe4f0;border-radius:10px;" /></label>
          <label style="display:flex;flex-direction:column;gap:6px;font-size:13px;color:#334155;">Revenue Share %<input id="cr_revenue_share_percentage" type="number" step="0.01" value="15" style="padding:10px 12px;border:1px solid #dbe4f0;border-radius:10px;" /></label>
          <label style="display:flex;flex-direction:column;gap:6px;font-size:13px;color:#334155;">Platform Charges (₹)<input id="cr_platform_charges" type="number" step="0.01" value="0" style="padding:10px 12px;border:1px solid #dbe4f0;border-radius:10px;" /></label>
          <label style="display:flex;flex-direction:column;gap:6px;font-size:13px;color:#334155;">Tranche Charges (₹)<input id="cr_tranche_charges" type="number" step="0.01" value="0" style="padding:10px 12px;border:1px solid #dbe4f0;border-radius:10px;" /></label>
          <label style="display:flex;flex-direction:column;gap:6px;font-size:13px;color:#334155;">Advisory Fees (₹)<input id="cr_advisory_fees" type="number" step="0.01" value="0" style="padding:10px 12px;border:1px solid #dbe4f0;border-radius:10px;" /></label>
          <label style="display:flex;flex-direction:column;gap:6px;font-size:13px;color:#334155;">Renewal Charges (₹)<input id="cr_renewal_charges" type="number" step="0.01" value="0" style="padding:10px 12px;border:1px solid #dbe4f0;border-radius:10px;" /></label>
          <label style="display:flex;flex-direction:column;gap:6px;font-size:13px;color:#334155;">Other Charges (₹)<input id="cr_other_charges" type="number" step="0.01" value="0" style="padding:10px 12px;border:1px solid #dbe4f0;border-radius:10px;" /></label>
          <label style="display:flex;flex-direction:column;gap:6px;font-size:13px;color:#334155;">Override Reason<textarea id="cr_override_reason" rows="3" style="padding:10px 12px;border:1px solid #dbe4f0;border-radius:10px;resize:vertical;"></textarea></label>
          <label style="display:flex;flex-direction:column;gap:6px;font-size:13px;color:#334155;">Remarks<textarea id="cr_remarks" rows="3" style="padding:10px 12px;border:1px solid #dbe4f0;border-radius:10px;resize:vertical;"></textarea></label>
        </div>
        <div style="padding:0 20px 20px;">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:14px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;">
            <div><div style="font-size:12px;color:#64748b;">PF Revenue</div><div id="cr_pf_revenue" style="font-size:18px;font-weight:700;color:#0f172a;">₹0</div></div>
            <div><div style="font-size:12px;color:#64748b;">Revenue Sharing</div><div id="cr_revenue_sharing" style="font-size:18px;font-weight:700;color:#0f172a;">₹0</div></div>
            <div><div style="font-size:12px;color:#64748b;">Expected Revenue</div><div id="cr_expected_revenue" style="font-size:18px;font-weight:700;color:#0f172a;">₹0</div></div>
            <div><div style="font-size:12px;color:#64748b;">Weighted Revenue</div><div id="cr_weighted_revenue" style="font-size:18px;font-weight:700;color:#0f172a;">₹0</div></div>
          </div>
        </div>
        <div style="padding:0 20px 20px;display:flex;justify-content:flex-end;gap:10px;">
          <button type="button" onclick="closeCommercialRevenueModal()" style="padding:10px 16px;border:1px solid #dbe4f0;background:#fff;border-radius:10px;cursor:pointer;">Cancel</button>
          <button id="cr_save_button" type="button" style="padding:10px 16px;border:0;border-radius:10px;background:#4f46e5;color:#fff;cursor:pointer;font-weight:600;">Save & Refresh Forecast</button>
        </div>
      </div>
    `
    document.body.appendChild(modal)
  }

  modal.style.display = 'flex'
  const lead = findWorkflowLead(targetLeadId)
  const rawLoanAmount = Number(lead?.dealValue || lead?.funding_amount || lead?.loanAmount || lead?.appliedAmount || lead?.deal_value || lead?.fundingAmount || 0)
  const loanAmount = rawLoanAmount || 0
  document.getElementById('cr_loan_amount').value = loanAmount
  const stageProbability = Number(window.currentDealProbability || 0.6)

  const updatePreview = () => {
    const values = {
      loan_amount: Number(document.getElementById('cr_loan_amount')?.value || 0),
      pf_percentage: Number(document.getElementById('cr_pf_percentage')?.value || 0),
      revenue_share_percentage: Number(document.getElementById('cr_revenue_share_percentage')?.value || 0),
      platform_charges: Number(document.getElementById('cr_platform_charges')?.value || 0),
      tranche_charges: Number(document.getElementById('cr_tranche_charges')?.value || 0),
      advisory_fees: Number(document.getElementById('cr_advisory_fees')?.value || 0),
      renewal_charges: Number(document.getElementById('cr_renewal_charges')?.value || 0),
      other_charges: Number(document.getElementById('cr_other_charges')?.value || 0),
      stage_probability: stageProbability
    }
    const summary = calculateCommercialRevenueSummary(values)
    document.getElementById('cr_pf_revenue').textContent = '₹' + summary.pfRevenue.toLocaleString('en-IN')
    document.getElementById('cr_revenue_sharing').textContent = '₹' + summary.revenueSharing.toLocaleString('en-IN')
    document.getElementById('cr_expected_revenue').textContent = '₹' + summary.expectedRevenue.toLocaleString('en-IN')
    document.getElementById('cr_weighted_revenue').textContent = '₹' + summary.weightedRevenue.toLocaleString('en-IN')
  }

  ;['cr_loan_amount', 'cr_pf_percentage', 'cr_revenue_share_percentage', 'cr_platform_charges', 'cr_tranche_charges', 'cr_advisory_fees', 'cr_renewal_charges', 'cr_other_charges'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.oninput = updatePreview
  })

  updatePreview()

  const saveButton = document.getElementById('cr_save_button')
  if (saveButton) {
    saveButton.onclick = async () => {
      const payload = {
        loan_amount: Number(document.getElementById('cr_loan_amount')?.value || 0),
        pf_percentage: Number(document.getElementById('cr_pf_percentage')?.value || 0),
        revenue_share_percentage: Number(document.getElementById('cr_revenue_share_percentage')?.value || 0),
        platform_charges: Number(document.getElementById('cr_platform_charges')?.value || 0),
        tranche_charges: Number(document.getElementById('cr_tranche_charges')?.value || 0),
        advisory_fees: Number(document.getElementById('cr_advisory_fees')?.value || 0),
        renewal_charges: Number(document.getElementById('cr_renewal_charges')?.value || 0),
        other_charges: Number(document.getElementById('cr_other_charges')?.value || 0),
        override_reason: document.getElementById('cr_override_reason')?.value || '',
        remarks: document.getElementById('cr_remarks')?.value || ''
      }

      saveButton.disabled = true
      saveButton.textContent = 'Saving…'
      try {
        const authToken = window.API?.authToken || (() => {
          try {
            const session = JSON.parse(localStorage.getItem('crm_session') || 'null')
            return session?.access_token || session?.token || null
          } catch (e) {
            return null
          }
        })()

        const res = await fetch(lenderApiPath(`/api/forecast/deal/${encodeURIComponent(targetLeadId)}/commercial-revenue`), {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'Accept': 'application/json',
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
          },
          body: JSON.stringify(payload)
        })
        const response = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(response?.detail || 'Failed to save commercial revenue details')
        if (typeof showToast === 'function') showToast('Revenue forecast refreshed automatically.', 'success')
        closeCommercialRevenueModal()
        if (window.__dealDetailMap && window.__dealDetailMap[String(targetLeadId)]) {
          Object.assign(window.__dealDetailMap[String(targetLeadId)], response?.data || {})
        }
        if (typeof renderDeals === 'function') renderDeals()
        if (typeof openDealDetail === 'function') openDealDetail(targetLeadId)
      } catch (err) {
        console.error('saveCommercialRevenueDetails failed', err)
        if (typeof showToast === 'function') showToast('Failed to refresh forecast: ' + (err.message || ''), 'error')
        else alert('Failed to refresh forecast: ' + (err.message || ''))
      } finally {
        saveButton.disabled = false
        saveButton.textContent = 'Save & Refresh Forecast'
      }
    }
  }
}

function closeCommercialRevenueModal() {
  const modal = document.getElementById('commercialRevenueModal')
  if (modal) modal.style.display = 'none'
}

async function pollMappingStatus(mappingId, leadId, interval = 5000) {
  const statusElId = `mapping_status_${mappingId}`
  let statusEl = document.getElementById(statusElId)
  if (!statusEl) {
    statusEl = document.createElement('div')
    statusEl.id = statusElId
    statusEl.style.position = 'fixed'
    statusEl.style.right = '20px'
    statusEl.style.bottom = '20px'
    statusEl.style.background = '#fff'
    statusEl.style.border = '1px solid #e5e7eb'
    statusEl.style.padding = '10px 12px'
    statusEl.style.borderRadius = '10px'
    statusEl.style.boxShadow = '0 10px 30px rgba(0,0,0,.12)'
    statusEl.style.zIndex = '1300'
    document.body.appendChild(statusEl)
  }
  try {
    const r = await fetch(lenderApiPath(`/api/leads/${encodeURIComponent(leadId)}/mapping/${mappingId}`))
    if (!r.ok) {
      statusEl.textContent = 'Mapping not found'
      return
    }
    const data = await r.json()
    statusEl.textContent = `Mapping: ${data.status || 'pending'}`
    if ((data.status || '').toLowerCase() === 'pending' || (data.status || '').toLowerCase() === 'in-progress') {
      setTimeout(() => pollMappingStatus(mappingId, leadId, interval), interval)
    }
  } catch (e) {
    console.warn('pollMappingStatus failed', e)
  }
}

function openLosModal(url) {
  let modal = document.getElementById('losModal')
  if (!modal) {
    modal = document.createElement('div')
    modal.id = 'losModal'
    modal.style.position = 'fixed'
    modal.style.inset = '0'
    modal.style.zIndex = '1400'
    modal.style.display = 'flex'
    modal.style.alignItems = 'center'
    modal.style.justifyContent = 'center'
    modal.style.padding = '24px'
    modal.innerHTML = `
      <div style="width:min(980px,100%);height:80vh;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.25);">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #e5e7eb;background:#fff;">
          <div style="font-weight:700;color:#0f172a;">Lender portal</div>
          <button type="button" onclick="closeLosModal()" style="border:0;background:transparent;cursor:pointer;font-size:20px;">×</button>
        </div>
        <iframe id="losIframe" src="${url}" style="width:100%;height:calc(100% - 49px);border:0"></iframe>
      </div>
    `
    document.body.appendChild(modal)
    ensureBackdrop().style.display = 'block'
  }
  modal.style.display = 'flex'
  ensureBackdrop().style.display = 'block'
  const iframe = document.getElementById('losIframe')
  if (iframe) iframe.src = url
}

function closeLosModal() {
  const modal = document.getElementById('losModal')
  if (modal) modal.style.display = 'none'
}

window.openLenderRequirementsModal = openLenderRequirementsModal
window.renderLenderRecommendations = renderLenderRecommendations
window.proceedWithLender = proceedWithLender
window.openCommercialRevenueModal = openCommercialRevenueModal
window.closeCommercialRevenueModal = closeCommercialRevenueModal
window.closeLenderRequirementsModal = closeLenderRequirementsModal
window.closeLosModal = closeLosModal