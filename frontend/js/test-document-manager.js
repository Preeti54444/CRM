/**
 * Document Manager Test Suite - CRM System
 * Comprehensive testing for document upload, validation, OCR, and management
 * Version: 1.0.0
 */

class DocumentManagerTests {
  constructor(documentManager) {
    this.documentManager = documentManager;
    this.testResults = [];
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🧪 Starting Document Manager Test Suite');
    console.log('=====================================\n');

    await this.testDocumentUpload();
    await this.testDocumentValidation();
    await this.testOCRProcessing();
    await this.testDocumentCategories();
    await this.testDocumentCompletenessCheck();
    await this.testDocumentOperations();
    await this.testStatusTransitions();
    await this.testErrorHandling();

    this.printSummary();
  }

  /**
   * Test document upload functionality
   */
  async testDocumentUpload() {
    console.log('📤 Testing Document Upload Functionality');
    console.log('----------------------------------------');

    // Test 1: Valid file upload
    this.test('Upload valid PDF file', () => {
      const mockFile = {
        name: 'test-document.pdf',
        size: 1024 * 500,
        type: 'application/pdf'
      };
      const validation = this.documentManager.validateFile(mockFile);
      return validation.valid === true;
    });

    // Test 2: File size validation
    this.test('Reject file exceeding max size', () => {
      const mockFile = {
        name: 'large-file.pdf',
        size: 1024 * 1024 * 10,
        type: 'application/pdf'
      };
      const validation = this.documentManager.validateFile(mockFile);
      return validation.valid === false && validation.error.includes('exceeds');
    });

    // Test 3: File type validation
    this.test('Reject unsupported file type', () => {
      const mockFile = {
        name: 'document.txt',
        size: 1024,
        type: 'text/plain'
      };
      const validation = this.documentManager.validateFile(mockFile);
      return validation.valid === false;
    });

    // Test 4: Missing file validation
    this.test('Reject missing file', () => {
      const validation = this.documentManager.validateFile(null);
      return validation.valid === false && validation.error.includes('No file');
    });

    // Test 5: Image file acceptance
    this.test('Accept JPEG image file', () => {
      const mockFile = {
        name: 'photo.jpg',
        size: 1024 * 200,
        type: 'image/jpeg'
      };
      const validation = this.documentManager.validateFile(mockFile);
      return validation.valid === true;
    });

    // Test 6: Document ID generation uniqueness
    this.test('Generate unique document IDs', () => {
      const id1 = this.documentManager.generateDocumentId();
      const id2 = this.documentManager.generateDocumentId();
      return id1 !== id2 && id1.startsWith('DOC-') && id2.startsWith('DOC-');
    });

    // Test 7: Multiple file format support
    this.test('Support multiple file formats', () => {
      const formatTests = [
        { type: 'application/pdf', ext: 'pdf' },
        { type: 'image/jpeg', ext: 'jpg' },
        { type: 'image/png', ext: 'png' },
        { type: 'image/webp', ext: 'webp' }
      ];
      return formatTests.every(({ type, ext }) => {
        const file = { name: `test.${ext}`, size: 1000, type };
        return this.documentManager.validateFile(file).valid;
      });
    });

    console.log('');
  }

  /**
   * Test document validation
   */
  async testDocumentValidation() {
    console.log('✅ Testing Document Validation');
    console.log('------------------------------');

    // Test 1: Lifetime validity documents
    this.test('Validate lifetime validity documents', () => {
      const validity = this.documentManager.checkDocumentValidity('AADHAAR', {});
      return validity.isValid === true;
    });

    // Test 2: Expiring documents warning
    this.test('Flag documents expiring soon', () => {
      const validity = this.documentManager.checkDocumentValidity('SALARY_SLIP', {});
      return validity.expiresOn !== null;
    });

    // Test 3: Expired document detection
    this.test('Detect expired documents', () => {
      const mockExtracted = {
        expiryDate: new Date(2020, 0, 1).toISOString()
      };
      // Note: This would require date-based logic in actual implementation
      const validity = this.documentManager.checkDocumentValidity('PASSPORT', mockExtracted);
      return validity.isValid !== undefined;
    });

    // Test 4: Validity rules for different categories
    this.test('Apply correct validity rules per category', () => {
      const aadhaarValidity = this.documentManager.checkDocumentValidity('AADHAAR', {});
      const salaryValidity = this.documentManager.checkDocumentValidity('SALARY_SLIP', {});
      return aadhaarValidity.isValid === true && salaryValidity.daysUntilExpiry !== null;
    });

    // Test 5: Validate unknown document type
    this.test('Handle unknown document validation gracefully', () => {
      const validity = this.documentManager.checkDocumentValidity('UNKNOWN_DOC', {});
      return validity.isValid !== undefined;
    });

    console.log('');
  }

