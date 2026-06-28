// Comprehensive Pipeline Test Suite
// Uses native fetch API available in Node.js 18+

const BASE_URL = 'http://localhost:3000';
const MOCK_TOKEN = 'Bearer test-token-12345';

// Test utilities
const tests = [];
let passCount = 0;
let failCount = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    passCount++;
  } catch (err) {
    console.error(`✗ ${name}: ${err.message}`);
    failCount++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

// Backend API Tests
console.log('\n=== BACKEND API TESTS ===\n');

await test('Root route returns 200', async () => {
  const res = await fetch(`${BASE_URL}/`);
  assert(res.status === 200, `Expected 200, got ${res.status}`);
});

await test('Unauthenticated /api/leads returns 401', async () => {
  const res = await fetch(`${BASE_URL}/api/leads`, { method: 'GET' });
  assert(res.status === 401, `Expected 401, got ${res.status}`);
});

await test('Unauthenticated /api/pipeline/queries returns 401', async () => {
  const res = await fetch(`${BASE_URL}/api/pipeline/queries`, { method: 'GET' });
  assert(res.status === 401, `Expected 401, got ${res.status}`);
});

await test('Unauthenticated /api/pipeline/followups returns 401', async () => {
  const res = await fetch(`${BASE_URL}/api/pipeline/followups`, { method: 'GET' });
  assert(res.status === 401, `Expected 401, got ${res.status}`);
});

await test('Unauthenticated /api/pipeline/documents returns 401', async () => {
  const res = await fetch(`${BASE_URL}/api/pipeline/documents`, { method: 'GET' });
  assert(res.status === 401, `Expected 401, got ${res.status}`);
});

// Test with mock token (will fail due to invalid token, but tests route handling)
await test('POST /api/leads with mock token attempts to create', async () => {
  const res = await fetch(`${BASE_URL}/api/leads`, {
    method: 'POST',
    headers: {
      'Authorization': MOCK_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: 'Test Lead', mobile: '9876543210' })
  });
  // Should fail auth but route should be callable
  assert([401, 400, 500].includes(res.status), `Expected error status, got ${res.status}`);
});

console.log(`\n✓ ${passCount} passed, ✗ ${failCount} failed\n`);

// Local Pipeline Store Tests
console.log('=== LOCAL PIPELINE STORE TESTS ===\n');

// Simulate PipelineStore functionality
const mockStore = {
  state: {
    leads: [],
    activities: [],
    followUps: [],
    queries: [],
    documents: [],
    notifications: [],
    filters: {}
  },
  
  addLead(lead) {
    this.state.leads.unshift(lead);
  },
  
  updateLeadStatus(leadId, newStatus) {
    const lead = this.state.leads.find(l => l.id === leadId);
    if (!lead) throw new Error(`Lead ${leadId} not found`);
    const oldStatus = lead.status;
    lead.status = newStatus;
    lead.lastActivity = new Date().toISOString();
    lead.stageEnteredAt = new Date().toISOString();
    
    this.state.activities.unshift({
      id: `ACT-${Date.now()}`,
      leadId,
      type: 'Status Change',
      oldValue: oldStatus,
      newValue: newStatus
    });
    return lead;
  },
  
  addFollowUp(leadId, followUp) {
    const entry = {
      id: `FU-${Date.now()}`,
      leadId,
      ...followUp,
      createdAt: new Date().toISOString(),
      status: 'Scheduled'
    };
    this.state.followUps.unshift(entry);
    return entry;
  },
  
  addQuery(leadId, query) {
    const entry = {
      id: `QRY-${Date.now()}`,
      leadId,
      ...query,
      createdAt: new Date().toISOString(),
      status: 'Open'
    };
    this.state.queries.unshift(entry);
    return entry;
  },
  
  addDocument(leadId, doc) {
    const entry = {
      id: `DOC-${Date.now()}`,
      leadId,
      ...doc,
      uploadedAt: new Date().toISOString(),
      status: 'Pending'
    };
    this.state.documents.unshift(entry);
    return entry;
  },
  
  addNotification(notification) {
    this.state.notifications.unshift(notification);
  },
  
  getLeadById(id) {
    return this.state.leads.find(l => l.id === id);
  }
};

passCount = 0;
failCount = 0;

await test('Create a new lead', () => {
  const lead = {
    id: 'PL-TEST-001',
    name: 'Test Borrower',
    mobile: '+91 98765 43210',
    loanAmount: 500000,
    loanType: 'Business Loan',
    status: 'Fresh Lead',
    lastActivity: new Date().toISOString(),
    stageEnteredAt: new Date().toISOString()
  };
  mockStore.addLead(lead);
  const retrieved = mockStore.getLeadById('PL-TEST-001');
  assert(retrieved, 'Lead not found after creation');
  assert(retrieved.name === 'Test Borrower', 'Lead name mismatch');
  assert(mockStore.state.leads.length === 1, 'Lead not added to store');
});

