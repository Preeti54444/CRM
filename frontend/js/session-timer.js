import * as React from 'https://esm.sh/react@18.3.1'
import * as ReactDOMClient from 'https://esm.sh/react-dom@18.3.1/client'
import htm from 'https://esm.sh/htm@3.1.0'
const { useState, useEffect, useRef, useCallback, useMemo } = React
const html = htm.bind(React.createElement)

const STORAGE_KEYS = {
  workSec: 'fs_workSec',
  idleSec: 'fs_idleSec',
  makeupMin: 'fs_makeupMin',
  callCount: 'fs_callCount',
  lastActive: 'fs_lastActive',
  attendanceLog: 'fs_attendanceLog',
  approvals: 'fs_approvals',
  approvalsHistory: 'fs_approvalsHistory',
  state: 'fs_state',
  user: 'fs_user'
}
const SHIFT_SECONDS = 28800
const SAMPLE_LEADS = [
  { id: 'LD-101', name: 'Apex Finance' },
  { id: 'LD-102', name: 'Bright Homes' },
  { id: 'LD-103', name: 'Crest Capital' },
  { id: 'LD-104', name: 'Delta Lending' }
]
const EMPLOYEES = ['Aman Sharma', 'Priya Patel', 'Rahul Mehta', 'Nisha Gupta']
const BADGE = {
  Verified: 'bg-emerald-100 text-emerald-800',
  Mismatch: 'bg-amber-100 text-amber-800',
  Unverified: 'bg-slate-100 text-slate-800',
  Flagged: 'bg-amber-100 text-amber-800',
  Rejected: 'bg-red-100 text-red-800',
  Pending: 'bg-blue-100 text-blue-800'
}

