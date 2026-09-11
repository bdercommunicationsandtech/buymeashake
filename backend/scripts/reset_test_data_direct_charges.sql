-- ==============================================================================
-- RESET DATOS DE PRUEBA — Direct Charges (greenfield)
-- Ejecutar SOLO en entornos de desarrollo/test con permiso de borrar datos.
-- ==============================================================================
-- Checklist Stripe Dashboard (modo test) ANTES/DESPUÉS de este script:
-- 1. Borrar o desconectar cuentas Connect Express de prueba.
-- 2. Limpiar Customers / Products / Prices / Subscriptions de prueba si sobran.
-- 3. Crear DOS webhooks hacia el backend:
--    a) Platform → POST /api/v1/checkout/stripe-webhook
--       Eventos: checkout.session.completed, payment_intent.succeeded,
--       invoice.payment_succeeded, customer.subscription.updated|deleted
--    b) Connect (Listen to events on Connected accounts) →
--       POST /api/v1/checkout/stripe-connect-webhook
--       Eventos: account.updated, checkout.session.completed,
--       charge.refunded, charge.dispute.created, invoice.payment_succeeded,
--       customer.subscription.updated|deleted
-- 4. Guardar secrets en .env:
--    STRIPE_WEBHOOK_SECRET=whsec_...
--    STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...
-- ==============================================================================

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE `withdrawal_requests`;
TRUNCATE TABLE `shake_details`;
TRUNCATE TABLE `transactions`;
TRUNCATE TABLE `subscriptions`;
TRUNCATE TABLE `notifications`;

UPDATE `athlete_payouts`
SET
  `stripe_connect_account_id` = NULL,
  `stripe_details_submitted` = FALSE,
  `payouts_enabled` = FALSE,
  `charges_enabled` = FALSE;

UPDATE `users` SET `stripe_customer_id` = NULL WHERE `stripe_customer_id` IS NOT NULL;

UPDATE `membership_tiers` SET `stripe_price_id` = NULL WHERE `stripe_price_id` IS NOT NULL;

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'reset_test_data_direct_charges: OK' AS info;
