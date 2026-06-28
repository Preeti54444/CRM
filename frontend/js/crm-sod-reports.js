// SOD Reports Module - Employee Daily Reports Management
const SODStore = {
  state: {
    reports: [],
    employees: [],
    filters: {
      employeeName: '',
      startDate: '',
      endDate: '',
      territory: ''
    },
    viewMode: 'my-reports' // 'my-reports' or 'all' (admin)
  },

  async getAuthToken() {
    try {
      const session = JSON.parse(localStorage.getItem('crm_session') || '{}')
      return session?.access_token || session?.token || session?.accessToken || null
    } catch (err) {
      return null;
    }
  },

  async apiRequest(path, options = {}) {
    const token = await this.getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let endpoint = path;
    if (typeof window !== 'undefined' && typeof window.getCRMApiBase === 'function') {
      const apiBase = getCRMApiBase();
      if (apiBase && typeof path === 'string') {
        const normalized = path.replace(/^\/+/, '');
        endpoint = `${apiBase}/${normalized}`;
      }
    }

    const response = await fetch(endpoint, {
      ...options,
      headers
    });

    if (!response.ok) {
      let errorBody = null;
      try {
        errorBody = await response.json();
      } catch (e) {
        errorBody = { error: response.statusText };
      }
      return { success: false, error: errorBody.error || errorBody.message || response.statusText };
    }

    const data = await response.json();
    return { success: true, data };
  },

  async loadMyReports() {
    const response = await this.apiRequest('/sod', { method: 'GET' });
    if (response.success) {
      this.state.reports = response.data || [];
      return true;
    }
    console.warn('Failed to load SOD reports:', response.error);
    return false;
  },

  async loadEmployeeList() {
    const employees = new Set();
    this.state.reports.forEach(report => {
      if (report.employeeName) {
        employees.add(report.employeeName);
      }
    });
    this.state.employees = Array.from(employees).sort();
    return true;
  },

  async loadByEmployee(employeeName) {
    const response = await this.apiRequest('/sod', { method: 'GET' });
    if (response.success) {
      const raw = response.data || [];
      this.state.reports = raw.filter(report => String(report.employeeName || '').trim() === String(employeeName || '').trim());
      return true;
    }
    console.warn('Failed to load reports for employee:', response.error);
    return false;
  },

  async loadAllReports(limit = 50) {
    const response = await this.apiRequest('/sod', { method: 'GET' });
    if (response.success) {
      this.state.reports = response.data || [];
      return true;
    }
    console.warn('Failed to load all reports:', response.error);
    return false;
  },

  applyFilters() {
    const filters = this.state.filters;
    return this.state.reports.filter(report => {
      if (filters.territory && !report.territory.toLowerCase().includes(filters.territory.toLowerCase())) {
        return false;
      }
      if (filters.employeeName && report.employeeName !== filters.employeeName) {
        return false;
      }
      if (filters.startDate && new Date(report.date) < new Date(filters.startDate)) {
        return false;
      }
      if (filters.endDate && new Date(report.date) > new Date(filters.endDate)) {
        return false;
      }
      return true;
    });
  },

  getAverageScore() {
    if (!this.state.reports.length) return 0;
    const sum = this.state.reports.reduce((acc, r) => acc + (r.aiScore || 0), 0);
    return Math.round(sum / this.state.reports.length);
  },

  getHighestScore() {
    return Math.max(...this.state.reports.map(r => r.aiScore || 0), 0);
  },

  getLowestScore() {
    return Math.min(...this.state.reports.filter(r => r.aiScore > 0).map(r => r.aiScore || 0), 0);
  }
};

