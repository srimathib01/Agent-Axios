"""
Enhanced PDF Report Generator for Security Analysis
Creates professional PDF reports with neat UI and detailed information.
"""
import os
import json
from datetime import datetime
from typing import Dict, Any, List
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.pdfgen import canvas as pdf_canvas
import logging

logger = logging.getLogger(__name__)


class EnhancedPDFReportGenerator:
    """Generate professional security analysis PDF reports"""
    
    def __init__(self, output_dir: str = "data/reports"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom paragraph styles"""
        # Title style
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1a237e'),
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        # Subtitle style
        self.styles.add(ParagraphStyle(
            name='CustomSubtitle',
            parent=self.styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#283593'),
            spaceAfter=12,
            spaceBefore=12,
            fontName='Helvetica-Bold'
        ))
        
        # Section header style
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading3'],
            fontSize=14,
            textColor=colors.HexColor('#3f51b5'),
            spaceAfter=10,
            spaceBefore=15,
            fontName='Helvetica-Bold',
            borderWidth=1,
            borderColor=colors.HexColor('#3f51b5'),
            borderPadding=5,
            backColor=colors.HexColor('#e8eaf6')
        ))
        
        # Code style
        self.styles.add(ParagraphStyle(
            name='CodeBlock',
            parent=self.styles['Code'],
            fontSize=9,
            textColor=colors.HexColor('#212121'),
            backColor=colors.HexColor('#f5f5f5'),
            borderWidth=1,
            borderColor=colors.HexColor('#bdbdbd'),
            borderPadding=10,
            fontName='Courier',
            spaceAfter=10,
            spaceBefore=5,
            leftIndent=20,
            rightIndent=20
        ))
        
        # Info box style
        self.styles.add(ParagraphStyle(
            name='InfoBox',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#004d40'),
            backColor=colors.HexColor('#e0f2f1'),
            borderWidth=1,
            borderColor=colors.HexColor('#00897b'),
            borderPadding=10,
            spaceAfter=10,
            spaceBefore=5
        ))
        
        # Warning style
        self.styles.add(ParagraphStyle(
            name='Warning',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#e65100'),
            backColor=colors.HexColor('#fff3e0'),
            borderWidth=1,
            borderColor=colors.HexColor('#ff9800'),
            borderPadding=10,
            spaceAfter=10,
            spaceBefore=5
        ))
    
    def _add_header_footer(self, canvas_obj, doc):
        """Add header and footer to each page"""
        canvas_obj.saveState()
        
        # Header
        canvas_obj.setFont('Helvetica-Bold', 10)
        canvas_obj.setFillColor(colors.HexColor('#1a237e'))
        canvas_obj.drawString(inch, doc.height + doc.topMargin + 0.3*inch, 
                             "Agent Axios Security Analysis")
        canvas_obj.setFont('Helvetica', 8)
        canvas_obj.drawRightString(doc.width + doc.leftMargin, 
                                   doc.height + doc.topMargin + 0.3*inch,
                                   datetime.now().strftime("%Y-%m-%d %H:%M"))
        
        # Header line
        canvas_obj.setStrokeColor(colors.HexColor('#3f51b5'))
        canvas_obj.setLineWidth(2)
        canvas_obj.line(inch, doc.height + doc.topMargin + 0.2*inch,
                       doc.width + doc.leftMargin, doc.height + doc.topMargin + 0.2*inch)
        
        # Footer
        canvas_obj.setFont('Helvetica', 8)
        canvas_obj.setFillColor(colors.grey)
        canvas_obj.drawString(inch, 0.5*inch, 
                             "Confidential - Security Analysis")
        canvas_obj.drawRightString(doc.width + doc.leftMargin, 0.5*inch,
                                   f"Page {doc.page}")
        
        # Footer line
        canvas_obj.setStrokeColor(colors.HexColor('#3f51b5'))
        canvas_obj.setLineWidth(1)
        canvas_obj.line(inch, 0.7*inch, doc.width + doc.leftMargin, 0.7*inch)
        
        canvas_obj.restoreState()
    
    def generate_repo_analysis_report(self, analysis_data: Dict[str, Any], filename: str = None) -> str:
        """Generate repository analysis PDF report (Phase 1)"""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"repo_analysis_{timestamp}.pdf"
        
        if not filename.endswith('.pdf'):
            filename += '.pdf'
        
        pdf_path = os.path.join(self.output_dir, filename)
        
        doc = SimpleDocTemplate(pdf_path, pagesize=letter, rightMargin=inch,
                                leftMargin=inch, topMargin=inch, bottomMargin=inch)
        
        story = []
        
        # Title
        story.append(Spacer(1, inch))
        story.append(Paragraph("REPOSITORY ANALYSIS REPORT", self.styles['CustomTitle']))
        story.append(Spacer(1, 0.3*inch))
        
        # Repository info
        repo_url = analysis_data.get('repo_url', 'N/A')
        total_files = analysis_data.get('total_files', 0)
        languages = analysis_data.get('languages', {})
        
        info_text = f"""
        <b>Repository:</b> {repo_url}<br/>
        <b>Analysis Date:</b> {datetime.now().strftime("%B %d, %Y")}<br/>
        <b>Total Files:</b> {total_files}<br/>
        <b>Languages Detected:</b> {', '.join(languages.keys()) if languages else 'Unknown'}<br/>
        """
        story.append(Paragraph(info_text, self.styles['InfoBox']))
        story.append(Spacer(1, 0.3*inch))
        
        # Structure analysis
        story.append(Paragraph("Repository Structure", self.styles['SectionHeader']))
        structure = analysis_data.get('structure', {})
        if structure:
            for key, value in structure.items():
                story.append(Paragraph(f"<b>{key}:</b> {value}", self.styles['Normal']))
                story.append(Spacer(1, 0.05*inch))
        
        # Technology stack
        story.append(Spacer(1, 0.2*inch))
        story.append(Paragraph("Technology Stack", self.styles['SectionHeader']))
        frameworks = analysis_data.get('frameworks', [])
        if frameworks:
            for fw in frameworks:
                story.append(Paragraph(f"• {fw}", self.styles['Normal']))
        
        doc.build(story, onFirstPage=self._add_header_footer, onLaterPages=self._add_header_footer)
        logger.info(f"Repository analysis PDF generated: {pdf_path}")
        return pdf_path
    
    def generate_cve_detection_report(self, cve_data: List[Dict[str, Any]], filename: str = None) -> str:
        """Generate CVE detection PDF report (Phase 2)"""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"cve_detection_{timestamp}.pdf"
        
        if not filename.endswith('.pdf'):
            filename += '.pdf'
        
        pdf_path = os.path.join(self.output_dir, filename)
        
        doc = SimpleDocTemplate(pdf_path, pagesize=letter, rightMargin=inch,
                                leftMargin=inch, topMargin=inch, bottomMargin=inch)
        
        story = []
        
        # Title
        story.append(Spacer(1, inch))
        story.append(Paragraph("CVE DETECTION REPORT", self.styles['CustomTitle']))
        story.append(Spacer(1, 0.3*inch))
        
        # Summary
        info_text = f"""
        <b>Total CVEs Found:</b> {len(cve_data)}<br/>
        <b>Detection Date:</b> {datetime.now().strftime("%B %d, %Y %H:%M")}<br/>
        """
        story.append(Paragraph(info_text, self.styles['InfoBox']))
        story.append(Spacer(1, 0.3*inch))
        
        # CVE Table
        story.append(Paragraph("Detected Vulnerabilities", self.styles['SectionHeader']))
        
        if cve_data:
            table_data = [['CVE ID', 'Severity', 'CVSS Score', 'Relevance']]
            
            for cve in cve_data[:20]:  # Top 20
                cve_id = cve.get('cve_id', 'N/A')
                severity = cve.get('severity', 'UNKNOWN')
                cvss_score = cve.get('cvss_score', 0.0)
                relevance = cve.get('relevance_score', 0.0)
                
                table_data.append([
                    cve_id,
                    severity,
                    f"{cvss_score:.1f}",
                    f"{relevance:.2f}"
                ])
            
            table = Table(table_data, colWidths=[2*inch, 1.2*inch, 1*inch, 1*inch])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3f51b5')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9f9f9')])
            ]))
            story.append(table)
        
        doc.build(story, onFirstPage=self._add_header_footer, onLaterPages=self._add_header_footer)
        logger.info(f"CVE detection PDF generated: {pdf_path}")
        return pdf_path
    
    def generate_final_vulnerability_report(self, analysis_id: int, findings: List, chunks: Dict) -> str:
        """Generate final vulnerability analysis PDF report (Phase 3)"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"vulnerability_report_{analysis_id}_{timestamp}.pdf"
        pdf_path = os.path.join(self.output_dir, filename)
        
        doc = SimpleDocTemplate(pdf_path, pagesize=letter, rightMargin=inch,
                                leftMargin=inch, topMargin=inch, bottomMargin=inch)
        
        story = []
        
        # Title
        story.append(Spacer(1, inch))
        story.append(Paragraph("VULNERABILITY ANALYSIS REPORT", self.styles['CustomTitle']))
        story.append(Spacer(1, 0.3*inch))
        
        # Summary
        critical_count = sum(1 for f in findings if f.severity == 'CRITICAL')
        high_count = sum(1 for f in findings if f.severity == 'HIGH')
        
        info_text = f"""
        <b>Analysis ID:</b> {analysis_id}<br/>
        <b>Total Findings:</b> {len(findings)}<br/>
        <b>Critical:</b> {critical_count} | <b>High:</b> {high_count}<br/>
        <b>Report Date:</b> {datetime.now().strftime("%B %d, %Y %H:%M")}<br/>
        """
        story.append(Paragraph(info_text, self.styles['InfoBox']))
        story.append(PageBreak())
        
        # Findings
        story.append(Paragraph("Detailed Findings", self.styles['CustomSubtitle']))
        
        for idx, finding in enumerate(findings[:10], 1):  # Top 10
            story.append(Paragraph(f"Finding #{idx}: {finding.cve_id}", self.styles['SectionHeader']))
            
            finding_text = f"""
            <b>File:</b> {finding.file_path}<br/>
            <b>Severity:</b> {finding.severity or 'UNKNOWN'}<br/>
            <b>Confidence:</b> {finding.confidence_score:.2f}<br/>
            <b>Validation:</b> {finding.validation_status}<br/>
            """
            
            if finding.validation_explanation:
                finding_text += f"<br/><b>Explanation:</b><br/>{finding.validation_explanation[:300]}..."
            
            story.append(Paragraph(finding_text, self.styles['Normal']))
            story.append(Spacer(1, 0.2*inch))
        
        doc.build(story, onFirstPage=self._add_header_footer, onLaterPages=self._add_header_footer)
        logger.info(f"Final vulnerability PDF generated: {pdf_path}")
        return pdf_path
