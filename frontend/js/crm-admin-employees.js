/**
 * CRM Admin Employees Management
 * Handles wiring admin employees panel with backend API
 * Shows login timings, activities, calls, and more
 */

class AdminEmployeesManager {
  constructor() {
    this.apiBase = window.API_CONFIG?.baseURL || window.API_BASE || (typeof getCRMApiBase === 'function' ? getCRMApiBase() : 'http://127.0.0.1:8085');
    this.employees = [];
    this.allEmployees = [];
    this.currentActivityFilter = 'all';
    this.refreshInterval = null;
    this.init();
  }

  async init() {
    if (!this.ensureAuthenticated()) return;
    this.setupEventListeners();
    await this.loadEmployees();
    this.startPeriodicRefresh();
  }

  startPeriodicRefresh() {
    // Disabled periodic refresh to prevent data from reverting
    // Data will only load once on page load and can be manually refreshed
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    console.log('[admin-employees] Periodic refresh disabled to prevent data reversion');
  }

  stopPeriodicRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  ensureAuthenticated() {
    const token = this.getAuthToken();
    if (!token) {
      if (typeof showToast === 'function') {
        showToast('Session expired or not authenticated. Redirecting to login.', 'error');
      }
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }

  setupEventListeners() {
    // Search
    const searchInput = document.getElementById('employeeSearch');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.filterEmployees());
    }

    // Filters
    document.getElementById('employeeRoleF')?.addEventListener('change', () => this.filterEmployees());
    document.getElementById('employeeStatusF')?.addEventListener('change', () => this.filterEmployees());
    document.getElementById('employeeDeptF')?.addEventListener('change', () => this.filterEmployees());
    document.getElementById('employeeDateF')?.addEventListener('change', () => this.filterEmployees());

