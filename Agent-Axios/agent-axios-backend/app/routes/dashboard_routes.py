"""Dashboard and analytics routes."""
from flask import Blueprint, request, jsonify
from app.services.auth_service import require_auth, get_current_user
from app.models import Repository, Analysis, CVEFinding, Notification, db
from sqlalchemy import case, func
from sqlalchemy.orm import joinedload
from types import SimpleNamespace
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('/overview', methods=['GET'])
@require_auth
def get_dashboard_overview():
    """Get dashboard overview statistics."""
    try:
        user = get_current_user()
        
        # Repository stats via single aggregate query
        repo_stats = db.session.query(
            func.count(Repository.repo_id).label('total'),
            func.sum(case((Repository.is_starred.is_(True), 1), else_=0)).label('starred'),
            func.coalesce(func.sum(Repository.vulnerability_count), 0).label('total_vulns'),
            func.coalesce(func.sum(Repository.critical_count), 0).label('critical'),
            func.coalesce(func.sum(Repository.high_count), 0).label('high'),
            func.coalesce(func.sum(Repository.medium_count), 0).label('medium'),
            func.coalesce(func.sum(Repository.low_count), 0).label('low')
        ).filter(
            Repository.user_id == user.user_id
        ).one()

        total_repos = repo_stats.total or 0
        starred_repos = int(repo_stats.starred or 0)

        repo_ids_subquery = db.session.query(Repository.repo_id).filter(
            Repository.user_id == user.user_id
        ).subquery()

        if total_repos:
            analysis_stats = db.session.query(
                func.count(Analysis.analysis_id).label('total'),
                func.sum(case((Analysis.status.in_(['pending', 'running']), 1), else_=0)).label('active'),
                func.sum(case((Analysis.status == 'completed', 1), else_=0)).label('completed'),
                func.sum(case((Analysis.status == 'failed', 1), else_=0)).label('failed')
            ).filter(
                Analysis.repo_id.in_(repo_ids_subquery)
            ).one()
        else:
            analysis_stats = SimpleNamespace(total=0, active=0, completed=0, failed=0)
        
        # Vulnerability stats
        total_vulnerabilities = int(repo_stats.total_vulns or 0)
        critical_count = int(repo_stats.critical or 0)
        high_count = int(repo_stats.high or 0)
        medium_count = int(repo_stats.medium or 0)
        low_count = int(repo_stats.low or 0)
        
        # Notification stats
        unread_notifications = db.session.query(Notification).filter_by(
            user_id=user.user_id, is_read=False
        ).count()
        
        # Recent activity (last 7 days)
        week_ago = datetime.utcnow() - timedelta(days=7)
        if total_repos:
            recent_scans = db.session.query(Analysis).filter(
                Analysis.repo_id.in_(repo_ids_subquery),
                Analysis.created_at >= week_ago
            ).count()

            recent_analyses = db.session.query(Analysis).options(
                joinedload(Analysis.repository)
            ).filter(
                Analysis.repo_id.in_(repo_ids_subquery)
            ).order_by(
                Analysis.created_at.desc()
            ).limit(5).all()
        else:
            recent_scans = 0
            recent_analyses = []

        recent_repos = db.session.query(Repository).filter(
            Repository.user_id == user.user_id
        ).order_by(Repository.updated_at.desc()).limit(5).all()
        
        return jsonify({
            'repositories': {
                'total': total_repos,
                'starred': starred_repos,
                'recent': [r.to_dict() for r in recent_repos]
            },
            'scans': {
                'total': int(analysis_stats.total or 0),
                'active': int(analysis_stats.active or 0),
                'completed': int(analysis_stats.completed or 0),
                'failed': int(analysis_stats.failed or 0),
                'recent_count': recent_scans,
                'recent': [a.to_dict() for a in recent_analyses]
            },
            'vulnerabilities': {
                'total': int(total_vulnerabilities),
                'critical': int(critical_count),
                'high': int(high_count),
                'medium': int(medium_count),
                'low': int(low_count)
            },
            'notifications': {
                'unread': unread_notifications
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting dashboard overview: {str(e)}")
        return jsonify({'error': 'Failed to get dashboard overview'}), 500


@dashboard_bp.route('/analytics', methods=['GET'])
@require_auth
def get_analytics():
    """Get analytics data with time series.
    
    Query params:
    - days: Number of days to look back (default 30)
    """
    try:
        user = get_current_user()
        days = request.args.get('days', 30, type=int)
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Scan trends
        scan_history = db.session.query(
            func.date(Analysis.created_at).label('date'),
            func.count(Analysis.analysis_id).label('count'),
            Analysis.status
        ).join(Repository).filter(
            Repository.user_id == user.user_id,
            Analysis.created_at >= start_date
        ).group_by(
            func.date(Analysis.created_at),
            Analysis.status
        ).all()
        
        # Vulnerability trends
        vuln_history = db.session.query(
            func.date(Analysis.created_at).label('date'),
            func.sum(Analysis.total_findings).label('findings')
        ).join(Repository).filter(
            Repository.user_id == user.user_id,
            Analysis.created_at >= start_date,
            Analysis.status == 'completed'
        ).group_by(
            func.date(Analysis.created_at)
        ).all()
        
        # Language distribution
        language_dist = db.session.query(
            Repository.language,
            func.count(Repository.repo_id).label('count')
        ).filter(
            Repository.user_id == user.user_id,
            Repository.language.isnot(None)
        ).group_by(Repository.language).all()
        
        return jsonify({
            'scan_trends': [
                {
                    'date': str(s.date),
                    'count': s.count,
                    'status': s.status
                } for s in scan_history
            ],
            'vulnerability_trends': [
                {
                    'date': str(v.date),
                    'findings': int(v.findings) if v.findings else 0
                } for v in vuln_history
            ],
            'language_distribution': [
                {
                    'language': l.language,
                    'count': l.count
                } for l in language_dist
            ],
            'period_days': days
        })
        
    except Exception as e:
        logger.error(f"Error getting analytics: {str(e)}")
        return jsonify({'error': 'Failed to get analytics'}), 500
