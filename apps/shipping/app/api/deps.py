"""
API dependencies.
"""

from app.db.session import AsyncSessionLocal


async def get_db():
    """Dependency for getting database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
