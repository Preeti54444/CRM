/**
 * Funding Sathi CRM - Automation & Follow-up System
 * Automated sequences, drip campaigns, and relationship intelligence
 */

const AutomationEngine = {
  // ═══════════════════════════════════════════════════════════════
  // EMAIL SEQUENCES & DRIP CAMPAIGNS
  // ═══════════════════════════════════════════════════════════════

  sequences: new Map(),

  /**
   * Create a new email sequence
   */
  createSequence: function(config) {
    const sequence = {
      id: 'SEQ-' + Date.now(),
      name: config.name,
      description: config.description,
      trigger: config.trigger, // 'stage_change', 'time_based', 'no_response', 'deck_viewed'
      triggerConfig: config.triggerConfig || {},
      emails: config.emails || [], // Array of { delay: days, subject, body, template, conditions }
      status: 'active',
      createdAt: new Date().toISOString(),
      stats: { sent: 0, opened: 0, clicked: 0, replied: 0 }
    };

    const sequences = DataStore.get('email_sequences') || [];
    sequences.push(sequence);
    DataStore.set('email_sequences', sequences);

    return sequence;
  },

  /**
   * Enroll an investor in a sequence
   */
  enrollInvestor: function(investorId, sequenceId, startDate = new Date()) {
    const enrollment = {
      id: 'ENR-' + Date.now(),
      investorId: investorId,
      sequenceId: sequenceId,
      status: 'active',
      startDate: startDate.toISOString(),
      currentStep: 0,
      nextSendDate: this.calculateNextSend(startDate, 0),
      emailsSent: [],
      createdAt: new Date().toISOString()
    };

    const enrollments = DataStore.get('sequence_enrollments') || [];
    enrollments.push(enrollment);
    DataStore.set('sequence_enrollments', enrollments);

    // Update investor
    const investors = DataStore.get('investors') || [];
    const investor = investors.find(i => i.id === investorId);
    if (investor) {
      investor.activeSequence = sequenceId;
      DataStore.set('investors', investors);
    }

    return enrollment;
  },

  /**
   * Calculate next send date based on delay
   */
  calculateNextSend: function(fromDate, delayDays) {
    const date = new Date(fromDate);
    date.setDate(date.getDate() + delayDays);
    
    // Skip weekends
    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() + 1);
    }
    
    // Send at 9 AM local time
    date.setHours(9, 0, 0, 0);
    
    return date.toISOString();
  },

  /**
   * Process pending emails (call this on a schedule)
   */
  processSequences: function() {
    const enrollments = DataStore.get('sequence_enrollments') || [];
    const sequences = DataStore.get('email_sequences') || [];
    const now = new Date();

    enrollments.filter(e => e.status === 'active').forEach(enrollment => {
      if (new Date(enrollment.nextSendDate) <= now) {
        const sequence = sequences.find(s => s.id === enrollment.sequenceId);
        if (!sequence || enrollment.currentStep >= sequence.emails.length) {
          enrollment.status = 'completed';
          return;
        }

        const email = sequence.emails[enrollment.currentStep];
        
        // Check conditions
        if (this.checkConditions(enrollment, email.conditions)) {
          this.sendSequenceEmail(enrollment, email);
          enrollment.emailsSent.push({
            step: enrollment.currentStep,
            sentAt: new Date().toISOString(),
            email: email
          });
        }

        enrollment.currentStep++;
        if (enrollment.currentStep < sequence.emails.length) {
          enrollment.nextSendDate = this.calculateNextSend(
            enrollment.startDate, 
            sequence.emails[enrollment.currentStep].delay
          );
        } else {
          enrollment.status = 'completed';
        }
      }
    });

    DataStore.set('sequence_enrollments', enrollments);
  },

  /**
   * Check if conditions are met before sending
   */
  checkConditions: function(enrollment, conditions) {
    if (!conditions) return true;

    const investor = (DataStore.get('investors') || []).find(i => i.id === enrollment.investorId);
    if (!investor) return false;

    // Check stage condition
    if (conditions.stage && conditions.stage !== investor.stage) {
      return false;
    }

    // Check no response condition
    if (conditions.noResponseFor && investor.lastContactDate) {
      const daysSince = (Date.now() - new Date(investor.lastContactDate).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < conditions.noResponseFor) {
        return false;
      }
    }

    // Check deck viewed condition
    if (conditions.deckViewed === true && investor.deckViews === 0) {
      return false;
    }

    return true;
  },

  /**
   * Send email in sequence
   */
  sendSequenceEmail: function(enrollment, email) {
    const investor = (DataStore.get('investors') || []).find(i => i.id === enrollment.investorId);
    if (!investor) return;

    // Personalize email
    const personalizedSubject = this.personalizeTemplate(email.subject, investor);
    const personalizedBody = this.personalizeTemplate(email.body, investor);

    // Queue for sending (in production, this would call email API)
    const emailQueue = DataStore.get('email_queue') || [];
    emailQueue.push({
      id: 'EMAIL-' + Date.now(),
      to: investor.email,
      subject: personalizedSubject,
      body: personalizedBody,
      template: email.template,
      investorId: investor.id,
      sequenceId: enrollment.sequenceId,
      enrollmentId: enrollment.id,
      status: 'queued',
      createdAt: new Date().toISOString()
    });
    DataStore.set('email_queue', emailQueue);

    // Log activity
    DataStore.addActivity('email', `Sequence email queued: ${personalizedSubject}`, investor.firmName);
  },

  /**
   * Personalize email template with investor data
   */
  personalizeTemplate: function(template, investor) {
    const replacements = {
      '{{firmName}}': investor.firmName,
      '{{contactName}}': investor.contactName,
      '{{firstName}}': investor.contactName?.split(' ')[0] || '',
      '{{title}}': investor.title,
      '{{deckLink}}': investor.pitchDeckUrl || '[DECK_LINK]',
      '{{calendarLink}}': '[CALENDAR_LINK]',
      '{{senderName}}': 'Vaibhav',
      '{{companyName}}': 'Funding Sathi'
    };

    let personalized = template;
    Object.keys(replacements).forEach(key => {
      personalized = personalized.replace(new RegExp(key, 'g'), replacements[key]);
    });

    return personalized;
  }
};

