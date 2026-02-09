"""Test client for the external FAISS CVE Storage API."""

import json
import os
from typing import Any, Dict, List, Optional

import requests

DEFAULT_BASE_URL = "http://140.238.227.29:5000"


class CVEAPIClient:
    """Client for interacting with the FAISS CVE Storage API."""

    def __init__(self, base_url: Optional[str] = None, timeout: int = 15) -> None:
        self.base_url = (base_url or os.getenv("CVE_SERVICE_BASE_URL", DEFAULT_BASE_URL)).rstrip("/")
        self.session = requests.Session()
        self.timeout = timeout

    def _get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        response = self.session.get(f"{self.base_url}{path}", params=params, timeout=self.timeout)
        response.raise_for_status()
        return response.json()

    def _post(self, path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        response = self.session.post(f"{self.base_url}{path}", json=payload, timeout=self.timeout)
        response.raise_for_status()
        return response.json()

    def health_check(self) -> Dict[str, Any]:
        """Check if the API is healthy."""
        return self._get("/health")

    def get_stats(self) -> Dict[str, Any]:
        """Get database statistics."""
        return self._get("/stats")

    def search(self, query: str, top_k: int = 10) -> Dict[str, Any]:
        """Search CVEs using semantic search."""
        return self._post("/search", {"query": query, "top_k": top_k})

    def search_similar_cve(self, cve_id: str, top_k: int = 10) -> Dict[str, Any]:
        """Find CVEs similar to a given CVE ID."""
        return self._post("/search/cve", {"cve_id": cve_id, "top_k": top_k})

    def get_cve(self, cve_id: str) -> Dict[str, Any]:
        """Get details for a specific CVE ID."""
        return self._get(f"/cve/{cve_id}")

    def batch_search(self, queries: List[str], top_k: int = 5) -> Dict[str, Any]:
        """Perform batch search for multiple queries."""
        return self._post("/search/batch", {"queries": queries, "top_k": top_k})

    def list_cves(self, page: int = 1, per_page: int = 50) -> Dict[str, Any]:
        """List CVEs with pagination."""
        return self._get("/cves/list", params={"page": page, "per_page": per_page})


def pretty_print(data: Dict[str, Any]) -> None:
    """Pretty print JSON data."""
    print(json.dumps(data, indent=2))


def print_section(title: str) -> None:
    print("=" * 60)
    print(title)
    print("=" * 60)


def main() -> None:
    """Run a quick manual integration test against the CVE API."""
    print("🧪 Testing FAISS CVE Storage API Client\n")

    client = CVEAPIClient()

    # Test 1: Health check
    print_section("1️⃣  Health Check")
    pretty_print(client.health_check())
    print()

    # Test 2: Get statistics
    print_section("2️⃣  Database Statistics")
    pretty_print(client.get_stats())
    print()

    # Test 3: Search CVEs
    print_section("3️⃣  Semantic Search: 'SQL injection vulnerability'")
    result = client.search("SQL injection vulnerability in web applications", top_k=3)
    if result.get("success", True):
        results = result.get("results", [])
        print(f"Query: {result.get('query')}")
        print(f"Results found: {result.get('results_count', len(results))}\n")
        for idx, cve in enumerate(results[:3], 1):
            print(f"Result {idx}:")
            print(f"  CVE ID: {cve.get('cve_id')}")
            similarity = cve.get('similarity_score', cve.get('score', 0.0)) or 0.0
            distance = cve.get('distance')
            print(f"  Similarity Score: {float(similarity):.4f}")
            if distance is not None:
                print(f"  Distance: {float(distance):.4f}")
            print(f"  Published: {cve.get('published', 'N/A')}")
            print()
    else:
        print(f"Error: {result.get('error')}")
    print()

    # Test 4: List CVEs
    print_section("4️⃣  List CVEs (Page 1, 5 items)")
    result = client.list_cves(page=1, per_page=5)
    if result.get("success", True):
        print(f"Total CVEs: {result.get('total')}")
        print(f"Total Pages: {result.get('total_pages')}")
        print(f"Current Page: {result.get('page')}\n")
        for idx, cve in enumerate(result.get('data', []), 1):
            print(f"{idx}. {cve.get('cve_id')} - Published: {cve.get('published', 'N/A')}")
    else:
        print(f"Error: {result.get('error')}")
    print()

    # Test 5: Batch search
    print_section("5️⃣  Batch Search")
    queries = [
        "Remote code execution",
        "Cross-site scripting XSS",
        "Buffer overflow",
    ]
    result = client.batch_search(queries, top_k=2)
    if result.get("success", True):
        print(f"Batch count: {result.get('batch_count', len(result.get('results', [])))}\n")
        for batch_result in result.get('results', []):
            query_text = batch_result.get('query') or batch_result.get('input')
            print(f"Query: '{query_text}'")
            matches = batch_result.get('results', [])
            print(f"  Found {len(matches)} results")
            if matches:
                top_result = matches[0]
                top_score = top_result.get('similarity_score', top_result.get('score', 0.0)) or 0.0
                print(
                    f"  Top result: {top_result.get('cve_id')}"
                    f" (score: {float(top_score):.4f})"
                )
            print()
    else:
        print(f"Error: {result.get('error')}")

    print("✅ All tests completed!")


if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to the API server.")
        print("   Make sure the FAISS CVE service is running and reachable.")
    except Exception as exc:
        print(f"❌ Error: {exc}")
