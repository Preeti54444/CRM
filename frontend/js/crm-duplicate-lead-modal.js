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
                  <label style="font-size:11px;color:var(--gray-500);font-weight:600;text-transform:uppercase;">Vertical</label>
                  <p id="dupVertical" style="margin:4px 0 0 0;font-size:13px;color:var(--gray-900);">-</p>
                </div>
                <div>
                  <label style="font-size:11px;color:var(--gray-500);font-weight:600;text-transform:uppercase;">Sub-Product</label>
                  <p id="dupSubProduct" style="margin:4px 0 0 0;font-size:13px;color:var(--gray-900);">-</p>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div>
                  <label style="font-size:11px;color:var(--gray-500);font-weight:600;text-transform:uppercase;">Status</label>
                  <p id="dupStatus" style="margin:4px 0 0 0;font-size:13px;color:var(--gray-900);">-</p>
                </div>
                <div>
                  <label style="font-size:11px;color:var(--gray-500);font-weight:600;text-transform:uppercase;">Lead Stage</label>
                  <p id="dupLeadStage" style="margin:4px 0 0 0;font-size:13px;color:var(--gray-900);">-</p>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div>
                  <label style="font-size:11px;color:var(--gray-500);font-weight:600;text-transform:uppercase;">Assigned To</label>
                  <p id="dupAssignedTo" style="margin:4px 0 0 0;font-size:13px;color:var(--gray-900);">-</p>
                </div>
                <div>
                  <label style="font-size:11px;color:var(--gray-500);font-weight:600;text-transform:uppercase;">Last Activity</label>
                  <p id="dupLastActivity" style="margin:4px 0 0 0;font-size:13px;color:var(--gray-900);">-</p>
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
            <button type="button" class="btn btn-primary" id="dupPopulateBtn" style="flex:1;">
              Populate Form & Continue
            </button>
            <button type="button" class="btn btn-secondary" id="dupViewBtn" style="flex:1;">
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

    // Populate button
    document.getElementById('dupPopulateBtn').addEventListener('click', () => {
      if (this.currentDuplicate) {
        this.populateFormFields(this.currentDuplicate);
        this.close();
      }
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
    document.getElementById('dupVertical').textContent = this.currentDuplicate.vertical || '-';
    document.getElementById('dupSubProduct').textContent = this.currentDuplicate.sub_product || '-';
    document.getElementById('dupStatus').textContent = this.currentDuplicate.lead_status || '-';
    document.getElementById('dupLeadStage').textContent = this.currentDuplicate.lead_stage || '-';
    
    // Populate owner name if available
    if (this.currentDuplicate.owner_name) {
      document.getElementById('dupAssignedTo').textContent = this.currentDuplicate.owner_name;
    } else if (this.currentDuplicate.assigned_to) {
      document.getElementById('dupAssignedTo').textContent = `ID: ${this.currentDuplicate.assigned_to.substring(0, 8)}...`;
    } else {
      document.getElementById('dupAssignedTo').textContent = 'Unassigned';
    }
    
    // Populate last activity date
    if (this.currentDuplicate.last_activity_date) {
      const date = new Date(this.currentDuplicate.last_activity_date);
      document.getElementById('dupLastActivity').textContent = date.toLocaleDateString();
    } else {
      document.getElementById('dupLastActivity').textContent = '-';
    }
    
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

  /**
   * Populate form fields with duplicate lead data
   * @param {Object} leadData - The duplicate lead data to populate
   */
  populateFormFields(leadData) {
    try {
      // Map lead data to form fields
      const fieldMappings = {
        'verticalSelect': leadData.vertical,
        'subProductSelect': leadData.sub_product,
        'ldCompany': leadData.company_name,
        'ldContact': leadData.lead_name,
        'ldPhone': leadData.mobile,
        'ldEmail': leadData.email,
        'ldDesignation': leadData.designation,
        'ldLocation': leadData.city ? `${leadData.city}${leadData.state ? ', ' + leadData.state : ''}` : '',
        'ldSource': leadData.lead_source,
        'industryInput': leadData.industry,
      };

      // Populate each field if the element exists
      for (const [fieldId, value] of Object.entries(fieldMappings)) {
        const element = document.getElementById(fieldId);
        if (element && value) {
          element.value = value;
          // Trigger change event for select elements to update dependent fields
          if (element.tagName === 'SELECT') {
            element.dispatchEvent(new Event('change'));
          }
        }
      }

      // Populate funding amount if available
      if (leadData.funding_amount && document.getElementById('amountInput')) {
        document.getElementById('amountInput').value = leadData.funding_amount;
      }

      // Populate turnover if available
      if (leadData.annual_turnover && document.getElementById('turnoverInput')) {
        document.getElementById('turnoverInput').value = leadData.annual_turnover;
      }

      // Populate vintage if available
      if (leadData.business_vintage && document.getElementById('vintageInput')) {
        document.getElementById('vintageInput').value = leadData.business_vintage;
      }

      // Populate entity type if available
      if (leadData.entity_type && document.getElementById('ldEntityType')) {
        document.getElementById('ldEntityType').value = leadData.entity_type;
      }

      showToast('Form populated with existing lead data', 'success');
    } catch (error) {
      console.error('Error populating form fields:', error);
      showToast('Error populating form fields', 'error');
    }
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
  const apiClient = window.CRM_API_CLIENT || window.API || (typeof CRMApiClient !== 'undefined' ? new CRMApiClient() : null)

  try {
    const result = apiClient && typeof apiClient.checkLeadDuplicates === 'function'
      ? await apiClient.checkLeadDuplicates(leadData)
      : await fetch(`${window.API_BASE || window.location.origin}/leads/check-duplicates`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`,
          },
          body: JSON.stringify(leadData),
        }).then(res => res.json())

    if (result?.duplicate) {
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
    const apiClient = window.CRM_API_CLIENT || window.API || (typeof CRMApiClient !== 'undefined' ? new CRMApiClient() : null)
    const newLead = apiClient && typeof apiClient.createLead === 'function'
      ? await apiClient.createLead(leadData)
      : await fetch(`${window.API_BASE || window.location.origin}/leads`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`,
          },
          body: JSON.stringify(leadData),
        }).then(async response => {
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create lead');
          }
          return response.json();
        })

    showToast('Lead created successfully', 'success');
    return newLead;
  } catch (error) {
    console.error('Error creating lead:', error);
    showToast('Error creating lead: ' + error.message, 'error');
    return null;
  }
}
