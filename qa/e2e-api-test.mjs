#!/usr/bin/env node
/**
 * End-to-end API + database verification suite for the User Registration & Login system.
 *
 * Runs against the REAL Spring Boot backend and the REAL MySQL database.
 * It only creates its own uniquely-named test accounts (qa.e2e.<runId>.*@example.test)
 * and never updates or deletes existing user records.
 *
 * Usage (PowerShell):
 *   $env:DB_PASSWORD = "<your mysql password>"   # used only for read-only SELECT checks
 *   node qa/e2e-api-test.mjs
 *
 * Optional env vars:
 *   API_BASE   (default http://localhost:5000)
 *   MYSQL_BIN  (default C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe)
 *   DB_USER    (default root)
 *   BACKEND_LOG  path to backend log file to scan for leaked secrets
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const API = process.env.API_BASE || 'http://localhost:5000';
const ORIGIN = 'http://localhost:3000';
const MYSQL_BIN = process.env.MYSQL_BIN || 'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD;
const RUN = Date.now().toString(36);

const results = [];
const record = (section, name, pass, detail = '') => {
  results.push({ section, name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  [${section}] ${name}${detail ? '  -> ' + detail : ''}`);
};

/* ---------------- HTTP client with cookie jar ---------------- */
class Client {
  constructor() { this.jar = new Map(); this.seen = []; }
  cookieHeader() { return [...this.jar].map(([k, v]) => `${k}=${v}`).join('; '); }
  absorb(res) {
    for (const sc of res.headers.getSetCookie()) {
      this.seen.push(sc);
      const [pair] = sc.split(';');
      const idx = pair.indexOf('=');
      const name = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      if (/max-age=0/i.test(sc) || value === '') this.jar.delete(name);
      else this.jar.set(name, value);
    }
  }
  async req(method, path, { body, raw, headers = {}, csrf = false } = {}) {
    const h = { Accept: 'application/json', Origin: ORIGIN, ...headers };
    if (body !== undefined) h['Content-Type'] = h['Content-Type'] || 'application/json';
    if (csrf && this.jar.has('XSRF-TOKEN')) h['X-XSRF-TOKEN'] = decodeURIComponent(this.jar.get('XSRF-TOKEN'));
    const ck = this.cookieHeader();
    if (ck) h.Cookie = ck;
    const res = await fetch(API + path, {
      method, headers: h, redirect: 'manual',
      body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined,
    });
    const setCookies = res.headers.getSetCookie();
    this.absorb(res);
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, json, text, headers: res.headers, setCookies };
  }
  async csrf() { return this.req('GET', '/api/auth/csrf'); }
}

/* ---------------- DB helper (read-only SELECTs) ---------------- */
function sql(query) {
  if (!DB_PASSWORD) throw new Error('DB_PASSWORD env var not set');
  const out = execFileSync(MYSQL_BIN, ['-u', DB_USER, '-N', '-B', '-e', query, 'user_management_db'], {
    env: { ...process.env, MYSQL_PWD: DB_PASSWORD }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  });
  return out.trim() ? out.trim().split(/\r?\n/).map(l => l.split('\t')) : [];
}
const esc = s => s.replace(/'/g, "''");
const countEmail = email => Number(sql(`SELECT COUNT(*) FROM users WHERE email='${esc(email)}'`)[0][0]);

/* ---------------- Fixtures ---------------- */
const PW_A = `Qa!${RUN}Aa1`;
const PW_B = `Qb#${RUN}Bb2`;
const userA = {
  firstName: 'Qa', lastName: 'Alpha', dateOfBirth: '1998-04-12',
  address: '12 Test Street, Chennai', phoneNumber: '9876500001',
  email: `qa.e2e.${RUN}.a@example.test`, password: PW_A, confirmPassword: PW_A,
};
const userB = {
  firstName: 'Qb', lastName: 'Bravo', dateOfBirth: '2000-11-30',
  address: '34 Sample Road, Madurai', phoneNumber: '9876500002',
  email: `qa.e2e.${RUN}.b@example.test`, password: PW_B, confirmPassword: PW_B,
};
const SENSITIVE_KEYS = /^(password|passwordHash|password_hash|confirmPassword)$/i;
const noSecrets = (text, ...pws) => {
  if (/\$2[aby]\$\d\d\$/.test(text) || pws.some(p => text.includes(p))) return false;
  let json; try { json = JSON.parse(text); } catch { return true; }
  const userObj = json?.user;
  return !userObj || !Object.keys(userObj).some(k => SENSITIVE_KEYS.test(k));
};
const future = new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10);
const tenYearsAgo = new Date(Date.now() - 86400000 * 365 * 10).toISOString().slice(0, 10);

