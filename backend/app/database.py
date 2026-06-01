from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

# Railway (and some other providers) supply postgres:// or postgresql:// — normalise to asyncpg dialect
_db_url = settings.database_url.replace("postgres://", "postgresql+asyncpg://", 1).replace("postgresql://", "postgresql+asyncpg://", 1)
engine = create_async_engine(_db_url, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
