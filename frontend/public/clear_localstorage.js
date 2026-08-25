// Clear all CRM-related localStorage data
// Run this in the browser console (F12) on the CRM page

console.log('Clearing CRM localStorage data...');

const crmKeys = [
    'crm_leads',
    'crm_leads_journey', 
    'crm_eod',
    'crm_wod',
    'crm_tasks',
    'crm_users',
    'crm_notifications',
    'crm_followups',
    'crm_calls',
    'crm_api_base',
    'crm_session',
    'crm_api_synced'
];

let clearedCount = 0;
crmKeys.forEach(key => {
    if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log(`✓ Cleared: ${key}`);
        clearedCount++;
    }
});

// Also clear sessionStorage
sessionStorage.clear();
console.log('✓ Cleared sessionStorage');

console.log(`\nCleared ${clearedCount} localStorage items and all sessionStorage.`);
console.log('Refresh the page to start fresh.');
