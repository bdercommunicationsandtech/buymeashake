-- Allow guest/anonymous Stripe shake checkouts (supporter_id may be NULL).
-- Run once against your MySQL database if guest payments fail to insert into transactions.

ALTER TABLE transactions
  MODIFY COLUMN supporter_id BIGINT UNSIGNED NULL;

-- Optional (skip if columns already exist):
-- ALTER TABLE transactions ADD COLUMN supporter_name VARCHAR(150) NULL AFTER supporter_id;
-- ALTER TABLE transactions ADD COLUMN supporter_email VARCHAR(191) NULL AFTER supporter_name;
