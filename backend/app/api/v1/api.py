from fastapi import APIRouter

from app.api.v1.endpoints import (
    admin_auth,
    admin_stats,
    auth,
    checkout,
    dashboard,
    explore,
    fan,
    geo,
    system,
    uploads,
    withdrawals,
)

api_router = APIRouter()

api_router.include_router(auth.router, tags=["Auth"])
api_router.include_router(admin_auth.router, tags=["Admin Auth"])
api_router.include_router(admin_stats.router, tags=["Admin Stats"])
api_router.include_router(fan.router, tags=["Fan", "Supporter"])
api_router.include_router(system.router, tags=["System"])
api_router.include_router(explore.router, tags=["Explore", "Creators"])
api_router.include_router(checkout.router, tags=["Checkout"])
api_router.include_router(dashboard.router, tags=["Dashboard"])
api_router.include_router(withdrawals.router, tags=["Withdrawals"])
api_router.include_router(uploads.router, tags=["Uploads"])
api_router.include_router(geo.router, tags=["Geo"])
