/**
 * Submission Manager UI Module - CRM System
 * Provides UI components for parallel loan submissions and lender query management
 * Version: 1.0.0
 */

class SubmissionManagerUI {
  constructor(submissionManager) {
    this.submissionManager = submissionManager;
  }

  /**
   * Render Parallel Submission View for a lead
   */
  renderParallelSubmissionView(leadId, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="parallel-submission-view">
        <div class="submission-header">
          <h4>Parallel Loan Submissions</h4>
          <button class="btn btn-primary btn-sm" onclick="window.submissionUI.openNewSubmissionModal('${leadId}')">
            + Add Submission
          </button>
        </div>
        <div class="submissions-grid" id="submissionsGrid-${leadId}">
          <div class="loading-spinner">Loading submissions...</div>
        </div>
      </div>
    `;

    this.loadSubmissions(leadId);
  }

  /**
   * Load and display submissions for a lead
   */
  async loadSubmissions(leadId) {
    const grid = document.getElementById(`submissionsGrid-${leadId}`);
    if (!grid) return;

    try {
      const result = await this.submissionManager.getLeadSubmissions(leadId);
      
      if (!result.success) {
        grid.innerHTML = '<div class="error-message">Error loading submissions</div>';
        return;
      }

      const submissions = result.submissions;

      if (submissions.length === 0) {
        grid.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">📋</div>
            <p>No loan submissions yet</p>
            <button class="btn btn-primary btn-sm" onclick="window.submissionUI.openNewSubmissionModal('${leadId}')">
              Add First Submission
            </button>
          </div>
        `;
        return;
      }

