# Booking App ("am_app") – Design Spec

Flutter · English + Arabic (RTL) · Light + Dark theme

## 1. Design tokens

| Token | Light | Dark |
|---|---|---|
| primary | #0C7A5B | #3DDC97 |
| onPrimary | #FFFFFF | #00251A |
| background | #F7F9F8 | #0E1512 |
| surface (cards) | #FFFFFF | #17211C |
| textPrimary | #0B1F18 | #E8F3EE |
| textSecondary | #5C6F67 | #9DB3A9 |
| border | #DCE8E4 | #27362F |
| success / warning / error | #1B9E5A / #E8A317 / #D64545 | #3DDC97 / #F2B84B / #FF7A7A |

- Radius: cards 16, buttons 14, chips 20, sheets 24
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32
- Fonts: **Cairo** (Arabic + Latin) or Inter (EN) + IBM Plex Sans Arabic (AR)
- Type scale: Display 28/700, Title 20/600, Body 16/400, Caption 12/400
- Icons: Material Symbols (rounded), 24px
- Min touch target 48px

Flutter: `ThemeData(colorScheme: ColorScheme.fromSeed(...), useMaterial3: true)` for both `theme` and `darkTheme`; `themeMode` saved in local storage (system / light / dark).

## 2. Localization / RTL
- `flutter_localizations` + `intl`, files `lib/l10n/app_en.arb`, `app_ar.arb`.
- Language switch in Settings; `Directionality` follows locale automatically.
- Use `EdgeInsetsDirectional`, `AlignmentDirectional`; mirror back arrows (`Icons.arrow_back_ios_new` handles RTL).
- Dates/numbers via `intl` (`DateFormat.yMMMd(locale)`); backend returns both `nameEn` / `nameAr`.

## 3. Navigation map

```
Splash → Onboarding (3 slides, first launch only)
       → Auth: Login / Register / Forgot password / OTP
       → Main (bottom nav, 4 tabs)
          1 Home
          2 Explore (search + filters)
          3 My Bookings
          4 Profile
Home/Explore → Service Details → Select Provider → Select Date & Time
            → Booking Summary → Payment → Success
My Bookings → Booking Details → Reschedule / Cancel / Rate
Profile → Edit profile · Favorites · Notifications · Settings (language, theme) · Help · Logout
```

## 4. Screens

1. **Splash** – logo centered, fade in, check token → Home or Login.
2. **Onboarding** – 3 illustrations, Skip, Next, Get started.
3. **Login** – email, password, "Forgot password?", primary button, "Create account" link.
4. **Register** – name, phone, email, password, terms checkbox.
5. **OTP** – 6 boxes, resend timer 00:30.
6. **Home** – greeting + avatar, search bar, category chips (horizontal), "Popular services" carousel, "Top providers" list, "Upcoming booking" card.
7. **Explore** – search field, filter button → bottom sheet (category, price range, rating, sort), vertical list of service cards, empty state.
8. **Service details** – hero image, title, rating, duration, price, description, providers list, "Book now" sticky bar, favorite icon.
9. **Select provider** – list with avatar, rating, next available slot.
10. **Date & time** – horizontal calendar (14 days) + grid of time-slot chips (disabled = booked).
11. **Booking summary** – service, provider, date/time, notes field, price breakdown, promo code, "Confirm".
12. **Payment** – method radio list (Card, Apple Pay, Cash), confirm.
13. **Success** – check animation, booking number, "View booking", "Home".
14. **My bookings** – tabs Upcoming / Completed / Cancelled, booking cards with status chip.
15. **Booking details** – QR/code, status timeline, actions (Reschedule, Cancel, Rate).
16. **Rate** – 5 stars + comment.
17. **Favorites**, **Notifications** (list, unread dot), **Profile / Edit profile**, **Settings** (language EN/AR, theme System/Light/Dark, notifications toggle), **Help & Contact**.

Common states for every list/detail: loading (shimmer), empty (illustration + CTA), error (retry).

## 5. Reusable widgets
`AppButton` (filled/outlined/text, loading) · `AppTextField` · `ServiceCard` · `ProviderTile` · `CategoryChip` · `TimeSlotChip` · `StatusChip` · `RatingStars` · `AppBottomSheet` · `EmptyState` · `ErrorState` · `ShimmerList` · `ConfirmDialog`.

## 6. Suggested architecture

```
lib/
  main.dart
  core/ (theme, l10n, router, network/dio_client.dart, storage, utils)
  features/
    auth/ (data, domain, presentation)
    home/ explore/ service/ booking/ payment/ profile/ notifications/ settings/
```
- State: **Riverpod** (or Bloc) · Routing: **go_router** · HTTP: **dio** + interceptor (adds `Authorization: Bearer`, `Accept-Language`, refresh token on 401) · Storage: `flutter_secure_storage` (tokens), `shared_preferences` (theme, locale) · Models: `freezed` + `json_serializable`.

## 7. Build order (learning path)
1. Theme + l10n + router + settings screen (theme/language switching) 
2. Auth screens against the mock API
3. Home/Explore with real list data
4. Service details → booking flow
5. My bookings + actions
6. Polish: shimmer, empty/error states, animations, tests
