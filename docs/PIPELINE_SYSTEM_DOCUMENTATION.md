# Automatic Pipeline Movement System - Documentation

## Overview

The Automatic Pipeline Movement System is a comprehensive feature for the Funding Sathi CRM that automatically moves leads between pipeline stages based on their status changes. This eliminates the need for manual drag-and-drop operations and ensures consistent pipeline management across the organization.

## Core Principle

**Lead Status is the Single Source of Truth**

Whenever a lead's status changes, the system automatically:
- Moves the lead to the correct pipeline stage
- Updates pipeline counts
- Refreshes dashboard KPIs
- Records the movement in history
- Notifies assigned users
- Updates reports in real-time

## Architecture

### Backend Components

#### 1. Database Models

**PipelineConfiguration** (`app/models/pipeline_configuration.py`)
- Stores status-to-pipeline stage mappings
- Configurable by Super Admin
- Includes allowed transitions and stage ordering

**PipelineTransitionAudit** (`app/models/pipeline_transition_audit.py`)
- Records every lead movement
- Stores previous/new status and stage
- Tracks who made the change and when
- Provides complete audit trail

**Lead Model Updates** (`app/models/lead.py`)
- Added `pipeline_stage` field
- Automatically synchronized with lead status

#### 2. Service Layer

**PipelineTransitionService** (`app/services/pipeline_transition_service.py`)
- Centralized service for all status transitions
- Handles automatic pipeline movement
- Validates status transitions
- Records audit trails
- Triggers notifications
- Updates employee performance
- Broadcasts real-time updates

Key Methods:
- `handle_status_change()` - Main entry point for status changes
- `get_pipeline_stage_for_status()` - Maps status to pipeline stage
- `is_transition_allowed()` - Validates status transitions
- `get_pipeline_configuration()` - Retrieves configuration
- `get_lead_transition_history()` - Gets audit trail

#### 3. API Endpoints

**Pipeline Configuration Endpoints** (`app/routers/pipeline.py`)
- `GET /pipeline/configuration` - Get all configurations
- `POST /pipeline/configuration` - Create new configuration
- `PUT /pipeline/configuration/{lead_status}` - Update configuration
- `DELETE /pipeline/configuration/{lead_status}` - Delete configuration
- `GET /pipeline/stages` - Get all pipeline stages
- `GET /pipeline/audit/{lead_id}` - Get lead transition history
- `POST /pipeline/initialize` - Initialize default configurations

**Lead Update Endpoint** (`app/routers/leads.py`)
- Updated to use PipelineTransitionService
- Automatically triggers pipeline movement on status change

#### 4. Dashboard Integration

**Dashboard Updates** (`app/routers/dashboard.py`)
- Pipeline stage breakdown now uses `pipeline_stage` field
- Real-time updates via WebSocket broadcasts
- Automatic KPI recalculation

### Frontend Components

#### 1. Pipeline Sync Service

**PipelineSync** (`frontend/js/crm-pipeline-sync.js`)
- WebSocket-based real-time updates
- Automatic lead storage updates
- Toast notifications for pipeline changes
- Dashboard refresh triggers
- Event callback system

Features:
- Automatic reconnection
- Message handling for status changes
- Local storage synchronization
- Browser notifications (if permitted)

#### 2. Pipeline Board Integration

**Existing Pipeline UI** (`frontend/js/crm-pipeline.js`)
- Can be enhanced to use real-time updates
- Automatic stage count updates
- Visual feedback for movements

## Default Status-to-Pipeline Mapping

| Lead Status | Pipeline Stage |
|-------------|----------------|
| new, new lead | New Leads |
| contacted | Contacted |
| interested, qualified, warm, hot | Qualified |
| proposal, proposal shared, demo, negotiation | Proposal |
| documents requested, documentation, documents pending | Documentation |
| credit review, processing | Credit Review |
| sanctioned, sanction approved | Sanctioned |
| disbursed, closed won, won | Disbursed |
| closed lost, lost, rejected | Lost |

## Default Allowed Transitions

The system includes validation rules to prevent invalid status transitions:

- **New** → Contacted, Interested, Qualified, Lost
- **Contacted** → Interested, Qualified, Proposal, Lost
- **Interested** → Qualified, Proposal, Lost
- **Qualified** → Proposal, Documents Requested, Lost
- **Proposal** → Documents Requested, Credit Review, Sanctioned, Lost
- **Documentation** → Credit Review, Sanctioned, Lost
- **Credit Review** → Sanctioned, Lost
- **Sanctioned** → Disbursed
- **Disbursed** → (Terminal state)
- **Lost** → (Terminal state)

