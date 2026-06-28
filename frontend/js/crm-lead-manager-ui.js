/**
 * Lead Manager UI Module - CRM System
 * Provides UI components and interactions for lead management
 * Version: 1.0.0
 */

class LeadManagerUI {
  constructor(leadManager) {
    this.leadManager = leadManager;
    this.currentFilters = {};
    this.currentPage = 1;
    this.pageSize = 20;
  }

  /**
   * Initialize UI components in HTML
   */
  initializeUI(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container ${containerId} not found`);
      return;
    }

    container.innerHTML = `
      <div class="lead-manager-container">
        <!-- Header -->
        <div class="lead-manager-header">
          <h2>Lead Management</h2>
          <div class="header-actions">
            <button class="btn btn-primary" id="btnNewLead">+ New Lead</button>
            <button class="btn btn-secondary" id="btnBulkUpload">📤 Bulk Upload</button>
            <button class="btn btn-secondary" id="btnExport">📥 Export</button>
          </div>
        </div>

        <!-- Filter Panel -->
        <div class="filter-panel" id="filterPanel">
          <div class="filter-section">
            <h4>Filters</h4>
            <div class="filter-group">
              <label>Status</label>
              <select id="filterStatus" multiple class="form-control">
                <option value="">All Statuses</option>
                ${this.getStatusOptions()}
              </select>
            </div>

            <div class="filter-group">
              <label>Lead Source</label>
              <select id="filterSource" class="form-control">
                <option value="">All Sources</option>
                ${this.getSourceOptions()}
              </select>
            </div>

            <div class="filter-group">
              <label>Loan Type</label>
              <select id="filterLoanType" class="form-control">
                <option value="">All Types</option>
                <option value="Business Loan">Business Loan</option>
                <option value="Home Loan">Home Loan</option>
                <option value="Personal Loan">Personal Loan</option>
                <option value="Loan Against Property">Loan Against Property</option>
              </select>
            </div>

            <div class="filter-group">
              <label>Lead Score Range</label>
              <div class="range-inputs">
                <input type="number" id="filterScoreMin" placeholder="Min" min="0" max="100" class="form-control">
                <span>-</span>
                <input type="number" id="filterScoreMax" placeholder="Max" min="0" max="100" class="form-control">
              </div>
            </div>

            <div class="filter-group">
              <label>CIBIL Score Range</label>
              <div class="range-inputs">
                <input type="number" id="filterCibilMin" placeholder="Min" class="form-control">
                <span>-</span>
                <input type="number" id="filterCibilMax" placeholder="Max" class="form-control">
              </div>
            </div>

            <div class="filter-group">
              <label>Loan Amount Range</label>
              <div class="range-inputs">
                <input type="number" id="filterLoanAmountMin" placeholder="Min (₹)" class="form-control">
                <span>-</span>
                <input type="number" id="filterLoanAmountMax" placeholder="Max (₹)" class="form-control">
              </div>
            </div>

            <div class="filter-group">
              <label>City</label>
              <input type="text" id="filterCity" placeholder="Enter city" class="form-control">
            </div>

            <div class="filter-group">
              <label>Date Range</label>
              <input type="date" id="filterDateFrom" class="form-control">
              <input type="date" id="filterDateTo" class="form-control">
            </div>

            <div class="filter-actions">
              <button class="btn btn-success" id="btnApplyFilters">Apply Filters</button>
              <button class="btn btn-light" id="btnClearFilters">Clear</button>
            </div>
          </div>
        </div>

        <!-- Search Bar -->
        <div class="search-bar">
          <input type="text" id="nlSearch" placeholder="Natural Language Search: e.g., 'Show all Thane BL leads above 20L'" class="form-control">
          <button class="btn btn-info" id="btnSearch">Search</button>
        </div>

        <!-- Statistics Panel -->
        <div class="statistics-panel" id="statisticsPanel">
          <div class="stat-card">
            <div class="stat-label">Total Leads</div>
            <div class="stat-value" id="statTotalLeads">0</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Avg Score</div>
            <div class="stat-value" id="statAvgScore">0</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Avg CIBIL</div>
            <div class="stat-value" id="statAvgCibil">0</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Fresh Leads</div>
            <div class="stat-value" id="statFreshLeads">0</div>
          </div>
        </div>

        <!-- Leads Table -->
        <div class="leads-table-container">
          <table class="leads-table" id="leadsTable">
            <thead>
              <tr>
                <th>Lead ID</th>
                <th>Name</th>
                <th>Mobile</th>
                <th>Loan Type</th>
                <th>Amount</th>
                <th>Score</th>
                <th>Status</th>
                <th>Source</th>
                <th>Assigned To</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="leadsTableBody">
              <!-- Populated by JavaScript -->
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination" id="paginationContainer">
          <button class="btn btn-sm" id="btnPrevPage">← Previous</button>
          <span id="pageInfo" class="page-info">Page 1</span>
          <button class="btn btn-sm" id="btnNextPage">Next →</button>
        </div>

        <!-- Pipeline Summary Modal -->
        <div class="modal" id="pipelineModal">
          <div class="modal-content">
            <span class="close">&times;</span>
            <h3>Pipeline Summary</h3>
            <div id="pipelineContent" class="pipeline-content">
              <!-- Populated by JavaScript -->
            </div>
          </div>
        </div>

        <!-- New Lead Modal -->
        <div class="modal" id="newLeadModal">
          <div class="modal-content modal-large">
            <span class="close">&times;</span>
            <h3>Create New Lead</h3>
            <form id="newLeadForm" class="lead-form">
              <div class="form-section">
                <h4>Identity Information</h4>
                <div class="form-row">
                  <div class="form-group">
                    <label>Full Name *</label>
                    <input type="text" name="fullName" required class="form-control">
                  </div>
                  <div class="form-group">
                    <label>Mobile (Primary) *</label>
                    <input type="tel" name="mobile" required class="form-control">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Mobile (Alternate)</label>
                    <input type="tel" name="mobileAlternate" class="form-control">
                  </div>
                  <div class="form-group">
                    <label>Email</label>
                    <input type="email" name="email" class="form-control">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>PAN Number</label>
                    <input type="text" name="panNumber" class="form-control">
                  </div>
                  <div class="form-group">
                    <label>Aadhaar Number</label>
                    <input type="text" name="aadhaarNumber" class="form-control">
                  </div>
                </div>
              </div>

              <div class="form-section">
                <h4>Demographics</h4>
                <div class="form-row">
                  <div class="form-group">
                    <label>Date of Birth</label>
                    <input type="date" name="dateOfBirth" class="form-control">
                  </div>
                  <div class="form-group">
                    <label>Gender</label>
                    <select name="gender" class="form-control">
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>City</label>
                    <input type="text" name="city" class="form-control">
                  </div>
                  <div class="form-group">
                    <label>Pin Code</label>
                    <input type="text" name="pinCode" class="form-control">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>State</label>
                    <select name="state" class="form-control">
                      <option value="">Select State</option>
                      <option value="Maharashtra">Maharashtra</option>
                      <option value="Karnataka">Karnataka</option>
                      <option value="Delhi">Delhi</option>
                      <option value="Bangalore">Bangalore</option>
                      <option value="Tamil Nadu">Tamil Nadu</option>
                      <option value="Uttar Pradesh">Uttar Pradesh</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Full Address</label>
                    <textarea name="fullAddress" class="form-control"></textarea>
                  </div>
                </div>
              </div>

              <div class="form-section">
                <h4>Employment Details</h4>
                <div class="form-row">
                  <div class="form-group">
                    <label>Occupation Type</label>
                    <select name="occupationType" class="form-control">
                      <option value="">Select</option>
                      <option value="Salaried">Salaried</option>
                      <option value="Self-Employed">Self-Employed</option>
                      <option value="Professional">Professional</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Company Name</label>
                    <input type="text" name="companyName" class="form-control">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Designation</label>
                    <input type="text" name="designation" class="form-control">
                  </div>
                  <div class="form-group">
                    <label>Monthly Income (₹)</label>
                    <input type="number" name="monthlyIncome" class="form-control">
                  </div>
                </div>
                <div class="form-group">
                  <label>Years in Current Job</label>
                  <input type="number" name="yearsInCurrentJob" class="form-control" step="0.1">
                </div>
              </div>

              <div class="form-section">
                <h4>Loan Requirement *</h4>
                <div class="form-row">
                  <div class="form-group">
                    <label>Loan Type *</label>
                    <select name="loanType" required class="form-control">
                      <option value="">Select Loan Type</option>
                      <option value="Business Loan">Business Loan</option>
                      <option value="Home Loan">Home Loan</option>
                      <option value="Personal Loan">Personal Loan</option>
                      <option value="Loan Against Property">Loan Against Property</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Loan Amount (₹) *</label>
                    <input type="number" name="loanAmount" required class="form-control">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Loan Purpose</label>
                    <input type="text" name="loanPurpose" class="form-control">
                  </div>
                  <div class="form-group">
                    <label>Tenure Preference (Months)</label>
                    <input type="number" name="tenurePreference" class="form-control">
                  </div>
                </div>
              </div>

              <div class="form-section">
                <h4>Source & Assignment *</h4>
                <div class="form-row">
                  <div class="form-group">
                    <label>Lead Source *</label>
                    <select name="leadSource" required class="form-control">
                      ${this.getSourceOptionsForForm()}
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Assigned To</label>
                    <input type="text" name="assignedEmployee" class="form-control">
                  </div>
                </div>
                <div class="form-group">
                  <label>Assigned Team/Branch</label>
                  <input type="text" name="assignedTeam" class="form-control">
                </div>
              </div>

              <div class="form-actions">
                <button type="submit" class="btn btn-success">Create Lead</button>
                <button type="button" class="btn btn-secondary" id="btnCancelNewLead">Cancel</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Lead Details Modal -->
        <div class="modal" id="leadDetailsModal">
          <div class="modal-content modal-large">
            <span class="close">&times;</span>
            <div class="lead-details" id="leadDetailsContent">
              <!-- Populated by JavaScript -->
            </div>
          </div>
        </div>

        <!-- Status Change Modal -->
        <div class="modal" id="statusChangeModal">
          <div class="modal-content">
            <span class="close">&times;</span>
            <h3>Update Lead Status</h3>
            <form id="statusChangeForm">
              <div class="form-group">
                <label>Current Status</label>
                <input type="text" id="currentStatusDisplay" class="form-control" readonly>
                <input type="hidden" id="currentLeadId">
              </div>
              <div class="form-group">
                <label>New Status *</label>
                <select id="newStatus" class="form-control" required>
                  <option value="">Select Status</option>
                </select>
              </div>
              <div class="form-group">
                <label>Reason / Notes</label>
                <textarea id="statusReason" class="form-control" rows="3"></textarea>
              </div>
              <div class="form-actions">
                <button type="submit" class="btn btn-success">Update Status</button>
                <button type="button" class="btn btn-secondary" id="btnCancelStatus">Cancel</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Duplicate Check Modal -->
        <div class="modal" id="duplicateModal">
          <div class="modal-content modal-large">
            <span class="close">&times;</span>
            <h3>Duplicate Lead Detected</h3>
            <div id="duplicateContent" class="duplicate-content">
              <!-- Populated by JavaScript -->
            </div>
          </div>
        </div>

        <!-- Lead Creation Success Modal -->
        <div class="modal" id="leadSuccessModal">
          <div class="modal-content modal-large" style="background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); border: 2px solid #4caf50;">
            <div class="success-header" style="text-align: center; padding: 20px; border-bottom: 2px solid #4caf50;">
              <div style="font-size: 48px; color: #4caf50; margin-bottom: 10px;">✓</div>
              <h2 style="color: #4caf50; margin: 0;">Lead Created Successfully!</h2>
              <p style="color: #666; margin-top: 5px;">Your new lead has been added to the system</p>
            </div>

            <div class="success-content" id="successContent" style="padding: 25px;">
              <!-- Lead summary will be inserted here -->
            </div>

            <div class="success-actions" style="padding: 20px; border-top: 2px solid #ddd; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
              <button class="btn btn-primary" onclick="window.leadManagerUI.viewNewLeadDetails()" style="background-color: #2196F3;">
                👁️ View Full Details
              </button>
              <button class="btn btn-success" onclick="window.leadManagerUI.scrollToNewLead()" style="background-color: #4caf50;">
                📍 Go to Lead List
              </button>
              <button class="btn btn-info" onclick="window.leadManagerUI.createAnotherLead()" style="background-color: #ff9800;">
                ➕ Create Another Lead
              </button>
              <button class="btn btn-secondary" onclick="window.leadManagerUI.closeSuccessModal()">
                ✕ Close
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Check if user is admin and hide lead creation buttons
    this.hideButtonsForAdmin();

    this.attachEventListeners();
  }

