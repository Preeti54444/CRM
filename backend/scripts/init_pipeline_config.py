"""
Initialize Pipeline Configuration Script
This script initializes default pipeline configurations for the automatic lead movement system.
Run this script after database migration to set up the default status-to-pipeline mappings.
"""

import sys
import os

# Add the parent directory to the path to import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.services.pipeline_transition_service import PipelineTransitionService


def main():
    print("Initializing Pipeline Configuration...")
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Check if configurations already exist
        from app.models.pipeline_configuration import PipelineConfiguration
        existing_count = db.query(PipelineConfiguration).count()
        
        if existing_count > 0:
            print(f"Pipeline configurations already exist ({existing_count} records).")
            response = input("Do you want to reinitialize? This will delete existing configurations. (y/N): ")
            if response.lower() != 'y':
                print("Initialization cancelled.")
                return
            
            # Delete existing configurations
            db.query(PipelineConfiguration).delete()
            db.commit()
            print("Existing configurations deleted.")
        
        # Initialize default configurations
        PipelineTransitionService.initialize_default_configurations(db)
        
        # Verify initialization
        new_count = db.query(PipelineConfiguration).count()
        print(f"Successfully initialized {new_count} pipeline configurations.")
        
        # Display configurations
        print("\nDefault Status-to-Pipeline Mappings:")
        print("-" * 60)
        configs = db.query(PipelineConfiguration).order_by(PipelineConfiguration.stage_order).all()
        
        for config in configs:
            print(f"{config.lead_status:25} -> {config.pipeline_stage:20}")
        
        print("\nPipeline system initialization complete!")
        
    except Exception as e:
        print(f"Error during initialization: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