## Installation & Setup

### 1. Database Migration

Run the Alembic migration to add the new tables and columns:

```bash
cd backend
alembic upgrade head
```

Or manually apply the migration:

```bash
python -m alembic upgrade add_pipeline_system
```

### 2. Initialize Default Configurations

Run the initialization script to set up default status-to-pipeline mappings:

```bash
cd backend
python scripts/init_pipeline_config.py
```

Or use the API endpoint (requires admin access):

```bash
POST /pipeline/initialize
```

### 3. Frontend Integration

Add the pipeline sync script to your HTML:

```html
<script src="/js/crm-pipeline-sync.js"></script>
```

The service will automatically initialize on page load.

## Usage

### For End Users

#### Changing Lead Status

When a user changes a lead's status through the CRM interface:

1. Select the new status from the dropdown
2. Save the lead
3. The system automatically:
   - Moves the lead to the correct pipeline stage
   - Updates the pipeline board counts
   - Records the change in the lead's timeline
   - Notifies the assigned employee (if different from the changer)
   - Updates dashboard KPIs

#### Viewing Pipeline Changes

- **Lead Timeline**: Shows all status changes with automatic stage movements
- **Pipeline Board**: Updates in real-time with new counts
- **Dashboard**: KPIs refresh automatically
- **Audit Trail**: Complete history available via API

### For Administrators

#### Managing Pipeline Configuration

Administrators can customize the status-to-pipeline mapping:

1. Access the pipeline configuration endpoint
2. View current mappings
3. Add, update, or delete configurations
4. Set allowed transitions for each status
5. Configure stage ordering

Example API call to create a new mapping:

```bash
POST /pipeline/configuration
{
  "lead_status": "custom_status",
  "pipeline_stage": "Custom Stage",
  "stage_order": 5,
  "allowed_transitions": ["qualified", "proposal"],
  "description": "Custom status for special cases"
}
```

#### Viewing Audit Trail

View complete transition history for any lead:

```bash
GET /pipeline/audit/{lead_id}
```

Returns:
- Previous and new status
- Previous and new pipeline stage
- User who made the change
- Timestamp
- Remarks

## Real-Time Updates

The system uses WebSocket connections to provide real-time updates:

1. **Status Change Event**: When a lead status changes
2. **WebSocket Broadcast**: Server broadcasts the change to all connected clients
3. **Client Update**: Frontend automatically updates local storage and UI
4. **Visual Feedback**: Toast notifications show the movement
5. **Dashboard Refresh**: KPIs and pipeline counts update automatically

## Activity Timeline Example

Every status change is recorded in the lead's timeline:

```
10:05 AM - Status Changed
New Lead → Contacted
Automatically moved to Contacted Stage
By: Vaibhav

11:40 AM - Status Changed
Contacted → Interested
Automatically moved to Qualified Stage

2:15 PM - Status Changed
Interested → Documents Requested
Automatically moved to Documentation Stage
```

## Pipeline Board Updates

The Kanban pipeline board updates instantly:

**Before:**
- New Leads (15)
- Contacted (10)
- Qualified (5)

**After changing one lead from Contacted to Qualified:**
- New Leads (15)
- Contacted (9)
- Qualified (6)

No page refresh required.

## Dashboard KPI Updates

The following KPIs update automatically:

- Total Leads
- Active Leads
- Qualified Leads
- Lost Leads
- Follow-ups
- Documentation Pending
- Sanction Pending
- Disbursed Loans
- Pipeline Value
- Conversion Rate

## Employee Performance Integration

When a lead moves to a qualifying status (Interested, Qualified, etc.):

1. Employee's lead achievement count updates automatically
2. Performance metrics recalculate
3. Target engine updates if applicable
4. Real-time performance dashboard reflects changes

## Notifications

Assigned employees receive notifications when:

- Lead moved to next stage
- Documents required
- Follow-up scheduled
- Sanction approved
- Lead rejected

Notifications are delivered via:
- In-app notification center
- WebSocket real-time push
- Browser notifications (if permitted)

## Audit Trail

The system maintains a complete audit trail:

**Stored Information:**
- Lead ID
- Previous Status
- New Status
- Previous Pipeline Stage
- New Pipeline Stage
- Changed By (User ID and Name)
- Date & Time
- Remarks
- Transition Type (automatic/manual/system)