  /**
   * Hide New Lead and Bulk Upload buttons for admin users
   */
  hideButtonsForAdmin() {
    try {
      const session = JSON.parse(localStorage.getItem('crm_session') || '{}');
      const role = String(session.role || '').trim().toLowerCase();
      
      if (role === 'admin') {
        // Hide New Lead button
        const btnNewLead = document.getElementById('btnNewLead');
        if (btnNewLead) {
          btnNewLead.style.display = 'none';
        }
        
        // Hide Bulk Upload button
        const btnBulkUpload = document.getElementById('btnBulkUpload');
        if (btnBulkUpload) {
          btnBulkUpload.style.display = 'none';
        }
      }
    } catch (error) {
      console.error('Error checking admin role:', error);
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Main buttons
    document.getElementById('btnNewLead')?.addEventListener('click', () => this.openNewLeadModal());
    document.getElementById('btnBulkUpload')?.addEventListener('click', () => this.openBulkUploadModal());
    document.getElementById('btnExport')?.addEventListener('click', () => this.exportLeads());

    // Filter actions
    document.getElementById('btnApplyFilters')?.addEventListener('click', () => this.applyFilters());
    document.getElementById('btnClearFilters')?.addEventListener('click', () => this.clearFilters());
    document.getElementById('btnSearch')?.addEventListener('click', () => this.performNLSearch());

    // Pagination
    document.getElementById('btnPrevPage')?.addEventListener('click', () => this.previousPage());
    document.getElementById('btnNextPage')?.addEventListener('click', () => this.nextPage());

    // Modal close buttons
    document.querySelectorAll('.close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.target.closest('.modal').style.display = 'none';
      });
    });

    // Form submissions
    document.getElementById('newLeadForm')?.addEventListener('submit', (e) => this.handleNewLeadSubmit(e));
    document.getElementById('statusChangeForm')?.addEventListener('submit', (e) => this.handleStatusChange(e));

    // Modal cancel buttons
    document.getElementById('btnCancelNewLead')?.addEventListener('click', () => {
      document.getElementById('newLeadModal').style.display = 'none';
    });
    document.getElementById('btnCancelStatus')?.addEventListener('click', () => {
      document.getElementById('statusChangeModal').style.display = 'none';
    });

    // Natural language search Enter key
    document.getElementById('nlSearch')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.performNLSearch();
    });
  }

  /**
   * Load and display leads
   */
  async loadLeads() {
    try {
      const result = await this.leadManager.searchLeads(this.currentFilters, {
        limit: this.pageSize,
        offset: (this.currentPage - 1) * this.pageSize,
        orderBy: 'dateCreated',
        orderDirection: 'desc'
      });

      if (!result.success) {
        alert('Error loading leads: ' + result.error);
        return;
      }

      this.renderLeadsTable(result.leads);
      this.updatePaginationInfo(result.total);
      this.updateStatistics();

      this.currentPage = 1;
    } catch (error) {
      console.error('Error loading leads:', error);
      alert('Error loading leads');
    }
  }

  /**
   * Render leads table
   */
  renderLeadsTable(leads) {
    const tbody = document.getElementById('leadsTableBody');
    if (!tbody) return;

    if (leads.length === 0) {
      tbody.innerHTML = '<tr><td colspan="11" class="text-center">No leads found</td></tr>';
      return;
    }

    tbody.innerHTML = leads.map(lead => `
      <tr class="lead-row" data-lead-id="${lead.leadId}">
        <td><strong>${lead.leadId}</strong></td>
        <td>${lead.fullName}</td>
        <td>${lead.mobile}</td>
        <td>${lead.loanType || '-'}</td>
        <td>₹${this.formatNumber(lead.loanAmount || 0)}</td>
        <td>
          <span class="score-badge ${this.getScoreBadgeClass(lead.leadScore)}">
            ${lead.leadScore}
          </span>
        </td>
        <td>
          <span class="status-badge" data-status="${lead.status}">
            ${lead.status}
          </span>
        </td>
        <td><small>${lead.leadSource}</small></td>
        <td>${lead.assignedEmployee || '-'}</td>
        <td><small>${new Date(lead.dateCreated).toLocaleDateString('en-IN')}</small></td>
        <td>
          <div class="action-buttons">
            <button class="btn-icon" title="View Details" onclick="window.leadManagerUI.viewLeadDetails('${lead.leadId}')">👁️</button>
            <button class="btn-icon" title="Change Status" onclick="window.leadManagerUI.openStatusChangeModal('${lead.leadId}', '${lead.status}')">🔄</button>
            <button class="btn-icon" title="Delete" onclick="window.leadManagerUI.deleteLead('${lead.leadId}')">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  /**
   * Get score badge class
   */
  getScoreBadgeClass(score) {
    if (score >= 80) return 'score-excellent';
    if (score >= 60) return 'score-good';
    if (score >= 40) return 'score-fair';
    return 'score-poor';
  }

  /**
   * Format number with commas
   */
  formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /**
   * Update pagination info
   */
  updatePaginationInfo(total) {
    const pageInfo = document.getElementById('pageInfo');
    if (pageInfo) {
      const totalPages = Math.ceil(total / this.pageSize);
      pageInfo.textContent = `Page ${this.currentPage} of ${totalPages} (${total} total)`;
    }
  }

  /**
   * Apply filters
   */
  async applyFilters() {
    this.currentFilters = {
      status: document.getElementById('filterStatus')?.value,
      leadSource: document.getElementById('filterSource')?.value,
      loanType: document.getElementById('filterLoanType')?.value,
      scoreMin: parseInt(document.getElementById('filterScoreMin')?.value) || undefined,
      scoreMax: parseInt(document.getElementById('filterScoreMax')?.value) || undefined,
      cibilMin: parseInt(document.getElementById('filterCibilMin')?.value) || undefined,
      cibilMax: parseInt(document.getElementById('filterCibilMax')?.value) || undefined,
      loanAmountMin: parseInt(document.getElementById('filterLoanAmountMin')?.value) || undefined,
      loanAmountMax: parseInt(document.getElementById('filterLoanAmountMax')?.value) || undefined,
      city: document.getElementById('filterCity')?.value,
      dateFrom: document.getElementById('filterDateFrom')?.value,
      dateTo: document.getElementById('filterDateTo')?.value
    };

    // Remove undefined values
    Object.keys(this.currentFilters).forEach(key => {
      if (this.currentFilters[key] === undefined || this.currentFilters[key] === '') {
        delete this.currentFilters[key];
      }
    });

    this.currentPage = 1;
    await this.loadLeads();
  }

  /**
   * Clear filters
   */
  async clearFilters() {
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterSource').value = '';
    document.getElementById('filterLoanType').value = '';
    document.getElementById('filterScoreMin').value = '';
    document.getElementById('filterScoreMax').value = '';
    document.getElementById('filterCibilMin').value = '';
    document.getElementById('filterCibilMax').value = '';
    document.getElementById('filterLoanAmountMin').value = '';
    document.getElementById('filterLoanAmountMax').value = '';
    document.getElementById('filterCity').value = '';
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';

    this.currentFilters = {};
    this.currentPage = 1;
    await this.loadLeads();
  }

  /**
   * Perform natural language search
   */
  async performNLSearch() {
    const query = document.getElementById('nlSearch')?.value;
    if (!query) return;

    try {
      const result = await this.leadManager.naturalLanguageSearch(query);
      if (result.success) {
        this.renderLeadsTable(result.leads);
        this.updatePaginationInfo(result.leads.length);
      } else {
        alert('Search error: ' + result.error);
      }
    } catch (error) {
      console.error('Error performing NL search:', error);
    }
  }

  /**
   * Open new lead modal
   */
  openNewLeadModal() {
    // Prevent admin users from creating leads
    const session = JSON.parse(localStorage.getItem('crm_session') || '{}');
    const role = String(session.role || '').trim().toLowerCase();
    
    if (role === 'admin') {
      alert('Admins can only view leads, not create new leads.');
      return;
    }

    const modal = document.getElementById('newLeadModal');
    if (modal) {
      modal.style.display = 'block';
      document.getElementById('newLeadForm').reset();
    }
  }

  /**
   * Handle new lead form submission
   */
  async handleNewLeadSubmit(e) {
    e.preventDefault();

    // Prevent admin users from creating leads
    const session = JSON.parse(localStorage.getItem('crm_session') || '{}');
    const role = String(session.role || '').trim().toLowerCase();
    
    if (role === 'admin') {
      alert('Admins cannot create new leads.');
      return;
    }

    const formData = new FormData(document.getElementById('newLeadForm'));
    const leadData = Object.fromEntries(formData);

    // Convert numeric fields
    leadData.monthlyIncome = parseInt(leadData.monthlyIncome) || 0;
    leadData.loanAmount = parseInt(leadData.loanAmount) || 0;
    leadData.yearsInCurrentJob = parseFloat(leadData.yearsInCurrentJob) || 0;

    try {
      const result = await this.leadManager.createLead(leadData, 'current-user');

      if (result.isDuplicate) {
        this.showDuplicateModal(result.duplicates, leadData);
      } else if (result.success) {
        // Close form modal and show success modal
        document.getElementById('newLeadModal').style.display = 'none';
        
        // Store the new lead data for display
        this.lastCreatedLead = result.lead;
        this.lastCreatedLeadId = result.lead.leadId;
        
        // Show success modal with lead details
        this.showLeadSuccessModal(result.lead);
        
        // Reload leads in background to show new lead in the table
        await this.loadLeads();
      } else {
        alert('Error creating lead: ' + result.error);
      }
    } catch (error) {
      console.error('Error creating lead:', error);
      alert('Error creating lead');
    }
  }

  /**
   * Show duplicate modal
   */
  showDuplicateModal(duplicates, proposedLead) {
    const modal = document.getElementById('duplicateModal');
    const content = document.getElementById('duplicateContent');

    let html = `
      <p>The following leads match the new lead data:</p>
      <div class="duplicate-list">
    `;

    duplicates.forEach((dup, idx) => {
      html += `
        <div class="duplicate-item">
          <h5>Match Type: ${dup.type}</h5>
          <p>Matching Leads: ${dup.leads.length}</p>
          ${dup.leads.map((lead, i) => `
            <div class="duplicate-lead">
              <strong>${lead.fullName}</strong> - ${lead.mobile} (Score: ${lead.leadScore})
            </div>
          `).join('')}
        </div>
      `;
    });

    html += `
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" onclick="window.leadManagerUI.proceedWithNewLead()">Create as New Lead</button>
        <button class="btn btn-secondary" onclick="window.leadManagerUI.cancelNewLead()">Cancel</button>
      </div>
    `;

    content.innerHTML = html;
    modal.style.display = 'block';
  }

  /**
   * Proceed with new lead creation despite duplicates
   */
  async proceedWithNewLead() {
    // TODO: Implement merge/duplicate handling
    document.getElementById('duplicateModal').style.display = 'none';
  }

  /**
   * Cancel new lead creation
   */
  cancelNewLead() {
    document.getElementById('duplicateModal').style.display = 'none';
    document.getElementById('newLeadModal').style.display = 'block';
  }

  /**
   * View lead details
   */
  async viewLeadDetails(leadId) {
    try {
      const result = await this.leadManager.getLead(leadId);
      if (!result.success) {
        alert('Error loading lead: ' + result.error);
        return;
      }

      const lead = result.lead;
      const modal = document.getElementById('leadDetailsModal');
      const content = document.getElementById('leadDetailsContent');

      content.innerHTML = `
        <div class="lead-details-header">
          <h3>${lead.fullName}</h3>
          <span class="status-badge" data-status="${lead.status}">${lead.status}</span>
          <span class="score-badge ${this.getScoreBadgeClass(lead.leadScore)}">${lead.leadScore}</span>
        </div>

        <div class="details-grid">
          <div class="details-section">
            <h4>Contact Information</h4>
            <p><strong>Mobile:</strong> ${lead.mobile}</p>
            <p><strong>Email:</strong> ${lead.email || '-'}</p>
            <p><strong>PAN:</strong> ${lead.panNumber || '-'}</p>
          </div>

          <div class="details-section">
            <h4>Demographics</h4>
            <p><strong>Age:</strong> ${lead.age || '-'}</p>
            <p><strong>City:</strong> ${lead.city || '-'}</p>
            <p><strong>State:</strong> ${lead.state || '-'}</p>
          </div>

          <div class="details-section">
            <h4>Employment</h4>
            <p><strong>Type:</strong> ${lead.occupationType || '-'}</p>
            <p><strong>Company:</strong> ${lead.companyName || '-'}</p>
            <p><strong>Monthly Income:</strong> ₹${this.formatNumber(lead.monthlyIncome || 0)}</p>
          </div>

          <div class="details-section">
            <h4>Loan Details</h4>
            <p><strong>Type:</strong> ${lead.loanType}</p>
            <p><strong>Amount:</strong> ₹${this.formatNumber(lead.loanAmount)}</p>
            <p><strong>Purpose:</strong> ${lead.loanPurpose || '-'}</p>
          </div>

          <div class="details-section">
            <h4>Bureau Information</h4>
            <p><strong>CIBIL Score:</strong> ${lead.cibilScore || 'Not Pulled'}</p>
            <p><strong>CIBIL Date:</strong> ${lead.cibilDate ? new Date(lead.cibilDate).toLocaleDateString('en-IN') : '-'}</p>
          </div>

          <div class="details-section">
            <h4>Assignment</h4>
            <p><strong>Lead Source:</strong> ${lead.leadSource}</p>
            <p><strong>Assigned To:</strong> ${lead.assignedEmployee || 'Unassigned'}</p>
            <p><strong>Team:</strong> ${lead.assignedTeam || '-'}</p>
          </div>
        </div>

        <div class="activity-section">
          <h4>Recent Activities</h4>
          <div class="activity-list">
            ${(lead.activityHistory || []).slice(0, 10).map(activity => `
              <div class="activity-item">
                <span class="activity-type">${activity.type}</span>
                <span class="activity-description">${activity.description}</span>
                <span class="activity-time">${new Date(activity.timestamp).toLocaleString('en-IN')}</span>
              </div>
            `).join('') || '<p>No activities yet</p>'}
          </div>
        </div>

        <div class="details-actions">
          <button class="btn btn-primary" onclick="window.leadManagerUI.openStatusChangeModal('${lead.leadId}', '${lead.status}')">Change Status</button>
          <button class="btn btn-secondary" onclick="window.leadManagerUI.editLead('${lead.leadId}')">Edit Lead</button>
          <button class="btn btn-danger" onclick="window.leadManagerUI.deleteLead('${lead.leadId}')">Delete Lead</button>
        </div>
      `;

      modal.style.display = 'block';

    } catch (error) {
      console.error('Error viewing lead details:', error);
    }
  }

  /**
   * Open status change modal
   */
  openStatusChangeModal(leadId, currentStatus) {
    const modal = document.getElementById('statusChangeModal');
    document.getElementById('currentLeadId').value = leadId;
    document.getElementById('currentStatusDisplay').value = currentStatus;

    // Get allowed next statuses
    const statusObj = this.leadManager.statusPipeline.find(s => s.status === currentStatus);
    const nextStatuses = statusObj ? statusObj.nextStates : [];

    const newStatusSelect = document.getElementById('newStatus');
    newStatusSelect.innerHTML = '<option value="">Select Status</option>' + nextStatuses.map(status => `
      <option value="${status}">${status}</option>
    `).join('');

    modal.style.display = 'block';
  }

  /**
   * Handle status change
   */
  async handleStatusChange(e) {
    e.preventDefault();

    const leadId = document.getElementById('currentLeadId').value;
    const newStatus = document.getElementById('newStatus').value;
    const reason = document.getElementById('statusReason').value;

    if (!newStatus) {
      alert('Please select a new status');
      return;
    }

    try {
      const result = await this.leadManager.updateLeadStatus(leadId, newStatus, reason, 'current-user');

      if (result.success) {
        alert('Status updated successfully!');
        document.getElementById('statusChangeModal').style.display = 'none';
        await this.loadLeads();
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  }

  /**
   * Delete lead
   */
  async deleteLead(leadId) {
    if (!confirm('Are you sure you want to delete this lead?')) return;

    try {
      // Delete from backend database FIRST - localStorage cleanup happens after
      const apiClient = window.CRM_API_CLIENT || (typeof CRMApiClient !== 'undefined' ? new CRMApiClient() : null);
      
      if (apiClient) {
        await apiClient.deleteLead(leadId);
      } else {
        // Fallback: try to use postToCRMBackendEndpoint if available
        if (typeof postToCRMBackendEndpoint === 'function') {
          await postToCRMBackendEndpoint(`leads/${encodeURIComponent(String(leadId))}`, null, 'DELETE');
        }
      }
      
      // Only remove from localStorage AFTER successful backend delete (for caching)
      const stored = DataStore.getAll();
      if (stored.leads && Array.isArray(stored.leads)) {
        stored.leads = stored.leads.filter(lead => lead.id !== leadId);
        DataStore.set('leads', stored.leads);
      }
      
      showToast('Lead deleted successfully', 'success');
      
      // Refresh the leads list
      this.loadLeads();
      this.updateStatistics();
      
    } catch (error) {
      console.error('Error deleting lead:', error);
      showToast('Failed to delete lead. Please try again.', 'error');
    }
  }

  /**
   * Update statistics
   */
  async updateStatistics() {
    try {
      const result = await this.leadManager.getStatistics(this.currentFilters);

      if (result.success) {
        const stats = result.statistics;
        document.getElementById('statTotalLeads').textContent = stats.totalLeads;
        document.getElementById('statAvgScore').textContent = stats.averageScore;
        document.getElementById('statAvgCibil').textContent = stats.averageCibil;
        document.getElementById('statFreshLeads').textContent = stats.byStatus['Fresh Lead'] || 0;
      }
    } catch (error) {
      console.error('Error updating statistics:', error);
    }
  }

  /**
   * Pagination methods
   */
  async previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      await this.loadLeads();
    }
  }

  async nextPage() {
    this.currentPage++;
    await this.loadLeads();
  }

  /**
   * Export leads
   */
  exportLeads() {
    alert('Export functionality to be implemented');
  }

  /**
   * Open bulk upload modal
   */
  openBulkUploadModal() {
    alert('Bulk upload functionality to be implemented');
  }

  /**
   * Helper methods for generating options
   */
  getStatusOptions() {
    return this.leadManager.statusPipeline
      .map(s => `<option value="${s.status}">${s.status}</option>`)
      .join('');
  }

  getSourceOptions() {
    return Object.values(this.leadManager.leadSources)
      .map(s => `<option value="${s.name}">${s.name}</option>`)
      .join('');
  }

  getSourceOptionsForForm() {
    return '<option value="">Select Source</option>' + Object.values(this.leadManager.leadSources)
      .map(s => `<option value="${s.name}">${s.name}</option>`)
      .join('');
  }

  /**
   * Edit lead
   */
  editLead(leadId) {
    alert('Edit functionality to be implemented');
  }

  /**
   * Show lead creation success modal with summary
   */
  showLeadSuccessModal(lead) {
    const modal = document.getElementById('leadSuccessModal');
    const content = document.getElementById('successContent');

    // Calculate age if DOB is available
    let age = '-';
    if (lead.dateOfBirth) {
      const today = new Date();
      const birthDate = new Date(lead.dateOfBirth);
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    }

    // Create summary card HTML
    const summaryHTML = `
      <div class="lead-success-summary" style="background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        
        <!-- Key Information Card -->
        <div class="summary-section" style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #eee;">
          <h3 style="color: #333; margin: 0 0 15px 0; font-size: 20px;">Lead Information</h3>
          
          <div class="info-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
            
            <div class="info-card" style="padding: 12px; background: #f8f9fa; border-left: 4px solid #2196F3; border-radius: 4px;">
              <div style="font-size: 12px; color: #666; font-weight: 500; margin-bottom: 5px;">Lead ID</div>
              <div style="font-size: 18px; color: #2196F3; font-weight: bold;">${lead.leadId}</div>
            </div>

            <div class="info-card" style="padding: 12px; background: #f8f9fa; border-left: 4px solid #ff9800; border-radius: 4px;">
              <div style="font-size: 12px; color: #666; font-weight: 500; margin-bottom: 5px;">Full Name</div>
              <div style="font-size: 16px; color: #333; font-weight: bold;">${lead.fullName}</div>
            </div>

            <div class="info-card" style="padding: 12px; background: #f8f9fa; border-left: 4px solid #4caf50; border-radius: 4px;">
              <div style="font-size: 12px; color: #666; font-weight: 500; margin-bottom: 5px;">Mobile Number</div>
              <div style="font-size: 16px; color: #333; font-weight: bold;">${lead.mobile}</div>
            </div>

            <div class="info-card" style="padding: 12px; background: #f8f9fa; border-left: 4px solid #9c27b0; border-radius: 4px;">
              <div style="font-size: 12px; color: #666; font-weight: 500; margin-bottom: 5px;">Status</div>
              <div style="font-size: 16px; color: #9c27b0; font-weight: bold;">${lead.status || 'Fresh Lead'}</div>
            </div>

          </div>
        </div>

        <!-- Loan Details -->
        <div class="summary-section" style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #eee;">
          <h4 style="color: #333; margin: 0 0 12px 0;">Loan Requirements</h4>
          
          <div class="info-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
            
            <div class="info-card" style="padding: 10px; background: #e3f2fd; border-radius: 4px;">
              <div style="font-size: 11px; color: #555; margin-bottom: 4px;">Loan Type</div>
              <div style="font-size: 15px; color: #1976d2; font-weight: bold;">${lead.loanType}</div>
            </div>

            <div class="info-card" style="padding: 10px; background: #e8f5e9; border-radius: 4px;">
              <div style="font-size: 11px; color: #555; margin-bottom: 4px;">Loan Amount</div>
              <div style="font-size: 15px; color: #388e3c; font-weight: bold;">₹${this.formatNumber(lead.loanAmount || 0)}</div>
            </div>

            <div class="info-card" style="padding: 10px; background: #fff3e0; border-radius: 4px;">
              <div style="font-size: 11px; color: #555; margin-bottom: 4px;">Loan Purpose</div>
              <div style="font-size: 15px; color: #e65100; font-weight: bold;">${lead.loanPurpose || 'Not Specified'}</div>
            </div>

            <div class="info-card" style="padding: 10px; background: #f3e5f5; border-radius: 4px;">
              <div style="font-size: 11px; color: #555; margin-bottom: 4px;">Lead Score</div>
              <div style="font-size: 15px; color: #6a1b9a; font-weight: bold;">${lead.leadScore || 'Pending'}</div>
            </div>

          </div>
        </div>

        <!-- Demographics -->
        <div class="summary-section" style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #eee;">
          <h4 style="color: #333; margin: 0 0 12px 0;">Demographics</h4>
          
          <div class="info-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
            
            <div class="info-card" style="padding: 10px; background: #f5f5f5; border-radius: 4px;">
              <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Age</div>
              <div style="font-size: 15px; color: #333; font-weight: 600;">${age}</div>
            </div>

            <div class="info-card" style="padding: 10px; background: #f5f5f5; border-radius: 4px;">
              <div style="font-size: 11px; color: #666; margin-bottom: 4px;">City</div>
              <div style="font-size: 15px; color: #333; font-weight: 600;">${lead.city || 'Not Specified'}</div>
            </div>

            <div class="info-card" style="padding: 10px; background: #f5f5f5; border-radius: 4px;">
              <div style="font-size: 11px; color: #666; margin-bottom: 4px;">State</div>
              <div style="font-size: 15px; color: #333; font-weight: 600;">${lead.state || 'Not Specified'}</div>
            </div>

            <div class="info-card" style="padding: 10px; background: #f5f5f5; border-radius: 4px;">
              <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Lead Source</div>
              <div style="font-size: 15px; color: #333; font-weight: 600;">${lead.leadSource}</div>
            </div>

          </div>
        </div>

        <!-- Employment Info (if available) -->
        ${lead.occupationType ? `
        <div class="summary-section" style="padding-bottom: 15px; border-bottom: 1px solid #eee;">
          <h4 style="color: #333; margin: 0 0 12px 0;">Employment</h4>
          
          <div class="info-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
            
            <div class="info-card" style="padding: 10px; background: #f5f5f5; border-radius: 4px;">
              <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Occupation Type</div>
              <div style="font-size: 15px; color: #333; font-weight: 600;">${lead.occupationType}</div>
            </div>

            <div class="info-card" style="padding: 10px; background: #f5f5f5; border-radius: 4px;">
              <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Monthly Income</div>
              <div style="font-size: 15px; color: #388e3c; font-weight: 600;">₹${this.formatNumber(lead.monthlyIncome || 0)}</div>
            </div>

            ${lead.companyName ? `
            <div class="info-card" style="padding: 10px; background: #f5f5f5; border-radius: 4px;">
              <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Company</div>
              <div style="font-size: 15px; color: #333; font-weight: 600;">${lead.companyName}</div>
            </div>
            ` : ''}

          </div>
        </div>
        ` : ''}

        <!-- Assignment Info -->
        <div class="summary-section">
          <h4 style="color: #333; margin: 0 0 12px 0;">Assignment Details</h4>
          
          <div class="info-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
            
            <div class="info-card" style="padding: 10px; background: #f5f5f5; border-radius: 4px;">
              <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Assigned To</div>
              <div style="font-size: 15px; color: #333; font-weight: 600;">${lead.assignedEmployee || 'Unassigned'}</div>
            </div>

            <div class="info-card" style="padding: 10px; background: #f5f5f5; border-radius: 4px;">
              <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Team / Branch</div>
              <div style="font-size: 15px; color: #333; font-weight: 600;">${lead.assignedTeam || 'Not Specified'}</div>
            </div>

            <div class="info-card" style="padding: 10px; background: #f5f5f5; border-radius: 4px;">
              <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Created Date</div>
              <div style="font-size: 15px; color: #333; font-weight: 600;">${new Date(lead.dateCreated).toLocaleDateString('en-IN')}</div>
            </div>

          </div>
        </div>

      </div>
    `;

    content.innerHTML = summaryHTML;
    modal.style.display = 'block';

    // Auto-scroll to success modal
    setTimeout(() => {
      modal.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }

  /**
   * View new lead full details from success modal
   */
  async viewNewLeadDetails() {
    const leadId = this.lastCreatedLeadId;
    if (!leadId) return;
    
    // Close success modal
    document.getElementById('leadSuccessModal').style.display = 'none';
    
    // Open details modal
    await this.viewLeadDetails(leadId);
  }

  /**
   * Scroll to new lead in the leads table
   */
  scrollToNewLead() {
    const leadId = this.lastCreatedLeadId;
    if (!leadId) {
      alert('Lead ID not found');
      return;
    }

    // Close success modal first
    document.getElementById('leadSuccessModal').style.display = 'none';

    // Find the row in the table
    setTimeout(() => {
      const leadRow = document.querySelector(`tr[data-lead-id="${leadId}"]`);
      if (leadRow) {
        leadRow.style.backgroundColor = '#fff3cd'; // Highlight
        leadRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Remove highlight after 3 seconds
        setTimeout(() => {
          leadRow.style.backgroundColor = '';
        }, 3000);
      } else {
        console.log('Lead row not found. Lead might be on different page.');
        alert('Lead is in the system. It may be on a different page. Use filters to find it.');
      }
    }, 100);
  }

  /**
   * Create another lead (re-open form)
   */
  createAnotherLead() {
    // Close success modal
    document.getElementById('leadSuccessModal').style.display = 'none';
    
    // Open new lead form
    this.openNewLeadModal();
  }

  /**
   * Close success modal
   */
  closeSuccessModal() {
    document.getElementById('leadSuccessModal').style.display = 'none';
  }

// Export for use in CRM system
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LeadManagerUI;
}
