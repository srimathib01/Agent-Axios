"""Database base configuration."""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import scoped_session, sessionmaker

Base = declarative_base()

class Database:
    """Database manager."""
    
    def __init__(self, app=None):
        self.session = None
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize database with Flask app."""
        engine = create_engine(
            app.config['SQLALCHEMY_DATABASE_URI'],
            echo=app.config.get('SQLALCHEMY_ECHO', False)
        )
        self.session = scoped_session(
            sessionmaker(autocommit=False, autoflush=False, bind=engine)
        )
        Base.query = self.session.query_property()
        Base.metadata.create_all(bind=engine)
        
        @app.teardown_appcontext
        def shutdown_session(exception=None):
            self.session.remove()

db = Database()
