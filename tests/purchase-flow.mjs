import { chromium } from 'playwright';
const errors = [];
const b = await chromium.launch({ args:['--enable-unsafe-swiftshader','--no-sandbox'] });
const p = await b.newPage({ viewport:{width:1440,height:950} });
p.on('pageerror', e => errors.push('PAGEERROR: '+e.message.slice(0,200)));
p.on('console', m => { if (m.type()==='error') errors.push(m.text().slice(0,200)); });
const shot = n => p.screenshot({ path:`/home/user/shots/${n}.png` });
const email = `ui${Date.now()}@stashify.dev`;
const log = m => console.log('  ✓ '+m);

console.log('\nFULL PURCHASE FLOW (browser)');
await p.goto('http://127.0.0.1:4000/signup', { waitUntil:'networkidle' });
await p.waitForTimeout(2500);
await p.getByPlaceholder('Your name').fill('Priya Sharma');
await p.getByPlaceholder('you@example.com').fill(email);
await p.getByPlaceholder('98765 43210').fill('9876543210');
await p.getByPlaceholder('••••••••').fill('StrongPass123');
await shot('11-signup');
await p.getByRole('button',{ name:/Create account/ }).click();
await p.waitForTimeout(2500);
log('signup submitted → ' + p.url().split('/').pop().split('?')[0]);

const code = await p.locator('.dev-code b').first().innerText();
await p.locator('.dev-code').first().click();
await p.waitForTimeout(400);
await shot('12-email-otp');
await p.getByRole('button',{ name:/Verify & continue/ }).click();
await p.waitForTimeout(3000);
log(`email OTP ${code} accepted, signed in`);

await p.goto('http://127.0.0.1:4000/product/ember-lamp', { waitUntil:'networkidle' });
await p.waitForTimeout(4000);
await p.locator('.swatch-row .swatch').nth(1).click();   // switch colourway
await p.waitForTimeout(1500);
await shot('13-pdp-colour');
log('colour option selected');
await p.getByRole('button',{ name:'Add to bag' }).first().click();
await p.waitForTimeout(1200);
await p.getByRole('button',{ name:/Checkout →/ }).click();
await p.waitForTimeout(2500);
log('added to bag → checkout');

const inputs = p.locator('.addr-form input');
await inputs.nth(0).fill('Priya Sharma');
await inputs.nth(1).fill('42 Bandra Reclamation');
await inputs.nth(2).fill('Near Sea Link');
await inputs.nth(3).fill('Mumbai');
await inputs.nth(4).fill('Maharashtra');
await inputs.nth(5).fill('400050');
await inputs.nth(6).fill('9876543210');
await p.getByRole('button',{ name:'Save address' }).click();
await p.waitForTimeout(1800);
await shot('14-checkout-address');
await p.getByRole('button',{ name:/Continue to verification/ }).click();
await p.waitForTimeout(1500);
log('address saved');

await p.locator('.phone-row input').fill('9876543210');
await p.getByRole('button',{ name:'Send OTP' }).click();
await p.waitForTimeout(1800);
const sms = await p.locator('.dev-code b').first().innerText();
await p.locator('.dev-code').first().click();
await p.waitForTimeout(400);
await shot('15-phone-otp');
await p.getByRole('button',{ name:/Verify & continue/ }).click();
await p.waitForTimeout(2200);
log(`mobile OTP ${sms} verified`);

await p.getByRole('button',{ name:/Pay ₹/ }).click();
await p.waitForTimeout(2000);
await shot('16-payment-methods');
await p.locator('.modal').getByRole('button',{ name:/Continue →/ }).click();
await p.waitForTimeout(1200);
await shot('17-payment-card');
await p.locator('.modal').getByRole('button',{ name:/^Pay ₹/ }).click();
await p.waitForTimeout(1500);
const bankOtp = await p.locator('.modal .dev-code b').first().innerText();
await p.locator('.modal .dev-code').first().click();
await p.waitForTimeout(500);
await shot('18-bank-otp');
await p.locator('.modal').getByRole('button',{ name:/Authorise payment/ }).click();
await p.waitForTimeout(6000);
log(`bank OTP ${bankOtp} authorised`);

const heading = await p.locator('h1').first().innerText().catch(()=>'(none)');
const orderId = await p.locator('.success-meta b').first().innerText().catch(()=>'(none)');
await shot('19-order-success');
console.log(`  → page heading: "${heading}" | order: ${orderId}`);

await p.goto('http://127.0.0.1:4000/orders', { waitUntil:'networkidle' });
await p.waitForTimeout(3000);
await shot('20-orders');
const rows = await p.locator('.order-card').count();
log(`${rows} order(s) listed`);
await p.locator('.order-card a').last().click();
await p.waitForTimeout(2500);
await shot('21-order-tracking');
log('tracking timeline opened');

console.log('\nConsole errors: '+errors.length);
errors.slice(0,8).forEach(e=>console.log('  ✗ '+e));
await b.close();
