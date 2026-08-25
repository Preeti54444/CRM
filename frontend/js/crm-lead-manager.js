/**
 * Lead Management Module - CRM System
 * Handles lead ingestion, deduplication, scoring, status pipeline, and advanced filtering
 * Version: 1.0.0
 */

class LeadManager {
  constructor(firebaseConfig = {}) {
    this.db = firebaseConfig.db || null;
    this.collectionName = 'leads';
    this.activitiesCollection = 'lead_activities';
    
    // Lead Sources Configuration (Section 5.1)
    this.leadSources = {
      WEBSITE_FORM: {
        name: 'Website Form',
        method: 'Webhook / API',
        autoAssignment: 'round-robin',
        priority: 1
      },
      FACEBOOK_ADS: {
        name: 'Facebook Ads',
        method: 'Facebook Lead Ads API',
        autoAssignment: 'geography-product',
        priority: 2
      },
      GOOGLE_ADS: {
        name: 'Google Ads',
        method: 'Google Ads webhook',
        autoAssignment: 'geography-product',
        priority: 2
      },
      WHATSAPP_INCOMING: {
        name: 'WhatsApp Incoming',
        method: 'WhatsApp Business API',
        autoAssignment: 'whatsapp-handler',
        priority: 1
      },
      REFERRAL_WALKIN: {
        name: 'Referral (Walk-in)',
        method: 'Manual entry form',
        autoAssignment: 'assigned-se',
        priority: 3
      },
      SUB_DSA_CONNECTOR: {
        name: 'Sub-DSA / Connector',
        method: 'Connector portal / WhatsApp bot',
        autoAssignment: 'processing-team',
        priority: 2
      },
      PAISA_BAZAAR: {
        name: 'PaisaBazaar / BankBazaar',
        method: 'API / Webhook integration',
        autoAssignment: 'product-geography',
        priority: 2
      },
      INDIA_LENDS: {
        name: 'IndiaLends / MyLoanCare',
        method: 'API / Webhook integration',
        autoAssignment: 'product-geography',
        priority: 2
      },
      BULK_CSV: {
        name: 'Bulk CSV Upload',
        method: 'Admin upload interface',
        autoAssignment: 'manual',
        priority: 3
      },
      IVR_MISSED_CALL: {
        name: 'IVR / Missed Call',
        method: 'Telephony API',
        autoAssignment: 'telecaller-pool',
        priority: 1
      }
    };

    // Lead Status Pipeline (Section 5.4)
    this.statusPipeline = [
      { id: 1, status: 'Fresh Lead', description: 'New lead just entered the system', nextStates: ['Contacted', 'Not Eligible', 'DND'] },
      { id: 2, status: 'Contacted', description: 'Telecaller has spoken to the customer', nextStates: ['Interested', 'Not Interested', 'Future Follow-up'] },
      { id: 3, status: 'Interested', description: 'Customer has expressed interest', nextStates: ['Documents Pending', 'Not Eligible', 'Future Follow-up'] },
      { id: 4, status: 'Not Interested', description: 'Customer declined', nextStates: ['Future Follow-up'] },
      { id: 5, status: 'Not Eligible', description: 'Does not meet basic criteria', nextStates: ['Future Follow-up'] },
      { id: 6, status: 'Documents Pending', description: 'Awaiting document submission', nextStates: ['Documents Received', 'Not Interested'] },
      { id: 7, status: 'Documents Received', description: 'All required documents collected', nextStates: ['Bureau Pull Done', 'Verification'] },
      { id: 8, status: 'Bureau Pull Done', description: 'CIBIL / credit bureau report fetched', nextStates: ['Lender Selected', 'Not Eligible'] },
      { id: 9, status: 'Lender Selected', description: 'Lender(s) identified for case submission', nextStates: ['Bank Login Done'] },
      { id: 10, status: 'Bank Login Done', description: 'Case submitted to lender portal', nextStates: ['Under Process'] },
      { id: 11, status: 'Under Process', description: 'Lender is reviewing the file', nextStates: ['Query', 'Sanctioned', 'Rejected'] },
      { id: 12, status: 'Query', description: 'Lender has raised queries', nextStates: ['Query Resolved'] },
      { id: 13, status: 'Query Resolved', description: 'Responses submitted back to lender', nextStates: ['Under Process'] },
      { id: 14, status: 'Sanctioned', description: 'Loan sanctioned by lender', nextStates: ['Agreement Signed', 'Rejected'] },
      { id: 15, status: 'Agreement Signed', description: 'Customer has signed loan agreement', nextStates: ['Disbursed'] },
      { id: 16, status: 'Disbursed', description: 'Loan amount credited to customer account', nextStates: ['Payout Pending'] },
      { id: 17, status: 'Payout Pending', description: 'Awaiting commission from lender', nextStates: ['Payout Received'] },
      { id: 18, status: 'Payout Received', description: 'Commission received and reconciled', nextStates: ['Closed'] },
      { id: 19, status: 'Rejected', description: 'Lender rejected the case', nextStates: ['Re-routed', 'Future Follow-up'] },
      { id: 20, status: 'Future Follow-up', description: 'To be contacted at a later date', nextStates: ['Fresh Lead'] },
      { id: 21, status: 'DND', description: 'Do Not Disturb - Terminal state', nextStates: [] }
    ];

    // Lead Data Fields (Section 5.3)
    this.requiredFields = [
      'fullName', 'mobile', 'leadSource', 'loanType', 'loanAmount'
    ];

    this.allFields = {
      identity: ['leadId', 'fullName', 'mobile', 'mobileAlternate', 'email', 'panNumber', 'aadhaarNumber'],
      demographics: ['dateOfBirth', 'age', 'gender', 'city', 'pinCode', 'fullAddress', 'state'],
      employment: ['occupationType', 'companyName', 'designation', 'monthlyIncome', 'yearsInCurrentJob'],
      business: ['businessName', 'businessType', 'industry', 'gstNumber', 'udyamRegistration', 'businessVintage', 'annualTurnover', 'monthlyBankCredits'],
      loanRequirement: ['loanType', 'loanAmount', 'loanPurpose', 'tenurePreference', 'existingEmis', 'foir'],
      sourceAssignment: ['leadSource', 'sourceCampaignId', 'assignedEmployee', 'assignedTeam', 'dateCreated', 'createdBy'],
      propertyDetails: ['propertyType', 'propertyLocation', 'estimatedMarketValue', 'ownershipStatus', 'builderName', 'reraNumber'],
      bureau: ['cibilScore', 'cibilDate', 'bureauReportLink', 'dpdStatus', 'activeLoansCount', 'totalOutstanding']
    };

    // Lead Scoring Weights (Section 5.5)
    this.scoringWeights = {
      cibilScore: 0.25,
      loanToIncomeRatio: 0.15,
      leadSourceQuality: 0.15,
      documentReadiness: 0.10,
      responseTime: 0.10,
      geographyMatch: 0.10,
      businessVintage: 0.10,
      productLenderFit: 0.05
    };

    // Source quality ranking (for scoring)
    this.sourceQualityRanking = {
      'Referral (Walk-in)': 100,
      'Website Form': 85,
      'WhatsApp Incoming': 80,
      'Google Ads': 70,
      'Facebook Ads': 65,
      'PaisaBazaar / BankBazaar': 60,
      'Sub-DSA / Connector': 55,
      'IndiaLends / MyLoanCare': 50,
      'Bulk CSV Upload': 40,
      'IVR / Missed Call': 35
    };
  }

