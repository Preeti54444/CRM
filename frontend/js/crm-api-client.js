/**
 * API Client Module - CRM Frontend
 * Handles all HTTP communication with the backend API
 * Features: Authentication, Error Handling, Request/Response Interceptors
 */

class APIClient {
  constructor(baseURL = null) {
    this.baseURL = baseURL || this.detectBaseURL()
    this.authToken = this.getAuthToken()
    this.onUnauthorized = null
    console.log('[APIClient] Initialized with baseURL:', this.baseURL)
  }

  /**
   * Detect the API base URL from various sources
   */
  detectBaseURL() {
    // Check if explicitly set in window
    if (window.API_BASE) {
      return this.normalizeURL(window.API_BASE)
    }

    // Check localStorage
    const stored = this.getFromStorage('crm_api_base')
    if (stored) {
      return this.normalizeURL(stored)
    }

    // Check environment
    if (window.CRM_API_BASE) {
      return this.normalizeURL(window.CRM_API_BASE)
    }

    // Use centralized API base detection if available
    if (typeof getCRMApiBase === 'function') {
      const apiBase = getCRMApiBase()
      if (apiBase) {
        return this.normalizeURL(apiBase)
      }
    }

    // Default for local development - use current origin to avoid CORS
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    if (isLocal) {
      return window.location.origin
    }

    // For LAN access, use backend port 8085 if frontend is on port 3000
    const host = window.location.hostname
    const port = window.location.port
    const protocol = window.location.protocol
    
    if (port === '3000') {
      return `${protocol}//${host}:8085`
    }

    // For other ports, assume backend is on same port as frontend
    return window.location.origin
  }

  /**
   * Normalize URL - ensure it's properly formatted
   */
  normalizeURL(url) {
    if (!url) return window.location.origin
    const trimmed = String(url).trim().replace(/\/$/, '')
    try {
      const urlObj = new URL(trimmed)
      return urlObj.origin
    } catch {
      return window.location.origin
    }
  }

  /**
   * Get authentication token
   */
  getAuthToken() {
    try {
      const session = localStorage.getItem('crm_session')
      if (session) {
        const parsed = JSON.parse(session)
        return parsed.access_token || parsed.token || null
      }
    } catch (e) {
      console.error('[APIClient] Error reading auth token:', e)
    }
    return null
  }

  /**
   * Get value from localStorage safely
   */
  getFromStorage(key) {
    try {
      return localStorage.getItem(key)
    } catch (e) {
      return null
    }
  }

  /**
   * Set value in localStorage safely
   */
  setInStorage(key, value) {
    try {
      if (value === null || value === undefined) {
        localStorage.removeItem(key)
      } else {
        localStorage.setItem(key, String(value))
      }
    } catch (e) {
      console.error('[APIClient] Error writing to storage:', e)
    }
  }

  /**
   * Build full URL for API endpoint
   */
  buildURL(endpoint) {
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    // Backend routes are mounted at the application root (no global '/api' prefix).
    // Keep the baseURL as-is and append the endpoint path directly.
    return `${this.baseURL}${path}`
  }

  /**
   * Build request headers
   */
  buildHeaders(options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    }

