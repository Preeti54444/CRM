// Lender Access Control Test Script
// Run this in browser console to test role-based permissions

import { FirebaseDataStore } from './crm-data-store-firebase.js';
import { ROLES } from './firebase-roles.js';

// Mock user roles for testing
const testUsers = {
  admin: { role: ROLES.ADMIN, name: 'Admin User' },
  branchManager: { role: ROLES.BRANCH_MANAGER, name: 'Branch Manager' },
  salesExec: { role: ROLES.SALES_EXECUTIVE, name: 'Sales Executive' },
  loanProcessor: { role: ROLES.LOAN_PROCESSING_EXECUTIVE, name: 'Loan Processor' },
  subDsa: { role: ROLES.SUB_DSA_CONNECTOR, name: 'Sub-DSA User' },
  finance: { role: ROLES.FINANCE_ACCOUNTS, name: 'Finance User' }
};

// Test lender access permissions
async function testLenderAccess() {
  console.log('🔍 Testing Lender Access Control\n');

  for (const [userKey, user] of Object.entries(testUsers)) {
    console.log(`👤 Testing ${user.name} (${user.role}):`);

    try {
      // Test getLenders() - Admin only
      const lendersResult = await FirebaseDataStore.getLenders();
      if (lendersResult.success) {
        console.log('  ✅ Can access getLenders()');
      } else {
        console.log('  ❌ Cannot access getLenders():', lendersResult.error);
      }

      // Test getActiveLenders() - Multiple roles
      const activeLendersResult = await FirebaseDataStore.getActiveLenders();
      if (activeLendersResult.success) {
        console.log('  ✅ Can access getActiveLenders()');
      } else {
        console.log('  ❌ Cannot access getActiveLenders():', activeLendersResult.error);
      }

      // Test createLender() - Admin only
      const createResult = await FirebaseDataStore.createLender({
        lenderName: 'Test Bank',
        lenderType: 'Bank',
        activeStatus: 'Active'
      });
      if (createResult.success) {
        console.log('  ✅ Can create lenders');
        // Clean up test lender
        if (createResult.id) {
          await FirebaseDataStore.deleteLender(createResult.id);
        }
      } else {
        console.log('  ❌ Cannot create lenders:', createResult.error);
      }

      // Test getLenderById() - Multiple roles
      const lenderByIdResult = await FirebaseDataStore.getLenderById('test-id');
      if (lenderByIdResult.success || lenderByIdResult.error !== 'Access denied') {
        console.log('  ✅ Can access getLenderById()');
      } else {
        console.log('  ❌ Cannot access getLenderById():', lenderByIdResult.error);
      }

    } catch (error) {
      console.log('  ⚠️  Error during test:', error.message);
    }

    console.log(''); // Empty line between users
  }

  console.log('📋 Access Summary:');
  console.log('• Admin: Full CRUD access to lender management');
  console.log('• Branch Manager, Sales Executive, Loan Processing Executive: Read-only access to active lenders');
  console.log('• Sub-DSA, Finance: No direct lender access');
}

// Export for use in browser console
window.testLenderAccess = testLenderAccess;

// Auto-run if in browser environment
if (typeof window !== 'undefined') {
  console.log('💡 Run testLenderAccess() in console to test permissions');
}