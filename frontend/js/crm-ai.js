// ═══════════════════════════════════════════════════════════════
// CRM AI ASSISTANT (ZIA) - AI Chat & Insights Module
// ═══════════════════════════════════════════════════════════════

// Send message to Zia
function askZia() {
  const input = document.getElementById('zia-input')
  const messages = document.getElementById('zia-chat-messages')
  const question = input ? input.value.trim() : ''
  if (!question || !messages) return

  // Add user message
  const userMsg = document.createElement('div')
  userMsg.style.cssText = 'display:flex;gap:12px;margin-bottom:16px;justify-content:flex-end;'
  userMsg.innerHTML = `
    <div style="background:var(--maroon);color:#fff;padding:12px 16px;border-radius:var(--radius);max-width:80%;box-shadow:0 1px 3px rgba(0,0,0,0.1);">${escapeHtml(question)}</div>
    <div style="width:32px;height:32px;background:var(--gray-200);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--gray-600);font-size:14px;">You</div>
  `
  messages.appendChild(userMsg)
  input.value = ''
  messages.scrollTop = messages.scrollHeight

  // Simulate Zia typing and response
  setTimeout(() => {
    const ziaMsg = document.createElement('div')
    ziaMsg.style.cssText = 'display:flex;gap:12px;margin-bottom:16px;'
    const response = generateZiaResponse(question)
    ziaMsg.innerHTML = `
      <div style="width:32px;height:32px;background:var(--maroon);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;">🤖</div>
      <div style="background:#fff;padding:12px 16px;border-radius:var(--radius);max-width:80%;box-shadow:0 1px 3px rgba(0,0,0,0.1);">${response}</div>
    `
    messages.appendChild(ziaMsg)
    messages.scrollTop = messages.scrollHeight
  }, 800)
}

// Generate Zia's response based on question
function generateZiaResponse(question) {
  const q = question.toLowerCase()
  const stats = DataStore.getDashboardStats()

  if (q.includes('lead') || q.includes('prospect')) {
    return `You currently have <strong>${stats.leads.total}</strong> total leads. <strong>${stats.leads.new}</strong> are new, <strong>${stats.leads.contacted}</strong> contacted, and <strong>${stats.leads.qualified}</strong> qualified. Would you like to see the lead list?`
  }

  if (q.includes('deal') || q.includes('pipeline')) {
    return `You have <strong>${stats.deals.open}</strong> open deals with a total value of <strong>₹${(stats.deals.wonValue / 100000).toFixed(1)}L</strong>. Your conversion rate is <strong>${stats.conversionRate}%</strong>.`
  }

  if (q.includes('task') || q.includes('todo')) {
    const tasks = DataStore.get('tasks').filter(t => !t.completed)
    return `You have <strong>${tasks.length}</strong> pending tasks. ${tasks.length > 0 ? 'The most urgent is: "' + tasks[0].title + '"' : 'Great job, all caught up!'}`
  }

  if (q.includes('revenue') || q.includes('sales')) {
    return `Your revenue this month is <strong>₹${(stats.revenue.currentMonth / 100000).toFixed(1)}L</strong>, which is ${stats.revenue.trend === 'up' ? 'up' : 'down'} from last month.`
  }

  if (q.includes('forecast') || q.includes('predict')) {
    return `Based on your current pipeline, I forecast <strong>₹${(stats.forecast.amount / 100000).toFixed(1)}L</strong> in revenue next month with a probability of <strong>${stats.forecast.probability}%</strong>.`
  }

  if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
    return `Hello! I'm Zia, your AI assistant. I can help you with leads, deals, tasks, forecasts, and more. What would you like to know?`
  }

  if (q.includes('help')) {
    return `I can help you with:<br>• Lead statistics and status<br>• Deal pipeline information<br>• Task management<br>• Revenue forecasts<br>• Activity summaries<br><br>Just ask me anything!`
  }

  if (q.includes('call') || q.includes('phone')) {
    const calls = DataStore.get('calls')
    return `You have logged <strong>${calls.length}</strong> calls. Would you like to see the call history or log a new call?`
  }

  if (q.includes('meeting') || q.includes('appointment')) {
    const meetings = DataStore.get('meetings')
    return `You have <strong>${meetings.length}</strong> meetings scheduled. Check the Meetings section for details.`
  }

  return `I understand you're asking about "${escapeHtml(question)}". I'm still learning, but I can help with CRM data like leads, deals, tasks, and forecasts. Try asking about those!`
}

// HTML escape helper
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// Render AI Assistant section
function renderAIAssistant() {
  // AI Assistant section loads automatically
  // Any dynamic initialization can go here
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { askZia, generateZiaResponse, renderAIAssistant }
}