    // Activity filter tabs
    document.getElementById('employeeNavTabs')?.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.currentActivityFilter = e.target.dataset.filter || 'all';
        this.updateActivityFilterUI();
        this.filterEmployees();
      });
    });
  }

  async loadEmployees() {
    try {
      const token = this.getAuthToken();
      if (!token) {
        showToast('Authentication required', 'error');
        window.location.href = 'login.html';
        return;
      }

      const response = await fetch(`${this.apiBase}/api/admin/employees/list`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        // Debug info for permission issues
        const bodyText = await response.text().catch(() => '')
        const sessionInfo = (() => {
          try {
            const s = JSON.parse(localStorage.getItem('crm_session') || '{}');
            return {
              id: s.id || null,
              email: s.email || null,
              role: s.role || null,
              backendAuth: !!s.backendAuth,
              tokenPreview: s.access_token ? String(s.access_token).slice(0, 10) + '...' : ''
            };
          } catch (e) {
            return { error: 'parse_failed' };
          }
        })();
        console.warn('[admin-employees] GET /api/admin/employees/list', response.status, response.statusText, '\nsession=', sessionInfo, '\nresponseBody=', bodyText);
        
        if (response.status === 401) {
          // Token expired - stop periodic refresh and redirect to login
          this.stopPeriodicRefresh();
          showToast('Session expired. Please login again.', 'error');
          setTimeout(() => {
            window.location.href = 'login.html';
          }, 2000);
          return;
        }
        
        if (response.status === 403) {
          showToast('You do not have permission to view this data', 'error');
          // Attempt to use local cached timer metrics to at least show recent values
          try {
            const cacheKey = 'crm_timer_metrics_cache'
            const cached = JSON.parse(localStorage.getItem(cacheKey) || '{}')
            const fallback = []
            Object.keys(cached || {}).forEach(k => {
              const m = cached[k]
              const id = String(m.user_id || '')
              const email = k.includes('@') ? k : ''
              fallback.push({
                id,
                email: email || id,
                name: email ? email.split('@')[0] : `user-${id.slice(0,6)}`,
                role: 'employee',
                department: 'Unknown',
                tasksAssigned: 0,
                status: 'inactive',
                loginTime: null,
                workSeconds: m.work_seconds || 0,
                callSeconds: m.call_seconds || 0,
                breakSeconds: m.break_seconds || 0,
                meetingSeconds: m.meeting_seconds || 0,
                callCount: m.call_count || 0,
                joinedDate: ''
              })
            })
            if (fallback.length) {
              this.allEmployees = fallback
              this.filterEmployees()
              this.updateEmployeeFilters()
              this.updateEmployeeCount()
              this.renderEmployeeOverview()
            }
          } catch (e) {
            console.warn('Failed to apply cached metrics after 403', e)
          }
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
        return;
      }

      this.allEmployees = await response.json();
      console.log('[admin-employees] Loaded employees:', this.allEmployees.length, this.allEmployees.map(e => e.name));
      // Normalize timestamps: ensure loginTime uses lastActive/logoutTime when missing
      try {
        (this.allEmployees || []).forEach(emp => {
          if (!emp.loginTime) emp.loginTime = emp.lastActive || emp.logoutTime || null;
        });
      } catch (e) {
        console.warn('Failed to normalize employee timestamps', e);
      }
      // Fetch timer metrics from backend and merge into employee objects
      try {
        const metResp = await fetch(`${this.apiBase}/api/timer-metrics`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (metResp.ok) {
          const metrics = await metResp.json();
          const metricsByUser = {};
          (metrics || []).forEach(m => { metricsByUser[String(m.user_id)] = m; });
          // Merge in any recent local cache entries (from crm-session-timer) to avoid UI flicker
          try {
            const cacheKey = 'crm_timer_metrics_cache'
            const cached = JSON.parse(localStorage.getItem(cacheKey) || '{}')
            Object.keys(cached || {}).forEach(k => { metricsByUser[String(k)] = cached[k] })
          } catch (e) {
            // ignore cache read failures
          }
          this.allEmployees = this.allEmployees.map(emp => {
            const m = metricsByUser[String(emp.id)];
            if (m) {
              emp.workSeconds = m.work_seconds || 0;
              emp.callSeconds = m.call_seconds || 0;
              emp.breakSeconds = m.break_seconds || 0;
              emp.meetingSeconds = m.meeting_seconds || 0;
              emp.callCount = m.call_count || 0;
            } else {
              emp.workSeconds = emp.workSeconds || 0;
              emp.callSeconds = emp.callSeconds || 0;
              emp.breakSeconds = emp.breakSeconds || 0;
              emp.meetingSeconds = emp.meetingSeconds || 0;
              emp.callCount = emp.callCount || 0;
            }
            return emp;
          });
        }
      } catch (e) {
        console.warn('Failed to fetch timer metrics:', e);
      }
      this.filterEmployees();
      this.updateEmployeeFilters();
      this.updateEmployeeCount();
      this.renderEmployeeOverview();
    } catch (error) {
      console.error('Error loading employees:', error);
      showToast('Error loading employees: ' + error.message, 'error');
    }
  }

  getAuthToken() {
    try {
      const session = JSON.parse(localStorage.getItem('crm_session') || '{}');
      return session.access_token;
    } catch {
      return null;
    }
  }

  updateActivityFilterUI() {
    const tabs = document.querySelectorAll('#employeeNavTabs button');
    tabs.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === this.currentActivityFilter);
    });
  }

  filterEmployees() {
    const searchTerm = (document.getElementById('employeeSearch')?.value || '').toLowerCase();
    const roleFilter = document.getElementById('employeeRoleF')?.value || '';
    const statusFilter = document.getElementById('employeeStatusF')?.value || '';
    const departmentFilter = document.getElementById('employeeDeptF')?.value || '';

    this.employees = this.allEmployees.filter(emp => {
      const matchesSearch =
        emp.name.toLowerCase().includes(searchTerm) ||
        emp.email.toLowerCase().includes(searchTerm) ||
        (emp.phone || '').toLowerCase().includes(searchTerm);

      const matchesRole = !roleFilter || emp.role === roleFilter;
      const matchesStatus = !statusFilter || emp.status === statusFilter;
      const matchesDepartment = !departmentFilter || emp.department === departmentFilter;

      return matchesSearch && matchesRole && matchesStatus && matchesDepartment;
    });

    // Apply activity filter
    if (this.currentActivityFilter === 'calls') {
      this.employees = this.employees.filter(emp => emp.callCount > 0);
    } else if (this.currentActivityFilter === 'leads') {
      this.employees = this.employees.filter(emp => emp.leadsCountToday > 0);
    } else if (this.currentActivityFilter === 'tasks') {
      this.employees = this.employees.filter(emp => emp.tasksAssigned > 0);
    } else if (this.currentActivityFilter === 'login') {
      // Consider recent activity fields as login indicator (loginTime or lastActive)
      this.employees = this.employees.filter(emp => emp.loginTime || emp.lastActive);
    }

    this.renderEmployees();
    this.updateEmployeeCount();
    this.renderEmployeeOverview();
  }

  updateEmployeeFilters() {
    const departmentSelect = document.getElementById('employeeDeptF');
    if (!departmentSelect) return;

    const selected = departmentSelect.value || '';
    const departments = [...new Set(this.allEmployees.map(emp => emp.department || 'Sales'))].sort();
    
    departmentSelect.innerHTML = '<option value="">All Departments</option>' +
      departments.map(dept => `<option value="${dept}">${dept}</option>`).join('');
    
    departmentSelect.value = selected;
  }

  formatSeconds(seconds) {
    const total = Number(seconds || 0);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  }

  formatTime(isoString) {
    if (!isoString) return 'Never';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      return `${dd}/${mm}/${yyyy}, ${hh}:${min}:${ss}`;
    } catch {
      return isoString;
    }
  }

  formatDate(dateStr) {
    if (!dateStr) return '';
    // Handle YYYY-MM-DD directly
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split('-');
      return `${d}/${m}/${y}`;
    }
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    } catch {
      return dateStr;
    }
  }

  updateEmployeeCount() {
    const count = this.employees.length;
    const countEl = document.getElementById('employeeCount');
    if (countEl) {
      countEl.textContent = `${count} employee${count !== 1 ? 's' : ''}`;
    }
  }

  renderEmployeeOverview() {
    const visibleEmployees = this.employees;
    
    const totalOnline = visibleEmployees.filter(emp => emp.status === 'active').length;
    const totalCalls = visibleEmployees.reduce((sum, emp) => sum + emp.callCount, 0);
    const totalLeads = visibleEmployees.reduce((sum, emp) => sum + emp.leadsCountToday, 0);
    const totalTasks = visibleEmployees.reduce((sum, emp) => sum + emp.tasksAssigned, 0);
    // Count employees with either explicit loginTime or recent activity (lastActive)
    const totalLogins = visibleEmployees.filter(emp => emp.loginTime || emp.lastActive).length;

    document.getElementById('employeeOverviewTotal').textContent = visibleEmployees.length;
    document.getElementById('employeeOverviewOnline').textContent = totalOnline;
    document.getElementById('employeeOverviewCalls').textContent = totalCalls;
    document.getElementById('employeeOverviewFetches').textContent = totalLeads;
    document.getElementById('employeeOverviewTasks').textContent = totalTasks;
    document.getElementById('employeeOverviewLogins').textContent = totalLogins;
  }

  renderEmployees() {
    const tbody = document.getElementById('employeesBody');
    if (!tbody) return;

    this.updateActivityFilterUI();

    if (this.employees.length === 0) {
      tbody.innerHTML = '<tr><td colspan="14" style="text-align: center; padding: 20px; color: var(--gray-500);">No employees found</td></tr>';
      return;
    }

    tbody.innerHTML = this.employees.map(emp => {
      const encodedEmail = encodeURIComponent(emp.email);
      // Prefer `loginTime`, fall back to `lastActive` or `logoutTime` when available
      const lastSeen = emp.loginTime || emp.lastActive || emp.logoutTime || null;
      const loginTime = lastSeen ? this.formatTime(lastSeen) : 'Never';
      const remoteIndicator = emp.isRemoteLogin ? '<div style="font-size:11px;color:#7c3aed;margin-top:4px;">Logged in from another device</div>' : '';

      return `
        <tr>
          <td><strong>${emp.name}</strong></td>
          <td>${emp.email}</td>
          <td>${emp.phone}</td>
          <td><span style="background: var(--maroon-light); color: var(--maroon); padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">${emp.role.toUpperCase()}</span></td>
          <td>${emp.department}</td>
          <td style="font-weight:600;color:var(--gray-900);">${emp.tasksAssigned}</td>
          <td><span style="background: ${emp.status === 'active' ? '#d4edda' : '#f8d7da'}; color: ${emp.status === 'active' ? '#155724' : '#721c24'}; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${emp.status}</span></td>
          <td>
            ${loginTime}
            ${remoteIndicator}
          </td>
          <td>${this.formatSeconds(emp.workSeconds)}</td>
          <td>${emp.callCount} / ${this.formatSeconds(emp.callSeconds)}</td>
          <td>${this.formatSeconds(emp.breakSeconds)}</td>
          <td>${this.formatSeconds(emp.meetingSeconds || 0)}</td>
          <td>${this.formatDate(emp.joinedDate)}</td>
          <td>
            <button class="btn btn-sm" onclick="adminEmployeesManager.toggleEmployeeDetails('${encodedEmail}')" style="padding: 4px 8px; font-size: 12px; margin-right: 4px;">Timeline</button>
            <button class="btn btn-sm" onclick="adminEmployeesManager.showEmployeeProfile('${emp.id}')" style="padding: 4px 8px; font-size: 12px; margin-right: 4px;">View</button>
            <button class="btn btn-sm" onclick="adminEmployeesManager.deleteEmployee('${emp.id}')" style="padding: 4px 8px; font-size: 12px; background: #f8d7da; color: #721c24;">Delete</button>
          </td>
        </tr>
        <tr id="detailsRow-${encodeURIComponent(emp.email)}" style="display:none;background:#f9fafb;">
          <td colspan="14" style="padding:12px 0;">
            <div style="padding:14px;background:#fcfcfd;border-radius:12px;border:1px solid var(--gray-200);min-height:200px;">
              <div style="text-align:center;color:var(--gray-500);">Loading timeline...</div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  async toggleEmployeeDetails(encodedEmail) {
    const email = decodeURIComponent(encodedEmail);
    const detailsRow = document.getElementById(`detailsRow-${encodedEmail}`);
    if (!detailsRow) return;

    if (detailsRow.style.display === 'table-row') {
      detailsRow.style.display = 'none';
      return;
    }

    // Load and display timeline
    const emp = this.employees.find(e => e.email === email);
    if (!emp) return;

    detailsRow.style.display = 'table-row';
    const contentCell = detailsRow.querySelector('td');
    contentCell.innerHTML = '<div style="text-align:center;color:var(--gray-500);">Loading activity timeline...</div>';

    try {
      const detailsHTML = await this.getEmployeeTimelineHTML(emp);
      contentCell.innerHTML = detailsHTML;
    } catch (error) {
      contentCell.innerHTML = `<div style="color:var(--gray-500);">Error loading timeline: ${error.message}</div>`;
    }
  }

  async getEmployeeTimelineHTML(emp) {
    const token = this.getAuthToken();
    const response = await fetch(`${this.apiBase}/api/admin/employees/${emp.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to load employee details');

    const details = await response.json();

    const activityHTML = `
      <div style="padding:14px;background:#fcfcfd;border-radius:12px;border:1px solid var(--gray-200);">
        <div style="display:grid;grid-template-columns:repeat(4,minmax(120px,1fr));gap:10px;margin-bottom:14px;">
          <div style="background:#fff;border:1px solid var(--gray-200);border-radius:12px;padding:12px;">
            <div style="font-size:11px;color:var(--gray-500);text-transform:uppercase;letter-spacing:.06em;">Call logs</div>
            <div style="margin-top:8px;font-size:18px;font-weight:700;">${details.activity.callsToday}</div>
          </div>
          <div style="background:#fff;border:1px solid var(--gray-200);border-radius:12px;padding:12px;">
            <div style="font-size:11px;color:var(--gray-500);text-transform:uppercase;letter-spacing:.06em;">Lead fetches</div>
            <div style="margin-top:8px;font-size:18px;font-weight:700;">${details.activity.leadsToday}</div>
          </div>
          <div style="background:#fff;border:1px solid var(--gray-200);border-radius:12px;padding:12px;">
            <div style="font-size:11px;color:var(--gray-500);text-transform:uppercase;letter-spacing:.06em;">Tasks assigned</div>
            <div style="margin-top:8px;font-size:18px;font-weight:700;">${details.activity.tasksAssigned}</div>
          </div>
          <div style="background:#fff;border:1px solid var(--gray-200);border-radius:12px;padding:12px;">
            <div style="font-size:11px;color:var(--gray-500);text-transform:uppercase;letter-spacing:.06em;">Status</div>
            <div style="margin-top:8px;font-size:18px;font-weight:700;">${emp.status}</div>
          </div>
        </div>

        <div style="font-weight:600;color:var(--gray-700);margin-bottom:10px;">Recent Activity</div>
        
        ${details.recentCalls.length > 0 ? `
          <div style="margin-bottom:16px;">
            <div style="font-weight:600;color:var(--gray-900);font-size:13px;margin-bottom:8px;">Recent Calls (${details.recentCalls.length})</div>
            ${details.recentCalls.map(call => `
              <div style="padding:10px;background:#fff;border:1px solid var(--gray-200);border-radius:8px;margin-bottom:6px;font-size:12px;">
                <div style="font-weight:600;color:var(--gray-900);">${call.customer}</div>
                <div style="color:var(--gray-600);margin-top:4px;font-size:11px;">
                  ${this.formatTime(call.date)} • ${call.duration}s • ${call.outcome}
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${details.recentLeads.length > 0 ? `
          <div style="margin-bottom:16px;">
            <div style="font-weight:600;color:var(--gray-900);font-size:13px;margin-bottom:8px;">Recent Leads (${details.recentLeads.length})</div>
            ${details.recentLeads.map(lead => `
              <div style="padding:10px;background:#fff;border:1px solid var(--gray-200);border-radius:8px;margin-bottom:6px;font-size:12px;">
                <div style="font-weight:600;color:var(--gray-900);">${lead.company}</div>
                <div style="color:var(--gray-600);margin-top:4px;font-size:11px;">
                  ${this.formatTime(lead.date)} • ₹${lead.amount.toLocaleString()} • ${lead.status}
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${details.assignedTasks.length > 0 ? `
          <div>
            <div style="font-weight:600;color:var(--gray-900);font-size:13px;margin-bottom:8px;">Assigned Tasks (${details.assignedTasks.length})</div>
            ${details.assignedTasks.map(task => {
              const isOverdue = task.isOverdue;
              const bgColor = task.status === 'completed' ? '#d4edda' : (isOverdue ? '#f8d7da' : '#fff');
              return `
                <div style="padding:10px;background:${bgColor};border:1px solid var(--gray-200);border-radius:8px;margin-bottom:6px;font-size:12px;">
                  <div style="font-weight:600;color:var(--gray-900);">${task.title}</div>
                  <div style="color:var(--gray-600);margin-top:4px;font-size:11px;">
                    Due: ${task.dueDate} • ${task.priority} • ${task.status}${isOverdue ? ' (OVERDUE)' : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}
      </div>
    `;

    return activityHTML;
  }

  async showEmployeeProfile(employeeId) {
    try {
      const token = this.getAuthToken();
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      const response = await fetch(`${this.apiBase}/api/admin/employees/${employeeId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        showToast('Error loading employee profile', 'error');
        return;
      }

      const details = await response.json();
      const panel = document.getElementById('employeeProfilePanel');
      const content = document.getElementById('employeeProfileContent');

      if (!panel || !content) {
        showToast('Profile panel not found in DOM', 'error');
        return;
      }

      content.innerHTML = `
        <div style="display:grid;gap:20px;">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;min-width:0;">
            <!-- Employee Info -->
            <div style="background:#fff;border:1px solid var(--gray-200);border-radius:12px;padding:18px;min-width:0;">
              <div style="font-size:16px;font-weight:700;color:var(--gray-900);margin-bottom:14px;">Employee Information</div>
              <div style="display:grid;gap:12px;font-size:14px;">
                <div><div style="font-size:12px;color:var(--gray-500);font-weight:600;">Name</div><div style="margin-top:4px;color:var(--gray-900);">${details.name}</div></div>
                <div><div style="font-size:12px;color:var(--gray-500);font-weight:600;">Email</div><div style="margin-top:4px;color:var(--gray-900);">${details.email}</div></div>
                <div><div style="font-size:12px;color:var(--gray-500);font-weight:600;">Phone</div><div style="margin-top:4px;color:var(--gray-900);">${details.phone}</div></div>
                <div><div style="font-size:12px;color:var(--gray-500);font-weight:600;">Role</div><div style="margin-top:4px;color:var(--gray-900);">${details.role.toUpperCase()}</div></div>
                <div><div style="font-size:12px;color:var(--gray-500);font-weight:600;">Department</div><div style="margin-top:4px;color:var(--gray-900);">${details.department}</div></div>
                <div><div style="font-size:12px;color:var(--gray-500);font-weight:600;">Status</div><div style="margin-top:4px;"><span style="background: ${details.status === 'active' ? '#d4edda' : '#f8d7da'}; color: ${details.status === 'active' ? '#155724' : '#721c24'}; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${details.status}</span></div></div>
                <div><div style="font-size:12px;color:var(--gray-500);font-weight:600;">Joined</div><div style="margin-top:4px;color:var(--gray-900);">${details.joinedDate}</div></div>
                <div><div style="font-size:12px;color:var(--gray-500);font-weight:600;">Last Active</div><div style="margin-top:4px;color:var(--gray-900);">${this.formatTime(details.lastActive)}</div></div>
              </div>
            </div>

            <!-- Performance Metrics -->
            <div style="background:#fff;border:1px solid var(--gray-200);border-radius:12px;padding:18px;min-width:0;">
              <div style="font-size:16px;font-weight:700;color:var(--gray-900);margin-bottom:14px;">Performance Metrics</div>
              <div style="display:grid;gap:12px;font-size:14px;">
                <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray-600);">Calls Today</span><strong style="color:var(--gray-900);">${details.activity.callsToday}</strong></div>
                <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray-600);">Calls Week</span><strong style="color:var(--gray-900);">${details.activity.callsWeek}</strong></div>
                <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray-600);">Leads Today</span><strong style="color:var(--gray-900);">${details.activity.leadsToday}</strong></div>
                <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray-600);">Leads Week</span><strong style="color:var(--gray-900);">${details.activity.leadsWeek}</strong></div>
                <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray-600);">Tasks Assigned</span><strong style="color:var(--gray-900);">${details.activity.tasksAssigned}</strong></div>
                <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray-600);">Tasks Completed</span><strong style="color:var(--gray-900);">${details.activity.tasksCompleted}</strong></div>
                <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray-600);">Completion Rate</span><strong style="color:var(--gray-900);">${details.activity.completionRate.toFixed(1)}%</strong></div>
                <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray-600);">Work Time</span><strong style="color:var(--gray-900);">${this.formatSeconds(details.workSeconds)}</strong></div>
              </div>
            </div>

            <!-- Login Info -->
            <div style="background:#fff;border:1px solid var(--gray-200);border-radius:12px;padding:18px;min-width:0;">
              <div style="font-size:16px;font-weight:700;color:var(--gray-900);margin-bottom:14px;">Session Information</div>
              <div style="display:grid;gap:12px;font-size:14px;">
                <div><div style="font-size:12px;color:var(--gray-500);font-weight:600;">Current Status</div><div style="margin-top:4px;color:var(--gray-900);">${details.status.toUpperCase()}</div></div>
                <div><div style="font-size:12px;color:var(--gray-500);font-weight:600;">Login Time</div><div style="margin-top:4px;color:var(--gray-900);">${this.formatTime(details.loginTime)}</div></div>
                <div><div style="font-size:12px;color:var(--gray-500);font-weight:600;">Logout Time</div><div style="margin-top:4px;color:var(--gray-900);">${this.formatTime(details.logoutTime) || 'Still logged in'}</div></div>
                <div><div style="font-size:12px;color:var(--gray-500);font-weight:600;">Remote Login</div><div style="margin-top:4px;color:var(--gray-900);">${details.isRemoteLogin ? 'Yes' : 'No'}</div></div>
                <div><div style="font-size:12px;color:var(--gray-500);font-weight:600;">Break Time</div><div style="margin-top:4px;color:var(--gray-900);">${this.formatSeconds(details.breakSeconds)}</div></div>
              </div>
            </div>
          </div>

          <!-- Recent Activity -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
            <div style="background:#fff;border:1px solid var(--gray-200);border-radius:12px;padding:18px;min-width:0;">
              <div style="font-size:14px;font-weight:700;color:var(--gray-900);margin-bottom:12px;">Recent Calls (${details.recentCalls.length})</div>
              ${details.recentCalls.length === 0 ? '<div style="color:var(--gray-500);font-size:13px;">No calls recorded</div>' : details.recentCalls.slice(0, 5).map(call => `
                <div style="border-bottom:1px solid var(--gray-200);padding:10px 0;font-size:13px;">
                  <div style="font-weight:600;color:var(--gray-900);">${call.customer}</div>
                  <div style="color:var(--gray-600);margin-top:4px;font-size:11px;">
                    ${this.formatTime(call.date)} • ${call.duration}s • ${call.outcome}
                  </div>
                </div>
              `).join('')}
            </div>

            <div style="background:#fff;border:1px solid var(--gray-200);border-radius:12px;padding:18px;min-width:0;">
              <div style="font-size:14px;font-weight:700;color:var(--gray-900);margin-bottom:12px;">Recent Leads (${details.recentLeads.length})</div>
              ${details.recentLeads.length === 0 ? '<div style="color:var(--gray-500);font-size:13px;">No leads created</div>' : details.recentLeads.slice(0, 5).map(lead => `
                <div style="border-bottom:1px solid var(--gray-200);padding:10px 0;font-size:13px;">
                  <div style="font-weight:600;color:var(--gray-900);">${lead.company}</div>
                  <div style="color:var(--gray-600);margin-top:4px;font-size:11px;">
                    ${this.formatTime(lead.date)} • ₹${lead.amount.toLocaleString()} • ${lead.status}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;

      panel.style.display = 'block';
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      console.error('Error showing profile:', error);
      showToast('Error loading employee profile', 'error');
    }
  }

  async deleteEmployee(employeeId) {
    if (!confirm('Are you sure you want to deactivate this employee?')) return;

    try {
      const token = this.getAuthToken();
      const response = await fetch(`${this.apiBase}/api/admin/employees/${employeeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        showToast('Error deactivating employee', 'error');
        return;
      }

      showToast('Employee deactivated successfully', 'success');
      await this.loadEmployees();
    } catch (error) {
      console.error('Error deactivating employee:', error);
      showToast('Error deactivating employee', 'error');
    }
  }
}

// Initialize on page load
let adminEmployeesManager;
function initAdminEmployees() {
  if (!adminEmployeesManager) {
    adminEmployeesManager = new AdminEmployeesManager();
    // expose on window for other modules that expect global renderer
    try { window.adminEmployeesManager = adminEmployeesManager; } catch (e) {}
  }
  // ensure function is available on window too (script may be loaded as module)
  try { window.initAdminEmployees = initAdminEmployees; } catch (e) {}
}

// Initialize when navigating to employees section
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (document.getElementById('sec-employees')?.classList.contains('active')) {
      initAdminEmployees();
    }
  }, 100);
});

