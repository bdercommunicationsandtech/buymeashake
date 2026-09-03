"""Confirma transacciones Stripe pendientes (301) y suma el monto a su goal."""
import asyncio
from sqlalchemy import text
from app.core.database import async_session_factory
from app.services.stripe_service import StripeService


async def main() -> None:
    async with async_session_factory() as s:
        rows = (
            await s.execute(
                text(
                    """
                    SELECT transaction_uuid, id, goal_id, gross_amount, status_code
                    FROM transactions
                    WHERE status_code = 301
                    ORDER BY id ASC
                    """
                )
            )
        ).mappings().all()
        print(f"Pending transactions: {len(rows)}")
        if not rows:
            return

        svc = StripeService(s)
        for row in rows:
            print("Fulfilling", dict(row))
            result = await svc.fulfill_pending_shake(
                row["transaction_uuid"],
                source="manual_repair_pending",
            )
            print(" ->", result)

        await s.commit()
        print("Done. Goals after repair:")
        goals = (
            await s.execute(
                text(
                    """
                    SELECT id, athlete_id, raised_amount, target_amount
                    FROM goals
                    WHERE id IN (SELECT DISTINCT goal_id FROM transactions WHERE goal_id IS NOT NULL)
                    ORDER BY id DESC
                    LIMIT 10
                    """
                )
            )
        ).mappings().all()
        for g in goals:
            print(dict(g))


if __name__ == "__main__":
    asyncio.run(main())
