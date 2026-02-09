"""Repository service for managing code repositories."""
from app.models import Repository, Analysis, db
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class RepositoryService:
    """Service for repository operations."""
    
    @staticmethod
    def create_repository(user_id, name, url, **kwargs):
        """Create a new repository.
        
        Args:
            user_id: User ID
            name: Repository name
            url: Repository URL
            **kwargs: Optional fields (description, language, framework)
            
        Returns:
            Repository object or None
        """
        try:
            repo = Repository(
                user_id=user_id,
                name=name,
                url=url,
                description=kwargs.get('description'),
                language=kwargs.get('language'),
                framework=kwargs.get('framework')
            )
            
            db.session.add(repo)
            db.session.commit()
            
            logger.info(f"Repository created: {name} by user {user_id}")
            return repo
            
        except Exception as e:
            logger.error(f"Error creating repository: {str(e)}")
            db.session.rollback()
            return None
    
    @staticmethod
    def get_repositories(user_id, page=1, per_page=10, search=None, language=None, sort_by='updated_at'):
        """Get user's repositories with pagination and filtering.
        
        Args:
            user_id: User ID
            page: Page number
            per_page: Items per page
            search: Search term for name/url
            language: Filter by language
            sort_by: Sort field (updated_at, name, vulnerability_count)
            
        Returns:
            Dict with repositories, total, page info
        """
        try:
            query = db.session.query(Repository).filter_by(user_id=user_id)
            
            # Apply filters
            if search:
                search_term = f"%{search}%"
                query = query.filter(
                    (Repository.name.ilike(search_term)) | 
                    (Repository.url.ilike(search_term))
                )
            
            if language:
                query = query.filter_by(language=language)
            
            # Apply sorting
            if sort_by == 'name':
                query = query.order_by(Repository.name.asc())
            elif sort_by == 'vulnerability_count':
                query = query.order_by(Repository.vulnerability_count.desc())
            else:
                query = query.order_by(Repository.updated_at.desc())
            
            # Pagination
            total = query.count()
            repos = query.limit(per_page).offset((page - 1) * per_page).all()
            
            return {
                'repositories': [r.to_dict() for r in repos],
                'total': total,
                'page': page,
                'per_page': per_page,
                'pages': (total + per_page - 1) // per_page
            }
            
        except Exception as e:
            logger.error(f"Error getting repositories: {str(e)}")
            return None
    
    @staticmethod
    def get_repository(repo_id, user_id):
        """Get repository by ID for specific user.
        
        Args:
            repo_id: Repository ID
            user_id: User ID
            
        Returns:
            Repository object or None
        """
        try:
            return db.session.query(Repository).filter_by(
                repo_id=repo_id,
                user_id=user_id
            ).first()
        except Exception as e:
            logger.error(f"Error getting repository: {str(e)}")
            return None
    
    @staticmethod
    def update_repository(repo_id, user_id, **kwargs):
        """Update repository.
        
        Args:
            repo_id: Repository ID
            user_id: User ID
            **kwargs: Fields to update
            
        Returns:
            Updated repository or None
        """
        try:
            repo = RepositoryService.get_repository(repo_id, user_id)
            if not repo:
                return None
            
            allowed_fields = ['name', 'description', 'language', 'framework', 'is_starred']
            for field, value in kwargs.items():
                if field in allowed_fields and value is not None:
                    setattr(repo, field, value)
            
            repo.updated_at = datetime.utcnow()
            db.session.commit()
            
            logger.info(f"Repository updated: {repo_id}")
            return repo
            
        except Exception as e:
            logger.error(f"Error updating repository: {str(e)}")
            db.session.rollback()
            return None
    
    @staticmethod
    def delete_repository(repo_id, user_id):
        """Delete repository.
        
        Args:
            repo_id: Repository ID
            user_id: User ID
            
        Returns:
            True if successful, False otherwise
        """
        try:
            repo = RepositoryService.get_repository(repo_id, user_id)
            if not repo:
                return False
            
            db.session.delete(repo)
            db.session.commit()
            
            logger.info(f"Repository deleted: {repo_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting repository: {str(e)}")
            db.session.rollback()
            return False
    
    @staticmethod
    def update_scan_stats(repo_id, analysis):
        """Update repository scan statistics after analysis.
        
        Args:
            repo_id: Repository ID
            analysis: Analysis object
            
        Returns:
            Updated repository or None
        """
        try:
            repo = db.session.query(Repository).filter_by(repo_id=repo_id).first()
            if not repo:
                return None
            
            repo.last_scan_at = datetime.utcnow()
            repo.last_scan_status = analysis.status
            repo.total_scans += 1
            
            if analysis.status == 'completed':
                # Count vulnerabilities by severity
                from app.models import CVEFinding
                findings = db.session.query(CVEFinding).filter_by(
                    analysis_id=analysis.analysis_id,
                    validation_status='confirmed'
                ).all()
                
                repo.vulnerability_count = len(findings)
                repo.critical_count = len([f for f in findings if f.severity == 'CRITICAL'])
                repo.high_count = len([f for f in findings if f.severity == 'HIGH'])
                repo.medium_count = len([f for f in findings if f.severity == 'MEDIUM'])
                repo.low_count = len([f for f in findings if f.severity == 'LOW'])
            
            repo.updated_at = datetime.utcnow()
            db.session.commit()
            
            logger.info(f"Repository scan stats updated: {repo_id}")
            return repo
            
        except Exception as e:
            logger.error(f"Error updating scan stats: {str(e)}")
            db.session.rollback()
            return None
