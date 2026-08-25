/**
 * Pipeline Sync Service - Real-time pipeline updates
 * Handles automatic pipeline movement updates from backend via WebSocket
 */

const PipelineSync = {
  websocket: null,
  reconnectInterval: null,
  isConnected: false,
  callbacks: {
    onLeadStatusChanged: [],
    onPipelineStageChanged: [],
    onDashboardUpdate: []
  },

  init() {
    this.connect();
    this.setupEventListeners();
  },

  connect() {
    const wsUrl = this.getWebSocketUrl();
    console.log('[PipelineSync] Connecting to WebSocket:', wsUrl);
    
    try {
      this.websocket = new WebSocket(wsUrl);
      
      this.websocket.onopen = () => {
        console.log('[PipelineSync] WebSocket connected');
        this.isConnected = true;
        this.clearReconnectInterval();
      };
      
      this.websocket.onmessage = (event) => {
        this.handleMessage(event.data);
      };
      
      this.websocket.onclose = () => {
        console.log('[PipelineSync] WebSocket disconnected');
        this.isConnected = false;
        this.scheduleReconnect();
      };
      
      this.websocket.onerror = (error) => {
        console.error('[PipelineSync] WebSocket error:', error);
      };
    } catch (error) {
      console.error('[PipelineSync] Failed to create WebSocket:', error);
      this.scheduleReconnect();
    }
  },

  getWebSocketUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws`;
  },

  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      console.log('[PipelineSync] Received message:', message);
      
      switch (message.type) {
        case 'lead_status_changed':
          this.handleLeadStatusChanged(message.payload);
          break;
        case 'data_sync':
          this.handleDataSync(message.payload);
          break;
        case 'notification':
          this.handleNotification(message.payload);
          break;
        default:
          console.log('[PipelineSync] Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('[PipelineSync] Error handling message:', error);
    }
  },

  handleLeadStatusChanged(payload) {
    console.log('[PipelineSync] Lead status changed:', payload);
    
    // Update lead in local storage
    this.updateLeadInStorage(payload);
    
    // Trigger callbacks
    this.callbacks.onLeadStatusChanged.forEach(callback => callback(payload));
    
    // Update dashboard if visible
    this.updateDashboardCounts();
    
    // Refresh deal list when pipeline statuses change
    if (typeof renderDeals === 'function') {
      renderDeals();
    }
    
    // Show notification to user
    this.showPipelineNotification(payload);
  },

  handleDataSync(payload) {
    console.log('[PipelineSync] Data sync:', payload);
    
    if (payload.entity === 'lead') {
      if (payload.action === 'status_changed') {
        this.handleLeadStatusChanged(payload.data);
      } else if (payload.action === 'update') {
        this.updateLeadInStorage(payload.data);
      }
    }
  },

  handleNotification(payload) {
    console.log('[PipelineSync] Notification received:', payload);
    
    // Show browser notification if permitted
    if (Notification.permission === 'granted') {
      new Notification(payload.title || 'Pipeline Update', {
        body: payload.message,
        icon: '/favicon.ico'
      });
    }
  },

  updateLeadInStorage(payload) {
    try {
      // Update lead in crm_pipeline_leads
      const pipelineLeads = JSON.parse(localStorage.getItem('crm_pipeline_leads') || '[]');
      const leadIndex = pipelineLeads.findIndex(lead => lead.id === payload.lead_id);
      
      if (leadIndex !== -1) {
        pipelineLeads[leadIndex].lead_status = payload.new_status;
        pipelineLeads[leadIndex].pipeline_stage = payload.new_stage;
        pipelineLeads[leadIndex].updated_at = new Date().toISOString();
        localStorage.setItem('crm_pipeline_leads', JSON.stringify(pipelineLeads));
      }
      
      // Update lead in crm_leads_journey if exists
      const journeyLeads = JSON.parse(localStorage.getItem('crm_leads_journey') || '[]');
      const journeyIndex = journeyLeads.findIndex(lead => lead.id === payload.lead_id);
      
      if (journeyIndex !== -1) {
        journeyLeads[journeyIndex].status = payload.new_status;
        journeyLeads[journeyIndex].pipeline_stage = payload.new_stage;
        journeyLeads[journeyIndex].updated_at = new Date().toISOString();
        localStorage.setItem('crm_leads_journey', JSON.stringify(journeyLeads));
      }
      
      console.log('[PipelineSync] Lead updated in storage');
    } catch (error) {
      console.error('[PipelineSync] Error updating lead in storage:', error);
    }
  },

  updateDashboardCounts() {
    // Trigger dashboard refresh if dashboard is visible
    if (typeof refreshDashboard === 'function') {
      refreshDashboard();
    }
    
    // Update pipeline board if visible
    if (typeof refreshPipelineBoard === 'function') {
      refreshPipelineBoard();
    }
    
    // Also refresh deal list if available
    if (typeof renderDeals === 'function') {
      renderDeals();
    }
  },

  showPipelineNotification(payload) {
    const message = `Lead "${payload.lead_name}" moved from "${payload.previous_stage}" to "${payload.new_stage}"`;
    
    // Add to notification queue
    const notifications = JSON.parse(localStorage.getItem('crm_pipeline_notifications') || '[]');
    notifications.unshift({
      id: Date.now(),
      type: 'pipeline_change',
      title: 'Pipeline Stage Changed',
      message: message,
      lead_id: payload.lead_id,
      lead_name: payload.lead_name,
      previous_stage: payload.previous_stage,
      new_stage: payload.new_stage,
      changed_by: payload.changed_by,
      created_at: new Date().toISOString(),
      read: false
    });
    
    // Keep only last 50 notifications
    const trimmed = notifications.slice(0, 50);
    localStorage.setItem('crm_pipeline_notifications', JSON.stringify(trimmed));
    
    // Show toast notification
    this.showToast(message);
  },

  showToast(message) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'pipeline-toast';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;
    toast.textContent = message;
    
    // Add animation keyframes if not present
    if (!document.getElementById('pipeline-toast-styles')) {
      const style = document.createElement('style');
      style.id = 'pipeline-toast-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100 opacity: 0); }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
      toast.style.animation = 'slideIn 0.3s ease-out reverse';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  scheduleReconnect() {
    if (this.reconnectInterval) return;
    
    this.reconnectInterval = setInterval(() => {
      console.log('[PipelineSync] Attempting to reconnect...');
      this.connect();
    }, 5000);
  },

  clearReconnectInterval() {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
  },

  setupEventListeners() {
    // Listen for custom events from other parts of the application
    window.addEventListener('leadStatusChanged', (event) => {
      this.handleLeadStatusChanged(event.detail);
    });
  },

  // Register callback for lead status changes
  onLeadStatusChanged(callback) {
    this.callbacks.onLeadStatusChanged.push(callback);
  },

  // Register callback for pipeline stage changes
  onPipelineStageChanged(callback) {
    this.callbacks.onPipelineStageChanged.push(callback);
  },

  // Register callback for dashboard updates
  onDashboardUpdate(callback) {
    this.callbacks.onDashboardUpdate.push(callback);
  },

  disconnect() {
    this.clearReconnectInterval();
    if (this.websocket) {
      this.websocket.close();
    }
  }
};

// Initialize on page load
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PipelineSync.init());
  } else {
    PipelineSync.init();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PipelineSync;
}
