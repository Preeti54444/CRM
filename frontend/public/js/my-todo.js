document.addEventListener('DOMContentLoaded', function () {
  const apiBase = window.API_BASE || '';
  const token = (window.S && window.S.access_token) || JSON.parse(localStorage.getItem('crm_session') || '{}').access_token || '';

  function emptyState(message, accent = '#64748b') {
    return `<div style="padding:16px;text-align:center;color:${accent};font-size:12px;">${message}</div>`;
  }

  function setSummaryCard(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function setProgressBar(id, pct, color) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    el.style.background = color;
  }

  function renderSummary(data) {
    const calls = data?.calls || {};
    const leads = data?.leads || {};
    const meetings = data?.meetings || {};
    const tasks = data?.tasks || {};

    const callsPct = Number(calls.pct || 0);
    const leadsPct = Number(leads.pct || 0);
    const meetingsPct = Number(meetings.pct || 0);
    const taskPct = Number(tasks.pct || 0);

    setSummaryCard('dashboardCallsTargetValue', `${calls.done || 0} / ${calls.target || 0}`);
    setProgressBar('dashboardCallsTargetBar', callsPct, callsPct >= 100 ? '#16a34a' : callsPct >= 50 ? '#d97706' : '#dc2626');
    setSummaryCard('dashboardLeadsTargetValue', `${leads.done || 0} / ${leads.target || 0}`);
    setProgressBar('dashboardLeadsTargetBar', leadsPct, leadsPct >= 100 ? '#16a34a' : leadsPct >= 50 ? '#d97706' : '#dc2626');
    setSummaryCard('dashboardMeetingsTargetValue', meetings.target > 0 ? `${meetings.done || 0} / ${meetings.target || 0}` : '0');
    setProgressBar('dashboardMeetingsTargetBar', meetingsPct, meetingsPct >= 100 ? '#7c3aed' : meetingsPct >= 50 ? '#d97706' : '#dc2626');
    setSummaryCard('dashboardTasksTargetValue', `${tasks.done || 0} / ${tasks.target || 0}`);
    setProgressBar('dashboardTasksTargetBar', taskPct, taskPct >= 100 ? '#16a34a' : taskPct >= 50 ? '#d97706' : '#dc2626');
  }

  async function fetchSummary() {
    try {
      const res = await fetch(`${apiBase}/api/dashboard/summary`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Summary API failed');
      const data = await res.json();
      renderSummary(data);
    } catch (error) {
      console.warn('[My To-Do] Summary failed:', error);
      renderSummary({
        calls: { done: 0, target: 0, pct: 0 },
        leads: { done: 0, target: 0, pct: 0 },
        meetings: { done: 0, target: 0, pending: 0, pct: 0 },
        tasks: { done: 0, target: 0, pct: 0 },
      });
    }
  }

  function renderTodoList(items) {
    const el = document.getElementById('todoList');
    if (!el) return;
    el.innerHTML = '';
    if (!Array.isArray(items) || items.length === 0) {
      el.innerHTML = emptyState('No tasks assigned today');
      return;
    }

    items.forEach((task) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.gap = '10px';
      row.style.alignItems = 'center';
      row.style.padding = '10px 12px';
      row.style.background = '#f8fafc';
      row.style.borderRadius = '8px';

      const textWrap = document.createElement('div');
      textWrap.style.flex = '1';
      textWrap.innerHTML = `<div style="font-weight:600;color:var(--gray-900)">${task.title || 'Untitled Task'}</div><div style="font-size:12px;color:var(--gray-600)">${task.description || 'No description'}${task.due_time ? ' • ' + task.due_time : ''}</div>`;

      const statusPill = document.createElement('div');
      statusPill.style.fontSize = '11px';
      statusPill.style.color = '#64748b';
      statusPill.style.fontWeight = '600';
      statusPill.textContent = task.status || (task.completed ? 'Completed' : 'Pending');

      row.appendChild(textWrap);
      row.appendChild(statusPill);
      el.appendChild(row);
    });
  }

  async function fetchTodos() {
    try {
      const res = await fetch(`${apiBase}/api/todos/today`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Todos API failed');
      const items = await res.json();
      // detect new tasks and show popup
      try {
        if (!window.__myTodoState__) window.__myTodoState__ = { firstLoad: true, ids: new Set() };
        const state = window.__myTodoState__;
        const ids = (Array.isArray(items) ? items.map(t => t.id).filter(Boolean) : []);
        const newIds = ids.filter(id => !state.ids.has(id));
        if (!state.firstLoad && newIds.length > 0) {
          const newTasks = (items || []).filter(t => newIds.includes(t.id));
            newTasks.forEach(t => {
              showToast(`New task assigned: ${t.title || 'Task'}`);
              try { showDesktopNotification(t); } catch(e) { /* ignore */ }
            });
        }
        state.firstLoad = false;
        state.ids = new Set(ids);
      } catch (e) { console.warn('[My To-Do] new task detection failed', e); }
      renderTodoList(items);
    } catch (error) {
      console.warn('[My To-Do] Todos failed:', error);
      renderTodoList([]);
    }
  }

  function showToast(message, timeout = 5000) {
    try {
      const id = `crm-toast-${Date.now()}`;
      let container = document.getElementById('crmToastContainer');
      if (!container) {
        container = document.createElement('div');
        container.id = 'crmToastContainer';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = 99999;
        document.body.appendChild(container);
      }
      const el = document.createElement('div');
      el.id = id;
      el.textContent = message;
      el.style.background = '#111827';
      el.style.color = '#ffffff';
      el.style.padding = '10px 14px';
      el.style.borderRadius = '8px';
      el.style.marginTop = '8px';
      el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
      el.style.fontSize = '13px';
      el.style.opacity = '0';
      el.style.transition = 'opacity 240ms ease-in-out, transform 240ms ease-in-out';
      el.style.transform = 'translateY(-6px)';
      container.appendChild(el);
      requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; });
      setTimeout(() => {
        el.style.opacity = '0'; el.style.transform = 'translateY(-6px)';
        setTimeout(() => el.remove(), 300);
      }, timeout);
    } catch (err) { /* silent */ }
  }

  function showDesktopNotification(task) {
    try {
      if (!('Notification' in window)) return;
      if (Notification.permission === 'default') {
        Notification.requestPermission();
        return;
      }
      if (Notification.permission !== 'granted') return;
      const title = task.title || 'New Task Assigned';
      const body = task.description || (task.due_time ? `Due: ${task.due_time}` : '');
      const options = { body, tag: `task-${task.id || Date.now()}` };
      const n = new Notification(title, options);
      n.onclick = () => { try { window.focus(); n.close(); } catch(_){} };
    } catch (err) { /* silent */ }
  }

  function renderHighPriorityList(items) {
    const el = document.getElementById('highPriorityList');
    if (!el) return;
    el.innerHTML = '';
    if (!Array.isArray(items) || items.length === 0) {
      el.innerHTML = emptyState('No high priority tasks');
      return;
    }

    items.slice(0, 5).forEach((task) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.gap = '10px';
      row.style.padding = '10px 0';
      row.style.borderBottom = '1px solid #f1f5f9';

      const details = document.createElement('div');
      details.innerHTML = `<div style="font-weight:700;color:var(--gray-900)">${task.title || 'Untitled Task'}</div><div style="font-size:12px;color:var(--gray-600)">${task.due_time || task.due_date || 'No due time'} • ${task.lead_name || 'Lead not linked'}</div>`;

      const badge = document.createElement('span');
      badge.style.background = '#fee2e2';
      badge.style.color = '#b91c1c';
      badge.style.padding = '4px 8px';
      badge.style.borderRadius = '999px';
      badge.style.fontSize = '11px';
      badge.style.fontWeight = '700';
      badge.textContent = 'High';

      row.appendChild(details);
      row.appendChild(badge);
      el.appendChild(row);
    });
  }

  async function fetchHighPriority() {
    try {
      const res = await fetch(`${apiBase}/api/tasks/high-priority`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('High-priority API failed');
      const items = await res.json();
      renderHighPriorityList(items);
    } catch (error) {
      console.warn('[My To-Do] High-priority tasks failed:', error);
      renderHighPriorityList([]);
    }
  }

  function renderUpcoming(items) {
    const el = document.getElementById('upcomingActivitiesList');
    if (!el) return;
    el.innerHTML = '';
    if (!Array.isArray(items) || items.length === 0) {
      el.innerHTML = emptyState('No upcoming activities');
      return;
    }

    items.slice(0, 10).forEach((activity) => {
      const types = {
        meeting: { icon: '🤝', color: '#9B2335', bg: 'var(--maroon-light)' },
        call: { icon: '📞', color: '#16a34a', bg: '#f0fdf4' },
        task: { icon: '📋', color: '#d97706', bg: '#fffbeb' },
        'follow-up': { icon: '🔔', color: '#7c3aed', bg: '#f5f3ff' },
      };
      const meta = types[activity.kind] || types.task;
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.gap = '12px';
      row.style.padding = '12px';
      row.style.borderRadius = '8px';
      row.style.background = meta.bg;
      row.style.borderLeft = `3px solid ${meta.color}`;
      row.innerHTML = `<div style="font-size:20px;">${meta.icon}</div><div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:600;color:var(--gray-900)">${activity.title || 'Activity'}</div><div style="font-size:12px;color:${meta.color}">${activity.start_time || activity.start_date || 'Time unavailable'} • ${activity.details || activity.kind || 'Activity'}</div></div>`;
      el.appendChild(row);
    });
  }

  async function fetchUpcoming() {
    try {
      const res = await fetch(`${apiBase}/api/activities/upcoming`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Upcoming activities API failed');
      const items = await res.json();
      renderUpcoming(items);
    } catch (error) {
      console.warn('[My To-Do] Upcoming activities failed:', error);
      renderUpcoming([]);
    }
  }

  function renderDocuments(items) {
    const el = document.getElementById('pendingDocumentsList');
    if (!el) return;
    el.innerHTML = '';
    if (!Array.isArray(items) || items.length === 0) {
      el.innerHTML = emptyState('No pending documents');
      return;
    }

    items.slice(0, 5).forEach((doc) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '10px';
      row.style.padding = '10px';
      row.style.background = '#fff7ed';
      row.style.borderLeft = '3px solid #f59e0b';
      row.style.borderRadius = '8px';
      row.innerHTML = `<span style="font-size:18px;">⚠️</span><div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:600;color:var(--gray-900)">${doc.name || 'Document'}</div><div style="font-size:11px;color:var(--gray-500)">${doc.due_date || 'No due date'}</div></div>`;
      el.appendChild(row);
    });
  }

  async function fetchDocuments() {
    try {
      const res = await fetch(`${apiBase}/api/documents/pending`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Documents API failed');
      const items = await res.json();
      renderDocuments(items);
    } catch (error) {
      console.warn('[My To-Do] Documents failed:', error);
      renderDocuments([]);
    }
  }

  async function loadDashboard() {
    await Promise.all([
      fetchSummary(),
      fetchTodos(),
      fetchHighPriority(),
      fetchUpcoming(),
      fetchDocuments(),
    ]);
  }

  const addTodoBtn = document.getElementById('addTodoBtn');
  if (addTodoBtn) {
    addTodoBtn.addEventListener('click', async () => {
      const title = prompt('Task title');
      if (!title) return;
      await fetch(`${apiBase}/api/todos`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ title }),
      });
      await loadDashboard();
    });
  }

  loadDashboard();
  setInterval(loadDashboard, 60000);
});
