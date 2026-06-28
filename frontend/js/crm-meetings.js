// ═══════════════════════════════════════════════════════════════
// COMPREHENSIVE MEETINGS MANAGEMENT MODULE
// Production-Ready Meetings Dashboard, Calendar, MOM, AI Integration
// ═══════════════════════════════════════════════════════════════

let currentMeetingFilter = 'all'
let currentMeetingCalendarView = 'month'
let selectedMeetingForDetails = null
let meetingFormMode = 'create' // 'create' or 'edit'

// Initialize meetings module when page loads
function initMeetingsModule() {
  if (typeof DataStore === 'undefined') return
  ensureMeetingsCollections()
  showUpcomingMeetingReminder()
}

// Ensure all meetings collections exist in DataStore
function ensureMeetingsCollections() {
  const data = DataStore.getAll()
  if (!data.meetings) data.meetings = []
  if (!data.meetingParticipants) data.meetingParticipants = []
  if (!data.meetingAttendance) data.meetingAttendance = []
  if (!data.meetingNotes) data.meetingNotes = []
  if (!data.meetingAttachments) data.meetingAttachments = []
  if (!data.meetingActivities) data.meetingActivities = []
  if (!data.meetingMOMs) data.meetingMOMs = []
  DataStore.saveAll(data)
}


// ═══════════════════════════════════════════════════════════════
// MEETINGS DASHBOARD - KPI Cards & Main Render
// ═══════════════════════════════════════════════════════════════

function renderMeetingsDashboard() {
  const topTitle = document.getElementById('topTitle')
  if (topTitle) topTitle.textContent = 'Meetings Management'

  renderMeetingsKPICards()
  renderMeetingsTable()
  renderMeetingsCalendarView()
}

function renderMeetingsKPICards() {
  const meetings = DataStore.get('meetings') || []
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(new Date().getTime() + 86400000).toISOString().split('T')[0]

  // Calculate KPIs
  const todayMeetings = meetings.filter(m => m.date === today && ['scheduled', 'in-progress'].includes(m.status)).length
  const upcomingMeetings = meetings.filter(m => m.date >= tomorrow && m.status !== 'cancelled').length
  const completedMeetings = meetings.filter(m => m.status === 'completed').length
  const pendingMOM = meetings.filter(m => m.status === 'completed' && !m.momGenerated).length
  const totalParticipants = meetings.reduce((sum, m) => sum + (m.participants?.length || 0), 0)
  const avgDuration = meetings.length > 0 
    ? Math.round(meetings.reduce((sum, m) => sum + (m.duration || 0), 0) / meetings.length) 
    : 0

  const kpiCards = document.getElementById('meetingKPICards')
  if (!kpiCards) return

  kpiCards.innerHTML = `
    <div class="kpi-card-modern" style="animation:slideInUp 0.5s ease 0s;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
        <div>
          <div style="font-size:12px;color:var(--gray-600);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Today's Meetings</div>
          <div style="font-size:40px;font-weight:800;color:#667eea;line-height:1;">${todayMeetings}</div>
        </div>
        <div style="width:48px;height:48px;background:linear-gradient(135deg,#667eea15,#764ba215);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;">📅</div>
      </div>
      <div style="padding:10px 0;border-top:1px solid var(--gray-100);">
        <div style="font-size:12px;color:var(--gray-500);">Scheduled for today</div>
      </div>
    </div>

    <div class="kpi-card-modern" style="animation:slideInUp 0.5s ease 0.05s;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
        <div>
          <div style="font-size:12px;color:var(--gray-600);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Upcoming</div>
          <div style="font-size:40px;font-weight:800;color:#f5576c;line-height:1;">${upcomingMeetings}</div>
        </div>
        <div style="width:48px;height:48px;background:linear-gradient(135deg,#f5576c15,#f0937b15);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;">⏱️</div>
      </div>
      <div style="padding:10px 0;border-top:1px solid var(--gray-100);">
        <div style="font-size:12px;color:var(--gray-500);">Next 30 days</div>
      </div>
    </div>

    <div class="kpi-card-modern" style="animation:slideInUp 0.5s ease 0.1s;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
        <div>
          <div style="font-size:12px;color:var(--gray-600);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Completed</div>
          <div style="font-size:40px;font-weight:800;color:#10b981;line-height:1;">${completedMeetings}</div>
        </div>
        <div style="width:48px;height:48px;background:linear-gradient(135deg,#10b98115,#34d39915);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;">✓</div>
      </div>
      <div style="padding:10px 0;border-top:1px solid var(--gray-100);">
        <div style="font-size:12px;color:var(--gray-500);">Total completed</div>
      </div>
    </div>

    <div class="kpi-card-modern" style="animation:slideInUp 0.5s ease 0.15s;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
        <div>
          <div style="font-size:12px;color:var(--gray-600);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Pending MOM</div>
          <div style="font-size:40px;font-weight:800;color:#f59e0b;line-height:1;">${pendingMOM}</div>
        </div>
        <div style="width:48px;height:48px;background:linear-gradient(135deg,#f59e0b15,#fbbf2415);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;">📝</div>
      </div>
      <div style="padding:10px 0;border-top:1px solid var(--gray-100);">
        <div style="font-size:12px;color:var(--gray-500);">Awaiting documentation</div>
      </div>
    </div>

    <div class="kpi-card-modern" style="animation:slideInUp 0.5s ease 0.2s;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
        <div>
          <div style="font-size:12px;color:var(--gray-600);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Participants</div>
          <div style="font-size:40px;font-weight:800;color:#8b5cf6;line-height:1;">${totalParticipants}</div>
        </div>
        <div style="width:48px;height:48px;background:linear-gradient(135deg,#8b5cf615,#a78bfa15);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;">👥</div>
      </div>
      <div style="padding:10px 0;border-top:1px solid var(--gray-100);">
        <div style="font-size:12px;color:var(--gray-500);">Across all meetings</div>
      </div>
    </div>

    <div class="kpi-card-modern" style="animation:slideInUp 0.5s ease 0.25s;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
        <div>
          <div style="font-size:12px;color:var(--gray-600);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Avg Duration</div>
          <div style="font-size:40px;font-weight:800;color:#ec4899;line-height:1;">${avgDuration}<span style="font-size:18px;">m</span></div>
        </div>
        <div style="width:48px;height:48px;background:linear-gradient(135deg,#ec489915,#f472b615);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;">⏱</div>
      </div>
      <div style="padding:10px 0;border-top:1px solid var(--gray-100);">
        <div style="font-size:12px;color:var(--gray-500);">Per meeting</div>
      </div>
    </div>

    <style>
      @keyframes slideInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      .kpi-card-modern {
        background: white;
        border: 1px solid var(--gray-150, #f0f0f0);
        border-radius: 12px;
        padding: 20px;
        transition: all 0.3s cubic-bezier(0.23, 1, 0.320, 1);
        cursor: default;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      }

      .kpi-card-modern:hover {
        border-color: var(--gray-300);
        box-shadow: 0 8px 16px rgba(0,0,0,0.08);
        transform: translateY(-4px);
      }

      @media (max-width: 768px) {
        .kpi-card-modern {
          padding: 16px;
        }
      }
    </style>
  `
}