// ═══════════════════════════════════════════════════════════════
// RELATIONSHIP INTELLIGENCE
// ═══════════════════════════════════════════════════════════════

const RelationshipIntel = {
  /**
   * Calculate relationship strength score
   */
  calculateRelationshipScore: function(investorId) {
    const investor = (DataStore.get('investors') || []).find(i => i.id === investorId);
    if (!investor) return 0;

    const interactions = investor.interactions || [];
    const emails = interactions.filter(i => i.type === 'email');
    const meetings = interactions.filter(i => i.type === 'meeting');
    const calls = interactions.filter(i => i.type === 'call');

    let score = 0;

    // Email frequency (30 points)
    const emailScore = Math.min(emails.length * 5, 30);
    score += emailScore;

    // Meeting count (25 points)
    const meetingScore = Math.min(meetings.length * 8, 25);
    score += meetingScore;

    // Call count (15 points)
    const callScore = Math.min(calls.length * 5, 15);
    score += callScore;

    // Recency (20 points)
    const lastContact = new Date(investor.lastContactDate || 0);
    const daysSince = (Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) score += 20;
    else if (daysSince < 30) score += 10;
    else if (daysSince < 90) score += 5;

    // Response rate (10 points)
    const responseRate = emails.filter(e => e.replied).length / (emails.length || 1);
    score += responseRate * 10;

    return Math.round(score);
  },

  /**
   * Detect relationship cooling
   */
  detectCoolingRelationships: function(thresholdDays = 30) {
    const investors = DataStore.get('investors') || [];
    const cooling = [];

    investors.forEach(investor => {
      if (!investor.lastContactDate) return;

      const daysSince = (Date.now() - new Date(investor.lastContactDate).getTime()) / (1000 * 60 * 60 * 24);
      const score = this.calculateRelationshipScore(investor.id);

      if (daysSince > thresholdDays && score > 40) {
        cooling.push({
          investorId: investor.id,
          firmName: investor.firmName,
          contactName: investor.contactName,
          daysSinceContact: Math.floor(daysSince),
          relationshipScore: score,
          urgency: daysSince > 60 ? 'high' : 'medium',
          suggestedAction: this.suggestReactivation(investor)
        });
      }
    });

    return cooling.sort((a, b) => b.urgency === 'high' ? 1 : -1);
  },

  /**
   * Suggest reactivation action
   */
  suggestReactivation: function(investor) {
    if (investor.deckViews === 0 && investor.stage === 'initial_outreach') {
      return {
        type: 'send_deck',
        message: 'Send pitch deck follow-up'
      };
    }

    if (investor.meetingCount === 0) {
      return {
        type: 'schedule_meeting',
        message: 'Request intro meeting'
      };
    }

    if (investor.stage === 'due_diligence') {
      return {
        type: 'provide_update',
        message: 'Send DD progress update'
      };
    }

    return {
      type: 'general_followup',
      message: 'Send relationship check-in'
    };
  },

  /**
   * Generate relationship insights
   */
  generateInsights: function(investorId) {
    const investor = (DataStore.get('investors') || []).find(i => i.id === investorId);
    if (!investor) return null;

    const insights = [];

    // Engagement trend
    const recentViews = investor.deckViews > 0 ? 'High interest in materials' : 'Has not viewed deck yet';
    insights.push({ type: 'engagement', message: recentViews });

    // Response pattern
    const avgResponse = investor.responseTime;
    if (avgResponse < 24) {
      insights.push({ type: 'positive', message: 'Quick responder - maintain momentum' });
    } else if (avgResponse > 72) {
      insights.push({ type: 'warning', message: 'Slow responder - patience required' });
    }

    // Forward detection
    if (investor.deckForwards > 0) {
      insights.push({ type: 'info', message: `Deck forwarded ${investor.deckForwards} time(s) - internal champion?` });
    }

    // Stage duration
    const currentStage = investor.stageHistory?.slice(-1)[0];
    if (currentStage) {
      const stageDays = (Date.now() - new Date(currentStage.date).getTime()) / (1000 * 60 * 60 * 24);
      if (stageDays > 14) {
        insights.push({ type: 'action', message: `In ${investor.stage} for ${Math.floor(stageDays)} days - consider nudge` });
      }
    }

    return insights;
  },

  /**
   * Render relationship dashboard
   */
  renderRelationshipDashboard: function() {
    const investors = DataStore.get('investors') || [];
    const container = document.getElementById('relationship-dashboard');
    if (!container) return;

    // Calculate stats
    const avgScore = investors.length > 0 
      ? investors.reduce((sum, i) => sum + this.calculateRelationshipScore(i.id), 0) / investors.length 
      : 0;
    
    const cooling = this.detectCoolingRelationships(21);
    const highPriority = investors.filter(i => i.priority === 'high' && i.stage !== 'closed_won');

    container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Avg. Relationship Score</div>
          <div class="stat-value">${Math.round(avgScore)}</div>
          <div class="stat-change">${avgScore > 60 ? 'Strong' : avgScore > 30 ? 'Developing' : 'Needs attention'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Cooling Relationships</div>
          <div class="stat-value" style="color:${cooling.length > 5 ? 'var(--danger)' : 'var(--warning)'}">${cooling.length}</div>
          <div class="stat-change">No contact in 21+ days</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">High Priority Active</div>
          <div class="stat-value">${highPriority.length}</div>
          <div class="stat-change">${highPriority.filter(i => i.stage === 'term_sheet').length} at term sheet</div>
        </div>
      </div>

      ${cooling.length > 0 ? `
        <div class="card" style="margin-top:24px;">
          <div class="card-header">
            <div class="card-title">⚠️ Relationships Needing Attention</div>
          </div>
          <div class="card-body">
            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>Investor</th>
                    <th>Days Since Contact</th>
                    <th>Score</th>
                    <th>Stage</th>
                    <th>Suggested Action</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  ${cooling.slice(0, 10).map(c => `
                    <tr>
                      <td>
                        <div style="font-weight:500;">${c.firmName}</div>
                        <div style="font-size:12px; color:var(--gray-500);">${c.contactName}</div>
                      </td>
                      <td><span class="badge ${c.urgency === 'high' ? 'badge-danger' : 'badge-warning'}">${c.daysSinceContact} days</span></td>
                      <td>
                        <div style="display:flex; align-items:center; gap:8px;">
                          <div style="width:40px; height:6px; background:var(--gray-200); border-radius:3px;">
                            <div style="width:${c.relationshipScore}%; height:100%; background:var(--primary); border-radius:3px;"></div>
                          </div>
                          <span style="font-size:12px;">${c.relationshipScore}</span>
                        </div>
                      </td>
                      <td>${c.suggestedAction.message}</td>
                      <td>
                        <button class="btn btn-primary btn-sm" onclick="executeAction('${c.investorId}', '${c.suggestedAction.type}')">
                          ${c.suggestedAction.type === 'send_deck' ? '📎 Send Deck' : 
                            c.suggestedAction.type === 'schedule_meeting' ? '📅 Schedule' : 
                            '💬 Follow Up'}
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ` : ''}
    `;
  }
};

// ═══════════════════════════════════════════════════════════════
// AI-POWERED FEATURES
// ═══════════════════════════════════════════════════════════════

const AIFeatures = {
  /**
   * Match investors to company thesis
   */
  thesisMatch: function(companyProfile, investor) {
    const matches = [];
    const scores = { total: 0, max: 0 };

    // Sector match (30 points)
    const sectorMatch = companyProfile.sectors?.some(s => investor.sectors?.includes(s));
    if (sectorMatch) {
      matches.push({ category: 'Sector', match: true, points: 30 });
      scores.total += 30;
    }
    scores.max += 30;

    // Stage match (25 points)
    const stageMatch = investor.investmentStage?.includes(companyProfile.stage);
    if (stageMatch) {
      matches.push({ category: 'Stage', match: true, points: 25 });
      scores.total += 25;
    }
    scores.max += 25;

    // Ticket size match (20 points)
    const ticketMatch = companyProfile.raiseAmount >= investor.ticketSize.min && 
                       companyProfile.raiseAmount <= investor.ticketSize.max;
    if (ticketMatch) {
      matches.push({ category: 'Ticket Size', match: true, points: 20 });
      scores.total += 20;
    }
    scores.max += 20;

    // Geography match (15 points)
    const geoMatch = investor.geography?.includes(companyProfile.location) || 
                    investor.geography?.includes('Global');
    if (geoMatch) {
      matches.push({ category: 'Geography', match: true, points: 15 });
      scores.total += 15;
    }
    scores.max += 15;

    // Portfolio synergy (10 points) - would need portfolio data
    scores.max += 10;

    const percentage = Math.round((scores.total / scores.max) * 100);
    
    return {
      score: percentage,
      matches: matches,
      recommendation: percentage > 80 ? 'Strong match - prioritize' : 
                      percentage > 60 ? 'Good match - worth pursuing' : 
                      percentage > 40 ? 'Possible fit - research more' : 'Low fit - deprioritize'
    };
  },

  /**
   * Generate email draft with AI
   */
  generateEmail: async function(purpose, investor, context = {}) {
    const templates = {
      initial_outreach: {
        subject: `{{companyName}} - {{sector}} opportunity aligned with {{firmName}}'s thesis`,
        body: `Hi {{firstName}},

I hope this email finds you well. I'm reaching out because {{companyName}} is building {{elevatorPitch}}, which aligns perfectly with {{firmName}}'s focus on {{investorFocus}}.

We've achieved {{tractionMetrics}} and are now raising {{raiseAmount}} to {{useOfFunds}}.

I'd love to share our pitch deck with you. Would you be open to a brief conversation next week?

Best,
{{senderName}}`
      },
      follow_up: {
        subject: `Following up - {{companyName}} materials`,
        body: `Hi {{firstName}},

I wanted to follow up on my email from {{daysAgo}} days ago about {{companyName}}.

Since then, we've {{recentProgress}} and remain very interested in partnering with {{firmName}}.

Would you have 15 minutes for a quick call this week?

Best,
{{senderName}}`
      },
      deck_follow_up: {
        subject: `Saw you viewed our deck - any questions?`,
        body: `Hi {{firstName}},

I noticed you viewed our pitch deck {{viewTime}}. Thanks for taking the time!

I saw you spent particular time on {{topSlides}} - would you like me to elaborate on any of those areas?

Happy to schedule a call to walk through our vision in more detail.

Best,
{{senderName}}`
      },
      meeting_request: {
        subject: `30-min intro call - {{companyName}}`,
        body: `Hi {{firstName}},

I'd love to schedule a brief 30-minute intro call to share what we're building at {{companyName}} and explore if there might be a fit with {{firmName}}.

Would any of these times work for you?
- {{option1}}
- {{option2}}
- {{option3}}

Looking forward to connecting.

Best,
{{senderName}}`
      }
    };

    const template = templates[purpose] || templates.initial_outreach;
    
    // Personalize
    const email = {
      subject: template.subject,
      body: template.body,
      personalized: false
    };

    // If AI service available, enhance with context
    if (context.aiEnabled) {
      // Would call AI service here
      email.aiEnhanced = true;
    }

    return email;
  },

  /**
   * Sentiment analysis on investor responses
   */
  analyzeSentiment: function(emailText) {
    const positiveKeywords = ['interested', 'excited', 'love', 'great', 'impressive', 'let\'s talk', 'schedule', 'meeting'];
    const negativeKeywords = ['not a fit', 'pass', 'not interested', 'too early', 'too late', 'outside our thesis'];
    const neutralKeywords = ['review', 'consider', 'team', 'look', 'deck'];

    const text = emailText.toLowerCase();
    let score = 0;
    let signals = [];

    positiveKeywords.forEach(word => {
      if (text.includes(word)) {
        score += 1;
        signals.push({ type: 'positive', word });
      }
    });

    negativeKeywords.forEach(word => {
      if (text.includes(word)) {
        score -= 2;
        signals.push({ type: 'negative', word });
      }
    });

    return {
      score: score,
      sentiment: score > 2 ? 'positive' : score < -1 ? 'negative' : 'neutral',
      signals: signals,
      recommendation: score > 2 ? 'High interest - respond quickly' : 
                     score > 0 ? 'Warm - maintain momentum' : 
                     score < -1 ? 'Likely pass - graceful exit' : 'Unclear - probe for clarity'
    };
  }
};

// ═══════════════════════════════════════════════════════════════
// DATA ROOM & DOCUMENT MANAGEMENT
// ═══════════════════════════════════════════════════════════════

const DataRoom = {
  /**
   * Create data room for investor
   */
  createDataRoom: function(investorId, config = {}) {
    const dataRoom = {
      id: 'DR-' + Date.now(),
      investorId: investorId,
      accessKey: this.generateAccessKey(),
      documents: config.documents || [],
      accessLog: [],
      ndaRequired: config.ndaRequired !== false,
      ndaSigned: false,
      expiresAt: config.expiresAt || null,
      createdAt: new Date().toISOString()
    };

    const dataRooms = DataStore.get('data_rooms') || [];
    dataRooms.push(dataRoom);
    DataStore.set('data_rooms', dataRooms);

    // Update investor
    const investors = DataStore.get('investors') || [];
    const investor = investors.find(i => i.id === investorId);
    if (investor) {
      investor.dataRoomAccess = true;
      investor.dataRoomId = dataRoom.id;
      DataStore.set('investors', investors);
    }

    return dataRoom;
  },

  generateAccessKey: function() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  },

  /**
   * Log document access
   */
  logAccess: function(dataRoomId, documentId, action) {
    const dataRooms = DataStore.get('data_rooms') || [];
    const dataRoom = dataRooms.find(d => d.id === dataRoomId);
    if (!dataRoom) return;

    dataRoom.accessLog.push({
      timestamp: new Date().toISOString(),
      documentId: documentId,
      action: action, // 'view', 'download', 'print'
      ip: null, // Would be populated server-side
      userAgent: navigator.userAgent
    });

    DataStore.set('data_rooms', dataRooms);
  },

  /**
   * Get data room analytics
   */
  getAnalytics: function(dataRoomId) {
    const dataRoom = (DataStore.get('data_rooms') || []).find(d => d.id === dataRoomId);
    if (!dataRoom) return null;

    const investor = (DataStore.get('investors') || []).find(i => i.id === dataRoom.investorId);

    return {
      totalViews: dataRoom.accessLog.filter(a => a.action === 'view').length,
      totalDownloads: dataRoom.accessLog.filter(a => a.action === 'download').length,
      documentsAccessed: [...new Set(dataRoom.accessLog.map(a => a.documentId))].length,
      lastAccess: dataRoom.accessLog.slice(-1)[0]?.timestamp,
      investorName: investor?.firmName,
      ndaStatus: dataRoom.ndaSigned ? 'Signed' : 'Pending'
    };
  }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AutomationEngine, RelationshipIntel, AIFeatures, DataRoom };
}
