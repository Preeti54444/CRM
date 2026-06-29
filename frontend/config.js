/**
 * CRM Frontend Configuration
 * Centralized API base URL detection for consistency across all pages
 */

(function() {
  'use strict';

  const isFileProtocol = window.location.protocol === 'file:';
  const host = window.location.hostname || 'localhost';
  const port = window.location.port ? ':' + window.location.port : '';
  const origin = window.location.protocol + '//' + host + port;

  /**
   * Normalize API base URL to ensure consistent format
   */
  function normalizeApiBase(value) {
    if (!value) return null;
    const trimmed = String(value).trim().replace(/\/$/, '');
    if (!trimmed) return null;
    try {
      const url = new URL(trimmed);
      // Force port 8085 for localhost access
      const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
      if (isLocalhost && (url.port === '8000' || url.port === '8001' || url.port === '8085')) {
        url.port = '8085';
      }
      return url.origin;
    } catch {
      return null;
    }
  }

  /**
   * Detect and return the correct API base URL
   * Priority order:
   * 1. Explicit window.CRM_API_BASE (environment variable)
   * 2. Explicit window.API_BASE (manual override)
   * 3. localStorage crm_api_base (cached value)
   * 4. Production/NGINX: same origin (API proxied through nginx)
   * 5. Localhost: http://localhost:8085
   * 6. LAN: same host with port 8085
   * 7. Fallback: current origin
   */
  function getCRMApiBase() {
    // Check environment variable first
    if (window.CRM_API_BASE) {
      const normalized = normalizeApiBase(window.CRM_API_BASE);
      if (normalized) return normalized;
    }

    // Check manual override
    if (window.API_BASE) {
      const normalized = normalizeApiBase(window.API_BASE);
      if (normalized) return normalized;
    }

    // Check cached value
    try {
      const cached = localStorage.getItem('crm_api_base');
      if (cached) {
        const normalized = normalizeApiBase(cached);
        if (normalized) return normalized;
      }
    } catch (e) {
      console.warn('[Config] Unable to read cached API base:', e);
    }

    // Determine based on environment
    const shouldUseLocalBackend = isFileProtocol || host === 'localhost' || host === '127.0.0.1';
    
    if (shouldUseLocalBackend) {
      // Local development - use localhost:8085
      return 'http://localhost:8085';
    } else if (port === '80' || port === '443' || !port) {
      // Production deployment with nginx - API is proxied on same origin
      // When accessed on standard HTTP/HTTPS ports, assume nginx is proxying API
      console.log('[Config] Production deployment detected - using same origin for API');
      return origin;
    } else {
      // LAN access - use same host with backend port 8085
      return window.location.protocol + '//' + host + ':8085';
    }
  }

  /**
   * Set and persist the API base URL
   */
  function setCRMApiBase(apiBase) {
    const normalized = normalizeApiBase(apiBase);
    if (normalized) {
      window.API_BASE = normalized;
      try {
        localStorage.setItem('crm_api_base', normalized);
      } catch (e) {
        console.warn('[Config] Unable to persist API base:', e);
      }
      console.log('[Config] API base set to:', normalized);
      return normalized;
    }
    return null;
  }

  // Initialize API base
  const apiBase = getCRMApiBase();
  window.API_BASE = apiBase;
  window.CRM_BACKEND_IP = host;

  // Expose functions globally
  window.getCRMApiBase = getCRMApiBase;
  window.setCRMApiBase = setCRMApiBase;

  console.log('[Config] API base initialized to:', apiBase);
  console.log('[Config] Backend IP set to:', window.CRM_BACKEND_IP);

})();
