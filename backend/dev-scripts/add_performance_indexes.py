from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Add index for leads.assigned_to to speed up employee queries
    try:
        conn.execute(text('CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to)'))
        conn.commit()
        print('Index idx_leads_assigned_to created')
    except Exception as e:
        print(f'Error creating idx_leads_assigned_to: {e}')
    
    # Add index for followups.assigned_to
    try:
        conn.execute(text('CREATE INDEX IF NOT EXISTS idx_followups_assigned_to ON followups(assigned_to)'))
        conn.commit()
        print('Index idx_followups_assigned_to created')
    except Exception as e:
        print(f'Error creating idx_followups_assigned_to: {e}')
    
    # Add index for tasks.assigned_to
    try:
        conn.execute(text('CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to)'))
        conn.commit()
        print('Index idx_tasks_assigned_to created')
    except Exception as e:
        print(f'Error creating idx_tasks_assigned_to: {e}')
    
    # Add index for leads.lead_status
    try:
        conn.execute(text('CREATE INDEX IF NOT EXISTS idx_leads_lead_status ON leads(lead_status)'))
        conn.commit()
        print('Index idx_leads_lead_status created')
    except Exception as e:
        print(f'Error creating idx_leads_lead_status: {e}')
