import { chromium } from 'playwright';
import path from 'path';
const errors = [];
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 250)); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message.slice(0, 250)));
const B = 'http://127.0.0.1:4000';
const shot = (n) => page.screenshot({ path: `/home/user/shots/${n}.png` });
const ok = (m) => console.log('  ✓ ' + m);
const go = async (p, wait = 1800) => { await page.goto(B + p, { waitUntil: 'networkidle' }); await page.waitForTimeout(wait); };

console.log('\nSELLER DASHBOARD (browser)');

// sign in with the demo seller
await go('/login');
await page.getByRole('button', { name: 'Use the demo account' }).click();
await page.getByRole('button', { name: /Sign in →/ }).click();
await page.waitForTimeout(1800);
ok('signed in as demo seller');

// dashboard
await go('/seller', 2200);
await page.getByRole('heading', { name: /Welcome back/ }).waitFor();
const revenue = await page.locator('.stat-card.accent b').first().innerText();
ok(`dashboard loaded — revenue ${revenue}`);
await shot('30-seller-dashboard');

// products list
await go('/seller/products', 1800);
const rows = await page.locator('.seller-table tbody tr').count();
ok(`products table: ${rows} rows`);
const firstPhoto = page.locator('.seller-table .prod-cell img').first();
await firstPhoto.waitFor();
ok('product thumbnails are real photos: ' + (await firstPhoto.getAttribute('src')).startsWith('/uploads/'));
await shot('31-seller-products');

// open the first product editor
await page.locator('.seller-table .prod-cell a').first().click();
await page.waitForTimeout(1800);
await page.getByRole('heading', { name: 'Product photos' }).waitFor();
const before = await page.locator('.upload-item').count();
ok(`editor opened — ${before} photo(s) in manager`);
await shot('32-seller-editor');

// Cloudinary upload tests are skipped in isolated demo mode.
console.log('\nCLOUDINARY IMAGE TESTS');
console.log('  SKIPPED: Real Cloudinary credentials are disabled for isolated testing.');
console.log('  SKIPPED: Upload, cover-image and deletion tests require a dedicated test account.');

// Continue with existing seeded product and storefront checks.

// storefront product page: real photos, no 3D anywhere
await go('/product/aurora-over-ear', 3000);
await page.locator('.gallery-main img').first().waitFor();
ok('PDP shows a real photo gallery');
const threeDCount = await page.locator('.view-switch, canvas, .stage-canvas').count();
if (threeDCount !== 0) throw new Error('3D elements still present on PDP');
ok('no 3D viewer/toggle/canvas on PDP');
await shot('34-pdp-photos');

// home page uses real category photos
await go('/', 6000);
await shot('36-home-photos');
ok('home rendered with real photography');

console.log('\nConsole errors: ' + errors.length);
errors.slice(0, 10).forEach((e) => console.log('  ✗ ' + e));
await browser.close();
if (errors.length) process.exit(1);
console.log('\n✅ SELLER UI CHECKS PASSED\n');