    // Add authorization token if available
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`
    }

    return headers
  }

  /**
   * Handle API errors
   */
  handleError(error, response) {
    const session = this.getAuthToken()
    console.error('[APIClient] Error:', {
      message: error.message,
      status: response?.status,
      hasToken: !!session,
      tokenLength: session ? session.length : 0,
      url: error.config?.url || 'unknown'
    })

    if (response?.status === 401) {
      // Unauthorized - clear session and redirect to login
      console.error('[APIClient] 401 Unauthorized - clearing session and redirecting to login')
      this.clearAuth()
      if (this.onUnauthorized) {
        this.onUnauthorized()
      } else {
        window.location.href = '/login.html'
      }
      throw new Error('Unauthorized - please login again')
    }

    if (response?.status === 403) {
      throw new Error('Forbidden - you do not have permission to perform this action')
    }

    if (response?.status === 404) {
      throw new Error('Resource not found')
    }

    if (response?.status >= 500) {
      throw new Error('Server error - please try again later')
    }

    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Network error - unable to connect to the server')
    }

    throw error
  }

  /**
   * Clear authentication
   */
  clearAuth() {
    this.authToken = null
    this.setInStorage('crm_session', null)
  }

  /**
   * Set authentication token
   */
  setAuthToken(token) {
    this.authToken = token
  }

  /**
   * Generic request method
   */
  async request(endpoint, options = {}) {
    const url = this.buildURL(endpoint)
    const method = options.method || 'GET'
    const headers = this.buildHeaders(options)

    const config = {
      method,
      headers,
      ...options
    }

    // Add body for POST/PUT/PATCH requests
    if (method !== 'GET' && method !== 'HEAD' && options.body) {
      if (typeof options.body === 'object') {
        config.body = JSON.stringify(options.body)
      } else {
        config.body = options.body
      }
    }

    try {
      console.log(`[APIClient] ${method} ${url}`)
      const response = await fetch(url, config)

      // Handle non-OK responses
      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch (e) {
          errorData = { detail: response.statusText }
        }
        const error = new Error(errorData.detail || response.statusText)
        error.status = response.status
        error.data = errorData
        this.handleError(error, response)
      }

      // Parse response
      const data = await response.json()
      console.log(`[APIClient] Response:`, data)
      return data
    } catch (error) {
      this.handleError(error)
    }
  }

  /**
   * GET request
   */
  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' })
  }

  /**
   * POST request
   */
  async post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body })
  }

  /**
   * PUT request
   */
  async put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body })
  }

  /**
   * PATCH request
   */
  async patch(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', body })
  }

  /**
   * DELETE request
   */
  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' })
  }

  // ═══════════════════════════════════════════════════════════════
  // AUTH ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  async login(email, password) {
    const response = await this.post('/auth/login', { email, password })
    if (response.access_token) {
      this.setAuthToken(response.access_token)
    }
    return response
  }

  async register(email, password, fullName, role = 'employee') {
    return this.post('/auth/register', {
      email,
      password,
      full_name: fullName,
      role
    })
  }

  async getCurrentUser() {
    return this.get('/auth/me')
  }

  // ═══════════════════════════════════════════════════════════════
  // LEADS ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  async getLeads(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.get(`/leads?${query}`)
  }

  async getLead(leadId) {
    return this.get(`/leads/${leadId}`)
  }

  async createLead(leadData) {
    return this.post('/leads', leadData)
  }

  async updateLead(leadId, leadData) {
    return this.put(`/leads/${leadId}`, leadData)
  }

  async deleteLead(leadId) {
    return this.delete(`/leads/${leadId}`)
  }

  // ═══════════════════════════════════════════════════════════════
  // USERS ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  async getUsers(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.get(`/users?${query}`)
  }

  async getUser(userId) {
    return this.get(`/users/${userId}`)
  }

  async createUser(userData) {
    return this.post('/users', userData)
  }

  async updateUser(userId, userData) {
    return this.put(`/users/${userId}`, userData)
  }

  async deleteUser(userId) {
    return this.delete(`/users/${userId}`)
  }

  // ═══════════════════════════════════════════════════════════════
  // DASHBOARD ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  async getDashboardStats(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.get(`/dashboard/stats?${query}`)
  }

  async getDashboardMetrics(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.get(`/dashboard/metrics?${query}`)
  }

  // ═══════════════════════════════════════════════════════════════
  // REPORTS ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  async getReports(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.get(`/reports?${query}`)
  }

  async generateReport(reportType, params = {}) {
    return this.post(`/reports/generate`, {
      type: reportType,
      ...params
    })
  }

  // ═══════════════════════════════════════════════════════════════
  // HEALTH CHECK
  // ═══════════════════════════════════════════════════════════════

  async healthCheck() {
    try {
      return await this.get('/health')
    } catch (error) {
      console.error('[APIClient] Health check failed:', error)
      return { status: 'error', message: error.message }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// GLOBAL INSTANCE
// ═══════════════════════════════════════════════════════════════

// Create and expose global API client instance
window.API = new APIClient()

// Optional: Set custom unauthorized handler
window.API.onUnauthorized = () => {
  console.warn('[APIClient] Unauthorized - redirecting to login')
  window.location.href = '/login.html'
}

console.log('[APIClient] Global API client initialized')