// ═══════════════════════════════════════════════════════════════
// MEETINGS TABLE - Search, Filter, Sort, Pagination, Export
// ═══════════════════════════════════════════════════════════════

function renderMeetingsTable() {
  let meetings = DataStore.get('meetings') || []
  const tableContainer = document.getElementById('meetingsTableContainer')
  if (!tableContainer) return

  // Filter by search
  const search = document.getElementById('meetingSearch')?.value?.toLowerCase() || ''
  if (search) {
    meetings = meetings.filter(m =>
      m.title.toLowerCase().includes(search) ||
      m.relatedClient?.toLowerCase().includes(search) ||
      m.relatedLender?.toLowerCase().includes(search) ||
      m.organizerName?.toLowerCase().includes(search)
    )
  }

  // Filter by status
  const statusFilter = document.getElementById('meetingStatusFilter')?.value || 'all'
  if (statusFilter !== 'all') {
    meetings = meetings.filter(m => m.status === statusFilter)
  }

  // Filter by type
  const typeFilter = document.getElementById('meetingTypeFilter')?.value || 'all'
  if (typeFilter !== 'all') {
    meetings = meetings.filter(m => m.type === typeFilter)
  }

  // Sort by date (upcoming first)
  meetings.sort((a, b) => new Date(a.date + ' ' + a.startTime) - new Date(b.date + ' ' + b.startTime))

  if (meetings.length === 0) {
    tableContainer.innerHTML = `
      <div style="padding:60px 40px;text-align:center;background:linear-gradient(135deg,var(--gray-50) 0%,white 100%);">
        <div style="font-size:48px;margin-bottom:16px;">📅</div>
        <div style="font-size:18px;font-weight:600;color:var(--gray-900);margin-bottom:8px;">No meetings found</div>
        <div style="font-size:14px;color:var(--gray-500);margin-bottom:24px;">Start by scheduling a new meeting</div>
        <button class="btn btn-primary" onclick="openMeetingForm()" style="padding:10px 24px;border-radius:8px;">+ Schedule Meeting</button>
      </div>
    `
    return
  }

  tableContainer.innerHTML = `
    <style>
      .meeting-row {
        display: grid;
        grid-template-columns: 80px 1fr 120px 140px 140px 180px 100px 120px 120px;
        gap: 16px;
        padding: 16px 20px;
        border-bottom: 1px solid var(--gray-100);
        align-items: center;
        transition: all 0.2s ease;
        border-left: 4px solid transparent;
      }

      .meeting-row:hover {
        background: var(--gray-50);
        border-left-color: var(--maroon);
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }

      .meeting-row.header {
        background: var(--gray-50);
        font-weight: 600;
        font-size: 12px;
        color: var(--gray-600);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 12px 20px;
        border: none;
        border-bottom: 2px solid var(--gray-200);
      }

      .meeting-row.header:hover {
        background: var(--gray-50);
        border-left-color: transparent;
      }

      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.3px;
      }

      .btn-action {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        font-size: 16px;
        transition: all 0.2s ease;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: var(--gray-100);
      }

      .btn-action:hover {
        background: var(--maroon);
        color: white;
        transform: scale(1.05);
      }

      .action-group {
        display: flex;
        gap: 6px;
        justify-content: center;
      }

      @media (max-width: 1200px) {
        .meeting-row {
          grid-template-columns: 1fr;
          gap: 12px;
          padding: 12px 16px;
        }
        .meeting-row.header {
          display: none;
        }
        .meeting-row::before {
          content: attr(data-label);
          font-weight: 600;
          color: var(--gray-600);
          font-size: 11px;
          text-transform: uppercase;
        }
      }
    </style>
    
    <div style="overflow-x:auto;background:white;border-radius:8px;border:1px solid var(--gray-200);">
      <div class="meeting-row header">
        <div>ID</div>
        <div>Title & Client</div>
        <div>Type</div>
        <div>Date & Time</div>
        <div>Lender</div>
        <div>Participants</div>
        <div>Status</div>
        <div>MOM</div>
        <div>Actions</div>
      </div>
      ${meetings.map((m, idx) => `
        <div class="meeting-row" style="animation:fadeIn 0.3s ease ${idx * 0.05}s;">
          <div style="font-size:11px;color:var(--gray-500);font-weight:600;font-family:monospace;">${m.id.substring(4, 10)}</div>
          <div>
            <div style="font-weight:600;color:var(--gray-900);margin-bottom:4px;">${m.title}</div>
            <div style="font-size:12px;color:var(--gray-500);">${m.relatedClient || m.relatedCase || '—'}</div>
          </div>
          <div><span style="background:${getMeetingTypeColor(m.type)}20;color:${getMeetingTypeColor(m.type)};padding:6px 10px;border-radius:6px;font-size:11px;font-weight:600;">${m.type}</span></div>
          <div>
            <div style="font-weight:500;color:var(--gray-900);">${m.date}</div>
            <div style="font-size:12px;color:var(--gray-500);">${m.startTime}–${m.endTime}</div>
          </div>
          <div style="font-size:13px;color:var(--gray-700);">${m.relatedLender || '—'}</div>
          <div style="text-align:center;"><span style="background:var(--gray-100);color:var(--gray-700);padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;">${m.participants?.length || 0} 👥</span></div>
          <div class="status-badge" style="background:${getMeetingStatusColor(m.status)}15;color:${getMeetingStatusColor(m.status)};">${m.status.toUpperCase()}</div>
          <div><span style="font-size:11px;${m.momGenerated ? 'color:#10b981;' : 'color:var(--gray-400);'}">${m.momGenerated ? '✓ Done' : '○ Pending'}</span></div>
          <div class="action-group">
            <button class="btn-action" onclick="viewMeetingDetails('${m.id}')" title="View" style="background:transparent;border:1px solid var(--gray-200);">👁️</button>
            <button class="btn-action" onclick="editMeeting('${m.id}')" title="Edit" style="background:transparent;border:1px solid var(--gray-200);">✏️</button>
            <button class="btn-action" onclick="deleteMeeting('${m.id}')" title="Delete" style="background:transparent;border:1px solid #ef44441a;color:#ef4444;">🗑️</button>
          </div>
        </div>
      `).join('')}
    </div>

    <div style="padding:16px 20px;border-top:1px solid var(--gray-200);background:var(--gray-50);display:flex;justify-content:space-between;align-items:center;border-radius:0 0 8px 8px;">
      <div style="font-size:13px;color:var(--gray-600);font-weight:500;">
        <strong>${meetings.length}</strong> meeting${meetings.length !== 1 ? 's' : ''}
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-outline" style="padding:8px 14px;font-size:12px;border-radius:6px;" onclick="exportMeetingsToExcel()">📊 Excel</button>
        <button class="btn btn-outline" style="padding:8px 14px;font-size:12px;border-radius:6px;" onclick="exportMeetingsToPDF()">📄 PDF</button>
      </div>
    </div>

    <style>
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    </style>
  `
}

