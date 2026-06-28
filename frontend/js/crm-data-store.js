// ═══════════════════════════════════════════════════════════════
// CRM DATA STORE - Complete Data Management Module
// ═══════════════════════════════════════════════════════════════

const DataStore = {
  // Initialize with sample data if empty
  init() {
    if (!localStorage.getItem('crm_data')) {
      const initialData = {
        leads: [],
        contacts: [],
        accounts: [],
        campaigns: [],
        documents: [],
        loanApplications: [],
        lenderQueries: [],
        deals: [],
        tasks: [],
        targets: [],
        employees: [],
        meetings: [],
        calls: [],
        activities: [],
        sodReports: [],
        eodReports: [],
        wodReports: [],
        meetingParticipants: [],
        meetingAttendance: [],
        meetingNotes: [],
        meetingAttachments: [],
        meetingActivities: [],
        meetingMOMs: [],
        meetingNotifications: [],
        notifications: [],
        settings: { theme: 'light', notifications: true }
      }
      localStorage.setItem('crm_data', JSON.stringify(initialData))
    } else {
      const existingData = JSON.parse(localStorage.getItem('crm_data') || '{}')
      let updated = false

      if (!Array.isArray(existingData.loanApplications)) { existingData.loanApplications = []; updated = true }
      if (!Array.isArray(existingData.lenderQueries)) { existingData.lenderQueries = []; updated = true }
      if (!Array.isArray(existingData.documents)) { existingData.documents = []; updated = true }

      // Ensure meetings collections exist
      if (!Array.isArray(existingData.meetings)) { existingData.meetings = []; updated = true }
      if (!Array.isArray(existingData.meetingParticipants)) { existingData.meetingParticipants = []; updated = true }
      if (!Array.isArray(existingData.meetingAttendance)) { existingData.meetingAttendance = []; updated = true }
      if (!Array.isArray(existingData.meetingNotes)) { existingData.meetingNotes = []; updated = true }
      if (!Array.isArray(existingData.meetingAttachments)) { existingData.meetingAttachments = []; updated = true }
      if (!Array.isArray(existingData.meetingActivities)) { existingData.meetingActivities = []; updated = true }
      if (!Array.isArray(existingData.meetingMOMs)) { existingData.meetingMOMs = []; updated = true }
      if (!Array.isArray(existingData.meetingNotifications)) { existingData.meetingNotifications = []; updated = true }
      if (!Array.isArray(existingData.notifications)) { existingData.notifications = []; updated = true }

      if (updated) {
        localStorage.setItem('crm_data', JSON.stringify(existingData))
      }
    }
  },

  // Get all data
  getAll() {
    return JSON.parse(localStorage.getItem('crm_data') || '{}')
  },

  // Save all data
  saveAll(data) {
    localStorage.setItem('crm_data', JSON.stringify(data))
  },

  getCRMUsers() {
    try {
      const rawUsers = localStorage.getItem('crm_users')
      const users = JSON.parse(rawUsers || '[]')
      if (Array.isArray(users)) return users
      if (users && typeof users === 'object') return Object.values(users)
      return []
    } catch (e) {
      return []
    }
  },

  normalizeBackendTaskRow(task) {
    if (!task || typeof task !== 'object') return null
    const users = this.getCRMUsers()
    const assignee = users.find(u => String(u.id) === String(task.assigned_to))
    const assigner = users.find(u => String(u.id) === String(task.assigned_by))
    const completed = task.completed === true || task.completed === 1 || task.completed === '1' || String(task.status).toLowerCase() === 'done' || String(task.status).toLowerCase() === 'completed'

    return {
      id: String(task.id || task.task_id || task.id || Date.now()),
      title: task.title || task.name || 'Task',
      description: task.description || task.notes || '',
      type: task.type || task.task_type || 'task',
      relatedTo: task.related_to || task.relatedTo || '',
      notes: task.description || task.notes || '',
      assignedTo: assignee?.email || assignee?.name || String(task.assigned_to || task.assignedTo || ''),
      assignedToId: task.assigned_to,
      assignedBy: assigner?.email || assigner?.name || String(task.assigned_by || task.assignedBy || ''),
      assignedById: task.assigned_by,
      dueDate: task.due_date || task.dueDate || '',
      priority: (task.priority || 'medium').toLowerCase(),
      status: String(task.status || (completed ? 'done' : 'pending')).toLowerCase(),
      completed,
      assignedAt: task.created_at || task.assignedAt || '',
      updatedAt: task.updated_at || task.updatedAt || ''
    }
  },

  normalizeBackendTasks(tasks) {
    if (!Array.isArray(tasks)) return []
    return tasks.map(task => this.normalizeBackendTaskRow(task)).filter(Boolean)
  },

  normalizeBackendNotificationRow(notification) {
    if (!notification || typeof notification !== 'object') return null
    const recipients = Array.isArray(notification.recipients)
      ? notification.recipients.map(r => String(r).trim()).filter(Boolean)
      : [];
    const userIdValue = String(notification.user_id || notification.userId || notification.assigned_to || notification.assigneeId || notification.recipientId || '').trim();
    if (userIdValue) recipients.push(userIdValue);

    return {
      id: String(notification.id || notification.notification_id || Date.now()),
      type: notification.type || 'notification',
      title: notification.title || notification.message || 'Notification',
      message: notification.message || '',
      relatedId: notification.reference_id || notification.relatedId || notification.related_id || notification.related_task_id || '',
      createdAt: notification.created_at || notification.createdAt || new Date().toISOString(),
      read: notification.is_seen === true || notification.is_seen === 1 || notification.is_seen === '1' || notification.is_read === true || notification.is_read === 1 || notification.is_read === '1' || false,
      recipientEmail: String(notification.recipientEmail || notification.email || '').trim(),
      recipientName: String(notification.recipientName || notification.recipient_name || notification.name || '').trim(),
      recipientId: userIdValue,
      recipients: Array.from(new Set(recipients.filter(Boolean))),
      user_id: userIdValue // Store user_id directly for easier matching
    }
  },

  normalizeBackendNotifications(notifications) {
    if (!Array.isArray(notifications)) return []
    return notifications.map(notification => this.normalizeBackendNotificationRow(notification)).filter(Boolean)
  },

  mergeDatasetById(existing, incoming) {
    if (!Array.isArray(existing)) existing = []
    if (!Array.isArray(incoming)) incoming = []
    const ids = new Set(existing.map(item => String(item?.id ?? '')))
    const merged = existing.slice()
    incoming.forEach(item => {
      const itemId = String(item?.id ?? '')
      if (!itemId) return
      if (!ids.has(itemId)) {
        merged.push(item)
        ids.add(itemId)
      }
    })
    return merged
  },

  getBackendData(key) {
    try {
      const raw = localStorage.getItem(key)
      const parsed = JSON.parse(raw || '[]')
      return Array.isArray(parsed) ? parsed : []
    } catch (e) {
      console.warn(`Failed to parse backend ${key}:`, e)
      return []
    }
  },

  // Generic CRUD operations
  get(collection) {
    const data = this.getAll()

    if (collection === 'leads') {
      const localLeads = Array.isArray(data.leads) ? data.leads.slice() : []
      const backendLeads = this.getBackendData('crm_leads_journey')
      const mergedLeads = this.mergeDatasetById(localLeads, backendLeads)
      if (mergedLeads.length !== localLeads.length) {
        data.leads = mergedLeads
        this.saveAll(data)
      }
      return mergedLeads
    }

    if (collection === 'employees') {
      const localEmployees = Array.isArray(data.employees) ? data.employees.slice() : []
      const backendUsers = this.getBackendData('crm_users')
      const normalizedUsers = backendUsers.map(user => {
        let name = user.name || user.fullName || user.displayName || user.email || 'Unknown'
        // Remove territory/location suffix like "(Thane)" or "(All)"
        name = name.replace(/\s*\(.*?\)\s*$/g, '').trim()
        return {
          id: String(user.id || user.user_id || user.email || Date.now()),
          name: name,
          email: (user.email || user.user_email || user.username || '').toLowerCase(),
          role: user.role || user.user_role || 'employee',
          department: user.department || user.team || 'Sales',
          initials: name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
        }
      }).filter(user => {
        // Exclude corporate and shree.rathod from employee list
        const email = user.email.toLowerCase()
        return !email.includes('corporate@fundingsathi.in') && !email.includes('shree.rathod@fundingsathi.in')
      })
      const mergedEmployees = this.mergeDatasetById(localEmployees, normalizedUsers)
      if (mergedEmployees.length !== localEmployees.length) {
        data.employees = mergedEmployees
        this.saveAll(data)
      }
      return mergedEmployees
    }

    if (collection !== 'tasks' && collection !== 'notifications' && collection !== 'meetingNotifications') {
      return data[collection] || []
    }

    if (collection === 'tasks') {
      const tasks = Array.isArray(data.tasks) ? data.tasks.slice() : []
      let backendTasks = []
      try {
        const rawBackendTasks = localStorage.getItem('crm_tasks')
        if (rawBackendTasks) {
          const parsedBackendTasks = JSON.parse(rawBackendTasks)
          if (Array.isArray(parsedBackendTasks)) {
            backendTasks = parsedBackendTasks
          }
        }
      } catch (e) {
        console.warn('Failed to parse backend crm_tasks:', e)
      }

      if (backendTasks.length > 0) {
        const normalized = this.normalizeBackendTasks(backendTasks)
        if (normalized.length > 0) {
          const merged = this.mergeDatasetById(tasks, normalized)
          if (merged.length !== tasks.length) {
            data.tasks = merged
            this.saveAll(data)
          }
          return merged
        }
      }

      return tasks
    }

    const notifications = Array.isArray(data[collection]) ? data[collection].slice() : []
    let backendNotifications = []
    try {
      const rawBackendNotifications = localStorage.getItem('crm_notifications')
      if (rawBackendNotifications) {
        const parsedBackendNotifications = JSON.parse(rawBackendNotifications)
        if (Array.isArray(parsedBackendNotifications)) {
          backendNotifications = parsedBackendNotifications
        }
      }
    } catch (e) {
      console.warn('Failed to parse backend crm_notifications:', e)
    }

    if (backendNotifications.length > 0) {
      const normalized = this.normalizeBackendNotifications(backendNotifications)
      if (normalized.length > 0) {
        const merged = this.mergeDatasetById(notifications, normalized)
        if (merged.length !== notifications.length) {
          data[collection] = merged
          this.saveAll(data)
        }
        return merged
      }
    }

    return notifications
  },

  getById(collection, id) {
    return this.get(collection).find(item => String(item.id) === String(id))
  },

  getLoanApplications(leadId) {
    const leadRecord = typeof getLeadsJourney === 'function'
      ? getLeadsJourney().find(item => String(item.id) === String(leadId))
      : null
    const leadCompany = String(leadRecord?.companyName || leadRecord?.company || '').trim().toLowerCase()

    return this.get('loanApplications').filter(item => {
      if (String(item.leadId) === String(leadId)) return true
      if (String(item.parentLeadId) === String(leadId)) return true

      const hasBrokenLeadId = item.leadId == null || String(item.leadId).toLowerCase() === 'nan'
      if (!hasBrokenLeadId || !leadCompany) return false

      return String(item.leadCompany || '').trim().toLowerCase() === leadCompany
    })
  },

  getLenderQueries(applicationId) {
    return this.get('lenderQueries').filter(item => String(item.applicationId) === String(applicationId))
  },

  getActiveLenderQueries(applicationId) {
    return this.getLenderQueries(applicationId).filter(query => !['Resolved', 'Closed'].includes(query.status))
  },

  getLoanApplicationPayout(application) {
    const applied = Number(application.appliedAmount || application.loanAmount || 0)
    const percent = Number(application.expectedPayoutPercent || 0)
    const expected = Number(application.expectedPayoutAmount || Math.round((applied * percent) / 100))
    const actual = Number(application.actualPayoutReceived || 0)
    return { expected, actual, percentReceived: expected ? Math.round((actual / expected) * 100) : 0 }
  },

  getLoanApplicationStatusColor(status) {
    const palette = {
      'Proposal Shared': '#818cf8',
      'Documentation': '#f97316',
      'Processing': '#2563eb',
      'Query Raised': '#ef4444',
      'Query Resolved': '#10b981',
      'Sanctioned': '#0f766e',
      'Agreement Signed': '#059669',
      'Disbursed': '#047857',
      'Payout Pending': '#c2410c',
      'Payout Received': '#047857',
      'Rejected': '#b91c1c',
      'Closed': '#475569',
      'Unknown': '#64748b'
    }
    return palette[String(status)] || palette.Unknown
  },

  getLoanApplicationTAT(application) {
    const entryDate = application.tatTracker?.stageEntryDate || application.submissionDate || application.lastUpdate || new Date().toISOString()
    const entry = new Date(entryDate)
    const elapsedDays = Math.max(0, Math.floor((Date.now() - entry.getTime()) / (1000 * 60 * 60 * 24)))
    const slaDeadline = application.tatTracker?.slaDeadline ? new Date(application.tatTracker.slaDeadline) : null
    const daysRemaining = slaDeadline ? Math.ceil((slaDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
    return { daysInStage: elapsedDays, slaDaysRemaining: daysRemaining, breach: daysRemaining !== null && daysRemaining < 0 }
  },

  getLoanApplicationDashboardStats(leadId) {
    const applications = this.getLoanApplications(leadId)
    const totalApplied = applications.reduce((sum, app) => sum + Number(app.appliedAmount || app.loanAmount || 0), 0)
    const totalSanctioned = applications.reduce((sum, app) => sum + Number(app.sanctionedAmount || 0), 0)
    const totalDisbursed = applications.reduce((sum, app) => sum + Number(app.disbursalAmount || 0), 0)
    const totalExpectedPayout = applications.reduce((sum, app) => sum + Number(app.expectedPayoutAmount || Math.round((Number(app.appliedAmount || app.loanAmount || 0) * Number(app.expectedPayoutPercent || 0)) / 100)), 0)
    const totalActualPayout = applications.reduce((sum, app) => sum + Number(app.actualPayoutReceived || 0), 0)
    const openQueries = applications.reduce((sum, app) => sum + this.getActiveLenderQueries(app.id).length, 0)
    const activeCases = applications.filter(app => !['Rejected', 'Payout Received', 'Closed'].includes(app.status || app.applicationStatus)).length
    return { totalApplications: applications.length, activeCases, totalApplied, totalSanctioned, totalDisbursed, totalExpectedPayout, totalActualPayout, openQueries }
  },

  addLenderQuery(applicationId, query) {
    const application = this.getById('loanApplications', applicationId)
    const now = new Date().toISOString()
    const dateRaised = query.dateRaised || now
    const hours = query.priority === 'Urgent' ? 24 : 48
    const slaDeadline = new Date(new Date(dateRaised).getTime() + hours * 60 * 60 * 1000).toISOString()
    return this.add('lenderQueries', {
      id: query.id || Date.now(),
      queryId: query.queryId || `Q-${Date.now()}`,
      applicationId,
      leadId: application?.leadId || query.leadId,
      description: query.description,
      requiredDocs: query.requiredDocs || [],
      priority: query.priority || 'Normal',
      assignedHandler: query.assignedHandler || 'Unassigned',
      status: query.status || 'Open',
      dateRaised,
      slaDeadline,
      escalationLevel: 0,
      createdAt: now
    })
  },

  updateLoanApplicationStatus(applicationId, updates) {
    const application = this.getById('loanApplications', applicationId)
    if (!application) return null
    const result = this.update('loanApplications', applicationId, {
      ...updates,
      lastUpdate: new Date().toISOString(),
      stageEntryDate: updates.applicationStatus ? new Date().toISOString() : application.stageEntryDate || new Date().toISOString()
    })
    return result
  },

  add(collection, item) {
    const data = this.getAll()
    if (!data[collection]) data[collection] = []
    item.id = item.id || Date.now()
    item.createdAt = item.createdAt || new Date().toISOString()
    data[collection].push(item)
    this.saveAll(data)
    return item
  },

  // Replace entire collection content
  set(collection, items) {
    const data = this.getAll()
    data[collection] = Array.isArray(items) ? items : []
    this.saveAll(data)
    return data[collection]
  },

  update(collection, id, updates) {
    const data = this.getAll()
    const index = data[collection].findIndex(item => String(item.id) === String(id))
    if (index !== -1) {
      data[collection][index] = { ...data[collection][index], ...updates, updatedAt: new Date().toISOString() }
      this.saveAll(data)
      return data[collection][index]
    }
    return null
  },

  delete(collection, id) {
    const data = this.getAll()
    data[collection] = (data[collection] || []).filter(item => String(item.id) !== String(id))
    this.saveAll(data)
    return true
  },

  // Search functionality
  search(collection, query, fields) {
    const items = this.get(collection)
    const lowerQuery = query.toLowerCase()
    return items.filter(item => 
      fields.some(field => 
        String(item[field] || '').toLowerCase().includes(lowerQuery)
      )
    )
  },

  // Filter functionality
  filter(collection, filters) {
    let items = this.get(collection)
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        items = items.filter(item => item[key] === filters[key])
      }
    })
    return items
  },

  // Get counts
  count(collection, filters = {}) {
    return this.filter(collection, filters).length
  },

  // Get dashboard stats
  getDashboardStats(filterFn = null) {
    const leads = filterFn ? this.get('leads').filter(filterFn) : this.get('leads')
    const deals = filterFn ? this.get('deals').filter(filterFn) : this.get('deals')
    const allTasks = this.get('tasks')
    const tasks = filterFn ? allTasks.filter(filterFn) : allTasks
    const calls = filterFn ? this.get('calls').filter(filterFn) : this.get('calls')
    const contacts = filterFn ? this.get('contacts').filter(filterFn) : this.get('contacts')

    const totalLeads = leads.length
    const hotLeads = leads.filter(l => l.status === 'hot').length
    const warmLeads = leads.filter(l => l.status === 'warm').length
    const coldLeads = leads.filter(l => l.status === 'cold').length

    const totalDeals = deals.length
    const openDeals = deals.filter(d => !['closed-won', 'closed-lost'].includes(d.stage)).length
    const wonDeals = deals.filter(d => d.stage === 'closed-won').length
    const lostDeals = deals.filter(d => d.stage === 'closed-lost').length

    const totalDealValue = deals.reduce((sum, d) => sum + (d.value || 0), 0)
    const wonValue = deals.filter(d => d.stage === 'closed-won').reduce((sum, d) => sum + (d.value || 0), 0)

    const conversionRate = totalLeads > 0 ? Math.round((wonDeals / totalLeads) * 100) : 0

    const pendingTasks = tasks.filter(t => !t.completed).length
    const completedTasks = tasks.filter(t => t.completed).length

    // Calculate forecast based on pipeline deals
    const pipelineValue = deals.filter(d => !['closed-won', 'closed-lost'].includes(d.stage))
      .reduce((sum, d) => sum + (d.value || 0) * 0.3, 0)
    const forecastProbability = openDeals > 0 ? Math.min(85, 30 + openDeals * 5) : 0

    // Current month revenue
    const now = new Date()
    const currentMonthDeals = deals.filter(d => {
      const dealDate = new Date(d.updatedAt || d.createdAt)
      return d.stage === 'closed-won' && dealDate.getMonth() === now.getMonth() && dealDate.getFullYear() === now.getFullYear()
    })
    const currentMonthRevenue = currentMonthDeals.reduce((sum, d) => sum + (d.value || 0), 0)

    // Compare with last month
    const lastMonthDeals = deals.filter(d => {
      const dealDate = new Date(d.updatedAt || d.createdAt)
      const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
      const lastYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
      return d.stage === 'closed-won' && dealDate.getMonth() === lastMonth && dealDate.getFullYear() === lastYear
    })
    const lastMonthRevenue = lastMonthDeals.reduce((sum, d) => sum + (d.value || 0), 0)

    return {
      leads: { total: totalLeads, new: leads.filter(l => l.status === 'new').length, contacted: leads.filter(l => l.status === 'contacted').length, qualified: leads.filter(l => l.status === 'qualified').length, hot: hotLeads, warm: warmLeads, cold: coldLeads },
      deals: { total: totalDeals, open: openDeals, won: wonDeals, lost: lostDeals, totalValue: totalDealValue, wonValue: wonValue },
      tasks: { pending: pendingTasks, completed: completedTasks, total: tasks.length },
      calls: calls.length,
      contacts: contacts.length,
      conversionRate,
      forecast: { amount: Math.round(pipelineValue), probability: forecastProbability },
      revenue: { currentMonth: currentMonthRevenue, lastMonth: lastMonthRevenue, trend: currentMonthRevenue >= lastMonthRevenue ? 'up' : 'down' }
    }
  },

  // Pipeline stages
  getPipelineData() {
    const deals = this.get('deals')
    const stages = ['prospecting', 'qualified', 'proposal', 'negotiation', 'closed-won', 'closed-lost']
    const stageLabels = {
      'prospecting': 'Prospecting',
      'qualified': 'Qualified',
      'proposal': 'Proposal',
      'negotiation': 'Negotiation',
      'closed-won': 'Closed Won',
      'closed-lost': 'Closed Lost'
    }
    
    return stages.map(stage => {
      const stageDeals = deals.filter(d => d.stage === stage)
      return {
        stage,
        label: stageLabels[stage],
        count: stageDeals.length,
        value: stageDeals.reduce((sum, d) => sum + (d.value || 0), 0)
      }
    })
  },

  // Revenue by source
  getRevenueBySource() {
    const leads = this.get('leads')
    const sources = ['referral', 'web', 'linkedin', 'campaign', 'cold-email']
    
    return sources.map(source => {
      const sourceLeads = leads.filter(l => l.source === source)
      return {
        source,
        count: sourceLeads.length,
        value: sourceLeads.reduce((sum, l) => sum + (l.dealValue || 0), 0)
      }
    }).sort((a, b) => b.value - a.value)
  },

  // Toggle task completion
  toggleTask(taskId) {
    const task = this.getById('tasks', taskId)
    if (task) {
      return this.update('tasks', taskId, { 
        completed: !task.completed, 
        status: !task.completed ? 'done' : 'pending',
        completedAt: !task.completed ? new Date().toISOString() : null
      })
    }
    return null
  },

  // Add activity
  addActivity(type, description, relatedTo) {
    const user = typeof S !== 'undefined' ? S?.name : 'me'
    return this.add('activities', {
      type,
      description,
      relatedTo,
      timestamp: new Date().toISOString(),
      user: user || 'me'
    })
  }
}

// Auto-initialize when loaded
DataStore.init()

// Export for module systems if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataStore
}
