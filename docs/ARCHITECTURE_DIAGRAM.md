# Architecture & Connection Diagram

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND LAYER                                    │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         Browser                                       │  │
│  │  ┌──────────────────────────────────────────────────────────────┐   │  │
│  │  │           HTML Pages & JavaScript                            │   │  │
│  │  │  - Login (login.html)                                        │   │  │
│  │  │  - Admin Dashboard (admin-dashboard.html)                   │   │  │
│  │  │  - Employee Dashboard (employee-dashboard.html)             │   │  │
│  │  │  - Sales Targets (in admin panel)                           │   │  │
│  │  │  - My To-Do (my-to-do.html)                                 │   │  │
│  │  │  - Notifications                                            │   │  │
│  │  └──────────────────────────────────────────────────────────────┘   │  │
│  │                             ▲                                         │  │
│  │                             │ Fetch/XMLHttpRequest                    │  │
│  │  ┌──────────────────────────┼──────────────────────────────────┐    │  │
│  │  │   config.js - API Base Detection                          │    │  │
│  │  │   ┌─────────────────────────────────────────────────────┐  │    │  │
│  │  │   │ 1. Check explicit override (window.API_BASE)       │  │    │  │
│  │  │   │ 2. Check environment variable (CRM_API_BASE)       │  │    │  │
│  │  │   │ 3. Check localStorage cache                        │  │    │  │
│  │  │   │ 4. Auto-detect:                                    │  │    │  │
│  │  │   │    - localhost → http://localhost:8085             │  │    │  │
│  │  │   │    - LAN IP → http://192.168.x.x:8085              │  │    │  │
│  │  │   │    - Production → same origin (nginx proxy)        │  │    │  │
│  │  │   └─────────────────────────────────────────────────────┘  │    │  │
│  │  └────────────────────────────────────────────────────────────┘    │  │
│  └─────────────────────────────┬──────────────────────────────────────────┘
│                                │
│  Local Development Port 3000   │  Production: Served via Nginx
│  http://localhost:3000         │
└────────────────────────────────┼─────────────────────────────────────────────┘
                                 │ HTTP/HTTPS
                    ┌────────────▼──────────────┐
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND LAYER                                      │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      FastAPI Application                             │  │
│  │                                                                      │  │
│  │  ┌─────────────────────────────────────────────────────────────┐   │  │
│  │  │  REST API Endpoints                                         │   │  │
│  │  │                                                             │   │  │
│  │  │  Authentication Routes:                                    │   │  │
│  │  │  - POST   /auth/login                                      │   │  │
│  │  │  - POST   /auth/logout                                     │   │  │
│  │  │  - GET    /auth/me                                         │   │  │
│  │  │                                                             │   │  │
│  │  │  Dashboard Routes:                                         │   │  │
│  │  │  - GET    /api/dashboard/summary    ◄─ Includes targets   │   │  │
│  │  │                                                             │   │  │
│  │  │  Target Assignment Routes (NEW):                           │   │  │
│  │  │  - POST   /api/targets/admin/assign-targets     ◄─ Admin  │   │  │
│  │  │  - GET    /api/targets/admin/employee/{id}/...  ◄─ Admin  │   │  │
│  │  │  - GET    /api/targets/employee/my-assigned...  ◄─ Employee   │  │
│  │  │                                                             │   │  │
│  │  │  Calls, Leads, Meetings Routes:                            │   │  │
│  │  │  - GET/POST /api/calls                                     │   │  │
│  │  │  - GET/POST /api/leads                                     │   │  │
│  │  │  - GET/POST /api/meetings                                  │   │  │
│  │  │                                                             │   │  │
│  │  │  Notifications Routes:                                     │   │  │
│  │  │  - GET    /api/notifications                               │   │  │
│  │  │  - PUT    /api/notifications/{id}/read                     │   │  │
│  │  │                                                             │   │  │
│  │  │  Documentation:                                            │   │  │
│  │  │  - GET    /docs          (Swagger UI)                      │   │  │
│  │  │  - GET    /redoc         (ReDoc)                           │   │  │
│  │  │  - GET    /openapi.json                                    │   │  │
│  │  └─────────────────────────────────────────────────────────────┘   │  │
│  │                              ▲                                      │  │
│  │   ┌─────────────────────────┘                                      │  │
│  │   │ Request → Validate → Process → Response                       │  │
│  │   │                                                                │  │
│  │  ┌▼────────────────────────────────────────────────────────────┐  │  │
│  │  │  Service Layer                                              │  │  │
│  │  │  ┌──────────────────────────────────────────────────────┐   │  │  │
│  │  │  │ TargetAssignmentService                              │   │  │  │
│  │  │  │ - Assign targets to employee                         │   │  │  │
│  │  │  │ - Create audit log entry                             │   │  │  │
│  │  │  │ - Send notification to employee                      │   │  │  │
│  │  │  └──────────────────────────────────────────────────────┘   │  │  │
│  │  │  ┌──────────────────────────────────────────────────────┐   │  │  │
│  │  │  │ PerformanceNotificationService                       │   │  │  │
│  │  │  │ - Create notifications                               │   │  │  │
│  │  │  │ - Mark as read                                       │   │  │  │
│  │  │  │ - Track notification sent flag                       │   │  │  │
│  │  │  └──────────────────────────────────────────────────────┘   │  │  │
│  │  │  ┌──────────────────────────────────────────────────────┐   │  │  │
│  │  │  │ TargetConfigurationService                           │   │  │  │
│  │  │  │ - Get target for employee (DB first)                 │   │  │  │
│  │  │  │ - Fallback to hardcoded config                       │   │  │  │
│  │  │  │ - Support database override                          │   │  │  │
│  │  │  └──────────────────────────────────────────────────────┘   │  │  │
│  │  │  ┌──────────────────────────────────────────────────────┐   │  │  │
│  │  │  │ TargetAuditService                                   │   │  │  │
│  │  │  │ - Log all assignment changes                         │   │  │  │
│  │  │  │ - Track admin who made changes                       │   │  │  │
│  │  │  │ - Provide audit trail                                │   │  │  │
│  │  │  └──────────────────────────────────────────────────────┘   │  │  │
│  │  └──────────────────┬────────────────────────────────────────────┘  │  │
│  └─────────────────────┼────────────────────────────────────────────────┘
│  Local Development     │
│  Port 8085            │
│  http://localhost:8085 │
└────────────────────────┼─────────────────────────────────────────────────┘
                         │ SQLAlchemy ORM
         ┌───────────────▼───────────────┐
