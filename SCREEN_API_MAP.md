# Screen → API map

Base URL: `https://booking-mock-api.onrender.com`. "Auth" = header `Authorization: Bearer <accessToken>`.
Suggested Flutter file names are in the last column.

| # | Screen | API calls | Auth | Flutter file |
|---|---|---|---|---|
| 1 | Splash | none (read the saved token, then `GET /me` if you have one) | – | `splash_screen.dart` |
| 2 | Onboarding | none | – | `onboarding_screen.dart` |
| 3 | Login | `POST /auth/login` | – | `login_screen.dart` |
| 4 | Register | `POST /auth/register` | – | `register_screen.dart` |
| 5 | Home | `GET /me`, `GET /categories`, `GET /services?_limit=5&_sort=rating&_order=desc`, `GET /bookings?status=upcoming&_limit=1` (see note 1) | yes | `home_screen.dart` |
| 6 | Explore + filters | `GET /services?q=&categoryId=&minPrice=&maxPrice=&rating_gte=&_sort=&_order=&_page=&_limit=` | – | `explore_screen.dart` |
| 7 | Service details | `GET /services/{id}`, `GET /providers?serviceId={id}`, heart: `POST /favorites` / `DELETE /favorites/{id}` | heart only | `service_details_screen.dart` |
| 8 | Provider · date · time | `GET /providers?serviceId=`, `GET /slots?providerId=&date=` | – | `select_slot_screen.dart` |
| 9 | Summary + payment | `POST /promo/validate`, `POST /bookings` (409 `SLOT_TAKEN` → go back to screen 8) | yes | `booking_summary_screen.dart` |
| 10 | Success | none (uses the `POST /bookings` response) | – | `booking_success_screen.dart` |
| 11 | My bookings | `GET /bookings?userId=&status=` (see note 1) | yes | `my_bookings_screen.dart` |
| 12 | Booking details | `GET /bookings/{id}`, `PATCH /bookings/{id}` (cancel or reschedule) | yes | `booking_details_screen.dart` |
| 13 | Profile | `GET /me` | yes | `profile_screen.dart` |
| 14 | Settings | `PATCH /me {language, theme}` | yes | `settings_screen.dart` |
| 15 | Forgot password | `POST /auth/forgot-password` | – | `forgot_password_screen.dart` |
| 16 | Verify OTP | `POST /auth/verify-otp` (resend: `POST /auth/forgot-password`) | – | `verify_otp_screen.dart` |
| 17 | New password | `POST /auth/reset-password` | – | `reset_password_screen.dart` |
| 18 | Favorites | `GET /favorites`, `GET /services/{serviceId}` per item, `DELETE /favorites/{id}` | yes | `favorites_screen.dart` |
| 19 | Notifications | `GET /notifications`, `PATCH /notifications/{id}` | yes | `notifications_screen.dart` |
| 20 | Rate service | `POST /bookings/{id}/review` | yes | `review_screen.dart` |
| 21 | Edit profile | `GET /me`, `PATCH /me {name, phone, avatar}` | yes | `edit_profile_screen.dart` |

## No screen (call it from code)
| API | Where |
|---|---|
| `POST /auth/refresh` | In a dio interceptor. On a 401, send `{refreshToken}`, save the new `accessToken` and retry the request. |

## Notes
1. `GET /bookings` and `GET /services` come from json-server, so they can be filtered with query params. `GET /bookings` is not limited to the logged-in user, so pass `userId` yourself.
2. After login or register, read `user.language` and `user.theme` and apply them. A new user is always `en` and `light`.
3. Settings screen: when the user changes language or theme, apply it locally first, then call `PATCH /me`.
4. Notifications have `titleEn` and `titleAr`; show the one that matches the current language.
5. Demo user: `demo@am.app` / `123456`. Demo OTP: `123456`. Promo: `WELCOME10`.