// ═══════════════════════════════════════════════════════════════
// MEETINGS CALENDAR VIEW - FullCalendar Integration
// ═══════════════════════════════════════════════════════════════

function renderMeetingsCalendarView() {
  const calendarContainer = document.getElementById('meetingsCalendarContainer')
  if (!calendarContainer) return

  const meetings = DataStore.get('meetings') || []
  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()

  // Build calendar grid
  const firstDay = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate()

  let calendarHTML = `
    <style>
      .calendar-modern {
        background: white;
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid var(--gray-200);
      }

      .calendar-header {
        background: linear-gradient(135deg, var(--maroon) 0%, #a81d48 100%);
        color: white;
        padding: 24px;
        text-align: center;
        box-shadow: 0 4px 12px rgba(122, 5, 42, 0.15);
      }

      .calendar-header-title {
        font-size: 20px;
        font-weight: 700;
        letter-spacing: -0.5px;
      }

      .calendar-weekdays {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 1px;
        background: var(--gray-100);
        padding: 1px;
      }

      .weekday-name {
        background: var(--gray-50);
        padding: 12px 8px;
        text-align: center;
        font-weight: 600;
        color: var(--gray-600);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .calendar-days {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 1px;
        background: var(--gray-100);
        padding: 1px;
      }

      .calendar-day {
        aspect-ratio: 1;
        background: white;
        padding: 8px;
        display: flex;
        flex-direction: column;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
        overflow: hidden;
        min-height: 100px;
      }

      .calendar-day:hover {
        background: var(--gray-50);
        transform: scale(1.02);
      }

      .calendar-day.today {
        background: linear-gradient(135deg, var(--maroon)20, var(--maroon)10);
        border: 2px solid var(--maroon);
      }

      .calendar-day.other-month {
        background: var(--gray-50);
        color: var(--gray-300);
      }

      .calendar-day-number {
        font-weight: 600;
        font-size: 12px;
        margin-bottom: 4px;
        color: inherit;
      }

      .calendar-day-meetings {
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .calendar-meeting-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .calendar-meeting-dot:hover {
        transform: scale(1.3);
      }

      .calendar-meeting-count {
        font-size: 10px;
        color: var(--gray-500);
        margin-top: 2px;
      }

      @media (max-width: 768px) {
        .calendar-header-title {
          font-size: 16px;
        }
        .calendar-day {
          min-height: 80px;
          padding: 6px;
        }
      }
    </style>

    <div class="calendar-modern">
      <div class="calendar-header">
        <div class="calendar-header-title">${new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
      </div>

      <div class="calendar-weekdays">
        ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => `<div class="weekday-name">${d.substring(0, 3)}</div>`).join('')}
      </div>

      <div class="calendar-days">
        ${
          Array.from({ length: firstDay }).map((_, i) => {
            const day = daysInPrevMonth - firstDay + i + 1
            return `<div class="calendar-day other-month"><div class="calendar-day-number">${day}</div></div>`
          }).join('')
        }

        ${
          Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dayMeetings = meetings.filter(m => m.date === dateStr)
            const isToday = dateStr === today.toISOString().split('T')[0]

            return `
              <div class="calendar-day ${isToday ? 'today' : ''}" onclick="filterMeetingsByDate('${dateStr}')" title="Click to filter">
                <div class="calendar-day-number">${day}</div>
                <div class="calendar-day-meetings">
                  ${dayMeetings.slice(0, 2).map(m => `
                    <div class="calendar-meeting-dot" style="background-color: ${getMeetingTypeColor(m.type)};" title="${m.title}"></div>
                  `).join('')}
                  ${dayMeetings.length > 2 ? `<div class="calendar-meeting-count">+${dayMeetings.length - 2} more</div>` : ''}
                </div>
              </div>
            `
          }).join('')
        }

        ${
          (() => {
            const totalCells = firstDay + daysInMonth
            const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7)
            return Array.from({ length: remainingCells }).map((_, i) => {
              return `<div class="calendar-day other-month"><div class="calendar-day-number">${i + 1}</div></div>`
            }).join('')
          })()
        }
      </div>

      <div style="padding: 16px; background: var(--gray-50); border-top: 1px solid var(--gray-200); font-size: 12px; color: var(--gray-600);">
        <div style="display: flex; gap: 16px; flex-wrap: wrap;">
          ${meetings.filter(m => m.date === today.toISOString().split('T')[0]).length > 0 ? `
            <div style="display: flex; align-items: center; gap: 6px;">
              <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--maroon); box-shadow: 0 0 8px rgba(122, 5, 42, 0.4);"></div>
              <span>Today's meetings</span>
            </div>
          ` : ''}
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: #667eea;"></div>
            <span>Upcoming</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></div>
            <span>Completed</span>
          </div>
        </div>
      </div>
    </div>
  `

  calendarContainer.innerHTML = calendarHTML
}

// ═══════════════════════════════════════════════════════════════
// MEETING FORM - Create & Edit
// ═══════════════════════════════════════════════════════════════

function openMeetingForm() {
  meetingFormMode = 'create'
  clearMeetingForm()
  const modal = document.getElementById('meetingFormModal')
  if (modal) {
    modal.style.display = 'flex'
    modal.classList.add('open')
  }
}

