/**
 * Funding Sathi CRM - Investor & Fundraising Module
 * Specialized features for VC fundraising and investor relations
 */

// ═══════════════════════════════════════════════════════════════
// INVESTOR PIPELINE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

const INVESTOR_STAGES = {
  IDENTIFIED: { id: 'identified', name: 'Identified', color: '#9ca3af', probability: 5 },
  INITIAL_OUTREACH: { id: 'initial_outreach', name: 'Initial Outreach', color: '#60a5fa', probability: 10 },
  RESPONDED: { id: 'responded', name: 'Responded', color: '#3b82f6', probability: 20 },
  INTRO_MEETING: { id: 'intro_meeting', name: 'Intro Meeting', color: '#8b5cf6', probability: 30 },
  PITCH_DECK_SENT: { id: 'pitch_sent', name: 'Pitch Deck Sent', color: '#a855f7', probability: 40 },
  DECK_VIEWED: { id: 'deck_viewed', name: 'Deck Viewed', color: '#c084fc', probability: 50 },
  FOLLOW_UP: { id: 'follow_up', name: 'Follow-up', color: '#f59e0b', probability: 60 },
  DUE_DILIGENCE: { id: 'due_diligence', name: 'Due Diligence', color: '#f97316', probability: 75 },
  TERM_SHEET: { id: 'term_sheet', name: 'Term Sheet', color: '#ef4444', probability: 90 },
  NEGOTIATION: { id: 'negotiation', name: 'Negotiation', color: '#dc2626', probability: 95 },
  CLOSED_WON: { id: 'closed_won', name: 'Closed - Committed', color: '#22c55e', probability: 100 },
  CLOSED_LOST: { id: 'closed_lost', name: 'Closed - Passed', color: '#6b7280', probability: 0 },
  ON_HOLD: { id: 'on_hold', name: 'On Hold', color: '#94a3b8', probability: 25 }
};

// Investor data structure
function createInvestor(data) {
  return {
    id: 'INV-' + Date.now(),
    type: 'investor',
    firmName: data.firmName || '',
    firmType: data.firmType || '',
    contactName: data.contactName || '',
    title: data.title || '',
    email: data.email || '',
    phone: data.phone || '',
    linkedin: data.linkedin || '',
    
    investmentStage: data.investmentStage || [],
    ticketSize: { min: data.ticketMin || 0, max: data.ticketMax || 0, currency: data.currency || 'USD' },
    sectors: data.sectors || [],
    geography: data.geography || [],
    
    stage: data.stage || 'identified',
    stageHistory: [{ stage: data.stage || 'identified', date: new Date().toISOString(), notes: 'Initial contact' }],
    
    firstContactDate: data.firstContactDate || new Date().toISOString(),
    lastContactDate: null,
    lastActivity: null,
    nextFollowUp: data.nextFollowUp || null,
    
    engagementScore: 0,
    emailOpens: 0,
    deckViews: 0,
    meetingCount: 0,
    responseTime: null,
    
    deckSent: false,
    deckSentDate: null,
    deckViewTime: 0,
    slidesViewed: [],
    deckForwards: 0,
    
    documents: [],
    dataRoomAccess: false,
    notes: data.notes || '',
    interactions: [],
    
    roundId: data.roundId || null,
    committedAmount: 0,
    committedDate: null,
    
    tags: data.tags || [],
    priority: data.priority || 'medium',
    
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    owner: data.owner || (typeof S !== 'undefined' ? S?.email : 'me')
  };
}

function saveInvestor(investor) {
  const investors = DataStore.get('investors') || [];
  const existingIndex = investors.findIndex(i => i.id === investor.id);
  
  if (existingIndex >= 0) {
    investors[existingIndex] = { ...investors[existingIndex], ...investor, updatedAt: new Date().toISOString() };
  } else {
    investors.push(investor);
  }
  
  DataStore.set('investors', investors);
  DataStore.addActivity('investor', existingIndex >= 0 ? 'Updated investor' : 'Added new investor', investor.firmName);
  return investor;
}

