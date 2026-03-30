from fastapi import APIRouter

from app.api.routes import admin, auth, billing, kitchen, platform, public, waiter

api_router = APIRouter()
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(public.router, prefix="/public", tags=["public"])
api_router.include_router(public.table_router, prefix="/public", tags=["public"])
api_router.include_router(public.order_router, prefix="/public", tags=["public"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(waiter.router, prefix="/waiter", tags=["waiter"])
api_router.include_router(kitchen.router, prefix="/kitchen", tags=["kitchen"])
api_router.include_router(platform.router, tags=["platform"])
api_router.include_router(billing.router, tags=["billing"])
