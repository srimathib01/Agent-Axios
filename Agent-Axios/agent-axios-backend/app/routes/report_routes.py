"""Report routes for vulnerability reports."""
from flask import Blueprint, request, jsonify, send_file
from app.services.auth_service import require_auth, get_current_user
from app.models import Analysis, Repository, CVEFinding, db
from sqlalchemy.orm import joinedload
from datetime import datetime
import logging
import json
import os

logger = logging.getLogger(__name__)

report_bp = Blueprint('reports', __name__)


@report_bp.route('', methods=['GET'])
@require_auth
def get_reports():
    """Get user's analysis reports with pagination and filtering.
    
    Query params:
    - page: Page number (default 1)
    - perPage: Items per page (default 10)
    - status: Filter by status
    - repoId: Filter by repository
    - startDate: Filter by start date (ISO format)
    - endDate: Filter by end date (ISO format)
    - sortBy: Sort field (created_at, vulnerability_count)
    """
    try:
        user = get_current_user()
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('perPage', 10, type=int)
        status = request.args.get('status')
        repo_id = request.args.get('repoId', type=int)
        start_date = request.args.get('startDate')
        end_date = request.args.get('endDate')
        sort_by = request.args.get('sortBy', 'created_at')
        
        # Build query
        query = db.session.query(Analysis).options(
            joinedload(Analysis.repository)
        ).join(Repository).filter(
            Repository.user_id == user.user_id
        )
        
        # Apply filters
        if status:
            query = query.filter(Analysis.status == status)
        
        if repo_id:
            query = query.filter(Analysis.repo_id == repo_id)
        
        if start_date:
            try:
                start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                query = query.filter(Analysis.created_at >= start_dt)
            except ValueError:
                pass
        
        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                query = query.filter(Analysis.created_at <= end_dt)
            except ValueError:
                pass
        
        # Apply sorting
        if sort_by == 'vulnerability_count':
            query = query.order_by(Analysis.total_findings.desc())
        else:
            query = query.order_by(Analysis.created_at.desc())
        
        # Pagination
        total = query.count()
        reports = query.limit(per_page).offset((page - 1) * per_page).all()
        
        # Enrich with repository info
        result_reports = []
        for analysis in reports:
            report_data = analysis.to_dict()
            if analysis.repository:
                report_data['repository'] = {
                    'repo_id': analysis.repository.repo_id,
                    'name': analysis.repository.name,
                    'language': analysis.repository.language
                }
            result_reports.append(report_data)
        
        return jsonify({
            'reports': result_reports,
            'total': total,
            'page': page,
            'per_page': per_page,
            'pages': (total + per_page - 1) // per_page
        })
        
    except Exception as e:
        logger.error(f"Error getting reports: {str(e)}")
        return jsonify({'error': 'Failed to get reports'}), 500


@report_bp.route('/<int:analysis_id>', methods=['GET'])
@require_auth
def get_report(analysis_id):
    """Get detailed report for an analysis."""
    try:
        user = get_current_user()
        
        # Get analysis with repository check for authorization
        analysis = db.session.query(Analysis).join(Repository).filter(
            Analysis.analysis_id == analysis_id,
            Repository.user_id == user.user_id
        ).first()
        
        if not analysis:
            return jsonify({'error': 'Report not found'}), 404
        
        # Get findings
        findings = db.session.query(CVEFinding).filter_by(
            analysis_id=analysis_id
        ).all()
        
        # Calculate summary
        confirmed = [f for f in findings if f.validation_status == 'confirmed']
        by_severity = {}
        for finding in confirmed:
            severity = finding.severity or 'UNKNOWN'
            by_severity[severity] = by_severity.get(severity, 0) + 1
        
        report = {
            'analysis': analysis.to_dict(),
            'repository': analysis.repository.to_dict() if analysis.repository else None,
            'summary': {
                'total_files': analysis.total_files,
                'total_chunks': analysis.total_chunks,
                'total_findings': len(findings),
                'confirmed_vulnerabilities': len(confirmed),
                'false_positives': len([f for f in findings if f.validation_status == 'false_positive']),
                'severity_breakdown': by_severity
            },
            'findings': [f.to_dict() for f in findings]
        }
        
        return jsonify(report)
        
    except Exception as e:
        logger.error(f"Error getting report: {str(e)}")
        return jsonify({'error': 'Failed to get report'}), 500


