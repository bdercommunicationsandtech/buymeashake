from fastapi import APIRouter

from app.api.v1.endpoints import auth, checkout, dashboard, explore, fan, system, uploads, withdrawals

api_router = APIRouter()

api_router.include_router(auth.router, tags=["Auth"])
api_router.include_router(fan.router, tags=["Fan", "Supporter"])
api_router.include_router(system.router, tags=["System"])
api_router.include_router(explore.router, tags=["Explore", "Creators"])
api_router.include_router(checkout.router, tags=["Checkout"])
api_router.include_router(dashboard.router, tags=["Dashboard"])
api_router.include_router(withdrawals.router, tags=["Withdrawals"])
api_router.include_router(uploads.router, tags=["Uploads"])