// Also initialize when nav changes
if (typeof window !== 'undefined' && window.nav) {
  const originalNav = window.nav;
  window.nav = function(btn) {
    originalNav(btn);
    if (btn?.dataset?.sec === 'employees') {
      setTimeout(initAdminEmployees, 100);
    } else {
      // Stop periodic refresh when navigating away from employees section
      if (window.adminEmployeesManager) {
        window.adminEmployeesManager.stopPeriodicRefresh();
      }
    }
  };
}

// Expose function for onclick handlers
function loadEmployees() {
  if (adminEmployeesManager) {
    adminEmployeesManager.loadEmployees();
  } else {
    initAdminEmployees();
  }
}

function deleteEmployee(email) {
  if (adminEmployeesManager) {
    const emp = adminEmployeesManager.employees.find(e => e.email === email);
    if (emp) {
      adminEmployeesManager.deleteEmployee(emp.id);
    }
  }
}

function showEmployeeProfile(email) {
  if (adminEmployeesManager) {
    const emp = adminEmployeesManager.employees.find(e => e.email === email);
    if (emp) {
      adminEmployeesManager.showEmployeeProfile(emp.id);
    }
  }
}

function filterEmployees() {
  if (adminEmployeesManager) {
    adminEmployeesManager.filterEmployees();
  }
}

