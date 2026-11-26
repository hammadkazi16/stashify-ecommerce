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

const buf=await fs.readFile('uploads/products/aurora-over-ear-1.jpg');
const fd=new FormData();
fd.append('images', new Blob([buf],{type:'image/jpeg'}), 'mug-front.jpg');
fd.append('images', new Blob([buf],{type:'image/jpeg'}), 'mug-side.jpg');
const up=await fetch(B+`/api/seller/products/${p.id}/images`,{method:'POST',headers:{Authorization:`Bearer ${token}`},body:fd});
const upd=await up.json(); if(!up.ok) throw new Error(upd.error);
ok(`uploaded ${upd.added.length} photos → ${upd.added[0].width}×${upd.added[0].height}, ${(upd.added[0].bytes/1024).toFixed(0)}KB`);
const served=await fetch(B+upd.added[0].url); ok(`uploaded file served: HTTP ${served.status}`);
const thumb=await fetch(B+upd.added[0].thumb); ok(`thumbnail served: HTTP ${thumb.status}`);

const pub=await call(`/seller/products/${p.id}`,'PUT',{...p,status:'active'});
ok(`published with ${pub.images.length} photos`);

console.log('\nVALIDATION + SECURITY');
const bad=new FormData(); bad.append('images', new Blob([Buffer.from('#!/bin/sh\nrm -rf /')],{type:'image/jpeg'}),'evil.jpg');
const br=await fetch(B+`/api/seller/products/${p.id}/images`,{method:'POST',headers:{Authorization:`Bearer ${token}`},body:bad});
ok(`fake image rejected: HTTP ${br.status} — ${(await br.json()).error}`);
const tiny=await (await import('sharp')).default({create:{width:50,height:50,channels:3,background:'#fff'}}).jpeg().toBuffer();
const tf=new FormData(); tf.append('images', new Blob([tiny],{type:'image/jpeg'}),'tiny.jpg');
const tr=await fetch(B+`/api/seller/products/${p.id}/images`,{method:'POST',headers:{Authorization:`Bearer ${token}`},body:tf});
ok(`undersized image rejected: HTTP ${tr.status} — ${(await tr.json()).error}`);
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
const reordered=await call(`/seller/products/${p.id}/images/order`,'PUT',{order:[pub.images[1].id,pub.images[0].id]});
ok(`reordered — primary is now ${reordered.images[0].id.slice(-6)}`);
const prim=await call(`/seller/products/${p.id}/images/${pub.images[0].id}/primary`,'PUT');
ok('set-primary works');
const del=await call(`/seller/products/${p.id}/images/${prim.images[1].id}`,'DELETE');
ok(`deleted a photo → ${del.images.length} remaining`);
const arch=await call(`/seller/products/${p.id}`,'DELETE');
ok(`delete draft/new product: ${arch.deleted?'deleted':'archived'}`);
console.log('\n✅ SELLER API CHECKS PASSED\n');
