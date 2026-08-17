# NovaCart REST API Reference

Base URL: `http://localhost:4000/api/v1`

## Response Envelope

```json
{ "success": true, "message": "…", "data": { } }
{ "success": false, "message": "…", "errors": [{ "field": "email", "message": "…" }] }
```

## Status Codes

`200 OK` · `201 Created` · `400 Bad Request` · `401 Unauthorized` · `403 Forbidden` · `404 Not Found` · `409 Conflict` · `422 Unprocessable Entity` · `429 Too Many Requests` · `500 Internal Server Error`

## Authentication

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | — | Create account `{name, email, password}` → tokens + user |
| POST | `/auth/login` | — | Login `{email, password}` → tokens + user |
| POST | `/auth/refresh` | — | `{refreshToken}` → new token pair (rotation) |
| POST | `/auth/logout` | ✓ | `{refreshToken}` — revoke token |
| POST | `/auth/forgot-password` | — | `{email}` — dev mode returns `devResetToken` |
| POST | `/auth/reset-password` | — | `{token, password}` |
| GET | `/auth/me` | ✓ | Current user |

## Users

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| PATCH | `/users/me` | ✓ | Update name / email / avatar |
| POST | `/users/me/change-password` | ✓ | `{currentPassword, newPassword}` |
| GET | `/users/addresses` | ✓ | List own addresses |
| POST | `/users/addresses` | ✓ | Create address |
| PATCH | `/users/addresses/:id` | ✓ | Update own address |
| DELETE | `/users/addresses/:id` | ✓ | Delete own address |
| GET | `/users` | admin | List users (search, pagination) |
| GET | `/users/:id` | admin | User detail + recent orders |
| PATCH | `/users/:id` | admin | Update role / isActive |

## Products

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/products` | — | List. Query: `search, category, brand, minPrice, maxPrice, rating, inStock, sort(newest\|price-asc\|price-desc\|rating-desc\|popular), page, limit` |
| GET | `/products/:id` | — | Detail by id **or slug**, includes `related` |
| POST | `/products` | admin | Create with nested `images[]`, `variants[]` |
| PATCH | `/products/:id` | admin | Update (replaces images/variants when sent) |
| DELETE | `/products/:id` | admin | Delete |
| GET | `/products/admin/list` | admin | Admin list (includes hidden products) |
| GET | `/products/admin/:id` | admin | Admin detail |

## Categories & Brands

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/categories` / `/categories/:id` | — | Public list / detail (active only) |
| POST / PATCH / DELETE | `/categories[/:id]` | admin | CRUD (delete blocked while products exist) |
| GET | `/categories/admin/list` | admin | All categories incl. inactive |
| GET | `/brands` | — | Public list |
| POST / PATCH / DELETE | `/brands[/:id]` | admin | CRUD |
| GET | `/brands/admin/list` | admin | All brands |

## Cart

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/cart` | ✓ | Cart with server-computed `subtotal, discount, shippingFee, total, itemCount` |
| POST | `/cart/items` | ✓ | `{productId, variantId?, quantity}` — merges duplicates, validates stock |
| PATCH | `/cart/items/:id` | ✓ | `{quantity}` |
| DELETE | `/cart/items/:id` | ✓ | Remove item |
| DELETE | `/cart` | ✓ | Clear cart |

## Wishlist

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/wishlist` | ✓ | List items |
| POST | `/wishlist/items` | ✓ | `{productId}` — 409 on duplicates |
| DELETE | `/wishlist/items/:productId` | ✓ | Remove |

## Orders

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/orders` | ✓ | Checkout: `{addressId, paymentMethod: CARD\|CASH_ON_DELIVERY, couponCode?, notes?}` — creates order + payment, decrements stock, clears cart |
| GET | `/orders` | ✓ | Own orders (filter `status`, search `orderNumber`) |
| GET | `/orders/:id` | ✓ | Own order detail |
| PATCH | `/orders/:id/cancel` | ✓ | Cancel own order (PENDING/CONFIRMED only; restores stock, refunds) |
| GET | `/orders/admin/all` | admin | All orders (filters: `status`, `search`) |
| GET | `/orders/admin/:id` | admin | Order detail |
| PATCH | `/orders/admin/:id/status` | admin | Advance `status` per state machine |

**Status flow:** `PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED`
(cancel allowed from PENDING/CONFIRMED; paid orders become `REFUNDED`).

## Reviews

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/products/:productId/reviews` | — | Public reviews (paginated) |
| POST | `/products/:productId/reviews` | ✓ | `{rating 1-5, comment?}` — one per user per product (409), verified-purchase flag |
| GET | `/reviews/mine` | ✓ | Own reviews |
| PATCH | `/reviews/:id` | ✓ | Update own review |
| DELETE | `/reviews/:id` | ✓ | Delete own review |
| GET | `/reviews/admin/all` | admin | All reviews |
| DELETE | `/reviews/admin/:id` | admin | Delete any review |

## Coupons

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/coupons/validate` | — | `{code, subtotal}` → `{coupon, discount}` |
| GET | `/coupons` | admin | List |
| POST | `/coupons` | admin | Create `{code, type, value, minOrderAmount?, maxDiscount?, startsAt?, expiresAt?, usageLimit?, isActive?}` |
| PATCH | `/coupons/:id` | admin | Update |
| DELETE | `/coupons/:id` | admin | Delete |

## Admin Analytics & Inventory

| Method | Path | Description |
| --- | --- | --- |
| GET | `/admin/stats` | KPIs: revenue, orders, AOV, revenueToday, pendingOrders, customers, products, lowStock |
| GET | `/admin/revenue?days=30` | Daily revenue + order counts |
| GET | `/admin/top-products?limit=5` | Best sellers by units |
| GET | `/admin/sales-by-category` | Sales grouped by category |
| GET | `/admin/inventory` | Stock with variants (`lowStock=true`, `search`) |
| GET | `/admin/inventory/logs` | Recent stock-change audit log |
| PATCH | `/admin/inventory/:id` | `{change, reason}` — never below zero, logged |

## Example: Full Checkout Flow

```bash
# 1. Login
TOKEN=$(curl -s -X POST $BASE/auth/login -H "Content-Type: application/json" \
  -d '{"email":"customer@novacart.dev","password":"Customer@1234"}' \
  | jq -r .data.accessToken)

# 2. Add to cart
curl -s -X POST $BASE/cart/items -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId":"<PRODUCT_ID>","quantity":2}'

# 3. Validate coupon
curl -s -X POST $BASE/coupons/validate -H "Content-Type: application/json" \
  -d '{"code":"WELCOME10","subtotal":198}'

# 4. Place order (mock card payment → PAID)
curl -s -X POST $BASE/orders -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"addressId":"<ADDRESS_ID>","paymentMethod":"CARD","couponCode":"WELCOME10"}'
```

## Environment Variables

**Backend** (`.env`):

```
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@localhost:5432/novacart
DATABASE_URL_TEST=postgresql://user:pass@localhost:5432/novacart_test
JWT_ACCESS_SECRET=<long-random-string>
JWT_REFRESH_SECRET=<long-random-string>
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
COOKIE_SECURE=false
SHIPPING_FEE=5
FREE_SHIPPING_THRESHOLD=50
MOCK_EMAIL=true
```

**Frontend** (`.env.local`):

```
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

> Never commit real values. `.env.example` files contain placeholders only.
