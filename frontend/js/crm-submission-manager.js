/**
 * Loan Submission Manager - CRM System
 * Handles parallel loan submissions to multiple lenders
 * Manages submission status, tracking, and lender queries
 * Version: 1.0.0
 */

class SubmissionManager {
  constructor(firebaseConfig = {}) {
    this.db = firebaseConfig.db || null;
    this.collectionName = 'loan_submissions';
    this.queriesCollection = 'lender_queries';
    
    // Submission Status Pipeline
    this.submissionStatuses = [
      { id: 1, status: 'Draft', description: 'Submission being prepared', color: '#94a3b8' },
      { id: 2, status: 'Submitted', description: 'Case submitted to lender', color: '#3b82f6' },
      { id: 3, status: 'Under Review', description: 'Lender reviewing the application', color: '#f59e0b' },
      { id: 4, status: 'Query Raised', description: 'Lender has raised queries', color: '#ef4444' },
      { id: 5, status: 'Query Resolved', description: 'Queries resolved and resubmitted', color: '#8b5cf6' },
      { id: 6, status: 'Approved', description: 'Loan approved by lender', color: '#10b981' },
      { id: 7, status: 'Sanctioned', description: 'Loan sanctioned with terms', color: '#059669' },
      { id: 8, status: 'Rejected', description: 'Loan rejected by lender', color: '#dc2626' },
      { id: 9, status: 'Disbursed', description: 'Loan amount disbursed', color: '#065f46' },
      { id: 10, status: 'Withdrawn', description: 'Application withdrawn', color: '#6b7280' }
    ];

    // Query Status Pipeline
    this.queryStatuses = [
      { id: 1, status: 'Open', description: 'Query raised, awaiting response', color: '#ef4444' },
      { id: 2, status: 'In Progress', description: 'Working on query resolution', color: '#f59e0b' },
      { id: 3, status: 'Response Submitted', description: 'Response sent to lender', color: '#3b82f6' },
      { id: 4, status: 'Resolved', description: 'Query resolved by lender', color: '#10b981' }
    ];

    // Query Priority Levels
    this.queryPriorities = {
      URGENT: { label: 'Urgent', slaHours: 24, color: '#dc2626' },
      NORMAL: { label: 'Normal', slaHours: 48, color: '#f59e0b' }
    };
  }

