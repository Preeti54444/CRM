/**
 * Duplicate Lead Modal Component
 * 
 * Displays duplicate lead information and handles user interactions
 * when a duplicate is detected during lead creation.
 */

class DuplicateLeadModal {
  constructor() {
    this.modal = null;
    this.currentDuplicate = null;
    this.onConfirm = null;
    this.init();
  }

  init() {
    // Create modal HTML
    const modalHTML = `
      <div class="modal-ov" id="duplicateLeadModal" style="display:none;background:rgba(0,0,0,0.5);">
        <div class="modal" style="max-width:500px;">
          <div style="padding:24px;border-bottom:1px solid var(--gray-200);display:flex;align-items:center;gap:12px;">
            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="color:#ea580c;">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <div>
              <h3 style="margin:0;font-size:18px;font-weight:700;color:var(--gray-900);">Duplicate Lead Found</h3>
              <p style="margin:4px 0 0 0;font-size:13px;color:var(--gray-500);">This lead already exists in the system</p>
            </div>
          </div>

          <div style="padding:24px;border-bottom:1px solid var(--gray-200);">
            <div style="background:#f8fafc;border-radius:12px;padding:16px;display:grid;gap:12px;">
              <div>
                <label style="font-size:11px;color:var(--gray-500);font-weight:600;text-transform:uppercase;">Lead Name</label>
                <p id="dupLeadName" style="margin:4px 0 0 0;font-size:14px;font-weight:600;color:var(--gray-900);">-</p>
              </div>
              <div>
                <label style="font-size:11px;color:var(--gray-500);font-weight:600;text-transform:uppercase;">Company Name</label>
                <p id="dupCompanyName" style="margin:4px 0 0 0;font-size:14px;font-weight:600;color:var(--gray-900);">-</p>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div>
                  <label style="font-size:11px;color:var(--gray-500);font-weight:600;text-transform:uppercase;">Status</label>
                  <p id="dupStatus" style="margin:4px 0 0 0;font-size:13px;color:var(--gray-900);">-</p>
                </div>
                <div>
                  <label style="font-size:11px;color:var(--gray-500);font-weight:600;text-transform:uppercase;">Assigned To</label>
                  <p id="dupAssignedTo" style="margin:4px 0 0 0;font-size:13px;color:var(--gray-900);">-</p>
                </div>
              </div>
              <div>
                <label style="font-size:11px;color:var(--gray-500);font-weight:600;text-transform:uppercase;">Created On</label>
                <p id="dupCreatedAt" style="margin:4px 0 0 0;font-size:13px;color:var(--gray-900);">-</p>
              </div>
            </div>
            
            <div style="margin-top:16px;padding:12px;background:#fee2e2;border:1px solid #fecaca;border-radius:8px;color:#991b1b;font-size:13px;">
              <strong>⚠ Warning:</strong> This lead is already assigned to another employee. Only admin can reassign leads.
            </div>
          </div>

          <div style="padding:16px;display:flex;gap:12px;justify-content:flex-end;">
            <button type="button" class="btn btn-outline" id="dupCancelBtn" style="flex:1;">
              Cancel
            </button>
            <button type="button" class="btn btn-primary" id="dupViewBtn" style="flex:1;">
              View Existing Lead
            </button>
          </div>
        </div>
      </div>
    `;

    // Append modal to DOM if not exists
    if (!document.getElementById('duplicateLeadModal')) {
      document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    this.modal = document.getElementById('duplicateLeadModal');
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Cancel button
    document.getElementById('dupCancelBtn').addEventListener('click', () => {
      this.close();
    });

    // View button
    document.getElementById('dupViewBtn').addEventListener('click', () => {
      if (this.currentDuplicate && this.currentDuplicate.id) {
        // Navigate to lead detail page
        window.location.href = `/leads/${this.currentDuplicate.id}`;
      }
    });

    // Close on backdrop click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });
  }

  /**
   * Display duplicate lead information
   * @param {Object} duplicateData - Response from duplicate check API
   */
  show(duplicateData) {
    if (!duplicateData || !duplicateData.existing_lead) {
      console.error('Invalid duplicate data');
      return;
    }

    this.currentDuplicate = duplicateData.existing_lead;

    // Populate modal fields
    document.getElementById('dupLeadName').textContent = this.currentDuplicate.lead_name || '-';
    document.getElementById('dupCompanyName').textContent = this.currentDuplicate.company_name || '(Not provided)';
    document.getElementById('dupStatus').textContent = this.currentDuplicate.lead_status || '-';
    document.getElementById('dupAssignedTo').textContent = this.currentDuplicate.assigned_to ? `ID: ${this.currentDuplicate.assigned_to.substring(0, 8)}...` : 'Unassigned';
    
    // Format date
    if (this.currentDuplicate.created_at) {
      const date = new Date(this.currentDuplicate.created_at);
      document.getElementById('dupCreatedAt').textContent = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } else {
      document.getElementById('dupCreatedAt').textContent = '-';
    }

    // Show modal
    this.modal.style.display = 'flex';
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  close() {
    if (this.modal) {
      this.modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
    this.currentDuplicate = null;
  }

  isVisible() {
    return this.modal && this.modal.style.display !== 'none';
  }
}

// Initialize modal on page load
let duplicateLeadModal = null;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    duplicateLeadModal = new DuplicateLeadModal();
  });
} else {
  duplicateLeadModal = new DuplicateLeadModal();
}


/**
 * Lead Creation with Duplicate Check
 * Call this before submitting lead creation form
 */
async function checkLeadDuplicate(leadData) {
  try {
    const response = await fetch('/api/leads/check-duplicates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(leadData),
    });

    const result = await response.json();

    if (result.duplicate) {
      // Show modal with duplicate info
      if (duplicateLeadModal) {
        duplicateLeadModal.show(result);
      }
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking duplicate:', error);
    showToast('Error checking for duplicates', 'error');
    return false;
  }
}


/**
 * Create lead with duplicate check
 * Should be called instead of directly posting to /api/leads
 */
async function createLeadWithDuplicateCheck(leadData) {
  // First check for duplicates
  const isUnique = await checkLeadDuplicate(leadData);

  if (!isUnique) {
    return null;
  }

  // If unique, proceed with creation
  try {
    const response = await fetch('/api/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(leadData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create lead');
    }

    const newLead = await response.json();
    showToast('Lead created successfully', 'success');
    return newLead;
  } catch (error) {
    console.error('Error creating lead:', error);
    showToast('Error creating lead: ' + error.message, 'error');
    return null;
  }
}