┌────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE LAYER                                      │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐│
│  │                    PostgreSQL Database                                ││
│  │                  Port 5432 / 187.127.149.245                         ││
│  │                                                                       ││
│  │  ┌────────────────────────────────────────────────────────────────┐ ││
│  │  │  Schema: public                                               │ ││
│  │  │                                                                │ ││
│  │  │  Tables:                                                       │ ││
│  │  │  - users                (id, name, email, role, password)     │ ││
│  │  │  - targets (UPDATED!)   (id, user_id, call/lead targets,     │ ││
│  │  │                          assigned_by ◄─ NEW,                  │ ││
│  │  │                          assigned_at ◄─ NEW,                  │ ││
│  │  │                          notification_sent ◄─ NEW)            │ ││
│  │  │  - calls                (id, user_id, contact, date, time)    │ ││
│  │  │  - leads                (id, user_id, name, email, status)    │ ││
│  │  │  - meetings             (id, user_id, contact, date, time)    │ ││
│  │  │  - tasks                (id, user_id, title, status)          │ ││
│  │  │  - performance_notifications (id, user_id, type, message)    │ ││
│  │  │  - audit_logs           (id, action, admin_id, employee_id)  │ ││
│  │  │                                                                │ ││
│  │  │  Indices:                                                      │ ││
│  │  │  - targets.assigned_by (for admin queries)                    │ ││
│  │  │  - audit_logs.admin_id, audit_logs.employee_id                │ ││
│  │  │                                                                │ ││
│  │  │  Foreign Keys:                                                 │ ││
│  │  │  - targets.user_id → users.id                                 │ ││
│  │  │  - targets.assigned_by → users.id (NEW)                       │ ││
│  │  │  - calls.user_id → users.id                                   │ ││
│  │  │  - leads.user_id → users.id                                   │ ││
│  │  │  - performance_notifications.user_id → users.id               │ ││
│  │  └────────────────────────────────────────────────────────────────┘ ││
│  └──────────────────────────────────────────────────────────────────────┘│
│                                                                            │
│  Production VPS PostgreSQL                                                │
│  Hostname: 187.127.149.245                                                │
│  Port: 5432                                                               │
│  Database: fundingsathicrm                                                │
│  User: postgres                                                           │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow: Target Assignment Feature