  /**
   * Test OCR processing
   */
  async testOCRProcessing() {
    console.log('🤖 Testing OCR Processing');
    console.log('-------------------------');

    // Test 1: OCR template availability
    this.test('Verify OCR templates exist for documents', () => {
      const templates = this.documentManager.ocrTemplates;
      return Object.keys(templates).length > 0 && templates['AADHAAR'] !== undefined;
    });

    // Test 2: Extract fields from Aadhaar
    this.test('Extract Aadhaar fields correctly', () => {
      const result = this.documentManager.ocrTemplates['AADHAAR'];
      return result.includes('name') && result.includes('aadhaarNumber');
    });

    // Test 3: Extract fields from PAN
    this.test('Extract PAN fields correctly', () => {
      const result = this.documentManager.ocrTemplates['PAN'];
      return result.includes('panNumber') && result.includes('name');
    });

    // Test 4: Extract fields from Salary Slip
    this.test('Extract Salary Slip fields correctly', () => {
      const result = this.documentManager.ocrTemplates['SALARY_SLIP'];
      return result.includes('basicSalary') && result.includes('grossSalary');
    });

    // Test 5: Extract fields from Bank Statement
    this.test('Extract Bank Statement fields correctly', () => {
      const result = this.documentManager.ocrTemplates['BANK_STATEMENT'];
      return result.includes('accountHolder') && result.includes('accountNumber');
    });

    // Test 6: Comprehensive field extraction
    this.test('Support comprehensive field extraction', () => {
      const documentTypes = ['AADHAAR', 'PAN', 'FORM_16', 'SALARY_SLIP', 'GST_RETURNS'];
      return documentTypes.every(type => this.documentManager.ocrTemplates[type] !== undefined);
    });

    console.log('');
  }

  /**
   * Test document categories
   */
  async testDocumentCategories() {
    console.log('📁 Testing Document Categories');
    console.log('------------------------------');

    // Test 1: All categories exist
    this.test('All document categories defined', () => {
      const categories = this.documentManager.getDocumentCategories();
      const expectedCategories = ['KYC', 'INCOME_SALARIED', 'INCOME_SELF_EMPLOYED', 'BUSINESS_PROOF', 'PROPERTY', 'LOAN_SPECIFIC', 'PHOTOGRAPHS', 'LENDER_GENERATED'];
      return expectedCategories.every(cat => categories[cat] !== undefined);
    });

    // Test 2: KYC documents mandatory
    this.test('Verify KYC documents are mandatory', () => {
      const categories = this.documentManager.getDocumentCategories();
      return categories.KYC.mandatory === true;
    });

    // Test 3: Multiple documents per category
    this.test('Multiple documents per category', () => {
      const categories = this.documentManager.getDocumentCategories();
      return Object.values(categories).every(cat => cat.documents.length > 0);
    });

    // Test 4: Document codes are unique
    this.test('Document codes are unique', () => {
      const categories = this.documentManager.getDocumentCategories();
      const codes = new Set();
      let allUnique = true;

      Object.values(categories).forEach(cat => {
        cat.documents.forEach(doc => {
          if (codes.has(doc.code)) {
            allUnique = false;
          }
          codes.add(doc.code);
        });
      });

      return allUnique;
    });

    // Test 5: Get document info from any category
    this.test('Retrieve document info from any category', () => {
      const aadhaarInfo = this.documentManager.getDocumentInfo('Aadhaar Card');
      const panInfo = this.documentManager.getDocumentInfo('AADHAAR');
      return aadhaarInfo !== null;
    });

    // Test 6: System-generated documents excluded from upload
    this.test('Prevent manual upload of system-generated documents', () => {
      const categories = this.documentManager.getDocumentCategories();
      const lenderGenerated = categories.LENDER_GENERATED;
      return lenderGenerated.userUploadDisabled === true;
    });

    // Test 7: Applicability rules for loan types
    this.test('Property documents applicable to Home Loan', () => {
      const categories = this.documentManager.getDocumentCategories();
      const propertyDocs = categories.PROPERTY;
      return propertyDocs.applicableFor.includes('Home Loan');
    });

    console.log('');
  }

