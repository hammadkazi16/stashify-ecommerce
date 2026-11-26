import { chromium } from 'playwright';
const errors = [], warnings = [];
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 1 });
page.on('console', m => { if (m.type()==='error') errors.push(m.text().slice(0,300)); if (m.type()==='warning') warnings.push(m.text().slice(0,160)); });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message.slice(0,300)));
const go = async (path, name, wait=2600) => {
  await page.goto('http://127.0.0.1:4000'+path, { waitUntil:'networkidle' });
  await page.waitForTimeout(wait);
  await page.screenshot({ path:`/home/user/shots/${name}.png` });
  const h = await page.evaluate(() => document.body.innerText.length);
  console.log(`  ${name.padEnd(14)} text=${h} chars`);
};
console.log('\nRendering pages:');
await go('/', '01-home', 9000);
await go('/shop', '02-shop', 8000);
await go('/product/aurora-over-ear', '03-product', 7000);
await go('/product/stride-sneaker', '04-sneaker', 3000);
await go('/login', '05-login');
await go('/cart', '06-cart');
// interaction: add to cart from PDP then open drawer
await page.goto('http://127.0.0.1:4000/product/ember-lamp', { waitUntil:'networkidle' });
await page.waitForTimeout(2500);
await page.getByRole('button', { name:'Add to bag' }).first().click();
await page.waitForTimeout(1200);
await page.screenshot({ path:'/home/user/shots/07-cartdrawer.png' });
console.log('  cart drawer    opened');
await page.goto('http://127.0.0.1:4000/checkout', { waitUntil:'networkidle' });
await page.waitForTimeout(1800);
await page.screenshot({ path:'/home/user/shots/08-checkout-gate.png' });
// mobile
await page.setViewportSize({ width: 390, height: 844 });
await go('/', '09-mobile-home', 3500);
await go('/product/nova-phone', '10-mobile-pdp', 3000);
console.log('\nConsole errors: ' + errors.length);
errors.slice(0,12).forEach(e => console.log('  ✗ ' + e));
console.log('Warnings: ' + warnings.length);
[...new Set(warnings)].slice(0,5).forEach(w => console.log('  ! ' + w));
await browser.close();
