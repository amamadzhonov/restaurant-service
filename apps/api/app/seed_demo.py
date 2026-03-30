import asyncio

from app.db.base import Base
from app.db.seed import seed_demo_data
from app.db.session import engine, AsyncSessionLocal


async def main() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        await seed_demo_data(session)


if __name__ == "__main__":
    asyncio.run(main())