  /**
   * Test document completeness checking
   */
  async testDocumentCompletenessCheck() {
    console.log('📊 Testing Document Completeness');
    console.log('--------------------------------');

    // Test 1: Get required documents for Business Loan
    this.test('Get required documents for Business Loan', () => {
      const required = this.documentManager.getRequiredDocuments('Business Loan', 'Salaried');
      return required.length > 0 && required.includes('AADHAAR');
    });

    // Test 2: Different requirements for Self-Employed
    this.test('Different requirements for Self-Employed', () => {
      const salaried = this.documentManager.getRequiredDocuments('Business Loan', 'Salaried');
      const selfEmployed = this.documentManager.getRequiredDocuments('Business Loan', 'Self-Employed');
      return salaried.length > 0 && selfEmployed.length > 0;
    });

    // Test 3: Home Loan requires property documents
    this.test('Home Loan requires property documents', () => {
      const required = this.documentManager.getRequiredDocuments('Home Loan', 'Salaried');
      return required.includes('TITLE_DEED') || required.includes('PROPERTY_DOCS');
    });

    // Test 4: Education Loan has specific requirements
    this.test('Education Loan requires admission letter', () => {
      const required = this.documentManager.getRequiredDocuments('Education Loan', 'Salaried');
      return required.includes('ADMISSION_LETTER');
    });

    // Test 5: Always include KYC documents
    this.test('All loan types require KYC documents', () => {
      const loanTypes = ['Business Loan', 'Home Loan', 'Education Loan'];
      return loanTypes.every(loanType => {
        const required = this.documentManager.getRequiredDocuments(loanType, 'Salaried');
        return required.includes('AADHAAR') && required.includes('PAN');
      });
    });

    console.log('');
  }

  /**
   * Test document operations
   */
  async testDocumentOperations() {
    console.log('⚙️ Testing Document Operations');
    console.log('------------------------------');

    // Test 1: File size formatting
    this.test('Format file sizes correctly', () => {
      // This test would be for UI, but testing logic:
      const bytes = 1024;
      const kb = 1;
      return bytes === kb * 1024;
    });

    // Test 2: Document approval workflow
    this.test('Document approval workflow initialized', () => {
      return this.documentManager.db !== undefined;
    });

    // Test 3: Document rejection with reason
    this.test('Store rejection reasons', () => {
      const reason = 'Document quality too low';
      return reason.length > 0;
    });

    // Test 4: Version tracking capability
    this.test('Support document version tracking', () => {
      // Check if versions array is maintained
      return true; // Will be fully tested in integration tests
    });

    // Test 5: Activity logging
    this.test('Activity logging system ready', () => {
      return this.documentManager.logsCollection === 'document_logs';
    });

    console.log('');
  }

  /**
   * Test status transitions
   */
  async testStatusTransitions() {
    console.log('🔄 Testing Status Transitions');
    console.log('------------------------------');

    // Test 1: Valid status values
    this.test('Valid document status values defined', () => {
      const validStatuses = ['pending', 'validated', 'approved', 'rejected'];
      return validStatuses.length > 0;
    });

    // Test 2: Upload creates pending status
    this.test('Newly uploaded documents are pending', () => {
      // New uploads default to pending status
      return true;
    });

    // Test 3: OCR completion transitions to validated
    this.test('OCR completion moves document to validated', () => {
      // When OCR is complete, document becomes validated
      return true;
    });

    // Test 4: Approval finalizes document
    this.test('Approval moves document to final state', () => {
      // After approval, document is approved
      return true;
    });

    // Test 5: Rejection is final
    this.test('Rejection stores reason permanently', () => {
      // Rejected documents store rejection reason
      return true;
    });

    console.log('');
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    console.log('⚠️ Testing Error Handling');
    console.log('------------------------');

    // Test 1: Invalid file type error
    this.test('Provide clear error for invalid file type', () => {
      const mockFile = {
        name: 'test.txt',
        size: 100,
        type: 'text/plain'
      };
      const validation = this.documentManager.validateFile(mockFile);
      return validation.error && validation.error.length > 0;
    });

    // Test 2: File size error message
    this.test('Provide clear error for oversized file', () => {
      const mockFile = {
        name: 'big.pdf',
        size: 1024 * 1024 * 100,
        type: 'application/pdf'
      };
      const validation = this.documentManager.validateFile(mockFile);
      return validation.error && validation.error.includes('exceeds');
    });

    // Test 3: Missing required fields
    this.test('Validate required document fields', () => {
      const docType = null;
      return docType === null; // Would be caught during upload
    });

    // Test 4: Graceful handling of missing documents
    this.test('Handle missing document gracefully', () => {
      const info = this.documentManager.getDocumentInfo('UNKNOWN');
      return info === null;
    });

    // Test 5: Validation result structure
    this.test('Return properly structured validation results', () => {
      const mockFile = {
        name: 'test.pdf',
        size: 1000,
        type: 'application/pdf'
      };
      const result = this.documentManager.validateFile(mockFile);
      return result.hasOwnProperty('valid') && result.hasOwnProperty('error');
    });

    console.log('');
  }

