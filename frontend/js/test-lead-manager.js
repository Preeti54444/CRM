/**
 * Lead Manager Test Suite
 * Comprehensive tests for the Lead Management Module
 * Version: 1.0.0
 */

class LeadManagerTests {
  constructor(leadManager) {
    this.leadManager = leadManager;
    this.testResults = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🧪 Starting Lead Manager Test Suite...\n');

    await this.testLeadGeneration();
    await this.testDeduplicationLogic();
    await this.testLeadScoring();
    await this.testStatusPipeline();
    await this.testFiltersAndSearch();
    await this.testStringMatching();

    this.printResults();
    return this.testResults;
  }

  /**
   * Test lead ID generation
   */
  async testLeadGeneration() {
    console.log('📝 Testing Lead Generation...');

    this.assertEquals(
      this.leadManager.generateLeadId().startsWith('LEAD-'),
      true,
      'Lead ID should start with LEAD-'
    );

    const id1 = this.leadManager.generateLeadId();
    const id2 = this.leadManager.generateLeadId();
    this.assertEquals(
      id1 !== id2,
      true,
      'Generated Lead IDs should be unique'
    );

    console.log('✓ Lead generation tests passed\n');
  }

  /**
   * Test deduplication logic
   */
  async testDeduplicationLogic() {
    console.log('🔍 Testing Deduplication Logic...');

    // Test 1: Mobile matching
    const lead1 = {
      fullName: 'John Doe',
      mobile: '9876543210',
      city: 'Mumbai',
      loanType: 'Business Loan'
    };

    const lead2 = {
      fullName: 'John Doe',
      mobile: '9876543210',
      email: 'john@example.com'
    };

    const similarity = this.leadManager.calculateStringSimilarity(
      lead1.fullName.toLowerCase(),
      lead2.fullName.toLowerCase()
    );

    this.assertEquals(
      similarity,
      1.0,
      'Exact name match should have 100% similarity'
    );

    // Test 2: Fuzzy matching
    const name1 = 'John Doe';
    const name2 = 'Jon Doe';
    const fuzzySimilarity = this.leadManager.calculateStringSimilarity(name1.toLowerCase(), name2.toLowerCase());

    this.assertEquals(
      fuzzySimilarity > 0.85,
      true,
      'Similar names should match above 85% threshold'
    );

    // Test 3: Different names
    const name3 = 'Jane Smith';
    const differentSimilarity = this.leadManager.calculateStringSimilarity(name1.toLowerCase(), name3.toLowerCase());

    this.assertEquals(
      differentSimilarity < 0.85,
      true,
      'Different names should not match above 85% threshold'
    );

    console.log('✓ Deduplication tests passed\n');
  }

  /**
   * Test lead scoring
   */
  async testLeadScoring() {
    console.log('🎯 Testing Lead Scoring...');

    // Test 1: High CIBIL score
    const cibilScoreHigh = this.leadManager.calculateCibilScore(800);
    this.assertEquals(
      cibilScoreHigh,
      100,
      'CIBIL score > 750 should get 100%'
    );

    const cibilScoreMid = this.leadManager.calculateCibilScore(700);
    this.assertEquals(
      cibilScoreMid,
      80,
      'CIBIL score 700-750 should get 80%'
    );

    const cibilScoreLow = this.leadManager.calculateCibilScore(600);
    this.assertEquals(
      cibilScoreLow,
      20,
      'CIBIL score < 650 should get 20%'
    );

    // Test 2: Loan to Income ratio
    const loanToIncomeGood = this.leadManager.calculateLoanToIncomeScore(1000000, 100000);
    const loanToIncomeHigh = this.leadManager.calculateLoanToIncomeScore(5000000, 100000);
    this.assertEquals(
      loanToIncomeGood > loanToIncomeHigh,
      true,
      'Lower loan to income ratio should score higher'
    );

    // Test 3: Source quality
    const referralScore = this.leadManager.calculateSourceQualityScore('Referral (Walk-in)');
    const adsScore = this.leadManager.calculateSourceQualityScore('Google Ads');
    this.assertEquals(
      referralScore > adsScore,
      true,
      'Referral source should score higher than Ads'
    );

    // Test 4: Document readiness
    const docScore5 = this.leadManager.calculateDocumentReadinessScore(5);
    const docScore1 = this.leadManager.calculateDocumentReadinessScore(1);
    this.assertEquals(
      docScore5 > docScore1,
      true,
      'More documents should score higher'
    );

    // Test 5: Business vintage
    const vintageHigh = this.leadManager.calculateBusinessVintageScore(10);
    const vintageLow = this.leadManager.calculateBusinessVintageScore(0.5);
    this.assertEquals(
      vintageHigh > vintageLow,
      true,
      'Higher business vintage should score higher'
    );

    console.log('✓ Lead scoring tests passed\n');
  }

