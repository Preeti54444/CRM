const PipelineConfig = {
  stages: [
    'New Lead', 'Product Exploration', 'Commercial Fit', 'Basic Financial Document',
    'Login with Lender', 'Login Docs Submitted', 'Approved Limit',
    'Sanction Docs', 'Pre-Disbursement', 'Disbursement', 'Payout Received',
    'Closed Won', 'Closed Lost'
  ],
  transitionRules: {
    'New Lead': ['Product Exploration', 'Closed Lost'],
    'Product Exploration': ['Commercial Fit', 'Closed Lost'],
    'Commercial Fit': ['Basic Financial Document', 'Closed Lost'],
    'Basic Financial Document': ['Login with Lender', 'Closed Lost'],
    'Login with Lender': ['Login Docs Submitted', 'Closed Lost'],
    'Login Docs Submitted': ['Approved Limit', 'Closed Lost'],
    'Approved Limit': ['Sanction Docs', 'Closed Lost'],
    'Sanction Docs': ['Pre-Disbursement', 'Closed Lost'],
    'Pre-Disbursement': ['Disbursement', 'Closed Lost'],
    'Disbursement': ['Payout Received', 'Closed Lost'],
    'Payout Received': ['Closed Won', 'Closed Lost'],
    'Closed Won': [],
    'Closed Lost': []
  },
  statusInfo: {
    'New Lead': { color: '#2563eb' },
    'Product Exploration': { color: '#6366f1' },
    'Commercial Fit': { color: '#8b5cf6' },
    'Basic Financial Document': { color: '#0ea5e9' },
    'Login with Lender': { color: '#10b981' },
    'Login Docs Submitted': { color: '#14b8a6' },
    'Approved Limit': { color: '#059669' },
    'Sanction Docs': { color: '#0f766e' },
    'Pre-Disbursement': { color: '#c2410c' },
    'Disbursement': { color: '#f97316' },
    'Payout Received': { color: '#047857' },
    'Closed Won': { color: '#15803d' },
    'Closed Lost': { color: '#b91c1c' }
  },
  slaRules: {
    'New Lead': { label: 'Contact in 15 min', thresholdMinutes: 15 },
    'Product Exploration': { label: 'Discuss in 24 hrs', thresholdHours: 24 },
    'Basic Financial Document': { label: 'Collect docs within 48 hrs', thresholdHours: 48 },
    'Login Docs Submitted': { label: 'Process within 72 hrs', thresholdHours: 72 },
    'Pre-Disbursement': { label: 'Complete within 24 hrs', thresholdHours: 24 }
  },
  requiredFields: {
    'Closed Lost': ['closureReason'],
    'Approved Limit': ['approvalAmount'],
    'Sanction Docs': ['sanctionLetter']
  },
  sourceQuality: {
    'Website Form': 'Web',
    'Facebook Ads': 'Ads',
    'Google Ads': 'Ads',
    'WhatsApp Incoming': 'WhatsApp',
    'Referral (Walk-in)': 'Referral',
    'Sub-DSA / Connector': 'DSA',
    'PaisaBazaar / BankBazaar': 'Marketplace',
    'IndiaLends / MyLoanCare': 'Marketplace',
    'Bulk CSV Upload': 'Import',
    'IVR / Missed Call': 'IVR'
  },
  pipelineJourney: [
    {
      id: 'stage1',
      stage: 'Stage 1',
      title: 'Lead entry to product fit',
      summary: 'Market lead → Interest confirmation → Product exploration → Product fit check. Eligible leads move forward, not-eligible leads are archived, and commercially unfit leads return to re-engagement.',
      steps: ['Market Lead', 'Interested', 'Product Exploration', 'Product Fit Check', 'Eligible', 'Not Eligible', 'Commercial Nurture'],
      detail: [
        'Confirm interest and validate basic eligibility requirements.',
        'Explore product options and align borrower needs with product features.',
        'Assess product fit using credit, business, and commercial suitability checks.',
        'Eligible cases proceed to documentation; not eligible cases are archived.',
        'Commercially unfit leads enter a nurture loop for future re-engagement.'
      ]
    },
    {
      id: 'stage2',
      stage: 'Stage 2',
      title: 'Documentation through disbursement',
      summary: 'Traditional document collection → credit review → sanction gate → sanction letter → pre-disbursement checks → disbursement → account activation with cross-sell potential.',
      steps: ['Document Collection', 'Credit Review', 'Sanction Gate', 'Sanction Letter', 'Pre-Disbursement Checks', 'Disbursement', 'Account Activation'],
      detail: [
        'Collect required documents from the borrower and verify completeness.',
        'Perform credit review and risk assessment prior to sanction decision.',
        'Approve or reject the case at the sanction gate; rejected cases can re-apply after resubmission.',
        'Issue the sanction letter and prepare borrower for loan agreement execution.',
        'Complete compliance checks before fund release.',
        'Disburse funds to the borrower and track payout status.',
        'Activate the account and identify cross-sell opportunities.'
      ]
    }
  ]
}

