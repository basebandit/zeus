"""
Health check endpoint.
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/healthz")
async def health_check():
    """Health check endpoint for Kubernetes/Docker."""
    return {"status": "healthy", "service": "payments"}
