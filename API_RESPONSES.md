# API responses (real, tested)

Base URL: `https://<your-service>.onrender.com` (local: `http://localhost:3000`)
Protected routes need `Authorization: Bearer <accessToken>`. Demo user: `demo@am.app` / `123456`.

## How to see every response yourself
1. **Browser**: open `{base}/services`, `/categories`, `/providers?serviceId=1`, `/db` (json-server shows all data at `/db`).
2. **Postman / Insomnia / Thunder Client**: import `openapi.yaml` → all endpoints appear; press Send.
3. **curl**: examples below.

## Users / settings (new)
New users and the demo user default to `language: "en"`, `theme: "light"`.

### POST /auth/login
```bash
curl -X POST $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"demo@am.app","password":"123456"}'
```
```json
{
  "user": {"id": 1, "name": "Demo User", "email": "demo@am.app", "phone": "+966500000000",
           "avatar": "https://i.pravatar.cc/150?img=12", "language": "en", "theme": "light"},
  "accessToken": "demo-token-1",
  "refreshToken": "refresh-1"
}
```

### POST /auth/register  → 201 (language en, theme light by default)
Body: `{"name","phone","email","password"}`. Same response shape. 409 `EMAIL_EXISTS` if the email is used.

### GET /me  (user info + saved settings)
```bash
curl $BASE/me -H 'Authorization: Bearer demo-token-1'
```
```json
{"id": 1, "name": "Demo User", "email": "demo@am.app", "phone": "+966500000000",
 "avatar": "https://i.pravatar.cc/150?img=12", "language": "en", "theme": "light"}
```

### PATCH /me  (save language / theme / profile)
```bash
curl -X PATCH $BASE/me -H 'Authorization: Bearer demo-token-1' \
  -H 'Content-Type: application/json' -d '{"language":"ar","theme":"dark"}'
```
Returns the updated user. Allowed: `language` = `en|ar`, `theme` = `light|dark|system`; others → 400:
```json
{"error": {"code": "VALIDATION", "message": "language must be en or ar"}}
```
No/invalid token → 401 `{"error": {"code": "UNAUTHENTICATED", ...}}`.

Flutter flow: after login read `user.language/theme` and apply; when the user changes them in Settings call `PATCH /me`.

## Catalog (json-server, returns arrays)
- `GET /categories` → `[{"id":1,"nameEn":"Beauty","nameAr":"التجميل","icon":"spa"}, ...]`
- `GET /services?categoryId=1` → `[{"id":1,"categoryId":1,"titleEn":"Haircut & Styling","titleAr":"قص وتصفيف الشعر","price":80,"durationMin":45,"rating":4.8,"image":"..."}]`
- `GET /services/1`, `GET /providers?serviceId=1`
- `GET /slots?providerId=1&date=2026-12-01` → `[{"id":1,"providerId":1,"date":"2026-12-01","time":"09:00","available":true}, ...]`
- `GET /bookings?userId=1`, `POST /bookings`, `PATCH /bookings/1`
- Search/paging/sort come from json-server: `?q=hair&_page=1&_limit=10&_sort=price&_order=asc`

Not implemented in this mock (see API_SPEC.md): `/auth/refresh`, OTP / password reset, `/promo/validate`, slot-conflict (409) checking. The token is a demo string, not a real JWT.

## Added endpoints (all tested)
| Call | Success | Errors |
|---|---|---|
| `POST /auth/refresh` `{refreshToken}` | 200 `{accessToken}` | 401 INVALID_REFRESH |
| `POST /auth/forgot-password` `{email}` | 200 `{message}` | 400 VALIDATION |
| `POST /auth/verify-otp` `{email, code}` | 200 `{verified:true}` | 400 INVALID_OTP (demo code is always `123456`) |
| `POST /auth/reset-password` `{email, code, newPassword}` | 200 `{message}` | 400 INVALID_OTP / VALIDATION, 404 |
| `POST /promo/validate` `{code}` | 200 `{valid, discountPercent}` (`WELCOME10` = 10%) | – |
| `POST /bookings` (auth) `{serviceId, providerId, date, time, notes?, paymentMethod?, promoCode?}` | 201 booking (price after promo, `code` BK-xxxx, slot becomes unavailable) | 400, 404, **409 SLOT_TAKEN** |
| `PATCH /bookings/{id}` (auth) `{status:"cancelled"}` | 200 booking (slot freed again) | 404, 409 if completed |
| `POST /bookings/{id}/review` (auth) `{rating 1-5, comment}` | 201 review | 400, 409 ALREADY_REVIEWED |
| `GET/POST /favorites`, `DELETE /favorites/{id}` (auth) | 200 / 201 / 204 | 401, 404 |
| `GET /notifications`, `PATCH /notifications/{id}` `{read}` (auth) | 200 | 401, 404 |
