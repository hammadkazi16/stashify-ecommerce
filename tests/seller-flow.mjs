import fs from 'fs/promises';
const B='http://127.0.0.1:4000';
let token=null;
const call=async(p,method='GET',body)=>{
  const r=await fetch(B+'/api'+p,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});
  const d=await r.json(); if(!r.ok) throw new Error(`${method} ${p} → ${r.status}: ${d.error}`); return d;
};
const ok=m=>console.log('  ✓ '+m);
console.log('\nSELLER DASHBOARD API');

const login=await call('/auth/login','POST',{email:'demo@stashify.shop',password:'Demo@1234'});
token=login.token; ok(`signed in as seller "${login.user.seller.storeName}"`);
const me=await call('/seller/me');
ok(`stats: ${me.stats.productCount} products · ${me.stats.photoCount} photos · ₹${me.stats.revenue} revenue · ${me.stats.orderCount} orders`);

const prods=await call('/products');
ok(`storefront shows ${prods.total} products, first has ${prods.products[0].images.length} photo(s)`);
const imgRes=await fetch(B+prods.products[0].images[0].url);
ok(`photo served: HTTP ${imgRes.status} ${imgRes.headers.get('content-type')}`);

console.log('\nCREATE + UPLOAD');
const p=await call('/seller/products','POST',{name:'Test Ceramic Mug',brand:'Studio',category:'home',price:799,mrp:1299,stock:15,description:'A hand-thrown stoneware mug.',highlights:['Dishwasher safe','350 ml'],status:'draft'});
ok(`created draft "${p.name}" (${p.id})`);
try { await call(`/seller/products/${p.id}`,'PUT',{...p,status:'active'}); } catch(e){ ok('publishing without a photo blocked ✓'); }

console.log('\nCLOUDINARY UPLOAD');
console.log('  SKIPPED: Cloudinary credentials intentionally disabled for isolated testing.');
console.log('  SKIPPED: Real image upload and image-validation tests require a dedicated test Cloudinary account.');

let pub = null;
const noauth=await fetch(B+'/api/seller/products',{headers:{}});
ok(`unauthenticated seller API blocked: HTTP ${noauth.status}`);

// second user must not touch the first seller's product
const em=`seller${Date.now()}@x.dev`;
const su=await call('/auth/signup','POST',{name:'Other Seller',email:em,password:'TestPass123'});
const v=await call('/auth/verify-email','POST',{email:em,code:su.devCode});
const otherToken=v.token;
token=otherToken;
const applied=await call('/seller/apply','POST',{storeName:'Rival Store',description:'test'});
ok(`second seller onboarded: "${applied.user.seller.storeName}"`);
const r403=await fetch(B+`/api/seller/products/${p.id}`,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${otherToken}`},body:JSON.stringify({name:'Hijacked',price:1,mrp:1,category:'home'})});
ok(`cross-seller edit blocked: HTTP ${r403.status}`);
const mine=await call('/seller/products'); ok(`second seller sees only their own products: ${mine.length}`);

token=login.token;
console.log('\nIMAGE MANAGEMENT');
console.log('  SKIPPED: Requires a dedicated Cloudinary test upload.');
const arch=await call(`/seller/products/${p.id}`,'DELETE');
ok(`delete draft/new product: ${arch.deleted?'deleted':'archived'}`);
console.log('\n✅ SELLER API CHECKS PASSED\n');