function editMeeting(meetingId) {
  meetingFormMode = 'edit'
  selectedMeetingForDetails = meetingId
  const meeting = DataStore.getById('meetings', meetingId)
  if (!meeting) {
    showToast('Meeting not found', 'error')
    return
  }

  // Populate form
  document.getElementById('meetingFormTitle').textContent = `Edit Meeting: ${meeting.title}`
  document.getElementById('meetingTitle').value = meeting.title
  document.getElementById('meetingType').value = meeting.type
  document.getElementById('meetingDescription').value = meeting.description || ''
  document.getElementById('meetingDate').value = meeting.date
  document.getElementById('meetingStartTime').value = meeting.startTime
  document.getElementById('meetingEndTime').value = meeting.endTime
  document.getElementById('meetingOrganizer').value = meeting.organizer
  document.getElementById('meetingDepartment').value = meeting.department
  document.getElementById('meetingRelatedCase').value = meeting.relatedCase || ''
  document.getElementById('meetingRelatedClient').value = meeting.relatedClient || ''
  document.getElementById('meetingRelatedLender').value = meeting.relatedLender || ''
  document.getElementById('meetingPriority').value = meeting.priority
  document.getElementById('meetingMode').value = meeting.mode
  document.getElementById('meetingLink').value = meeting.meetingLink || ''
  document.getElementById('meetingAgenda').value = meeting.agenda || ''

  const modal = document.getElementById('meetingFormModal')
  if (modal) {
    modal.style.display = 'flex'
    modal.classList.add('open')
  }
}

function saveMeeting() {
  const title = document.getElementById('meetingTitle')?.value?.trim()
  const type = document.getElementById('meetingType')?.value
  const date = document.getElementById('meetingDate')?.value
  const startTime = document.getElementById('meetingStartTime')?.value
  const endTime = document.getElementById('meetingEndTime')?.value

  if (!title || !type || !date || !startTime || !endTime) {
    showToast('Please fill in all required fields', 'error')
    return
  }

  const meetingData = {
    title,
    type,
    description: document.getElementById('meetingDescription')?.value || '',
    date,
    startTime,
    endTime,
    duration: calculateDuration(startTime, endTime),
    organizer: document.getElementById('meetingOrganizer')?.value || S?.email,
    organizerName: S?.name || 'Admin',
    participants: (document.getElementById('meetingParticipants')?.value || '').split(',').map(p => p.trim()).filter(Boolean),
    department: document.getElementById('meetingDepartment')?.value,
    relatedCase: document.getElementById('meetingRelatedCase')?.value || '',
    relatedClient: document.getElementById('meetingRelatedClient')?.value || '',
    relatedLender: document.getElementById('meetingRelatedLender')?.value || '',
    priority: document.getElementById('meetingPriority')?.value || 'medium',
    mode: document.getElementById('meetingMode')?.value || 'Physical',
    meetingLink: document.getElementById('meetingLink')?.value || '',
    agenda: document.getElementById('meetingAgenda')?.value || '',
    status: 'scheduled',
    updatedAt: new Date().toISOString()
  }

  if (meetingFormMode === 'create') {
    meetingData.id = 'MTG-' + Date.now()
    meetingData.createdAt = new Date().toISOString()
    if (!meetingData.meetingLink && meetingData.mode !== 'Physical') {
      meetingData.meetingLink = generateMeetingLink(meetingData)
    }
    DataStore.add('meetings', meetingData)
    logMeetingActivity(meetingData.id, 'Meeting Created', `${meetingData.title} scheduled for ${meetingData.date}`)
    showToast('Meeting scheduled successfully!', 'success')
      // Schedule in user's calendar (create .ics and open Google Calendar add link)
      try { scheduleInCalendar(meetingData) } catch (e) { console.warn('Calendar scheduling failed', e) }
  } else {
    const editingId = selectedMeetingForDetails
    if (!editingId) {
      showToast('Unable to update meeting: no meeting selected', 'error')
      return
    }
    meetingData.id = editingId
    if (!meetingData.meetingLink && meetingData.mode !== 'Physical') {
      meetingData.meetingLink = generateMeetingLink(meetingData)
    }
    DataStore.update('meetings', editingId, meetingData)
    logMeetingActivity(editingId, 'Meeting Updated', `Meeting details updated`)
    showToast('Meeting updated successfully!', 'success')
  }

  closeMeetingForm()
  renderMeetingsDashboard()
  sendMeetingNotification(meetingData, meetingFormMode === 'create' ? 'scheduled' : 'updated')
}

// ===== Calendar integration helpers (client-side) =====
function pad(n){return String(n).padStart(2,'0')}
function toISOStringLocal(date, time) {
  // date: YYYY-MM-DD, time: HH:MM
  const [y,m,d] = date.split('-').map(Number)
  const [hh,mm] = time.split(':').map(Number)
  const dt = new Date(y, m-1, d, hh, mm, 0)
  return dt.toISOString() // in UTC
}

function formatGoogleDate(dateISO) {
  // convert ISO to YYYYMMDDTHHMMSSZ
  return dateISO.replace(/[-:]/g,'').split('.')[0] + 'Z'
}

function buildICS(meeting) {
  const uid = (meeting.id || 'mtg') + '@local'
  const dtStart = formatGoogleDate(toISOStringLocal(meeting.date, meeting.startTime))
  const dtEnd = formatGoogleDate(toISOStringLocal(meeting.date, meeting.endTime))
  const summary = (meeting.title || 'Meeting').replace(/\r|\n/g,' ')
  const description = (meeting.description || '') + (meeting.meetingLink ? ('\nJoin: ' + meeting.meetingLink) : '')
  const organizer = meeting.organizer || ''
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//crm//EN','BEGIN:VEVENT',`UID:${uid}`,`DTSTAMP:${formatGoogleDate(new Date().toISOString())}`,`DTSTART:${dtStart}`,`DTEND:${dtEnd}`,`SUMMARY:${escapeICSText(summary)}`,`DESCRIPTION:${escapeICSText(description)}`,`ORGANIZER:${organizer}`,'END:VEVENT','END:VCALENDAR'].join('\r\n')
}

function escapeICSText(s){ return String(s).replace(/\n/g,'\\n').replace(/,/g,'\\,') }

function downloadICS(filename, content){
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(()=>URL.revokeObjectURL(url), 5000)
}