  /**
   * Generate unique Submission ID
   */
  generateSubmissionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `SUB-${timestamp}-${random}`;
  }

  /**
   * Generate unique Query ID
   */
  generateQueryId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `QRY-${timestamp}-${random}`;
  }

  /**
   * Create new loan submission
   */
  async createSubmission(submissionData, userId) {
    try {
      const submission = {
        submissionId: this.generateSubmissionId(),
        leadId: submissionData.leadId,
        lenderId: submissionData.lenderId,
        lenderName: submissionData.lenderName,
        lenderLogo: submissionData.lenderLogo || null,
        
        // Loan details
        loanType: submissionData.loanType,
        appliedAmount: submissionData.appliedAmount,
        sanctionedAmount: submissionData.sanctionedAmount || 0,
        tenure: submissionData.tenure || 0,
        interestRate: submissionData.interestRate || 0,
        
        // Status tracking
        status: 'Draft',
        currentStage: 'Draft',
        stageHistory: [],
        
        // Dates
        dateSubmitted: submissionData.dateSubmitted || null,
        dateLastUpdated: new Date().toISOString(),
        dateStageEntered: new Date().toISOString(),
        
        // Documents
        documents: submissionData.documents || [],
        
        // Queries
        queries: [],
        
        // Metadata
        createdBy: userId,
        assignedTo: submissionData.assignedTo || null,
        notes: submissionData.notes || ''
      };

      if (this.db) {
        const ref = await this.db.collection(this.collectionName).add(submission);
        return {
          success: true,
          submissionId: submission.submissionId,
          docId: ref.id,
          submission: submission
        };
      }

      return { success: true, submission: submission };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update submission status
   */
  async updateSubmissionStatus(submissionId, newStatus, notes = '', userId) {
    try {
      if (!this.db) {
        return { success: false, error: 'Database not configured' };
      }

      const doc = await this.db.collection(this.collectionName)
        .where('submissionId', '==', submissionId)
        .limit(1)
        .get();

      if (doc.empty) {
        return { success: false, error: 'Submission not found' };
      }

      const submissionDoc = doc.docs[0];
      const currentSubmission = submissionDoc.data();

      // Update status
      const updateData = {
        status: newStatus,
        currentStage: newStatus,
        dateLastUpdated: new Date().toISOString(),
        updatedBy: userId
      };

      // Add to stage history
      const stageHistory = currentSubmission.stageHistory || [];
      stageHistory.push({
        stage: newStatus,
        dateEntered: new Date().toISOString(),
        notes: notes,
        enteredBy: userId
      });
      updateData.stageHistory = stageHistory;

      // Update stage entry date
      updateData.dateStageEntered = new Date().toISOString();

      if (notes) {
        updateData.notes = notes;
      }

      await submissionDoc.ref.update(updateData);

      return { success: true, newStatus: newStatus };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get submissions for a lead
   */
  async getLeadSubmissions(leadId) {
    try {
      if (!this.db) {
        return { success: false, error: 'Database not configured', submissions: [] };
      }

      const snapshot = await this.db.collection(this.collectionName)
        .where('leadId', '==', leadId)
        .orderBy('dateSubmitted', 'desc')
        .get();

      const submissions = snapshot.docs.map(doc => ({
        ...doc.data(),
        docId: doc.id
      }));

      return { success: true, submissions: submissions };

    } catch (error) {
      return { success: false, error: error.message, submissions: [] };
    }
  }

  /**
   * Calculate days in current stage
   */
  calculateDaysInStage(dateStageEntered) {
    if (!dateStageEntered) return 0;
    const stageDate = new Date(dateStageEntered);
    const now = new Date();
    const diffTime = Math.abs(now - stageDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Create lender query
   */
  async createQuery(queryData, userId) {
    try {
      const priorityConfig = this.queryPriorities[queryData.priority] || this.queryPriorities.NORMAL;
      
      const query = {
        queryId: this.generateQueryId(),
        submissionId: queryData.submissionId,
        leadId: queryData.leadId,
        lenderId: queryData.lenderId,
        lenderName: queryData.lenderName,
        
        // Query details
        description: queryData.description,
        requiredDocuments: queryData.requiredDocuments || [],
        requiredInformation: queryData.requiredInformation || [],
        
        // Status and priority
        status: 'Open',
        priority: queryData.priority,
        
        // SLA tracking
        dateRaised: new Date().toISOString(),
        slaDeadline: new Date(Date.now() + priorityConfig.slaHours * 60 * 60 * 1000).toISOString(),
        dateResolved: null,
        
        // Assignment
        assignedHandler: queryData.assignedHandler || null,
        
        // Documents linked to query
        linkedDocuments: queryData.linkedDocuments || [],
        
        // Communication
        responses: [],
        
        // Metadata
        createdBy: userId,
        raisedBy: queryData.raisedBy || 'Lender'
      };

      if (this.db) {
        const ref = await this.db.collection(this.queriesCollection).add(query);
        
        // Update submission to reflect query
        await this.addQueryToSubmission(queryData.submissionId, query.queryId);
        
        return {
          success: true,
          queryId: query.queryId,
          docId: ref.id,
          query: query
        };
      }

      return { success: true, query: query };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Add query reference to submission
   */
  async addQueryToSubmission(submissionId, queryId) {
    try {
      if (!this.db) return { success: true };

      const doc = await this.db.collection(this.collectionName)
        .where('submissionId', '==', submissionId)
        .limit(1)
        .get();

      if (doc.empty) return { success: false, error: 'Submission not found' };

      const submissionDoc = doc.docs[0];
      const currentQueries = submissionDoc.data().queries || [];
      currentQueries.push(queryId);

      await submissionDoc.ref.update({
        queries: currentQueries,
        status: 'Query Raised',
        dateLastUpdated: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update query status
   */
  async updateQueryStatus(queryId, newStatus, responseText = '', userId) {
    try {
      if (!this.db) {
        return { success: false, error: 'Database not configured' };
      }

      const doc = await this.db.collection(this.queriesCollection)
        .where('queryId', '==', queryId)
        .limit(1)
        .get();

      if (doc.empty) {
        return { success: false, error: 'Query not found' };
      }

      const queryDoc = doc.docs[0];
      const currentQuery = queryDoc.data();

      const updateData = {
        status: newStatus,
        updatedBy: userId,
        lastUpdated: new Date().toISOString()
      };

      // Add response if provided
      if (responseText) {
        const responses = currentQuery.responses || [];
        responses.push({
          text: responseText,
          respondedBy: userId,
          respondedAt: new Date().toISOString()
        });
        updateData.responses = responses;
      }

      // Set resolved date if status is Resolved
      if (newStatus === 'Resolved') {
        updateData.dateResolved = new Date().toISOString();
      }

      await queryDoc.ref.update(updateData);

      // Check if all queries for submission are resolved
      await this.checkSubmissionQueriesResolved(currentQuery.submissionId);

      return { success: true, newStatus: newStatus };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if all queries for a submission are resolved
   */
  async checkSubmissionQueriesResolved(submissionId) {
    try {
      if (!this.db) return;

      const queriesSnapshot = await this.db.collection(this.queriesCollection)
        .where('submissionId', '==', submissionId)
        .get();

      const allResolved = queriesSnapshot.docs.every(doc => 
        doc.data().status === 'Resolved'
      );

      if (allResolved && queriesSnapshot.docs.length > 0) {
        // Update submission status back to Under Review
        await this.updateSubmissionStatus(submissionId, 'Under Review', 'All queries resolved', 'system');
      }

    } catch (error) {
      console.error('Error checking submission queries:', error);
    }
  }

  /**
   * Get queries for a submission
   */
  async getSubmissionQueries(submissionId) {
    try {
      if (!this.db) {
        return { success: false, error: 'Database not configured', queries: [] };
      }

      const snapshot = await this.db.collection(this.queriesCollection)
        .where('submissionId', '==', submissionId)
        .orderBy('dateRaised', 'desc')
        .get();

      const queries = snapshot.docs.map(doc => ({
        ...doc.data(),
        docId: doc.id
      }));

      return { success: true, queries: queries };

    } catch (error) {
      return { success: false, error: error.message, queries: [] };
    }
  }

  /**
   * Get queries for a lead (across all submissions)
   */
  async getLeadQueries(leadId) {
    try {
      if (!this.db) {
        return { success: false, error: 'Database not configured', queries: [] };
      }

      const snapshot = await this.db.collection(this.queriesCollection)
        .where('leadId', '==', leadId)
        .orderBy('dateRaised', 'desc')
        .get();

      const queries = snapshot.docs.map(doc => ({
        ...doc.data(),
        docId: doc.id
      }));

      return { success: true, queries: queries };

    } catch (error) {
      return { success: false, error: error.message, queries: [] };
    }
  }

  /**
   * Link document to query
   */
  async linkDocumentToQuery(queryId, documentData, userId) {
    try {
      if (!this.db) {
        return { success: false, error: 'Database not configured' };
      }

      const doc = await this.db.collection(this.queriesCollection)
        .where('queryId', '==', queryId)
        .limit(1)
        .get();

      if (doc.empty) {
        return { success: false, error: 'Query not found' };
      }

      const queryDoc = doc.docs[0];
      const currentLinkedDocs = queryDoc.data().linkedDocuments || [];
      
      currentLinkedDocs.push({
        documentId: documentData.documentId,
        documentName: documentData.documentName,
        documentUrl: documentData.documentUrl,
        uploadedAt: new Date().toISOString(),
        uploadedBy: userId
      });

      await queryDoc.ref.update({
        linkedDocuments: currentLinkedDocs
      });

      return { success: true };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get SLA status for a query
   */
  getQuerySLAStatus(query) {
    if (!query.slaDeadline || query.status === 'Resolved') {
      return { status: 'completed', remainingHours: 0 };
    }

    const now = new Date();
    const deadline = new Date(query.slaDeadline);
    const diffMs = deadline - now;
    const remainingHours = Math.ceil(diffMs / (1000 * 60 * 60));

    if (remainingHours <= 0) {
      return { status: 'overdue', remainingHours: Math.abs(remainingHours) };
    } else if (remainingHours <= 12) {
      return { status: 'critical', remainingHours: remainingHours };
    } else if (remainingHours <= 24) {
      return { status: 'warning', remainingHours: remainingHours };
    } else {
      return { status: 'on-track', remainingHours: remainingHours };
    }
  }

  /**
   * Get submission statistics for a lead
   */
  async getLeadSubmissionStats(leadId) {
    try {
      const result = await this.getLeadSubmissions(leadId);
      if (!result.success) {
        return { success: false, error: result.error };
      }

      const submissions = result.submissions;
      
      const stats = {
        total: submissions.length,
        byStatus: {},
        totalApplied: submissions.reduce((sum, s) => sum + (s.appliedAmount || 0), 0),
        totalSanctioned: submissions.reduce((sum, s) => sum + (s.sanctionedAmount || 0), 0),
        activeQueries: 0
      };

      submissions.forEach(sub => {
        stats.byStatus[sub.status] = (stats.byStatus[sub.status] || 0) + 1;
        stats.activeQueries += (sub.queries || []).length;
      });

      return { success: true, statistics: stats };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SubmissionManager;
}
