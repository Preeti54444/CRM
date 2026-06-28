// Simple performance dashboard using Chart.js
async function loadPerformanceDashboard(weekStart, employeeFilter) {
  try {
    const apiBase = getCRMApiBase()
    const token = (S && S.access_token) || (JSON.parse(localStorage.getItem('crm_session')||'{}').access_token)
    if (!token) return

    const headers = { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
    const resp = await fetch(`${apiBase}/performance/weekly?week_start=${encodeURIComponent(weekStart)}`, { headers })
    if (!resp.ok) return console.warn('Failed to fetch weekly reports')
    const data = await resp.json()

    // Map employee IDs to display names
    const employeesList = (typeof DataStore !== 'undefined' && DataStore.get) ? DataStore.get('employees') || [] : (JSON.parse(localStorage.getItem('crm_data')||'{}').employees || [])
    const idToName = {}
    employeesList.forEach(e => { idToName[String(e.id)] = e.name || e.email || String(e.id) })

    let filtered = data
    if (employeeFilter) {
      filtered = data.filter(r => {
        const name = idToName[String(r.employee_id)] || String(r.employee_id)
        return name.toLowerCase().includes(employeeFilter.toLowerCase()) || String(r.employee_id).toLowerCase().includes(employeeFilter.toLowerCase())
      })
    }

    // Build leaderboard chart
    const labels = filtered.map(r => idToName[String(r.employee_id)] || String(r.employee_id))
    const scores = filtered.map(r => r.performance_score)

    const ctx = document.getElementById('perfChart').getContext('2d')
    if (window._perfChart) window._perfChart.destroy()
    const zoneColor = (z) => z === 'green' ? 'rgba(16,185,129,0.8)' : (z === 'yellow' ? 'rgba(250,204,21,0.85)' : 'rgba(239,68,68,0.85)')
    const bgColors = filtered.map(r => zoneColor(r.zone))

    window._perfChart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Performance Score', data: scores, backgroundColor: bgColors, borderColor: bgColors.map(c => c.replace('0.8', '1')), borderWidth: 1 }] },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        onClick: (evt, activeEls) => {
          if (!activeEls || !activeEls.length) return
          const idx = activeEls[0].index
          const entry = window._perfLastData && window._perfLastData[idx]
          if (entry) {
            const weekStart = document.getElementById('perfWeekStart')?.value
            showEmployeeDrilldown(entry.employee_id, weekStart)
          }
        }
      }
    })

    // Render table
    const tbody = document.getElementById('perfTableBody')
    if (tbody) {
      tbody.innerHTML = filtered.map(r => {
        const name = idToName[String(r.employee_id)] || String(r.employee_id)
        return `<tr data-emp="${r.employee_id}"><td>${name}</td><td>${r.rank || ''}</td><td>${(r.performance_score||0).toFixed(2)}</td><td>${r.zone||''}</td></tr>`
      }).join('')
    }

    // Save last loaded data for export
    window._perfLastData = filtered.map(r => ({ employee_id: r.employee_id, name: idToName[String(r.employee_id)] || String(r.employee_id), rank: r.rank, score: r.performance_score, zone: r.zone }))
  } catch (e) {
    console.warn('Dashboard load error', e)
  }
}


  async function showEmployeeDrilldown(employeeId, weekStart) {
    try {
      const apiBase = getCRMApiBase()
      const token = (S && S.access_token) || (JSON.parse(localStorage.getItem('crm_session')||'{}').access_token)
      if (!token) return
      const headers = { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
      const resp = await fetch(`${apiBase}/performance/employee/${encodeURIComponent(employeeId)}/daily?week_start=${encodeURIComponent(weekStart)}`, { headers })
      if (!resp.ok) return console.warn('Failed to fetch employee daily data')
      const data = await resp.json()

      // Build modal
      let modal = document.getElementById('perfModal')
      if (!modal) {
        modal = document.createElement('div')
        modal.id = 'perfModal'
        modal.style.position = 'fixed'
        modal.style.inset = '0'
        modal.style.background = 'rgba(0,0,0,0.5)'
        modal.style.display = 'flex'
        modal.style.alignItems = 'center'
        modal.style.justifyContent = 'center'
        modal.style.zIndex = 2000
        document.body.appendChild(modal)
      }
      modal.innerHTML = `
        <div style="background:#fff;padding:16px;border-radius:8px;max-width:900px;width:96%;max-height:90%;overflow:auto;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <strong>Daily Performance — ${employeeId}</strong>
            <button id="perfModalClose" class="btn btn-secondary">Close</button>
          </div>
          <canvas id="perfModalChart" width="800" height="240"></canvas>
          <table class="perf-table" style="margin-top:10px;"><thead><tr><th>Date</th><th>Calls</th><th>Leads</th><th>Exploration</th><th>Achievement%</th><th>Zone</th></tr></thead><tbody id="perfModalTable"></tbody></table>
        </div>
      `

      document.getElementById('perfModalClose').addEventListener('click', () => { modal.remove() })

      const labels = data.map(d => d.date)
      const values = data.map(d => Number(d.achievement_percentage || 0))
      const ctx = document.getElementById('perfModalChart').getContext('2d')
      if (window._perfModalChart) window._perfModalChart.destroy()
      window._perfModalChart = new Chart(ctx, { type: 'line', data: { labels, datasets: [{ label: 'Achievement %', data: values, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.12)', tension: 0.2 }] }, options: { responsive: true } })

      const tbody = document.getElementById('perfModalTable')
      if (tbody) tbody.innerHTML = data.map(d => `<tr><td>${d.date}</td><td>${d.calls_completed}</td><td>${d.leads_created}</td><td>${d.exploration_calls}</td><td>${Number(d.achievement_percentage||0).toFixed(2)}</td><td>${d.zone||''}</td></tr>`).join('')

    } catch (e) {
      console.warn('Drilldown error', e)
    }
  }

function _downloadCSV(filename, rows) {
  if (!rows || !rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [headers.join(',')].concat(rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g,'""')}"`).join(','))).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function exportPerformanceCSV() {
  const rows = window._perfLastData || []
  _downloadCSV('performance_export.csv', rows)
}

function initPerformanceDashboard() {
  const container = document.getElementById('performanceDashboard')
  if (!container) return
  container.innerHTML = `
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
      <h3 style="margin:0;flex:1">Performance Dashboard</h3>
      <input type="date" id="perfWeekStart" style="padding:6px;border-radius:6px;border:1px solid var(--gray-100);" />
      <input type="text" id="perfEmployeeFilter" placeholder="Filter employee" style="padding:6px;border-radius:6px;border:1px solid var(--gray-100);min-width:180px;" />
      <button class="btn" id="perfRefreshBtn">Refresh</button>
      <button class="btn btn-secondary" id="perfExportBtn">Export CSV</button>
    </div>
    <canvas id="perfChart" width="600" height="200"></canvas>
    <table class="perf-table" style="margin-top:10px;"><thead><tr><th>Employee</th><th>Rank</th><th>Score</th><th>Zone</th></tr></thead><tbody id="perfTableBody"></tbody></table>
  `

  const today = new Date();
  const weekStart = new Date(today.setDate(today.getDate() - today.getDay())).toISOString().slice(0,10)
  const weekInput = document.getElementById('perfWeekStart')
  if (weekInput) weekInput.value = weekStart

  document.getElementById('perfRefreshBtn').addEventListener('click', () => {
    const ws = document.getElementById('perfWeekStart').value || weekStart
    const filter = document.getElementById('perfEmployeeFilter').value || ''
    loadPerformanceDashboard(ws, filter)
  })
  document.getElementById('perfExportBtn').addEventListener('click', exportPerformanceCSV)
  document.getElementById('perfEmployeeFilter').addEventListener('input', (e) => {
    const ws = document.getElementById('perfWeekStart').value || weekStart
    const filter = e.target.value || ''
    loadPerformanceDashboard(ws, filter)
  })

  // initial load
  loadPerformanceDashboard(weekStart, '')
}

// Expose init
window.initPerformanceDashboard = initPerformanceDashboard