function openGoogleCalendar(meeting) {
  const start = formatGoogleDate(toISOStringLocal(meeting.date, meeting.startTime))
  const end = formatGoogleDate(toISOStringLocal(meeting.date, meeting.endTime))
  const text = encodeURIComponent(meeting.title || 'Meeting')
  const details = encodeURIComponent((meeting.description || '') + (meeting.meetingLink ? '\nJoin: ' + meeting.meetingLink : ''))
  const location = encodeURIComponent(meeting.mode === 'Physical' ? (meeting.location || '') : (meeting.meetingLink || ''))
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}&location=${location}`
  window.open(url, '_blank')
}

function scheduleInCalendar(meeting) {
  // Create ICS and trigger download so user can add to any calendar
  try {
    const ics = buildICS(meeting)
    const filename = `${(meeting.title||'meeting').replace(/[^a-z0-9]/gi,'_').toLowerCase()}.ics`
    downloadICS(filename, ics)
  } catch (e) { console.warn('ICS generation failed', e) }
  // Also open Google Calendar prefill in new tab for convenience
  try { openGoogleCalendar(meeting) } catch (e) { console.warn('Open Google Calendar failed', e) }
}

// ===== Meeting day notifications =====
function notifyTodaysMeetings() {
  try {
    const today = new Date().toISOString().split('T')[0]
    const meetings = Array.isArray(DataStore.get('meetings')) ? DataStore.get('meetings') : []
    meetings.forEach(m => {
      if (!m || !m.date) return
      if (m.date === today && String(m.status || '').toLowerCase() === 'scheduled' && m.lastNotified !== today) {
        // In-app toast
        try { showToast(`Meeting today: ${m.title} at ${m.startTime}`, 'info') } catch (e) { console.log('toast failed', e) }

        // Browser notification if permitted
        try {
          if (window.Notification) {
            if (Notification.permission === 'granted') {
              const n = new Notification(m.title || 'Meeting', { body: `${m.startTime || ''} - ${m.endTime || ''}\n${m.description || ''}`, tag: m.id })
              n.onclick = function() { window.focus(); try { viewMeetingDetails(m.id) } catch (e){}; n.close() }
            } else if (Notification.permission !== 'denied') {
              Notification.requestPermission().then(p => { if (p === 'granted') { try { const n = new Notification(m.title || 'Meeting', { body: `${m.startTime || ''} - ${m.endTime || ''}\n${m.description || ''}`, tag: m.id }); n.onclick = function(){ window.focus(); try{viewMeetingDetails(m.id)}catch(e){}; n.close() } } catch(e){} } })
            }
          }
        } catch (e) { console.warn('Notification error', e) }

        // mark as notified for today to avoid duplicate notifications
        try { DataStore.update('meetings', m.id, { lastNotified: today }) } catch (e) { console.warn('mark notified failed', e) }
      }
    })
  } catch (err) { console.warn('notifyTodaysMeetings failed', err) }
}

// run check on load and then periodically
document.addEventListener('DOMContentLoaded', function(){
  setTimeout(notifyTodaysMeetings, 1000)
  // check every 15 minutes
  setInterval(notifyTodaysMeetings, 15 * 60 * 1000)
})

function clearMeetingForm() {
  document.getElementById('meetingFormTitle').textContent = 'Schedule New Meeting'
  ;['meetingTitle', 'meetingDescription', 'meetingParticipants', 'meetingRelatedCase', 'meetingRelatedClient', 'meetingRelatedLender', 'meetingLink', 'meetingAgenda'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.value = ''
  })

  const today = new Date().toISOString().split('T')[0]
  document.getElementById('meetingDate').value = today
  document.getElementById('meetingStartTime').value = '10:00'
  document.getElementById('meetingEndTime').value = '11:00'
  document.getElementById('meetingType').value = 'Follow-up'
  document.getElementById('meetingPriority').value = 'medium'
  document.getElementById('meetingMode').value = 'Physical'
  document.getElementById('meetingOrganizer').value = S?.email || 'admin@fundingsathi.com'
  document.getElementById('meetingDepartment').value = 'Sales'
  selectedMeetingForDetails = null
}

function closeMeetingForm() {
  const modal = document.getElementById('meetingFormModal')
  if (modal) {
    modal.classList.remove('open')
    modal.style.display = 'none'
  }
}

function calculateDuration(start, end) {
  const [startH, startM] = start.split(':').map(Number)
  const [endH, endM] = end.split(':').map(Number)
  return (endH * 60 + endM) - (startH * 60 + startM)
}

// ═══════════════════════════════════════════════════════════════
// MEETING DETAILS & ACTIVITIES
// ═══════════════════════════════════════════════════════════════

function viewMeetingDetails(meetingId) {
  const meeting = DataStore.getById('meetings', meetingId)
  if (!meeting) {
    showToast('Meeting not found', 'error')
    return
  }

  selectedMeetingForDetails = meetingId
  const modal = document.getElementById('meetingDetailsModal')
  if (!modal) return

  // Populate details
  document.getElementById('detailMeetingTitle').textContent = meeting.title
  document.getElementById('detailMeetingDate').textContent = meeting.date
  document.getElementById('detailMeetingTime').textContent = `${meeting.startTime} - ${meeting.endTime} (${meeting.duration} min)`
  document.getElementById('detailMeetingStatus').textContent = meeting.status.toUpperCase()
  document.getElementById('detailMeetingOrganizer').textContent = meeting.organizerName || meeting.organizer

  // Related info
  const relatedHTML = `
    ${meeting.relatedCase ? `<div style="margin-bottom:8px;"><strong>Case:</strong> <a href="#" onclick="navToCase('${meeting.relatedCase}')" style="color:var(--maroon);text-decoration:none;">${meeting.relatedCase}</a></div>` : ''}
    ${meeting.relatedClient ? `<div style="margin-bottom:8px;"><strong>Client:</strong> ${meeting.relatedClient}</div>` : ''}
    ${meeting.relatedLender ? `<div style="margin-bottom:8px;"><strong>Lender:</strong> ${meeting.relatedLender}</div>` : ''}
  `
  const relatedEl = document.getElementById('detailMeetingRelated')
  if (relatedEl) relatedEl.innerHTML = relatedHTML

  // Participants
  const participantsHTML = meeting.participants?.map(p => `<div style="background:var(--gray-100);padding:8px 12px;border-radius:6px;font-size:12px;">${p}</div>`).join('') || '<div style="color:var(--gray-400);">No participants</div>'
  const participantsEl = document.getElementById('detailMeetingParticipants')
  if (participantsEl) participantsEl.innerHTML = participantsHTML

  // Activity timeline
  const activities = DataStore.get('meetingActivities') || []
  const meetingActivities = activities.filter(a => a.meetingId === meetingId).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  const timelineHTML = meetingActivities.map(a => `
    <div style="padding:12px;border-left:3px solid var(--maroon);margin-bottom:8px;background:var(--gray-50);">
      <div style="font-weight:600;font-size:12px;color:var(--gray-900);">${a.action}</div>
      <div style="font-size:11px;color:var(--gray-500);margin-top:4px;">${a.description}</div>
      <div style="font-size:10px;color:var(--gray-400);margin-top:4px;">${new Date(a.timestamp).toLocaleString()}</div>
    </div>
  `).join('')
  const timelineEl = document.getElementById('detailMeetingActivity')
  if (timelineEl) timelineEl.innerHTML = timelineHTML || '<div style="color:var(--gray-400);font-size:12px;">No activities yet</div>'

  modal.style.display = 'flex'
  modal.classList.add('open')
}

function closeMeetingDetails() {
  const modal = document.getElementById('meetingDetailsModal')
  if (modal) {
    modal.classList.remove('open')
    modal.style.display = 'none'
  }
}

function logMeetingActivity(meetingId, action, description) {
  DataStore.add('meetingActivities', {
    meetingId,
    action,
    description,
    timestamp: new Date().toISOString()
  })
}

// ═══════════════════════════════════════════════════════════════
// MINUTES OF MEETING (MOM) GENERATION
// ═══════════════════════════════════════════════════════════════

function openMOMForm(meetingId) {
  const meeting = DataStore.getById('meetings', meetingId)
  if (!meeting) return

  if (meeting.status !== 'completed') {
    showToast('Only completed meetings can have MOM', 'error')
    return
  }

  selectedMeetingForDetails = meetingId
  document.getElementById('momMeetingTitle').textContent = meeting.title
  document.getElementById('momDate').value = meeting.date
  document.getElementById('momAttendees').value = (meeting.participants || []).join(', ')

  const modal = document.getElementById('momModal')
  if (modal) {
    modal.style.display = 'flex'
    modal.classList.add('open')
  }
}

function generateMOMWithAI(meetingId) {
  const meeting = DataStore.getById('meetings', meetingId)
  if (!meeting) return

  // Simulate AI MOM generation
  const aiSummary = `
    Meeting Summary:
    - ${meeting.title} held on ${meeting.date} with ${meeting.participants?.length || 0} participants
    - Key topics: ${meeting.agenda || 'Not specified'}
    - Duration: ${meeting.duration} minutes
    - Organizer: ${meeting.organizerName}
    
    Recommendations:
    - Follow up within 2-3 business days
    - Share discussion points with all participants
    - Assign action items to responsible parties
  `

  document.getElementById('momSummary').value = aiSummary
  showToast('AI-generated MOM preview loaded', 'info')
}

function saveMOM() {
  const meetingId = selectedMeetingForDetails
  const summary = document.getElementById('momSummary')?.value?.trim()
  const decisions = document.getElementById('momDecisions')?.value?.trim()
  const risks = document.getElementById('momRisks')?.value?.trim()
  const followUpDate = document.getElementById('momFollowUpDate')?.value

  if (!summary) {
    showToast('Please provide a meeting summary', 'error')
    return
  }

  DataStore.add('meetingMOMs', {
    meetingId,
    summary,
    decisions,
    risks,
    followUpDate,
    createdAt: new Date().toISOString(),
    createdBy: S?.email || 'admin'
  })

  DataStore.update('meetings', meetingId, { momGenerated: true })
  logMeetingActivity(meetingId, 'MOM Generated', 'Minutes of meeting documented')
  showToast('MOM saved successfully!', 'success')
  closeMOMForm()
  renderMeetingsDashboard()
}

function closeMOMForm() {
  const modal = document.getElementById('momModal')
  if (modal) {
    modal.classList.remove('open')
    modal.style.display = 'none'
  }
}

function exportMOMToPDF(meetingId) {
  const meeting = DataStore.getById('meetings', meetingId)
  const mom = DataStore.get('meetingMOMs')?.find(m => m.meetingId === meetingId)
  if (!meeting || !mom) return

  const content = `