@report_bp.route('/<int:analysis_id>/export', methods=['GET'])
@require_auth
def export_report(analysis_id):
    """Export report as JSON or PDF.
    
    Query params:
    - format: json or pdf (default json)
    """
    try:
        user = get_current_user()
        export_format = request.args.get('format', 'json').lower()
        
        # Get analysis
        analysis = db.session.query(Analysis).join(Repository).filter(
            Analysis.analysis_id == analysis_id,
            Repository.user_id == user.user_id
        ).first()
        
        if not analysis:
            return jsonify({'error': 'Report not found'}), 404
        
        if export_format == 'json':
            # Get full report data
            findings = db.session.query(CVEFinding).filter_by(
                analysis_id=analysis_id
            ).all()
            
            report_data = {
                'analysis': analysis.to_dict(),
                'repository': analysis.repository.to_dict() if analysis.repository else None,
                'findings': [f.to_dict() for f in findings],
                'exported_at': datetime.utcnow().isoformat()
            }
            
            # Return as downloadable JSON
            filename = f"report_{analysis_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
            
            response = jsonify(report_data)
            response.headers['Content-Disposition'] = f'attachment; filename={filename}'
            return response
        
        elif export_format == 'pdf':
            # Check if PDF report exists
            report_dir = f"data/reports/analysis_{analysis_id}"
            pdf_path = os.path.join(report_dir, f"analysis_{analysis_id}.pdf")
            
            if os.path.exists(pdf_path):
                return send_file(
                    pdf_path,
                    mimetype='application/pdf',
                    as_attachment=True,
                    download_name=f"report_{analysis_id}.pdf"
                )
            else:
                return jsonify({'error': 'PDF report not found'}), 404
        
        else:
            return jsonify({'error': 'Invalid format. Use json or pdf'}), 400
        
    except Exception as e:
        logger.error(f"Error exporting report: {str(e)}")
        return jsonify({'error': 'Failed to export report'}), 500


@report_bp.route('/compare', methods=['POST'])
@require_auth
def compare_reports():
    """Compare multiple reports.
    
    Expected JSON:
    {
        "analysisIds": [1, 2, 3]
    }
    """
    try:
        user = get_current_user()
        data = request.json
        
        if not data or 'analysisIds' not in data:
            return jsonify({'error': 'analysisIds array is required'}), 400
        
        analysis_ids = data['analysisIds']
        
        if not isinstance(analysis_ids, list) or len(analysis_ids) < 2:
            return jsonify({'error': 'Provide at least 2 analysis IDs'}), 400
        
        # Get analyses with authorization check
        analyses = db.session.query(Analysis).join(Repository).filter(
            Analysis.analysis_id.in_(analysis_ids),
            Repository.user_id == user.user_id
        ).all()
        
        if len(analyses) != len(analysis_ids):
            return jsonify({'error': 'One or more reports not found'}), 404
        
        # Build comparison
        comparison = {
            'analyses': [],
            'comparison_summary': {
                'total_vulnerabilities': [],
                'severity_distribution': [],
                'common_cves': [],
                'unique_cves': []
            }
        }
        
        all_cves = {}
        
        for analysis in analyses:
            findings = db.session.query(CVEFinding).filter_by(
                analysis_id=analysis.analysis_id,
                validation_status='confirmed'
            ).all()
            
            cve_ids = [f.cve_id for f in findings if f.cve_id]
            
            # Track CVEs across analyses
            for cve_id in cve_ids:
                if cve_id not in all_cves:
                    all_cves[cve_id] = []
                all_cves[cve_id].append(analysis.analysis_id)
            
            # Build analysis summary
            severity_counts = {}
            for finding in findings:
                severity = finding.severity or 'UNKNOWN'
                severity_counts[severity] = severity_counts.get(severity, 0) + 1
            
            comparison['analyses'].append({
                'analysis_id': analysis.analysis_id,
                'repo_url': analysis.repo_url,
                'created_at': analysis.created_at.isoformat(),
                'total_findings': len(findings),
                'severity_breakdown': severity_counts,
                'cve_count': len(cve_ids)
            })
            
            comparison['comparison_summary']['total_vulnerabilities'].append({
                'analysis_id': analysis.analysis_id,
                'count': len(findings)
            })
        
        # Find common and unique CVEs
        common_cves = [cve for cve, analyses_list in all_cves.items() if len(analyses_list) == len(analysis_ids)]
        unique_cves = {aid: [] for aid in analysis_ids}
        
        for cve, analyses_list in all_cves.items():
            if len(analyses_list) == 1:
                unique_cves[analyses_list[0]].append(cve)
        
        comparison['comparison_summary']['common_cves'] = common_cves
        comparison['comparison_summary']['unique_cves'] = [
            {'analysis_id': aid, 'cves': cves} for aid, cves in unique_cves.items()
        ]
        
        return jsonify(comparison)
        
    except Exception as e:
        logger.error(f"Error comparing reports: {str(e)}")
        return jsonify({'error': 'Failed to compare reports'}), 500