```
STEP 1: Admin Action
┌─────────────────────────────┐
│ Admin Panel (Frontend)       │
│ - Click "Assign Targets"    │
│ - Select Employee            │
│ - Enter targets (35, 3, 15) │
│ - Click "Assign"             │
└──────────────┬──────────────┘
               │
               ▼ POST /api/targets/admin/assign-targets
           ┌──────────────┐
           │ Backend      │
           └──────┬───────┘
                  │
                  ▼ VALIDATE
        ┌────────────────────────────┐
        │ Check admin has permission │
        │ Check employee exists      │
        │ Validate target values     │
        └────────────┬───────────────┘
                     │
                     ▼ PROCESS
         ┌───────────────────────────────────┐
         │ Create/Update targets table:      │
         │ - daily_call_target: 35           │
         │ - daily_lead_target: 3            │
         │ - assigned_by: <admin_id>   ◄─NEW │
         │ - assigned_at: <now()>      ◄─NEW │
         │ - notification_sent: false        │
         └────────┬──────────────────────────┘
                  │
                  ▼ LOG
        ┌────────────────────────────┐
        │ Create audit_logs entry:   │
        │ - action: 'target_assigned'│
        │ - admin_id: <admin_id>     │
        │ - employee_id: <emp_id>    │
        │ - details: {...}           │
        └────────┬───────────────────┘
                 │
                 ▼ NOTIFY
        ┌─────────────────────────────────────┐
        │ Create performance_notifications:   │
        │ - type: 'target_assigned'           │
        │ - user_id: <employee_id>            │
        │ - message: 'Assigned by [Admin]'    │
        │ - created_at: <now()>               │
        └────────┬────────────────────────────┘
                 │
                 ▼ UPDATE FLAG
        ┌──────────────────────────────────┐
        │ Set targets.notification_sent    │
        │ = true                           │
        └─────────────┬────────────────────┘
                      │
                      ▼ RESPOND
            ┌─────────────────────────────────┐
            │ Return 201 Created:             │
            │ {                               │
            │   "id": 1,                      │
            │   "employee_name": "John",      │
            │   "daily_call_target": 35,      │
            │   "assigned_by": "Admin Name",  │
            │   "assigned_at": <time>,        │
            │   "notification_sent": true     │
            │ }                               │
            └─────────────┬───────────────────┘
                          │
                          ▼
         ┌──────────────────────────────────┐
         │ Admin sees success message:      │
         │ "✓ Targets assigned to John Doe" │
         └──────────────────────────────────┘


STEP 2: Employee Sees Assignment
┌────────────────────────────────────┐
│ Employee Logs In                    │
│ - Refresh dashboard                │
│ - GET /api/dashboard/summary       │
└──────────┬─────────────────────────┘
           │
           ▼ QUERY DATABASE
     ┌─────────────────────────────────┐
     │ SELECT * FROM targets           │
     │ WHERE user_id = <employee_id>   │
     │ AND assigned_by IS NOT NULL     │
     └──────────┬──────────────────────┘
                │
                ▼ GET ADMIN NAME
      ┌──────────────────────────────────┐
      │ JOIN users WHERE id = assigned_by│
      │ Get admin name from users table  │
      └──────────┬───────────────────────┘
                 │
                 ▼ RETURN RESPONSE
      ┌──────────────────────────────────────────┐
      │ {                                        │
      │   "calls": {"done": 0, "target": 35},   │
      │   "leads": {"done": 0, "target": 3},    │
      │   "assigned_target_info": {              │
      │     "assigned_by": "Admin Name",         │
      │     "assigned_at": "2026-07-20T18:30", │
      │     "notification_sent": true           │
      │   }                                      │
      │ }                                        │
      └──────────┬───────────────────────────────┘
                 │
                 ▼
   ┌──────────────────────────────────────────────┐
   │ Employee's My To-Do Dashboard Shows:        │
   │                                              │
   │ Notification: "Targets Assigned!"           │
   │ "Assigned by: Admin Name"                   │
   │ "Assigned at: 2026-07-20 18:30"             │
   │                                              │
   │ Progress Tracking:                          │
   │ ├─ Calls Today:  0/35  [0%]                │
   │ ├─ Leads Today:  0/3   [0%]                │
   │ └─ Assignment:                              │
   │    └─ By: Admin Name                        │
   │    └─ Time: 2026-07-20 18:30               │
   │                                              │
   │ Employee can now start tracking progress   │
   └──────────────────────────────────────────────┘
```

