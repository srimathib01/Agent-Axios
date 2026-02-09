"""GPT-4 validation service - validates CVE findings using Azure OpenAI."""
import os
from typing import List, Callable, Optional
from openai import AzureOpenAI
from langsmith import traceable
from app.models import CodeChunk, CVEFinding, CVEDataset, db
from config.settings import Config
import logging

logger = logging.getLogger(__name__)

class ValidationService:
    """Validates CVE findings using GPT-4.1."""
    
    def __init__(self):
        self.client = AzureOpenAI(
            api_key=Config.AZURE_OPENAI_API_KEY,
            api_version=Config.AZURE_OPENAI_API_VERSION,
            azure_endpoint=Config.AZURE_OPENAI_ENDPOINT
        )
        self.model = Config.AZURE_OPENAI_MODEL
        logger.info(f"ValidationService initialized:")
        logger.info(f"  Model deployment: {self.model}")
        logger.info(f"  API version: {Config.AZURE_OPENAI_API_VERSION}")
        logger.info(f"  Endpoint: {Config.AZURE_OPENAI_ENDPOINT}")
    
    @traceable(name="validate_all_findings", run_type="tool")
    def validate_all_findings(
        self,
        findings: List[CVEFinding],
        chunks: List[CodeChunk],
        progress_callback: Optional[Callable[[int, int], None]] = None
    ):
        """
        Validate all findings using GPT-4.1.
        
        Args:
            findings: List of CVEFinding objects
            chunks: List of CodeChunk objects (for context)
            progress_callback: Optional progress callback (current, total)
        """
        total = len(findings)
        logger.info(f"Validating {total} findings with GPT-4.1")
        
        # Create chunk lookup
        chunk_map = {chunk.chunk_id: chunk for chunk in chunks}
        
        for i, finding in enumerate(findings):
            try:
                chunk = chunk_map.get(finding.chunk_id)
                if not chunk:
                    logger.warning(f"Chunk {finding.chunk_id} not found for finding {finding.finding_id}")
                    continue
                
                # Get CVE data
                cve = db.session.query(CVEDataset).filter_by(cve_id=finding.cve_id).first()
                if not cve:
                    logger.warning(f"CVE {finding.cve_id} not found")
                    continue
                
                # Validate with GPT-4
                is_valid, severity, explanation = self._validate_finding(chunk, cve)
                
                # Update finding
                finding.validation_status = 'confirmed' if is_valid else 'false_positive'
                finding.severity = severity if is_valid else None
                finding.validation_explanation = explanation

                db.session.flush()
                
                if progress_callback:
                    progress_callback(i + 1, total)
                
                if (i + 1) % 5 == 0:
                    logger.info(f"Validated {i + 1}/{total} findings")
                    
            except Exception as e:
                logger.error(f"Failed to validate finding {finding.finding_id}: {str(e)}")
                finding.validation_status = 'needs_review'
                finding.validation_explanation = f"Validation error: {str(e)}"
                db.session.flush()
                continue
        
        confirmed = sum(1 for f in findings if f.validation_status == 'confirmed')
        logger.info(f"Validation complete: {confirmed}/{total} confirmed")
        db.session.commit()
    
    @traceable(name="validate_single_finding", run_type="llm")
    def _validate_finding(
        self,
        chunk: CodeChunk,
        cve: CVEDataset
    ) -> tuple[bool, str, str]:
        """
        Validate a single finding using GPT-4.1.
        
        Returns:
            (is_valid, severity, explanation)
        """
        prompt = f"""You are a security expert analyzing code for vulnerabilities.

CVE Information:
- ID: {cve.cve_id}
- Description: {cve.description}
- Severity: {cve.severity}
- CWE: {cve.cwe_id or 'N/A'}

Code to Analyze:
File: {chunk.file_path}
Lines {chunk.line_start}-{chunk.line_end}:
```
{chunk.chunk_text}
```

Task:
1. Determine if this code is vulnerable to the described CVE
2. If vulnerable, assess the severity (CRITICAL, HIGH, MEDIUM, LOW)
3. Provide a brief explanation

Response format:
VULNERABLE: YES/NO
SEVERITY: CRITICAL/HIGH/MEDIUM/LOW/NONE
EXPLANATION: <your explanation>

Be strict in your assessment. Only confirm if there's clear evidence of vulnerability."""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a security expert specializing in vulnerability analysis."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,  # Low temperature for consistent output
                max_tokens=500
            )
            
            content = response.choices[0].message.content.strip()
            
            # Parse response
            is_valid = 'VULNERABLE: YES' in content
            
            # Extract severity
            severity = 'MEDIUM'  # default
            for line in content.split('\n'):
                if line.startswith('SEVERITY:'):
                    severity_text = line.split(':')[1].strip()
                    if severity_text in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']:
                        severity = severity_text
                    break
            
            # Extract explanation
            explanation = ''
            if 'EXPLANATION:' in content:
                explanation = content.split('EXPLANATION:')[1].strip()
            
            return is_valid, severity, explanation
            
        except Exception as e:
            logger.error(f"GPT-4 validation failed: {str(e)}")
            return False, 'UNKNOWN', f"Validation failed: {str(e)}"
    
    @traceable(name="validate_cve_match", run_type="llm")
    def validate_cve_match(
        self,
        cve_id: str,
        cve_description: str,
        code_snippet: str,
        file_path: str
    ) -> dict:
        """
        Validate whether a code snippet is vulnerable to a specific CVE.
        This is used by the agent tool for on-the-fly validation during analysis.
        
        Args:
            cve_id: CVE identifier
            cve_description: Description of the vulnerability
            code_snippet: Code to analyze
            file_path: Path to the file
            
        Returns:
            dict with keys: is_vulnerable, confidence, severity, reasoning
        """
        try:
            prompt = f"""You are a security expert analyzing code for vulnerabilities.

CVE Information:
- ID: {cve_id}
- Description: {cve_description}

Code to analyze (from {file_path}):
```
{code_snippet}
```

Analyze if this code is vulnerable to the CVE described above.

Respond in this format:
VULNERABLE: yes/no
CONFIDENCE: 0.0-1.0 (how confident are you?)
SEVERITY: CRITICAL/HIGH/MEDIUM/LOW (if vulnerable)
REASONING: Brief explanation of your analysis
"""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=500
            )
            
            content = response.choices[0].message.content.strip()
            
            # Parse response
            is_vulnerable = 'yes' in content.split('\n')[0].lower()
            
            confidence = 0.5
            for line in content.split('\n'):
                if line.startswith('CONFIDENCE:'):
                    try:
                        confidence = float(line.split(':')[1].strip())
                    except:
                        pass
                    break
            
            severity = 'MEDIUM'
            for line in content.split('\n'):
                if line.startswith('SEVERITY:'):
                    sev_text = line.split(':')[1].strip()
                    if sev_text in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']:
                        severity = sev_text
                    break
            
            reasoning = ''
            if 'REASONING:' in content:
                reasoning = content.split('REASONING:')[1].strip()
            
            return {
                'is_vulnerable': is_vulnerable,
                'confidence': confidence,
                'severity': severity if is_vulnerable else None,
                'reasoning': reasoning
            }
            
        except Exception as e:
            logger.error(f"GPT-4 validation failed for {cve_id}: {str(e)}")
            return {
                'is_vulnerable': False,
                'confidence': 0.0,
                'severity': None,
                'reasoning': f"Validation failed: {str(e)}"
            }
    
    @traceable(name="validate_single_by_id", run_type="tool")
    def validate_finding_by_id(self, finding_id: int) -> bool:
        """
        Validate a specific finding by ID.
        
        Args:
            finding_id: Finding ID to validate
        
        Returns:
            bool: True if validation succeeded
        """
        try:
            finding = db.session.query(CVEFinding).filter_by(finding_id=finding_id).first()
            if not finding:
                logger.error(f"Finding {finding_id} not found")
                return False
            
            chunk = db.session.query(CodeChunk).filter_by(chunk_id=finding.chunk_id).first()
            cve = db.session.query(CVEDataset).filter_by(cve_id=finding.cve_id).first()
            
            if not chunk or not cve:
                logger.error(f"Missing chunk or CVE data for finding {finding_id}")
                return False
            
            is_valid, severity, explanation = self._validate_finding(chunk, cve)
            
            finding.validation_status = 'confirmed' if is_valid else 'false_positive'
            finding.severity = severity if is_valid else None
            finding.validation_explanation = explanation

            db.session.commit()
            
            logger.info(f"Validated finding {finding_id}: {finding.validation_status}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to validate finding {finding_id}: {str(e)}")
            return False