const formatTime = seconds => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h}h ${m}m ${s}s`
}

const formatMinutes = seconds => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

const loadJson = (key, fallback) => {
  const raw = localStorage.getItem(key)
  if (!raw) return fallback
  try { return JSON.parse(raw) } catch (e) { return fallback }
}

const saveJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value))
}

function App() {
  const [user, setUser] = useState(null)
  const [state, setState] = useState('loggedout')
  const [workSec, setWorkSec] = useState(0)
  const [idleSec, setIdleSec] = useState(0)
  const [makeupMin, setMakeupMin] = useState(0)
  const [callCount, setCallCount] = useState(0)
  const [lastActive, setLastActive] = useState(Date.now())
  const [warningCountdown, setWarningCountdown] = useState(30)
  const [showCallLog, setShowCallLog] = useState(false)
  const [callTimerSec, setCallTimerSec] = useState(0)
  const [pendingApprovals, setPendingApprovals] = useState([])
  const [approvalHistory, setApprovalHistory] = useState([])
  const [attendanceLog, setAttendanceLog] = useState([])
  const [sessionExpired, setSessionExpired] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(EMPLOYEES[0])
  const [callForm, setCallForm] = useState({ lead: '', recordingMinutes: '', notes: '', fileName: '', fileSize: 0 })
  const [playingId, setPlayingId] = useState(null)
  const [playProgress, setPlayProgress] = useState(0)
  const blurTimerRef = useRef(null)

  const resetStorageKeys = () => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key))
  }

  const addAttendance = useCallback((event, status = 'info', duration = '') => {
    setAttendanceLog(prev => [
      { id: `att-${Date.now()}`, event, time: new Date().toLocaleTimeString(), duration, status },
      ...prev
    ])
  }, [])

  const saveSession = useCallback(() => {
    if (!user) return
    localStorage.setItem(STORAGE_KEYS.workSec, String(workSec))
    localStorage.setItem(STORAGE_KEYS.idleSec, String(idleSec))
    localStorage.setItem(STORAGE_KEYS.makeupMin, String(makeupMin))
    localStorage.setItem(STORAGE_KEYS.callCount, String(callCount))
    localStorage.setItem(STORAGE_KEYS.lastActive, String(lastActive))
    saveJson(STORAGE_KEYS.attendanceLog, attendanceLog)
    saveJson(STORAGE_KEYS.approvals, pendingApprovals)
    saveJson(STORAGE_KEYS.approvalsHistory, approvalHistory)
    localStorage.setItem(STORAGE_KEYS.state, state)
    saveJson(STORAGE_KEYS.user, user)
  }, [user, workSec, idleSec, makeupMin, callCount, lastActive, attendanceLog, pendingApprovals, approvalHistory, state])

  useEffect(() => {
    const storedLastActive = Number(localStorage.getItem(STORAGE_KEYS.lastActive) || '0')
    const storedUser = loadJson(STORAGE_KEYS.user, null)
    const storedState = localStorage.getItem(STORAGE_KEYS.state) || 'active'

    if (storedUser && storedLastActive && Date.now() - storedLastActive > 5 * 60 * 1000) {
      setSessionExpired(true)
      setState('loggedout')
      setUser(null)
      return
    }

    if (storedUser) {
      setUser(storedUser)
      setState(storedState)
      setWorkSec(Number(localStorage.getItem(STORAGE_KEYS.workSec) || '0'))
      setIdleSec(Number(localStorage.getItem(STORAGE_KEYS.idleSec) || '0'))
      setMakeupMin(Number(localStorage.getItem(STORAGE_KEYS.makeupMin) || '0'))
      setCallCount(Number(localStorage.getItem(STORAGE_KEYS.callCount) || '0'))
      setLastActive(storedLastActive || Date.now())
      setAttendanceLog(loadJson(STORAGE_KEYS.attendanceLog, []))
      setPendingApprovals(loadJson(STORAGE_KEYS.approvals, []))
      setApprovalHistory(loadJson(STORAGE_KEYS.approvalsHistory, []))
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(saveSession, 5000)
    return () => clearInterval(interval)
  }, [saveSession])

  useEffect(() => {
    if (!user) return
    localStorage.setItem(STORAGE_KEYS.lastActive, String(lastActive))
  }, [lastActive, user])

  useEffect(() => {
    if (state !== 'active') return
    const tick = setInterval(() => setWorkSec(prev => prev + 1), 1000)
    return () => clearInterval(tick)
  }, [state])

  useEffect(() => {
    if (state !== 'oncall') return
    const tick = setInterval(() => setCallTimerSec(prev => prev + 1), 1000)
    return () => clearInterval(tick)
  }, [state])

  useEffect(() => {
    if (state !== 'stopped') return
    const tick = setInterval(() => {
      setIdleSec(prev => {
        const next = prev + 1
        if (next % 60 === 0) {
          setMakeupMin(prevMin => prevMin + 1)
        }
        return next
      })
    }, 1000)
    return () => clearInterval(tick)
  }, [state])

  useEffect(() => {
    if (state !== 'warning') return
    if (warningCountdown <= 0) {
      setState('stopped')
      addAttendance('Session paused', 'warning')
      return
    }
    const timer = setInterval(() => setWarningCountdown(prev => prev - 1), 1000)
    return () => clearInterval(timer)
  }, [state, warningCountdown, addAttendance])

  useEffect(() => {
    const activity = () => {
      if (!user || state === 'loggedout') return
      if (state === 'warning' || state === 'stopped') {
        setState('active')
        addAttendance('Session resumed', 'green')
      }
      setWarningCountdown(30)
      setLastActive(Date.now())
    }
    const reset = () => activity()
    document.addEventListener('click', reset)
    document.addEventListener('keydown', reset)
    return () => {
      document.removeEventListener('click', reset)
      document.removeEventListener('keydown', reset)
    }
  }, [user, state, addAttendance])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && user) {
        setState('stopped')
        addAttendance('Tab hidden / system locked', 'red')
      }
    }
    window.addEventListener('visibilitychange', handleVisibility)
    return () => window.removeEventListener('visibilitychange', handleVisibility)
  }, [user, addAttendance])

  useEffect(() => {
    const handleBlur = () => {
      if (!user) return
      blurTimerRef.current = window.setTimeout(() => {
        if (state === 'active') {
          setState('warning')
          setWarningCountdown(30)
          addAttendance('Session paused', 'warning')
        }
      }, 120000)
    }
    const handleFocus = () => {
      if (blurTimerRef.current) {
        window.clearTimeout(blurTimerRef.current)
        blurTimerRef.current = null
      }
      if (user && state !== 'loggedout' && state !== 'oncall') {
        setState('active')
        setLastActive(Date.now())
        addAttendance('Session resumed', 'green')
      }
    }
    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
      if (blurTimerRef.current) {
        window.clearTimeout(blurTimerRef.current)
      }
    }
  }, [user, state, addAttendance])

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!user) return
      localStorage.setItem(STORAGE_KEYS.state, 'loggedout')
      localStorage.setItem(STORAGE_KEYS.lastActive, String(Date.now()))
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [user])

  const handleLogin = () => {
    const newUser = { name: selectedEmployee }
    resetStorageKeys()
    setUser(newUser)
    setState('active')
    setWorkSec(0)
    setIdleSec(0)
    setMakeupMin(0)
    setCallCount(0)
    setWarningCountdown(30)
    setCallTimerSec(0)
    setPendingApprovals([])
    setApprovalHistory([])
    setAttendanceLog([])
    setLastActive(Date.now())
    setSessionExpired(false)
    saveJson(STORAGE_KEYS.user, newUser)
    localStorage.setItem(STORAGE_KEYS.state, 'active')
    localStorage.setItem(STORAGE_KEYS.lastActive, String(Date.now()))
    addAttendance('Check-in', 'green')
  }

  const handleStartCall = () => {
    if (!user) return
    setState('oncall')
    setCallTimerSec(0)
    addAttendance('On Call started', 'blue')
  }

  const handleEndCall = () => {
    if (state !== 'oncall') return
    setShowCallLog(true)
  }

  const countNoLeadCalls = () => {
    const today = new Date().toDateString()
    const all = [...pendingApprovals, ...approvalHistory]
    return all.filter(entry => entry.employee === user?.name && !entry.linkedLead && entry.createdAt?.slice(0, 15) === today).length
  }

  const handleCallFormChange = (field, value) => {
    setCallForm(prev => ({ ...prev, [field]: value }))
  }

  const handleFileChange = event => {
    const file = event.target.files?.[0]
    if (!file) {
      handleCallFormChange('fileName', '')
      handleCallFormChange('fileSize', 0)
      return
    }
    if (file.size > 25 * 1024 * 1024) {
      alert('Recording file must be 25MB or smaller.')
      event.target.value = ''
      return
    }
    handleCallFormChange('fileName', file.name)
    handleCallFormChange('fileSize', file.size)
  }

  const submitCallLog = () => {
    if (!user) return
    const callDurationSec = callTimerSec
    const recMinutes = Number(callForm.recordingMinutes || 0)
    const noteValid = callForm.notes.trim().length >= 10
    if (!noteValid) {
      alert('Please provide at least 10 characters in notes.')
      return
    }
    const hasLead = callForm.lead && callForm.lead !== 'none'
    const isUnverified = !callForm.fileName
    const percentDiff = callDurationSec === 0 ? 0 : Math.abs(callDurationSec / 60 - recMinutes) / Math.max(callDurationSec / 60, recMinutes || 1)
    let status = 'Pending'
    let flag = ''
    if (isUnverified) {
      status = 'Unverified'
      flag = 'unverified'
    }
    if (!isUnverified && recMinutes && percentDiff > 0.2) {
      status = 'Mismatch'
      flag = 'mismatch'
    }
    if (!hasLead && countNoLeadCalls() + 1 >= 3) {
      status = 'Flagged'
      flag = 'abuse'
    }
    if (callDurationSec === 0) {
      status = 'Invalid'
      flag = 'invalid'
    }

    const entry = {
      id: `call-${Date.now()}`,
      createdAt: new Date().toLocaleDateString(),
      employee: user.name,
      linkedLead: hasLead ? SAMPLE_LEADS.find(l => l.id === callForm.lead)?.name : '',
      leadId: hasLead ? callForm.lead : null,
      claimedSeconds: callDurationSec,
      recordingMinutes: recMinutes,
      fileName: callForm.fileName,
      notes: callForm.notes.trim(),
      status,
      flag,
      callDurationDisplay: formatMinutes(callDurationSec)
    }

    setPendingApprovals(prev => [entry, ...prev])
    setCallCount(prev => prev + 1)
    setState('active')
    setShowCallLog(false)
    setCallTimerSec(0)
    setCallForm({ lead: '', recordingMinutes: '', notes: '', fileName: '', fileSize: 0 })
    addAttendance(`Call logged${hasLead ? ` (${entry.linkedLead})` : ''}`, 'blue', formatMinutes(callDurationSec))
  }

  const approveCall = id => {
    setPendingApprovals(prev => {
      const next = []
      prev.forEach(entry => {
        if (entry.id === id) {
          const approved = { ...entry, status: 'Verified' }
          setApprovalHistory(history => [approved, ...history])
          setWorkSec(prevSec => prevSec + (entry.claimedSeconds || 0))
          next.push(...[])
        } else {
          next.push(entry)
        }
      })
      return next
    })
    addAttendance('Call approved', 'green')
  }

  const rejectCall = id => {
    setPendingApprovals(prev => {
      const next = []
      prev.forEach(entry => {
        if (entry.id === id) {
          const rejected = { ...entry, status: 'Rejected' }
          setApprovalHistory(history => [rejected, ...history])
          setMakeupMin(prevMin => prevMin + Math.ceil((entry.claimedSeconds || 0) / 60))
        } else {
          next.push(entry)
        }
      })
      return next
    })
    addAttendance('Call rejected', 'red')
  }

  useEffect(() => {
    if (!playingId) return
    const progress = setInterval(() => {
      setPlayProgress(prev => {
        if (prev >= 100) {
          setPlayingId(null)
          return 0
        }
        return prev + 2
      })
    }, 150)
    return () => clearInterval(progress)
  }, [playingId])

  const sessionStatus = useMemo(() => {
    if (state === 'active') return { label: 'Active', color: 'bg-emerald-500' }
    if (state === 'oncall') return { label: 'On Call', color: 'bg-sky-500' }
    if (state === 'warning') return { label: 'Warning', color: 'bg-amber-500' }
    if (state === 'stopped') return { label: 'Stopped', color: 'bg-red-500' }
    return { label: 'Logged Out', color: 'bg-slate-500' }
  }, [state])

  const idleProgress = Math.min(1, idleSec / 600)
  const idleColor = idleProgress < 0.5 ? 'bg-emerald-500' : idleProgress < 0.85 ? 'bg-amber-500' : 'bg-red-500'
  const timeRemaining = Math.max(0, SHIFT_SECONDS - workSec)
  const shiftComplete = workSec >= SHIFT_SECONDS

  const loginOverlay = sessionExpired || state === 'loggedout' || !user

  return html`
    <div class="min-h-screen flex">
      <aside class="w-72 bg-[#7A0019] text-white p-6 hidden md:block">
        <div class="text-2xl font-bold mb-6">Funding Sathi</div>
        <nav class="space-y-3 text-sm">
          <a class="block px-4 py-3 rounded-lg bg-white text-[#7A0019] font-semibold" href="#">Session Monitor</a>
          <a class="block px-4 py-3 rounded-lg hover:bg-white/10">Lead Board</a>
          <a class="block px-4 py-3 rounded-lg hover:bg-white/10">Call Approvals</a>
          <a class="block px-4 py-3 rounded-lg hover:bg-white/10">Attendance</a>
        </nav>
      </aside>
      <main class="flex-1 p-4 md:p-6">
        <header class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <div class="text-sm uppercase tracking-[0.2em] text-slate-500">Session Timer</div>
            <h1 class="text-3xl font-semibold">Team Attendance & Call Log</h1>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <span class="rounded-full px-3 py-2 text-sm bg-slate-100 text-slate-700">${user ? user.name : 'No user'}</span>
            <button onClick=${handleStartCall} class="rounded-lg px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700">On Call</button>
            <button onClick=${() => { if (user) addAttendance('Add Lead clicked', 'blue'); }} class="rounded-lg px-4 py-2 bg-slate-700 text-white hover:bg-slate-800">Add Lead</button>
          </div>
        </header>

        <section class="glass-card rounded-3xl border border-slate-200 p-6 shadow-sm mb-6">
          <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div class="text-sm text-slate-500">Work time today</div>
              <div class="text-3xl font-semibold">${formatTime(workSec)}</div>
            </div>
            <div>
              <div class="text-sm text-slate-500">Idle time</div>
              <div class="text-3xl font-semibold">${formatTime(idleSec)}</div>
            </div>
            <div>
              <div class="text-sm text-slate-500">Time remaining</div>
              <div class="text-3xl font-semibold">${formatTime(timeRemaining)}</div>
            </div>
            <div class="text-right">
              <div class="text-sm text-slate-500">Current state</div>
              <div class="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold ${sessionStatus.color} text-white">
                <span class="h-2.5 w-2.5 rounded-full bg-white"></span>${sessionStatus.label}
              </div>
            </div>
          </div>
          <div class="mt-6 space-y-4">
            <div class="flex items-center justify-between text-sm text-slate-600">
              <span>Idle progress (10 min limit)</span>
              <span>${Math.round(idleProgress * 100)}%</span>
            </div>
            <div class="h-4 w-full rounded-full bg-slate-200 overflow-hidden">
              <div class="h-full ${idleColor}" style="width: ${idleProgress * 100}%"></div>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="font-semibold text-slate-700">Makeup needed</span>
              <span class="text-red-600 font-semibold">${makeupMin} min</span>
            </div>
            ${shiftComplete ? html`<div class="rounded-2xl bg-emerald-100 border border-emerald-200 p-4 text-emerald-900">Shift complete! Great job — 8 hours of active work achieved.</div>` : null}
          </div>
        </section>

        <div class="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
          <section class="space-y-6">
            <div class="glass-card rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <h2 class="text-xl font-semibold">Call Logging</h2>
                  <p class="text-slate-500">Your live call timer and post-call approval workflow.</p>
                </div>
                <span class="rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-700">Call timer: ${formatTime(callTimerSec)}</span>
              </div>
              <div class="flex flex-wrap gap-3">
                <button onClick=${handleStartCall} class="rounded-xl bg-sky-600 px-4 py-3 text-white hover:bg-sky-700">Start Call</button>
                <button onClick=${handleEndCall} class="rounded-xl bg-rose-600 px-4 py-3 text-white hover:bg-rose-700" disabled=${state !== 'oncall'}>End Call</button>
                <span class="rounded-xl bg-slate-100 px-4 py-3 text-slate-700">Current mode: ${state}</span>
              </div>
            </div>

            <div class="glass-card rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-semibold">Approvals Panel</h2>
                <span class="rounded-full bg-blue-100 px-3 py-2 text-sm text-blue-800">Pending ${pendingApprovals.length}</span>
              </div>
              ${pendingApprovals.length === 0 ? html`<div class="rounded-2xl bg-slate-50 p-4 text-slate-600">No pending approvals currently.</div>` : html`
                <div class="space-y-4">
                  ${pendingApprovals.map(entry => html`
                    <div class="rounded-3xl border border-slate-200 p-4 bg-white shadow-sm">
                      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div class="text-sm text-slate-500">${entry.employee}</div>
                          <div class="text-lg font-semibold">${entry.linkedLead || 'No lead linked'}</div>
                        </div>
                        <div class="flex flex-wrap gap-2 text-sm">
                          <span class="${BADGE[entry.status] || 'bg-slate-100 text-slate-700'} rounded-full px-3 py-1">${entry.status}</span>
                          <span class="rounded-full bg-slate-100 px-3 py-1">Claimed ${formatMinutes(entry.claimedSeconds)}</span>
                          <span class="rounded-full bg-slate-100 px-3 py-1">Recording ${entry.recordingMinutes || 0}m</span>
                        </div>
                      </div>
                      <div class="mt-4 text-sm text-slate-600">${entry.notes}</div>
                      <div class="mt-4 flex flex-wrap items-center gap-3">
                        <button class="rounded-full bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700" onClick=${() => approveCall(entry.id)}>Approve</button>
                        <button class="rounded-full bg-red-600 px-4 py-2 text-white hover:bg-red-700" onClick=${() => rejectCall(entry.id)}>Reject</button>
                        <button class="rounded-full bg-slate-100 px-4 py-2 text-slate-700" onClick=${() => { setPlayingId(entry.id); setPlayProgress(0) }}>Play</button>
                      </div>
                      <div class="mt-3 h-2 w-full rounded-full bg-slate-200 overflow-hidden fake-audio-play">
                        <div class="progress-bar h-full bg-sky-500" style="width:${entry.id === playingId ? playProgress : 0}%"></div>
                      </div>
                    </div>
                  `)}
                </div>
              `}
            </div>
          </section>

          <aside class="space-y-6">
            <div class="glass-card rounded-3xl border border-slate-200 p-6 shadow-sm">
              <h2 class="text-xl font-semibold mb-3">Attendance Log</h2>
              <div class="space-y-3 max-h-[420px] overflow-auto pr-2">
                ${attendanceLog.length === 0 ? html`<p class="text-slate-500">No attendance events yet.</p>` : attendanceLog.map(event => html`
                  <div class="rounded-2xl border border-slate-200 p-3 bg-slate-50">
                    <div class="flex items-center justify-between text-sm text-slate-600"><span>${event.event}</span><span>${event.time}</span></div>
                    ${event.duration ? html`<div class="mt-2 text-sm text-slate-500">Duration: ${event.duration}</div>` : null}
                  </div>
                `)}
              </div>
            </div>

            <div class="glass-card rounded-3xl border border-slate-200 p-6 shadow-sm">
              <h2 class="text-xl font-semibold mb-3">History</h2>
              ${approvalHistory.length === 0 ? html`<p class="text-slate-500">No approved or rejected call history yet.</p>` : html`
                <div class="space-y-3 max-h-[420px] overflow-auto pr-2">
                  ${approvalHistory.map(entry => html`
                    <div class="rounded-2xl border border-slate-200 p-3 bg-white">
                      <div class="flex items-center justify-between text-sm text-slate-600">
                        <span>${entry.employee}</span>
                        <span class="${BADGE[entry.status] || 'bg-slate-100 text-slate-700'} rounded-full px-2 py-1">${entry.status}</span>
                      </div>
                      <div class="mt-2 text-sm text-slate-700">${entry.linkedLead || 'No link'}</div>
                      <div class="mt-2 text-sm text-slate-500">${entry.notes}</div>
                    </div>
                  `)}
                </div>
              `}
            </div>
          </aside>
        </div>
      </main>

      ${loginOverlay ? html`
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 px-4">
          <div class="w-full max-w-xl rounded-3xl bg-white p-8 shadow-2xl">
            <h2 class="text-2xl font-semibold mb-4">${sessionExpired ? 'Session expired' : 'Login required'}</h2>
            <p class="mb-6 text-slate-600">${sessionExpired ? 'Your last session was inactive for more than 5 minutes. Please login again to start a fresh session.' : 'Select your name to begin tracking your session.'}</p>
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="block">
                <span class="text-sm font-semibold text-slate-700">Employee</span>
                <select value=${selectedEmployee} onChange=${e => setSelectedEmployee(e.target.value)} class="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3">
                  ${EMPLOYEES.map(name => html`<option value=${name}>${name}</option>`) }
                </select>
              </label>
            </div>
            <div class="mt-6 flex justify-end gap-3">
              ${sessionExpired ? html`<button class="rounded-full border border-slate-300 px-5 py-3 text-slate-700" onClick=${() => window.location.reload()}>Refresh</button>` : null}
              <button class="rounded-full bg-[#7A0019] px-6 py-3 text-white hover:bg-[#5f0014]" onClick=${handleLogin}>Login</button>
            </div>
          </div>
        </div>
      ` : null}

      ${showCallLog ? html`
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <div class="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl">
            <div class="flex items-center justify-between mb-6">
              <div>
                <h3 class="text-2xl font-semibold">Call Log</h3>
                <p class="text-slate-500">Fill the call log details to submit the completed call.</p>
              </div>
              <button class="rounded-full bg-slate-100 px-4 py-2 text-slate-700" onClick=${() => setShowCallLog(false)}>Close</button>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="space-y-2">
                <span class="text-sm font-semibold text-slate-700">Linked Lead</span>
                <select value=${callForm.lead} onChange=${e => handleCallFormChange('lead', e.target.value)} class="w-full rounded-2xl border border-slate-300 px-4 py-3">
                  <option value="">Select a lead</option>
                  <option value="none">No lead linked</option>
                  ${SAMPLE_LEADS.map(lead => html`<option value=${lead.id}>${lead.name}</option>`) }
                </select>
              </label>
              <label class="space-y-2">
                <span class="text-sm font-semibold text-slate-700">Call Duration</span>
                <input type="text" readOnly value=${formatTime(callTimerSec)} class="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3" />
              </label>
            </div>
            <div class="grid gap-4 sm:grid-cols-2 mt-4">
              <label class="space-y-2">
                <span class="text-sm font-semibold text-slate-700">Upload Recording</span>
                <input type="file" accept=".mp3,.wav,.m4a" onChange=${handleFileChange} class="w-full text-sm text-slate-600" />
                <div class="text-sm text-slate-500">Accepted: .mp3 .wav .m4a, max 25MB.</div>
                ${callForm.fileName ? html`<div class="text-sm text-slate-700">${callForm.fileName} (${Math.round(callForm.fileSize / 1024)} KB)</div>` : null}
              </label>
              <label class="space-y-2">
                <span class="text-sm font-semibold text-slate-700">Recorded Duration (min)</span>
                <input type="number" min="0" value=${callForm.recordingMinutes} onChange=${e => handleCallFormChange('recordingMinutes', e.target.value)} class="w-full rounded-2xl border border-slate-300 px-4 py-3" />
              </label>
            </div>
            <label class="block mt-4 space-y-2">
              <span class="text-sm font-semibold text-slate-700">Notes</span>
              <textarea value=${callForm.notes} onChange=${e => handleCallFormChange('notes', e.target.value)} rows="4" class="w-full rounded-3xl border border-slate-300 px-4 py-3"></textarea>
            </label>
            <div class="mt-6 flex flex-wrap items-center gap-3 justify-end">
              <button class="rounded-full bg-slate-200 px-6 py-3 text-slate-700" onClick=${() => setShowCallLog(false)}>Cancel</button>
              <button class="rounded-full bg-[#7A0019] px-6 py-3 text-white" onClick=${submitCallLog}>Submit Log</button>
            </div>
          </div>
        </div>
      ` : null}
    </div>
  `
}

const container = document.getElementById('root')
const root = ReactDOMClient.createRoot(container)
root.render(html`<${App} />`)
