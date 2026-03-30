from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models import Menu, MenuSection, Table, Tenant
from app.schemas.public import (
    PublicMenuRead,
    PublicOrderCreate,
    PublicOrderStatusRead,
    TableRead,
)
from app.services.billing import tenant_operations_locked
from app.services.orders import create_public_order, get_public_order, serialize_public_order

router = APIRouter(prefix="/restaurants")
table_router = APIRouter(prefix="/tables")
order_router = APIRouter(prefix="/orders")


@router.get("/{slug}/menu", response_model=PublicMenuRead)
async def get_public_menu(slug: str, db: AsyncSession = Depends(get_db)) -> PublicMenuRead:
    tenant_result = await db.execute(select(Tenant).where(Tenant.slug == slug))
    tenant = tenant_result.scalar_one_or_none()
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restaurant not found")

    menu_result = await db.execute(
        select(Menu)
        .options(selectinload(Menu.sections).selectinload(MenuSection.items))
        .where(Menu.tenant_id == tenant.id, Menu.is_active.is_(True))
        .order_by(Menu.created_at.desc())
    )
    menu = menu_result.scalars().first()
    if menu is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active menu not found")

    sections = sorted(menu.sections, key=lambda section: section.display_order)
    for section in sections:
        section.items.sort(key=lambda item: item.display_order)

    return PublicMenuRead(
        tenant=tenant,
        menu_id=menu.id,
        menu_name=menu.name,
        ordering_enabled=not tenant_operations_locked(tenant),
        sections=sections,
    )


@table_router.get("/{table_code}", response_model=TableRead)
async def get_table(table_code: str, db: AsyncSession = Depends(get_db)) -> TableRead:
    result = await db.execute(select(Table).where(Table.code == table_code))
    table = result.scalar_one_or_none()
    if table is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")
    return table


@table_router.post("/{table_code}/orders", response_model=PublicOrderStatusRead, status_code=status.HTTP_201_CREATED)
async def submit_public_order(
    table_code: str,
    payload: PublicOrderCreate,
    db: AsyncSession = Depends(get_db),
) -> PublicOrderStatusRead:
    order = await create_public_order(db, table_code, payload)
    await db.commit()
    order = await get_public_order(db, order.public_status_token)
    return serialize_public_order(order)


@order_router.get("/{public_status_token}", response_model=PublicOrderStatusRead)
async def get_public_order_status(
    public_status_token: str,
    db: AsyncSession = Depends(get_db),
) -> PublicOrderStatusRead:
    order = await get_public_order(db, public_status_token)
    return serialize_public_order(order)
