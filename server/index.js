require('dotenv').config();

const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { initialAppData, readDb, writeDb, publicUser } = require('./db');
const { privacyPolicy, terms, accountDeletion, healthDisclaimer } = require('./pages');

const app = express();
const PORT = Number(process.env.PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-this-secret-before-production';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'dev-only-change-this-secret-before-production') {
  throw new Error('Production server requires a strong JWT_SECRET environment variable.');
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '2mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));

function sign(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
}

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'UNAUTHORIZED', message: '请先登录。' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const db = readDb();
    const user = db.users.find((item) => item.id === payload.sub);
    if (!user) return res.status(401).json({ error: 'UNAUTHORIZED', message: '账号不存在或已删除。' });
    req.user = user;
    req.db = db;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: '登录状态已失效，请重新登录。' });
  }
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function validatePassword(password) {
  return typeof password === 'string' && password.length >= 8;
}

app.get('/health', (req, res) => {
  res.json({ ok: true, service: '健康守护者 API', time: new Date().toISOString() });
});

app.get('/privacy', (req, res) => res.type('html').send(privacyPolicy()));
app.get('/terms', (req, res) => res.type('html').send(terms()));
app.get('/account-deletion', (req, res) => res.type('html').send(accountDeletion()));
app.get('/health-disclaimer', (req, res) => res.type('html').send(healthDisclaimer()));

app.post('/api/auth/register', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const name = String(req.body.name || '').trim();
  const role = String(req.body.role || '康复师').trim();
  const password = String(req.body.password || '');

  if (!email || !email.includes('@')) return res.status(400).json({ error: 'INVALID_EMAIL', message: '请输入有效邮箱。' });
  if (!name) return res.status(400).json({ error: 'INVALID_NAME', message: '请输入姓名。' });
  if (!validatePassword(password)) return res.status(400).json({ error: 'WEAK_PASSWORD', message: '密码至少需要 8 位。' });

  const db = readDb();
  if (db.users.some((user) => user.email === email)) {
    return res.status(409).json({ error: 'EMAIL_EXISTS', message: '该邮箱已注册，请直接登录。' });
  }

  const now = new Date().toISOString();
  const user = {
    id: crypto.randomUUID(),
    email,
    name,
    role,
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: now,
    updatedAt: now
  };
  db.users.push(user);
  db.appData[user.id] = { ...initialAppData, updatedAt: now };
  writeDb(db);

  res.status(201).json({ token: sign(user), user: publicUser(user), appData: db.appData[user.id] });
});

app.post('/api/auth/login', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  const db = readDb();
  const user = db.users.find((item) => item.email === email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'BAD_CREDENTIALS', message: '账号或密码错误。' });
  }
  if (!db.appData[user.id]) db.appData[user.id] = { ...initialAppData, updatedAt: new Date().toISOString() };
  writeDb(db);
  res.json({ token: sign(user), user: publicUser(user), appData: db.appData[user.id] });
});

app.get('/api/me', auth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.patch('/api/me', auth, (req, res) => {
  const name = String(req.body.name || '').trim();
  const role = String(req.body.role || '').trim();
  if (!name) return res.status(400).json({ error: 'INVALID_NAME', message: '姓名不能为空。' });
  const db = req.db;
  const user = db.users.find((item) => item.id === req.user.id);
  user.name = name;
  user.role = role || user.role;
  user.updatedAt = new Date().toISOString();
  writeDb(db);
  res.json({ user: publicUser(user) });
});

app.get('/api/app-data', auth, (req, res) => {
  const data = req.db.appData[req.user.id] || { ...initialAppData, updatedAt: new Date().toISOString() };
  res.json({ appData: data });
});

app.put('/api/app-data', auth, (req, res) => {
  const data = req.body.appData;
  if (!data || typeof data !== 'object') return res.status(400).json({ error: 'INVALID_DATA', message: '数据格式不正确。' });
  const db = req.db;
  db.appData[req.user.id] = {
    patients: Array.isArray(data.patients) ? data.patients : [],
    devices: Array.isArray(data.devices) ? data.devices : [],
    assessments: Array.isArray(data.assessments) ? data.assessments : [],
    prescriptions: Array.isArray(data.prescriptions) ? data.prescriptions : [],
    records: Array.isArray(data.records) ? data.records : [],
    reports: Array.isArray(data.reports) ? data.reports : [],
    storage: Array.isArray(data.storage) ? data.storage : [],
    tasks: Array.isArray(data.tasks) ? data.tasks : [],
    updatedAt: new Date().toISOString()
  };
  writeDb(db);
  res.json({ ok: true, updatedAt: db.appData[req.user.id].updatedAt });
});

app.delete('/api/account', auth, (req, res) => {
  const db = req.db;
  db.users = db.users.filter((item) => item.id !== req.user.id);
  delete db.appData[req.user.id];
  db.deletionRequests.push({
    id: crypto.randomUUID(),
    userId: req.user.id,
    email: req.user.email,
    completedAt: new Date().toISOString(),
    source: 'in-app'
  });
  writeDb(db);
  res.json({ ok: true });
});

app.post('/api/account-deletion-request', (req, res) => {
  const email = normalizeEmail(req.body.email);
  const reason = String(req.body.reason || '').trim();
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'INVALID_EMAIL', message: '请输入有效邮箱。' });
  const db = readDb();
  db.deletionRequests.push({
    id: crypto.randomUUID(),
    email,
    reason,
    completedAt: null,
    createdAt: new Date().toISOString(),
    source: 'web-request'
  });
  writeDb(db);
  res.status(201).json({ ok: true });
});

app.use((req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: '接口不存在。' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`健康守护者 API running on http://0.0.0.0:${PORT}`);
});
