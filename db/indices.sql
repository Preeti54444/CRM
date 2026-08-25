-- Suggested indexes for production performance

-- Index for common lookups by lead status and created_at
CREATE INDEX IF NOT EXISTS idx_leads_status_created_at ON leads (status, created_at);

-- Index for audit log queries by employee and created_at
CREATE INDEX IF NOT EXISTS idx_target_audit_employee_created_at ON target_audit_logs (employee_id, created_at);

-- Index for carry-forward lookups
CREATE INDEX IF NOT EXISTS idx_employee_carry_forward_employee_period ON employee_carry_forward (employee_id, carry_period_start);

-- Add any foreign key-related indexes for performance
-- Example: index on calls.employee_id
CREATE INDEX IF NOT EXISTS idx_calls_employee_id ON calls (employee_id);
