import asyncio
from datetime import datetime, timezone, timedelta
from app.db.session import get_session_factory
from app.db.models import BiometricTask, Enrollment

def simulate():
    session_factory = get_session_factory()
    with session_factory() as db:
        # Get a sample student
        enrollment = db.query(Enrollment).first()
        if not enrollment:
            print("No enrollment found")
            return
            
        student_id = enrollment.student_id
        
        # Mark enrollment as processing
        enrollment.status = "processing"
        
        # Create a zombie task
        task = BiometricTask(
            celery_task_id="fake-zombie-task-123",
            student_id=student_id,
            task_type="enrollment_processing",
            status="processing",
            started_at=datetime.now(timezone.utc) - timedelta(minutes=20),
            worker_hostname="fake-worker"
        )
        db.add(task)
        db.commit()
        print(f"Simulated zombie task for {student_id}")

if __name__ == "__main__":
    simulate()
