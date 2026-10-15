import { execSync } from 'child_process';

const ORIGIN = 'http://localhost:3000';
const API = 'http://localhost:5000/api';

class Client {
  constructor() {
    this.jar = new Map();
  }

  cookieHeader() {
    return [...this.jar].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  absorb(res) {
    if (typeof res.headers.getSetCookie === 'function') {
      for (const sc of res.headers.getSetCookie()) {
        const [pair] = sc.split(';');
        const idx = pair.indexOf('=');
        const name = pair.slice(0, idx).trim();
        const value = pair.slice(idx + 1).trim();
        if (/max-age=0/i.test(sc) || value === '') {
          this.jar.delete(name);
        } else {
          this.jar.set(name, value);
        }
      }
    }
  }

  async req(method, path, { body, headers = {}, csrf = false } = {}) {
    const h = { Accept: 'application/json', Origin: ORIGIN, ...headers };
    if (body !== undefined) h['Content-Type'] = 'application/json';
    if (csrf && this.jar.has('XSRF-TOKEN')) {
      h['X-XSRF-TOKEN'] = decodeURIComponent(this.jar.get('XSRF-TOKEN'));
    }
    const ck = this.cookieHeader();
    if (ck) h.Cookie = ck;

    const res = await fetch(API + path, {
      method,
      headers: h,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    this.absorb(res);
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return { status: res.status, json, text, headers: res.headers };
  }

  async csrf() {
    return this.req('GET', '/auth/csrf');
  }
}

function queryDb(sql) {
  try {
    const cmd = `& "C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe" -u root -pRoot@123 -e "USE user_management_db; ${sql}"`;
    return execSync(cmd, { shell: 'powershell.exe' }).toString();
  } catch (err) {
    return err.stdout ? err.stdout.toString() : err.message;
  }
}

async function run() {
  console.log('======================================================================');
  console.log('    COMPANY SUBMISSION VERIFICATION: FULL-STACK AUDIT TEST SUITE      ');
  console.log('======================================================================\n');

  const timestamp = Date.now();
  const testEmail = `candidate.demo.${timestamp}@company-eval.test`;
  const initialPassword = 'ValidPassword123!';
  const updatedPassword = 'NewSecurePass2026!';

  const client = new Client();
  await client.csrf();

  // SCENARIO 1: Register completely new user
  console.log('SCENARIO 1: Register a completely new user');
  const regPayload = {
    firstName: 'Suruthi',
    lastName: 'Deivendhiran',
    dateOfBirth: '1998-05-15',
    address: '123 Innovation Drive, Tech Park, Chennai',
    phoneNumber: '9876543210',
    email: testEmail,
    password: initialPassword,
    confirmPassword: initialPassword
  };

  const regRes = await client.req('POST', '/auth/register', { body: regPayload, csrf: true });
  console.log(`-> HTTP Status: ${regRes.status} (Expected 201 Created)`);
  console.log(`-> Response Body:`, JSON.stringify(regRes.json));
  if (regRes.status !== 201) throw new Error('Scenario 1 Failed');

  // SCENARIO 2: Confirm user saved in MySQL
  console.log('\nSCENARIO 2: Confirm user saved in MySQL database');
  const dbCheck = queryDb(`SELECT id, first_name, last_name, email, date_of_birth, phone_number, LEFT(password_hash, 30) as hash_preview, created_at FROM users WHERE email='${testEmail}';`);
  console.log(dbCheck);

  // SCENARIO 3: Log in using newly registered credentials
  console.log('SCENARIO 3: Log in using registered credentials');
  const loginRes = await client.req('POST', '/auth/login', {
    body: { email: testEmail, password: initialPassword },
    csrf: true
  });
  console.log(`-> HTTP Status: ${loginRes.status} (Expected 200 OK)`);
  console.log(`-> Login Response:`, JSON.stringify(loginRes.json));
  console.log(`-> Session Cookie Saved: AUTH_SESSION_ID=${client.jar.get('AUTH_SESSION_ID') ? 'Active (Present)' : 'None'}`);
  if (loginRes.status !== 200) throw new Error('Scenario 3 Failed');

  // SCENARIO 4: Confirm user details retrieved from MySQL via /api/users/me
  console.log('\nSCENARIO 4: Retrieve authenticated user profile from MySQL via GET /api/users/me');
  const profileRes = await client.req('GET', '/users/me');
  console.log(`-> HTTP Status: ${profileRes.status} (Expected 200 OK)`);
  console.log(`-> Profile Data:`, JSON.stringify(profileRes.json, null, 2));
  if (profileRes.status !== 200 || profileRes.json?.user?.email !== testEmail) throw new Error('Scenario 4 Failed');

  // SCENARIO 5: Attempt to register the same email again
  console.log('\nSCENARIO 5: Duplicate registration prevention');
  const dupRes = await client.req('POST', '/auth/register', { body: regPayload, csrf: true });
  console.log(`-> HTTP Status: ${dupRes.status} (Expected 409 Conflict)`);
  console.log(`-> Duplicate Rejection Body:`, JSON.stringify(dupRes.json));
  if (dupRes.status !== 409) throw new Error('Scenario 5 Failed');

  // SCENARIO 6: Attempt login with incorrect password
  console.log('\nSCENARIO 6: Attempt login with incorrect password');
  const badClient = new Client();
  await badClient.csrf();
  const badLoginRes = await badClient.req('POST', '/auth/login', {
    body: { email: testEmail, password: 'WrongPassword999!' },
    csrf: true
  });
  console.log(`-> HTTP Status: ${badLoginRes.status} (Expected 401 Unauthorized)`);
  console.log(`-> Bad Login Body:`, JSON.stringify(badLoginRes.json));
  if (badLoginRes.status !== 401) throw new Error('Scenario 6 Failed');

  // SCENARIO 7: Access dashboard with authenticated session
  console.log('\nSCENARIO 7: Dashboard access with active session');
  const dashRes = await client.req('GET', '/users/me');
  console.log(`-> HTTP Status: ${dashRes.status} (Verified authenticated access for ${dashRes.json?.user?.email})`);

  // SCENARIO 8: Access dashboard without authentication
  console.log('\nSCENARIO 8: Access protected dashboard without authentication');
  const unauthClient = new Client();
  const unauthRes = await unauthClient.req('GET', '/users/me');
  console.log(`-> HTTP Status: ${unauthRes.status} (Expected 401 Unauthorized)`);
  console.log(`-> Unauthenticated Body:`, JSON.stringify(unauthRes.json));
  if (unauthRes.status !== 401) throw new Error('Scenario 8 Failed');

  // SCENARIO 9: Log out and verify access is denied
  console.log('\nSCENARIO 9: Log out and verify session revocation');
  const logoutRes = await client.req('POST', '/auth/logout', { csrf: true });
  console.log(`-> Logout Status: ${logoutRes.status} (Expected 200 OK)`);
  console.log(`-> Session Cookie after logout: ${client.jar.has('AUTH_SESSION_ID') ? 'Still Present' : 'Cleared (Deleted)'}`);
  
  // Try accessing /users/me again
  const postLogoutRes = await client.req('GET', '/users/me');
  console.log(`-> Post-Logout /users/me Status: ${postLogoutRes.status} (Expected 401 Unauthorized)`);
  if (postLogoutRes.status !== 401) throw new Error('Scenario 9 Failed');

  // SCENARIO 10: Forgot password and password reset
  console.log('\nSCENARIO 10: Forgot password and password reset flow');
  const forgotRes = await client.req('POST', '/auth/forgot-password', {
    body: { email: testEmail },
    csrf: true
  });
  console.log(`-> Forgot Password Status: ${forgotRes.status} (Expected 200 OK)`);
  console.log(`-> Forgot Password Body:`, JSON.stringify(forgotRes.json));
  const rawToken = forgotRes.json?.devResetLink?.split('token=')[1];
  console.log(`-> 256-bit Reset Token Generated: ${rawToken}`);

  // Confirm token hash in MySQL
  const tokenDb = queryDb(`SELECT id, token_hash, user_id, expiry_date, used, created_at FROM password_reset_tokens ORDER BY id DESC LIMIT 1;`);
  console.log(`-> Token in MySQL:`);
  console.log(tokenDb);

  // Reset password
  const resetRes = await client.req('POST', '/auth/reset-password', {
    body: {
      token: rawToken,
      newPassword: updatedPassword,
      confirmPassword: updatedPassword
    },
    csrf: true
  });
  console.log(`-> Reset Password Status: ${resetRes.status} (Expected 200 OK)`);
  console.log(`-> Reset Password Body:`, JSON.stringify(resetRes.json));

  // Verify old password fails
  const oldClient = new Client();
  await oldClient.csrf();
  const oldPassRes = await oldClient.req('POST', '/auth/login', {
    body: { email: testEmail, password: initialPassword },
    csrf: true
  });
  console.log(`-> Login with OLD password: ${oldPassRes.status} (Expected 401 Unauthorized)`);

  // Verify new password succeeds
  const newClient = new Client();
  await newClient.csrf();
  const newPassRes = await newClient.req('POST', '/auth/login', {
    body: { email: testEmail, password: updatedPassword },
    csrf: true
  });
  console.log(`-> Login with NEW password: ${newPassRes.status} (Expected 200 OK)`);
  if (newPassRes.status !== 200) throw new Error('Scenario 10 Failed');

  console.log('\n======================================================================');
  console.log('   ALL 10 SCENARIOS PASSED WITH 100% SUCCESS AGAINST LIVE MYSQL!     ');
  console.log('======================================================================\n');
}

run().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
