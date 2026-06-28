// Follow-up Reminder System for CRM
// Handles scheduling, notifications, and management of follow-up reminders

const FollowUpReminders = {
  // Store reminder data
  reminders: [],
  statistics: null,
  notificationPermission: 'default',
  shownReminders: new Set(), // Track reminders already shown to avoid duplication
  
  // Initialize the follow-up reminder system
  async init() {
    console.log('[FollowUp Reminders] Initializing...');
    
    // Request browser notification permission
    await this.requestNotificationPermission();
    
    // Load reminders on page load
    await this.loadTodayReminders();
    
    // Start polling for due reminders
    this.startReminderPolling();
    
    // Add sidebar menu item
    this.addSidebarMenuItem();
    
    console.log('[FollowUp Reminders] Initialized successfully');
  },
  
  // Request browser notification permission
  async requestNotificationPermission() {
    if ('Notification' in window) {
      this.notificationPermission = await Notification.requestPermission();
      console.log('[FollowUp Reminders] Notification permission:', this.notificationPermission);
    }
  },
  
  // Load today's follow-ups
  async loadTodayReminders() {
    try {
      const response = await fetch(`${window.API_BASE}/followups/today`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });
      
      if (response.ok) {
        this.reminders = await response.json();
        console.log('[FollowUp Reminders] Loaded today reminders:', this.reminders.length);
      }
    } catch (error) {
      console.error('[FollowUp Reminders] Failed to load reminders:', error);
    }
  },
  
  // Load follow-up statistics
  async loadStatistics() {
    try {
      const response = await fetch(`${window.API_BASE}/followups/statistics`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });
      
      if (response.ok) {
        this.statistics = await response.json();
        console.log('[FollowUp Reminders] Statistics loaded:', this.statistics);
        return this.statistics;
      }
    } catch (error) {
      console.error('[FollowUp Reminders] Failed to load statistics:', error);
    }
    return null;
  },
  
  // Start polling for due reminders
  startReminderPolling() {
    // Check for due reminders every 30 seconds
    setInterval(async () => {
      await this.checkDueReminders();
    }, 30000);
  },
  
  // Check for due reminders
  async checkDueReminders() {
    try {
      const response = await fetch(`${window.API_BASE}/followups/due-reminders`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });
      
      if (response.ok) {
        const dueReminders = await response.json();
        console.log('[FollowUp Reminders] Due reminders found:', dueReminders.length);
        
        // Show popup for each due reminder only if not already shown
        dueReminders.forEach(reminder => {
          const reminderKey = `${reminder.id}_${reminder.followup_date}_${reminder.followup_time}`;
          
          if (!this.shownReminders.has(reminderKey)) {
            this.showReminderPopup(reminder);
            this.showBrowserNotification(reminder);
            this.shownReminders.add(reminderKey);
          }
        });
      }
    } catch (error) {
      console.error('[FollowUp Reminders] Failed to check due reminders:', error);
    }
  },
  
  // Show reminder popup
  showReminderPopup(reminder) {
    const popup = document.createElement('div');
    popup.className = 'reminder-popup';
    popup.innerHTML = `
      <div class="reminder-popup-content">
        <div class="reminder-popup-header">
          <span class="reminder-icon">🔔</span>
          <h3>Follow-up Reminder</h3>
          <button class="reminder-close" onclick="this.closest('.reminder-popup').remove()">×</button>
        </div>
        <div class="reminder-popup-body">
          <div class="reminder-field">
            <label>Customer:</label>
            <span>${reminder.lead_name || 'N/A'}</span>
          </div>
          <div class="reminder-field">
            <label>Company:</label>
            <span>${reminder.company_name || 'N/A'}</span>
          </div>
          <div class="reminder-field">
            <label>Loan Amount:</label>
            <span>₹${(reminder.funding_amount || 0).toLocaleString('en-IN')}</span>
          </div>
          <div class="reminder-field">
            <label>Phone:</label>
            <span>${reminder.mobile || 'N/A'}</span>
          </div>
          <div class="reminder-field">
            <label>Scheduled:</label>
            <span>${this.formatDateTime(reminder.followup_date, reminder.followup_time)}</span>
          </div>
          <div class="reminder-field">
            <label>Note:</label>
            <span>${reminder.notes || 'No notes'}</span>
          </div>
        </div>
        <div class="reminder-popup-actions">
          <button class="btn btn-primary" onclick="FollowUpReminders.openLead(${reminder.lead_id})">Open Lead</button>
          <button class="btn btn-outline" onclick="FollowUpReminders.callCustomer('${reminder.mobile || ''}')">Call Now</button>
          <button class="btn btn-secondary" onclick="FollowUpReminders.snoozeReminder('${reminder.id}', 10)">Snooze 10 min</button>
          <button class="btn btn-success" onclick="FollowUpReminders.markCompleted('${reminder.id}')">Mark Completed</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(popup);
    
    // Auto-remove after 5 minutes if not interacted with
    setTimeout(() => {
      if (popup.parentNode) {
        popup.remove();
      }
    }, 300000);
  },
  
  // Show browser notification
  showBrowserNotification(reminder) {
    if (this.notificationPermission === 'granted') {
      const notification = new Notification('Follow-up Due', {
        body: `${reminder.lead_name} - ${reminder.company_name || ''}`,
        icon: '/logo.png',
        data: {
          followup_id: reminder.id,
          lead_id: reminder.lead_id
        }
      });
      
      notification.onclick = () => {
        window.focus();
        this.openLead(reminder.lead_id);
        notification.close();
      };
    }
  },
  
  // Add sidebar menu item for follow-up reminders
  addSidebarMenuItem() {
    const navMenu = document.querySelector('nav.sb-nav');
    if (!navMenu) return;
    
    const reminderBtn = document.createElement('div');
    reminderBtn.className = 'nav-grp';
    reminderBtn.innerHTML = `
      <button class="nav-btn" data-sec="followup-reminders" onclick="FollowUpReminders.showRemindersPanel()">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        <span>Follow-up Reminders</span>
        <span class="reminder-badge" id="reminderBadge" style="display:none">0</span>
      </button>
    `;
    
    // Insert after dashboard button
    const dashboardBtn = navMenu.querySelector('[data-sec="dashboard"]');
    if (dashboardBtn) {
      dashboardBtn.closest('.nav-grp').after(reminderBtn);
    }
  },
  
  // Show reminders panel
  showRemindersPanel() {
    // Hide all sections
    document.querySelectorAll('.section').forEach(sec => sec.style.display = 'none');
    
    // Show or create reminders section
    let remindersSection = document.getElementById('sec-followup-reminders');
    if (!remindersSection) {
      remindersSection = this.createRemindersSection();
      document.querySelector('main').appendChild(remindersSection);
    }
    
    remindersSection.style.display = 'block';
    
    // Load and display reminders
    this.loadAndDisplayReminders();
  },
  
  // Create reminders section
  createRemindersSection() {
    const section = document.createElement('section');
    section.className = 'section';
    section.id = 'sec-followup-reminders';
    section.innerHTML = `
      <div class="card" style="margin-bottom:16px">
        <div class="card-hd">
          <div>
            <div class="card-title">Follow-up Reminders</div>
            <div class="card-sub">Manage your customer follow-ups</div>
          </div>
          <div class="toolbar">
            <button class="btn btn-primary" onclick="FollowUpReminders.showScheduleModal()">+ Schedule Follow-up</button>
          </div>
        </div>
      </div>
      
      <!-- Statistics Cards -->
      <div class="reminder-stats" id="reminderStats" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:16px;">
        <div class="stat-card">
          <div class="stat-value" id="statToday">0</div>
          <div class="stat-label">Today's Follow-ups</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" id="statCompleted">0</div>
          <div class="stat-label">Completed</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" id="statPending">0</div>
          <div class="stat-label">Pending</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" id="statOverdue">0</div>
          <div class="stat-label">Overdue</div>
        </div>
      </div>
      
      <!-- Reminder Tabs -->
      <div class="reminder-tabs" style="display:flex;gap:8px;margin-bottom:16px;border-bottom:2px solid var(--gray-200);padding-bottom:8px;">
        <button class="tab-btn active" data-tab="today" onclick="FollowUpReminders.switchTab('today')">Today's Follow-ups</button>
        <button class="tab-btn" data-tab="overdue" onclick="FollowUpReminders.switchTab('overdue')">Overdue</button>
        <button class="tab-btn" data-tab="upcoming" onclick="FollowUpReminders.switchTab('upcoming')">Upcoming</button>
        <button class="tab-btn" data-tab="completed" onclick="FollowUpReminders.switchTab('completed')">Completed</button>
      </div>
      
      <!-- Reminders List -->
      <div class="reminder-list" id="reminderList">
        <div style="padding:40px;text-align:center;color:var(--gray-500);">Loading reminders...</div>
      </div>
    `;
    
    return section;
  },
  
  // Load and display reminders
  async loadAndDisplayReminders() {
    const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab || 'today';
    
    let endpoint = '/followups/today';
    if (activeTab === 'overdue') endpoint = '/followups/overdue';
    if (activeTab === 'upcoming') endpoint = '/followups/upcoming';
    if (activeTab === 'completed') endpoint = '/followups?status=completed';
    
    try {
      const response = await fetch(`${window.API_BASE}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });
      
      if (response.ok) {
        const reminders = await response.json();
        this.renderReminderList(reminders);
      }
    } catch (error) {
      console.error('[FollowUp Reminders] Failed to load reminders:', error);
      document.getElementById('reminderList').innerHTML = `
        <div style="padding:40px;text-align:center;color:var(--gray-500);">
          Failed to load reminders. Please try again.
        </div>
      `;
    }
    
    // Load statistics
    await this.loadStatistics();
    this.updateStatisticsDisplay();
  },
  
  // Render reminder list
  renderReminderList(reminders) {
    const listContainer = document.getElementById('reminderList');
    
    if (!reminders || reminders.length === 0) {
      listContainer.innerHTML = `
        <div style="padding:40px;text-align:center;color:var(--gray-500);">
          No reminders found.
        </div>
      `;
      return;
    }
    
    listContainer.innerHTML = reminders.map(reminder => `
      <div class="reminder-card ${reminder.is_overdue ? 'overdue' : ''}">
        <div class="reminder-card-header">
          <div class="reminder-customer-info">
            <div class="reminder-customer-name">${reminder.lead_name || 'N/A'}</div>
            <div class="reminder-company">${reminder.company_name || 'N/A'}</div>
          </div>
          <div class="reminder-status-badge ${reminder.is_overdue ? 'overdue' : 'scheduled'}">
            ${reminder.is_overdue ? 'Overdue' : 'Scheduled'}
          </div>
        </div>
        <div class="reminder-card-body">
          <div class="reminder-detail">
            <span class="detail-label">Phone:</span>
            <span class="detail-value">${reminder.mobile || 'N/A'}</span>
          </div>
          <div class="reminder-detail">
            <span class="detail-label">Loan Amount:</span>
            <span class="detail-value">₹${(reminder.funding_amount || 0).toLocaleString('en-IN')}</span>
          </div>
          <div class="reminder-detail">
            <span class="detail-label">Assigned To:</span>
            <span class="detail-value">${reminder.assigned_to_name || 'N/A'}</span>
          </div>
          <div class="reminder-detail">
            <span class="detail-label">Scheduled:</span>
            <span class="detail-value">${this.formatDateTime(reminder.followup_date, reminder.followup_time)}</span>
          </div>
          <div class="reminder-detail">
            <span class="detail-label">Note:</span>
            <span class="detail-value">${reminder.notes || 'No notes'}</span>
          </div>
        </div>
        <div class="reminder-card-actions">
          <button class="btn btn-sm btn-outline" onclick="FollowUpReminders.openLead(${reminder.lead_id})">Open Lead</button>
          <button class="btn btn-sm btn-primary" onclick="FollowUpReminders.callCustomer('${reminder.mobile || ''}')">Call Now</button>
          <button class="btn btn-sm btn-outline" onclick="FollowUpReminders.whatsappCustomer('${reminder.mobile || ''}')">WhatsApp</button>
          <button class="btn btn-sm btn-success" onclick="FollowUpReminders.markCompleted('${reminder.id}')">Mark Completed</button>
          <button class="btn btn-sm btn-secondary" onclick="FollowUpReminders.rescheduleReminder('${reminder.id}')">Reschedule</button>
        </div>
      </div>
    `).join('');
  },
  
  // Update statistics display
  updateStatisticsDisplay() {
    if (!this.statistics) return;
    
    document.getElementById('statToday').textContent = this.statistics.total_today;
    document.getElementById('statCompleted').textContent = this.statistics.completed_today;
    document.getElementById('statPending').textContent = this.statistics.pending_today;
    document.getElementById('statOverdue').textContent = this.statistics.overdue_today;
  },
  
  // Switch tab
  switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.tab === tabName) {
        btn.classList.add('active');
      }
    });
    
    this.loadAndDisplayReminders();
  },
  
  // Open lead
  openLead(leadId) {
    // Navigate to lead details or open lead in pipeline
    console.log('[FollowUp Reminders] Opening lead:', leadId);
    // Implementation depends on your existing lead viewing functionality
    if (typeof openLeadDetails === 'function') {
      openLeadDetails(leadId);
    } else {
      // Fallback: navigate to leads section
      const leadsBtn = document.querySelector('[data-sec="leads"]');
      if (leadsBtn) {
        leadsBtn.click();
      }
    }
  },
  
  // Call customer
  callCustomer(phone) {
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  },
  
  // WhatsApp customer
  whatsappCustomer(phone) {
    if (phone) {
      window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, '_blank');
    }
  },
  
  // Mark reminder as completed
  async markCompleted(followupId) {
    try {
      const response = await fetch(`${window.API_BASE}/followups/${followupId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        // Remove popup if exists
        document.querySelectorAll('.reminder-popup').forEach(popup => popup.remove());
        
        // Refresh reminders
        await this.loadAndDisplayReminders();
        
        // Show success message
        if (typeof window.showToast === 'function') {
          window.showToast('Follow-up marked as completed', 'success');
        }
      }
    } catch (error) {
      console.error('[FollowUp Reminders] Failed to mark completed:', error);
      if (typeof window.showToast === 'function') {
        window.showToast('Failed to mark follow-up as completed', 'error');
      }
    }
  },
  
  // Snooze reminder
  async snoozeReminder(followupId, minutes) {
    try {
      const response = await fetch(`${window.API_BASE}/followups/${followupId}/snooze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ snooze_minutes: minutes })
      });
      
      if (response.ok) {
        // Remove popup if exists
        document.querySelectorAll('.reminder-popup').forEach(popup => popup.remove());
        
        // Refresh reminders
        await this.loadAndDisplayReminders();
        
        // Show success message
        if (typeof window.showToast === 'function') {
          window.showToast(`Follow-up snoozed for ${minutes} minutes`, 'success');
        }
      }
    } catch (error) {
      console.error('[FollowUp Reminders] Failed to snooze:', error);
      if (typeof window.showToast === 'function') {
        window.showToast('Failed to snooze follow-up', 'error');
      }
    }
  },
  
  // Reschedule reminder
  rescheduleReminder(followupId) {
    // Show reschedule modal
    console.log('[FollowUp Reminders] Reschedule reminder:', followupId);
    // Implementation would show a modal with date/time picker
  },
  
  // Show schedule modal
  showScheduleModal() {
    // Show modal to schedule new follow-up
    console.log('[FollowUp Reminders] Show schedule modal');
    // Implementation would show a modal with lead selection and date/time picker
  },
  
  // Format date and time
  formatDateTime(date, time) {
    if (!date) return 'N/A';
    
    const dateObj = new Date(date);
    const dateStr = dateObj.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
    
    if (time) {
      const timeStr = new Date(`2000-01-01T${time}`).toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      return `${dateStr} ${timeStr}`;
    }
    
    return dateStr;
  },
  
  // Get auth token
  getAuthToken() {
    try {
      const session = JSON.parse(localStorage.getItem('crm_session') || '{}');
      return session.access_token || session.token || null;
    } catch (e) {
      return null;
    }
  }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  FollowUpReminders.init();
});

// Make available globally
window.FollowUpReminders = FollowUpReminders;
