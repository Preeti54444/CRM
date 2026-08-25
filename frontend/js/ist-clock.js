/**
 * IST (Indian Standard Time) Clock Manager
 * 
 * Features:
 * - Displays live IST time in the CRM header
 * - Updates every second
 * - Uses browser's Intl.DateTimeFormat API for accurate timezone handling
 * - Responsive design matching Funding Sathi theme
 * - Proper timer cleanup on page unload
 * - Graceful error handling
 * 
 * Usage:
 *   ISTClockManager.init(); // Initialize clock
 *   ISTClockManager.destroy(); // Clean up timer
 */

const ISTClockManager = {
  // Configuration
  config: {
    containerId: 'istClockContainer',
    updateInterval: 1000, // milliseconds
    timezone: 'Asia/Kolkata',
    fallbackText: 'IST Unavailable',
  },

  // State
  state: {
    timerInterval: null,
    initialized: false,
    containerElement: null,
  },

  /**
   * Initialize the IST clock
   */
  init() {
    // Prevent double initialization
    if (this.state.initialized) {
      console.warn('[ISTClock] Already initialized');
      return;
    }

    try {
      // Get or create container
      this.state.containerElement = document.getElementById(this.config.containerId);
      if (!this.state.containerElement) {
        console.error(`[ISTClock] Container with id "${this.config.containerId}" not found`);
        return;
      }

      // Check browser support
      if (!this.isBrowserSupported()) {
        console.warn('[ISTClock] Browser does not support Intl.DateTimeFormat with timezone');
        this.state.containerElement.textContent = this.config.fallbackText;
        return;
      }

      // Initial update
      this.updateClock();

      // Start interval timer
      this.state.timerInterval = setInterval(() => {
        this.updateClock();
      }, this.config.updateInterval);

      // Cleanup on page unload
      window.addEventListener('beforeunload', () => this.destroy());
      window.addEventListener('unload', () => this.destroy());

      this.state.initialized = true;
      console.log('[ISTClock] Initialized successfully');
    } catch (error) {
      console.error('[ISTClock] Initialization error:', error);
      this.displayFallback();
    }
  },

  /**
   * Update clock display
   */
  updateClock() {
    try {
      const timeString = this.getISTTimeString();
      if (this.state.containerElement) {
        this.state.containerElement.textContent = timeString;
      }
    } catch (error) {
      console.error('[ISTClock] Update error:', error);
      this.displayFallback();
    }
  },

  /**
   * Get formatted IST time string
   * Format: DD MMM YYYY hh:mm:ss AM/PM
   */
  getISTTimeString() {
    try {
      const now = new Date();

      // Format options for Intl.DateTimeFormat
      const dateOptions = {
        timeZone: this.config.timezone,
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      };

      const timeOptions = {
        timeZone: this.config.timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      };

      // Get formatted date and time
      const formatter = new Intl.DateTimeFormat('en-US', dateOptions);
      const timeFormatter = new Intl.DateTimeFormat('en-US', timeOptions);

      const dateParts = formatter.formatToParts(now);
      const timeParts = timeFormatter.formatToParts(now);

      // Extract date components
      let day = '';
      let month = '';
      let year = '';

      dateParts.forEach((part) => {
        if (part.type === 'day') day = part.value;
        if (part.type === 'month') month = part.value;
        if (part.type === 'year') year = part.value;
      });

      // Extract time components
      let hours = '';
      let minutes = '';
      let seconds = '';
      let period = '';

      timeParts.forEach((part) => {
        if (part.type === 'hour') hours = part.value;
        if (part.type === 'minute') minutes = part.value;
        if (part.type === 'second') seconds = part.value;
        if (part.type === 'dayPeriod') period = part.value;
      });

      // Construct formatted string
      const dateString = `${day} ${month} ${year}`;
      const timeString = `${hours}:${minutes}:${seconds} ${period}`;

      return `🕐 ${dateString} ${timeString} IST`;
    } catch (error) {
      console.error('[ISTClock] getISTTimeString error:', error);
      throw error;
    }
  },

  /**
   * Check if browser supports Intl with timezone
   */
  isBrowserSupported() {
    try {
      const testDate = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: this.config.timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const result = formatter.format(testDate);
      return result && result.length > 0;
    } catch (error) {
      console.error('[ISTClock] Browser support check failed:', error);
      return false;
    }
  },

  /**
   * Display fallback message
   */
  displayFallback() {
    if (this.state.containerElement) {
      this.state.containerElement.textContent = this.config.fallbackText;
    }
  },

  /**
   * Destroy the clock and clean up resources
   */
  destroy() {
    try {
      if (this.state.timerInterval) {
        clearInterval(this.state.timerInterval);
        this.state.timerInterval = null;
      }

      this.state.initialized = false;
      console.log('[ISTClock] Destroyed');
    } catch (error) {
      console.error('[ISTClock] Destroy error:', error);
    }
  },

  /**
   * Get current state (for debugging)
   */
  getState() {
    return {
      initialized: this.state.initialized,
      timerActive: this.state.timerInterval !== null,
      containerId: this.config.containerId,
      timezone: this.config.timezone,
    };
  },

  /**
   * Get current IST time as Date object
   * Useful for backend API calls or business logic
   */
  getCurrentISTTime() {
    const now = new Date();
    const istTime = new Date(
      now.toLocaleString('en-US', { timeZone: this.config.timezone })
    );
    return istTime;
  },

  /**
   * Set update interval (in milliseconds)
   * Default is 1000ms (1 second)
   */
  setUpdateInterval(intervalMs) {
    if (this.state.timerInterval) {
      clearInterval(this.state.timerInterval);
    }

    this.config.updateInterval = intervalMs;

    if (this.state.initialized) {
      this.state.timerInterval = setInterval(() => {
        this.updateClock();
      }, this.config.updateInterval);
    }
  },

  /**
   * Format time string without clock emoji (for custom display)
   */
  getTimeStringPlain() {
    try {
      const timeString = this.getISTTimeString();
      return timeString.replace('🕐 ', '');
    } catch (error) {
      console.error('[ISTClock] getTimeStringPlain error:', error);
      return this.config.fallbackText;
    }
  },
};

// Auto-initialize when DOM is ready if container exists
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () {
    // Delay slightly to ensure all DOM elements are ready
    setTimeout(() => {
      if (document.getElementById(ISTClockManager.config.containerId)) {
        ISTClockManager.init();
      }
    }, 100);
  });
} else {
  // DOM already loaded
  setTimeout(() => {
    if (document.getElementById(ISTClockManager.config.containerId)) {
      ISTClockManager.init();
    }
  }, 100);
}

// Ensure cleanup on page navigation (for SPAs)
window.addEventListener('beforeunload', () => {
  ISTClockManager.destroy();
});