---

## 🗄️ Database Migration Flow

```
alembic.ini (Configuration)
    │
    ▼
alembic/env.py (Migration runner configuration)
    │
    ▼
alembic/versions/ (Migration scripts)
    │
    ├─ 20250101_initial_schema.py
    ├─ 20250102_add_targets_table.py
    ├─ ... (other migrations)
    │
    └─ 20260720_add_target_assignment_fields.py ◄─ NEW
        │
        ├─ upgrade():
        │   ├─ Add column: assigned_by (UUID, FK)
        │   ├─ Add column: assigned_at (DateTime)
        │   └─ Add column: notification_sent (Boolean)
        │
        └─ downgrade():
            ├─ Remove column: assigned_by
            ├─ Remove column: assigned_at
            └─ Remove column: notification_sent

Command: python -m alembic upgrade head
    │
    ▼
Execution: Apply all pending migrations in order
    │
    ▼
Result: Database schema updated with new fields
```

---

## 🔌 Connection String Explained

```
postgresql://username:password@host:port/database
    │           │         │        │    │      │
    │           │         │        │    │      └─ Database name: fundingsathicrm
    │           │         │        │    └─ Port: 5432
    │           │         │        └─ Host: 187.127.149.245
    │           │         └─ Password: fundingsathicrm
    │           └─ Username: postgres
    └─ Protocol: PostgreSQL

In the project:
DATABASE_URL=postgresql://postgres:fundingsathicrm@187.127.149.245:5432/fundingsathicrm

Connection parameters:
- Driver: psycopg2 (automatically used by SQLAlchemy)
- Pool: 10 base connections + 20 overflow
- Timeout: 30 seconds per query
- Health Check: pool_pre_ping=True (verify connections before use)
```

---

## 🎯 Request Flow Diagram

```
User Browser                Backend Server              Database
────────────                ──────────────              ────────
      │                           │                         │
      │ 1. Click "Assign Targets" │                         │
      ├──────────────────────────>│                         │
      │                           │ 2. Validate Request    │
      │                           │ (Check JWT, permissions)│
      │                           │                         │
      │                           │ 3. Query DB for user   │
      │                           ├────────────────────────>│
      │                           │<────────────────────────┤
      │                           │ User exists             │
      │                           │                         │
      │                           │ 4. Insert Target Record│
      │                           ├────────────────────────>│
      │                           │<────────────────────────┤
      │                           │ Target created          │
      │                           │                         │
      │                           │ 5. Insert Audit Log    │
      │                           ├────────────────────────>│
      │                           │<────────────────────────┤
      │                           │ Audit entry created     │
      │                           │                         │
      │                           │ 6. Insert Notification │
      │                           ├────────────────────────>│
      │                           │<────────────────────────┤
      │                           │ Notification created    │
      │                           │                         │
      │<──────────────────────────┤                         │
      │ 201 Created Response      │                         │
      │ {id, employee_name, ...}  │                         │
      │                           │                         │
      │ 7. Show Success Toast     │                         │
      ├─────────────────────────> │ Page refreshes          │
      │                           │                         │
      │                           │ 8. Get Dashboard Data  │
      │                           ├────────────────────────>│
      │                           │<────────────────────────┤
      │                           │ Dashboard data with     │
      │                           │ assigned_target_info    │
      │                           │                         │
      │<──────────────────────────┤                         │
      │ 200 OK with targets       │                         │
      │                           │                         │
      │ 9. Display targets on UI  │                         │
```

---

This architecture ensures:
- ✅ Secure communication between frontend and backend
- ✅ Reliable database connection with pooling
- ✅ Atomic transactions for data consistency
- ✅ Audit trail for compliance
- ✅ Real-time notifications for users
- ✅ Proper error handling and validation
- ✅ Scalable connection pooling