const PipelineStore = {
  leadKey: 'crm_pipeline_leads',
  activityKey: 'crm_pipeline_activities',
  followUpKey: 'crm_pipeline_followups',
  notificationKey: 'crm_pipeline_notifications',
  queryKey: 'crm_pipeline_queries',
  documentKey: 'crm_pipeline_documents',
  state: {
    leads: [],
    activities: [],
    followUps: [],
    notifications: [],
    queries: [],
    documents: [],
    filters: {
      query: '',
      employee: '',
      loanType: '',
      status: '',
      source: '',
      city: '',
      scoreMin: '',
      scoreMax: '',
      slaBreach: ''
    }
  },

  init() {
    this.state.leads = this.load(this.leadKey) || []
    this.state.activities = this.load(this.activityKey) || []
    this.state.followUps = this.load(this.followUpKey) || []
    this.state.notifications = this.load(this.notificationKey) || []
    this.state.queries = this.load(this.queryKey) || []
    this.state.documents = this.load(this.documentKey) || []

    this.mergeJourneyLeads()
  },

  load(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]')
    } catch (err) {
      try {
        return JSON.parse(sessionStorage.getItem(key) || '[]')
      } catch (fallbackErr) {
        return []
      }
    }
  },

  isQuotaExceeded(err) {
    return err && (
      err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err.code === 22 ||
      err.code === 1014
    )
  },

  trimStorageData(key) {
    switch (key) {
      case this.leadKey:
        return this.state.leads.slice(0, 200)
      case this.activityKey:
        return this.state.activities.slice(-100)
      case this.followUpKey:
        return this.state.followUps.slice(-100)
      case this.notificationKey:
        return this.state.notifications.slice(-100)
      case this.queryKey:
        return this.state.queries.slice(-100)
      case this.documentKey:
        return this.state.documents.slice(-50)
      default:
        return []
    }
  },

  loadJourneyLeads() {
    if (typeof getLeadsJourney === 'function') {
      try {
        return getLeadsJourney() || []
      } catch (e) {
        // fallback to raw storage if helper is unavailable
      }
    }

    return this.load('crm_leads_journey') || []
  },

  normalizeCompanyName(name) {
    if (!name) return ''
    return String(name)
      .toLowerCase()
      .replace(/[.,&\/\\]/g, ' ')
      .replace(/\b(ltd|pvt|private|limited|llp|inc|corp|corporation|co|company|india)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  },

  normalizeJourneyLead(entry) {
    if (!entry || typeof entry !== 'object') return null
    const status = (entry.currentStatus && PipelineConfig.stages.includes(entry.currentStatus))
      ? entry.currentStatus
      : 'Fresh Lead'

    return {
      id: entry.id ? `PL-${String(entry.id).replace(/[^A-Za-z0-9_-]/g, '')}` : `PL-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: entry.contactPerson || entry.companyName || entry.name || 'Unknown Lead',
      mobile: entry.contactNumber || entry.phone || '',
      loanAmount: Number(String(entry.dealValue || entry.deal_value || '').replace(/[^0-9]/g, '')) || 0,
      loanType: entry.productDiscussed || entry.loanPurpose || 'Lead Journey',
      leadScore: Number(entry.leadScore) || Math.min(100, 60 + Math.round(Math.random() * 30)),
      assignedEmployee: entry.salesExecutive || entry.createdByName || entry.assignedTo || 'Unassigned',
      source: entry.leadSource || 'Lead Journey',
      priority: 'Warm',
      status,
      lastActivity: this.normalizeDate(entry.lastActivity) || this.normalizeDate(entry.timestamp) || new Date().toISOString(),
      stageEnteredAt: this.normalizeDate(entry.stageEnteredAt) || this.normalizeDate(entry.timestamp) || new Date().toISOString(),
      city: entry.location || 'Unknown',
      pinCode: entry.pinCode || entry.pincode || '',
      documents: Array.isArray(entry.documents) ? entry.documents : [],
      loanPurpose: entry.purposeOfCall || entry.loanPurpose || '',
      cibilScore: Number(entry.cibilScore) || undefined,
      businessVintage: entry.businessVintage || undefined
    }
  },

  mergeJourneyLeads() {
    const journeyLeads = this.loadJourneyLeads()
    if (!Array.isArray(journeyLeads) || !journeyLeads.length) return

    const existingIds = new Set(this.state.leads.map(lead => String(lead.id || '').trim().toLowerCase()))
    const existingCompanies = new Set(this.state.leads.map(lead => this.normalizeCompanyName(lead.companyName || lead.name || '')))
    let added = false

    journeyLeads.forEach(entry => {
      if (!entry || typeof entry !== 'object') return
      const normalizedCompany = this.normalizeCompanyName(entry.companyName || entry.company || '')
      const entryId = String(entry.id || '').trim().toLowerCase()
      if (entryId && existingIds.has(entryId)) return
      if (normalizedCompany && existingCompanies.has(normalizedCompany)) return

      const normalizedLead = this.normalizeJourneyLead(entry)
      if (!normalizedLead) return

      if (existingIds.has(String(normalizedLead.id).trim().toLowerCase())) return
      existingIds.add(String(normalizedLead.id).trim().toLowerCase())
      if (normalizedCompany) existingCompanies.add(normalizedCompany)

      this.state.leads.push(normalizedLead)
      added = true
    })

    if (added) {
      this.save()
    }
  },

  persist(key, data) {
    const payload = JSON.stringify(data)
    try {
      localStorage.setItem(key, payload)
      return
    } catch (err) {
      if (!this.isQuotaExceeded(err)) throw err
      console.warn(`PipelineStore.persist quota exceeded for ${key}`, err)
      try {
        sessionStorage.setItem(key, payload)
        return
      } catch (fallbackErr) {
        console.warn(`PipelineStore.persist sessionStorage fallback failed for ${key}`, fallbackErr)
      }

      const trimmed = this.trimStorageData(key)
      if (trimmed.length > 0) {
        try {
          localStorage.setItem(key, JSON.stringify(trimmed))
          switch (key) {
            case this.leadKey:
              this.state.leads = trimmed
              break
            case this.activityKey:
              this.state.activities = trimmed
              break
            case this.followUpKey:
              this.state.followUps = trimmed
              break
            case this.notificationKey:
              this.state.notifications = trimmed
              break
            case this.queryKey:
              this.state.queries = trimmed
              break
            case this.documentKey:
              this.state.documents = trimmed
              break
          }
          return
        } catch (trimErr) {
          console.warn(`PipelineStore.persist trimmed save failed for ${key}`, trimErr)
        }
      }
      throw err
    }
  },

  save() {
    try { this.persist(this.leadKey, this.state.leads) } catch (err) { console.warn('Failed to save pipeline leads', err) }
    try { this.persist(this.activityKey, this.state.activities) } catch (err) { console.warn('Failed to save pipeline activities', err) }
    try { this.persist(this.followUpKey, this.state.followUps) } catch (err) { console.warn('Failed to save pipeline followUps', err) }
    try { this.persist(this.notificationKey, this.state.notifications) } catch (err) { console.warn('Failed to save pipeline notifications', err) }
    try { this.persist(this.queryKey, this.state.queries) } catch (err) { console.warn('Failed to save pipeline queries', err) }
    try { this.persist(this.documentKey, this.state.documents) } catch (err) { console.warn('Failed to save pipeline documents', err) }
  },

  async getAuthToken() {
    try {
      const session = JSON.parse(localStorage.getItem('crm_session') || '{}')
      return session?.access_token || session?.token || session?.accessToken || null
    } catch (err) {
      return null
    }
  },

  async apiRequest(path, options = {}) {
    const token = await this.getAuthToken()
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    // Normalize API paths: route frontend backend calls through the FastAPI backend
    if (typeof path === 'string' && /^\/?api\/pipeline\//.test(path)) {
      return { success: false, error: 'Pipeline backend endpoints are not supported by the current FastAPI backend.' }
    }

    const API_BASE = (window.getCRMApiBase ? getCRMApiBase() : null)
    if (!API_BASE) {
      return { success: false, error: 'Backend unavailable' }
    }

    let endpoint = path
    if (typeof path === 'string') {
      const isAbsoluteUrl = /^https?:\/\//i.test(path)
      if (!isAbsoluteUrl) {
        const clean = String(path).replace(/^\/?api\/?/, '')
        endpoint = `${API_BASE}/${clean.replace(/^\/+/, '')}`
      }
    }

    const response = await fetch(endpoint, {
      ...options,
      headers
    })

    if (!response.ok) {
      let errorBody = null
      try {
        errorBody = await response.json()
      } catch (e) {
        errorBody = { error: response.statusText }
      }
      return { success: false, error: errorBody.error || errorBody.message || response.statusText }
    }

    const data = await response.json()
    return { success: true, data, id: data?.id }
  },

  normalizeDate(value) {
    if (!value) return null
    if (typeof value === 'string') return value
    if (value?.toDate) return value.toDate().toISOString()
    if (value?.seconds) return new Date(value.seconds * 1000).toISOString()
    return String(value)
  },

  normalizeLead(lead) {
    return {
      ...lead,
      lastActivity: this.normalizeDate(lead.lastActivity) || new Date().toISOString(),
      stageEnteredAt: this.normalizeDate(lead.stageEnteredAt) || new Date().toISOString()
    }
  },

  async syncFromBackend() {
    try {
      const response = await this.apiRequest('/leads', { method: 'GET' })
      if (!response.success) {
        return false
      }

      const remoteLeads = Array.isArray(response.data) ? response.data : []
      if (remoteLeads.length) {
        this.state.leads = remoteLeads.map(lead => this.normalizeLead(lead))
        this.save()
      }

      return true
    } catch (err) {
      console.warn('Pipeline sync error:', err)
      return false
    }
  },

  async createLeadOnBackend(lead) {
    try {
      const response = await this.apiRequest('/leads', {
        method: 'POST',
        body: JSON.stringify(lead)
      })
      return response
    } catch (err) {
      console.warn('Pipeline lead create API failed:', err)
      return { success: false, error: err.message }
    }
  },

  async updateStatusOnBackend(leadId, statusPayload) {
    return { success: false, error: 'Pipeline lead status sync is not supported by the current FastAPI backend.' }
  },

  async persistStatusChange(leadId, newStatus, details) {
    const result = await this.updateStatusOnBackend(leadId, {
      ...details,
      newStatus,
      oldStatus: this.getLeadById(leadId)?.status
    })
    return result
  },

  seedSampleLeads() {
    const now = new Date()
    const minutesAgo = minutes => new Date(now.getTime() - minutes * 60 * 1000).toISOString()
    const hoursAgo = hours => new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString()
    const daysAgo = days => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()

    const sampleLeads = [
      {
        id: 'PL-1001', name: 'Rajesh Kumar', mobile: '+91 98765 43210', loanAmount: 2800000,
        loanType: 'Business Loan', leadScore: 85, assignedEmployee: 'Vaibhav Borge', lastActivity: minutesAgo(7), priority: 'Hot', source: 'WhatsApp Incoming', status: 'Fresh Lead', city: 'Mumbai', pinCode: '400601', businessVintage: 5,
        cibilScore: 760, stageEnteredAt: minutesAgo(34), loanPurpose: 'Working Capital', documents: ['PAN', 'Aadhaar']
      },
      {
        id: 'PL-1002', name: 'Neha Shah', mobile: '+91 99887 44321', loanAmount: 950000,
        loanType: 'Personal Loan', leadScore: 78, assignedEmployee: 'Saleem Khan', lastActivity: hoursAgo(2), priority: 'Warm', source: 'Website Form', status: 'Contacted', city: 'Thane', pinCode: '400601', businessVintage: 2,
        cibilScore: 710, stageEnteredAt: hoursAgo(3), loanPurpose: 'Business Expansion', documents: ['PAN']
      },
      {
        id: 'PL-1003', name: 'Amit Patel', mobile: '+91 91234 55678', loanAmount: 1250000,
        loanType: 'Loan Against Property', leadScore: 91, assignedEmployee: 'Roshan Chavan', lastActivity: hoursAgo(4), priority: 'Hot', source: 'Referral (Walk-in)', status: 'Interested', city: 'Pune', pinCode: '411014', businessVintage: 8,
        cibilScore: 780, stageEnteredAt: hoursAgo(10), loanPurpose: 'Property Purchase', documents: ['PAN', 'Aadhaar', 'GST']
      },
      {
        id: 'PL-1004', name: 'Priya Mehta', mobile: '+91 98760 12034', loanAmount: 620000,
        loanType: 'Business Loan', leadScore: 74, assignedEmployee: 'Saleem Khan', lastActivity: hoursAgo(26), priority: 'Warm', source: 'Google Ads', status: 'Documents Pending', city: 'Nashik', pinCode: '422001', businessVintage: 3,
        cibilScore: 695, stageEnteredAt: hoursAgo(30), loanPurpose: 'Working Capital', documents: ['PAN', 'Aadhaar']
      },
      {
        id: 'PL-1005', name: 'Kunal Desai', mobile: '+91 90909 12345', loanAmount: 2100000,
        loanType: 'MSME Loan', leadScore: 82, assignedEmployee: 'Roshan Chavan', lastActivity: daysAgo(1), priority: 'Hot', source: 'Facebook Ads', status: 'Documents Received', city: 'Mumbai', pinCode: '400019', businessVintage: 6,
        cibilScore: 745, stageEnteredAt: hoursAgo(36), loanPurpose: 'Inventory Purchase', documents: ['PAN', 'Aadhaar', 'GST', 'ITR']
      },
      {
        id: 'PL-1006', name: 'Shalini Jain', mobile: '+91 90123 45678', loanAmount: 1750000,
        loanType: 'Equipment Loan', leadScore: 88, assignedEmployee: 'Vaibhav Borge', lastActivity: daysAgo(1), priority: 'Hot', source: 'Referral (Walk-in)', status: 'Bureau Pull Done', city: 'Navi Mumbai', pinCode: '400701', businessVintage: 10,
        cibilScore: 788, stageEnteredAt: daysAgo(2), loanPurpose: 'Machinery Purchase', documents: ['PAN', 'Aadhaar', 'GST', 'Bank Statement']
      },
      {
        id: 'PL-1007', name: 'Farhan Ali', mobile: '+91 87654 32109', loanAmount: 3200000,
        loanType: 'Business Loan', leadScore: 92, assignedEmployee: 'Saleem Khan', lastActivity: daysAgo(2), priority: 'Hot', source: 'WhatsApp Incoming', status: 'Lender Selected', city: 'Mumbai', pinCode: '400050', businessVintage: 7,
        cibilScore: 770, stageEnteredAt: daysAgo(2), loanPurpose: 'Expansion', documents: ['PAN', 'Aadhaar', 'GST', 'Bank Statement', 'ITR']
      },
      {
        id: 'PL-1008', name: 'Shweta Singh', mobile: '+91 99876 54321', loanAmount: 900000,
        loanType: 'Personal Loan', leadScore: 68, assignedEmployee: 'Roshan Chavan', lastActivity: hoursAgo(54), priority: 'Warm', source: 'Google Ads', status: 'Under Process', city: 'Navi Mumbai', pinCode: '400614', businessVintage: 4,
        cibilScore: 690, stageEnteredAt: daysAgo(4), loanPurpose: 'Salary Bridging', documents: ['PAN', 'Aadhaar', 'Bank Statement', 'Salary Slips']
      },
      {
        id: 'PL-1009', name: 'Mohit Kapoor', mobile: '+91 94567 32100', loanAmount: 2800000,
        loanType: 'Business Loan', leadScore: 79, assignedEmployee: 'Vaibhav Borge', lastActivity: daysAgo(3), priority: 'Warm', source: 'PaisaBazaar / BankBazaar', status: 'Query Raised', city: 'Mumbai', pinCode: '400080', businessVintage: 9,
        cibilScore: 730, stageEnteredAt: daysAgo(3), loanPurpose: 'Expansion', documents: ['PAN', 'Aadhaar', 'GST', 'Bank Statement'], queryDetails: 'Provide last 6 months GST returns and invoice book.'
      },
      {
        id: 'PL-1010', name: 'Rohan Iyer', mobile: '+91 91234 67890', loanAmount: 4200000,
        loanType: 'Commercial Property Loan', leadScore: 94, assignedEmployee: 'Roshan Chavan', lastActivity: daysAgo(7), priority: 'Hot', source: 'Referral (Walk-in)', status: 'Sanctioned', city: 'Thane', pinCode: '400601', businessVintage: 12,
        cibilScore: 790, stageEnteredAt: daysAgo(7), loanPurpose: 'Office Purchase', documents: ['PAN', 'Aadhaar', 'GST', 'Bank Statement', 'Property Papers']
      },
      {
        id: 'PL-1011', name: 'Sneha Verma', mobile: '+91 99887 88655', loanAmount: 600000,
        loanType: 'Personal Loan', leadScore: 55, assignedEmployee: 'Saleem Khan', lastActivity: daysAgo(8), priority: 'Cold', source: 'Cold Email', status: 'Rejected', city: 'Pune', pinCode: '411045', businessVintage: 1,
        cibilScore: 640, stageEnteredAt: daysAgo(8), loanPurpose: 'Medical', documents: ['PAN', 'Aadhaar'], rejectionReason: 'CIBIL below lender threshold'
      },
      {
        id: 'PL-1012', name: 'Ayesha Khan', mobile: '+91 90012 34567', loanAmount: 1500000,
        loanType: 'Business Loan', leadScore: 48, assignedEmployee: 'Vaibhav Borge', lastActivity: daysAgo(9), priority: 'Cold', source: 'IVR / Missed Call', status: 'Future Follow-up', city: 'Mumbai', pinCode: '400089', businessVintage: 2,
        cibilScore: 680, stageEnteredAt: daysAgo(9), loanPurpose: 'Inventory', followUpDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'PL-1013', name: 'Sunil Mehta', mobile: '+91 98989 12345', loanAmount: 540000,
        loanType: 'Personal Loan', leadScore: 33, assignedEmployee: 'Saleem Khan', lastActivity: daysAgo(10), priority: 'Cold', source: 'Email Campaign', status: 'DND', city: 'Navi Mumbai', pinCode: '400706', businessVintage: 1,
        cibilScore: 620, stageEnteredAt: daysAgo(10), loanPurpose: 'Education'
      }
    ]

    this.state.leads = sampleLeads
    this.save()
  },

  seedSampleActivities() {
    this.state.activities = [
      { id: 'ACT-2001', leadId: 'PL-1003', type: 'Status Change', user: 'Roshan Chavan', timestamp: new Date(new Date().getTime() - 2 * 60 * 60 * 1000).toISOString(), action: 'Moved to Interested', oldValue: 'Contacted', newValue: 'Interested', remarks: 'Customer wants final documentation checklist' },
      { id: 'ACT-2002', leadId: 'PL-1006', type: 'Document Upload', user: 'Vaibhav Borge', timestamp: new Date(new Date().getTime() - 22 * 60 * 60 * 1000).toISOString(), action: 'Documents received', oldValue: 'Documents Pending', newValue: 'Documents Received', remarks: 'Uploaded GST, PAN and Bank Statements' },
      { id: 'ACT-2003', leadId: 'PL-1009', type: 'Query Raised', user: 'Vaibhav Borge', timestamp: new Date(new Date().getTime() - 46 * 60 * 60 * 1000).toISOString(), action: 'Query raised', oldValue: 'Under Process', newValue: 'Query Raised', remarks: 'Lender requested reconciled GST returns' }
    ]
    this.save()
  },

  seedSampleDocuments() {
    this.state.documents = [
      { id: 'DOC-9001', leadId: 'PL-1005', type: 'PAN', status: 'Validated', uploadedAt: new Date().toISOString() },
      { id: 'DOC-9002', leadId: 'PL-1005', type: 'Aadhaar', status: 'Validated', uploadedAt: new Date().toISOString() },
      { id: 'DOC-9003', leadId: 'PL-1005', type: 'GST', status: 'Pending', uploadedAt: new Date().toISOString() }
    ]
    this.save()
  },

  getLeadById(id) {
    return this.state.leads.find(lead => lead.id === id)
  },

  getStageLeads(stage) {
    return this.applyFilters(this.state.leads.filter(lead => lead.status === stage))
  },

  getPipelineMetrics() {
    const metrics = {}
    this.state.leads.forEach(lead => {
      const stage = lead.status
      metrics[stage] = metrics[stage] || { count: 0, amount: 0, alerts: 0 }
      metrics[stage].count += 1
      metrics[stage].amount += lead.loanAmount || 0
      if (PipelineStore.isSlaBreached(lead)) metrics[stage].alerts += 1
    })
    return metrics
  },

  applyFilters(leads) {
    return leads.filter(lead => {
      const filters = this.state.filters
      if (filters.query && ![lead.name, lead.mobile, lead.loanType, lead.source, lead.assignedEmployee, lead.city].some(value => String(value || '').toLowerCase().includes(filters.query.toLowerCase()))) return false
      if (filters.employee && lead.assignedEmployee !== filters.employee) return false
      if (filters.loanType && lead.loanType !== filters.loanType) return false
      if (filters.status && lead.status !== filters.status) return false
      if (filters.source && lead.source !== filters.source) return false
      if (filters.city && lead.city !== filters.city) return false
      if (filters.scoreMin && lead.leadScore < Number(filters.scoreMin)) return false
      if (filters.scoreMax && lead.leadScore > Number(filters.scoreMax)) return false
      if (filters.slaBreach === 'yes' && !PipelineStore.isSlaBreached(lead)) return false
      if (filters.slaBreach === 'no' && PipelineStore.isSlaBreached(lead)) return false
      return true
    })
  },

  validateTransition(from, to) {
    const allowed = PipelineConfig.transitionRules[from] || []
    return allowed.includes(to)
  },

  isSlaBreached(lead) {
    const rule = PipelineConfig.slaRules[lead.status]
    if (!rule || !lead.stageEnteredAt) return false
    const elapsed = (new Date().getTime() - new Date(lead.stageEnteredAt).getTime()) / 1000
    if (rule.thresholdMinutes) return elapsed > rule.thresholdMinutes * 60
    if (rule.thresholdHours) return elapsed > rule.thresholdHours * 3600
    if (rule.thresholdDays) return elapsed > rule.thresholdDays * 24 * 3600
    return false
  },

  async updateLeadStatus(leadId, newStatus, details = {}) {
    const lead = this.getLeadById(leadId)
    if (!lead) return { success: false, error: 'Lead not found' }
    if (lead.status === newStatus) return { success: false, error: `Already in ${newStatus}` }
    if (!this.validateTransition(lead.status, newStatus)) {
      return { success: false, error: `Invalid transition: ${lead.status} → ${newStatus}` }
    }

    const oldStatus = lead.status
    const backendResult = await this.persistStatusChange(leadId, newStatus, details)
    if (backendResult && !backendResult.success) {
      console.warn('Pipeline backend status sync failed', backendResult.error)
    }

    lead.status = newStatus
    lead.lastActivity = new Date().toISOString()
    lead.stageEnteredAt = new Date().toISOString()
    if (details.rejectionReason) lead.rejectionReason = details.rejectionReason
    if (details.queryDetails) lead.queryDetails = details.queryDetails
    if (details.followUpDate) lead.followUpDate = details.followUpDate
    if (details.assignedEmployee) lead.assignedEmployee = details.assignedEmployee

    const activity = {
      id: `ACT-${Date.now()}`,
      leadId: lead.id,
      type: 'Status Change',
      user: S?.name || S?.email || 'System',
      timestamp: new Date().toISOString(),
      action: `Status moved from ${oldStatus} to ${newStatus}`,
      oldValue: oldStatus,
      newValue: newStatus,
      remarks: details.remarks || details.rejectionReason || details.queryDetails || details.followUpDate || 'Stage updated via pipeline'
    }
    this.state.activities.unshift(activity)
    this.addNotification({
      id: `NOT-${Date.now()}`,
      type: 'Stage Update',
      leadId: lead.id,
      message: `${lead.name} moved to ${newStatus}`,
      timestamp: new Date().toISOString(),
      read: false
    })
    this.save()
    return { success: true, lead, activity, warning: backendResult && !backendResult.success ? backendResult.error : null }
  },

  async addFollowUp(leadId, followUp) {
    const entry = { id: `FU-${Date.now()}`, leadId, ...followUp, createdAt: new Date().toISOString(), status: 'Scheduled' }
    const backendResult = { success: false, error: 'Pipeline follow-up sync is not supported by the current FastAPI backend.' }
    console.warn('Follow-up backend sync skipped:', backendResult.error)

    this.state.followUps.unshift(entry)
    this.state.activities.unshift({ id: `ACT-${Date.now() + 1}`, leadId, type: 'Follow-up', user: S?.name || S?.email || 'System', timestamp: new Date().toISOString(), action: `Follow-up scheduled (${followUp.type})`, oldValue: '', newValue: '', remarks: followUp.notes || '' })
    this.addNotification({ id: `NOT-${Date.now() + 2}`, type: 'Follow-up', leadId, message: `Follow-up scheduled for ${new Date(followUp.when).toLocaleString()}`, timestamp: new Date().toISOString(), read: false })
    this.save()
    return entry
  },

  addNotification(notification) {
    this.state.notifications.unshift(notification)
    this.save()
  },

  async addQuery(leadId, query) {
    const entry = { id: `QRY-${Date.now()}`, leadId, ...query, createdAt: new Date().toISOString(), status: 'Open' }
    const backendResult = { success: false, error: 'Pipeline query sync is not supported by the current FastAPI backend.' }
    console.warn('Query backend sync skipped:', backendResult.error)

    this.state.queries.unshift(entry)
    this.state.activities.unshift({ id: `ACT-${Date.now() + 3}`, leadId, type: 'Query', user: S?.name || S?.email || 'System', timestamp: new Date().toISOString(), action: 'Query created', oldValue: '', newValue: '', remarks: query.details || '' })
    this.addNotification({ id: `NOT-${Date.now() + 4}`, type: 'Query', leadId, message: `Query raised for ${entry.leadId}`, timestamp: new Date().toISOString(), read: false })
    this.save()
    return entry
  },

  async addDocument(leadId, document) {
    const entry = { id: `DOC-${Date.now()}`, leadId, ...document, uploadedAt: new Date().toISOString(), status: 'Pending' }
    const backendResult = { success: false, error: 'Pipeline document sync is not supported by the current FastAPI backend.' }
    console.warn('Document backend sync skipped:', backendResult.error)

    this.state.documents.unshift(entry)
    this.state.activities.unshift({ id: `ACT-${Date.now() + 5}`, leadId, type: 'Document Upload', user: S?.name || S?.email || 'System', timestamp: new Date().toISOString(), action: `Uploaded ${document.type}`, oldValue: '', newValue: '', remarks: '' })
    this.addNotification({ id: `NOT-${Date.now() + 6}`, type: 'Document', leadId, message: `${document.type} uploaded for ${leadId}`, timestamp: new Date().toISOString(), read: false })
    this.save()
    return entry
  }
}

const PipelineUI = {
  currentStatusChange: null,
  currentLeadId: null,

  isAdminUser() {
    const session = (typeof S !== 'undefined' && S) ? S : JSON.parse(localStorage.getItem('crm_session') || '{}')
    return String((session.role || session.user_role || '').toLowerCase()) === 'admin'
  },

  render() {
    PipelineStore.init()
    const container = document.getElementById('pipelineApp')
    if (!container) return
    container.innerHTML = `
      <div class="pipeline-toolbar">
        <div class="pipeline-toolbar-left">
          <div>
            <h2>Enterprise Lead Status Pipeline</h2>
            <p style="margin:4px 0 0;color:var(--gray-500);font-size:14px;">Track every lead through a complete loan lifecycle from Fresh Lead to Payout Received.</p>
          </div>
        </div>
        <div class="pipeline-actions">
          ${!this.isAdminUser() ? `<button class="btn btn-primary" onclick="PipelineUI.openLeadCapture()">+ Add Lead</button>` : ''}
          <button class="btn btn-ghost" onclick="PipelineUI.clearPipelineFilters()">Clear Filters</button>
        </div>
      </div>
      <div class="pipeline-journey">
        ${PipelineConfig.pipelineJourney.map(item => `
          <button class="pipeline-journey-card" onclick="PipelineUI.openJourneyDetail('${item.id}')" type="button">
            <div class="journey-card-top">
              <span class="journey-stage">${item.stage}</span>
              <strong class="journey-title">${item.title}</strong>
            </div>
            <p class="journey-summary">${item.summary}</p>
            <div class="journey-steps">${item.steps.map(step => `<span>${step}</span>`).join('')}</div>
          </button>
        `).join('')}
      </div>
      <div class="pipeline-filters">
        <div class="filter-field"><label>Global Search</label><input type="search" id="pipelineSearch" placeholder="Search by name, mobile, loan type, source" oninput="PipelineUI.updateFilter('query', this.value)"></div>
        <div class="filter-field"><label>Employee</label><select id="pipelineEmployee" onchange="PipelineUI.updateFilter('employee', this.value)"><option value="">All Employees</option><option>Vaibhav Borge</option><option>Saleem Khan</option><option>Roshan Chavan</option></select></div>
        <div class="filter-field"><label>Loan Type</label><select id="pipelineLoanType" onchange="PipelineUI.updateFilter('loanType', this.value)"><option value="">All Loan Types</option><option>Business Loan</option><option>Personal Loan</option><option>Loan Against Property</option><option>MSME Loan</option><option>Equipment Loan</option><option>Commercial Property Loan</option></select></div>
        <div class="filter-field"><label>Status</label><select id="pipelineStatus" onchange="PipelineUI.updateFilter('status', this.value)"><option value="">Any Status</option>${PipelineConfig.stages.map(stage => `<option value="${stage}">${stage}</option>`).join('')}</select></div>
        <div class="filter-field"><label>Source</label><select id="pipelineSource" onchange="PipelineUI.updateFilter('source', this.value)"><option value="">Any Source</option>${Object.values(PipelineConfig.sourceQuality).filter((value, index, arr) => arr.indexOf(value) === index).map(value => `<option value="${value}">${value}</option>`).join('')}</select></div>
        <div class="filter-field"><label>SLA Breach</label><select id="pipelineSla" onchange="PipelineUI.updateFilter('slaBreach', this.value)"><option value="">Any</option><option value="yes">Breached</option><option value="no">On Track</option></select></div>
      </div>
      <div class="pipeline-summary" id="pipelineSummary"></div>
      <div class="pipeline-board-wrap"><div class="pipeline-board" id="pipelineBoard"></div></div>
    `

    this.ensureModals()
    this.renderSummary()
    this.renderBoard()
    this.syncBackendIfAvailable()
  },

  ensureModals() {
    const body = document.body
    const modalIds = ['pipelineDetailModal', 'pipelineStatusModal', 'pipelineJourneyModal']
    modalIds.forEach(id => {
      let modal = document.getElementById(id)
      if (!modal) {
        modal = document.createElement('div')
        modal.id = id
        modal.className = 'pipeline-modal-overlay'
        body.appendChild(modal)
      } else if (modal.parentElement !== body) {
        body.appendChild(modal)
      }
    })
  },

  openJourneyDetail(journeyId) {
    const journey = PipelineConfig.pipelineJourney.find(item => item.id === journeyId)
    if (!journey) return
    const modal = document.getElementById('pipelineJourneyModal')
    modal.innerHTML = `
      <div class="pipeline-modal">
        <div class="pipeline-modal-header">
          <div>
            <h3>${journey.stage}: ${journey.title}</h3>
            <small style="color:var(--gray-500);">Tap any box to explore the stage in detail.</small>
          </div>
          <button class="btn cancel" onclick="PipelineUI.closeModal('pipelineJourneyModal')">Close</button>
        </div>
        <div class="pipeline-modal-body">
          <div class="field"><label>Overview</label><textarea readonly>${journey.summary}</textarea></div>
          <div class="field"><label>Journey steps</label><div class="journey-detail-steps">${journey.detail.map(item => `<div><strong>•</strong> ${item}</div>`).join('')}</div></div>
          <div class="field"><label>Process flow</label><div class="journey-steps detail">${journey.steps.map(step => `<span>${step}</span>`).join('')}</div></div>
        </div>
        <div class="pipeline-modal-footer">
          <button class="cancel" onclick="PipelineUI.closeModal('pipelineJourneyModal')">Close</button>
        </div>
      </div>`
    modal.classList.add('active')
  },

  async syncBackendIfAvailable() {
    const synced = await PipelineStore.syncFromBackend()
    if (synced) {
      this.renderSummary()
      this.renderBoard()
      this.showToast('Pipeline synced with backend')
    }
  },

  renderSummary() {
    const metrics = PipelineStore.getPipelineMetrics()
    const totalLeads = PipelineStore.state.leads.length
    const totalValue = PipelineStore.state.leads.reduce((sum, lead) => sum + (lead.loanAmount || 0), 0)
    const breachCount = PipelineStore.state.leads.filter(lead => PipelineStore.isSlaBreached(lead)).length
    const summaryContainer = document.getElementById('pipelineSummary')
    if (!summaryContainer) return
    summaryContainer.innerHTML = `
      <div class="pipeline-summary-card">
        <span>Total Leads</span>
        <strong>${totalLeads}</strong>
      </div>
      <div class="pipeline-summary-card">
        <span>Pipeline Value</span>
        <strong>₹${(totalValue / 100000).toFixed(1)}L</strong>
      </div>
      <div class="pipeline-summary-card">
        <span>Stages with SLA Breach</span>
        <strong>${breachCount}</strong>
      </div>
      <div class="pipeline-summary-card">
        <span>Open Follow-ups</span>
        <strong>${PipelineStore.state.followUps.filter(f => f.status === 'Scheduled').length}</strong>
      </div>
    `
  },

  renderBoard() {
    const board = document.getElementById('pipelineBoard')
    if (!board) return
    board.innerHTML = PipelineConfig.stages.map(stage => {
      const stageLeads = PipelineStore.getStageLeads(stage)
      const metrics = PipelineStore.getPipelineMetrics()[stage] || { count: 0, amount: 0, alerts: 0 }
      return `
        <section class="pipeline-column" data-stage="${stage}"
          ondragover="PipelineUI.handleDragOver(event, '${stage}')"
          ondragenter="PipelineUI.handleDragEnter(event, '${stage}')"
          ondragleave="PipelineUI.handleDragLeave(event)"
          ondrop="PipelineUI.handleDrop(event, '${stage}')">
          <div class="pipeline-column-header">
            <div class="pipeline-column-title"><span class="status-dot" style="background:${PipelineConfig.statusInfo[stage].color}"></span>${stage}</div>
            <div class="pipeline-column-meta">${metrics.count} leads · ₹${(metrics.amount / 100000).toFixed(1)}L</div>
            ${metrics.alerts ? `<span class="pipeline-sla-alert">${metrics.alerts} SLA alert(s)</span>` : ''}
          </div>
          <div class="pipeline-cards" id="column-${stage.replace(/\s+/g, '-')}">
            ${stageLeads.map(lead => this.renderCard(lead)).join('')}
          </div>
        </section>`
    }).join('')
    this.attachCardEvents()
  },

  renderCard(lead) {
    const priorityClass = lead.priority?.toLowerCase() || 'cold'
    const sourceLabel = PipelineConfig.sourceQuality[lead.source] || lead.source || 'Direct'
    return `
      <article class="pipeline-card" draggable="true" data-lead-id="${lead.id}" ondragstart="PipelineUI.handleDragStart(event, '${lead.id}')">
        <div class="card-row"><div class="card-title">${lead.name}</div><div class="value-chip">₹${(lead.loanAmount / 100000).toFixed(1)}L</div></div>
        <div class="card-subtitle">${lead.loanType} • ${lead.city}</div>
        <div class="card-row" style="margin-top:12px;"><span class="card-meta">${lead.mobile}</span><span class="card-meta">Score ${lead.leadScore}</span></div>
        <div class="badges">
          <span class="pipeline-badge ${priorityClass}">${lead.priority}</span>
          <span class="pipeline-source">${sourceLabel}</span>
        </div>
        <div class="card-row" style="margin-top:12px;"><small>Assigned: ${lead.assignedEmployee}</small><small>${PipelineUI.formatRelativeTime(lead.lastActivity)}</small></div>
        <div class="card-actions">
          <button class="btn btn-ghost" onclick="PipelineUI.openLeadDetail('${lead.id}')">Details</button>
          <button class="btn btn-primary" onclick="PipelineUI.openStatusModal('${lead.id}')">Move</button>
        </div>
      </article>`
  },

  attachCardEvents() {
    document.querySelectorAll('.pipeline-card').forEach(card => {
      card.addEventListener('dragstart', event => event.currentTarget.classList.add('dragging'))
      card.addEventListener('dragend', event => event.currentTarget.classList.remove('dragging'))
    })
  },

  handleDragStart(event, leadId) {
    event.dataTransfer?.setData('text/plain', leadId)
    event.dataTransfer?.setDragImage(event.target, 0, 0)
  },

  handleDrop(event, targetStage) {
    event.preventDefault()
    const leadId = event.dataTransfer?.getData('text/plain')
    const lead = this.getLeadById(leadId)
    this.clearDropHighlights()
    if (!leadId || !lead) return
    if (!this.validateTransition(lead.status, targetStage)) {
      this.showToast(`Cannot move from ${lead.status} to ${targetStage}`, 'error')
      return
    }
    this.openStatusModal(leadId, targetStage)
  },

  handleDragOver(event, targetStage) {
    event.preventDefault()
    const leadId = event.dataTransfer?.getData('text/plain')
    const lead = this.getLeadById(leadId)
    const target = event.currentTarget
    if (!lead || !target) return
    if (this.validateTransition(lead.status, targetStage)) {
      target.classList.add('pipeline-drop-allowed')
      target.classList.remove('pipeline-drop-denied')
    } else {
      target.classList.add('pipeline-drop-denied')
      target.classList.remove('pipeline-drop-allowed')
    }
  },

  handleDragEnter(event, targetStage) {
    event.preventDefault()
    const leadId = event.dataTransfer?.getData('text/plain')
    const lead = this.getLeadById(leadId)
    const target = event.currentTarget
    if (!lead || !target) return
    if (this.validateTransition(lead.status, targetStage)) {
      target.classList.add('pipeline-drop-highlight')
      target.classList.remove('pipeline-drop-deny')
    } else {
      target.classList.add('pipeline-drop-deny')
      target.classList.remove('pipeline-drop-highlight')
    }
  },

  handleDragLeave(event) {
    const target = event.currentTarget
    if (!target) return
    target.classList.remove('pipeline-drop-highlight', 'pipeline-drop-deny', 'pipeline-drop-allowed', 'pipeline-drop-denied')
  },

  clearDropHighlights() {
    document.querySelectorAll('.pipeline-column').forEach(column => {
      column.classList.remove('pipeline-drop-highlight', 'pipeline-drop-deny', 'pipeline-drop-allowed', 'pipeline-drop-denied')
    })
  },

  openLeadDetail(leadId) {
    this.ensureModals()
    const lead = PipelineStore.getLeadById(leadId)
    if (!lead) return
    const modal = document.getElementById('pipelineDetailModal')
    modal.innerHTML = `
      <div class="pipeline-modal">
        <div class="pipeline-modal-header">
          <div>
            <h3>${lead.name}</h3>
            <small style="color:var(--gray-500);">${lead.loanType} • ${lead.city}</small>
          </div>
          <button class="btn cancel" onclick="PipelineUI.closeModal('pipelineDetailModal')">Close</button>
        </div>
        <div class="pipeline-modal-body">
          <div class="field"><label>Mobile</label><input readonly value="${lead.mobile}"></div>
          <div class="field"><label>Assigned Employee</label><input readonly value="${lead.assignedEmployee}"></div>
          <div class="field"><label>Stage</label><input readonly value="${lead.status}"></div>
          <div class="field"><label>Loan Amount</label><input readonly value="₹${(lead.loanAmount / 100000).toFixed(1)}L"></div>
          <div class="field"><label>Lead Score</label><input readonly value="${lead.leadScore}"></div>
          <div class="field"><label>Priority</label><input readonly value="${lead.priority}"></div>
          <div class="field"><label>Source</label><input readonly value="${lead.source}"></div>
          <div class="field"><label>Last Activity</label><input readonly value="${new Date(lead.lastActivity).toLocaleString()}"></div>
          <div class="field"><label>Documents</label><textarea readonly>${lead.documents?.join(', ') || 'No documents uploaded yet'}</textarea></div>
          <div class="field"><label>Loan Purpose</label><textarea readonly>${lead.loanPurpose || ''}</textarea></div>
          <div class="field"><label>Activity Timeline</label><div class="pipeline-timeline">${PipelineUI.renderTimelineItems(lead.id)}</div></div>
        </div>
        <div class="pipeline-modal-footer">
          <button class="cancel" onclick="PipelineUI.closeModal('pipelineDetailModal')">Close</button>
          <button class="save" onclick="PipelineUI.openStatusModal('${lead.id}')">Change Stage</button>
        </div>
      </div>`
    modal.classList.add('active')
  },

  renderTimelineItems(leadId) {
    const activities = PipelineStore.state.activities.filter(item => item.leadId === leadId).slice(0, 8)
    if (!activities.length) return `<div style="color:var(--gray-500);font-size:13px;">No activity yet.</div>`
    return activities.map(item => `
      <div class="pipeline-timeline-item">
        <span class="bullet"></span>
        <div class="timeline-body">
          <strong>${item.action}</strong>
          <small>${item.user} • ${new Date(item.timestamp).toLocaleString()}</small>
          <small>${item.remarks || ''}</small>
        </div>
      </div>`).join('')
  },

  openStatusModal(leadId, targetStage = '') {
    this.ensureModals()
    const lead = PipelineStore.getLeadById(leadId)
    if (!lead) return
    const modal = document.getElementById('pipelineStatusModal')
    const stageChoices = PipelineConfig.transitionRules[lead.status] || []
    const canMove = stageChoices.length > 0
    const defaultNext = targetStage && stageChoices.includes(targetStage) ? targetStage : stageChoices[0] || ''
    modal.innerHTML = `
      <div class="pipeline-modal">
        <div class="pipeline-modal-header">
          <div>
            <h3>Move lead to next stage</h3>
            <small style="color:var(--gray-500);">${lead.name} • ${lead.status}</small>
          </div>
          <button class="btn cancel" onclick="PipelineUI.closeModal('pipelineStatusModal')">Close</button>
        </div>
        <div class="pipeline-modal-body">
          <div class="field"><label>Current Stage</label><input readonly value="${lead.status}"></div>
          <div class="field"><label>Target Stage</label>${canMove ? `<select id="pipelineNewStage" onchange="PipelineUI.handleTargetStageChange()"><option value="">Select stage</option>${stageChoices.map(status => `<option value="${status}" ${status === defaultNext ? 'selected' : ''}>${status}</option>`).join('')}</select>` : `<div class="pipeline-empty-state">No further stage transitions are available from <strong>${lead.status}</strong>.</div>`}</div>
          <div class="field"><label>Remarks</label><textarea id="pipelineStatusRemarks" placeholder="Enter comments or reason"></textarea></div>
          <div class="field hidden" id="pipelineRejectReasonField"><label>Rejection Reason</label><textarea id="pipelineRejectReason" placeholder="Capture rejection reason"></textarea></div>
          <div class="field hidden" id="pipelineQueryDetailsField"><label>Query Details</label><textarea id="pipelineQueryDetails" placeholder="Describe the lender query"></textarea></div>
          <div class="field hidden" id="pipelineFollowUpField"><label>Follow-up Date</label><input id="pipelineFollowUpDate" type="datetime-local"></div>
          <div class="field"><label>Assign Employee</label><select id="pipelineAssignedEmployee"><option value="">Keep current (${lead.assignedEmployee})</option><option>Vaibhav Borge</option><option>Saleem Khan</option><option>Roshan Chavan</option></select></div>
        </div>
        <div class="pipeline-modal-footer">
          <button class="cancel" onclick="PipelineUI.closeModal('pipelineStatusModal')">Cancel</button>
          <button class="save" ${!canMove ? 'disabled' : ''} onclick="PipelineUI.submitStatusChange('${lead.id}')">Confirm</button>
        </div>
      </div>`
    modal.classList.add('active')
    this.currentLeadId = lead.id
    this.currentStatusChange = lead.status
    this.toggleExtraFields(defaultNext)
  },

  handleTargetStageChange() {
    const targetStage = document.getElementById('pipelineNewStage')?.value
    this.toggleExtraFields(targetStage)
  },

  toggleExtraFields(stage) {
    const rejectField = document.getElementById('pipelineRejectReasonField')
    const queryField = document.getElementById('pipelineQueryDetailsField')
    const followUpField = document.getElementById('pipelineFollowUpField')
    if (rejectField) rejectField.classList.toggle('hidden', stage !== 'Rejected')
    if (queryField) queryField.classList.toggle('hidden', stage !== 'Query Raised')
    if (followUpField) followUpField.classList.toggle('hidden', stage !== 'Future Follow-up')
  },

  async submitStatusChange(leadId) {
    const targetStage = document.getElementById('pipelineNewStage')?.value
    const remarks = document.getElementById('pipelineStatusRemarks')?.value.trim()
    const rejectionReason = document.getElementById('pipelineRejectReason')?.value.trim()
    const queryDetails = document.getElementById('pipelineQueryDetails')?.value.trim()
    const followUpDate = document.getElementById('pipelineFollowUpDate')?.value
    const assignedEmployee = document.getElementById('pipelineAssignedEmployee')?.value
    const currentStage = this.currentStatusChange || PipelineStore.getLeadById(leadId)?.status

    if (!targetStage) {
      alert('Please select a target stage.')
      return
    }
    if (!PipelineStore.validateTransition(currentStage, targetStage)) {
      alert(`Cannot move from ${currentStage} to ${targetStage}.`)
      return
    }
    if (targetStage === 'Rejected' && !rejectionReason) {
      alert('Rejection reason is mandatory for Rejected stage.')
      return
    }
    if (targetStage === 'Query Raised' && !queryDetails) {
      alert('Query details are mandatory for Query Raised stage.')
      return
    }
    if (targetStage === 'Future Follow-up' && !followUpDate) {
      alert('Next follow-up date is mandatory for Future Follow-up stage.')
      return
    }

    const result = await PipelineStore.updateLeadStatus(leadId, targetStage, {
      remarks,
      rejectionReason,
      queryDetails,
      followUpDate,
      assignedEmployee: assignedEmployee || undefined
    })
    if (!result.success) {
      alert(result.error)
      return
    }
    this.closeModal('pipelineStatusModal')
    this.renderSummary()
    this.renderBoard()
    this.showToast(`Lead moved to ${targetStage}`)
    if (result.warning) {
      this.showToast(`Warning: ${result.warning}`, 'warning')
    }
  },

  openLeadCapture() {
    if (this.isAdminUser()) {
      this.showToast('Admins cannot add pipeline leads.', 'error')
      return
    }
    const modal = document.getElementById('pipelineStatusModal')
    modal.innerHTML = `
      <div class="pipeline-modal">
        <div class="pipeline-modal-header">
          <div><h3>Add new pipeline lead</h3></div>
          <button class="btn cancel" onclick="PipelineUI.closeModal('pipelineStatusModal')">Close</button>
        </div>
        <div class="pipeline-modal-body">
          <div class="field"><label>Customer Name</label><input id="pipelineNewName"></div>
          <div class="field"><label>Mobile Number</label><input id="pipelineNewMobile"></div>
          <div class="field"><label>Loan Amount</label><input id="pipelineNewAmount" type="number"></div>
          <div class="field"><label>Loan Type</label><input id="pipelineNewLoanType"></div>
          <div class="field"><label>Assigned Employee</label><input id="pipelineNewEmployee"></div>
          <div class="field"><label>Source</label><input id="pipelineNewSource"></div>
          <div class="field"><label>Priority</label><select id="pipelineNewPriority"><option value="Hot">Hot</option><option value="Warm">Warm</option><option value="Cold">Cold</option></select></div>
        </div>
        <div class="pipeline-modal-footer">
          <button class="cancel" onclick="PipelineUI.closeModal('pipelineStatusModal')">Cancel</button>
          <button class="save" onclick="PipelineUI.createNewLead()">Create Lead</button>
        </div>
      </div>`
    modal.classList.add('active')
  },

  async createNewLead() {
    const name = document.getElementById('pipelineNewName')?.value.trim()
    const mobile = document.getElementById('pipelineNewMobile')?.value.trim()
    const amount = Number(document.getElementById('pipelineNewAmount')?.value)
    const loanType = document.getElementById('pipelineNewLoanType')?.value.trim()
    const employee = document.getElementById('pipelineNewEmployee')?.value.trim() || 'Unassigned'
    const source = document.getElementById('pipelineNewSource')?.value.trim() || 'Website Form'
    const priority = document.getElementById('pipelineNewPriority')?.value || 'Warm'
    if (this.isAdminUser()) {
      alert('Admins cannot create new pipeline leads.')
      return
    }
    if (!name || !mobile || !amount || !loanType) {
      alert('Please fill in name, mobile, loan amount and loan type.')
      return
    }
    let leadId = `PL-${Date.now()}`
    const lead = {
      id: leadId,
      name,
      mobile,
      loanAmount: amount,
      loanType,
      leadScore: Math.min(100, 60 + Math.round(Math.random() * 35)),
      assignedEmployee: employee,
      source,
      priority,
      status: 'Fresh Lead',
      lastActivity: new Date().toISOString(),
      stageEnteredAt: new Date().toISOString(),
      city: 'Mumbai',
      pinCode: '400601',
      documents: []
    }

    const backendResult = await PipelineStore.createLeadOnBackend(lead)
    if (backendResult.success && backendResult.id) {
      leadId = backendResult.id
      lead.id = backendResult.id
    } else {
      this.showToast('Created lead locally; backend sync failed.', 'warning')
    }

    PipelineStore.state.leads.unshift(lead)
    PipelineStore.state.activities.unshift({ id: `ACT-${Date.now() + 10}`, leadId, type: 'Lead Created', user: S?.name || S?.email || 'System', timestamp: new Date().toISOString(), action: 'Lead created in pipeline', oldValue: '', newValue: '', remarks: '' })
    PipelineStore.save()
    this.closeModal('pipelineStatusModal')
    this.renderSummary()
    this.renderBoard()
    this.showToast('New lead created in pipeline')
  },

  updateFilter(key, value) {
    PipelineStore.state.filters[key] = value
    this.renderBoard()
    this.renderSummary()
  },

  clearPipelineFilters() {
    PipelineStore.state.filters = { query: '', employee: '', loanType: '', status: '', source: '', city: '', scoreMin: '', scoreMax: '', slaBreach: '' }
    document.getElementById('pipelineSearch').value = ''
    document.getElementById('pipelineEmployee').value = ''
    document.getElementById('pipelineLoanType').value = ''
    document.getElementById('pipelineStatus').value = ''
    document.getElementById('pipelineSource').value = ''
    document.getElementById('pipelineSla').value = ''
    this.renderBoard()
    this.renderSummary()
  },

  closeModal(id) {
    const modal = document.getElementById(id)
    if (!modal) return
    modal.classList.remove('active')
    modal.innerHTML = ''
  },

  formatRelativeTime(dateString) {
    const date = new Date(dateString)
    const diff = (Date.now() - date.getTime()) / 1000
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.round(diff / 60)} min ago`
    if (diff < 86400) return `${Math.round(diff / 3600)} hr ago`
    return `${Math.round(diff / 86400)} d ago`
  },

  showToast(message, type = 'success') {
    const toast = document.createElement('div')
    toast.textContent = message
    toast.style.position = 'fixed'
    toast.style.bottom = '22px'
    toast.style.right = '22px'
    const backgroundColors = {
      success: '#111827',
      warning: '#b45309',
      error: '#991b1b'
    }
    toast.style.background = backgroundColors[type] || backgroundColors.success
    toast.style.color = '#fff'
    toast.style.padding = '14px 18px'
    toast.style.borderRadius = '14px'
    toast.style.boxShadow = '0 18px 36px rgba(15, 23, 42, 0.2)'
    toast.style.zIndex = 1200
    toast.style.opacity = '0'
    toast.style.transition = 'opacity 0.2s ease'
    document.body.appendChild(toast)
    requestAnimationFrame(() => toast.style.opacity = '1')
    setTimeout(() => {
      toast.style.opacity = '0'
      setTimeout(() => toast.remove(), 300)
    }, 2400)
  }
}

window.PipelineUI = PipelineUI
window.renderPipeline = () => PipelineUI.render()
