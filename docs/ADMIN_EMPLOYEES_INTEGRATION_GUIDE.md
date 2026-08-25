# Admin Employees Management - Backend Integration Guide

## Overview

The Employees Admin Panel now has full backend integration for managing employee login timings, activities, calls, leads, and tasks. All data is pulled directly from the database via a REST API.

---

## What's New

### Backend API (`/api/admin/employees/`)

#### 1. **GET /api/admin/employees/list**
Get list of all employees with activity summary
- **Query Parameters:**
  - `role` (optional): Filter by role (Sales, Employee, Admin)
  - `status_filter` (optional): Filter by status (active/inactive)
  - `department` (optional): Filter by department
  - `search` (optional): Search by name or email

- **Response:** Array of employee objects with:
  ```json
  {
    "id": 123,
    "name": "John Doe",
    "email": "john@company.com",
    "phone": "9876543210",
    "role": "Sales",
    "department": "Sales",
    "status": "active",
    "joinedDate": "2024-01-15",
    "lastActive": "2024-07-12T14:30:00",
    "loginTime": "2024-07-12T09:00:00",
    "logoutTime": null,
    "workSeconds": 18000,
    "breakSeconds": 3600,
    "callCount": 15,
    "callCountWeek": 85,
    "leadsCountToday": 3,
    "leadsCountWeek": 12,
    "tasksAssigned": 5,
    "tasksCompleted": 3,
    "isRemoteLogin": false,
    "activity": {
      "callsToday": 15,
      "callsWeek": 85,
      "leadsToday": 3,
      "leadsWeek": 12,
      "tasksAssigned": 5,
      "tasksCompleted": 3,
      "completionRate": 60
    }
  }
  ```

#### 2. **GET /api/admin/employees/{employee_id}**
Get detailed employee profile with complete activity timeline
- **Response:** Employee object with additional fields:
  ```json
  {
    ...employee_data...,
    "recentCalls": [
      {
        "id": "call-123",
        "date": "2024-07-12T14:15:00",
        "duration": 300,
        "outcome": "Interested",
        "customer": "ABC Corporation",
        "status": "completed",
        "notes": "Follow up next week"
      }
    ],
    "recentLeads": [
      {
        "id": "lead-456",
        "company": "XYZ Inc",
        "date": "2024-07-12T10:00:00",
        "status": "Lead Created",
        "amount": 5000000
      }
    ],
    "assignedTasks": [
      {
        "id": "task-789",
        "title": "Follow up with ABC Corp",
        "status": "pending",
        "priority": "high",
        "dueDate": "2024-07-15",
        "isOverdue": false
      }
    ],
    "workSessions": [
      {
        "loginTime": "2024-07-12T09:00:00",
        "logoutTime": "2024-07-12T17:30:00",
        "duration": 30600,
        "breakDuration": 3600,
        "isRemote": false,
        "deviceInfo": "Chrome on Windows"
      }
    ]
  }
  ```

#### 3. **GET /api/admin/employees/activity/summary**
Get summary of all employees' activities
- **Query Parameters:**
  - `date_from` (optional): Start date for filtering
  - `date_to` (optional): End date for filtering

- **Response:**
  ```json
  {
    "totalEmployees": 15,
    "onlineNow": 8,
    "totalCalls": 120,
    "totalLeads": 45,
    "totalTasks": 200,
    "byRole": {
      "Sales": { "count": 10, "online": 6 },
      "Employee": { "count": 5, "online": 2 }
    },
    "byDepartment": {
      "Sales": { "count": 12, "online": 7 },
      "Support": { "count": 3, "online": 1 }
    },
    "employees": [...]
  }
  ```

#### 4. **GET /api/admin/employees/calls/report**
Get detailed calls report grouped by employee
- **Query Parameters:**
  - `date_from` (optional): Start date
  - `date_to` (optional): End date

#### 5. **GET /api/admin/employees/leads/report**
Get detailed leads report grouped by employee
- **Query Parameters:**
  - `date_from` (optional): Start date
  - `date_to` (optional): End date

#### 6. **POST /api/admin/employees/{employee_id}/update-status**
Update employee status
- **Body:**
  ```json
  {
    "status": "active|inactive"
  }
  ```

#### 7. **DELETE /api/admin/employees/{employee_id}**
Deactivate an employee (soft delete)

---

## Frontend Integration

### JavaScript Manager Class

The `AdminEmployeesManager` class handles all frontend operations:

```javascript
// Automatically initializes when Admin > Employees is loaded
const adminEmployeesManager = new AdminEmployeesManager();

// Key Methods:
// Load all employees
adminEmployeesManager.loadEmployees();

// Filter employees by various criteria
adminEmployeesManager.filterEmployees();

// Show employee profile with full details
adminEmployeesManager.showEmployeeProfile(employeeId);

// Get employee timeline HTML
adminEmployeesManager.getEmployeeTimelineHTML(employee);

// Deactivate employee
adminEmployeesManager.deleteEmployee(employeeId);
```

### HTML Structure

The employees admin panel includes:

1. **Overview Metrics**
   - Total Employees
   - Online Now
   - Total Calls Made
   - Total Leads Fetched
   - Tasks Assigned
   - Logged In Today