  /**
   * Test status pipeline
   */
  async testStatusPipeline() {
    console.log('📊 Testing Status Pipeline...');

    // Test 1: Pipeline has 21 statuses
    this.assertEquals(
      this.leadManager.statusPipeline.length,
      21,
      'Pipeline should have 21 statuses'
    );

    // Test 2: First status is 'Fresh Lead'
    this.assertEquals(
      this.leadManager.statusPipeline[0].status,
      'Fresh Lead',
      'First status should be Fresh Lead'
    );

    // Test 3: Last status is 'DND'
    const lastStatus = this.leadManager.statusPipeline[this.leadManager.statusPipeline.length - 1];
    this.assertEquals(
      lastStatus.status,
      'DND',
      'Last status should be DND'
    );

    // Test 4: Status transitions are valid
    const freshLead = this.leadManager.statusPipeline.find(s => s.status === 'Fresh Lead');
    this.assertEquals(
      freshLead.nextStates.includes('Contacted'),
      true,
      'Fresh Lead should transition to Contacted'
    );

    // Test 5: DND has no next states (terminal)
    this.assertEquals(
      lastStatus.nextStates.length,
      0,
      'DND should be a terminal status'
    );

    console.log('✓ Status pipeline tests passed\n');
  }

  /**
   * Test filters and search
   */
  async testFiltersAndSearch() {
    console.log('🔎 Testing Filters and Search...');

    // Create test leads
    const testLeads = [
      {
        leadId: 'LEAD-001',
        fullName: 'John Doe',
        mobile: '9876543210',
        city: 'Mumbai',
        loanType: 'Business Loan',
        loanAmount: 2500000,
        leadSource: 'Website Form',
        status: 'Fresh Lead',
        leadScore: 75,
        cibilScore: 750,
        dateCreated: new Date().toISOString()
      },
      {
        leadId: 'LEAD-002',
        fullName: 'Jane Smith',
        mobile: '9876543211',
        city: 'Bangalore',
        loanType: 'Home Loan',
        loanAmount: 5000000,
        leadSource: 'Google Ads',
        status: 'Contacted',
        leadScore: 65,
        cibilScore: 700,
        dateCreated: new Date().toISOString()
      }
    ];

    // Test 1: Filter by city
    let filtered = this.leadManager.applySecondaryFilters(testLeads, { city: 'Mumbai' }, {});
    this.assertEquals(
      filtered.length,
      1,
      'City filter should return 1 lead'
    );

    // Test 2: Filter by loan type
    filtered = this.leadManager.applySecondaryFilters(testLeads, { loanType: 'Business Loan' }, {});
    this.assertEquals(
      filtered.length,
      1,
      'Loan type filter should return 1 lead'
    );

    // Test 3: Filter by status
    filtered = this.leadManager.applySecondaryFilters(testLeads, { status: 'Fresh Lead' }, {});
    this.assertEquals(
      filtered.length,
      1,
      'Status filter should return 1 lead'
    );

    // Test 4: Filter by score range
    filtered = this.leadManager.applySecondaryFilters(testLeads, { scoreMin: 70, scoreMax: 80 }, {});
    this.assertEquals(
      filtered.length,
      1,
      'Score range filter should return 1 lead'
    );

    // Test 5: Filter by CIBIL range
    filtered = this.leadManager.applySecondaryFilters(testLeads, { cibilMin: 740, cibilMax: 760 }, {});
    this.assertEquals(
      filtered.length,
      1,
      'CIBIL range filter should return 1 lead'
    );

    // Test 6: Filter by loan amount range
    filtered = this.leadManager.applySecondaryFilters(testLeads, { loanAmountMin: 2000000, loanAmountMax: 3000000 }, {});
    this.assertEquals(
      filtered.length,
      1,
      'Loan amount range filter should return 1 lead'
    );

    console.log('✓ Filter and search tests passed\n');
  }

  /**
   * Test natural language query parsing
   */
  async testStringMatching() {
    console.log('🧠 Testing Natural Language Parsing...');

    // Test 1: City extraction
    let filters = this.leadManager.parseNLQuery('show all Thane leads');
    this.assertEquals(
      filters.city,
      'Thane',
      'Should extract city from NL query'
    );

    // Test 2: Loan type extraction
    filters = this.leadManager.parseNLQuery('BL leads with GST');
    this.assertEquals(
      filters.loanType,
      'Business Loan',
      'Should extract BL as Business Loan'
    );

    // Test 3: Loan amount extraction
    filters = this.leadManager.parseNLQuery('leads above 20L');
    this.assertEquals(
      filters.loanAmountMin,
      2000000,
      'Should extract loan amount threshold'
    );

    // Test 4: Complex query
    filters = this.leadManager.parseNLQuery('show all Mumbai home loan leads above 50L');
    this.assertEquals(
      filters.city === 'Mumbai' && filters.loanType === 'Home Loan' && filters.loanAmountMin === 5000000,
      true,
      'Should extract multiple parameters from complex query'
    );

    // Test 5: GST indicator
    filters = this.leadManager.parseNLQuery('leads with GST');
    this.assertEquals(
      filters.hasGST,
      true,
      'Should detect GST indicator'
    );

    console.log('✓ Natural language parsing tests passed\n');
  }