function getInvestors(filters = {}) {
  let investors = DataStore.get('investors') || [];
  
  if (filters.stage) investors = investors.filter(i => i.stage === filters.stage);
  if (filters.firmType) investors = investors.filter(i => i.firmType === filters.firmType);
  if (filters.priority) investors = investors.filter(i => i.priority === filters.priority);
  if (filters.roundId) investors = investors.filter(i => i.roundId === filters.roundId);
  if (filters.search) {
    const search = filters.search.toLowerCase();
    investors = investors.filter(i => 
      i.firmName.toLowerCase().includes(search) ||
      i.contactName.toLowerCase().includes(search) ||
      i.email.toLowerCase().includes(search)
    );
  }
  
  return investors.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return b.engagementScore - a.engagementScore;
  });
}

// ═══════════════════════════════════════════════════════════════
// FUNDRAISING ROUNDS
// ═══════════════════════════════════════════════════════════════

function createFundraisingRound(data) {
  const round = {
    id: 'ROUND-' + Date.now(),
    name: data.name || 'Series A',
    type: data.type || 'equity', // equity, debt, bridge, safe
    targetAmount: data.targetAmount || 0,
    raisedAmount: 0,
    committedAmount: 0,
    preMoney: data.preMoney || 0,
    postMoney: data.postMoney || 0,
    status: data.status || 'active', // preparing, active, closed, abandoned
    startDate: data.startDate || new Date().toISOString(),
    targetCloseDate: data.targetCloseDate || null,
    actualCloseDate: null,
    description: data.description || '',
    pitchDeckUrl: data.pitchDeckUrl || '',
    dataRoomUrl: data.dataRoomUrl || '',
    investors: [],
    milestones: data.milestones || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  const rounds = DataStore.get('fundraising_rounds') || [];
  rounds.push(round);
  DataStore.set('fundraising_rounds', rounds);
  return round;
}

function getFundraisingProgress(roundId) {
  const investors = getInvestors({ roundId });
  const round = (DataStore.get('fundraising_rounds') || []).find(r => r.id === roundId);
  
  if (!round) return null;
  
  const stageCounts = {};
  Object.values(INVESTOR_STAGES).forEach(s => stageCounts[s.id] = 0);
  investors.forEach(i => stageCounts[i.stage] = (stageCounts[i.stage] || 0) + 1);
  
  const pipelineValue = investors.reduce((sum, i) => {
    const stage = INVESTOR_STAGES[i.stage.toUpperCase()];
    const probability = stage ? stage.probability / 100 : 0;
    return sum + (i.ticketSize.max * probability);
  }, 0);
  
  return {
    totalInvestors: investors.length,
    committed: investors.filter(i => i.stage === 'closed_won').length,
    passed: investors.filter(i => i.stage === 'closed_lost').length,
    active: investors.filter(i => !['closed_won', 'closed_lost'].includes(i.stage)).length,
    raisedAmount: investors.filter(i => i.stage === 'closed_won').reduce((sum, i) => sum + i.committedAmount, 0),
    pipelineValue: pipelineValue,
    stageDistribution: stageCounts,
    progressPercent: (round.raisedAmount / round.targetAmount) * 100
  };
}

// ═══════════════════════════════════════════════════════════════
// RENDER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function renderInvestorPipeline() {
  const investors = getInvestors();
  const container = document.getElementById('investor-pipeline-container');
  if (!container) return;
  
  const stageGroups = {};
  Object.keys(INVESTOR_STAGES).forEach(key => {
    stageGroups[INVESTOR_STAGES[key].id] = [];
  });
  
  investors.forEach(inv => {
    if (stageGroups[inv.stage]) {
      stageGroups[inv.stage].push(inv);
    }
  });
  
  container.innerHTML = `
    <div class="kanban-board" style="overflow-x:auto; display:flex; gap:16px; padding-bottom:8px;">
      ${Object.values(INVESTOR_STAGES).filter(s => s.id !== 'closed_lost' || showClosed).map(stage => `
        <div class="kanban-column" style="min-width:280px; max-width:280px; background:var(--gray-50); border-radius:12px; padding:12px;">
          <div class="kanban-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding-bottom:12px; border-bottom:1px solid var(--gray-200);">
            <div style="display:flex; align-items:center; gap:8px;">
              <div style="width:12px; height:12px; border-radius:50%; background:${stage.color};"></div>
              <span style="font-weight:600; font-size:13px;">${stage.name}</span>
            </div>
            <span class="badge" style="background:${stage.color}20; color:${stage.color};">${stageGroups[stage.id]?.length || 0}</span>
          </div>
          <div class="kanban-cards">
            ${(stageGroups[stage.id] || []).map(inv => `
              <div class="kanban-card" onclick="openInvestorDetail('${inv.id}')" style="background:white; border-radius:8px; padding:14px; margin-bottom:10px; box-shadow:0 1px 3px rgba(0,0,0,0.1); cursor:pointer; border-left:3px solid ${stage.color};">
                <div style="font-weight:600; font-size:13px; margin-bottom:4px;">${inv.firmName}</div>
                <div style="font-size:12px; color:var(--gray-500); margin-bottom:8px;">${inv.contactName}</div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span class="badge" style="font-size:10px; ${inv.priority === 'high' ? 'background:var(--danger-light); color:var(--danger);' : inv.priority === 'medium' ? 'background:var(--warning-light); color:var(--warning);' : 'background:var(--gray-100); color:var(--gray-600);'}">${inv.priority}</span>
                  <span style="font-size:12px; font-weight:500; color:var(--gray-700);">${formatCurrency(inv.ticketSize.max)}</span>
                </div>
                ${inv.engagementScore > 0 ? `<div style="margin-top:8px; display:flex; align-items:center; gap:6px;"><div style="flex:1; height:4px; background:var(--gray-200); border-radius:2px;"><div style="width:${inv.engagementScore}%; height:100%; background:linear-gradient(90deg, var(--primary), var(--success)); border-radius:2px;"></div></div><span style="font-size:10px; color:var(--gray-500);">${inv.engagementScore}</span></div>` : ''}
              </div>
            `).join('')}
          </div>
          <button onclick="openAddInvestorModal('${stage.id}')" class="btn btn-ghost btn-sm" style="width:100%; margin-top:8px; border:1px dashed var(--gray-300);">+ Add Investor</button>
        </div>
      `).join('')}
    </div>
  `;
}

