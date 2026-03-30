from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import require_roles, require_tenant_context
from app.db.session import get_db
from app.models import OrderStatus, User, UserRole
from app.schemas.admin import OrderRead
from app.schemas.kitchen import KitchenOrderListResponse, KitchenOrderStatusUpdate
from app.services.orders import get_order, list_orders, serialize_order, update_order_status

router = APIRouter()


@router.get("/{slug}/orders", response_model=KitchenOrderListResponse)
async def list_kitchen_orders(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.KITCHEN)),
) -> KitchenOrderListResponse:
    ctx = await require_tenant_context(slug, db, current_user, allow_super_admin=False)
    orders = await list_orders(
        db,
        ctx.tenant.id,
        statuses=[OrderStatus.PLACED, OrderStatus.PREPARING, OrderStatus.READY],
    )
    return KitchenOrderListResponse(items=[serialize_order(order) for order in orders])


@router.put("/{slug}/orders/{order_id}/status", response_model=OrderRead)
async def update_kitchen_order_status(
    slug: str,
    order_id: str,
    payload: KitchenOrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.KITCHEN)),
) -> OrderRead:
    ctx = await require_tenant_context(slug, db, current_user, allow_super_admin=False)
    await update_order_status(db, ctx.tenant.id, current_user, order_id, payload.status)
    await db.commit()
    order = await get_order(db, ctx.tenant.id, order_id)
    return serialize_order(order)