**Nothing is deleted** - complete history is preserved.

## Validation Rules

### Status Transition Validation

- Users cannot manually move a lead to a pipeline stage that doesn't match its status
- Invalid status transitions are blocked (e.g., New Lead → Disbursed directly)
- Administrators can configure allowed transitions
- Validation happens before any database changes

### Pipeline Stage Synchronization

- Pipeline stage is always synchronized with lead status
- Manual pipeline stage changes are not allowed
- Status is the single source of truth

## Error Handling

The system includes comprehensive error handling:

1. **Database Errors**: Rollback on failure, log error details
2. **Validation Errors**: Clear error messages to users
3. **WebSocket Errors**: Automatic reconnection with exponential backoff
4. **Service Failures**: Fallback to manual update if service fails
5. **Notification Errors**: Non-blocking - continue even if notification fails

## Performance Considerations

1. **Database Indexing**: All relevant fields are indexed for fast queries
2. **Batch Operations**: Multiple updates handled efficiently
3. **WebSocket Optimization**: Minimal payload for real-time updates
4. **Caching**: Pipeline configurations cached in service
5. **Async Operations**: Notifications and broadcasts run in background

## Security

1. **Authentication**: All endpoints require valid authentication
2. **Authorization**: Admin-only endpoints for configuration management
3. **Audit Trail**: Complete logging of all changes
4. **Input Validation**: All inputs validated before processing
5. **SQL Injection Protection**: Parameterized queries throughout

## Testing

### Manual Testing Steps

1. **Status Change Test**:
   - Create a test lead
   - Change status from "New" to "Contacted"
   - Verify pipeline stage updates to "Contacted"
   - Check timeline for entry
   - Verify audit trail

2. **Transition Validation Test**:
   - Try invalid transition (New → Disbursed)
   - Verify error is returned
   - Verify no changes made

3. **Real-time Update Test**:
   - Open CRM in two browser windows
   - Change lead status in one window
   - Verify other window updates automatically

4. **Dashboard Update Test**:
   - Note current dashboard KPIs
   - Change multiple lead statuses
   - Verify dashboard updates reflect changes

### API Testing

Use the provided endpoints to test the system:

```bash
# Get pipeline configuration
curl -X GET http://localhost:8000/pipeline/configuration

# Initialize default configurations
curl -X POST http://localhost:8000/pipeline/initialize

# Get lead transition history
curl -X GET http://localhost:8000/pipeline/audit/1

# Update lead status (triggers automatic pipeline movement)
curl -X PUT http://localhost:8000/leads/1 \
  -H "Content-Type: application/json" \
  -d '{"lead_status": "qualified"}'
```

## Troubleshooting

### Pipeline Stage Not Updating

**Possible Causes:**
1. Database migration not applied
2. Pipeline configurations not initialized
3. Service not integrated with lead update endpoint

**Solutions:**
1. Run database migration: `alembic upgrade head`
2. Initialize configurations: `python scripts/init_pipeline_config.py`
3. Check server logs for errors

### Real-time Updates Not Working

**Possible Causes:**
1. WebSocket connection failed
2. Frontend script not loaded
3. Browser blocking WebSocket

**Solutions:**
1. Check browser console for WebSocket errors
2. Verify script is included in HTML
3. Check network/firewall settings

### Invalid Status Transition Error

**Possible Causes:**
1. Transition not allowed in configuration
2. Status names don't match (case sensitivity)

**Solutions:**
1. Check pipeline configuration
2. Use exact status names from configuration
3. Update configuration if needed

## Future Enhancements

Potential improvements for future versions:

1. **Custom Pipeline Stages**: Allow admins to create custom pipeline stages
2. **Bulk Status Changes**: Apply status changes to multiple leads
3. **Conditional Transitions**: Add conditions for automatic transitions
4. **SLA Tracking**: Track time spent in each stage
5. **Advanced Reporting**: More detailed pipeline analytics
6. **Mobile App Support**: Native mobile app with real-time updates
7. **Integration**: Connect with external systems for status updates

## Support

For issues or questions:

1. Check this documentation first
2. Review server logs for error details
3. Check browser console for frontend errors
4. Contact development team with detailed error information

## Version History

- **v1.0.0** (2026-07-12): Initial implementation
  - Automatic pipeline movement based on status
  - Audit trail for all changes
  - Real-time updates via WebSocket
  - Admin configuration management
  - Dashboard integration
