const jsonServer = require('json-server');
const path = require('path');

const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, 'db.json'));
const db = router.db;

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

server.use(router);

const port = process.env.PORT || 3000;
server.listen(port, '0.0.0.0', () => console.log(`API on :${port}`));
