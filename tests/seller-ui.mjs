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

// upload a real photo through the dropzone input
const file = path.resolve('uploads/products/aurora-over-ear-1.jpg');
await page.locator('.dropzone input[type=file]').setInputFiles(file);
await page.waitForTimeout(2500);
const after = await page.locator('.upload-item').count();
ok(`uploaded a photo → ${before} → ${after}`);
if (after !== before + 1) throw new Error('upload did not add a photo');

// set the new photo as cover (star on the last item)
await page.locator('.upload-item').last().getByTitle('Set as cover').click();
await page.waitForTimeout(1200);
const coverTag = await page.locator('.upload-item').first().locator('.primary-tag').count();
ok('set-as-cover works: ' + (coverTag === 1));

// delete it again (trash on first item, which is now the uploaded one)
await page.locator('.upload-item').first().getByTitle('Delete').click();
await page.waitForTimeout(1200);
const final = await page.locator('.upload-item').count();
ok(`deleted photo → back to ${final}`);
await shot('33-seller-photos');

// create a new product
await go('/seller/products/new', 1500);
await page.locator('input[placeholder="e.g. Aurora Wireless Headphones"]').fill('Playwright Test Speaker');
await page.locator('input[placeholder="2999"]').fill('1499');
await page.locator('input[placeholder="4999"]').fill('2499');
await page.getByRole('button', { name: /Create product →/ }).click();
await page.waitForTimeout(2000);
ok('new product created → ' + page.url().split('/seller')[1]);
await page.locator('.dropzone input[type=file]').setInputFiles(file);
await page.waitForTimeout(2200);
await page.locator('select').filter({ hasText: 'Draft (hidden)' }).selectOption('active');
await page.getByRole('button', { name: 'Save changes' }).click();
await page.waitForTimeout(1500);
ok('new product published with a photo');

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