async function main() {
  console.log(`\nE2E run id: ${RUN}   API: ${API}\n`);
  const anon = new Client();

  /* ===== Phase 2: startup & infrastructure ===== */
  const health = await anon.req('GET', '/api/health');
  record('Startup', 'GET /api/health returns 200 UP', health.status === 200 && health.json?.status === 'UP', `status=${health.status}`);

  const cols = sql(`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='user_management_db' AND TABLE_NAME='users'`).map(r => r[0]);
  const expected = ['id', 'first_name', 'last_name', 'date_of_birth', 'address', 'phone_number', 'email', 'password_hash', 'created_at', 'updated_at'];
  record('Database', 'users table has all required columns', expected.every(c => cols.includes(c)), cols.join(','));
  record('Database', 'No confirm-password / plain password column exists', !cols.some(c => /confirm|^password$/i.test(c)));
  const uniq = sql(`SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA='user_management_db' AND TABLE_NAME='users' AND COLUMN_NAME='email' AND NON_UNIQUE=0`);
  record('Database', 'UNIQUE constraint on users.email exists', uniq.length > 0, uniq.map(r => r[0]).join(','));
  const pk = sql(`SELECT EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='user_management_db' AND TABLE_NAME='users' AND COLUMN_NAME='id'`);
  record('Database', 'users.id is auto-increment primary key', /auto_increment/i.test(pk[0]?.[0] || ''));
  const dobType = sql(`SELECT DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='user_management_db' AND TABLE_NAME='users' AND COLUMN_NAME='date_of_birth'`);
  record('Database', 'date_of_birth is SQL DATE', dobType[0]?.[0] === 'date', dobType[0]?.[0]);

  const csrfRes = await anon.csrf();
  record('Startup', 'GET /api/auth/csrf issues XSRF-TOKEN cookie', csrfRes.status === 200 && anon.jar.has('XSRF-TOKEN'));
  const xsrfCookie = anon.seen.find(c => c.startsWith('XSRF-TOKEN='));
  record('Security', 'XSRF-TOKEN cookie readable by JS (not HttpOnly) by design', xsrfCookie && !/httponly/i.test(xsrfCookie));

  /* ===== CORS ===== */
  const pre = await fetch(API + '/api/auth/login', { method: 'OPTIONS', headers: { Origin: ORIGIN, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,x-xsrf-token' } });
  record('CORS', 'Preflight from http://localhost:3000 allowed with credentials',
    pre.headers.get('access-control-allow-origin') === ORIGIN && pre.headers.get('access-control-allow-credentials') === 'true', `status=${pre.status}`);
  const evil = await fetch(API + '/api/auth/login', { method: 'OPTIONS', headers: { Origin: 'http://evil.example', 'Access-Control-Request-Method': 'POST' } });
  record('CORS', 'Preflight from untrusted origin rejected', evil.status === 403 && !evil.headers.get('access-control-allow-origin'), `status=${evil.status}`);

  /* ===== Phase 3: registration negatives (run BEFORE positive so DB is clean for these emails) ===== */
  const reg = (c, body, opts = {}) => c.req('POST', '/api/auth/register', { body, csrf: true, ...opts });
  const negEmail = tag => `qa.e2e.${RUN}.neg.${tag}@example.test`;
  const negatives = [
    ['Empty JSON object', {}, 400, r => ['firstName', 'lastName', 'dateOfBirth', 'address', 'phoneNumber', 'email', 'password', 'confirmPassword'].every(k => r.json?.fieldErrors?.[k])],
    ['Whitespace-only fields', { ...userA, email: negEmail('ws'), firstName: '   ', lastName: '  ', address: '     ', phoneNumber: '   ' }, 400, r => r.json?.fieldErrors?.firstName && r.json?.fieldErrors?.address],
    ['Invalid email "not-an-email"', { ...userA, email: 'not-an-email' }, 400, r => r.json?.fieldErrors?.email],
    ['Invalid email without TLD "qa@localhost"', { ...userA, email: `qa${RUN}@localhost` }, 400, r => r.json?.fieldErrors?.email],
    ['Invalid phone "abcdefghij"', { ...userA, email: negEmail('ph1'), phoneNumber: 'abcdefghij' }, 400, r => r.json?.fieldErrors?.phoneNumber],
    ['Invalid phone with no digits "----------"', { ...userA, email: negEmail('ph2'), phoneNumber: '----------' }, 400, r => r.json?.fieldErrors?.phoneNumber],
    ['Invalid phone too short "12345"', { ...userA, email: negEmail('ph3'), phoneNumber: '12345' }, 400, r => r.json?.fieldErrors?.phoneNumber],
    ['Invalid phone too long "12345678901"', { ...userA, email: negEmail('ph4'), phoneNumber: '12345678901' }, 400, r => r.json?.fieldErrors?.phoneNumber],
    ['Future date of birth', { ...userA, email: negEmail('dob1'), dateOfBirth: future }, 400, r => r.json?.fieldErrors?.dateOfBirth],
    ['Missing date of birth', { ...userA, email: negEmail('dob2'), dateOfBirth: null }, 400, r => r.json?.fieldErrors?.dateOfBirth],
    ['Invalid date "2000-13-45"', { ...userA, email: negEmail('dob3'), dateOfBirth: '2000-13-45' }, 400, null],
    ['Under-13 date of birth', { ...userA, email: negEmail('dob4'), dateOfBirth: tenYearsAgo }, 400, r => r.json?.fieldErrors?.dateOfBirth],
    ['Weak password "password"', { ...userA, email: negEmail('pw1'), password: 'password', confirmPassword: 'password' }, 400, null],
    ['Password without special char', { ...userA, email: negEmail('pw2'), password: 'Password123', confirmPassword: 'Password123' }, 400, null],
    ['Mismatched confirm password', { ...userA, email: negEmail('pw3'), confirmPassword: PW_A + 'x' }, 400, r => /match/i.test(r.text)],
    ['First name > 100 chars', { ...userA, email: negEmail('long'), firstName: 'A'.repeat(101) }, 400, r => r.json?.fieldErrors?.firstName],
    ['SQL-injection style name', { ...userA, email: negEmail('sqli'), firstName: "Robert'); DROP TABLE users;--" }, 400, r => r.json?.fieldErrors?.firstName],
    ['SQL-injection style email', { ...userA, email: "' OR '1'='1' --@x.com" }, 400, r => r.json?.fieldErrors?.email],
  ];
  for (const [name, body, exp, check] of negatives) {
    const r = await reg(anon, body);
    const ok = r.status === exp && (!check || check(r)) && noSecrets(r.text, PW_A);
    record('Registration-', `${name} -> ${exp}`, !!ok, `status=${r.status} ${r.json?.message || ''} ${r.json?.fieldErrors ? JSON.stringify(r.json.fieldErrors).slice(0, 140) : ''}`);
    if (body.email && body.email.includes('@example.test')) {
      record('Registration-', `  ...no DB row created for "${name}"`, countEmail(body.email.trim().toLowerCase()) === 0);
    }
  }
  const mal = await reg(anon, undefined, { raw: '{"firstName": "x", bad json', headers: { 'Content-Type': 'application/json' } });
  record('Registration-', 'Malformed JSON -> 400', mal.status === 400, `status=${mal.status} ${mal.json?.message || ''}`);
  const wrongType = await reg(anon, undefined, { raw: 'firstName=x', headers: { 'Content-Type': 'text/plain' } });
  record('Registration-', 'Wrong Content-Type -> 415', wrongType.status === 415, `status=${wrongType.status}`);
  const wrongMethod = await anon.req('GET', '/api/auth/register');
  record('Registration-', 'GET on register endpoint -> 405', wrongMethod.status === 405, `status=${wrongMethod.status}`);
  const arrBody = await reg(anon, [userA]);
  record('Registration-', 'JSON array instead of object -> 400', arrBody.status === 400, `status=${arrBody.status}`);

  /* ===== Phase 3: registration positive ===== */
  const before = Number(sql('SELECT COUNT(*) FROM users')[0][0]);
  // mass-assignment attempt: extra fields must be ignored
  const rA = await reg(anon, { ...userA, id: 1, passwordHash: 'plain-injected', createdAt: '1999-01-01T00:00:00' });
  record('Registration+', 'Valid registration (user A) -> 201', rA.status === 201 && rA.json?.success === true, `status=${rA.status} ${rA.json?.message || rA.text.slice(0, 120)}`);
  record('Registration+', 'Response contains no password / hash / confirmPassword', noSecrets(rA.text, PW_A));
  record('Registration+', 'Mass-assignment ignored (server-generated id)', rA.json?.user?.id && rA.json.user.id !== 1, `id=${rA.json?.user?.id}`);
  const rowA = sql(`SELECT id, first_name, last_name, date_of_birth, address, phone_number, email, password_hash FROM users WHERE email='${esc(userA.email)}'`);
  record('Registration+', 'Record persisted in MySQL', rowA.length === 1);
  if (rowA.length) {
    const [, fn, ln, dob, addr, ph, em, hash] = rowA[0];
    record('Registration+', 'Stored fields match submitted data', fn === userA.firstName && ln === userA.lastName && dob === userA.dateOfBirth && addr === userA.address && ph === userA.phoneNumber && em === userA.email);
    record('Registration+', 'Password stored as BCrypt hash ($2a$, 60 chars)', /^\$2[aby]\$\d\d\$/.test(hash) && hash.length === 60, hash.slice(0, 7) + '...');
    record('Registration+', 'Plain-text password not stored', hash !== PW_A && !hash.includes(PW_A) && hash !== 'plain-injected');
  }
  const rB = await reg(anon, userB);
  record('Registration+', 'Valid registration (user B) -> 201', rB.status === 201);
  const after = Number(sql('SELECT COUNT(*) FROM users')[0][0]);
  record('Registration+', 'Exactly 2 rows added by this run', after - before === 2, `before=${before} after=${after}`);

  const dup = await reg(anon, userA);
  record('Registration-', 'Duplicate email -> 409', dup.status === 409, `status=${dup.status} ${dup.json?.message || ''}`);
  const dupCase = await reg(anon, { ...userA, email: '  ' + userA.email.toUpperCase() + ' ' });
  record('Registration-', 'Duplicate email (different case + spaces) -> 409', dupCase.status === 409, `status=${dupCase.status}`);
  record('Registration-', 'Still exactly one row for user A', countEmail(userA.email) === 1);

  /* ===== Phase 4: login ===== */
  const login = (c, body) => c.req('POST', '/api/auth/login', { body, csrf: true });
  const genericMsg = [];
  for (const [name, body, exp] of [
    ['Wrong password', { email: userA.email, password: PW_A + 'wrong' }, 401],
    ['Unregistered email', { email: `nobody.${RUN}@example.test`, password: PW_A }, 401],
    ['Empty fields', { email: '', password: '' }, 400],
    ['Missing body fields', {}, 400],
    ['SQL-injection password', { email: userA.email, password: "' OR '1'='1" }, 401],
  ]) {
    const c = new Client(); await c.csrf();
    const r = await login(c, body);
    if (exp === 401) genericMsg.push(r.json?.message);
    record('Login', `${name} -> ${exp}`, r.status === exp && noSecrets(r.text, PW_A), `status=${r.status} ${r.json?.message || ''}`);
    const me = await c.req('GET', '/api/users/me');
    record('Login', `  ...no access to /api/users/me after "${name}"`, me.status === 401, `status=${me.status}`);
  }
  record('Login', 'Wrong-password and unknown-email messages are identical (no enumeration)', genericMsg[0] && genericMsg[0] === genericMsg[1] && genericMsg[1] === genericMsg[2], genericMsg[0]);
  {
    const c = new Client(); await c.csrf();
    const m = await c.req('POST', '/api/auth/login', { raw: '{bad', headers: { 'Content-Type': 'application/json' }, csrf: true });
    record('Login', 'Malformed login JSON -> 400', m.status === 400, `status=${m.status}`);
  }

  // Session fixation: establish a pre-auth session, then log in with it.
  const a = new Client();
  await a.csrf();
  await a.req('GET', '/api/users/me'); // unauthenticated -> may create a session (request cache)
  const preSession = a.jar.get('AUTH_SESSION_ID');
  const okA = await login(a, { email: '  ' + userA.email.toUpperCase(), password: PW_A });
  const sessCookie = okA.setCookies.find(c => c.startsWith('AUTH_SESSION_ID='));
  record('Login', 'Valid login (email case/space-insensitive) -> 200', okA.status === 200 && okA.json?.user?.email === userA.email, `status=${okA.status}`);
  record('Login', 'Login response contains no password / hash', noSecrets(okA.text, PW_A));
  record('Security', 'Session cookie is HttpOnly', !!sessCookie && /httponly/i.test(sessCookie), sessCookie ? sessCookie.replace(/=[^;]+/, '=<redacted>') : 'no Set-Cookie');
  record('Security', 'Session cookie has SameSite attribute', !!sessCookie && /samesite=(lax|strict)/i.test(sessCookie));
  const postSession = a.jar.get('AUTH_SESSION_ID');
  record('Security', 'Session ID rotated on login (session-fixation protection)', !!postSession && postSession !== preSession,
    preSession ? 'pre-auth session existed' : 'no pre-auth session existed');
  if (preSession) {
    const attacker = new Client(); attacker.jar.set('AUTH_SESSION_ID', preSession);
    const r = await attacker.req('GET', '/api/users/me');
    record('Security', 'Pre-login (fixated) session ID cannot access profile', r.status === 401, `status=${r.status}`);
  }

  // Repeated logins
  let repeatedOk = true;
  for (let i = 0; i < 5; i++) { const c = new Client(); await c.csrf(); const r = await login(c, { email: userA.email, password: PW_A }); if (r.status !== 200) repeatedOk = false; }
  for (let i = 0; i < 5; i++) { const c = new Client(); await c.csrf(); const r = await login(c, { email: userA.email, password: 'Wrong!123a' }); if (r.status !== 401) repeatedOk = false; }
  record('Login', '5 valid + 5 invalid repeated logins behave consistently', repeatedOk);
  const meAfterRepeat = await a.req('GET', '/api/users/me');
  record('Login', 'Original session still valid after repeated logins elsewhere', meAfterRepeat.status === 200, `status=${meAfterRepeat.status}`);

  /* ===== Phase 5: dashboard / profile ===== */
  const meA = await a.req('GET', '/api/users/me');
  const u = meA.json?.user || {};
  record('Dashboard', 'GET /api/users/me (user A) -> 200', meA.status === 200);
  record('Dashboard', 'Profile has all 6 required fields with registered values',
    u.firstName === userA.firstName && u.lastName === userA.lastName && u.dateOfBirth === userA.dateOfBirth &&
    u.address === userA.address && u.phoneNumber === userA.phoneNumber && u.email === userA.email);
  record('Dashboard', 'Profile response contains no password / hash', noSecrets(meA.text, PW_A));
  const dbRowA = sql(`SELECT id FROM users WHERE email='${esc(userA.email)}'`)[0][0];
  record('Dashboard', 'Profile id matches MySQL row id', String(u.id) === dbRowA, `api=${u.id} db=${dbRowA}`);

  const b = new Client(); await b.csrf();
  const okB = await login(b, { email: userB.email, password: PW_B });
  const meB = await b.req('GET', '/api/users/me');
  record('Dashboard', 'User B sees only own profile', okB.status === 200 && meB.json?.user?.email === userB.email && !meB.text.includes(userA.email));
  const meA2 = await a.req('GET', '/api/users/me');
  record('Dashboard', 'User A still sees only own profile (sessions isolated)', meA2.json?.user?.email === userA.email && !meA2.text.includes(userB.email));

  // IDOR attempts
  const idB = meB.json?.user?.id;
  const idor1 = await a.req('GET', `/api/users/me?id=${idB}&email=${encodeURIComponent(userB.email)}`);
  record('Dashboard', 'Query params (?id / ?email of user B) ignored -> still user A', idor1.status === 200 && idor1.json?.user?.email === userA.email);
  const idor2 = await a.req('GET', `/api/users/${idB}`);
  record('Dashboard', `GET /api/users/{otherId} does not expose user B (status ${idor2.status})`, idor2.status >= 400 && idor2.status < 500 && !idor2.text.includes(userB.email), `status=${idor2.status}`);
  const idor3 = await a.req('GET', '/api/users');
  record('Dashboard', 'GET /api/users (list) does not expose other users', idor3.status >= 400 && idor3.status < 500 && !idor3.text.includes(userB.email), `status=${idor3.status}`);
  const unknown = await anon.req('GET', '/api/does-not-exist');
  record('Security', 'Unknown endpoint while anonymous -> 401 JSON', unknown.status === 401 && unknown.json?.status === 401, `status=${unknown.status} json=${!!unknown.json}`);
  const meAnon = await new Client().req('GET', '/api/users/me');
  record('Security', 'GET /api/users/me anonymous -> 401 JSON body', meAnon.status === 401 && meAnon.json?.status === 401, `status=${meAnon.status} body=${meAnon.text.slice(0, 60).replace(/\s+/g, ' ')}`);

  /* ===== Phase 6: logout ===== */
  const sessionBeforeLogout = a.jar.get('AUTH_SESSION_ID');
  const noCsrf = await a.req('POST', '/api/auth/logout'); // without X-XSRF-TOKEN header
  record('Logout', 'Logout without CSRF token rejected (403)', noCsrf.status === 403, `status=${noCsrf.status}`);
  const badCsrf = await a.req('POST', '/api/auth/logout', { headers: { 'X-XSRF-TOKEN': 'forged-token' } });
  record('Logout', 'Logout with forged CSRF token rejected (403)', badCsrf.status === 403, `status=${badCsrf.status}`);
  const stillIn = await a.req('GET', '/api/users/me');
  record('Logout', 'Session still valid after rejected logout attempts', stillIn.status === 200);
  const out = await a.req('POST', '/api/auth/logout', { csrf: true });
  record('Logout', 'Logout with valid CSRF token -> 200', out.status === 200 && out.json?.success === true, `status=${out.status}`);
  record('Logout', 'Logout clears AUTH_SESSION_ID cookie (Max-Age=0)', out.setCookies.some(c => c.startsWith('AUTH_SESSION_ID=') && /max-age=0/i.test(c)));
  const replay = new Client(); replay.jar.set('AUTH_SESSION_ID', sessionBeforeLogout);
  const replayRes = await replay.req('GET', '/api/users/me');
  record('Logout', 'Old session cookie replayed after logout -> 401', replayRes.status === 401, `status=${replayRes.status}`);
  const afterOut = await a.req('GET', '/api/users/me');
  record('Logout', 'Protected API after logout -> 401', afterOut.status === 401);
  const meBAfter = await b.req('GET', '/api/users/me');
  record('Logout', "User A's logout does not affect user B's session", meBAfter.status === 200 && meBAfter.json?.user?.email === userB.email);
  await b.csrf();
  await b.req('POST', '/api/auth/logout', { csrf: true });
  const relog = new Client(); await relog.csrf();
  const relogRes = await login(relog, { email: userA.email, password: PW_A });
  record('Logout', 'User can log in again after logout', relogRes.status === 200);
  await relog.req('POST', '/api/auth/logout', { csrf: true });

  /* ===== Through the Vite proxy (what the browser actually uses) ===== */
  try {
    const p = await fetch('http://localhost:3000/api/health');
    record('Integration', 'Vite dev proxy /api -> backend works', p.status === 200, `status=${p.status}`);
  } catch (e) {
    record('Integration', 'Vite dev proxy /api -> backend works', false, 'frontend not running: ' + e.message);
  }

  /* ===== Log scan ===== */
  const logPath = process.env.BACKEND_LOG;
  if (logPath && existsSync(logPath)) {
    const log = readFileSync(logPath, 'utf8');
    record('Security', 'Backend log contains no test passwords or BCrypt hashes', !log.includes(PW_A) && !log.includes(PW_B) && !/\$2[aby]\$\d\d\$/.test(log));
  }

  /* ===== Summary ===== */
  const failed = results.filter(r => !r.pass);
  console.log(`\n==== ${results.length - failed.length}/${results.length} checks passed, ${failed.length} failed ====`);
  for (const f of failed) console.log(`  FAIL [${f.section}] ${f.name}  ${f.detail}`);
  console.log(`Test accounts created this run: ${userA.email}, ${userB.email}`);
  process.exitCode = failed.length ? 1 : 0;
}

main().catch(e => { console.error('Harness error:', e); process.exitCode = 2; });