MINUTES OF MEETING (MOM)

Meeting: ${meeting.title}
Date: ${meeting.date}
Time: ${meeting.startTime} - ${meeting.endTime}
Organizer: ${meeting.organizerName}
Participants: ${(meeting.participants || []).join(', ')}

SUMMARY:
${mom.summary}

DECISIONS TAKEN:
${mom.decisions || 'None'}

RISKS IDENTIFIED:
${mom.risks || 'None'}

FOLLOW-UP DATE: ${mom.followUpDate || 'TBD'}
  `

  // In real implementation, use a PDF library like jsPDF
  downloadAsFile('MOM_' + meeting.id + '.txt', content, 'text/plain')
  showToast('MOM exported successfully', 'success')
}

// ═══════════════════════════════════════════════════════════════
// ACTION ITEMS TO TASKS CONVERSION
// ═══════════════════════════════════════════════════════════════

function openActionItemsForm(meetingId) {
  selectedMeetingForDetails = meetingId
  const modal = document.getElementById('actionItemsModal')
  if (modal) {
    modal.style.display = 'flex'
    modal.classList.add('open')
  }
}

async function createTaskFromActionItem() {
  const taskTitle = document.getElementById('actionItemTitle')?.value?.trim()
  const assignTo = document.getElementById('actionItemAssignee')?.value
  const dueDate = document.getElementById('actionItemDueDate')?.value
  const priority = document.getElementById('actionItemPriority')?.value || 'medium'

  if (!taskTitle || !assignTo || !dueDate) {
    showToast('Please fill in all required fields', 'error')
    return
  }

  const meetingId = selectedMeetingForDetails
  const meeting = DataStore.getById('meetings', meetingId)
  const assigneeDetails = findUserDetails(assignTo)
  const assigneeEmail = assigneeDetails?.email || String(assignTo || '').trim()
  const assignedToId = resolveCRMUserId(assignTo)
  const assignedById = resolveCRMUserId(S?.email || S?.id || S?.user_id || S?.userId || S?.employee_id)
  if (!assignedToId) {
    showToast('Unable to resolve assignee to backend user ID', 'error')
    return
  }
  if (!assignedById) {
    showToast('Unable to resolve current user to backend user ID', 'error')
    return
  }

  const task = {
    title: taskTitle,
    description: `Action item from meeting: ${meeting?.title}`,
    assignedTo: assigneeEmail,
    assignedToId,
    dueDate,
    priority,
    status: 'pending',
    completed: false,
    type: 'task',
    relatedTo: meetingId ? String(meetingId) : '',
    relatedMeeting: meetingId,
    relatedCase: meeting?.relatedCase,
    assignedBy: S?.email || S?.name || 'admin',
    assignedById,
    assignedAt: new Date().toISOString()
  }

  // Save to backend FIRST - DataStore is only for caching
  try {
    const backendResult = await saveTaskToBackend(task)
    if (backendResult?.task_id) task.id = backendResult.task_id
    else if (backendResult?.id) task.id = backendResult.id
  } catch (err) {
    console.error('Action item task backend save failed:', err)
    showToast('Failed to save task to backend. Please try again.', 'error')
    return
  }

  // Only cache to DataStore AFTER successful backend save
  const savedTask = DataStore.add('tasks', task)

  logMeetingActivity(meetingId, 'Action Item Created', `Task "${taskTitle}" created and assigned to ${assignTo}`)
  showToast('Task created from action item!', 'success')
  clearActionItemForm()
  renderMeetingsDashboard()
}

function clearActionItemForm() {
  ;['actionItemTitle', 'actionItemDescription', 'actionItemAssignee', 'actionItemDueDate'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.value = ''
  })
  document.getElementById('actionItemPriority').value = 'medium'
}

function closeActionItemsForm() {
  const modal = document.getElementById('actionItemsModal')
  if (modal) {
    modal.classList.remove('open')
    modal.style.display = 'none'
  }
}

// ═══════════════════════════════════════════════════════════════
// MEETINGS FILTERING & HELPERS
// ═══════════════════════════════════════════════════════════════

function updateMeetingFilter(filterType, value) {
  if (filterType === 'search') {
    currentMeetingFilter = value
  }
  renderMeetingsTable()
}

function filterMeetingsByDate(dateStr) {
  document.getElementById('meetingSearch').value = dateStr
  renderMeetingsTable()
}

function deleteMeeting(meetingId) {
  if (!confirm('Delete this meeting?')) return
  DataStore.delete('meetings', meetingId)
  logMeetingActivity(meetingId, 'Meeting Deleted', 'Meeting cancelled and deleted')
  showToast('Meeting deleted', 'info')
  renderMeetingsDashboard()
}

function getMeetingTypeColor(type) {
  const colors = {
    'Client Meeting': '#2563eb',
    'Lender Meeting': '#10b981',
    'Internal Meeting': '#8b5cf6',
    'Follow-up': '#f97316',
    'Negotiation': '#ef4444',
    'Closing': '#06b6d4',
    'Product Demo': '#6366f1',
    'Introduction': '#ec4899'
  }
  return colors[type] || '#6b7280'
}

function getMeetingStatusColor(status) {
  const colors = {
    'scheduled': '#3b82f6',
    'confirmed': '#10b981',
    'in-progress': '#f59e0b',
    'completed': '#8b5cf6',
    'rescheduled': '#f97316',
    'cancelled': '#ef4444',
    'no-show': '#6b7280'
  }
  return colors[status] || '#6b7280'
}

function sendMeetingNotification(meeting, action) {
  const participants = Array.isArray(meeting.participants)
    ? meeting.participants.map(p => String(p).trim()).filter(Boolean)
    : String(meeting.participants || '').split(',').map(p => p.trim()).filter(Boolean)

  const notification = {
    type: 'meeting_' + action,
    title: action === 'scheduled' ? 'Meeting Scheduled' : 'Meeting Updated',
    message: `${meeting.title} on ${meeting.date} at ${meeting.startTime}`,
    relatedId: meeting.id,
    createdAt: new Date().toISOString(),
    read: false,
    recipients: participants,
    recipientEmail: participants.find(p => p.includes('@')) || '',
    recipientName: participants.find(p => !p.includes('@')) || ''
  }

  if (typeof createNotification === 'function') {
    createNotification(notification)
  } else {
    if (!DataStore.get('notifications')) {
      const data = DataStore.getAll()
      data.notifications = []
      DataStore.saveAll(data)
    }
    DataStore.add('notifications', notification)
    if (typeof updateNotificationBadge === 'function') updateNotificationBadge()
    if (typeof isNotificationForCurrentUser === 'function' && isNotificationForCurrentUser(notification)) {
      showToast(`${notification.title}: ${notification.message}`, 'info')
    }
  }

  const emailParticipants = participants.filter(p => p.includes('@'))
  if (emailParticipants.length === 0 && meeting.attendeeEmail) {
    emailParticipants.push(String(meeting.attendeeEmail).trim())
  }
  if (emailParticipants.length === 0) {
    return
  }

  if (!meeting.meetingLink && meeting.mode !== 'Physical') {
    meeting.meetingLink = generateMeetingLink(meeting)
    DataStore.update('meetings', meeting.id, { meetingLink: meeting.meetingLink })
  }

  const emailCount = emailParticipants.length
  let pendingEmails = emailCount
  emailParticipants.forEach(email => {
    sendMeetingLinkEmail(email, meeting, action)
      .finally(() => {
        pendingEmails -= 1
        if (pendingEmails === 0) {
          showToast(`Meeting link shared with ${emailCount} participant(s).`, 'info')
        }
      })
  })
}

function generateMeetingLink(meeting) {
  const slug = String(meeting.title || 'meeting').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  return `https://fundingsathi.com/meeting/${meeting.id || Date.now()}?topic=${encodeURIComponent(slug)}`
}