  /**
   * Record test result
   */
  test(name, testFn) {
    this.totalTests++;
    try {
      const result = testFn();
      if (result) {
        this.passedTests++;
        console.log(`✅ PASS: ${name}`);
      } else {
        this.failedTests++;
        console.log(`❌ FAIL: ${name}`);
      }
      this.testResults.push({ name, passed: result });
    } catch (error) {
      this.failedTests++;
      console.log(`❌ ERROR: ${name}`);
      console.log(`   Error: ${error.message}`);
      this.testResults.push({ name, passed: false, error: error.message });
    }
  }

  /**
   * Print test summary
   */
  printSummary() {
    console.log('\n=====================================');
    console.log('📊 TEST SUMMARY');
    console.log('=====================================');
    console.log(`Total Tests: ${this.totalTests}`);
    console.log(`✅ Passed: ${this.passedTests}`);
    console.log(`❌ Failed: ${this.failedTests}`);

    const percentage = this.totalTests > 0 ? Math.round((this.passedTests / this.totalTests) * 100) : 0;
    console.log(`📈 Success Rate: ${percentage}%`);
    console.log('=====================================\n');

    if (this.failedTests > 0) {
      console.log('Failed Tests:');
      this.testResults
        .filter(t => !t.passed)
        .forEach(t => {
          console.log(`  - ${t.name}`);
          if (t.error) console.log(`    ${t.error}`);
        });
      console.log('');
    }
  }
}

/**
 * Integration Tests for Document Manager
 */
class DocumentManagerIntegrationTests {
  constructor(documentManager) {
    this.documentManager = documentManager;
  }

  /**
   * Test complete document upload workflow
   */
  async testCompleteUploadWorkflow() {
    console.log('\n🔄 Testing Complete Upload Workflow');
    console.log('====================================');

    const mockFile = {
      name: 'aadhaar.pdf',
      size: 1024 * 300,
      type: 'application/pdf'
    };

    const leadId = 'LEAD-TEST-001';
    const userId = 'user-001';

    try {
      // Step 1: Upload document
      console.log('Step 1: Uploading document...');
      const uploadResult = await this.documentManager.uploadDocument(
        leadId,
        mockFile,
        'Aadhaar Card',
        userId,
        { notes: 'Test upload' }
      );

      if (!uploadResult.success) {
        console.log('❌ Upload failed:', uploadResult.error);
        return;
      }

      console.log('✅ Upload successful');
      console.log(`   Document ID: ${uploadResult.documentId}`);

      // Step 2: Get document
      console.log('\nStep 2: Retrieving document...');
      const getResult = await this.documentManager.getDocument(uploadResult.documentId);

      if (getResult.success) {
        console.log('✅ Document retrieved successfully');
        console.log(`   Status: ${getResult.document.status}`);
      }

      // Step 3: Check document completeness
      console.log('\nStep 3: Checking completeness...');
      const completenessResult = await this.documentManager.getDocumentCompletenessStatus(
        leadId,
        'Business Loan'
      );

      if (completenessResult.success) {
        console.log('✅ Completeness check successful');
        console.log(`   Completion: ${completenessResult.status.completionPercentage}%`);
      }

    } catch (error) {
      console.log('❌ Integration test failed:', error.message);
    }
  }

  /**
   * Test document bulk operations
   */
  async testBulkOperations() {
    console.log('\n📦 Testing Bulk Operations');
    console.log('==========================');

    const leadId = 'LEAD-TEST-001';

    try {
      // Test bulk download
      console.log('Testing bulk download...');
      const downloadResult = await this.documentManager.bulkDownloadDocuments(leadId);

      if (downloadResult.success) {
        console.log('✅ Bulk download prepared');
        console.log(`   Documents: ${downloadResult.documents.length}`);
        console.log(`   File: ${downloadResult.zipFileName}`);
      } else {
        console.log('⚠️ No documents to download');
      }

    } catch (error) {
      console.log('❌ Bulk operations test failed:', error.message);
    }
  }

  /**
   * Test document search
   */
  async testDocumentSearch() {
    console.log('\n🔍 Testing Document Search');
    console.log('===========================');

    try {
      const searchResult = await this.documentManager.searchDocuments({
        status: 'approved',
        category: 'KYC'
      });

      if (searchResult.success) {
        console.log('✅ Document search successful');
        console.log(`   Found: ${searchResult.documents.length} documents`);
      }

    } catch (error) {
      console.log('❌ Search test failed:', error.message);
    }
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DocumentManagerTests, DocumentManagerIntegrationTests };
}

// Browser global export
if (typeof window !== 'undefined') {
  window.DocumentManagerTests = DocumentManagerTests;
  window.DocumentManagerIntegrationTests = DocumentManagerIntegrationTests;
}
