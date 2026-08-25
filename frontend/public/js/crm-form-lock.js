/**
 * Form Lock Manager
 * 
 * Handles form locking based on stage change rules.
 * If the 1st person's stage changed within 2-30 days, the 2nd person's form must lock.
 * It only remains unlocked if the stage remains completely unchanged after 30 days.
 */

class FormLockManager {
  constructor() {
    this.locked = false;
    this.lockReason = null;
    this.lockedFields = [];
  }

  /**
   * Check if a lead's form should be locked based on stage change rules
   * @param {number} leadId - The lead ID to check
   * @returns {Promise<Object>} - Lock status object
   */
  async checkStageLock(leadId) {
    try {
      const apiClient = window.CRM_API_CLIENT || window.API || (typeof CRMApiClient !== 'undefined' ? new CRMApiClient() : null)
      const result = apiClient && typeof apiClient.get === 'function'
        ? await apiClient.get(`/leads/${leadId}/check-stage-lock`)
        : await fetch(`${window.API_BASE || window.location.origin}/leads/${leadId}/check-stage-lock`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${getAuthToken()}`,
            },
          }).then(async response => {
            if (!response.ok) {
              throw new Error('Failed to check stage lock status');
            }
            return response.json();
          });

      this.locked = result.is_locked;
      this.lockReason = result.reason;

      return result;
    } catch (error) {
      console.error('Error checking stage lock:', error);
      return { is_locked: false, reason: 'Error checking lock status' };
    }
  }

  /**
   * Lock a form by disabling all input fields
   * @param {string} formSelector - CSS selector for the form to lock
   * @param {string} reason - Reason for locking the form
   */
  lockForm(formSelector, reason) {
    const form = document.querySelector(formSelector);
    if (!form) {
      console.error('Form not found:', formSelector);
      return;
    }

    // Disable all input, select, textarea, and button elements
    const inputs = form.querySelectorAll('input, select, textarea, button');
    inputs.forEach(input => {
      if (!input.disabled) {
        input.disabled = true;
        this.lockedFields.push(input);
      }
    });

    // Add visual indication that form is locked
    const lockBanner = document.createElement('div');
    lockBanner.id = 'formLockBanner';
    lockBanner.style.cssText = `
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
    lockBanner.innerHTML = `
      <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>
      <span>🔒 Form Locked: ${reason}</span>
    `;

    form.insertBefore(lockBanner, form.firstChild);
    this.locked = true;
    this.lockReason = reason;

    console.log('Form locked:', reason);
  }

  /**
   * Unlock a form by re-enabling all input fields
   * @param {string} formSelector - CSS selector for the form to unlock
   */
  unlockForm(formSelector) {
    const form = document.querySelector(formSelector);
    if (!form) {
      console.error('Form not found:', formSelector);
      return;
    }

    // Re-enable all previously locked fields
    this.lockedFields.forEach(input => {
      input.disabled = false;
    });
    this.lockedFields = [];

    // Remove lock banner
    const lockBanner = document.getElementById('formLockBanner');
    if (lockBanner) {
      lockBanner.remove();
    }

    this.locked = false;
    this.lockReason = null;

    console.log('Form unlocked');
  }

  /**
   * Check and apply lock status for a lead form
   * @param {number} leadId - The lead ID to check
   * @param {string} formSelector - CSS selector for the form to lock/unlock
   */
  async checkAndApplyLock(leadId, formSelector) {
    const lockStatus = await this.checkStageLock(leadId);

    if (lockStatus.is_locked) {
      this.lockForm(formSelector, lockStatus.reason);
    } else {
      this.unlockForm(formSelector);
    }

    return lockStatus;
  }

  /**
   * Check if form is currently locked
   * @returns {boolean}
   */
  isLocked() {
    return this.locked;
  }

  /**
   * Get the reason for the current lock
   * @returns {string|null}
   */
  getLockReason() {
    return this.lockReason;
  }
}

// Global instance
const formLockManager = new FormLockManager();
