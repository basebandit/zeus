import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_healthz_status_code():
    response = client.get("/healthz")
    assert response.status_code == 200, "Health endpoint should return 200"


def test_healthz_response_content():
    response = client.get("/healthz")
    expected = {"message": "healthy"}
    assert response.json() == expected, "Health endpoint should return correct JSON"
