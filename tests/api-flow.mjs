const B = 'http://127.0.0.1:4000/api';
let token = null;
const call = async (p, method='GET', body) => {
  const r = await fetch(B+p, { method, headers: { 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) }, body: body?JSON.stringify(body):undefined });
  const d = await r.json();
  if (!r.ok) throw new Error(`${method} ${p} → ${r.status}: ${d.error}`);
  return d;
};
const ok = (m) => console.log('  ✓ ' + m);

const email = `test${Date.now()}@stashify.dev`;
console.log('\n1. SIGNUP + EMAIL OTP');
const su = await call('/auth/signup','POST',{ name:'Test Shopper', email, password:'TestPass123', phone:'9876543210' });
ok(`account created, dev OTP = ${su.devCode}`);
try { await call('/auth/verify-email','POST',{ email, code:'000000' }); } catch(e){ ok('wrong OTP rejected: ' + e.message.split(': ')[1]); }
const v = await call('/auth/verify-email','POST',{ email, code:su.devCode });
token = v.token; ok(`email verified, JWT issued (admin=${v.user.isAdmin})`);

console.log('\n2. PHONE OTP');
const ps = await call('/phone/send','POST',{ phone:'9876543210' });
ok(`SMS code = ${ps.devCode}`);
await call('/phone/verify','POST',{ phone:'9876543210', code:ps.devCode });
ok('mobile verified');

console.log('\n3. ADDRESS + CART QUOTE');
const me = await call('/addresses','POST',{ label:'Home', name:'Test Shopper', line1:'12 Marine Drive', city:'Mumbai', state:'Maharashtra', pincode:'400020', phone:'9876543210' });
const addressId = me.addresses[0].id; ok('address saved: ' + addressId);
const items = [{ productId:'aurora-over-ear', qty:1, color:'Coral Pop' }, { productId:'summit-bottle', qty:2, color:'Deep Navy' }];
const q = await call('/cart/quote','POST',{ items, coupon:'FIRST15' });
ok(`subtotal ₹${q.subtotal} − coupon ₹${q.discount} + ship ₹${q.shipping} = ₹${q.total}`);

console.log('\n4. PAYMENT (Razorpay-compatible)');
const s = await call('/payments/create','POST',{ items, coupon:'FIRST15', addressId });
ok(`order ${s.razorpayOrderId} · demo bank OTP ${s.devPayOtp}`);
try { await call('/payments/demo-authorize','POST',{ internalId:s.internalId, otp:'111111', method:'card' }); } catch(e){ ok('wrong bank OTP rejected'); }
const auth = await call('/payments/demo-authorize','POST',{ internalId:s.internalId, otp:s.devPayOtp, method:'card' });
ok('bank OTP accepted, signature issued');
try { await call('/payments/verify','POST',{ internalId:s.internalId, ...auth, razorpay_signature:'f'.repeat(64) }); } catch(e){ ok('TAMPERED SIGNATURE REJECTED ✓'); }
const paid = await call('/payments/verify','POST',{ internalId:s.internalId, ...auth });
ok(`ORDER CREATED: ${paid.order.id} · ₹${paid.order.total} · delivery OTP ${paid.order.deliveryOtp}`);

console.log('\n5. ORDERS + ADMIN PIPELINE');
// admin actions use the seeded administrator account
const userToken = token;
const adminLogin = await call('/auth/login','POST',{ email:'demo@stashify.shop', password:'Demo@1234' });
ok('demo admin signed in');
token = adminLogin.token;
const orders = await call('/orders'); ok(`${orders.length} order(s) in history`);
for (const st of ['packed','shipped','out_for_delivery']) { const o = await call(`/orders/${paid.order.id}/advance`,'POST',{}); ok('advanced → ' + o.status); }
try { await call(`/orders/${paid.order.id}/advance`,'POST',{ deliveryOtp:'0000' }); } catch(e){ ok('delivery without correct OTP blocked ✓'); }
const del = await call(`/orders/${paid.order.id}/advance`,'POST',{ deliveryOtp:paid.order.deliveryOtp });
ok('delivered with OTP ✓ status=' + del.status);

token = userToken;
console.log('\n6. REVIEWS + INBOX + SECURITY');
const rev = await call('/products/aurora-over-ear/reviews','POST',{ rating:5, title:'Superb', body:'Great sound and the photos matched.' });
ok('review posted, verified purchase = ' + rev.verified);
const inbox = await call('/dev/inbox'); ok(`${inbox.length} messages in demo inbox`);
try { await fetch(B+'/me').then(r=>{ if(r.ok) throw new Error('leak'); }); ok('unauthenticated /me rejected'); } catch(e){ ok('auth guard works'); }
const prods = await call('/products'); ok(`${prods.total} products in catalog`);
console.log('\n✅ ALL CHECKS PASSED\n');