function sendMeetingLinkEmail(email, meeting, action) {
  const organizer = meeting.organizerName || meeting.organizer || 'Funding Sathi';
  const subject = `${action === 'invite' ? 'Meeting Invitation' : 'Meeting Update'}: ${meeting.title || 'Meeting'}`
  const message = [
    `Hello ${meeting.attendee || 'Valued Client'},`,
    '',
    action === 'invite'
      ? 'You are invited to a meeting.'
      : 'Here is the updated meeting information.',
    '',
    `Title: ${meeting.title || 'N/A'}`,
    `Date: ${meeting.date || 'N/A'}`,
    `Time: ${meeting.startTime || 'N/A'}${meeting.endTime ? ' - ' + meeting.endTime : ''}`,
    `Meeting Link: ${meeting.meetingLink || 'No meeting link provided'}`,
    `Agenda: ${meeting.agenda || 'No agenda provided'}`,
    `Notes: ${meeting.description || 'No additional notes'}`,
    '',
    `Organizer: ${organizer}`,
    '',
    'Please join on time or reach out if you need to reschedule.'
  ].join('\n')
  const payload = {
    to: email,
    subject,
    message,
    sender: S?.email || 'support@fundingsathi.com'
  }

  if (typeof postToCRMBackend !== 'function') {
    console.warn('Backend email helper is unavailable for meeting notifications', payload)
    return Promise.resolve()
  }

  return postToCRMBackend('send-email', payload)
    .then((result) => {
      if (result?.status !== 'success') {
        throw new Error(result?.message || 'Backend meeting email failed')
      }
      console.log(`Meeting notification sent to ${email}`)
    })
    .catch(err => {
      console.warn('Meeting email send failed:', err)
      showToast(`Email to ${email} could not be sent. Check backend connectivity.`, 'error')
    })
}

