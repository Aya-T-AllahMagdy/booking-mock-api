# Booking API Spec

Base URL (local mock): `http://localhost:3000` · Android emulator: `http://10.0.2.2:3000`
Headers: `Content-Type: application/json`, `Accept-Language: en|ar`, `Authorization: Bearer <token>` (protected routes).
All bilingual fields come as `nameEn` / `nameAr` (or `titleEn` …).

## Auth
| Method | Path | Body | Response |
|---|---|---|---|
| POST | /auth/register | `{name, phone, email, password}` | `{user, accessToken, refreshToken}` |
| POST | /auth/login | `{email, password}` | `{user, accessToken, refreshToken}` |
| POST | /auth/refresh | `{refreshToken}` | `{accessToken}` |
| POST | /auth/forgot-password | `{email}` | `{message}` |
| POST | /auth/verify-otp | `{email, code}` | `{verified: true}` |
| POST | /auth/reset-password | `{email, code, newPassword}` | `{message}` |

## Catalog
| Method | Path | Notes |
|---|---|---|
| GET | /categories | list |
| GET | /services | `?categoryId=&q=&minPrice=&maxPrice=&rating_gte=&_sort=price&_order=asc&_page=1&_limit=10` |
| GET | /services/{id} | details incl. providers |
| GET | /providers | `?serviceId=` |
| GET | /providers/{id} | details + reviews |
| GET | /providers/{id}/slots | `?date=2026-12-01` → `[{time:"10:00", available:true}]` |

## Bookings (auth)
| Method | Path | Body / Notes |
|---|---|---|
| POST | /bookings | `{serviceId, providerId, date, time, notes, promoCode, paymentMethod}` |
| GET | /bookings | `?userId=&status=upcoming|completed|cancelled` |
| GET | /bookings/{id} | details |
| PATCH | /bookings/{id} | reschedule `{date, time}` or cancel `{status:"cancelled"}` |
| POST | /bookings/{id}/review | `{rating (1-5), comment}` |
| POST | /promo/validate | `{code}` → `{valid, discountPercent}` |

## User (auth)
| Method | Path | Body |
|---|---|---|
| GET | /me | – |
| PATCH | /me | `{name, phone, avatar, language, theme}` |
| GET / POST / DELETE | /favorites | POST `{serviceId}`; DELETE `/favorites/{id}` |
| GET | /notifications | `?userId=` |
| PATCH | /notifications/{id} | `{read:true}` |

## Standard error
```json
{ "error": { "code": "SLOT_TAKEN", "message": "This time is no longer available" } }
```
Status codes: 200/201 success · 400 validation · 401 unauthenticated · 404 not found · 409 conflict (slot taken).

## Booking status
`pending → confirmed → completed` · `cancelled` at any time before completed.

## Publishing a free API for the app
No public free API exists for booking, so publish the included `db.json` as your own mock API:

**Option A – json-server (local, for development)**
```bash
npm i -g json-server@0.17.4
cd booking_app_spec
json-server --watch db.json --port 3000 --host 0.0.0.0
```
Dio base URL: `http://10.0.2.2:3000` (Android emulator) / `http://localhost:3000` (iOS simulator) / your PC's LAN IP (real device).

**Option B – free public hosting (works from anywhere)**
- Render.com / Railway: create a Node web service with `package.json` (`"start": "json-server db.json --port $PORT --host 0.0.0.0"`), deploy → get `https://your-api.onrender.com`.
- Or import `db.json` into **mockapi.io** / **Beeceptor** for a hosted URL in minutes.

Note: json-server has no real auth, login, or slot logic. For `/auth/*` and `/providers/{id}/slots`, the data in `db.json` supports simple filtering (`/users?email=…`, `/slots?providerId=&date=`) and your Flutter repository can fake the token. When you are ready for real behaviour, replace it with Firebase or a real backend while keeping the same endpoints/models.

See `openapi.yaml` – import it into Swagger Editor / Postman for docs and mock generation.