function setEmployeeActivityFilter(filter) {
  if (adminEmployeesManager) {
    adminEmployeesManager.currentActivityFilter = filter;
    adminEmployeesManager.updateActivityFilterUI();
    adminEmployeesManager.filterEmployees();
  }
}

// Ensure initialization even if nav/state changed before scripts loaded.
// This attempts to init after load and again shortly after to handle SPA nav timing.
window.addEventListener('load', () => setTimeout(initAdminEmployees, 150));
setTimeout(initAdminEmployees, 300);
// Also expose init for modules that access window.initAdminEmployees
try { window.initAdminEmployees = initAdminEmployees; } catch (e) {}

// Robust initializer: attempt to init when the employees section is present or becomes active.
(function robustInitAdminEmployees() {
  function tryInit() {
    try {
      if (window.adminEmployeesManager) return true;
      const sec = document.getElementById('sec-employees');
      if (sec) {
        initAdminEmployees();
        return !!window.adminEmployeesManager;
      }
    } catch (e) {
      console.warn('adminEmployees init attempt failed:', e);
    }
    return false;
  }

  if (tryInit()) return;

  const observer = new MutationObserver(() => {
    if (tryInit()) observer.disconnect();
  });
  observer.observe(document.documentElement || document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

  // Final fallback attempt after short delay
  setTimeout(() => { tryInit(); observer.disconnect(); }, 1000);
})();