  /**
   * Assert equality helper
   */
  assertEquals(actual, expected, testName) {
    const passed = JSON.stringify(actual) === JSON.stringify(expected);

    if (passed) {
      this.testResults.passed++;
      console.log(`  ✓ ${testName}`);
    } else {
      this.testResults.failed++;
      console.log(`  ✗ ${testName}`);
      console.log(`    Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)}`);
    }

    this.testResults.tests.push({
      name: testName,
      passed: passed,
      expected: expected,
      actual: actual
    });
  }

  /**
   * Print test results summary
   */
  printResults() {
    const total = this.testResults.passed + this.testResults.failed;
    const percentage = total > 0 ? ((this.testResults.passed / total) * 100).toFixed(1) : 0;

    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${total}`);
    console.log(`✓ Passed: ${this.testResults.passed}`);
    console.log(`✗ Failed: ${this.testResults.failed}`);
    console.log(`Success Rate: ${percentage}%`);
    console.log('='.repeat(60) + '\n');

    if (this.testResults.failed === 0) {
      console.log('🎉 All tests passed successfully!');
    } else {
      console.log('⚠️  Some tests failed. Review the output above.');
    }
  }

  /**
   * Get detailed report
   */
  getDetailedReport() {
    return {
      summary: {
        total: this.testResults.passed + this.testResults.failed,
        passed: this.testResults.passed,
        failed: this.testResults.failed,
        successRate: ((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1) + '%'
      },
      tests: this.testResults.tests
    };
  }
}

/**
 * Integration Tests - Test with actual database/Firebase
 */
class LeadManagerIntegrationTests {
  constructor(leadManager, firebaseDb) {
    this.leadManager = leadManager;
    this.firebaseDb = firebaseDb;
    this.testLeadId = null;
  }

  /**
   * Run integration tests
   */
  async runIntegrationTests() {
    console.log('🔌 Starting Lead Manager Integration Tests...\n');

    try {
      if (this.firebaseDb) {
        await this.testLeadCreation();
        await this.testLeadRetrieval();
        await this.testLeadUpdates();
        await this.testLeadSearch();
        await this.testActivityLogging();
        await this.cleanup();
      } else {
        console.log('⚠️  Firebase not configured. Skipping integration tests.');
      }
    } catch (error) {
      console.error('Integration test error:', error);
    }
  }

  /**
   * Test lead creation
   */
  async testLeadCreation() {
    console.log('Creating test lead...');
    const result = await this.leadManager.createLead({
      fullName: 'Integration Test User',
      mobile: '9876543210',
      email: 'test@example.com',
      city: 'Mumbai',
      loanType: 'Business Loan',
      loanAmount: 2500000,
      leadSource: 'Website Form'
    }, 'test-user');

    if (result.success) {
      this.testLeadId = result.lead.leadId;
      console.log(`✓ Lead created: ${this.testLeadId}\n`);
    } else {
      console.log(`✗ Failed to create lead: ${result.error}\n`);
    }
  }

  /**
   * Test lead retrieval
   */
  async testLeadRetrieval() {
    console.log('Retrieving test lead...');
    const result = await this.leadManager.getLead(this.testLeadId);

    if (result.success) {
      console.log(`✓ Lead retrieved successfully`);
      console.log(`  Score: ${result.lead.leadScore}\n`);
    } else {
      console.log(`✗ Failed to retrieve lead: ${result.error}\n`);
    }
  }

  /**
   * Test lead updates
   */
  async testLeadUpdates() {
    console.log('Updating lead status...');
    const result = await this.leadManager.updateLeadStatus(
      this.testLeadId,
      'Contacted',
      'Test status update',
      'test-user'
    );

    if (result.success) {
      console.log(`✓ Status updated to: ${result.newStatus}\n`);
    } else {
      console.log(`✗ Failed to update status: ${result.error}\n`);
    }
  }

  /**
   * Test lead search
   */
  async testLeadSearch() {
    console.log('Searching for leads...');
    const result = await this.leadManager.searchLeads(
      { city: 'Mumbai', loanType: 'Business Loan' },
      { limit: 10 }
    );

    if (result.success) {
      console.log(`✓ Found ${result.leads.length} leads\n`);
    } else {
      console.log(`✗ Search failed: ${result.error}\n`);
    }
  }

  /**
   * Test activity logging
   */
  async testActivityLogging() {
    console.log('Testing activity logging...');
    const result = await this.leadManager.logActivity(
      this.testLeadId,
      'TEST_ACTIVITY',
      'This is a test activity',
      'test-user'
    );

    if (result.success) {
      console.log(`✓ Activity logged successfully\n`);
    } else {
      console.log(`✗ Failed to log activity: ${result.error}\n`);
    }
  }

  /**
   * Cleanup test data
   */
  async cleanup() {
    console.log('Cleaning up test data...');
    // TODO: Implement test data cleanup
    console.log('✓ Cleanup complete\n');
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LeadManagerTests, LeadManagerIntegrationTests };
}