      grid.innerHTML = submissions.map(sub => this.renderSubmissionCard(sub)).join('');

    } catch (error) {
      console.error('Error loading submissions:', error);
      grid.innerHTML = '<div class="error-message">Error loading submissions</div>';
    }
  }

  /**
   * Render individual submission card
   */
  renderSubmissionCard(submission) {
    const statusConfig = this.submissionManager.submissionStatuses.find(s => s.status === submission.status) || { color: '#94a3b8' };
    const daysInStage = this.submissionManager.calculateDaysInStage(submission.dateStageEntered);
    const queryCount = (submission.queries || []).length;

    return `
      <div class="submission-card" data-submission-id="${submission.submissionId}">
        <div class="submission-card-header">
          <div class="lender-info">
            ${submission.lenderLogo ? 
              `<img src="${submission.lenderLogo}" alt="${submission.lenderName}" class="lender-logo">` :
              `<div class="lender-avatar">${submission.lenderName.substring(0, 2).toUpperCase()}</div>`
            }
            <div class="lender-name">${submission.lenderName}</div>
          </div>
          <div class="submission-status" style="background-color: ${statusConfig.color}20; color: ${statusConfig.color}">
            ${submission.status}
          </div>
        </div>

        <div class="submission-card-body">
          <div class="submission-metrics">
            <div class="metric">
              <div class="metric-label">Applied Amount</div>
              <div class="metric-value">₹${this.formatNumber(submission.appliedAmount || 0)}</div>
            </div>
            <div class="metric">
              <div class="metric-label">Sanctioned Amount</div>
              <div class="metric-value ${submission.sanctionedAmount > 0 ? 'sanctioned' : ''}">
                ₹${this.formatNumber(submission.sanctionedAmount || 0)}
              </div>
            </div>
            <div class="metric">
              <div class="metric-label">Days in Stage</div>
              <div class="metric-value">${daysInStage} days</div>
            </div>
          </div>

          ${queryCount > 0 ? `
            <div class="submission-queries">
              <div class="queries-badge ${queryCount > 0 ? 'has-queries' : ''}">
                <span class="queries-icon">❓</span>
                <span>${queryCount} Active ${queryCount === 1 ? 'Query' : 'Queries'}</span>
              </div>
            </div>
          ` : ''}

          ${submission.interestRate > 0 ? `
            <div class="submission-details">
              <div class="detail-item">
                <span class="detail-label">Interest Rate:</span>
                <span class="detail-value">${submission.interestRate}%</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Tenure:</span>
                <span class="detail-value">${submission.tenure} months</span>
              </div>
            </div>
          ` : ''}
        </div>

        <div class="submission-card-footer">
          <div class="quick-actions">
            <button class="btn btn-outline btn-xs" onclick="window.submissionUI.updateSubmissionStatus('${submission.submissionId}', '${submission.status}')">
              Update Status
            </button>
            <button class="btn btn-outline btn-xs" onclick="window.submissionUI.viewSubmissionDetails('${submission.submissionId}')">
              View Details
            </button>
            ${queryCount > 0 ? `
              <button class="btn btn-outline btn-xs" onclick="window.submissionUI.viewQueries('${submission.submissionId}')">
                View Queries (${queryCount})
              </button>
            ` : `
              <button class="btn btn-outline btn-xs" onclick="window.submissionUI.raiseQuery('${submission.submissionId}')">
                Add Query
              </button>
            `}
            <button class="btn btn-outline btn-xs" onclick="window.submissionUI.uploadDocument('${submission.submissionId}')">
              Upload Doc
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render Lender Query Management View
   */
  renderQueryManagementView(leadId, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="query-management-view">
        <div class="query-header">
          <h4>Lender Queries</h4>
          <div class="query-stats" id="queryStats-${leadId}">
            Loading...
          </div>
        </div>
        
        <div class="query-filters">
          <select id="queryStatusFilter" class="form-control form-control-sm" onchange="window.submissionUI.filterQueries('${leadId}')">
            <option value="">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Response Submitted">Response Submitted</option>
            <option value="Resolved">Resolved</option>
          </select>
          <select id="queryPriorityFilter" class="form-control form-control-sm" onchange="window.submissionUI.filterQueries('${leadId}')">
            <option value="">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="NORMAL">Normal</option>
          </select>
        </div>

        <div class="queries-list" id="queriesList-${leadId}">
          <div class="loading-spinner">Loading queries...</div>
        </div>
      </div>
    `;

    this.loadQueries(leadId);
  }

  /**
   * Load and display queries for a lead
   */
  async loadQueries(leadId) {
    const list = document.getElementById(`queriesList-${leadId}`);
    const stats = document.getElementById(`queryStats-${leadId}`);
    if (!list || !stats) return;

    try {
      const result = await this.submissionManager.getLeadQueries(leadId);
      
      if (!result.success) {
        list.innerHTML = '<div class="error-message">Error loading queries</div>';
        return;
      }

      const queries = result.queries;
      
      const openCount = queries.filter(q => q.status !== 'Resolved').length;
      const urgentCount = queries.filter(q => q.priority === 'URGENT' && q.status !== 'Resolved').length;
      stats.innerHTML = `
        <span class="stat-badge">${queries.length} Total</span>
        <span class="stat-badge open">${openCount} Open</span>
        ${urgentCount > 0 ? `<span class="stat-badge urgent">${urgentCount} Urgent</span>` : ''}
      `;

      if (queries.length === 0) {
        list.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">✅</div>
            <p>No queries raised</p>
          </div>
        `;
        return;
      }

      list.innerHTML = queries.map(query => this.renderQueryCard(query)).join('');

    } catch (error) {
      console.error('Error loading queries:', error);
      list.innerHTML = '<div class="error-message">Error loading queries</div>';
    }
  }

  /**
   * Render individual query card
   */
  renderQueryCard(query) {
    const statusConfig = this.submissionManager.queryStatuses.find(s => s.status === query.status) || { color: '#94a3b8' };
    const priorityConfig = this.submissionManager.queryPriorities[query.priority] || this.submissionManager.queryPriorities.NORMAL;
    const slaStatus = this.submissionManager.getQuerySLAStatus(query);
    const linkedDocsCount = (query.linkedDocuments || []).length;

    return `
      <div class="query-card" data-query-id="${query.queryId}" data-status="${query.status}" data-priority="${query.priority}">
        <div class="query-card-header">
          <div class="query-id">${query.queryId}</div>
          <div class="query-meta">
            <span class="priority-badge" style="background-color: ${priorityConfig.color}20; color: ${priorityConfig.color}">
              ${priorityConfig.label}
            </span>
            <span class="status-badge" style="background-color: ${statusConfig.color}20; color: ${statusConfig.color}">
              ${query.status}
            </span>
          </div>
        </div>

        <div class="query-card-body">
          <div class="query-description">${query.description}</div>
          
          ${query.requiredDocuments && query.requiredDocuments.length > 0 ? `
            <div class="required-docs">
              <strong>Required Documents:</strong>
              <ul>
                ${query.requiredDocuments.map(doc => `<li>${doc}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          ${query.requiredInformation && query.requiredInformation.length > 0 ? `
            <div class="required-info">
              <strong>Required Information:</strong>
              <ul>
                ${query.requiredInformation.map(info => `<li>${info}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          <div class="query-sla">
            <div class="sla-indicator ${slaStatus.status}">
              <span class="sla-label">SLA:</span>
              <span class="sla-value">${slaStatus.remainingHours}h remaining</span>
            </div>
            <div class="query-date">Raised: ${new Date(query.dateRaised).toLocaleDateString('en-IN')}</div>
          </div>

          ${linkedDocsCount > 0 ? `
            <div class="linked-docs">
              <span class="docs-icon">📎</span>
              <span>${linkedDocsCount} document${linkedDocsCount > 1 ? 's' : ''} linked</span>
            </div>
          ` : ''}
        </div>

        <div class="query-card-footer">
          <div class="query-lender">
            <strong>${query.lenderName}</strong>
          </div>
          <div class="query-actions">
            ${query.status === 'Open' ? `
              <button class="btn btn-primary btn-xs" onclick="window.submissionUI.respondToQuery('${query.queryId}')">
                Respond
              </button>
            ` : ''}
            ${query.status === 'In Progress' ? `
              <button class="btn btn-success btn-xs" onclick="window.submissionUI.submitResponse('${query.queryId}')">
                Submit Response
              </button>
            ` : ''}
            <button class="btn btn-outline btn-xs" onclick="window.submissionUI.linkDocument('${query.queryId}')">
              Link Document
            </button>
            <button class="btn btn-outline btn-xs" onclick="window.submissionUI.viewQueryHistory('${query.queryId}')">
              History
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Open new submission modal
   */
  openNewSubmissionModal(leadId) {
    const modalHtml = `
      <div class="modal" id="newSubmissionModal">
        <div class="modal-content">
          <span class="close" onclick="window.submissionUI.closeModal('newSubmissionModal')">&times;</span>
          <h3>Add New Loan Submission</h3>
          <form id="newSubmissionForm" class="submission-form">
            <input type="hidden" name="leadId" value="${leadId}">
            
            <div class="form-group">
              <label>Lender *</label>
              <select name="lenderId" class="form-control" required>
                <option value="">Select Lender</option>
                <option value="hdfc">HDFC Bank</option>
                <option value="icici">ICICI Bank</option>
                <option value="axis">Axis Bank</option>
                <option value="kotak">Kotak Mahindra</option>
                <option value="bajaj">Bajaj Finserv</option>
                <option value="tata">Tata Capital</option>
              </select>
            </div>

            <div class="form-group">
              <label>Loan Type *</label>
              <select name="loanType" class="form-control" required>
                <option value="">Select Loan Type</option>
                <option value="Business Loan">Business Loan</option>
                <option value="Home Loan">Home Loan</option>
                <option value="Personal Loan">Personal Loan</option>
                <option value="Loan Against Property">Loan Against Property</option>
              </select>
            </div>

            <div class="form-group">
              <label>Applied Amount (₹) *</label>
              <input type="number" name="appliedAmount" class="form-control" required>
            </div>

            <div class="form-group">
              <label>Tenure (Months)</label>
              <input type="number" name="tenure" class="form-control">
            </div>

            <div class="form-group">
              <label>Assigned To</label>
              <input type="text" name="assignedTo" class="form-control">
            </div>

            <div class="form-group">
              <label>Notes</label>
              <textarea name="notes" class="form-control" rows="3"></textarea>
            </div>

            <div class="form-actions">
              <button type="submit" class="btn btn-success">Create Submission</button>
              <button type="button" class="btn btn-secondary" onclick="window.submissionUI.closeModal('newSubmissionModal')">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('newSubmissionModal').style.display = 'block';

    document.getElementById('newSubmissionForm').addEventListener('submit', (e) => this.handleNewSubmission(e));
  }

  /**
   * Handle new submission form submission
   */
  async handleNewSubmission(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    // Get lender name from selection
    const lenderSelect = e.target.querySelector('select[name="lenderId"]');
    const lenderName = lenderSelect.options[lenderSelect.selectedIndex].text;

    const submissionData = {
      leadId: data.leadId,
      lenderId: data.lenderId,
      lenderName: lenderName,
      loanType: data.loanType,
      appliedAmount: parseInt(data.appliedAmount),
      tenure: parseInt(data.tenure) || 0,
      assignedTo: data.assignedTo || null,
      notes: data.notes || ''
    };

    try {
      const result = await this.submissionManager.createSubmission(submissionData, 'current-user');
      
      if (result.success) {
        alert('Submission created successfully!');
        this.closeModal('newSubmissionModal');
        this.loadSubmissions(data.leadId);
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error creating submission:', error);
      alert('Error creating submission');
    }
  }

  /**
   * Open raise query modal
   */
  openRaiseQueryModal(submissionId, leadId, lenderName) {
    const modalHtml = `
      <div class="modal" id="raiseQueryModal">
        <div class="modal-content">
          <span class="close" onclick="window.submissionUI.closeModal('raiseQueryModal')">&times;</span>
          <h3>Raise Lender Query</h3>
          <form id="raiseQueryForm" class="query-form">
            <input type="hidden" name="submissionId" value="${submissionId}">
            <input type="hidden" name="leadId" value="${leadId}">
            <input type="hidden" name="lenderName" value="${lenderName}">
            
            <div class="form-group">
              <label>Query Description *</label>
              <textarea name="description" class="form-control" rows="3" required></textarea>
            </div>

            <div class="form-group">
              <label>Required Documents</label>
              <textarea name="requiredDocuments" class="form-control" rows="2" placeholder="Enter each document on a new line"></textarea>
            </div>

            <div class="form-group">
              <label>Required Information</label>
              <textarea name="requiredInformation" class="form-control" rows="2" placeholder="Enter each information requirement on a new line"></textarea>
            </div>

            <div class="form-group">
              <label>Priority *</label>
              <select name="priority" class="form-control" required>
                <option value="NORMAL">Normal (48 hours)</option>
                <option value="URGENT">Urgent (24 hours)</option>
              </select>
            </div>

            <div class="form-group">
              <label>Assigned Handler</label>
              <input type="text" name="assignedHandler" class="form-control">
            </div>

            <div class="form-actions">
              <button type="submit" class="btn btn-danger">Raise Query</button>
              <button type="button" class="btn btn-secondary" onclick="window.submissionUI.closeModal('raiseQueryModal')">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('raiseQueryModal').style.display = 'block';

    document.getElementById('raiseQueryForm').addEventListener('submit', (e) => this.handleRaiseQuery(e));
  }

  /**
   * Handle raise query form submission
   */
  async handleRaiseQuery(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    const queryData = {
      submissionId: data.submissionId,
      leadId: data.leadId,
      lenderId: 'lender-id', // Would come from submission
      lenderName: data.lenderName,
      description: data.description,
      requiredDocuments: data.requiredDocuments ? data.requiredDocuments.split('\n').filter(d => d.trim()) : [],
      requiredInformation: data.requiredInformation ? data.requiredInformation.split('\n').filter(i => i.trim()) : [],
      priority: data.priority,
      assignedHandler: data.assignedHandler || null
    };

    try {
      const result = await this.submissionManager.createQuery(queryData, 'current-user');
      
      if (result.success) {
        alert('Query raised successfully!');
        this.closeModal('raiseQueryModal');
        this.loadQueries(data.leadId);
        this.loadSubmissions(data.leadId);
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error raising query:', error);
      alert('Error raising query');
    }
  }

  /**
   * Update submission status
   */
  updateSubmissionStatus(submissionId, currentStatus) {
    const modalHtml = `
      <div class="modal" id="updateStatusModal">
        <div class="modal-content">
          <span class="close" onclick="window.submissionUI.closeModal('updateStatusModal')">&times;</span>
          <h3>Update Submission Status</h3>
          <form id="updateStatusForm" class="status-form">
            <input type="hidden" name="submissionId" value="${submissionId}">
            
            <div class="form-group">
              <label>Current Status</label>
              <input type="text" value="${currentStatus}" class="form-control" readonly>
            </div>

            <div class="form-group">
              <label>New Status *</label>
              <select name="newStatus" class="form-control" required>
                ${this.submissionManager.submissionStatuses.map(s => 
                  `<option value="${s.status}">${s.status}</option>`
                ).join('')}
              </select>
            </div>

            <div class="form-group">
              <label>Notes</label>
              <textarea name="notes" class="form-control" rows="3"></textarea>
            </div>

            <div class="form-actions">
              <button type="submit" class="btn btn-success">Update Status</button>
              <button type="button" class="btn btn-secondary" onclick="window.submissionUI.closeModal('updateStatusModal')">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('updateStatusModal').style.display = 'block';

    document.getElementById('updateStatusForm').addEventListener('submit', (e) => this.handleUpdateStatus(e));
  }

  /**
   * Handle status update
   */
  async handleUpdateStatus(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
      const result = await this.submissionManager.updateSubmissionStatus(
        data.submissionId,
        data.newStatus,
        data.notes,
        'current-user'
      );
      
      if (result.success) {
        alert('Status updated successfully!');
        this.closeModal('updateStatusModal');
        // Reload submissions - need to get leadId from somewhere
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status');
    }
  }

  /**
   * Close modal
   */
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';
      setTimeout(() => modal.remove(), 300);
    }
  }

  /**
   * Format number with commas
   */
  formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /**
   * Placeholder methods for actions
   */
  viewSubmissionDetails(submissionId) {
    alert('View submission details - to be implemented');
  }

  viewQueries(submissionId) {
    alert('View queries - to be implemented');
  }

  raiseQuery(submissionId) {
    alert('Raise query - to be implemented');
  }

  uploadDocument(submissionId) {
    alert('Upload document - to be implemented');
  }

  respondToQuery(queryId) {
    alert('Respond to query - to be implemented');
  }

  submitResponse(queryId) {
    alert('Submit response - to be implemented');
  }

  linkDocument(queryId) {
    alert('Link document - to be implemented');
  }

  viewQueryHistory(queryId) {
    alert('View query history - to be implemented');
  }

  filterQueries(leadId) {
    const statusFilter = document.getElementById('queryStatusFilter').value;
    const priorityFilter = document.getElementById('queryPriorityFilter').value;

    const queryCards = document.querySelectorAll(`.query-card`);
    queryCards.forEach(card => {
      const cardStatus = card.dataset.status;
      const cardPriority = card.dataset.priority;

      const statusMatch = !statusFilter || cardStatus === statusFilter;
      const priorityMatch = !priorityFilter || cardPriority === priorityFilter;

      card.style.display = (statusMatch && priorityMatch) ? 'block' : 'none';
    });
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SubmissionManagerUI;
}
