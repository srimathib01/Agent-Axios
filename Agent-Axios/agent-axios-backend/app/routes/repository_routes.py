"""Repository routes."""
from flask import Blueprint, request, jsonify
from app.services.auth_service import require_auth, get_current_user
from app.services.repository_service import RepositoryService
from app.models import Analysis, db
from app import socketio
import logging

logger = logging.getLogger(__name__)

repo_bp = Blueprint('repositories', __name__)


@repo_bp.route('', methods=['GET'])
@require_auth
def get_repositories():
    """Get user's repositories with pagination and filtering.
    
    Query params:
    - page: Page number (default 1)
    - perPage: Items per page (default 10)
    - search: Search term
    - language: Filter by language
    - sortBy: Sort field (updated_at, name, vulnerability_count)
    """
    try:
        user = get_current_user()
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('perPage', 10, type=int)
        search = request.args.get('search')
        language = request.args.get('language')
        sort_by = request.args.get('sortBy', 'updated_at')
        
        result = RepositoryService.get_repositories(
            user_id=user.user_id,
            page=page,
            per_page=per_page,
            search=search,
            language=language,
            sort_by=sort_by
        )
        
        if result is None:
            return jsonify({'error': 'Failed to get repositories'}), 500
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error getting repositories: {str(e)}")
        return jsonify({'error': 'Failed to get repositories'}), 500


@repo_bp.route('', methods=['POST'])
@require_auth
def create_repository():
    """Create a new repository.
    
    Expected JSON:
    {
        "name": "my-repo",
        "url": "https://github.com/user/repo",
        "description": "Optional description",
        "language": "Python",
        "framework": "Flask"
    }
    """
    try:
        user = get_current_user()
        data = request.json
        
        if not data or 'name' not in data or 'url' not in data:
            return jsonify({'error': 'Name and URL are required'}), 400
        
        repo = RepositoryService.create_repository(
            user_id=user.user_id,
            name=data['name'],
            url=data['url'],
            description=data.get('description'),
            language=data.get('language'),
            framework=data.get('framework')
        )
        
        if not repo:
            return jsonify({'error': 'Failed to create repository'}), 500
        
        return jsonify(repo.to_dict()), 201
        
    except Exception as e:
        logger.error(f"Error creating repository: {str(e)}")
        return jsonify({'error': 'Failed to create repository'}), 500


@repo_bp.route('/<int:repo_id>', methods=['GET'])
@require_auth
def get_repository(repo_id):
    """Get repository by ID."""
    try:
        user = get_current_user()
        repo = RepositoryService.get_repository(repo_id, user.user_id)
        
        if not repo:
            return jsonify({'error': 'Repository not found'}), 404
        
        return jsonify(repo.to_dict())
        
    except Exception as e:
        logger.error(f"Error getting repository: {str(e)}")
        return jsonify({'error': 'Failed to get repository'}), 500


@repo_bp.route('/<int:repo_id>', methods=['PUT'])
@require_auth
def update_repository(repo_id):
    """Update repository.
    
    Expected JSON:
    {
        "name": "updated-name",
        "description": "Updated description",
        "language": "Python",
        "framework": "Django",
        "isStarred": true
    }
    """
    try:
        user = get_current_user()
        data = request.json
        
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        # Map frontend fields to backend
        update_data = {}
        if 'name' in data:
            update_data['name'] = data['name']
        if 'description' in data:
            update_data['description'] = data['description']
        if 'language' in data:
            update_data['language'] = data['language']
        if 'framework' in data:
            update_data['framework'] = data['framework']
        if 'isStarred' in data:
            update_data['is_starred'] = data['isStarred']
        
        repo = RepositoryService.update_repository(repo_id, user.user_id, **update_data)
        
        if not repo:
            return jsonify({'error': 'Repository not found'}), 404
        
        return jsonify(repo.to_dict())
        
    except Exception as e:
        logger.error(f"Error updating repository: {str(e)}")
        return jsonify({'error': 'Failed to update repository'}), 500