const SODUI = {
  async render() {
    const container = document.getElementById('sodApp');
    if (!container) return;

    await SODStore.loadMyReports();
    await SODStore.loadEmployeeList();

    container.innerHTML = `
      <div class="sod-container">
        <div class="sod-toolbar">
          <div class="sod-toolbar-left">
            <h2>SOD Reports - Employee Daily Updates</h2>
            <p style="margin:4px 0 0;color:var(--gray-500);font-size:14px;">Track team performance through daily SOD submissions and AI analysis.</p>
          </div>
          <div class="sod-actions">
            <button class="btn btn-primary" onclick="SODUI.refreshReports()">↻ Refresh</button>
            <button class="btn btn-ghost" onclick="SODUI.toggleAdminView()">Admin View</button>
          </div>
        </div>

        <div class="sod-filters">
          <div class="filter-field">
            <label>Employee</label>
            <select id="sodEmployeeFilter" onchange="SODUI.updateFilter('employeeName', this.value)">
              <option value="">All Employees</option>
              ${SODStore.state.employees.map(emp => `<option value="${emp}">${emp}</option>`).join('')}
            </select>
          </div>
          <div class="filter-field">
            <label>Territory</label>
            <input type="text" id="sodTerritoryFilter" placeholder="Search territory..." oninput="SODUI.updateFilter('territory', this.value)">
          </div>
          <div class="filter-field">
            <label>From Date</label>
            <input type="date" id="sodStartDate" onchange="SODUI.updateFilter('startDate', this.value)">
          </div>
          <div class="filter-field">
            <label>To Date</label>
            <input type="date" id="sodEndDate" onchange="SODUI.updateFilter('endDate', this.value)">
          </div>
          <button class="btn btn-ghost" onclick="SODUI.clearFilters()">Clear Filters</button>
        </div>

        <div class="sod-summary">
          <div class="summary-card">
            <div class="summary-label">Total Reports</div>
            <div class="summary-value">${SODStore.state.reports.length}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Avg AI Score</div>
            <div class="summary-value">${SODStore.getAverageScore()}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Highest Score</div>
            <div class="summary-value">${SODStore.getHighestScore()}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Lowest Score</div>
            <div class="summary-value">${SODStore.getLowestScore()}</div>
          </div>
        </div>

        <div class="sod-table-container">
          <table class="sod-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee</th>
                <th>Territory</th>
                <th>Target</th>
                <th>Focus Segment</th>
                <th>AI Score</th>
                <th>Support Needed</th>
                <th>Remarks</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${this.renderReportRows()}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderReportRows() {
    const filtered = SODStore.applyFilters();
    if (!filtered.length) {
      return '<tr><td colspan="9" style="text-align:center;padding:20px;color:#999;">No reports found</td></tr>';
    }

    return filtered
      .slice(0, 50)
      .map(
        report => `
      <tr onclick="SODUI.showDetail('${report.id}')" style="cursor:pointer;hover:background:#f5f5f5;">
        <td>${new Date(report.date).toLocaleDateString()}</td>
        <td><strong>${report.employeeName || 'Unknown'}</strong></td>
        <td>${report.territory || '-'}</td>
        <td>${report.target || '-'}</td>
        <td>${report.focusSegment || '-'}</td>
        <td>
          <span class="ai-score ${report.aiScore >= 70 ? 'high' : report.aiScore >= 50 ? 'medium' : 'low'}">
            ${report.aiScore || 0}
          </span>
        </td>
        <td>${report.supportNeeded ? '✓' : '-'}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;">${report.remarks || '-'}</td>
        <td><button class="btn btn-sm" onclick="event.stopPropagation(); SODUI.showDetail('${report.id}')">View</button></td>
      </tr>
    `
      )
      .join('');
  },

  async showDetail(reportId) {
    const report = SODStore.state.reports.find(r => r.id === reportId);
    if (!report) return;

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:600px;max-height:90vh;overflow-y:auto;">
        <div class="modal-header">
          <h3>SOD Report Details</h3>
          <button class="btn cancel" onclick="this.closest('.modal').remove()">Close</button>
        </div>
        <div class="modal-body" style="padding:20px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
            <div>
              <strong>Employee:</strong> ${report.employeeName || 'N/A'}
            </div>
            <div>
              <strong>Date:</strong> ${new Date(report.date).toLocaleDateString()}
            </div>
            <div>
              <strong>Territory:</strong> ${report.territory || 'N/A'}
            </div>
            <div>
              <strong>Email:</strong> ${report.email || 'N/A'}
            </div>
            <div>
              <strong>Target:</strong> ${report.target || 'N/A'}
            </div>
            <div>
              <strong>AI Score:</strong> <span class="ai-score ${report.aiScore >= 70 ? 'high' : report.aiScore >= 50 ? 'medium' : 'low'}">${report.aiScore || 0}</span>
            </div>
          </div>

          <hr style="margin:15px 0;">

          <div>
            <strong>Focus Industry/Segment:</strong>
            <p>${report.focusSegment || 'N/A'}</p>
          </div>

          <div>
            <strong>Support Needed:</strong>
            <p>${report.supportNeeded || 'No'}</p>
          </div>

          <div>
            <strong>Remarks:</strong>
            <p>${report.remarks || 'N/A'}</p>
          </div>

          <div>
            <strong>Key Meetings Planned:</strong>
            <p>${report.keyMeetings || 'None'}</p>
          </div>

          <hr style="margin:15px 0;">

          <div>
            <strong>AI Suggestions (Primary):</strong>
            <p style="white-space:pre-wrap;font-size:13px;">${(report.aiSuggestions || 'N/A').substring(0, 500)}</p>
          </div>

          <div>
            <strong>AI Suggestions (Secondary):</strong>
            <p style="white-space:pre-wrap;font-size:13px;">${(report.aiSuggestions2 || 'N/A').substring(0, 500)}</p>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => {
      if (e.target === modal) modal.remove();
    });
  },

  updateFilter(key, value) {
    SODStore.state.filters[key] = value;
    this.render();
  },

  clearFilters() {
    SODStore.state.filters = {
      employeeName: '',
      startDate: '',
      endDate: '',
      territory: ''
    };
    this.render();
  },

  async refreshReports() {
    if (SODStore.state.viewMode === 'all') {
      await SODStore.loadAllReports();
    } else {
      await SODStore.loadMyReports();
    }
    this.render();
  },

  async toggleAdminView() {
    if (SODStore.state.viewMode === 'my-reports') {
      SODStore.state.viewMode = 'all';
      await SODStore.loadAllReports(100);
    } else {
      SODStore.state.viewMode = 'my-reports';
      await SODStore.loadMyReports();
    }
    this.render();
  }
};

// Export for use in main CRM
if (typeof window !== 'undefined') {
  window.SODStore = SODStore;
  window.SODUI = SODUI;
}