function renderInvestorList() {
  const investors = getInvestors();
  const container = document.getElementById('investor-list-container');
  if (!container) return;
  
  container.innerHTML = `
    <div class="card">
      <div class="filter-bar" style="display:flex; gap:12px; padding:12px 16px; border-bottom:1px solid var(--gray-200); flex-wrap:wrap;">
        <div class="filter-search" style="position:relative; flex:1; max-width:300px;">
          <input type="text" id="investorSearch" placeholder="Search investors..." onkeyup="filterInvestors()" style="width:100%; padding:8px 12px 8px 36px; border:1px solid var(--gray-300); border-radius:6px;">
          <svg style="position:absolute; left:12px; top:50%; transform:translateY(-50%); width:16px; height:16px; color:var(--gray-400);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </div>
        <select id="stageFilter" onchange="filterInvestors()" class="form-select" style="width:auto;">
          <option value="">All Stages</option>
          ${Object.values(INVESTOR_STAGES).map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
        </select>
        <select id="typeFilter" onchange="filterInvestors()" class="form-select" style="width:auto;">
          <option value="">All Types</option>
          <option value="VC">Venture Capital</option>
          <option value="PE">Private Equity</option>
          <option value="Angel">Angel Investor</option>
          <option value="Family Office">Family Office</option>
          <option value="Corporate">Corporate VC</option>
          <option value="Accelerator">Accelerator</option>
        </select>
        <button class="btn btn-primary" onclick="openAddInvestorModal()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Investor</button>
      </div>
      
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Investor</th>
              <th>Type</th>
              <th>Stage</th>
              <th>Ticket Size</th>
              <th>Engagement</th>
              <th>Last Contact</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="investorTableBody">
            ${investors.map(inv => {
              const stage = INVESTOR_STAGES[inv.stage.toUpperCase()];
              return `
                <tr>
                  <td>
                    <div style="display:flex; align-items:center; gap:12px;">
                      <div style="width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg, var(--primary), var(--secondary)); color:white; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:14px;">${inv.firmName.charAt(0)}</div>
                      <div>
                        <div style="font-weight:600;">${inv.firmName}</div>
                        <div style="font-size:12px; color:var(--gray-500);">${inv.contactName}</div>
                      </div>
                    </div>
                  </td>
                  <td>${inv.firmType}</td>
                  <td><span class="badge" style="background:${stage?.color}20; color:${stage?.color};">${stage?.name || inv.stage}</span></td>
                  <td>${formatCurrency(inv.ticketSize.min)} - ${formatCurrency(inv.ticketSize.max)}</td>
                  <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                      <div style="width:60px; height:6px; background:var(--gray-200); border-radius:3px;">
                        <div style="width:${inv.engagementScore}%; height:100%; background:${inv.engagementScore > 70 ? 'var(--success)' : inv.engagementScore > 40 ? 'var(--warning)' : 'var(--danger)'}; border-radius:3px;"></div>
                      </div>
                      <span style="font-size:12px; color:var(--gray-600);">${inv.engagementScore}%</span>
                    </div>
                  </td>
                  <td>${inv.lastContactDate ? formatDate(inv.lastContactDate) : 'Never'}</td>
                  <td>
                    <div style="display:flex; gap:8px;">
                      <button class="btn btn-ghost btn-sm" onclick="openInvestorDetail('${inv.id}')" title="View">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                      <button class="btn btn-ghost btn-sm" onclick="editInvestor('${inv.id}')" title="Edit">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                      </button>
                      <button class="btn btn-ghost btn-sm" onclick="sendEmail('${inv.id}')" title="Email">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderFundraisingDashboard() {
  const rounds = DataStore.get('fundraising_rounds') || [];
  const activeRound = rounds.find(r => r.status === 'active') || rounds[rounds.length - 1];
  const container = document.getElementById('fundraising-dashboard');
  if (!container || !activeRound) return;
  
  const progress = getFundraisingProgress(activeRound.id);
  
  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Target</div>
        <div class="stat-value">${formatCurrency(activeRound.targetAmount)}</div>
        <div class="stat-change">${activeRound.type.toUpperCase()}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Raised</div>
        <div class="stat-value" style="color:var(--success);">${formatCurrency(progress.raisedAmount)}</div>
        <div class="stat-change positive">${progress.progressPercent.toFixed(1)}% of target</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Pipeline Value</div>
        <div class="stat-value" style="color:var(--info);">${formatCurrency(progress.pipelineValue)}</div>
        <div class="stat-change">${progress.active} active conversations</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Investors</div>
        <div class="stat-value">${progress.totalInvestors}</div>
        <div class="stat-change">${progress.committed} committed, ${progress.passed} passed</div>
      </div>
    </div>
    
    <div class="grid-2" style="margin-top:24px;">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Pipeline by Stage</div>
        </div>
        <div class="card-body">
          ${Object.values(INVESTOR_STAGES).filter(s => progress.stageDistribution[s.id] > 0).map(stage => `
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
              <div style="width:100px; font-size:13px; color:var(--gray-600);">${stage.name}</div>
              <div style="flex:1; height:24px; background:var(--gray-100); border-radius:12px; overflow:hidden;">
                <div style="width:${(progress.stageDistribution[stage.id] / progress.totalInvestors) * 100}%; height:100%; background:${stage.color}; display:flex; align-items:center; justify-content:center; color:white; font-size:11px; font-weight:600;">${progress.stageDistribution[stage.id]}</div>
              </div>
              <div style="width:40px; text-align:right; font-size:12px; color:var(--gray-500);">${stage.probability}%</div>
            </div>
          `).join('') || '<div style="text-align:center; color:var(--gray-500); padding:20px;">No investors added yet</div>'}
        </div>
      </div>
      
      <div class="card">
        <div class="card-header">
          <div class="card-title">Recent Activity</div>
          <button class="btn btn-ghost btn-sm">View All</button>
        </div>
        <div class="card-body">
          ${(DataStore.get('activities') || [])
            .filter(a => a.type === 'investor')
            .slice(0, 5)
            .map(a => `
              <div style="display:flex; gap:12px; padding:12px 0; border-bottom:1px solid var(--gray-100);">
                <div style="width:32px; height:32px; background:var(--info-light); border-radius:8px; display:flex; align-items:center; justify-content:center; color:var(--info);">📈</div>
                <div>
                  <div style="font-size:13px; font-weight:500;">${a.description}</div>
                  <div style="font-size:11px; color:var(--gray-500);">${formatDate(a.timestamp)}</div>
                </div>
              </div>
            `).join('') || '<div style="text-align:center; color:var(--gray-500); padding:20px;">No recent activity</div>'}
        </div>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function formatCurrency(amount, currency = 'USD') {
  if (!amount || amount === 0) return '-';
  const symbols = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };
  const symbol = symbols[currency] || currency + ' ';
  
  if (amount >= 10000000) {
    return symbol + (amount / 10000000).toFixed(1) + 'Cr';
  } else if (amount >= 100000) {
    return symbol + (amount / 100000).toFixed(1) + 'L';
  } else if (amount >= 1000) {
    return symbol + (amount / 1000).toFixed(1) + 'K';
  }
  return symbol + amount.toLocaleString();
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';
  
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function filterInvestors() {
  const search = document.getElementById('investorSearch')?.value || '';
  const stage = document.getElementById('stageFilter')?.value || '';
  const type = document.getElementById('typeFilter')?.value || '';
  
  const filtered = getInvestors({ search, stage, firmType: type });
  renderInvestorTable(filtered);
}

function renderInvestorTable(investors) {
  const tbody = document.getElementById('investorTableBody');
  if (!tbody) return;
  
  tbody.innerHTML = investors.map(inv => {
    const stage = INVESTOR_STAGES[inv.stage.toUpperCase()];
    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg, var(--primary), var(--secondary)); color:white; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:14px;">${inv.firmName.charAt(0)}</div>
            <div>
              <div style="font-weight:600;">${inv.firmName}</div>
              <div style="font-size:12px; color:var(--gray-500);">${inv.contactName}</div>
            </div>
          </div>
        </td>
        <td>${inv.firmType}</td>
        <td><span class="badge" style="background:${stage?.color}20; color:${stage?.color};">${stage?.name || inv.stage}</span></td>
        <td>${formatCurrency(inv.ticketSize.min)} - ${formatCurrency(inv.ticketSize.max)}</td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="width:60px; height:6px; background:var(--gray-200); border-radius:3px;">
              <div style="width:${inv.engagementScore}%; height:100%; background:${inv.engagementScore > 70 ? 'var(--success)' : inv.engagementScore > 40 ? 'var(--warning)' : 'var(--danger)'}; border-radius:3px;"></div>
            </div>
            <span style="font-size:12px; color:var(--gray-600);">${inv.engagementScore}%</span>
          </div>
        </td>
        <td>${inv.lastContactDate ? formatDate(inv.lastContactDate) : 'Never'}</td>
        <td>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-ghost btn-sm" onclick="openInvestorDetail('${inv.id}')">View</button>
            <button class="btn btn-ghost btn-sm" onclick="editInvestor('${inv.id}')">Edit</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Export functions
module.exports = {
  INVESTOR_STAGES,
  createInvestor,
  saveInvestor,
  getInvestors,
  createFundraisingRound,
  getFundraisingProgress,
  renderInvestorPipeline,
  renderInvestorList,
  renderFundraisingDashboard,
  formatCurrency,
  formatDate
};
