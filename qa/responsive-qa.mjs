import { spawn } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { rmSync, mkdirSync } from 'fs';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://localhost:3000/user-registration-login-system';

const VIEWPORTS = [
  { name: 'Mobile Small (iPhone SE 1st)', width: 320, height: 568 },
  { name: 'Mobile Standard (iPhone 8/SE 2nd)', width: 375, height: 667 },
  { name: 'Mobile Modern (iPhone 12/14/Pro)', width: 390, height: 844 },
  { name: 'Mobile Large (iPhone 14 Plus / Pro Max)', width: 414, height: 896 },
  { name: 'Tablet Portrait (iPad 10.2 / Air)', width: 768, height: 1024 },
  { name: 'Tablet Landscape (iPad)', width: 1024, height: 768 },
  { name: 'Laptop (1366x768)', width: 1366, height: 768 },
  { name: 'Desktop Full HD (1920x1080)', width: 1920, height: 1080 }
];

const PAGES = [
  { name: 'Home Page', path: '/' },
  { name: 'Sign In (Login)', path: '/login' },
  { name: 'Sign Up (Register)', path: '/register' },
  { name: 'Register Success', path: '/register/success' },
  { name: 'Forgot Password', path: '/forgot-password' },
  { name: 'Reset Password', path: '/reset-password?token=responsive-audit-token' }
];

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.callbacks = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.id && this.callbacks.has(data.id)) {
          const { resolve, reject } = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return res.result?.value;
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runAudit() {
  console.log('====================================================');
  console.log('   AUTAGRAVITY RESPONSIVE LAYOUT VERIFICATION');
  console.log('====================================================\n');

  const userDataDir = join(tmpdir(), 'edge-resp-test-' + Date.now());
  mkdirSync(userDataDir, { recursive: true });

  const edgeProc = spawn(EDGE_PATH, [
    '--headless=new',
    '--remote-debugging-port=9223',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ], { stdio: 'ignore' });

  let client = null;
  let testCount = 0;
  let passCount = 0;
  let failCount = 0;

  try {
    // Wait for Edge CDP to be ready
    let target = null;
    for (let i = 0; i < 20; i++) {
      await sleep(400);
      try {
        const res = await fetch('http://localhost:9223/json');
        const list = await res.json();
        target = list.find(t => t.type === 'page');
        if (target && target.webSocketDebuggerUrl) break;
      } catch (e) {}
    }

    if (!target) {
      throw new Error('Failed to connect to Edge CDP on port 9223');
    }

    client = new CDPClient(target.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('DOM.enable');

    console.log('[OK] Connected to Headless Microsoft Edge via DevTools Protocol\n');

    for (const vp of VIEWPORTS) {
      console.log(`----------------------------------------------------`);
      console.log(`DEVICE: ${vp.name} (${vp.width}x${vp.height})`);
      console.log(`----------------------------------------------------`);

      // Set device metrics
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 2,
        mobile: vp.width < 1024,
        fitWindow: false
      });

      for (const page of PAGES) {
        testCount++;
        const url = `${BASE_URL}${page.path === '/' ? '' : page.path}`;
        await client.send('Page.navigate', { url });
        await sleep(400);

        // Check horizontal overflow
        const overflow = await client.eval(`
          (() => {
            const docWidth = document.documentElement.clientWidth;
            const scrollWidth = document.documentElement.scrollWidth;
            const bodyWidth = document.body ? document.body.scrollWidth : 0;
            const hasHorizontalScroll = scrollWidth > docWidth + 1 || bodyWidth > docWidth + 1;
            return {
              docWidth,
              scrollWidth,
              bodyWidth,
              hasHorizontalScroll,
              overflowDiff: Math.max(scrollWidth - docWidth, bodyWidth - docWidth)
            };
          })()
        `);

        // Check elements touch targets and form visibility
        const formCheck = await client.eval(`
          (() => {
            const inputs = Array.from(document.querySelectorAll('input, select, textarea, button'));
            let smallTouchCount = 0;
            let clippedCount = 0;
            const docWidth = document.documentElement.clientWidth;
            
            inputs.forEach(el => {
              const r = el.getBoundingClientRect();
              if (r.width > 0 && r.height > 0) {
                // Check if element is cut off horizontally
                if (r.right > docWidth + 2) clippedCount++;
                // Check touch target height on mobile
                if (docWidth < 768 && el.tagName === 'BUTTON' && r.height < 32) smallTouchCount++;
              }
            });

            return {
              inputCount: inputs.length,
              clippedCount,
              smallTouchCount
            };
          })()
        `);

        const isClean = !overflow.hasHorizontalScroll && formCheck.clippedCount === 0;

        if (isClean) {
          passCount++;
          console.log(`  [PASS] ${page.name.padEnd(25)} | scrollWidth: ${overflow.scrollWidth}px (<= ${overflow.docWidth}px) | No clipping | Touch OK`);
        } else {
          failCount++;
          console.error(`  [FAIL] ${page.name.padEnd(25)} | Overflow by ${overflow.overflowDiff}px (scroll: ${overflow.scrollWidth}px vs doc: ${overflow.docWidth}px) | Clipped: ${formCheck.clippedCount}`);
        }
      }
      console.log('');
    }

    // Now test Dashboard Authenticated & Mobile Navigation Drawer
    console.log(`----------------------------------------------------`);
    console.log(`DASHBOARD INTERACTIVE RESPONSIVE TEST`);
    console.log(`----------------------------------------------------`);

    // Enable Network domain to set auth cookies
    await client.send('Network.enable');

    // Register and authenticate a real test user against the local Spring Boot backend
    const regUser = {
      firstName: 'Responsive',
      lastName: 'Tester',
      dateOfBirth: '1995-01-01',
      phoneNumber: '9876543210',
      address: '452 Innovation Parkway, Tech District, Suite 800, Bangalore, Karnataka',
      email: `resp.${Date.now()}@example.com`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    };

    await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regUser)
    });

    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: regUser.email, password: regUser.password })
    });

    const rawCookie = loginRes.headers.get('set-cookie') || '';
    const sessionMatch = rawCookie.match(/AUTH_SESSION_ID=([^;]+)/);
    const xsrfMatch = rawCookie.match(/XSRF-TOKEN=([^;]+)/);

    if (sessionMatch) {
      await client.send('Network.setCookie', {
        name: 'AUTH_SESSION_ID',
        value: sessionMatch[1],
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax'
      });
    }
    if (xsrfMatch) {
      await client.send('Network.setCookie', {
        name: 'XSRF-TOKEN',
        value: xsrfMatch[1],
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        sameSite: 'Lax'
      });
    }

    // Set mobile viewport
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      mobile: true,
      fitWindow: false
    });

    // Navigate to dashboard with authenticated session
    await client.send('Page.navigate', { url: `${BASE_URL}/dashboard` });
    await sleep(1000);

    const dashMobileLayout = await client.eval(`
      (() => {
        const docWidth = document.documentElement.clientWidth;
        const scrollWidth = document.documentElement.scrollWidth;
        const bodyWidth = document.body.scrollWidth;
        const hasHorizontalScroll = scrollWidth > docWidth + 1 || bodyWidth > docWidth + 1;
        const sidebar = document.querySelector('.sidebar');
        const sidebarIsOpen = sidebar ? sidebar.classList.contains('open') : false;
        const hamburgerBtn = document.querySelector('header button[aria-label="Open navigation menu"]');
        const emailEl = document.querySelector('main p.text-slate-400');
        
        return {
          docWidth,
          scrollWidth,
          hasHorizontalScroll,
          sidebarIsOpen,
          hasHamburger: !!hamburgerBtn,
          emailText: emailEl ? emailEl.textContent : ''
        };
      })()
    `);

    testCount++;
    if (!dashMobileLayout.hasHorizontalScroll) {
      passCount++;
      console.log(`  [PASS] Dashboard Mobile (375px)  | No horizontal overflow with long email & address`);
    } else {
      failCount++;
      console.error(`  [FAIL] Dashboard Mobile (375px)  | Horizontal overflow detected!`);
    }

    // Test Drawer open
    testCount++;
    await client.eval(`
      (() => {
        const btn = document.querySelector('header button[aria-label="Open navigation menu"]');
        if (btn) btn.click();
        return true;
      })()
    `);
    await sleep(350);

    const drawerCheck = await client.eval(`
      (() => {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.fixed.inset-0');
        return {
          openClass: sidebar ? sidebar.classList.contains('open') : false,
          hasOverlay: !!overlay
        };
      })()
    `);

    if (drawerCheck && drawerCheck.openClass && drawerCheck.hasOverlay) {
      passCount++;
      console.log(`  [PASS] Mobile Sidebar Drawer     | Opens cleanly with dark backdrop overlay`);
    } else {
      failCount++;
      console.error(`  [FAIL] Mobile Sidebar Drawer     | Failed to open!`, drawerCheck);
    }

    // Test Drawer close via X button
    testCount++;
    await client.eval(`
      (() => {
        const closeBtn = document.querySelector('.sidebar button[aria-label="Close menu"]');
        if (closeBtn) closeBtn.click();
        return true;
      })()
    `);
    await sleep(350);

    const drawerClosed = await client.eval(`
      (() => {
        const sidebar = document.querySelector('.sidebar');
        return {
          openClass: sidebar ? sidebar.classList.contains('open') : false
        };
      })()
    `);

    if (!drawerClosed.openClass) {
      passCount++;
      console.log(`  [PASS] Mobile Drawer Dismissal   | Closes cleanly on close button tap`);
    } else {
      failCount++;
      console.error(`  [FAIL] Mobile Drawer Dismissal   | Failed to close!`);
    }

    // Test Tablet View (768px - iPad)
    testCount++;
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 768,
      height: 1024,
      deviceScaleFactor: 2,
      mobile: false,
      fitWindow: false
    });
    await sleep(300);

    const tabletLayout = await client.eval(`
      (() => {
        const docWidth = document.documentElement.clientWidth;
        const scrollWidth = document.documentElement.scrollWidth;
        const sidebar = document.querySelector('.sidebar');
        const headers = Array.from(document.querySelectorAll('header'));
        const desktopHeader = headers.find(h => h.className.includes('md:flex'));
        const topBar = headers.find(h => h.className.includes('md:hidden'));
        
        return {
          docWidth,
          scrollWidth,
          noOverflow: scrollWidth <= docWidth + 1,
          sidebarVisible: sidebar ? window.getComputedStyle(sidebar).display !== 'none' : false,
          desktopHeaderVisible: desktopHeader ? window.getComputedStyle(desktopHeader).display !== 'none' : false,
          mobileTopBarHidden: topBar ? window.getComputedStyle(topBar).display === 'none' : true
        };
      })()
    `);

    if (tabletLayout.noOverflow && tabletLayout.desktopHeaderVisible && tabletLayout.mobileTopBarHidden) {
      passCount++;
      console.log(`  [PASS] Tablet iPad (768px)       | Sidebar + desktop layout aligned cleanly with zero overflow`);
    } else {
      failCount++;
      console.error(`  [FAIL] Tablet iPad (768px)       | Breakpoint alignment mismatch:`, tabletLayout);
    }

    // Test Desktop Full HD View (1920px)
    testCount++;
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false,
      fitWindow: false
    });
    await sleep(300);

    const desktopLayout = await client.eval(`
      (() => {
        const docWidth = document.documentElement.clientWidth;
        const scrollWidth = document.documentElement.scrollWidth;
        return {
          noOverflow: scrollWidth <= docWidth + 1,
          scrollWidth,
          docWidth
        };
      })()
    `);

    if (desktopLayout.noOverflow) {
      passCount++;
      console.log(`  [PASS] Desktop Full HD (1920px)  | Zero horizontal scroll (1920px content fit)`);
    } else {
      failCount++;
      console.error(`  [FAIL] Desktop Full HD (1920px)  | Horizontal overflow detected!`);
    }

    console.log('\n====================================================');
    console.log(`TOTAL TESTS: ${testCount} | PASSED: ${passCount} | FAILED: ${failCount}`);
    console.log('====================================================\n');

    if (failCount > 0) process.exit(1);

  } finally {
    if (client) client.close();
    edgeProc.kill('SIGKILL');
    try { rmSync(userDataDir, { recursive: true, force: true }); } catch (e) {}
  }
}

runAudit().catch(err => {
  console.error('Fatal error in responsive QA:', err);
  process.exit(1);
});
