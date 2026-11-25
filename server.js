const jsonServer = require('json-server');
const path = require('path');

const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, 'db.json'));
const db = router.db;

// API docs: Swagger UI at /docs (and /) reads the same openapi.yaml.
server.get('/openapi.yaml', (req, res) =>
  res.type('text/yaml').sendFile(path.join(__dirname, 'openapi.yaml')),
);
server.get(['/', '/docs'], (req, res) =>
  res.type('html').send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Booking API docs</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"></head>
<body><div id="ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({url: '/openapi.yaml', dom_id: '#ui', persistAuthorization: true});</script>
</body></html>`),
);

server.use(jsonServer.defaults());
server.use(jsonServer.bodyParser);

const DEFAULT_SETTINGS = {language: 'en', theme: 'light'};
const publicUser = ({password, ...user}) => user;
// Demo "token": the user id. Replace with real JWT in a real backend.
const tokenFor = user => `demo-token-${user.id}`;
const userFromToken = req => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const id = Number(token.replace('demo-token-', ''));
  return id ? db.get('users').find({id}).value() : undefined;
};
const fail = (res, status, code, message) =>
  res.status(status).json({error: {code, message}});

server.post('/auth/register', (req, res) => {
  const {name, phone, email, password} = req.body;
  if (!name || !email || !password) {
    return fail(res, 400, 'VALIDATION', 'name, email and password are required');
  }
  if (db.get('users').find({email}).value()) {
    return fail(res, 409, 'EMAIL_EXISTS', 'Email already registered');
  }
  // New users always start with English and the light theme.
  const user = db
    .get('users')
    .insert({name, phone, email, password, avatar: null, ...DEFAULT_SETTINGS})
    .write();
  res.status(201).json({
    user: publicUser(user),
    accessToken: tokenFor(user),
    refreshToken: `refresh-${user.id}`,
  });
});

server.post('/auth/login', (req, res) => {
  const {email, password} = req.body;
  const user = db.get('users').find({email, password}).value();
  if (!user) {
    return fail(res, 401, 'INVALID_CREDENTIALS', 'Wrong email or password');
  }
  res.json({
    user: publicUser(user),
    accessToken: tokenFor(user),
    refreshToken: `refresh-${user.id}`,
  });
});

// User info + saved settings.
server.get('/me', (req, res) => {
  const user = userFromToken(req);
  if (!user) {
    return fail(res, 401, 'UNAUTHENTICATED', 'Missing or invalid token');
  }
  res.json(publicUser(user));
});

server.patch('/me', (req, res) => {
  const user = userFromToken(req);
  if (!user) {
    return fail(res, 401, 'UNAUTHENTICATED', 'Missing or invalid token');
  }
  const {language, theme, name, phone, avatar} = req.body;
  if (language && !['en', 'ar'].includes(language)) {
    return fail(res, 400, 'VALIDATION', 'language must be en or ar');
  }
  if (theme && !['light', 'dark', 'system'].includes(theme)) {
    return fail(res, 400, 'VALIDATION', 'theme must be light, dark or system');
  }
  const changes = Object.fromEntries(
    Object.entries({language, theme, name, phone, avatar}).filter(
      ([, value]) => value !== undefined,
    ),
  );
  const updated = db.get('users').find({id: user.id}).assign(changes).write();
  res.json(publicUser(updated));
});

const requireUser = (req, res) => {
  const user = userFromToken(req);
  if (!user) fail(res, 401, 'UNAUTHENTICATED', 'Missing or invalid token');
  return user;
};
const DEMO_OTP = '123456';
const byIdAndUser = (table, req, user) =>
  db.get(table).find({id: Number(req.params.id), userId: user.id}).value();

server.post('/auth/refresh', (req, res) => {
  const id = Number(String(req.body.refreshToken || '').replace('refresh-', ''));
  const user = id && db.get('users').find({id}).value();
  if (!user) return fail(res, 401, 'INVALID_REFRESH', 'Invalid refresh token');
  res.json({accessToken: tokenFor(user)});
});

server.post('/auth/forgot-password', (req, res) => {
  if (!req.body.email) return fail(res, 400, 'VALIDATION', 'email is required');
  // Same answer whether or not the email exists. The demo OTP is always 123456.
  res.json({message: 'If the email exists, a code was sent (demo code: 123456)'});
});

server.post('/auth/verify-otp', (req, res) => {
  if (req.body.code !== DEMO_OTP) {
    return fail(res, 400, 'INVALID_OTP', 'Wrong code');
  }
  res.json({verified: true});
});

server.post('/auth/reset-password', (req, res) => {
  const {email, code, newPassword} = req.body;
  if (code !== DEMO_OTP) return fail(res, 400, 'INVALID_OTP', 'Wrong code');
  if (!newPassword || newPassword.length < 6) {
    return fail(res, 400, 'VALIDATION', 'newPassword must be at least 6 characters');
  }
  const user = db.get('users').find({email}).value();
  if (!user) return fail(res, 404, 'NOT_FOUND', 'User not found');
  db.get('users').find({id: user.id}).assign({password: newPassword}).write();
  res.json({message: 'Password updated'});
});

const findPromo = code =>
  db
    .get('promo')
    .find(p => p.code.toUpperCase() === String(code || '').trim().toUpperCase())
    .value();

server.post('/promo/validate', (req, res) => {
  const promo = findPromo(req.body.code);
  res.json({valid: !!promo, discountPercent: promo ? promo.discountPercent : 0});
});

const findSlot = ({providerId, date, time}) =>
  db.get('slots').find({providerId: Number(providerId), date, time}).value();
const setSlot = (booking, available) => {
  const slot = findSlot(booking);
  if (slot) db.get('slots').find({id: slot.id}).assign({available}).write();
};

server.post('/bookings', (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const {serviceId, providerId, date, time, notes = '', paymentMethod, promoCode} =
    req.body;
  if (!serviceId || !providerId || !date || !time) {
    return fail(res, 400, 'VALIDATION', 'serviceId, providerId, date and time are required');
  }
  const service = db.get('services').find({id: Number(serviceId)}).value();
  if (!service) return fail(res, 404, 'NOT_FOUND', 'Service not found');
  const slot = findSlot({providerId, date, time});
  if (!slot || !slot.available) {
    return fail(res, 409, 'SLOT_TAKEN', 'This time is no longer available');
  }
  const promo = findPromo(promoCode);
  const price = Math.round(
    service.price * (1 - (promo ? promo.discountPercent : 0) / 100),
  );
  const nextId = (db.get('bookings').map('id').max().value() || 0) + 1;
  const booking = db
    .get('bookings')
    .insert({
      userId: user.id,
      serviceId: Number(serviceId),
      providerId: Number(providerId),
      date,
      time,
      status: 'confirmed',
      notes,
      price,
      paymentMethod: paymentMethod || 'card',
      code: `BK-${1000 + nextId}`,
    })
    .write();
  db.get('slots').find({id: slot.id}).assign({available: false}).write();
  res.status(201).json(booking);
});

server.patch('/bookings/:id', (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const booking = byIdAndUser('bookings', req, user);
  if (!booking) return fail(res, 404, 'NOT_FOUND', 'Booking not found');
  const {status, notes} = req.body;
  if (status && !['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
    return fail(res, 400, 'VALIDATION', 'invalid status');
  }
  if (status === 'cancelled' && booking.status === 'completed') {
    return fail(res, 409, 'CONFLICT', 'A completed booking cannot be cancelled');
  }
  if (status === 'cancelled' && booking.status !== 'cancelled') {
    setSlot(booking, true);
  }
  const changes = Object.fromEntries(
    Object.entries({status, notes}).filter(([, v]) => v !== undefined),
  );
  res.json(db.get('bookings').find({id: booking.id}).assign(changes).write());
});

server.post('/bookings/:id/review', (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const booking = byIdAndUser('bookings', req, user);
  if (!booking) return fail(res, 404, 'NOT_FOUND', 'Booking not found');
  const {rating, comment = ''} = req.body;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return fail(res, 400, 'VALIDATION', 'rating must be an integer 1-5');
  }
  if (db.get('reviews').find({bookingId: booking.id}).value()) {
    return fail(res, 409, 'ALREADY_REVIEWED', 'Booking already reviewed');
  }
  const review = db
    .get('reviews')
    .insert({
      bookingId: booking.id,
      providerId: booking.providerId,
      userId: user.id,
      rating,
      comment,
      createdAt: new Date().toISOString().slice(0, 10),
    })
    .write();
  res.status(201).json(review);
});

// Favorites and notifications belong to the logged-in user.
server.get('/favorites', (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  res.json(db.get('favorites').filter({userId: user.id}).value());
});

server.post('/favorites', (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const serviceId = Number(req.body.serviceId);
  if (!serviceId) return fail(res, 400, 'VALIDATION', 'serviceId is required');
  const existing = db.get('favorites').find({userId: user.id, serviceId}).value();
  if (existing) return res.json(existing);
  res.status(201).json(db.get('favorites').insert({userId: user.id, serviceId}).write());
});

server.delete('/favorites/:id', (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const fav = byIdAndUser('favorites', req, user);
  if (!fav) return fail(res, 404, 'NOT_FOUND', 'Favorite not found');
  db.get('favorites').remove({id: fav.id}).write();
  res.status(204).end();
});

server.get('/notifications', (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  res.json(db.get('notifications').filter({userId: user.id}).value());
});

server.patch('/notifications/:id', (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const n = byIdAndUser('notifications', req, user);
  if (!n) return fail(res, 404, 'NOT_FOUND', 'Notification not found');
  res.json(
    db.get('notifications').find({id: n.id}).assign({read: req.body.read !== false}).write(),
  );
});

server.use(router);

const port = process.env.PORT || 3000;
server.listen(port, '0.0.0.0', () => console.log(`API on :${port}`));
