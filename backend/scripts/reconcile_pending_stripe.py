"""Reconciliar transacciones 301 contra Stripe y confirmar las pagadas."""
import asyncio
from sqlalchemy import text
from app.core.database import async_session_factory
from app.services.stripe_service import StripeService


async def main() -> None:
    async with async_session_factory() as s:
        pending = (
            await s.execute(
                text(
                    """
                    SELECT id, transaction_uuid, status_code, gross_amount, athlete_id
                    FROM transactions WHERE status_code = 301 ORDER BY id
                    """
                )
            )
        ).mappings().all()
        print("Pending before:", [dict(p) for p in pending])

        svc = StripeService(s)
        outcomes = await svc.reconcile_pending_shake_transactions(limit=50)
        print("Outcomes:")
        for o in outcomes:
            print(o)

        await s.commit()

        after = (
            await s.execute(
                text(
                    """
                    SELECT id, transaction_uuid, status_code, gross_amount
                    FROM transactions ORDER BY id DESC LIMIT 8
                    """
                )
            )
        ).mappings().all()
        print("TX after:")
        for t in after:
            print(dict(t))

        goals = (
            await s.execute(text("SELECT id, raised_amount FROM goals WHERE id = 17"))
        ).mappings().first()
        print("GOAL 17:", dict(goals) if goals else None)


if __name__ == "__main__":
    asyncio.run(main())