@repo_bp.route('/<int:repo_id>', methods=['DELETE'])
@require_auth
def delete_repository(repo_id):
    """Delete repository."""
    try:
        user = get_current_user()
        success = RepositoryService.delete_repository(repo_id, user.user_id)
        
        if not success:
            return jsonify({'error': 'Repository not found'}), 404
        
        return jsonify({'message': 'Repository deleted successfully'})
        
    except Exception as e:
        logger.error(f"Error deleting repository: {str(e)}")
        return jsonify({'error': 'Failed to delete repository'}), 500


@repo_bp.route('/<int:repo_id>/scan', methods=['POST'])
@require_auth
def trigger_scan(repo_id):
    """Trigger vulnerability scan for repository.
    
    Expected JSON:
    {
        "analysisType": "SHORT|MEDIUM|HARD"
    }
    """
    try:
        user = get_current_user()
        data = request.json
        
        # Get repository
        repo = RepositoryService.get_repository(repo_id, user.user_id)
        if not repo:
            return jsonify({'error': 'Repository not found'}), 404
        
        analysis_type = data.get('analysisType', 'MEDIUM').upper()
        if analysis_type not in ['SHORT', 'MEDIUM', 'HARD']:
            return jsonify({'error': 'Invalid analysis type'}), 400
        
        # Create analysis record
        analysis = Analysis(
            repo_url=repo.url,
            repo_id=repo_id,
            analysis_type=analysis_type,
            status='pending'
        )
        db.session.add(analysis)
        db.session.commit()
        
        # Update repository status
        repo.last_scan_status = 'pending'
        db.session.commit()
        
        logger.info(f"Scan triggered for repository {repo_id}: analysis {analysis.analysis_id}")
        
        return jsonify({
            'analysis_id': analysis.analysis_id,
            'status': 'pending',
            'message': 'Scan initiated successfully'
        }), 201
        
    except Exception as e:
        logger.error(f"Error triggering scan: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to trigger scan'}), 500


@repo_bp.route('/<int:repo_id>/scan-status', methods=['GET'])
@require_auth
def get_scan_status(repo_id):
    """Get latest scan status for repository."""
    try:
        user = get_current_user()
        repo = RepositoryService.get_repository(repo_id, user.user_id)
        
        if not repo:
            return jsonify({'error': 'Repository not found'}), 404
        
        # Get latest analysis
        latest_analysis = db.session.query(Analysis).filter_by(
            repo_id=repo_id
        ).order_by(Analysis.created_at.desc()).first()
        
        if not latest_analysis:
            return jsonify({
                'status': 'no_scans',
                'message': 'No scans found for this repository'
            })
        
        return jsonify({
            'analysis_id': latest_analysis.analysis_id,
            'status': latest_analysis.status,
            'progress': latest_analysis.to_dict()
        })
        
    except Exception as e:
        logger.error(f"Error getting scan status: {str(e)}")
        return jsonify({'error': 'Failed to get scan status'}), 500


@repo_bp.route('/<int:repo_id>/analyses', methods=['GET'])
@require_auth
def get_repository_analyses(repo_id):
    """Get all analyses for repository with pagination."""
    try:
        user = get_current_user()
        repo = RepositoryService.get_repository(repo_id, user.user_id)
        
        if not repo:
            return jsonify({'error': 'Repository not found'}), 404
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('perPage', 10, type=int)
        
        query = db.session.query(Analysis).filter_by(repo_id=repo_id).order_by(
            Analysis.created_at.desc()
        )
        
        total = query.count()
        analyses = query.limit(per_page).offset((page - 1) * per_page).all()
        
        return jsonify({
            'analyses': [a.to_dict() for a in analyses],
            'total': total,
            'page': page,
            'per_page': per_page,
            'pages': (total + per_page - 1) // per_page
        })
        
    except Exception as e:
        logger.error(f"Error getting repository analyses: {str(e)}")
        return jsonify({'error': 'Failed to get analyses'}), 500
