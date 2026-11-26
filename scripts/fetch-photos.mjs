/**
 * Downloads free-licence product photography (Pexels / Unsplash) into
 * uploads/products and writes server/photo-credits.json for attribution.
 *
 * Run once:  node scripts/fetch-photos.mjs
 * Sellers can replace any of these with their own uploads from the dashboard.
 */
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const OUT = path.resolve('uploads/products');
await fs.mkdir(OUT, { recursive: true });

const px = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1200`;
const un = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

// productId -> source photo ids (first = primary)
const MAP = {
  'aurora-over-ear':   [{ p: 3394652 }],
  'pebble-buds':       [{ u: 'photo-1525825691042-e14d9042fc70' }, { u: 'photo-1756902368926-eb9e5e9d2a69' }],
  'monolith-speaker':  [{ p: 6322724 }, { p: 374110 }],
  'nova-phone':        [{ p: 12882909 }, { p: 8408534 }],
  'slate-tablet':      [{ p: 17036304 }, { p: 30693629 }],
  'lumen-laptop':      [{ p: 196658 }, { p: 16114809 }],
  'orbit-watch':       [{ p: 11700618 }, { u: 'photo-1551816230-ef5deaed4a26' }],
  'halo-ring':         [{ p: 1653227 }, { p: 4621121 }],
  'vector-controller': [{ p: 4497076 }, { p: 27424788 }],
  'keystone-keyboard': [{ p: 5944189 }, { p: 3812048 }],
  'glide-mouse':       [{ p: 11889663 }, { p: 7265960 }],
  'vista-monitor':     [{ p: 13620268 }, { p: 17136611 }],
  'ember-lamp':        [{ p: 1112598 }, { p: 1122530 }],
  'drift-chair':       [{ p: 12277130 }, { p: 30183860 }],
  'terra-planter':     [{ p: 8790102 }, { p: 7695033 }],
  'stride-sneaker':    [{ p: 9660927 }, { p: 10497369 }],
  'atlas-backpack':    [{ p: 8266907 }, { p: 8607514 }],
  'eclipse-shades':    [{ p: 8360292 }, { p: 31259697 }],
  'summit-bottle':     [{ p: 1188649 }, { p: 7565797 }],
  'core-mat':          [{ p: 6193710 }, { p: 6193712 }],
  'pulse-dumbbell':    [{ p: 4164766 }, { p: 8933589 }],
  'sable-perfume':     [{ p: 1961789 }],
  'ritual-serum':      [{ p: 13573724 }, { p: 6847858 }],
  'nomad-camera':      [{ p: 11486464 }, { p: 7789074 }]
};

const credits = [];
let ok = 0, fail = 0;

async function grab(productId, src, index) {
  const url = src.p ? px(src.p) : un(src.u);
  const base = `${productId}-${index + 1}`;
  const file = path.join(OUT, `${base}.jpg`);
  const thumb = path.join(OUT, `${base}-thumb.jpg`);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    // Normalise: fit inside 1200px square on a soft cream canvas, no upscaling.
    await sharp(buf)
      .rotate()
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 84, mozjpeg: true })
      .toFile(file);
    await sharp(buf)
      .rotate()
      .resize(480, 480, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 78, mozjpeg: true })
      .toFile(thumb);
    const meta = await sharp(file).metadata();
    credits.push({
      productId,
      file: `/uploads/products/${base}.jpg`,
      thumb: `/uploads/products/${base}-thumb.jpg`,
      source: src.p ? `https://www.pexels.com/photo/${src.p}/` : `https://unsplash.com/photos/${src.u}`,
      licence: src.p ? 'Pexels Licence (free use)' : 'Unsplash Licence (free use)',
      width: meta.width, height: meta.height
    });
    ok++;
    return true;
  } catch (e) {
    console.log(`  ✗ ${base}: ${e.message}`);
    fail++;
    return false;
  }
}

console.log('Fetching product photography…');
const jobs = [];
for (const [productId, srcs] of Object.entries(MAP)) {
  srcs.forEach((src, i) => jobs.push(grab(productId, src, i)));
}
// modest concurrency to stay polite to the CDNs
const CHUNK = 6;
for (let i = 0; i < jobs.length; i += CHUNK) await Promise.all(jobs.slice(i, i + CHUNK));

await fs.writeFile('server/photo-credits.json', JSON.stringify(credits, null, 2));
console.log(`\n  ${ok} images saved, ${fail} failed`);
console.log(`  attribution → server/photo-credits.json`);
