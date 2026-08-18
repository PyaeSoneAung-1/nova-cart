-- ─────────────────────────────────────────────────────────────────────────────
-- NovaCart cleanup script
--
-- Wipes test data for a specific account (default: the "Pyae Sone Aung"
-- account created during manual testing) so you can start fresh:
--   * orders (+ items/payments)          * reviews
--   * addresses                          * cart & wishlist items
--
-- The account itself is KEPT. Passwords, coupons and products are untouched.
--
-- Usage:
--   psql -h localhost -U novacart -d novacart -f backend/scripts/cleanup.sql
--   (enter the database password when prompted)
--
-- Safe to run more than once.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  uid TEXT;
BEGIN
  -- Find the account by name or email. Change this to match your user.
  SELECT id INTO uid
  FROM "User"
  WHERE name ILIKE '%Pyae Sone Aung%'
     OR email ILIKE '%pyaesoneaung%'
     OR email ILIKE '%pyae%';

  IF uid IS NULL THEN
    RAISE NOTICE 'No matching account found — nothing to clean.';
    RETURN;
  END IF;

  RAISE NOTICE 'Cleaning test data for user %', uid;

  -- Orders (order items + payments are removed by ON DELETE CASCADE)
  DELETE FROM "Order" WHERE "userId" = uid;

  -- Reviews
  DELETE FROM "Review" WHERE "userId" = uid;

  -- Addresses (including the address you added earlier)
  DELETE FROM "Address" WHERE "userId" = uid;

  -- Cart + wishlist items, then the (now empty) containers
  DELETE FROM "CartItem" WHERE "cartId" IN (SELECT id FROM "Cart" WHERE "userId" = uid);
  DELETE FROM "WishlistItem" WHERE "wishlistId" IN (SELECT id FROM "Wishlist" WHERE "userId" = uid);

  RAISE NOTICE 'Done. The account is clean — you can add a new address.';
END $$;

-- Also remove the old seeded demo address (from previous seed versions),
-- if it still exists. The current seed no longer creates it.
DELETE FROM "Address" WHERE id = 'seed-address-001';
