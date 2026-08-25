/**
 * Permission Manager for Lead Ownership
 * 
 * Handles permission checking and UI controls based on lead ownership status
 * Implements the 30-day inactivity rule and restricted permissions for second person
 */

class PermissionManager {
  constructor() {
    this.currentPermissions = null;
    this.currentLeadId = null;
    this.permissionCache = new Map();
  }

  /**
   * Check user permissions for a lead
   * @param {number} leadId - The lead ID to check permissions for
   * @returns {Promise<Object>} - Permission object with permission level and allowed actions
   */
  async checkPermissions(leadId) {
    try {
      const apiClient = window.CRM_API_CLIENT || window.API || (typeof CRMApiClient !== 'undefined' ? new CRMApiClient() : null)
      const permissions = apiClient && typeof apiClient.getLeadPermissions === 'function'
        ? await apiClient.getLeadPermissions(leadId)
        : await fetch(`${window.API_BASE || window.location.origin}/leads/${leadId}/permissions`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${getAuthToken()}`,
            },
          }).then(async response => {
            if (!response.ok) {
              throw new Error('Failed to check permissions');
            }
            return response.json();
          });

      this.currentPermissions = permissions;
      this.currentLeadId = leadId;
      this.permissionCache.set(leadId, permissions);

      return permissions;
    } catch (error) {
      console.error('Error checking permissions:', error);
      return {
        permission_level: 'error',
        allowed_actions: [],
        error: 'Failed to check permissions'
      };
    }
  }

  /**
   * Apply permission restrictions to a lead form
   * @param {string} formSelector - CSS selector for the lead form
   * @param {Object} permissions - Permission object from API
   */
  applyPermissionRestrictions(formSelector, permissions) {
    const form = document.querySelector(formSelector);
    if (!form) {
      console.error('Form not found:', formSelector);
      return;
    }

    const bannerContainer = this.getBannerContainer(form);
    this.removeExistingBanner(bannerContainer);

    const permissionLevel = permissions.permission_level;
    const allowedActions = permissions.allowed_actions || [];
    const restrictedActions = permissions.restricted_actions || [];

    // If user is owner, no restrictions needed
    if (permissionLevel === 'owner') {
      this.enableAllFields(form);
      return;
    }

    // If user can take ownership, show takeover banner
    if (permissionLevel === 'can_take_ownership') {
      this.showTakeoverBanner(form, permissions.reason);
      this.enableTakeoverActions(form, allowedActions);
      this.disableRestrictedFields(form, restrictedActions);
      return;
    }

    // If user has restricted permissions (second person within 30-day window)
    if (permissionLevel === 'restricted') {
      this.showRestrictedBanner(form, permissions.reason, permissions.days_until_takeover);
      this.enableRestrictedActions(form, allowedActions);
      this.disableRestrictedFields(form, restrictedActions);
      return;
    }

    // No permissions
    if (permissionLevel === 'none') {
      this.showNoAccessBanner(form);
      this.disableAllFields(form);
      return;
    }
  }

  /**
   * Enable all form fields (owner has full access)
   */
  enableAllFields(form) {
    const inputs = form.querySelectorAll('input, select, textarea, button');
    inputs.forEach(input => {
      input.disabled = false;
    });
  }

  /**
   * Disable all form fields (no access)
   */
  disableAllFields(form) {
    const inputs = form.querySelectorAll('input, select, textarea, button');
    inputs.forEach(input => {
      input.disabled = true;
    });
  }

  /**
   * Enable only restricted actions (notes, feedback, meetings)
   */
  enableRestrictedActions(form, allowedActions) {
    const inputs = form.querySelectorAll('input, select, textarea, button');
    inputs.forEach(input => {
      // Enable if it's a restricted action field
      if (this.isRestrictedActionField(input, allowedActions)) {
        input.disabled = false;
      } else {
        input.disabled = true;
      }
    });
  }

  /**
   * Enable takeover actions and disable restricted fields
   */
  enableTakeoverActions(form, allowedActions) {
    const inputs = form.querySelectorAll('input, select, textarea, button');
    inputs.forEach(input => {
      // Enable only view and takeover actions
      if (allowedActions.includes('view') || allowedActions.includes('take_ownership')) {
        input.disabled = false;
      } else {
        input.disabled = true;
      }
    });
  }

  /**
   * Disable restricted fields based on permission level
   */
  disableRestrictedFields(form, restrictedActions) {
    const inputs = form.querySelectorAll('input, select, textarea, button');
    inputs.forEach(input => {
      if (this.isRestrictedField(input, restrictedActions)) {
        input.disabled = true;
      }
    });
  }

  /**
   * Check if a field is part of restricted actions
   */
  isRestrictedActionField(element, allowedActions) {
    const fieldId = element.id || element.name;
    const restrictedFieldIds = [
      'remarks', 'customerFeedback', 'meetingDetails', 'internalNotes'
    ];
    
    return restrictedFieldIds.some(id => fieldId && fieldId.toLowerCase().includes(id.toLowerCase()));
  }

  /**
   * Check if a field should be restricted based on actions
   */
  isRestrictedField(element, restrictedActions) {
    const fieldId = element.id || element.name;
    
    // Fields that should be restricted for second person
    const restrictedFieldIds = [
      'leadStage', 'leadStatus', 'assignedTo', 'owner', 'document',
      'followup', 'call', 'edit', 'delete', 'change'
    ];
    
    return restrictedFieldIds.some(id => fieldId && fieldId.toLowerCase().includes(id.toLowerCase()));
  }

  /**
   * Show takeover availability banner
   */
  showTakeoverBanner(form, reason) {
    const container = this.getBannerContainer(form);
    container.style.display = 'block';

    const banner = document.createElement('div');
    banner.id = 'permissionBanner';
    banner.style.cssText = `
      background: #dcfce7;
      border: 1px solid #86efac;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 16px;
      color: #166534;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    banner.innerHTML = `
      <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
      <span>✓ Ownership Available: ${reason}</span>
      <button type="button" id="takeOwnershipBtn" style="margin-left: auto; background: #166534; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">Take Ownership</button>
    `;

    container.appendChild(banner);

    // Add takeover button handler
    document.getElementById('takeOwnershipBtn').addEventListener('click', () => {
      this.handleTakeOwnership();
    });
  }

  /**
   * Show restricted access banner
   */
  showRestrictedBanner(form, reason, daysUntilTakeover) {
    const container = this.getBannerContainer(form);
    container.style.display = 'block';

    const banner = document.createElement('div');
    banner.id = 'permissionBanner';
    banner.style.cssText = `
      background: #fef3c7;
      border: 1px solid #fde68a;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 16px;
      color: #92400e;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    banner.innerHTML = `
      <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>
      <span>🔒 Restricted Access: ${reason}. Ownership available in ${daysUntilTakeover} days.</span>
    `;

    container.appendChild(banner);
  }

  /**
   * Show no access banner
   */
  showNoAccessBanner(form) {
    const container = this.getBannerContainer(form);
    container.style.display = 'block';

    const banner = document.createElement('div');
    banner.id = 'permissionBanner';
    banner.style.cssText = `
      background: #fee2e2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 16px;
      color: #991b1b;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    banner.innerHTML = `
      <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>
      <span>🚫 No Access: You don't have permission to access this lead.</span>
    `;

    container.appendChild(banner);
  }

  /**
   * Handle ownership transfer
   */
  async handleTakeOwnership() {
    if (!this.currentLeadId) {
      console.error('No lead ID set for ownership transfer');
      return;
    }

    try {
      const apiClient = window.CRM_API_CLIENT || window.API || (typeof CRMApiClient !== 'undefined' ? new CRMApiClient() : null)
      const result = apiClient && typeof apiClient.transferLeadOwnership === 'function'
        ? await apiClient.transferLeadOwnership(this.currentLeadId, this.getCurrentUserId(), 'Taking ownership due to inactivity or availability')
        : await fetch(`${window.API_BASE || window.location.origin}/leads/${this.currentLeadId}/transfer-ownership`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${getAuthToken()}`,
            },
            body: JSON.stringify({
              new_owner_id: this.getCurrentUserId(),
              transfer_reason: 'Taking ownership due to inactivity or availability'
            }),
          }).then(async response => {
            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.detail || 'Failed to transfer ownership');
            }
            return response.json();
          });

      showToast('Ownership transferred successfully!', 'success');

      // Reload the page to refresh permissions
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error) {
      console.error('Error transferring ownership:', error);
      showToast('Error transferring ownership: ' + error.message, 'error');
    }
  }

  /**
   * Get current user ID from session
   */
  getCurrentUserId() {
    const session = JSON.parse(localStorage.getItem('crm_session') || '{}');
    return session.id || session.user_id;
  }

  /**
   * Check if user can perform a specific action
   * @param {string} action - The action to check
   * @returns {boolean}
   */
  canPerformAction(action) {
    if (!this.currentPermissions) {
      return false;
    }
    return this.currentPermissions.allowed_actions.includes(action);
  }

  /**
   * Check and apply permissions for a lead form
   * @param {number} leadId - The lead ID
   * @param {string} formSelector - CSS selector for the form
   */
  async checkAndApplyPermissions(leadId, formSelector) {
    const permissions = await this.checkPermissions(leadId);
    this.applyPermissionRestrictions(formSelector, permissions);
    return permissions;
  }

  /**
   * Get a banner container for the lead form if available
   */
  getBannerContainer(form) {
    const holder = document.getElementById('leadPermissionBannerHolder');
    return holder || form;
  }

  /**
   * Remove any existing permission banner
   */
  removeExistingBanner(container) {
    const existingBanner = container.querySelector('#permissionBanner');
    if (existingBanner) {
      existingBanner.remove();
    }
    if (container.id === 'leadPermissionBannerHolder') {
      container.style.display = 'none';
    }
  }

  /**
   * Clear current permissions
   */
  clearPermissions() {
    this.currentPermissions = null;
    this.currentLeadId = null;
  }
}

// Global instance
const permissionManager = new PermissionManager();
