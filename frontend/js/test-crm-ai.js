// Simple test for CRM AI functions
console.log('Testing CRM AI Assistant Functions...\n');

// Mock DataStore for testing
const DataStore = {
  getDashboardStats: () => ({
    leads: { total: 150, new: 25, contacted: 80, qualified: 45 },
    deals: { open: 12, wonValue: 2500000 },
    conversionRate: 65,
    revenue: { currentMonth: 1800000, trend: 'up' },
    forecast: { amount: 3200000, probability: 78 }
  }),
  get: (key) => {
    if (key === 'tasks') return [
      { title: 'Follow up with ABC Corp', completed: false },
      { title: 'Send proposal to XYZ Ltd', completed: false },
      { title: 'Schedule meeting with DEF Inc', completed: true }
    ];
    if (key === 'calls') return [
      { date: '2026-04-29', duration: 30, contact: 'John Doe' },
      { date: '2026-04-28', duration: 45, contact: 'Jane Smith' }
    ];
    if (key === 'meetings') return [
      { date: '2026-05-01', title: 'Product Demo', attendees: 5 },
      { date: '2026-05-02', title: 'Q2 Review', attendees: 8 }
    ];
    return [];
  }
};

// Load the CRM AI functions (copy-pasted from crm-ai.js)
function generateZiaResponse(question) {
  const q = question.toLowerCase()
  const stats = DataStore.getDashboardStats()

  if (q.includes('lead') || q.includes('prospect')) {
    return `You currently have ${stats.leads.total} total leads. ${stats.leads.new} are new, ${stats.leads.contacted} contacted, and ${stats.leads.qualified} qualified. Would you like to see the lead list?`
  }

  if (q.includes('deal') || q.includes('pipeline')) {
    return `You have ${stats.deals.open} open deals with a total value of ${(stats.deals.wonValue / 100000).toFixed(1)}L. Your conversion rate is ${stats.conversionRate}%.`
  }

  if (q.includes('task') || q.includes('todo')) {
    const tasks = DataStore.get('tasks').filter(t => !t.completed)
    return `You have ${tasks.length} pending tasks. ${tasks.length > 0 ? 'The most urgent is: "' + tasks[0].title + '"' : 'Great job, all caught up!'}`
  }

  if (q.includes('revenue') || q.includes('sales')) {
    return `Your revenue this month is ${(stats.revenue.currentMonth / 100000).toFixed(1)}L, which is ${stats.revenue.trend === 'up' ? 'up' : 'down'} from last month.`
  }

  if (q.includes('forecast') || q.includes('predict')) {
    return `Based on your current pipeline, I forecast ${(stats.forecast.amount / 100000).toFixed(1)}L in revenue next month with a probability of ${stats.forecast.probability}%.`
  }

  if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
    return `Hello! I'm Zia, your AI assistant. I can help you with leads, deals, tasks, forecasts, and more. What would you like to know?`
  }

  if (q.includes('help')) {
    return `I can help you with:\n\u2022 Lead statistics and status\n\u2022 Deal pipeline information\n\u2022 Task management\n\u2022 Revenue forecasts\n\u2022 Activity summaries\n\nJust ask me anything!`
  }

  if (q.includes('call') || q.includes('phone')) {
    const calls = DataStore.get('calls')
    return `You have logged ${calls.length} calls. Would you like to see the call history or log a new call?`
  }

  if (q.includes('meeting') || q.includes('appointment')) {
    const meetings = DataStore.get('meetings')
    return `You have ${meetings.length} meetings scheduled. Check the Meetings section for details.`
  }

  return `I understand you're asking about "${question}". I'm still learning, but I can help with CRM data like leads, deals, tasks, and forecasts. Try asking about those!`
}

// Test different questions
const testQuestions = [
  'Hello',
  'How many leads do I have?',
  'What about my deals?',
  'Show me my tasks',
  'What is my revenue?',
  'Can you forecast next month?',
  'Help me',
  'How many calls?',
  'Meetings',
  'Random question'
];

console.log('ZIA AI Assistant Test Results:\n');
testQuestions.forEach((question, index) => {
  console.log(`\n${index + 1}. Question: "${question}"`);
  console.log(`   Response: ${generateZiaResponse(question)}`);
});

console.log('\n\nTest completed successfully!');
