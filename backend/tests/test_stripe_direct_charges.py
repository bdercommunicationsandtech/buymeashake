"""Unit tests for Stripe Direct Charges helpers and webhook idempotency helpers."""

from __future__ import annotations

from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.config import settings
from app.services.stripe_service import (
    StripeService,
    compute_platform_fee_amount,
    compute_platform_fee_cents,
)


def test_platform_fee_percent_default_is_seven():
    assert settings.PLATFORM_FEE_PERCENTAGE == 0.07


@pytest.mark.parametrize(
    ("gross_cents", "expected"),
    [
        (100, 7),
        (333, 23),  # 333 * 0.07 = 23.31 → 23 ROUND_HALF_UP? 23.31 → 23; wait HALF_UP of 23.31 is 23
        (350, 25),  # 24.5 → 25
        (1000, 70),
    ],
)
def test_compute_platform_fee_cents_round_half_up(gross_cents: int, expected: int):
    # Recompute expected for 333 carefully: Decimal(333)*0.07 = 23.31 → quantize to 1 with HALF_UP = 23
    assert compute_platform_fee_cents(gross_cents, 0.07) == expected


def test_compute_platform_fee_amount():
    assert compute_platform_fee_amount(Decimal("10.00"), 0.07) == Decimal("0.70")
    assert compute_platform_fee_amount(Decimal("3.50"), 0.07) == Decimal("0.25")


@pytest.mark.asyncio
async def test_require_direct_charges_blocks_when_disabled():
    svc = StripeService(session=AsyncMock())
    athlete = SimpleNamespace(
        payouts=SimpleNamespace(stripe_connect_account_id="acct_x", charges_enabled=False)
    )
    with pytest.raises(Exception) as exc:
        svc._require_direct_charges_account(athlete)
    assert "verificación" in str(exc.value).lower() or "pagos" in str(exc.value).lower()


@pytest.mark.asyncio
async def test_create_express_dashboard_link_onboarding_when_incomplete(monkeypatch):
    session = AsyncMock()
    svc = StripeService(session=session)
    payouts = SimpleNamespace(
        stripe_connect_account_id="acct_test",
        stripe_details_submitted=False,
        charges_enabled=False,
        payouts_enabled=False,
        country_code="MX",
    )
    athlete = SimpleNamespace(
        id=1,
        handle="test",
        user=SimpleNamespace(full_name="Test Athlete", email="t@example.com", id=1),
        payouts=payouts,
    )
    monkeypatch.setattr(
        "app.services.stripe_service.ensure_payouts",
        lambda session, athlete: payouts,
    )
    svc.generate_connect_onboarding_link = AsyncMock(
        return_value={
            "account_link_url": "https://connect.example/onboard",
            "stripe_connect_account_id": "acct_test",
        }
    )
    original = settings.STRIPE_SECRET_KEY
    settings.STRIPE_SECRET_KEY = "sk_test_placeholder"
    try:
        result = await svc.create_express_dashboard_link(athlete)
    finally:
        settings.STRIPE_SECRET_KEY = original

    assert result["action"] == "onboarding"
    assert "onboard" in result["redirect_url"]


@pytest.mark.asyncio
async def test_fulfill_pending_shake_already_processed_for_302_and_303():
    session = AsyncMock()
    svc = StripeService(session=session)
    athlete = SimpleNamespace(page_settings=None, handle="h")

    for status in (302, 303):
        tx = SimpleNamespace(
            id=1,
            transaction_uuid="abc",
            status_code=status,
            athlete_id=9,
            supporter_name="Fan",
            gross_amount=Decimal("3.00"),
            shake_details=SimpleNamespace(
                shakes_count=1, supporter_message=None, is_anonymous=False, goal_id=None
            ),
        )
        tx_result = MagicMock()
        tx_result.scalar_one_or_none.return_value = tx
        athlete_result = MagicMock()
        athlete_result.scalar_one_or_none.return_value = athlete
        session.execute = AsyncMock(side_effect=[tx_result, athlete_result])

        out = await svc.fulfill_pending_shake("abc")
        assert out["status"] == "already_processed"
        assert out["handled"] is True


@pytest.mark.asyncio
async def test_process_charge_refunded_idempotent():
    session = AsyncMock()
    svc = StripeService(session=session)
    tx = SimpleNamespace(
        id=1,
        transaction_uuid="tx1",
        status_code=303,
        athlete_id=1,
        gross_amount=Decimal("3.00"),
        shake_details=None,
    )
    svc._find_transaction_by_payment_intent = AsyncMock(return_value=tx)
    out = await svc._process_charge_refunded({"payment_intent": "pi_x", "metadata": {}})
    assert out["status"] == "already_processed"
