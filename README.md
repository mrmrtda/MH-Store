# MH Store 4.0 — Backend
## Stack
Node.js + Express + SQLite + Multer.

## Run
1. Install Node.js 20+.
2. Copy `.env.example` to `.env` if using a process manager that loads env vars.
3. Set a strong `ADMIN_PASS`.
4. Run:
   `npm install`
   `npm start`
5. Open `http://localhost:3000`.

## What is real
- Products are stored in SQLite.
- Admin can add/edit/delete products.
- Product images upload to `uploads/`.
- Orders are stored in SQLite.
- Receipt images upload to `uploads/`.
- Admin can review orders and change status.
- Public checkout validates product IDs/prices against the database instead of trusting browser prices.

## Important production hardening
- Put the app behind HTTPS/reverse proxy.
- Replace the demo admin credentials with a strong secret.
- Move sessions from memory to Redis/database for multi-instance hosting.
- Store uploads in object storage/CDN for scale and backups.
- Add CSRF protection, rate limiting, audit logs and stronger auth/2FA.
- Do not store card numbers/CVV. Manual transfer is not a card payment gateway.
- For real Visa/Mastercard card payments, integrate an approved Iraqi payment gateway using its hosted checkout/API + webhook.
- Add WhatsApp Business/API or replace the placeholder WhatsApp number.
- Configure backups for SQLite or move to PostgreSQL when traffic grows.
- Verify digital products/ subscriptions are legally authorized and comply with platform terms.
