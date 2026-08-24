import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_match_advisers():
    payload = {
        "title": "Development of an Online Research Management System",
        "description": "A web-based system for managing research manuscripts",
        "advisers": [
            {
                "adviserId": "adv1",
                "specialization": ["Web Development"],
                "expertise": ["Full-Stack Development"],
                "researchInterests": ["Educational Technology"],
                "keywords": ["web", "system", "management"]
            },
            {
                "adviserId": "adv2",
                "specialization": ["Network Security"],
                "expertise": ["Cryptography"],
                "researchInterests": ["IoT Security"],
                "keywords": ["security", "network"]
            }
        ]
    }
    response = client.post("/match/advisers", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["results"]) == 2
    # adv1 should have a higher score than adv2 for this web dev title
    assert data["results"][0]["adviserId"] == "adv1"
    assert data["results"][0]["score"] > data["results"][1]["score"]

if __name__ == "__main__":
    test_health()
    test_match_advisers()
    print("All tests passed!")
