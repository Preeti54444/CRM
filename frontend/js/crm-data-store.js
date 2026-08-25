// ═══════════════════════════════════════════════════════════════
// CRM DATA STORE - Complete Data Management Module
// ═══════════════════════════════════════════════════════════════

const DataStore = {
  // Flag to prevent recursive event dispatching
  _isDispatching: false,

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
    const currentData = localStorage.getItem('crm_data')
    const newData = JSON.stringify(data)
    
    // Only save and dispatch event if data has actually changed
    if (currentData === newData) {
      return
    }
    
    localStorage.setItem('crm_data', JSON.stringify(data))
    // async background push to backend when API client is available
    try {
      if (window.SyncQueue && typeof window.SyncQueue.enqueue === 'function') {
        // Enqueue sync operations for tasks and calls; worker handles retries
        try {
          if (Array.isArray(data.tasks)) {
            window.SyncQueue.enqueue({ method: 'POST', endpoint: '/tasks/sync', body: { items: data.tasks } })
          }
          if (Array.isArray(data.calls)) {
            window.SyncQueue.enqueue({ method: 'POST', endpoint: '/calls/sync', body: { items: data.calls } })
          }
        } catch (e) {
          console.warn('saveAll: enqueue failed', e)
        }
      }
    } catch (e) {
      console.warn('saveAll: background sync unavailable', e)
    }
    // Notify listeners that DataStore has been updated (prevent recursive dispatching)
    try {
      if (!this._isDispatching) {
        this._isDispatching = true
        window.dispatchEvent(new CustomEvent('crm-data-sync', { detail: { source: 'DataStore.saveAll' } }))
        // Reset flag after event dispatch
        setTimeout(() => { this._isDispatching = false }, 0)
      }
    } catch (e) {
      // ignore
    }
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
      completedAt: task.completed_at || task.completedAt || '',
      updatedAt: task.updated_at || task.updatedAt || ''
    }
  },

  normalizeBackendTasks(tasks) {
    if (!Array.isArray(tasks)) return []
    return tasks.map(task => this.normalizeBackendTaskRow(task)).filter(Boolean)
  },

  normalizeBackendCallRow(call) {
    if (!call || typeof call !== 'object') return null
    return {
      id: String(call.id || call.call_id || call.uuid || Date.now()),
      timestamp: call.timestamp || call.date || call.call_date || call.createdAt || call.created_at || '',
      date: call.date || call.timestamp || call.call_date || '',
      time: call.time || call.call_time || '',
      agent: call.agent || call.sale_executive || call.salesExecutive || call.agentName || call.agent_name || call.owner || call.assignedTo || call.createdBy || '',
      agentEmail: call.agentEmail || call.agent_email || call.ownerEmail || call.owner_email || '',
      customer: call.customer || call.customerName || call.contactPerson || call.contact_person_name || call.contactPersonName || call.name || '',
      company: call.company || call.companyName || call.customerCompany || call.customer_company_name || '',
      customer_company_name: call.customer_company_name || call.company || call.companyName || call.customerCompany || '',
      contact_person_name: call.contact_person_name || call.customer || call.customerName || call.contactPerson || call.contactPersonName || call.name || '',
      designation: call.designation || call.designationName || call.designation_title || call.job_title || '',
      action: call.action || call.callAction || '',
      email: call.email || call.emailId || call.email_address || '',
      phone: call.phone || call.contactNumber || call.mobile || call.contact_number || '',
      product: call.product || call.productName || call.productDiscussed || call.product_discussed || '',
      source: call.source || call.leadSource || call.lead_source || call.origin || call.sourse || '',
      outcome: call.outcome || call.status || call.callOutcome || call.final_outcome || '',
      purpose: call.purpose || call.purposeOfCall || call.purpose_of_call || call.callPurpose || '',
      followupDate: call.followupDate || call.nextFollowUp || call.followup || call.next_follow_up_date || '',
      recording: call.recording || call.recording_url || call.rec || false,
      duration: call.duration || call.callDuration || call.callSeconds || '',
      notes: call.notes || call.summary || call.description || ''
    }
  },

  normalizeBackendCalls(calls) {
    if (!Array.isArray(calls)) return []
    return calls.map(c => this.normalizeBackendCallRow(c)).filter(Boolean)
  },

  async fetchCallsFromBackend() {
    try {
      if (window.API && typeof window.API.getCalls === 'function') {
        const response = await window.API.getCalls()
        console.log('[DataStore] Backend API response:', response)
        const items = Array.isArray(response) ? response : (response?.items || [])
        console.log('[DataStore] Extracted items:', items.length)
        
        if (items.length > 0) {
          console.log('[DataStore] First item from backend:', items[0])
          const normalized = this.normalizeBackendCalls(items)
          console.log('[DataStore] Normalized calls:', normalized.length)
          if (normalized.length > 0) {
            console.log('[DataStore] First normalized call:', normalized[0])
          }
          const currentCalls = this.get('calls') || []
          const merged = this.mergeDatasetById(currentCalls, normalized)
          
          // Store in both DataStore and legacy localStorage
          this.set('calls', merged)
          localStorage.setItem('crm_calls', JSON.stringify(items))
          
          console.log(`[DataStore] Fetched ${items.length} calls from backend, merged to ${merged.length} total`)
          return merged
        }
      }
    } catch (e) {
      console.warn('[DataStore] Failed to fetch calls from backend:', e)
    }
    return this.get('calls') || []
  },

  normalizeBackendContactRow(contact) {
    if (!contact || typeof contact !== 'object') return null
    const name = contact.contact_name || contact.contactName || contact.contactPerson || contact.name || ''
    return {
      id: String(contact.id || contact.contact_id || contact.contactId || Date.now()),
      contactId: contact.contact_id || contact.contactId || '',
      name: name,
      company: contact.company_name || contact.companyName || contact.company || '',
      phone: contact.phone || contact.mobile || contact.contactNumber || contact.contact_number || '',
      email: contact.email || contact.email_id || contact.emailId || '',
      title: contact.designation || contact.title || '',
      type: contact.contact_status && String(contact.contact_status).toLowerCase().includes('customer') ? 'customer' : 'prospect',
      source: contact.source || contact.lead_source || '',
      notes: contact.notes || contact.description || '',
      createdAt: contact.created_at || contact.createdAt || new Date().toISOString(),
      updatedAt: contact.updated_at || contact.updatedAt || new Date().toISOString(),
    }
  },

  normalizeBackendContacts(contacts) {
    if (!Array.isArray(contacts)) return []
    return contacts.map(c => this.normalizeBackendContactRow(c)).filter(Boolean)
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
    const map = new Map()
    // seed from existing
    existing.forEach(item => {
      const id = String(item?.id ?? '')
      if (!id) return
      map.set(id, Object.assign({}, item))
    })
    // merge incoming, preferring non-empty incoming values to fill/update existing
    incoming.forEach(item => {
      const id = String(item?.id ?? '')
      if (!id) return
      if (map.has(id)) {
        const base = map.get(id)
        Object.keys(item).forEach(k => {
          const v = item[k]
          if (v !== undefined && v !== null && String(v).trim() !== '') {
            base[k] = v
          }
        })
        map.set(id, base)
      } else {
        map.set(id, item)
      }
    })
    return Array.from(map.values())
  },

  getBackendData(key) {
    try {
      const raw = localStorage.getItem(key)
      const parsed = JSON.parse(raw || '[]')
      // Kick off background refresh from API if available
      try {
        if (window.API && typeof window.API.get === 'function') {
          const endpointMap = {
            'crm_leads_journey': '/leads?limit=1000',
            'crm_users': '/users',
            'crm_tasks': '/tasks',
            'crm_calls': '/calls',
            'crm_notifications': '/notifications',
            'crm_leads': '/leads',
            'crm_contacts': '/contacts'
          }
          const endpoint = endpointMap[key]
          if (endpoint) {
            // fetch and update localStorage asynchronously
            window.API.get(endpoint).then(resp => {
              try {
                // normalize response to array if needed
                let items = []
                if (Array.isArray(resp)) items = resp
                else if (resp && Array.isArray(resp.items)) items = resp.items
                else {
                  for (const v of Object.values(resp || {})) {
                    if (Array.isArray(v)) { items = v; break }
                  }
                }
                if (Array.isArray(items) && items.length) {
                  localStorage.setItem(key, JSON.stringify(items))
                }
              } catch (e) {
                console.warn('getBackendData: failed to normalize API response', e)
              }
            }).catch(e => {
              // ignore network errors, retain existing localStorage
            })
          }
        }
      } catch (e) {
        // ignore
      }
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
        const email = (user.email || '').toLowerCase()
        const name = (user.name || '').toLowerCase()
        // Exclude corporate, admin, and specific internal admin users from employee list
        return !email.includes('corporate@fundingsathi.in')
          && !email.includes('admin@fundingsathi.com')
          && !email.includes('shree.rathod@fundingsathi.in')
          && !name.includes('shree rathod')
      })

      const mergedEmployees = this.mergeDatasetById(localEmployees, normalizedUsers)

      // Deduplicate employees by normalized name/email so each person appears once
      const dedupedEmployees = []
      const seenKeys = new Set()
      mergedEmployees.forEach(employee => {
        const email = (employee.email || '').toLowerCase().trim()
        const name = (employee.name || '').toLowerCase().trim()
        const key = email || name
        if (!key) return
        if (seenKeys.has(key)) return
        seenKeys.add(key)
        dedupedEmployees.push(employee)
      })

      if (dedupedEmployees.length !== localEmployees.length || dedupedEmployees.length !== mergedEmployees.length) {
        data.employees = dedupedEmployees
        this.saveAll(data)
      }
      return dedupedEmployees
    }

    if (collection === 'contacts') {
      const localContacts = Array.isArray(data.contacts) ? data.contacts.slice() : []
      const backendContacts = this.getBackendData('crm_contacts')
      const normalizedContacts = this.normalizeBackendContacts(backendContacts)
      const mergedContacts = this.mergeDatasetById(localContacts, normalizedContacts)
      if (mergedContacts.length !== localContacts.length) {
        data.contacts = mergedContacts
        this.saveAll(data)
      }
      return mergedContacts
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

    if (collection === 'calls') {
      const calls = Array.isArray(data.calls) ? data.calls.slice() : []
      let backendCalls = []
      try {
        const rawBackendCalls = localStorage.getItem('crm_calls')
        if (rawBackendCalls) {
          const parsedBackendCalls = JSON.parse(rawBackendCalls)
          if (Array.isArray(parsedBackendCalls)) {
            backendCalls = parsedBackendCalls
          }
        }
      } catch (e) {
        console.warn('Failed to parse backend crm_calls:', e)
      }

      if (backendCalls.length > 0) {
        const normalized = this.normalizeBackendCalls(backendCalls)
        if (normalized.length > 0) {
          const merged = this.mergeDatasetById(calls, normalized)
          const existingJson = JSON.stringify(calls || [])
          const mergedJson = JSON.stringify(merged || [])
          if (mergedJson !== existingJson) {
            data.calls = merged
            this.saveAll(data)
          }
          return merged
        }
      }

      return calls
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

  _findIndexById(collection, id) {
    const targetId = String(id || '').trim()
    if (!targetId) return -1

    return this.get(collection).findIndex(item => {
      if (!item || typeof item !== 'object') return false
      const candidateIds = [
        item.id,
        item.task_id,
        item.taskId,
        item.call_id,
        item.callId,
        item.meeting_id,
        item.meetingId,
        item.loan_id,
        item.loanId,
        item.lead_id,
        item.leadId,
        item.deal_id,
        item.dealId,
        item.application_id,
        item.applicationId,
        item.customer_id,
        item.customerId
      ].filter(value => value !== undefined && value !== null)
      return candidateIds.some(value => String(value) === targetId)
    })
  },

  getById(collection, id) {
    const index = this._findIndexById(collection, id)
    if (index === -1) return null
    return this.get(collection)[index]
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
    // enqueue backend create (reliable async)
    try {
      if (window.SyncQueue && typeof window.SyncQueue.enqueue === 'function') {
        if (collection === 'tasks') {
          window.SyncQueue.enqueue({ method: 'POST', endpoint: '/tasks', body: item })
        } else if (collection === 'calls') {
          window.SyncQueue.enqueue({ method: 'POST', endpoint: '/calls', body: item })
        } else if (collection === 'leads') {
          window.SyncQueue.enqueue({ method: 'POST', endpoint: '/leads', body: item })
        } else if (collection === 'contacts') {
          window.SyncQueue.enqueue({ method: 'POST', endpoint: '/contacts', body: item })
        }
      }
    } catch (e) {
      console.warn('add: enqueue unavailable', e)
    }
    return item
  },

  // Notify on add via crm-data-sync
  addAndNotify(collection, item) {
    const added = this.add(collection, item)
    try { window.dispatchEvent(new CustomEvent('crm-data-sync', { detail: { entity: collection, action: 'add', id: added.id } })) } catch (e) {}
    return added
  },

  // Replace entire collection content
  set(collection, items) {
    const data = this.getAll()
    data[collection] = Array.isArray(items) ? items : []
    this.saveAll(data)
    return data[collection]
  },

  // set with notification
  setAndNotify(collection, items) {
    const res = this.set(collection, items)
    try { window.dispatchEvent(new CustomEvent('crm-data-sync', { detail: { entity: collection, action: 'set' } })) } catch (e) {}
    return res
  },

  update(collection, id, updates) {
    const data = this.getAll()
    const index = this._findIndexById(collection, id)
    if (index !== -1) {
      data[collection][index] = { ...data[collection][index], ...updates, updatedAt: new Date().toISOString() }
      this.saveAll(data)
      // enqueue backend update
      try {
        if (window.SyncQueue && typeof window.SyncQueue.enqueue === 'function') {
          if (collection === 'tasks') {
            window.SyncQueue.enqueue({ method: 'PUT', endpoint: `/tasks/${id}`, body: data[collection][index] })
          } else if (collection === 'calls') {
            window.SyncQueue.enqueue({ method: 'PUT', endpoint: `/calls/${id}`, body: data[collection][index] })
          } else if (collection === 'leads') {
            window.SyncQueue.enqueue({ method: 'PUT', endpoint: `/leads/${id}`, body: data[collection][index] })
          } else if (collection === 'contacts') {
            window.SyncQueue.enqueue({ method: 'PUT', endpoint: `/contacts/${id}`, body: data[collection][index] })
          }
        }
      } catch (e) {
        console.warn('update: enqueue unavailable', e)
      }
      return data[collection][index]
    }
    return null
  },

  // update with notification
  updateAndNotify(collection, id, updates) {
    const res = this.update(collection, id, updates)
    if (res) {
      try { window.dispatchEvent(new CustomEvent('crm-data-sync', { detail: { entity: collection, action: 'update', id } })) } catch (e) {}
    }
    return res
  },

  delete(collection, id) {
    const data = this.getAll()
    data[collection] = (data[collection] || []).filter(item => String(item.id) !== String(id))
    this.saveAll(data)
    // enqueue backend delete
    try {
      if (window.SyncQueue && typeof window.SyncQueue.enqueue === 'function') {
        if (collection === 'tasks') {
          window.SyncQueue.enqueue({ method: 'DELETE', endpoint: `/tasks/${id}` })
        } else if (collection === 'calls') {
          window.SyncQueue.enqueue({ method: 'DELETE', endpoint: `/calls/${id}` })
        } else if (collection === 'leads') {
          window.SyncQueue.enqueue({ method: 'DELETE', endpoint: `/leads/${id}` })
        } else if (collection === 'contacts') {
          window.SyncQueue.enqueue({ method: 'DELETE', endpoint: `/contacts/${id}` })
        }
      }
    } catch (e) {
      console.warn('delete: enqueue unavailable', e)
    }
    return true
  },

  // delete with notification
  deleteAndNotify(collection, id) {
    const data = this.getAll()
    data[collection] = (data[collection] || []).filter(item => String(item.id) !== String(id))
    this.saveAll(data)
    try { window.dispatchEvent(new CustomEvent('crm-data-sync', { detail: { entity: collection, action: 'delete', id } })) } catch (e) {}
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

  normalizeLeadAsDeal(lead) {
    if (!lead || typeof lead !== 'object') return null
    const pipelineStage = String(lead.pipeline_stage || lead.status || lead.lead_status || '').trim().toLowerCase()
    const stageMap = {
      'new lead': 'login-docs-submitted',
      'product exploration': 'login-docs-submitted',
      'commercial fit': 'approved-limit',
      'basic financial document': 'approved-limit',
      'login with lender': 'login-docs-submitted',
      'bank selected': 'login-docs-submitted',
      'login initiated': 'login-docs-submitted',
      'login pending': 'login-docs-submitted',
      'login docs submitted': 'login-docs-submitted',
      'approved limit': 'approved-limit',
      'sanction docs': 'sanction-docs',
      'pre-disbursement': 'pre-disbursement',
      'disbursement': 'disbursement',
      'payout received': 'payout-received',
      'closed won': 'closed-won',
      'closed lost': 'closed-lost'
    }

    let stage = stageMap[pipelineStage] || String(lead.stage || lead.Stage || '').trim().toLowerCase().replace(/\s+/g, '-')
    const allowedStages = ['login-with-lender', 'login-docs-submitted', 'approved-limit', 'sanction-docs', 'pre-disbursement', 'disbursement', 'payout-received', 'closed-won', 'closed-lost']
    if (!allowedStages.includes(stage)) {
      stage = 'login-docs-submitted'
    }

    const value = Number(lead.loanAmount || lead.dealValue || lead.deal_value || lead.value || 0) || 0
    const closeDate = lead.closeDate || lead.stageEnteredAt || lead.lastActivity || ''
    const probability = Number(lead.probability || lead.probabilityPercent || lead.probability_value || 20) || 20

    return {
      id: lead.id ? `LEAD-DEAL-${String(lead.id)}` : `LEAD-DEAL-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      leadId: lead.id || lead.lead_id || '',
      name: lead.name || lead.contactPerson || lead.companyName || lead.company || 'Lead',
      company: lead.company || lead.companyName || '',
      value,
      stage,
      probability,
      closeDate,
      source: lead.source || lead.leadSource || '',
      description: lead.description || lead.notes || '',
      createdAt: lead.createdAt || lead.stageEnteredAt || lead.lastActivity || new Date().toISOString(),
      assignedTo: lead.assignedEmployee || lead.salesExecutive || lead.assignedTo || ''
    }
  },

  syncLeadToDeal(lead) {
    if (!lead || typeof lead !== 'object') return null

    const normalizedDeal = this.normalizeLeadAsDeal(lead)
    if (!normalizedDeal) return null

    const existingDeals = this.get('deals') || []
    const existingDeal = existingDeals.find(item => {
      const leadId = String(item.leadId || item.lead_id || item.id || '')
      const candidateLeadId = String(normalizedDeal.leadId || lead.id || lead.lead_id || '')
      return leadId && candidateLeadId && leadId === candidateLeadId
    })

    if (existingDeal) {
      return this.update('deals', existingDeal.id, normalizedDeal)
    }

    return this.add('deals', normalizedDeal)
  },

  getLeadDerivedDeals() {
    const leads = this.get('leads') || []
    return leads
      .map(lead => this.normalizeLeadAsDeal(lead))
      .filter(Boolean)
  },

  getPipelineDeals() {
    const localDeals = Array.isArray(this.get('deals')) ? this.get('deals') : []
    const leadDeals = Array.isArray(this.getLeadDerivedDeals()) ? this.getLeadDerivedDeals() : []
    const merged = new Map()

    localDeals.forEach(deal => {
      const key = String(deal.id || `${deal.name}|${deal.company}`).toLowerCase()
      merged.set(key, deal)
    })

    leadDeals.forEach(deal => {
      const key = String(deal.id || `${deal.name}|${deal.company}`).toLowerCase()
      if (!merged.has(key)) {
        merged.set(key, deal)
      }
    })

    return Array.from(merged.values())
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

    const pipelineDeals = typeof this.getPipelineDeals === 'function' ? this.getPipelineDeals() : deals
    const totalDeals = pipelineDeals.length
    const openDeals = pipelineDeals.filter(d => !['closed-won', 'closed-lost'].includes(d.stage)).length
    const wonDeals = pipelineDeals.filter(d => d.stage === 'closed-won').length
    const lostDeals = pipelineDeals.filter(d => d.stage === 'closed-lost').length

    const totalDealValue = pipelineDeals.reduce((sum, d) => sum + (d.value || 0), 0)
    const wonValue = pipelineDeals.filter(d => d.stage === 'closed-won').reduce((sum, d) => sum + (d.value || 0), 0)

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
    const deals = typeof this.getPipelineDeals === 'function' ? this.getPipelineDeals() : this.get('deals')
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

// Keep the shared store available on the browser window for legacy globals
if (typeof window !== 'undefined') {
  window.DataStore = DataStore
}

// Export for module systems if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataStore
}
