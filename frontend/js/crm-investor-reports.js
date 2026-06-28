const InvestorReporting = {
  updateTemplates: {
    monthly: {
      name: 'Monthly Update',
      sections: ['highlights', 'kpis', 'financials', 'milestones', 'team', 'ask', 'shoutouts'],
      frequency: 'monthly'
    },
    quarterly: {
      name: 'Quarterly Report',
      sections: ['executive_summary', 'kpis', 'financials', 'product_updates', 'market_update', 'team_changes', 'next_quarter_goals', 'governance'],
      frequency: 'quarterly'
    },
    milestone: {
      name: 'Milestone Update',
      sections: ['announcement', 'details', 'impact', 'next_steps'],
      frequency: 'as_needed'
    },
    fundraising: {
      name: 'Fundraising Update',
      sections: ['round_status', 'use_of_funds', 'traction', 'market_validation', 'investor_interest'],
      frequency: 'weekly_during_raise'
    }
  },

  createUpdate: function(template, data) {
    const update = {
      id: 'UPD-' + Date.now(),
      template: template,
      subject: data.subject,
      content: this.generateContent(template, data),
      recipients: data.recipients || [],
      kpis: data.kpis || {},
      metrics: data.metrics || {},
      status: 'draft',
      sentAt: null,
      openRate: null,
      clickRate: null,
      createdAt: new Date().toISOString()
    };

    const updates = DataStore.get('investor_updates') || [];
    updates.push(update);
    DataStore.set('investor_updates', updates);

    return update;
  },

  generateContent: function(template, data) {
    const sections = this.updateTemplates[template]?.sections || [];
    const content = {};
    sections.forEach(section => {
      if (data[section]) content[section] = data[section];
    });
    return content;
  },

  sendUpdate: function(updateId) {
    const updates = DataStore.get('investor_updates') || [];
    const update = updates.find(u => u.id === updateId);
    if (!update) return null;

    update.recipients.forEach(investorId => {
      const investor = (DataStore.get('investors') || []).find(i => i.id === investorId);
      if (investor) this.queueEmail(investor, update);
    });

    update.status = 'sent';
    update.sentAt = new Date().toISOString();
    DataStore.set('investor_updates', updates);
    return update;
  },

  queueEmail: function(investor, update) {
    const emailQueue = DataStore.get('email_queue') || [];
    emailQueue.push({
      id: 'EMAIL-' + Date.now(),
      to: investor.email,
      subject: update.subject,
      body: update,
      type: 'investor_update',
      updateId: update.id,
      investorId: investor.id,
      status: 'queued',
      createdAt: new Date().toISOString()
    });
    DataStore.set('email_queue', emailQueue);
  }
};

const KPITracker = {
  defaultMetrics: [
    { id: 'revenue', name: 'Revenue', type: 'currency', target: 0 },
    { id: 'burn_rate', name: 'Monthly Burn', type: 'currency', target: 0 },
    { id: 'runway', name: 'Runway (months)', type: 'number', target: 18 },
    { id: 'customers', name: 'Total Customers', type: 'number', target: 0 },
    { id: 'mrr', name: 'MRR', type: 'currency', target: 0 },
    { id: 'arr', name: 'ARR', type: 'currency', target: 0 },
    { id: 'churn', name: 'Monthly Churn', type: 'percentage', target: 5 },
    { id: 'headcount', name: 'Team Size', type: 'number', target: 0 }
  ],

  recordSnapshot: function(period, metrics) {
    const snapshot = {
      id: 'KPI-' + Date.now(),
      period: period,
      metrics: metrics,
      recordedAt: new Date().toISOString()
    };
    const snapshots = DataStore.get('kpi_snapshots') || [];
    snapshots.push(snapshot);
    DataStore.set('kpi_snapshots', snapshots);
    return snapshot;
  }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { InvestorReporting, KPITracker };
}
