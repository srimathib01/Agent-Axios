"""Client for the external FAISS CVE Storage API."""

import logging
from typing import Any, Dict, List, Optional, Tuple

import requests
from requests import RequestException, Session

from config.settings import Config

logger = logging.getLogger(__name__)


class CVERetrievalService:
    """Wrapper around the remote CVE retrieval API (FAISS + Cohere embeddings)."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        timeout: Optional[int] = None,
        session: Optional[Session] = None,
    ):
        self.base_url = (base_url or Config.CVE_SERVICE_BASE_URL).rstrip("/")
        self.timeout = timeout or Config.CVE_SERVICE_TIMEOUT
        self.session = session or requests.Session()
        self.default_limit = Config.RETRIEVAL_CONFIG["default_limit"]
        self.max_limit = Config.RETRIEVAL_CONFIG["max_limit"]
        self.similarity_threshold = Config.RETRIEVAL_CONFIG["similarity_threshold"]
        self._healthy = False
        self._last_error: Optional[str] = None

    # ------------------------------------------------------------------
    # Initialization & helpers
    # ------------------------------------------------------------------
    def initialize(self) -> bool:
        """Ping the health endpoint to confirm connectivity."""
        data, error = self._get("/health")
        if error:
            logger.error("Failed to connect to CVE service: %s", error)
            self._healthy = False
            self._last_error = error
            return False

        self._healthy = True
        self._last_error = None
        logger.info("Connected to CVE service at %s", self.base_url)
        return True

    def _request(
        self,
        method: str,
        path: str,
        **kwargs,
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        url = f"{self.base_url}{path}"
        try:
            response = self.session.request(method, url, timeout=self.timeout, **kwargs)
            response.raise_for_status()
            data = response.json()
            if isinstance(data, dict):
                return data, None
            return {"data": data, "success": True}, None
        except RequestException as exc:
            return None, str(exc)
        except ValueError:
            return None, "Invalid JSON response from CVE service"

    def _get(self, path: str, params: Optional[Dict[str, Any]] = None):
        return self._request("GET", path, params=params)

    def _post(self, path: str, payload: Dict[str, Any]):
        return self._request("POST", path, json=payload)

    def _normalize_cve(self, cve: Dict[str, Any]) -> Dict[str, Any]:
        normalized = dict(cve)
        
        # Extract CVSS score if not present at top level
        if "cvss_score" not in normalized:
            # Try to find it in metrics (top level or inside full_data)
            metrics = normalized.get("metrics")
            if not metrics and "full_data" in normalized:
                metrics = normalized["full_data"].get("metrics")
            
            metrics = metrics or {}
            cvss_score = 0.0
            
            # Try V3.1
            if "cvssMetricV31" in metrics:
                for metric in metrics["cvssMetricV31"]:
                    if "cvssData" in metric and "baseScore" in metric["cvssData"]:
                        cvss_score = float(metric["cvssData"]["baseScore"])
                        break
            
            # Try V3.0
            if cvss_score == 0.0 and "cvssMetricV30" in metrics:
                for metric in metrics["cvssMetricV30"]:
                    if "cvssData" in metric and "baseScore" in metric["cvssData"]:
                        cvss_score = float(metric["cvssData"]["baseScore"])
                        break
                        
            # Try V2.0
            if cvss_score == 0.0 and "cvssMetricV2" in metrics:
                for metric in metrics["cvssMetricV2"]:
                    if "cvssData" in metric and "baseScore" in metric["cvssData"]:
                        cvss_score = float(metric["cvssData"]["baseScore"])
                        break
            
            if cvss_score > 0.0:
                normalized["cvss_score"] = cvss_score

        score = normalized.get("score")
        if score is None and normalized.get("similarity_score") is not None:
            normalized["score"] = normalized.get("similarity_score")
        elif score is None and normalized.get("distance") is not None:
            try:
                normalized["score"] = 1 - float(normalized["distance"])
            except (TypeError, ValueError):
                pass
        return normalized

    def _expand_query(self, query: str) -> List[str]:
        expansions = [query]
        query_lower = query.lower()
        security_terms = {
            "buffer overflow": ["buffer overrun", "stack overflow", "heap overflow"],
            "sql injection": ["sqli", "database injection", "sql attack"],
            "xss": ["cross-site scripting", "script injection"],
            "csrf": ["cross-site request forgery", "session riding"],
            "rce": ["remote code execution", "code injection"],
        }

        for term, variations in security_terms.items():
            if term in query_lower:
                for variation in variations:
                    expansions.append(query.replace(term, variation))

        if len(expansions) == 1:
            expansions.append(f"security vulnerability {query}")
            expansions.append(f"{query} exploit")

        return expansions[:3]

    def _extract_results(self, data: Optional[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], Optional[str]]:
        if not data:
            return [], "Empty response from CVE service"

        if isinstance(data, dict) and data.get("success") is False:
            return [], data.get("error") or "Unknown error from CVE service"

        raw_results = data.get("results") or data.get("data") or []
        normalized = [self._normalize_cve(item) for item in raw_results]
        return normalized, None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def search_by_text(
        self,
        query: str,
        limit: Optional[int] = None,
        similarity_threshold: Optional[float] = None,
        include_scores: bool = True,
        expand_query: bool = False,
    ) -> Dict[str, Any]:
        if not query or not query.strip():
            return {"error": "Query cannot be empty", "results": []}

        limit = min(limit or self.default_limit, self.max_limit)
        similarity_threshold = similarity_threshold or self.similarity_threshold
        queries_to_search = [query]
        if expand_query:
            queries_to_search = self._expand_query(query)

        aggregated: List[Dict[str, Any]] = []
        seen_ids = set()

        for search_query in queries_to_search:
            logger.info("Searching CVE API for: %s", search_query)
            payload = {"query": search_query, "top_k": limit}
            
            data, error = self._post("/search", payload)
            
            if error:
                logger.error("CVE search failed: %s", error)
                return {"error": error, "results": []}
            
            if data:
                result_count = len(data.get("results", [])) if isinstance(data, dict) else 0
                logger.info(f"CVE API returned {result_count} results for query: {search_query}")
                if result_count == 0:
                    logger.warning(f"CVE API returned NO results. Raw data keys: {data.keys() if isinstance(data, dict) else 'Not a dict'}")
            else:
                logger.warning("CVE API returned empty response")

            results, parse_error = self._extract_results(data)
            if parse_error:
                logger.error("CVE search parse error: %s", parse_error)
                return {"error": parse_error, "results": []}

            for cve in results:
                cve_id = cve.get("cve_id")
                score = cve.get("score")
                
                if cve_id in seen_ids:
                    continue

                if score is not None and similarity_threshold is not None:
                    try:
                        logger.debug(f"Checking {cve_id} score {score} against threshold {similarity_threshold}")
                        if float(score) < similarity_threshold:
                            logger.debug(f"Dropping {cve_id} because {score} < {similarity_threshold}")
                            continue
                    except (TypeError, ValueError):
                        pass

                seen_ids.add(cve_id)
                if not include_scores:
                    cve = dict(cve)
                    cve.pop("score", None)
                    cve.pop("similarity_score", None)
                
                aggregated.append(cve)

            if len(aggregated) >= limit * 2:
                break
        
        aggregated.sort(key=lambda item: item.get("score", 0), reverse=True)
        final_results = aggregated[:limit]

        return {
            "query": query,
            "results": final_results,
            "similarity_threshold": similarity_threshold,
            "expanded_query": expand_query,
            "queries_searched": queries_to_search if expand_query else [query],
        }

    def search_by_filters(
        self,
        filters: Dict[str, Any],
        limit: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Best-effort filter search using available API endpoints."""
        limit = min(limit or self.default_limit, self.max_limit)

        if "cve_id" in filters:
            record = self.get_by_id(filters["cve_id"])
            return {"filters": filters, "results": [record] if record else [], "total_found": 1 if record else 0}

        page = 1
        per_page = min(limit, 200)
        all_cves: List[Dict[str, Any]] = []

        while len(all_cves) < limit:
            data, error = self._get("/cves/list", params={"page": page, "per_page": per_page})
            if error:
                return {"filters": filters, "results": [], "error": error}

            results = data.get("data", []) if data else []
            if not results:
                break

            for cve in results:
                cvss_raw = cve.get("cvss_score", cve.get("cvss"))
                try:
                    cvss = float(cvss_raw) if cvss_raw is not None else None
                except (TypeError, ValueError):
                    cvss = None
                if "min_cvss_score" in filters and cvss is not None and cvss < filters["min_cvss_score"]:
                    continue
                if "max_cvss_score" in filters and cvss is not None and cvss > filters["max_cvss_score"]:
                    continue
                all_cves.append(cve)
                if len(all_cves) >= limit:
                    break

            total_pages = data.get("total_pages") if data else None
            if total_pages and page >= total_pages:
                break
            page += 1

        return {"filters": filters, "results": all_cves[:limit], "total_found": len(all_cves[:limit])}

    def get_by_id(self, cve_id: str) -> Optional[Dict[str, Any]]:
        data, error = self._get(f"/cve/{cve_id}")
        if error:
            logger.warning("CVE %s lookup failed: %s", cve_id, error)
            return None
        if data.get("success") is False:
            return None
        return self._normalize_cve(data.get("data") or data)

    def find_similar_cves(
        self,
        reference_cve_id: str,
        limit: Optional[int] = None,
        similarity_threshold: Optional[float] = None,
    ) -> Dict[str, Any]:
        limit = min(limit or self.default_limit, self.max_limit)
        payload = {"cve_id": reference_cve_id, "top_k": limit}
        data, error = self._post("/search/cve", payload)
        if error:
            return {"error": error, "results": []}

        results, parse_error = self._extract_results(data)
        if parse_error:
            return {"error": parse_error, "results": []}

        similarity_threshold = similarity_threshold or self.similarity_threshold
        filtered = []
        for cve in results:
            if cve.get("cve_id") == reference_cve_id:
                continue
            score = cve.get("score")
            if score is not None and score < similarity_threshold:
                continue
            filtered.append(cve)

        return {
            "reference_cve": reference_cve_id,
            "similar_cves": filtered[:limit],
            "total_found": len(filtered[:limit]),
        }

    def get_service_stats(self) -> Dict[str, Any]:
        data, error = self._get("/stats")
        if error:
            return {"service_status": "error", "error": error}
        return {"service_status": "healthy", "stats": data}

    def get_high_severity_cves(self, min_cvss_score: float = 7.0, limit: Optional[int] = None) -> Dict[str, Any]:
        filters = {"min_cvss_score": min_cvss_score}
        return self.search_by_filters(filters, limit=limit)

    def list_cves(self, page: int = 1, per_page: int = 50) -> Dict[str, Any]:
        data, error = self._get("/cves/list", params={"page": page, "per_page": per_page})
        if error:
            return {"error": error, "success": False}
        return data

    def close(self):
        self.session.close()
