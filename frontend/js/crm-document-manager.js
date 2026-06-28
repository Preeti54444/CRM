/**
 * Document Management Module - CRM System
 * Handles document upload, validation, OCR, auto-tagging, and storage
 * Version: 1.0.0
 */

class DocumentManager {
  constructor(firebaseConfig = {}) {
    this.db = firebaseConfig.db || null;
    this.storage = firebaseConfig.storage || null;
    this.collectionName = 'documents';
    this.logsCollection = 'document_logs';

    // Document Categories (Section 8.1)
    this.documentCategories = {
      KYC: {
        name: 'KYC',
        documents: [
          { type: 'Aadhaar Card', code: 'AADHAAR', validity: 'lifetime', requiresAddressVerification: true },
          { type: 'PAN Card', code: 'PAN', validity: 'lifetime' },
          { type: 'Voter ID', code: 'VOTER_ID', validity: 'lifetime' },
          { type: 'Passport', code: 'PASSPORT', validity: 'lifetime' },
          { type: 'Driving License', code: 'DL', validity: 'lifetime' }
        ],
        mandatory: true,
        validityRules: {
          PAN: 'lifetime',
          Aadhaar: 'verify address currency'
        }
      },
      INCOME_SALARIED: {
        name: 'Income (Salaried)',
        documents: [
          { type: 'Salary Slips (Last 3 Months)', code: 'SALARY_SLIP', validity: '3 months' },
          { type: 'Form 16', code: 'FORM_16', validity: '1 year' },
          { type: 'Bank Statements (6 Months)', code: 'BANK_STATEMENT_6M', validity: '3 months' }
        ],
        mandatory: true,
        minRequired: 2,
        validityRules: {
          salarySlips: 'must be within last 3 months',
          bankStatements: 'within last 3 months'
        }
      },
      INCOME_SELF_EMPLOYED: {
        name: 'Income (Self-Employed)',
        documents: [
          { type: 'ITR (Last 2-3 Years)', code: 'ITR', validity: '1 year' },
          { type: 'GST Returns', code: 'GST_RETURNS', validity: '1 quarter' },
          { type: 'Bank Statements (12 Months)', code: 'BANK_STATEMENT_12M', validity: '3 months' },
          { type: 'P&L and Balance Sheet', code: 'P_AND_L_BS', validity: '1 year' }
        ],
        mandatory: true,
        minRequired: 3,
        validityRules: {
          ITR: 'latest assessment year',
          GST: 'current quarter',
          bankStatements: 'within 3 months'
        }
      },
      BUSINESS_PROOF: {
        name: 'Business Proof',
        documents: [
          { type: 'GST Certificate', code: 'GST_CERT', validity: 'lifetime' },
          { type: 'Udyam Registration', code: 'UDYAM', validity: 'lifetime', apiVerification: true },
          { type: 'Shop Act License', code: 'SHOP_LICENSE', validity: '1 year' },
          { type: 'MOA/AOA', code: 'MOA_AOA', validity: 'lifetime' },
          { type: 'Partnership Deed', code: 'PARTNERSHIP_DEED', validity: 'lifetime' }
        ],
        mandatory: false,
        validityRules: {
          Udyam: 'active status verified via API'
        }
      },
      PROPERTY: {
        name: 'Property (LAP/HL)',
        documents: [
          { type: 'Property Documents', code: 'PROPERTY_DOCS', validity: 'lifetime' },
          { type: 'Title Deed', code: 'TITLE_DEED', validity: 'lifetime' },
          { type: 'Valuation Report', code: 'VALUATION_REPORT', validity: '6 months' },
          { type: 'Approved Plan', code: 'APPROVED_PLAN', validity: 'lifetime' },
          { type: 'Tax Receipts', code: 'TAX_RECEIPTS', validity: '1 year' },
          { type: 'RERA Certificate', code: 'RERA_CERT', validity: 'lifetime' }
        ],
        mandatory: false,
        applicableFor: ['Home Loan', 'Loan Against Property'],
        validityRules: {
          Valuation: 'within 6 months'
        }
      },
      LOAN_SPECIFIC: {
        name: 'Loan-Specific',
        documents: [
          { type: 'Proforma Invoice (Machinery)', code: 'PROFORMA_INVOICE', validity: '3 months', applicableFor: ['Business Loan'] },
          { type: 'Admission Letter (Education)', code: 'ADMISSION_LETTER', validity: '1 year', applicableFor: ['Education Loan'] },
          { type: 'Gold Valuation (Gold Loan)', code: 'GOLD_VALUATION', validity: '1 month', applicableFor: ['Gold Loan'] }
        ],
        mandatory: false,
        validityRules: {
          variesByProduct: 'true'
        }
      },
      PHOTOGRAPHS: {
        name: 'Photographs',
        documents: [
          { type: 'Applicant Photo', code: 'APPLICANT_PHOTO', validity: 'lifetime', imageOnly: true },
          { type: 'Business Premises Photo', code: 'BUSINESS_PHOTO', validity: 'lifetime', imageOnly: true },
          { type: 'Property Photo', code: 'PROPERTY_PHOTO', validity: 'lifetime', imageOnly: true }
        ],
        mandatory: true,
        validityRules: {
          photos: 'recent photos only'
        }
      },
      LENDER_GENERATED: {
        name: 'Lender-Generated',
        documents: [
          { type: 'Sanction Letter', code: 'SANCTION_LETTER', validity: 'lifetime', systemGenerated: true },
          { type: 'Agreement Copy', code: 'LOAN_AGREEMENT', validity: 'lifetime', systemGenerated: true },
          { type: 'KFS Document', code: 'KFS', validity: 'lifetime', systemGenerated: true },
          { type: 'Repayment Schedule', code: 'REPAYMENT_SCHEDULE', validity: 'lifetime', systemGenerated: true }
        ],
        mandatory: false,
        userUploadDisabled: true,
        validityRules: {
          systemStored: 'not customer-uploaded'
        }
      }
    };

    // OCR Field Extraction Templates
    this.ocrTemplates = {
      AADHAAR: ['name', 'dob', 'gender', 'address', 'aadhaarNumber'],
      PAN: ['name', 'panNumber', 'fatherName', 'dob'],
      PASSPORT: ['name', 'passportNumber', 'dob', 'gender', 'address', 'issueDate', 'expiryDate'],
      FORM_16: ['name', 'panNumber', 'financialYear', 'totalIncome', 'tdsDeducted'],
      SALARY_SLIP: ['employeeName', 'employeeId', 'month', 'basicSalary', 'grossSalary', 'deductions'],
      BANK_STATEMENT: ['accountHolder', 'accountNumber', 'bankName', 'accountType', 'balance'],
      GST_RETURNS: ['gstNumber', 'businessName', 'businessType', 'turnover', 'period'],
      TITLE_DEED: ['propertyAddress', 'ownerName', 'area', 'value', 'registrationDate'],
      VALUATION_REPORT: ['propertyAddress', 'valuationAmount', 'valuationDate', 'valuationBy']
    };

    // File validation rules
    this.fileValidationRules = {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
      allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'webp']
    };
  }

  /**
   * Upload document with validation
   */
  async uploadDocument(leadId, file, documentType, userId, metadata = {}) {
    try {
      // Validate file
      const fileValidation = this.validateFile(file);
      if (!fileValidation.valid) {
        return { success: false, error: fileValidation.error };
      }

      // Get document category and type info
      const docInfo = this.getDocumentInfo(documentType);
      if (!docInfo) {
        return { success: false, error: `Unknown document type: ${documentType}` };
      }

      // Check if user can upload this type of document
      if (docInfo.userUploadDisabled) {
        return { success: false, error: 'System-generated documents cannot be uploaded manually' };
      }

      // Generate document ID
      const documentId = this.generateDocumentId();

      // Prepare document metadata
      const documentData = {
        documentId: documentId,
        leadId: leadId,
        category: docInfo.category,
        documentType: documentType,
        documentCode: docInfo.code,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        uploadedBy: userId,
        uploadDate: new Date().toISOString(),
        status: 'pending', // pending ocr -> validated -> rejected
        ocrStatus: 'pending',
        metadata: metadata,
        versions: [
          {
            version: 1,
            uploadDate: new Date().toISOString(),
            uploadedBy: userId,
            fileUrl: null // Will be set after upload to storage
          }
        ]
      };

      // Upload file to Firebase Storage
      if (this.storage) {
        const storagePath = `documents/${leadId}/${documentId}/${file.name}`;
        // File upload would happen here (implementation depends on storage setup)
        // const uploadTask = await this.storage.ref(storagePath).put(file);
        // documentData.versions[0].fileUrl = await uploadTask.ref.getDownloadURL();
        documentData.fileUrl = `gs://bucket/${storagePath}`;
      }

      // Save document metadata to Firestore
      let result = { success: true, documentId: documentId };
      if (this.db) {
        const ref = await this.db.collection(this.collectionName).add(documentData);
        result.docId = ref.id;
      }

      // Trigger OCR processing asynchronously
      this.processDocumentOCR(documentId, documentData, file);

      // Log activity
      await this.logDocumentActivity(leadId, 'DOCUMENT_UPLOADED', `${documentType} uploaded`, userId);

      return { success: true, documentId: documentId, document: documentData };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate uploaded file
   */
  validateFile(file) {
    if (!file) {
      return { valid: false, error: 'No file provided' };
    }

    if (file.size > this.fileValidationRules.maxSize) {
      return { valid: false, error: `File size exceeds ${this.fileValidationRules.maxSize / (1024 * 1024)}MB limit` };
    }

    if (!this.fileValidationRules.allowedTypes.includes(file.type)) {
      return { valid: false, error: `File type ${file.type} not allowed` };
    }

    const extension = file.name.split('.').pop().toLowerCase();
    if (!this.fileValidationRules.allowedExtensions.includes(extension)) {
      return { valid: false, error: `File extension .${extension} not allowed` };
    }

    return { valid: true, error: null };
  }

  /**
   * Get document information from all categories
   */
  getDocumentInfo(documentType) {
    for (const [categoryKey, category] of Object.entries(this.documentCategories)) {
      const doc = category.documents.find(d => d.type === documentType || d.code === documentType);
      if (doc) {
        return {
          category: categoryKey,
          categoryName: category.name,
          ...doc,
          userUploadDisabled: category.userUploadDisabled || false
        };
      }
    }
    return null;
  }

  /**
   * Generate unique document ID
   */
  generateDocumentId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `DOC-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Process document with OCR (AI-powered auto-tagging and field extraction)
   */
  async processDocumentOCR(documentId, documentData, file) {
    try {
      // In production, this would call Google Vision API or similar
      // For now, simulate OCR processing
      setTimeout(async () => {
        const ocrResult = await this.extractFieldsFromDocument(documentData.documentCode, file);

        // Update document with OCR results
        const updateData = {
          ocrStatus: 'completed',
          status: 'validated',
          extractedFields: ocrResult.fields,
          ocrConfidence: ocrResult.confidence,
          processedDate: new Date().toISOString()
        };

        if (this.db) {
          const doc = await this.db.collection(this.collectionName)
            .where('documentId', '==', documentId)
            .limit(1)
            .get();

          if (!doc.empty) {
            await doc.docs[0].ref.update(updateData);
          }
        }

        // Check document validity
        this.checkDocumentValidity(documentData.documentCode, ocrResult.fields);

      }, 1000); // Simulate processing delay

    } catch (error) {
      console.error('Error processing OCR:', error);
    }
  }

  /**
   * Extract fields from document using OCR template
   */
  async extractFieldsFromDocument(documentCode, file) {
    const template = this.ocrTemplates[documentCode];
    if (!template) {
      return { fields: {}, confidence: 0 };
    }

    // Simulate OCR extraction - in production would use actual OCR API
    const mockExtraction = {};
    template.forEach(field => {
      mockExtraction[field] = null; // In production, actual extracted values
    });

    return {
      fields: mockExtraction,
      confidence: 0.85, // Mock confidence score
      processedAt: new Date().toISOString()
    };
  }

  /**
   * Check document validity based on validity rules
   */
  checkDocumentValidity(documentCode, extractedFields) {
    const docInfo = this.getDocumentInfo(documentCode);
    if (!docInfo) return { isValid: false, reason: 'Unknown document' };

    const validityInfo = docInfo.validity;
    const result = {
      isValid: true,
      expiresOn: null,
      daysUntilExpiry: null,
      warnings: []
    };

    // Parse expiry based on validity rules
    if (validityInfo === 'lifetime') {
      result.isValid = true;
    } else if (validityInfo === '3 months') {
      const uploadDate = new Date();
      const expiryDate = new Date(uploadDate.getTime() + (3 * 30 * 24 * 60 * 60 * 1000));
      result.expiresOn = expiryDate;
      result.daysUntilExpiry = Math.floor((expiryDate - new Date()) / (24 * 60 * 60 * 1000));

      if (result.daysUntilExpiry < 0) {
        result.isValid = false;
        result.warnings.push('Document has expired');
      } else if (result.daysUntilExpiry < 7) {
        result.warnings.push(`Document expires in ${result.daysUntilExpiry} days`);
      }
    } else if (validityInfo === '6 months') {
      const uploadDate = new Date();
      const expiryDate = new Date(uploadDate.getTime() + (6 * 30 * 24 * 60 * 60 * 1000));
      result.expiresOn = expiryDate;
      result.daysUntilExpiry = Math.floor((expiryDate - new Date()) / (24 * 60 * 60 * 1000));

      if (result.daysUntilExpiry < 0) {
        result.isValid = false;
      }
    } else if (validityInfo === '1 year') {
      const uploadDate = new Date();
      const expiryDate = new Date(uploadDate.getFullYear() + 1, uploadDate.getMonth(), uploadDate.getDate());
      result.expiresOn = expiryDate;
      result.daysUntilExpiry = Math.floor((expiryDate - new Date()) / (24 * 60 * 60 * 1000));

      if (result.daysUntilExpiry < 0) {
        result.isValid = false;
      } else if (result.daysUntilExpiry < 30) {
        result.warnings.push('Document expires soon');
      }
    }

    return result;
  }

  /**
   * Get document completeness status for a lead
   */
  async getDocumentCompletenessStatus(leadId, loanType) {
    try {
      // Get all documents for the lead
      const docsSnap = await this.db.collection(this.collectionName)
        .where('leadId', '==', leadId)
        .get();

      const documents = docsSnap.docs.map(doc => doc.data());

      // Determine required documents based on loan type and customer profile
      const requiredDocs = this.getRequiredDocuments(loanType);

      const status = {
        totalRequired: requiredDocs.length,
        uploaded: 0,
        pending: [],
        expired: [],
        completionPercentage: 0,
        canProceedToLender: false
      };

      // Check which required documents are uploaded and valid
      const uploadedDocTypes = new Set(documents.map(d => d.documentCode));

      requiredDocs.forEach(docType => {
        const doc = documents.find(d => d.documentCode === docType);

        if (!doc) {
          status.pending.push(docType);
        } else if (!doc.validity || doc.validity.isValid === false) {
          status.expired.push(docType);
        } else {
          status.uploaded++;
        }
      });

      status.completionPercentage = Math.round((status.uploaded / status.totalRequired) * 100);
      status.canProceedToLender = status.pending.length === 0 && status.expired.length === 0;

      return { success: true, status: status };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get required documents for a loan type
   */
  getRequiredDocuments(loanType, occupationType = null) {
    const required = [];

    // KYC documents always required
    required.push('AADHAAR', 'PAN', 'APPLICANT_PHOTO');

    // Income documents based on occupation
    if (occupationType === 'Salaried') {
      required.push('SALARY_SLIP', 'FORM_16', 'BANK_STATEMENT_6M');
    } else if (occupationType === 'Self-Employed') {
      required.push('ITR', 'GST_RETURNS', 'BANK_STATEMENT_12M');
    }

    // Loan-specific documents
    if (loanType === 'Home Loan' || loanType === 'Loan Against Property') {
      required.push('TITLE_DEED', 'PROPERTY_DOCS', 'VALUATION_REPORT');
    } else if (loanType === 'Business Loan') {
      required.push('GST_CERT', 'UDYAM', 'PROFORMA_INVOICE');
    } else if (loanType === 'Education Loan') {
      required.push('ADMISSION_LETTER');
    }

    return required;
  }

  /**
   * Get document by ID
   */
  async getDocument(documentId) {
    try {
      const doc = await this.db.collection(this.collectionName)
        .where('documentId', '==', documentId)
        .limit(1)
        .get();

      if (doc.empty) {
        return { success: false, error: 'Document not found' };
      }

      return { success: true, document: { ...doc.docs[0].data(), docId: doc.docs[0].id } };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all documents for a lead
   */
  async getLeadDocuments(leadId, filters = {}) {
    try {
      let query = this.db.collection(this.collectionName)
        .where('leadId', '==', leadId);

      if (filters.category) {
        query = query.where('category', '==', filters.category);
      }

      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      const docs = await query.orderBy('uploadDate', 'desc').get();

      const documents = docs.docs.map(doc => ({
        ...doc.data(),
        docId: doc.id
      }));

      return { success: true, documents: documents, count: documents.length };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete document (soft delete)
   */
  async deleteDocument(documentId, userId) {
    try {
      if (this.db) {
        const doc = await this.db.collection(this.collectionName)
          .where('documentId', '==', documentId)
          .limit(1)
          .get();

        if (doc.empty) {
          return { success: false, error: 'Document not found' };
        }

        await doc.docs[0].ref.update({
          deleted: true,
          deletedBy: userId,
          deletedDate: new Date().toISOString()
        });

        await this.logDocumentActivity(doc.docs[0].data().leadId, 'DOCUMENT_DELETED', `Document deleted: ${documentId}`, userId);
      }

      return { success: true };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Reject document with reason
   */
  async rejectDocument(documentId, reason, userId) {
    try {
      if (this.db) {
        const doc = await this.db.collection(this.collectionName)
          .where('documentId', '==', documentId)
          .limit(1)
          .get();

        if (doc.empty) {
          return { success: false, error: 'Document not found' };
        }

        const docData = doc.docs[0].data();
        await doc.docs[0].ref.update({
          status: 'rejected',
          rejectionReason: reason,
          rejectedBy: userId,
          rejectedDate: new Date().toISOString()
        });

        await this.logDocumentActivity(docData.leadId, 'DOCUMENT_REJECTED', reason, userId);
      }

      return { success: true };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Approve document
   */
  async approveDocument(documentId, userId) {
    try {
      if (this.db) {
        const doc = await this.db.collection(this.collectionName)
          .where('documentId', '==', documentId)
          .limit(1)
          .get();

        if (doc.empty) {
          return { success: false, error: 'Document not found' };
        }

        const docData = doc.docs[0].data();
        await doc.docs[0].ref.update({
          status: 'approved',
          approvedBy: userId,
          approvedDate: new Date().toISOString()
        });

        await this.logDocumentActivity(docData.leadId, 'DOCUMENT_APPROVED', 'Document approved', userId);
      }

      return { success: true };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Re-upload document (new version)
   */
  async reuploadDocument(documentId, file, userId) {
    try {
      // Get existing document
      const docRef = await this.db.collection(this.collectionName)
        .where('documentId', '==', documentId)
        .limit(1)
        .get();

      if (docRef.empty) {
        return { success: false, error: 'Document not found' };
      }

      const existingDoc = docRef.docs[0].data();
      const newVersion = (existingDoc.versions?.length || 0) + 1;

      // Validate new file
      const fileValidation = this.validateFile(file);
      if (!fileValidation.valid) {
        return { success: false, error: fileValidation.error };
      }

      // Add new version
      const updatedVersions = existingDoc.versions || [];
      updatedVersions.push({
        version: newVersion,
        uploadDate: new Date().toISOString(),
        uploadedBy: userId,
        fileUrl: `gs://bucket/documents/${existingDoc.leadId}/${documentId}/v${newVersion}/${file.name}`
      });

      await docRef.docs[0].ref.update({
        versions: updatedVersions,
        currentVersion: newVersion,
        ocrStatus: 'pending',
        status: 'pending'
      });

      // Trigger OCR for new version
      this.processDocumentOCR(documentId, existingDoc, file);

      await this.logDocumentActivity(existingDoc.leadId, 'DOCUMENT_REUPLOADED', `Document re-uploaded - Version ${newVersion}`, userId);

      return { success: true, version: newVersion };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Bulk download documents as ZIP
   */
  async bulkDownloadDocuments(leadId) {
    try {
      const docsResult = await this.getLeadDocuments(leadId, { status: 'approved' });

      if (!docsResult.success) {
        return { success: false, error: docsResult.error };
      }

      // In production, would create actual ZIP file
      // For now, return list of documents to be zipped
      const documentList = docsResult.documents.map(doc => ({
        documentId: doc.documentId,
        name: doc.fileName,
        type: doc.documentType,
        size: doc.fileSize,
        url: doc.fileUrl
      }));

      return {
        success: true,
        documents: documentList,
        totalSize: documentList.reduce((sum, d) => sum + d.size, 0),
        zipFileName: `lead-${leadId}-documents.zip`
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Log document activity
   */
  async logDocumentActivity(leadId, activityType, description, userId) {
    try {
      const activity = {
        leadId: leadId,
        type: activityType,
        description: description,
        createdBy: userId,
        timestamp: new Date().toISOString()
      };

      if (this.db) {
        await this.db.collection(this.logsCollection).add(activity);
      }

      return { success: true };
    } catch (error) {
      console.error('Error logging activity:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get document statistics for a lead
   */
  async getDocumentStatistics(leadId) {
    try {
      const docsResult = await this.getLeadDocuments(leadId);

      if (!docsResult.success) {
        return { success: false, error: docsResult.error };
      }

      const documents = docsResult.documents;
      const stats = {
        total: documents.length,
        byStatus: {},
        byCategory: {},
        totalSize: 0,
        uploadedDate: null,
        lastUploadDate: null
      };

      documents.forEach(doc => {
        // By status
        stats.byStatus[doc.status] = (stats.byStatus[doc.status] || 0) + 1;

        // By category
        stats.byCategory[doc.category] = (stats.byCategory[doc.category] || 0) + 1;

        // Total size
        stats.totalSize += doc.fileSize || 0;

        // Dates
        if (!stats.uploadedDate || new Date(doc.uploadDate) < new Date(stats.uploadedDate)) {
          stats.uploadedDate = doc.uploadDate;
        }
        if (!stats.lastUploadDate || new Date(doc.uploadDate) > new Date(stats.lastUploadDate)) {
          stats.lastUploadDate = doc.uploadDate;
        }
      });

      return { success: true, statistics: stats };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all document categories
   */
  getDocumentCategories() {
    return this.documentCategories;
  }

  /**
   * Search documents
   */
  async searchDocuments(filters = {}) {
    try {
      let query = this.db.collection(this.collectionName);

      if (filters.leadId) {
        query = query.where('leadId', '==', filters.leadId);
      }

      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      if (filters.category) {
        query = query.where('category', '==', filters.category);
      }

      if (filters.documentCode) {
        query = query.where('documentCode', '==', filters.documentCode);
      }

      const docs = await query.orderBy('uploadDate', 'desc').limit(100).get();

      const documents = docs.docs.map(doc => ({
        ...doc.data(),
        docId: doc.id
      }));

      return { success: true, documents: documents };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Export for use in CRM system
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DocumentManager;
}

// Browser global export
if (typeof window !== 'undefined') {
  window.DocumentManager = DocumentManager;
}
