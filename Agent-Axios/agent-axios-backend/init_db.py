"""Initialize or recreate the database with current schema."""
import os
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from app.models.base import Base, db
from app.models import (
    Analysis, CodeChunk, CVEFinding, CVEDataset,
    User, Repository, Notification, ChatMessage
)

def init_database():
    """Initialize database with all tables."""
    print("🔄 Initializing database...")
    
    # Create data directory if it doesn't exist
    data_dir = Path('data')
    data_dir.mkdir(exist_ok=True)
    
    db_path = data_dir / 'agent_axios.db'
    
    # Drop existing database if exists
    if db_path.exists():
        print(f"⚠️  Removing existing database: {db_path}")
        db_path.unlink()
    
    # Create all tables
    print("📋 Creating tables...")
    engine = db.session.get_bind()
    Base.metadata.create_all(bind=engine)
    
    # Verify tables
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    print(f"\n✅ Database initialized successfully!")
    print(f"📊 Created {len(tables)} tables:")
    for table in sorted(tables):
        print(f"   - {table}")
    
    print(f"\n💾 Database location: {db_path.absolute()}")

if __name__ == '__main__':
    # Import Flask app to initialize database connection
    from app import create_app
    
    app = create_app()
    
    with app.app_context():
        init_database()