  /**
   * Generate unique Lead ID
   */
  generateLeadId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `LEAD-${timestamp}-${random}`.toUpperCase();
  }

  parseLeadDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'number') return new Date(value);

    const raw = String(value).trim();
    const isoMatch = /^\d{4}-\d{2}-\d{2}/.test(raw);
    if (isoMatch) {
      const date = new Date(raw);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const dmyMatch = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(raw);
    if (dmyMatch) {
      const day = Number(dmyMatch[1]);
      const month = Number(dmyMatch[2]);
      const year = Number(dmyMatch[3]);
      const date = new Date(year, month - 1, day);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const fallback = new Date(raw);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  isLeadWithinDays(lead, days = 30) {
    const dateValue = lead.dateCreated || lead.createdAt || lead.timestamp || lead.dateOfEntry || lead.date || lead.entry_timestamp || lead.created_at;
    const leadDate = this.parseLeadDate(dateValue);
    if (!leadDate) return false;
    const ageMs = Date.now() - leadDate.getTime();
    return ageMs >= 0 && ageMs <= days * 24 * 60 * 60 * 1000;
  }

  /**
   * Lead Deduplication Logic (Section 5.2)
   * Three-tier matching: Mobile > PAN > Fuzzy (Name+City+LoanType)
   */
  async checkDuplicates(leadData) {
    if (!this.db) return { isDuplicate: false, duplicates: [] };

    const duplicates = [];

    try {
      // Primary Match: Mobile Number
      if (leadData.mobile) {
        const mobileMatch = await this.db.collection(this.collectionName)
          .where('mobile', '==', leadData.mobile)
          .get();

        const recentMobileLeads = mobileMatch.docs
          .map(doc => ({ ...doc.data(), id: doc.id }))
          .filter(lead => this.isLeadWithinDays(lead, 30));

        if (recentMobileLeads.length > 0) {
          duplicates.push({
            type: 'MOBILE_MATCH',
            priority: 1,
            leads: recentMobileLeads
          });
        }
      }

      // Secondary Match: PAN Number
      if (leadData.panNumber && duplicates.length === 0) {
        const panMatch = await this.db.collection(this.collectionName)
          .where('panNumber', '==', leadData.panNumber)
          .get();

        const recentPanLeads = panMatch.docs
          .map(doc => ({ ...doc.data(), id: doc.id }))
          .filter(lead => this.isLeadWithinDays(lead, 30));

        if (recentPanLeads.length > 0) {
          duplicates.push({
            type: 'PAN_MATCH',
            priority: 2,
            leads: recentPanLeads
          });
        }
      }

      // Tertiary Match: Fuzzy matching on Name + City + LoanType
      if (duplicates.length === 0 && leadData.fullName && leadData.city && leadData.loanType) {
        const fuzzyMatches = await this.db.collection(this.collectionName)
          .where('city', '==', leadData.city)
          .where('loanType', '==', leadData.loanType)
          .get();

        const filtered = fuzzyMatches.docs
          .map(doc => ({ ...doc.data(), id: doc.id }))
          .filter(existingLead => {
            const similarity = this.calculateStringSimilarity(
              leadData.fullName.toLowerCase(),
              existingLead.fullName.toLowerCase()
            );
            return similarity > 0.85 && this.isLeadWithinDays(existingLead, 30);
          });

        if (filtered.length > 0) {
          duplicates.push({
            type: 'FUZZY_MATCH',
            priority: 3,
            similarity: 0.85,
            leads: filtered
          });
        }
      }

      return {
        isDuplicate: duplicates.length > 0,
        duplicates: duplicates,
        recommendedAction: duplicates.length > 0 ? 'REVIEW' : null
      };

    } catch (error) {
      console.error('Error checking duplicates:', error);
      return { isDuplicate: false, duplicates: [], error: error.message };
    }
  }

  /**
   * String similarity calculation using Levenshtein distance
   */
  calculateStringSimilarity(str1, str2) {
    const track = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(0));

    for (let i = 0; i <= str1.length; i++) track[0][i] = i;
    for (let j = 0; j <= str2.length; j++) track[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1,
          track[j - 1][i] + 1,
          track[j - 1][i - 1] + indicator
        );
      }
    }

    const distance = track[str2.length][str1.length];
    const maxLength = Math.max(str1.length, str2.length);
    return 1 - (distance / maxLength);
  }

  /**
   * Create new lead with validation
   */
  async createLead(leadData, userId) {
    // Validate required fields
    for (const field of this.requiredFields) {
      if (!leadData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Check for duplicates
    const duplicateCheck = await this.checkDuplicates(leadData);
    if (duplicateCheck.isDuplicate) {
      return {
        success: false,
        isDuplicate: true,
        duplicates: duplicateCheck.duplicates,
        message: 'Duplicate lead detected. Please review existing leads.'
      };
    }

    // Generate Lead ID if not provided
    if (!leadData.leadId) {
      leadData.leadId = this.generateLeadId();
    }

    // Set default values
    const lead = {
      ...leadData,
      status: 'Fresh Lead',
      leadScore: 0,
      dateCreated: new Date().toISOString(),
      createdBy: userId,
      lastActivity: new Date().toISOString(),
      activities: [],
      documents: [],
      submissions: []
    };

    // Calculate initial lead score
    lead.leadScore = this.calculateLeadScore(lead);

    // Save to backend FIRST - localStorage/Firebase is only for caching
    try {
      if (typeof postToCRMBackendEndpoint === 'function') {
        const backendPayload = {
          lead_name: lead.fullName || lead.name || '',
          company_name: lead.companyName || lead.company || '',
          mobile: lead.mobile || lead.phone || '',
          alternate_mobile: lead.mobileAlternate || '',
          email: lead.email || '',
          company_email: lead.companyEmail || '',
          city: lead.city || '',
          state: lead.state || '',
          product_type: lead.loanType || '',
          funding_amount: lead.loanAmount || 0,
          lead_source: lead.leadSource || '',
          lead_status: lead.status || 'New',
          assigned_to: lead.assignedTo || lead.assignedEmployee || null,
          remarks: lead.remarks || ''
        };
        
        const backendResult = await postToCRMBackendEndpoint('leads', backendPayload, 'POST');
        console.debug('Lead saved to backend:', backendResult);
        
        // Only cache to localStorage/Firebase AFTER successful backend save
        if (this.db) {
          const ref = await this.db.collection(this.collectionName).add(lead);
          return {
            success: true,
            leadId: lead.leadId,
            docId: ref.id,
            lead: lead,
            backendId: backendResult?.id || backendResult?.lead_id
          };
        }
        return { success: true, lead: lead, backendId: backendResult?.id || backendResult?.lead_id };
      } else {
        console.error('Backend save function not available for leads');
        // Fallback to Firebase if backend unavailable
        if (this.db) {
          const ref = await this.db.collection(this.collectionName).add(lead);
          return {
            success: true,
            leadId: lead.leadId,
            docId: ref.id,
            lead: lead,
            warning: 'Saved locally only - backend unavailable'
          };
        }
        return { success: true, lead: lead, warning: 'Saved locally only - backend unavailable' };
      }
    } catch (error) {
      console.error('Lead save failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate Lead Score (Section 5.5)
   * Weighted scoring: 0-100 scale
   */
  calculateLeadScore(lead) {
    let score = 0;

    // 1. CIBIL Score (25%)
    const cibilScore = this.calculateCibilScore(lead.cibilScore);
    score += cibilScore * this.scoringWeights.cibilScore;

    // 2. Loan Amount vs Income Ratio (15%)
    const loanToIncomeScore = this.calculateLoanToIncomeScore(lead.loanAmount, lead.monthlyIncome);
    score += loanToIncomeScore * this.scoringWeights.loanToIncomeRatio;

    // 3. Lead Source Quality (15%)
    const sourceScore = this.calculateSourceQualityScore(lead.leadSource);
    score += sourceScore * this.scoringWeights.leadSourceQuality;

    // 4. Document Readiness (10%)
    const docScore = this.calculateDocumentReadinessScore(lead.documents?.length || 0);
    score += docScore * this.scoringWeights.documentReadiness;

    // 5. Response Time (10%)
    const responseScore = this.calculateResponseTimeScore(lead.lastActivity, lead.dateCreated);
    score += responseScore * this.scoringWeights.responseTime;

    // 6. Geography Match (10%)
    const geoScore = this.calculateGeographyScore(lead.pinCode);
    score += geoScore * this.scoringWeights.geographyMatch;

    // 7. Business Vintage (10%)
    const vintageScore = this.calculateBusinessVintageScore(lead.businessVintage);
    score += vintageScore * this.scoringWeights.businessVintage;

    // 8. Product-Lender Fit (5%)
    const productScore = this.calculateProductLenderFitScore(lead.loanType, lead.loanAmount);
    score += productScore * this.scoringWeights.productLenderFit;

    return Math.round(score);
  }

  calculateCibilScore(cibil) {
    if (!cibil) return 30;
    if (cibil > 750) return 100;
    if (cibil >= 700) return 80;
    if (cibil >= 650) return 50;
    return 20;
  }

  calculateLoanToIncomeScore(loanAmount, monthlyIncome) {
    if (!loanAmount || !monthlyIncome) return 50;
    const ratio = loanAmount / (monthlyIncome * 60); // 60 months tenure
    if (ratio < 10) return 100;
    if (ratio < 20) return 80;
    if (ratio < 30) return 60;
    if (ratio < 40) return 40;
    return 20;
  }

  calculateSourceQualityScore(leadSource) {
    const quality = this.sourceQualityRanking[leadSource] || 50;
    return quality;
  }

  calculateDocumentReadinessScore(docCount) {
    if (docCount >= 5) return 100;
    if (docCount >= 3) return 75;
    if (docCount >= 1) return 50;
    return 25;
  }

  calculateResponseTimeScore(lastActivity, dateCreated) {
    if (!lastActivity) return 30;
    const createdDate = new Date(dateCreated);
    const lastActDate = new Date(lastActivity);
    const hoursSinceCreation = (lastActDate - createdDate) / (1000 * 60 * 60);
    
    if (hoursSinceCreation < 1) return 100; // Responded within 1 hour
    if (hoursSinceCreation < 6) return 80;  // Within 6 hours
    if (hoursSinceCreation < 24) return 60; // Within 24 hours
    if (hoursSinceCreation < 72) return 40; // Within 3 days
    return 20; // More than 3 days
  }

  calculateGeographyScore(pinCode) {
    // TODO: Implement serviceable pin code checking
    // For now, return baseline score
    if (pinCode) return 75;
    return 25;
  }

  calculateBusinessVintageScore(vintage) {
    if (!vintage) return 30;
    if (vintage > 5) return 100;
    if (vintage >= 3) return 70;
    if (vintage >= 1) return 40;
    return 10;
  }

  calculateProductLenderFitScore(loanType, loanAmount) {
    // TODO: Implement actual lender fit calculation based on product catalog
    if (loanType && loanAmount) return 80;
    return 50;
  }

  /**
   * Update lead status with validation
   */
  async updateLeadStatus(leadId, newStatus, reason = '', userId) {
    try {
      // Find the status in pipeline
      const statusObj = this.statusPipeline.find(s => s.status === newStatus);
      if (!statusObj) {
        return { success: false, error: `Invalid status: ${newStatus}` };
      }

      if (this.db) {
        const doc = await this.db.collection(this.collectionName)
          .where('leadId', '==', leadId)
          .limit(1)
          .get();

        if (doc.empty) {
          return { success: false, error: 'Lead not found' };
        }

        const leadDoc = doc.docs[0];
        const currentLead = leadDoc.data();

        // Validate state transition
        const currentStatus = this.statusPipeline.find(s => s.status === currentLead.status);
        if (currentStatus && !currentStatus.nextStates.includes(newStatus)) {
          return {
            success: false,
            error: `Cannot transition from ${currentLead.status} to ${newStatus}`,
            allowedTransitions: currentStatus.nextStates
          };
        }

        // Update status
        const updateData = {
          status: newStatus,
          lastActivity: new Date().toISOString(),
          updatedBy: userId
        };

        if (reason) {
          updateData.statusReason = reason;
        }

        await leadDoc.ref.update(updateData);

        // Log activity
        await this.logActivity(leadId, 'STATUS_CHANGE', `Status changed to ${newStatus}`, userId);

        return { success: true, newStatus: newStatus };
      }

      return { success: true, newStatus: newStatus };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Log activity for lead
   */
  async logActivity(leadId, activityType, description, userId) {
    try {
      const activity = {
        leadId: leadId,
        type: activityType,
        description: description,
        createdBy: userId,
        timestamp: new Date().toISOString()
      };

      if (this.db) {
        await this.db.collection(this.activitiesCollection).add(activity);
      }

      return { success: true };
    } catch (error) {
      console.error('Error logging activity:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get lead with all related data
   */
  async getLead(leadId) {
    try {
      if (!this.db) {
        return { success: false, error: 'Database not configured' };
      }

      const doc = await this.db.collection(this.collectionName)
        .where('leadId', '==', leadId)
        .limit(1)
        .get();

      if (doc.empty) {
        return { success: false, error: 'Lead not found' };
      }

      const lead = { ...doc.docs[0].data(), docId: doc.docs[0].id };

      // Get activities
      const activitiesSnap = await this.db.collection(this.activitiesCollection)
        .where('leadId', '==', leadId)
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();

      lead.activityHistory = activitiesSnap.docs.map(d => d.data());

      return { success: true, lead: lead };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Advanced Search & Filtering (Section 5.6)
   */
  async searchLeads(filters = {}, options = {}) {
    try {
      if (!this.db) {
        return { success: false, error: 'Database not configured', leads: [] };
      }

      let query = this.db.collection(this.collectionName);

      // Apply filters
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          // Multi-select status filter - requires multiple queries
          const promises = filters.status.map(status => 
            this.db.collection(this.collectionName)
              .where('status', '==', status)
              .get()
          );
          const results = await Promise.all(promises);
          const leads = [];
          results.forEach(snap => {
            snap.docs.forEach(doc => leads.push({ ...doc.data(), docId: doc.id }));
          });
          return this.applySecondaryFilters(leads, filters, options);
        } else {
          query = query.where('status', '==', filters.status);
        }
      }

      if (filters.leadSource) {
        query = query.where('leadSource', '==', filters.leadSource);
      }

      if (filters.assignedEmployee) {
        query = query.where('assignedEmployee', '==', filters.assignedEmployee);
      }

      if (filters.loanType) {
        query = query.where('loanType', '==', filters.loanType);
      }

      if (filters.assignedTeam) {
        query = query.where('assignedTeam', '==', filters.assignedTeam);
      }

      // Apply ordering
      const orderBy = options.orderBy || 'dateCreated';
      const orderDirection = options.orderDirection || 'desc';
      query = query.orderBy(orderBy, orderDirection);

      // Apply limit
      const limit = options.limit || 50;
      query = query.limit(limit);

      const snapshot = await query.get();
      let leads = snapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id }));

      // Apply secondary filters
      leads = this.applySecondaryFilters(leads, filters, options);

      // Apply pagination
      const offset = options.offset || 0;
      const paginatedLeads = leads.slice(offset, offset + limit);

      return {
        success: true,
        leads: paginatedLeads,
        total: leads.length,
        offset: offset,
        limit: limit
      };

    } catch (error) {
      console.error('Error searching leads:', error);
      return { success: false, error: error.message, leads: [] };
    }
  }

  /**
   * Apply secondary filters (date range, score ranges, etc.)
   */
  applySecondaryFilters(leads, filters, options) {
    let filtered = [...leads];

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      filtered = filtered.filter(lead => {
        const leadDate = new Date(lead.dateCreated);
        if (filters.dateFrom && leadDate < new Date(filters.dateFrom)) return false;
        if (filters.dateTo && leadDate > new Date(filters.dateTo)) return false;
        return true;
      });
    }

    // Lead score range
    if (filters.scoreMin !== undefined || filters.scoreMax !== undefined) {
      filtered = filtered.filter(lead => {
        if (filters.scoreMin !== undefined && lead.leadScore < filters.scoreMin) return false;
        if (filters.scoreMax !== undefined && lead.leadScore > filters.scoreMax) return false;
        return true;
      });
    }

    // CIBIL score range
    if (filters.cibilMin !== undefined || filters.cibilMax !== undefined) {
      filtered = filtered.filter(lead => {
        if (filters.cibilMin !== undefined && lead.cibilScore < filters.cibilMin) return false;
        if (filters.cibilMax !== undefined && lead.cibilScore > filters.cibilMax) return false;
        return true;
      });
    }

    // Loan amount range
    if (filters.loanAmountMin !== undefined || filters.loanAmountMax !== undefined) {
      filtered = filtered.filter(lead => {
        if (filters.loanAmountMin !== undefined && lead.loanAmount < filters.loanAmountMin) return false;
        if (filters.loanAmountMax !== undefined && lead.loanAmount > filters.loanAmountMax) return false;
        return true;
      });
    }

    // City / Pin code filter
    if (filters.city) {
      filtered = filtered.filter(lead => lead.city?.toLowerCase() === filters.city.toLowerCase());
    }

    if (filters.pinCode) {
      filtered = filtered.filter(lead => lead.pinCode === filters.pinCode);
    }

    // Lender filter
    if (filters.lender) {
      filtered = filtered.filter(lead => {
        return lead.submissions?.some(sub => sub.lender === filters.lender);
      });
    }

    // Last activity date range
    if (filters.lastActivityFrom || filters.lastActivityTo) {
      filtered = filtered.filter(lead => {
        const lastActDate = new Date(lead.lastActivity);
        if (filters.lastActivityFrom && lastActDate < new Date(filters.lastActivityFrom)) return false;
        if (filters.lastActivityTo && lastActDate > new Date(filters.lastActivityTo)) return false;
        return true;
      });
    }

    return filtered;
  }

  /**
   * Natural Language Search
   * Example: "show all Thane BL leads above 20L with GST"
   */
  async naturalLanguageSearch(query) {
    try {
      const filters = this.parseNLQuery(query);
      return await this.searchLeads(filters);
    } catch (error) {
      return { success: false, error: error.message, leads: [] };
    }
  }

  /**
   * Parse natural language query to filters
   */
  parseNLQuery(query) {
    const filters = {};
    const lowerQuery = query.toLowerCase();

    // City matching
    const cities = ['thane', 'mumbai', 'pune', 'bangalore', 'delhi', 'hyderabad', 'gurgaon', 'noida', 'kolkata', 'ahmedabad'];
    cities.forEach(city => {
      if (lowerQuery.includes(city)) {
        filters.city = city.charAt(0).toUpperCase() + city.slice(1);
      }
    });

    // Loan type matching
    const loanTypes = ['bl', 'home loan', 'hl', 'personal loan', 'pl', 'business loan', 'loan against property', 'lap'];
    loanTypes.forEach(type => {
      if (lowerQuery.includes(type)) {
        if (type === 'bl') filters.loanType = 'Business Loan';
        if (type === 'hl' || type === 'home loan') filters.loanType = 'Home Loan';
        if (type === 'pl' || type === 'personal loan') filters.loanType = 'Personal Loan';
        if (type === 'lap' || type === 'loan against property') filters.loanType = 'Loan Against Property';
      }
    });

    // Loan amount parsing (looking for numbers followed by L or words like above, below)
    const loanAmountMatch = query.match(/above\s+(\d+)\s*l|(\d+)\s*l/i);
    if (loanAmountMatch) {
      const amount = parseInt(loanAmountMatch[1] || loanAmountMatch[2]) * 100000; // Convert L to actual number
      if (loanAmountMatch[0].toLowerCase().includes('above')) {
        filters.loanAmountMin = amount;
      } else {
        filters.loanAmountMax = amount;
      }
    }

    // GST/Business indicators
    if (lowerQuery.includes('gst')) {
      filters.hasGST = true;
    }

    return filters;
  }

  /**
   * Get lead statistics
   */
  async getStatistics(filters = {}) {
    try {
      const searchResult = await this.searchLeads(filters, { limit: 1000 });
      if (!searchResult.success) {
        return { success: false, error: searchResult.error };
      }

      const leads = searchResult.leads;

      const stats = {
        totalLeads: leads.length,
        byStatus: {},
        bySource: {},
        byLoanType: {},
        byEmployee: {},
        scoreDistribution: {
          excellent: 0, // 80-100
          good: 0,      // 60-79
          fair: 0,      // 40-59
          poor: 0       // 0-39
        },
        averageScore: 0,
        averageCibil: 0,
        conversionMetrics: {
          freshToContacted: 0,
          contactedToInterested: 0,
          interestedToSanctioned: 0
        }
      };

      let totalScore = 0;
      let totalCibil = 0;
      let cibilCount = 0;

      leads.forEach(lead => {
        // Status distribution
        stats.byStatus[lead.status] = (stats.byStatus[lead.status] || 0) + 1;

        // Source distribution
        stats.bySource[lead.leadSource] = (stats.bySource[lead.leadSource] || 0) + 1;

        // Loan type distribution
        stats.byLoanType[lead.loanType] = (stats.byLoanType[lead.loanType] || 0) + 1;

        // Employee assignment
        if (lead.assignedEmployee) {
          stats.byEmployee[lead.assignedEmployee] = (stats.byEmployee[lead.assignedEmployee] || 0) + 1;
        }

        // Score distribution
        if (lead.leadScore >= 80) stats.scoreDistribution.excellent++;
        else if (lead.leadScore >= 60) stats.scoreDistribution.good++;
        else if (lead.leadScore >= 40) stats.scoreDistribution.fair++;
        else stats.scoreDistribution.poor++;

        totalScore += lead.leadScore;

        if (lead.cibilScore) {
          totalCibil += lead.cibilScore;
          cibilCount++;
        }
      });

      stats.averageScore = leads.length > 0 ? Math.round(totalScore / leads.length) : 0;
      stats.averageCibil = cibilCount > 0 ? Math.round(totalCibil / cibilCount) : 0;

      return { success: true, statistics: stats };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Bulk CSV upload
   */
  async bulkUploadCSV(csvData, userId, assignmentRules = {}) {
    const results = {
      total: 0,
      successful: 0,
      failed: 0,
      duplicates: 0,
      errors: []
    };

    try {
      const rows = csvData.split('\n').slice(1); // Skip header

      for (const row of rows) {
        if (!row.trim()) continue;

        results.total++;

        try {
          const [name, mobile, email, city, loanType, loanAmount, source] = row.split(',').map(v => v.trim());

          const leadData = {
            fullName: name,
            mobile: mobile,
            email: email,
            city: city,
            loanType: loanType,
            loanAmount: parseInt(loanAmount),
            leadSource: source || 'Bulk CSV Upload',
            dateCreated: new Date().toISOString()
          };

          const result = await this.createLead(leadData, userId);

          if (result.success) {
            results.successful++;
          } else if (result.isDuplicate) {
            results.duplicates++;
          } else {
            results.failed++;
            results.errors.push({ row: results.total, error: result.error || 'Unknown error' });
          }

        } catch (error) {
          results.failed++;
          results.errors.push({ row: results.total, error: error.message });
        }
      }

      return { success: true, results: results };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Merge leads
   */
  async mergeLeads(primaryLeadId, secondaryLeadId, userId) {
    try {
      if (!this.db) {
        return { success: false, error: 'Database not configured' };
      }

      const primaryDoc = await this.db.collection(this.collectionName)
        .where('leadId', '==', primaryLeadId)
        .limit(1)
        .get();

      const secondaryDoc = await this.db.collection(this.collectionName)
        .where('leadId', '==', secondaryLeadId)
        .limit(1)
        .get();

      if (primaryDoc.empty || secondaryDoc.empty) {
        return { success: false, error: 'One or both leads not found' };
      }

      const primaryLead = primaryDoc.docs[0].data();
      const secondaryLead = secondaryDoc.docs[0].data();

      // Merge activities
      const mergedActivities = [
        ...(primaryLead.activities || []),
        ...(secondaryLead.activities || [])
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Merge documents
      const mergedDocuments = [
        ...new Map(
          [...(primaryLead.documents || []), ...(secondaryLead.documents || [])].map(d => [d.id, d])
        ).values()
      ];

      // Update primary lead
      const mergeData = {
        activities: mergedActivities,
        documents: mergedDocuments,
        mergedWith: [secondaryLeadId],
        lastActivity: new Date().toISOString(),
        updatedBy: userId
      };

      // Fill any missing data from secondary
      Object.keys(secondaryLead).forEach(key => {
        if (!primaryLead[key] && secondaryLead[key]) {
          mergeData[key] = secondaryLead[key];
        }
      });

      await primaryDoc.docs[0].ref.update(mergeData);

      // Mark secondary as merged
      await secondaryDoc.docs[0].ref.update({
        status: 'Merged',
        mergedInto: primaryLeadId,
        lastActivity: new Date().toISOString(),
        updatedBy: userId
      });

      // Log activity
      await this.logActivity(primaryLeadId, 'MERGE', `Merged with lead ${secondaryLeadId}`, userId);

      return { success: true, mergedLeadId: primaryLeadId };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get lead pipeline summary
   */
  async getPipelineSummary(filters = {}) {
    try {
      const searchResult = await this.searchLeads(filters, { limit: 1000 });
      if (!searchResult.success) {
        return { success: false, error: searchResult.error };
      }

      const leads = searchResult.leads;
      const pipeline = {};

      this.statusPipeline.forEach(status => {
        pipeline[status.status] = {
          count: 0,
          percentage: 0,
          totalValue: 0
        };
      });

      leads.forEach(lead => {
        if (pipeline[lead.status]) {
          pipeline[lead.status].count++;
          pipeline[lead.status].totalValue += lead.loanAmount || 0;
        }
      });

      // Calculate percentages
      const total = leads.length;
      Object.keys(pipeline).forEach(status => {
        pipeline[status].percentage = total > 0 ? ((pipeline[status].count / total) * 100).toFixed(2) : 0;
      });

      return { success: true, pipeline: pipeline, totalLeads: total };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Export for use in CRM system
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LeadManager;
}
