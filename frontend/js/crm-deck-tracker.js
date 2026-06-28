/**
 * Funding Sathi CRM - Pitch Deck Tracking & Analytics
 * Track when investors view your deck, which slides they spend time on, and engagement metrics
 */

const DeckTracker = {
  // Configuration
  config: {
    trackingEndpoint: '/api/deck/track',
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    pingInterval: 5000, // 5 seconds
    heatmapEnabled: true
  },

  // Active tracking sessions
  sessions: new Map(),

  // ═══════════════════════════════════════════════════════════════
  // TRACKING METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Initialize tracking for a deck
   * @param {string} deckId - Unique deck identifier
   * @param {Object} options - Tracking options
   */
  initTracking: function(deckId, options = {}) {
    const sessionId = 'SESS-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    const session = {
      id: sessionId,
      deckId: deckId,
      investorId: options.investorId || null,
      startTime: Date.now(),
      lastPing: Date.now(),
      totalTime: 0,
      slidesViewed: [],
      currentSlide: 0,
      interactions: [],
      forwarded: false,
      forwardedTo: [],
      device: this.getDeviceInfo(),
      location: null,
      referrer: document.referrer || 'direct',
      email: options.email || null
    };

    this.sessions.set(sessionId, session);
    
    // Start ping interval
    this.startPing(sessionId);
    
    // Get location
    this.getLocation().then(loc => {
      session.location = loc;
    });

    return sessionId;
  },

  /**
   * Record slide view
   * @param {string} sessionId - Tracking session ID
   * @param {number} slideNumber - Current slide number
   * @param {number} timeSpent - Time spent on slide (seconds)
   * @param {Object} metadata - Additional metadata
   */
  trackSlideView: function(sessionId, slideNumber, timeSpent, metadata = {}) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const slideView = {
      slideNumber: slideNumber,
      slideTitle: metadata.title || `Slide ${slideNumber}`,
      timeSpent: timeSpent,
      timestamp: new Date().toISOString(),
      clicked: metadata.clicked || [],
      scrolled: metadata.scrolled || false,
      zoomed: metadata.zoomed || false
    };

    // Check if slide already viewed (for time accumulation)
    const existingIndex = session.slidesViewed.findIndex(s => s.slideNumber === slideNumber);
    if (existingIndex >= 0) {
      session.slidesViewed[existingIndex].timeSpent += timeSpent;
      session.slidesViewed[existingIndex].views = (session.slidesViewed[existingIndex].views || 1) + 1;
    } else {
      slideView.views = 1;
      session.slidesViewed.push(slideView);
    }

    session.currentSlide = slideNumber;
    session.lastPing = Date.now();

    // Send to analytics
    this.sendAnalytics('slide_view', {
      sessionId,
      deckId: session.deckId,
      investorId: session.investorId,
      slideNumber,
      timeSpent,
      ...metadata
    });

    // Update investor record
    this.updateInvestorMetrics(session);
  },

  /**
   * Track deck interactions
   * @param {string} sessionId - Tracking session ID
   * @param {string} action - Interaction type
   * @param {Object} data - Interaction data
   */
  trackInteraction: function(sessionId, action, data = {}) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const interaction = {
      action: action,
      timestamp: new Date().toISOString(),
      data: data
    };

    session.interactions.push(interaction);

    // Specific action handling
    switch (action) {
      case 'download':
        this.recordDownload(session, data);
        break;
      case 'print':
        this.recordPrint(session);
        break;
      case 'share':
        this.recordShare(session, data);
        break;
      case 'forward':
        this.recordForward(session, data);
        break;
      case 'link_click':
        this.recordLinkClick(session, data);
        break;
    }

    this.sendAnalytics('interaction', { sessionId, action, ...data });
  },

  /**
   * Detect and record deck forwards
   * @param {string} sessionId - Tracking session ID
   */
  detectForward: function(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Check for signs of forwarding:
    // 1. Different device than previous sessions
    // 2. Different location
    // 3. Multiple IPs (if available server-side)
    // 4. Unusual viewing patterns

    const prevViews = this.getPreviousViews(session.deckId, session.email);
    
    if (prevViews.length > 0) {
      const lastView = prevViews[prevViews.length - 1];
      
      // Device fingerprinting check
      if (this.isDifferentDevice(session.device, lastView.device)) {
        this.markAsForwarded(session, 'different_device');
        return true;
      }

      // Location check (if IP-based geolocation available)
      if (session.location && lastView.location) {
        const distance = this.calculateDistance(session.location, lastView.location);
        if (distance > 100) { // More than 100km difference
          this.markAsForwarded(session, 'different_location', { distance });
          return true;
        }
      }
    }

    return false;
  },

  /**
   * Mark session as forwarded
   * @param {Object} session - Tracking session
   * @param {string} reason - Forward detection reason
   * @param {Object} metadata - Additional metadata
   */
  markAsForwarded: function(session, reason, metadata = {}) {
    session.forwarded = true;
    session.forwardDetectionReason = reason;
    session.forwardMetadata = metadata;

    // Update investor record
    if (session.investorId) {
      const investors = DataStore.get('investors') || [];
      const investor = investors.find(i => i.id === session.investorId);
      if (investor) {
        investor.deckForwards = (investor.deckForwards || 0) + 1;
        DataStore.set('investors', investors);
      }
    }

    // Notify user
    this.notifyForwardDetected(session, reason);
  },

  // ═══════════════════════════════════════════════════════════════
  // ANALYTICS & REPORTING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get comprehensive deck analytics
   * @param {string} deckId - Deck identifier
   * @returns {Object} Analytics data
   */
  getDeckAnalytics: function(deckId) {
    const views = (DataStore.get('deck_views') || []).filter(v => v.deckId === deckId);
    
    const analytics = {
      totalViews: views.length,
      uniqueViews: new Set(views.map(v => v.investorId)).size,
      totalTime: views.reduce((sum, v) => sum + (v.totalTime || 0), 0),
      averageTime: views.length > 0 ? views.reduce((sum, v) => sum + (v.totalTime || 0), 0) / views.length : 0,
      completionRate: this.calculateCompletionRate(views),
      forwards: views.filter(v => v.forwarded).length,
      downloads: views.filter(v => v.downloaded).length,
      
      // Slide-level analytics
      slideStats: this.getSlideStats(views),
      
      // Time-based analytics
      viewsByDay: this.groupByDay(views),
      viewsByHour: this.groupByHour(views),
      
      // Investor-level analytics
      investorEngagement: this.getInvestorEngagement(views),
      
      // Drop-off analysis
      dropOffPoints: this.getDropOffPoints(views),
      
      // Heatmap data
      heatmapData: this.generateHeatmapData(views)
    };

    return analytics;
  },

  /**
   * Get slide-level statistics
   */
  getSlideStats: function(views) {
    const slideStats = {};
    
    views.forEach(view => {
      (view.slidesViewed || []).forEach(slide => {
        if (!slideStats[slide.slideNumber]) {
          slideStats[slide.slideNumber] = {
            slideNumber: slide.slideNumber,
            title: slide.slideTitle,
            totalViews: 0,
            totalTime: 0,
            averageTime: 0,
            dropOffs: 0
          };
        }
        
        slideStats[slide.slideNumber].totalViews++;
        slideStats[slide.slideNumber].totalTime += slide.timeSpent;
      });
    });

    // Calculate averages and find problem slides
    Object.values(slideStats).forEach(stat => {
      stat.averageTime = stat.totalTime / stat.totalViews;
      // A slide is a problem if average time is very low (< 5 seconds)
      stat.problem = stat.averageTime < 5;
    });

    return Object.values(slideStats).sort((a, b) => a.slideNumber - b.slideNumber);
  },

  /**
   * Calculate completion rate (% of viewers who reach last slide)
   */
  calculateCompletionRate: function(views) {
    if (views.length === 0) return 0;
    
    const totalSlides = Math.max(...views.flatMap(v => v.slidesViewed.map(s => s.slideNumber)));
    const completed = views.filter(v => {
      const maxSlide = Math.max(...v.slidesViewed.map(s => s.slideNumber));
      return maxSlide >= totalSlides * 0.8; // Reached 80% of deck
    }).length;
    
    return (completed / views.length) * 100;
  },

  /**
   * Get drop-off points in the deck
   */
  getDropOffPoints: function(views) {
    const dropOffs = [];
    
    views.forEach(view => {
      const slides = view.slidesViewed.sort((a, b) => a.slideNumber - b.slideNumber);
      if (slides.length > 0) {
        const lastSlide = slides[slides.length - 1];
        // If spent very little time on last slide, likely dropped off
        if (lastSlide.timeSpent < 3) {
          dropOffs.push({
            slideNumber: lastSlide.slideNumber,
            slideTitle: lastSlide.slideTitle,
            reason: 'short_view'
          });
        }
      }
    });

    // Aggregate by slide
    const bySlide = {};
    dropOffs.forEach(d => {
      if (!bySlide[d.slideNumber]) {
        bySlide[d.slideNumber] = { ...d, count: 0 };
      }
      bySlide[d.slideNumber].count++;
    });

    return Object.values(bySlide).sort((a, b) => b.count - a.count).slice(0, 5);
  },

  /**
   * Generate heatmap data for slides
   */
  generateHeatmapData: function(views) {
    if (!this.config.heatmapEnabled) return null;
    
    const heatmap = {};
    
    views.forEach(view => {
      (view.interactions || []).forEach(interaction => {
        if (interaction.action === 'mouse_move' || interaction.action === 'click') {
          const key = `${interaction.data.slideNumber}-${interaction.data.x}-${interaction.data.y}`;
          heatmap[key] = (heatmap[key] || 0) + 1;
        }
      });
    });

    return heatmap;
  },

  // ═══════════════════════════════════════════════════════════════
  // ENGAGEMENT SCORING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Calculate engagement score for an investor based on deck behavior
   */
  calculateEngagementScore: function(investorId, deckId = null) {
    const views = (DataStore.get('deck_views') || [])
      .filter(v => v.investorId === investorId && (!deckId || v.deckId === deckId));
    
    if (views.length === 0) return 0;

    const latestView = views.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
    
    let score = 0;
    const maxScore = 100;

    // Time spent (30 points max)
    const timeScore = Math.min((latestView.totalTime / 180) * 30, 30); // 3 min = max score
    score += timeScore;

    // Completion rate (25 points max)
    const completion = this.calculateCompletionRate([latestView]) / 100;
    score += completion * 25;

    // Return visits (20 points max)
    const returnVisits = Math.min(views.length - 1, 4) * 5;
    score += returnVisits;

    // Interactions (15 points max)
    const interactionScore = Math.min(latestView.interactions?.length * 3, 15);
    score += interactionScore;

    // Forwarding (negative - investors shouldn't forward without permission)
    if (latestView.forwarded) {
      score -= 10;
    }

    // Recent activity bonus (10 points)
    const daysSinceView = (Date.now() - new Date(latestView.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceView < 1) score += 10;
    else if (daysSinceView < 7) score += 5;

    return Math.max(Math.round(score), 0);
  },

  // ═══════════════════════════════════════════════════════════════
  // UI RENDERING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Render deck analytics dashboard
   */
  renderDeckAnalytics: function(deckId) {
    const analytics = this.getDeckAnalytics(deckId);
    const container = document.getElementById('deck-analytics-container');
    if (!container) return;

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title">📊 Pitch Deck Analytics</div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-secondary btn-sm" onclick="exportAnalytics('${deckId}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              Export
            </button>
          </div>
        </div>
        
        <div class="card-body">
          <!-- Summary Stats -->
          <div class="stats-grid" style="margin-bottom:24px;">
            <div class="stat-card">
              <div class="stat-label">Total Views</div>
              <div class="stat-value">${analytics.totalViews}</div>
              <div class="stat-change">${analytics.uniqueViews} unique investors</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Avg. Time</div>
              <div class="stat-value">${this.formatDuration(analytics.averageTime)}</div>
              <div class="stat-change">Total: ${this.formatDuration(analytics.totalTime)}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Completion Rate</div>
              <div class="stat-value">${analytics.completionRate.toFixed(1)}%</div>
              <div class="stat-change ${analytics.completionRate > 50 ? 'positive' : 'negative'}">
                ${analytics.completionRate > 50 ? '↑' : '↓'} 
                ${analytics.completionRate > 70 ? 'Good' : analytics.completionRate > 40 ? 'Average' : 'Needs work'}
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Forwards Detected</div>
              <div class="stat-value" style="color:${analytics.forwards > 0 ? 'var(--warning)' : 'var(--success)'};">${analytics.forwards}</div>
              <div class="stat-change">${analytics.forwards > 0 ? '⚠️ Monitor sharing' : '✓ Controlled access'}</div>
            </div>
          </div>

          <!-- Slide Analytics -->
          <h4 style="font-size:16px; font-weight:600; margin-bottom:16px;">Slide Performance</h4>
          <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:24px;">
            ${analytics.slideStats.map(slide => `
              <div style="display:flex; align-items:center; gap:16px; padding:12px; background:var(--gray-50); border-radius:8px; ${slide.problem ? 'border:1px solid var(--danger);' : ''}">
                <div style="width:40px; height:40px; background:var(--primary); color:white; border-radius:8px; display:flex; align-items:center; justify-content:center; font-weight:600;">${slide.slideNumber}</div>
                <div style="flex:1;">
                  <div style="font-weight:500; ${slide.problem ? 'color:var(--danger);' : ''}">${slide.title}</div>
                  <div style="font-size:12px; color:var(--gray-500);">${slide.totalViews} views • avg ${this.formatDuration(slide.averageTime)}</div>
                </div>
                <div style="width:100px;">
                  <div style="height:8px; background:var(--gray-200); border-radius:4px; overflow:hidden;">
                    <div style="height:100%; width:${(slide.totalViews / analytics.totalViews) * 100}%; background:${slide.problem ? 'var(--danger)' : 'var(--success)'}; border-radius:4px;"></div>
                  </div>
                </div>
                ${slide.problem ? '<span class="badge badge-danger" style="font-size:10px;">⚠️ Low engagement</span>' : ''}
              </div>
            `).join('')}
          </div>

          <!-- Drop-off Points -->
          ${analytics.dropOffPoints.length > 0 ? `
            <h4 style="font-size:16px; font-weight:600; margin-bottom:16px;">⚠️ Drop-off Points</h4>
            <div style="background:var(--danger-light); border:1px solid var(--danger); border-radius:8px; padding:16px; margin-bottom:24px;">
              <p style="margin-bottom:12px; color:var(--danger);">Investors are dropping off at these slides:</p>
              ${analytics.dropOffPoints.map(drop => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--danger); opacity:0.5;">
                  <span>Slide ${drop.slideNumber}: ${drop.slideTitle}</span>
                  <span class="badge badge-danger">${drop.count} drop-offs</span>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <!-- Investor Engagement -->
          <h4 style="font-size:16px; font-weight:600; margin-bottom:16px;">Top Engaged Investors</h4>
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Investor</th>
                  <th>Views</th>
                  <th>Time Spent</th>
                  <th>Completion</th>
                  <th>Last View</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                ${analytics.investorEngagement.slice(0, 10).map(inv => `
                  <tr>
                    <td>
                      <div style="font-weight:500;">${inv.firmName}</div>
                      <div style="font-size:12px; color:var(--gray-500);">${inv.contactName}</div>
                    </td>
                    <td>${inv.viewCount}</td>
                    <td>${this.formatDuration(inv.totalTime)}</td>
                    <td>
                      <div style="display:flex; align-items:center; gap:8px;">
                        <div style="width:60px; height:6px; background:var(--gray-200); border-radius:3px;">
                          <div style="width:${inv.completion}%; height:100%; background:var(--primary); border-radius:3px;"></div>
                        </div>
                        <span style="font-size:12px;">${inv.completion.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td>${this.timeAgo(inv.lastView)}</td>
                    <td>
                      <span class="badge ${inv.engagementScore > 70 ? 'badge-success' : inv.engagementScore > 40 ? 'badge-warning' : 'badge-danger'}">
                        ${inv.engagementScore}
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  // ═══════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════

  getDeviceInfo: function() {
    return {
      type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      os: navigator.platform,
      browser: navigator.userAgent.split(' ').pop(),
      screen: { width: screen.width, height: screen.height }
    };
  },

  getLocation: async function() {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      return { city: data.city, country: data.country_name, lat: data.latitude, lon: data.longitude };
    } catch (e) {
      return null;
    }
  },

  startPing: function(sessionId) {
    const interval = setInterval(() => {
      const session = this.sessions.get(sessionId);
      if (!session) {
        clearInterval(interval);
        return;
      }

      // Check for timeout
      if (Date.now() - session.lastPing > this.config.sessionTimeout) {
        this.endSession(sessionId);
        clearInterval(interval);
        return;
      }

      session.totalTime += this.config.pingInterval;
    }, this.config.pingInterval);
  },

  endSession: function(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Save to DataStore
    const views = DataStore.get('deck_views') || [];
    views.push({
      sessionId: session.id,
      deckId: session.deckId,
      investorId: session.investorId,
      timestamp: new Date(session.startTime).toISOString(),
      totalTime: session.totalTime,
      slidesViewed: session.slidesViewed,
      device: session.device,
      location: session.location,
      forwarded: session.forwarded,
      interactions: session.interactions
    });
    DataStore.set('deck_views', views);

    this.sessions.delete(sessionId);
  },

  formatDuration: function(seconds) {
    if (!seconds) return '0s';
    if (seconds < 60) return Math.round(seconds) + 's';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ' + Math.round(seconds % 60) + 's';
    return Math.floor(seconds / 3600) + 'h ' + Math.floor((seconds % 3600) / 60) + 'm';
  },

  timeAgo: function(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return Math.floor(diff / 86400000) + 'd ago';
  },

  sendAnalytics: function(event, data) {
    // In production, send to analytics endpoint
    console.log('[Deck Analytics]', event, data);
  }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DeckTracker;
}