2. **Activity Tabs**
   - All Employees
   - Calls
   - Leads
   - Tasks
   - Login

3. **Filters**
   - Search (by name/email/phone)
   - Role filter
   - Status filter (Active/Inactive)
   - Department filter
   - Date filter

4. **Employees Table**
   Columns:
   - Name
   - Email
   - Phone
   - Role
   - Department
   - Tasks
   - Status
   - Last Login
   - Work Time
   - Calls
   - Break Time
   - Meetings
   - Joined Date
   - Actions (Timeline, View Profile, Delete)

5. **Employee Profile Panel**
   Shows:
   - Full employee information
   - Performance metrics (calls, leads, tasks)
   - Session information (login, logout, remote)
   - Recent calls (last 10)
   - Recent leads (last 10)
   - Assigned tasks with due dates

---

## Usage Example

### View All Employees
1. Go to **Admin > Employees**
2. Dashboard automatically loads all employees from backend
3. See metrics:
   - Total count
   - Online status
   - Activity summary

### Filter Employees
1. Use search box to find by name/email
2. Select role from dropdown
3. Filter by status (Active/Inactive)
4. Filter by department
5. Click date picker to filter by date
6. Results update in real-time

### View Employee Activity
1. Click "Timeline" button to see activity summary
2. View recent calls, leads, and tasks
3. Click "View Profile" for detailed analytics
4. See complete session information

### View Full Profile
1. Click "View Profile" button
2. Panel opens showing:
   - All employee details
   - Performance metrics
   - Recent activities
   - Work sessions
   - Call history
   - Lead history
   - Task assignments

### Deactivate Employee
1. Click "Delete" button
2. Confirm deactivation
3. Employee marked as inactive
4. Data preserved (soft delete)

---

## Data Sources

All data is fetched from the database:

### Employees
- Source: `users` table
- Fields: name, email, role, department, status, created_at

### Login/Logout Timing
- Source: `work_sessions` table
- Fields: login_time, logout_time, break_duration, is_remote_login

### Calls
- Source: `calls` table
- Fields: call_date, duration, outcome, customer_name, agent_email

### Leads
- Source: `leads` table
- Fields: created_at, loan_amount, status, company_name, sales_executive

### Tasks
- Source: `tasks` table
- Fields: title, status, priority, due_date, assigned_to

---

## Authentication & Security

- All endpoints require valid JWT token
- Role-based access control (Admin/Business Head only)
- Soft delete (data never permanently deleted)
- Complete audit trail maintained

---

## Real-time Updates

The manager automatically handles:
- Fetching latest data on page load
- Filtering and sorting client-side
- Activity metrics calculation
- Status updates
- Time formatting for display

---

## Error Handling

The manager provides user-friendly error messages:
- "Authentication required"
- "You do not have permission to view this data"
- "Error loading employees"
- "Error loading employee profile"
- "Error deactivating employee"

---

## Performance Considerations

- Paginated list endpoint returns all employees (can be modified)
- Client-side filtering for fast UX
- Cached Chart.js instances
- Efficient SQL queries with proper indexing
- JSON columns for flexible metadata storage

---

## Troubleshooting

### "No employees showing"
1. Check if backend API is running
2. Verify authentication token in localStorage
3. Check browser console for API errors
4. Ensure user has Admin or Business Head role

### "Activities not loading"
1. Verify work_sessions table has data
2. Check calls table for call records
3. Ensure leads and tasks tables populated
4. Check date ranges for filtering

### "Profile panel shows empty"
1. Verify employee has activity data
2. Check if calls/leads/tasks exist in database
3. Check browser console for JavaScript errors
4. Try refreshing the page

---

## Future Enhancements

Potential features to add:
1. Real-time WebSocket updates
2. Advanced analytics dashboard
3. Performance scoring algorithm
4. Automated alerts for underperformers
5. Bulk actions (mass deactivation, etc.)
6. Export to CSV/Excel
7. Performance trends over time
8. Team leaderboards
9. Goal tracking
10. Incentive calculations

---

## API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/admin/employees/list` | List all employees |
| GET | `/api/admin/employees/{id}` | Get employee details |
| GET | `/api/admin/employees/activity/summary` | Activity summary |
| GET | `/api/admin/employees/calls/report` | Calls report |
| GET | `/api/admin/employees/leads/report` | Leads report |
| POST | `/api/admin/employees/{id}/update-status` | Update status |
| DELETE | `/api/admin/employees/{id}` | Deactivate employee |

---

## File Locations

- **Backend Router**: `backend/app/routers/admin_employees.py`
- **Frontend Manager**: `frontend/js/crm-admin-employees.js`
- **Frontend HTML**: `frontend/crm1.html` (section id="sec-employees")
- **Navigation Integration**: `frontend/js/crm-navigation.js`

---

## Implementation Status

✅ Backend API implemented and fully documented  
✅ Frontend JavaScript manager class created  
✅ HTML integration complete  
✅ Navigation routing configured  
✅ Authentication and authorization setup  
✅ Error handling in place  
✅ Real-time data fetching  
✅ Filtering and sorting  
✅ Profile drill-down  

**Status: Production Ready** 🚀