function showUpcomingMeetingReminder() {
  if (!S?.email) return
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().split('T')[0]
  const userEmail = String(S.email || '').toLowerCase()
  const userName = String(S.name || '').toLowerCase()
  const meetings = DataStore.get('meetings') || []

  const upcoming = meetings.filter(meeting => {
    const status = String(meeting.status || 'scheduled').toLowerCase()
    const isParticipant = (meeting.participants || []).some(p => {
      const normalized = String(p).trim().toLowerCase()
      return normalized === userEmail || normalized === userName
    })
    const isOrganizer = String(meeting.organizer || '').toLowerCase() === userEmail || String(meeting.organizerName || '').toLowerCase() === userName
    return ['scheduled', 'confirmed', 'in-progress'].includes(status)
      && [today, tomorrow].includes(meeting.date)
      && (isParticipant || isOrganizer)
  })

  if (!upcoming.length) return
  const nextMeeting = upcoming.sort((a, b) => new Date(`${a.date} ${a.startTime}`) - new Date(`${b.date} ${b.startTime}`))[0]
  const linkText = nextMeeting.meetingLink ? `Join: ${nextMeeting.meetingLink}` : 'Meeting link will be shared soon.'
  showToast(`Reminder: ${nextMeeting.title} on ${nextMeeting.date} at ${nextMeeting.startTime}. ${linkText}`, 'info')
}

// ═══════════════════════════════════════════════════════════════
// EXPORT FUNCTIONALITY
// ═══════════════════════════════════════════════════════════════

function exportMeetingsToExcel() {
  const meetings = DataStore.get('meetings') || []
  let csv = 'Meeting ID,Title,Type,Client,Case,Lender,Date,Start Time,End Time,Duration,Participants,Status,Organizer\n'
  
  meetings.forEach(m => {
    csv += `"${m.id}","${m.title}","${m.type}","${m.relatedClient}","${m.relatedCase}","${m.relatedLender}","${m.date}","${m.startTime}","${m.endTime}","${m.duration}","${m.participants?.length || 0}","${m.status}","${m.organizerName}"\n`
  })

  downloadAsFile('Meetings_' + new Date().toISOString().split('T')[0] + '.csv', csv, 'text/csv')
  showToast('Meetings exported to Excel', 'success')
}

function exportMeetingsToPDF() {
  const meetings = DataStore.get('meetings') || []
  let content = 'MEETINGS REPORT\n\n'
  
  meetings.forEach(m => {
    content += `Meeting: ${m.title}\n`
    content += `Date: ${m.date}, Time: ${m.startTime}-${m.endTime}\n`
    content += `Type: ${m.type}, Status: ${m.status}\n`
    content += `Client: ${m.relatedClient}, Case: ${m.relatedCase}, Lender: ${m.relatedLender}\n`
    content += `Participants: ${m.participants?.length || 0}\n\n`
  })

  downloadAsFile('Meetings_Report_' + new Date().toISOString().split('T')[0] + '.txt', content, 'text/plain')
  showToast('Report exported', 'success')
}

function downloadAsFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(link)
}

// ═══════════════════════════════════════════════════════════════
// CASE & LENDER INTEGRATION
// ═══════════════════════════════════════════════════════════════

function navToCase(caseId) {
  currentCaseLeadId = caseId
  const caseBtn = document.querySelector('[data-sec="case-management"]')
  if (caseBtn) nav(caseBtn)
}

function getMeetingsByCase(caseId) {
  return (DataStore.get('meetings') || []).filter(m => m.relatedCase === caseId)
}

function getMeetingsByLender(lenderId) {
  return (DataStore.get('meetings') || []).filter(m => m.relatedLender === lenderId)
}

function getMeetingsByClient(clientId) {
  return (DataStore.get('meetings') || []).filter(m => m.relatedClient === clientId)
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    renderMeetingsDashboard, 
    openMeetingForm, 
    saveMeeting, 
    deleteMeeting,
    viewMeetingDetails,
    saveMOM,
    createTaskFromActionItem,
    exportMeetingsToExcel,
    getMeetingsByCase,
    getMeetingsByLender,
    getMeetingsByClient
  }
}

// Initialize when DOM ready
if (typeof window !== 'undefined') {
  window.initMeetingsModule = initMeetingsModule
  window.renderMeetingsDashboard = renderMeetingsDashboard
  window.openMeetingForm = openMeetingForm
  window.editMeeting = editMeeting
  window.saveMeeting = saveMeeting
  window.deleteMeeting = deleteMeeting
  window.closeMeetingForm = closeMeetingForm
  window.viewMeetingDetails = viewMeetingDetails
  window.closeMeetingDetails = closeMeetingDetails
  window.openMOMForm = openMOMForm
  window.generateMOMWithAI = generateMOMWithAI
  window.saveMOM = saveMOM
  window.closeMOMForm = closeMOMForm
  window.exportMOMToPDF = exportMOMToPDF
  window.openActionItemsForm = openActionItemsForm
  window.createTaskFromActionItem = createTaskFromActionItem
  window.closeActionItemsForm = closeActionItemsForm
  window.exportMeetingsToExcel = exportMeetingsToExcel
  window.exportMeetingsToPDF = exportMeetingsToPDF
  window.navToCase = navToCase
  window.getMeetingsByCase = getMeetingsByCase
  window.getMeetingsByLender = getMeetingsByLender
  window.getMeetingsByClient = getMeetingsByClient
}