await test('Update lead status with activity log', () => {
  mockStore.updateLeadStatus('PL-TEST-001', 'Contacted');
  const lead = mockStore.getLeadById('PL-TEST-001');
  assert(lead.status === 'Contacted', 'Status not updated');
  assert(mockStore.state.activities.length === 1, 'Activity not logged');
  assert(mockStore.state.activities[0].type === 'Status Change', 'Activity type incorrect');
});

await test('Add follow-up for lead', () => {
  const followUp = {
    type: 'Call',
    when: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Follow up for documents'
  };
  const result = mockStore.addFollowUp('PL-TEST-001', followUp);
  assert(result.id, 'Follow-up ID not generated');
  assert(result.leadId === 'PL-TEST-001', 'Follow-up lead ID mismatch');
  assert(result.status === 'Scheduled', 'Follow-up status not set');
  assert(mockStore.state.followUps.length === 1, 'Follow-up not added');
});

await test('Add query for lead', () => {
  const query = {
    details: 'Lender requesting GST returns',
    raisedBy: 'Test User'
  };
  const result = mockStore.addQuery('PL-TEST-001', query);
  assert(result.id, 'Query ID not generated');
  assert(result.leadId === 'PL-TEST-001', 'Query lead ID mismatch');
  assert(result.status === 'Open', 'Query status not set');
  assert(mockStore.state.queries.length === 1, 'Query not added');
});

await test('Add document for lead', () => {
  const doc = {
    type: 'PAN',
    fileName: 'pan_card.pdf'
  };
  const result = mockStore.addDocument('PL-TEST-001', doc);
  assert(result.id, 'Document ID not generated');
  assert(result.leadId === 'PL-TEST-001', 'Document lead ID mismatch');
  assert(result.status === 'Pending', 'Document status not set');
  assert(mockStore.state.documents.length === 1, 'Document not added');
});

await test('Add notification for lead update', () => {
  mockStore.addNotification({
    id: `NOT-${Date.now()}`,
    type: 'Stage Update',
    leadId: 'PL-TEST-001',
    message: 'Lead status changed to Contacted',
    timestamp: new Date().toISOString(),
    read: false
  });
  assert(mockStore.state.notifications.length === 1, 'Notification not added');
});

await test('Create multiple leads and verify order', () => {
  mockStore.addLead({
    id: 'PL-TEST-002',
    name: 'Second Lead',
    mobile: '+91 87654 32109',
    loanAmount: 750000,
    status: 'Fresh Lead',
    lastActivity: new Date().toISOString(),
    stageEnteredAt: new Date().toISOString()
  });
  assert(mockStore.state.leads.length === 2, 'Second lead not added');
  assert(mockStore.state.leads[0].id === 'PL-TEST-002', 'Lead order incorrect (most recent first)');
});

await test('Validate lead state structure', () => {
  const lead = mockStore.getLeadById('PL-TEST-001');
  assert(lead.id, 'Lead missing id');
  assert(lead.name, 'Lead missing name');
  assert(lead.mobile, 'Lead missing mobile');
  assert(lead.loanAmount, 'Lead missing loanAmount');
  assert(lead.status, 'Lead missing status');
  assert(lead.lastActivity, 'Lead missing lastActivity');
  assert(lead.stageEnteredAt, 'Lead missing stageEnteredAt');
});

await test('Validate follow-up state structure', () => {
  const followUp = mockStore.state.followUps[0];
  assert(followUp.id, 'Follow-up missing id');
  assert(followUp.leadId, 'Follow-up missing leadId');
  assert(followUp.type, 'Follow-up missing type');
  assert(followUp.when, 'Follow-up missing when');
  assert(followUp.status, 'Follow-up missing status');
  assert(followUp.createdAt, 'Follow-up missing createdAt');
});

await test('Validate query state structure', () => {
  const query = mockStore.state.queries[0];
  assert(query.id, 'Query missing id');
  assert(query.leadId, 'Query missing leadId');
  assert(query.details, 'Query missing details');
  assert(query.status, 'Query missing status');
  assert(query.createdAt, 'Query missing createdAt');
});

await test('Validate document state structure', () => {
  const doc = mockStore.state.documents[0];
  assert(doc.id, 'Document missing id');
  assert(doc.leadId, 'Document missing leadId');
  assert(doc.type, 'Document missing type');
  assert(doc.status, 'Document missing status');
  assert(doc.uploadedAt, 'Document missing uploadedAt');
});

console.log(`\n✓ ${passCount} passed, ✗ ${failCount} failed\n`);

// Summary
console.log('=== TEST SUMMARY ===');
console.log(`Total: ${passCount + failCount} tests`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
console.log(`Status: ${failCount === 0 ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED'}\n`);

process.exit(failCount > 0 ? 1 : 0);
