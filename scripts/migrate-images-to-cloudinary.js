
import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const DRY_RUN = !process.argv.includes('--execute');
const DB_NAME = process.env.MONGODB_DB || 'stashify';
const MONGO_URI = process.env.MONGODB_URI;
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

const ROOT = process.cwd();
const IMAGE_DIR = path.join(ROOT, 'uploads', 'products');
const BACKUP_DIR = path.join(ROOT, 'backups');
const STATE_FILE = path.join(BACKUP_DIR, 'cloudinary-migration-state.json');

const PREFIX = 'stashify/products/seed';

if (!MONGO_URI || !CLOUD_NAME || !API_KEY || !API_SECRET) {
  throw new Error('MongoDB or Cloudinary environment configuration is missing.');
}

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
  secure: true
});

const client = new MongoClient(MONGO_URI, {
  appName: 'stashify-image-migration',
  maxPoolSize: 3,
  serverSelectionTimeoutMS: 10000
});

const mimeTypes = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif'
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function imageFilename(url) {
  if (typeof url !== 'string' || !url.startsWith('/uploads/products/')) {
    return null;
  }

  const filename = path.posix.basename(url);

  if (!filename || filename !== url.slice('/uploads/products/'.length)) {
    throw new Error(`Unsafe legacy image path: ${url}`);
  }

  if (!mimeTypes[path.extname(filename).toLowerCase()]) {
    throw new Error(`Unsupported image format: ${filename}`);
  }

  return filename;
}

function makePublicId(filename) {
  const extension = path.extname(filename);
  const base = path.basename(filename, extension);
  const safe = base.replace(/[^a-zA-Z0-9_-]/g, '-');

  return `${PREFIX}/${safe}`;
}

function cloudinaryUrls(publicId) {
  return {
    url: cloudinary.url(publicId, {
      secure: true,
      transformation: [
        {
          width: 1600,
          height: 1600,
          crop: 'limit',
          fetch_format: 'jpg',
          quality: 'auto',
          flags: 'strip_profile'
        }
      ]
    }),
    thumb: cloudinary.url(publicId, {
      secure: true,
      transformation: [
        {
          width: 480,
          height: 480,
          crop: 'fill',
          gravity: 'auto',
          fetch_format: 'jpg',
          quality: 'auto',
          flags: 'strip_profile'
        }
      ]
    })
  };
}

function readMigrationState() {
  if (!fs.existsSync(STATE_FILE)) return {};
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}

function writeMigrationState(state) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const temporary = `${STATE_FILE}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(temporary, STATE_FILE);
}

async function uploadImage(filename, publicId) {
  const fullPath = path.join(IMAGE_DIR, filename);

  const result = await cloudinary.uploader.upload(fullPath, {
    public_id: publicId,
    resource_type: 'image',
    overwrite: false,
    unique_filename: false,
    use_filename: false
  });

  if (result.public_id !== publicId || result.resource_type !== 'image') {
    throw new Error(`Cloudinary returned an unexpected asset for ${filename}`);
  }

  return result;
}

async function main() {
  await client.connect();
  const db = client.db(DB_NAME);
  const products = db.collection('products');

  const rows = await products.find({
    images: { $elemMatch: { url: { $regex: '^/uploads/products/' } } }
  }).toArray();

  const jobs = [];
  const seen = new Set();

  for (const product of rows) {
    for (const image of product.images || []) {
      const filename = imageFilename(image.url);
      if (!filename) continue;

      const fullPath = path.join(IMAGE_DIR, filename);

      if (!fs.existsSync(fullPath)) {
        throw new Error(`Local image is missing: ${filename}`);
      }

      const publicId = makePublicId(filename);
      const key = `${product.id}:${image.id}`;

      if (seen.has(key)) {
        throw new Error(`Duplicate product image record: ${key}`);
      }
      seen.add(key);

      jobs.push({
        productId: product.id,
        imageId: image.id,
        filename,
        fullPath,
        publicId,
        thumbFilename: image.thumb
          ? imageFilename(image.thumb)
          : null
      });
    }
  }

  const uniqueFiles = new Set(jobs.map((job) => job.filename));

  console.log(`Database: ${DB_NAME}`);
  console.log(`Products containing legacy images: ${rows.length}`);
  console.log(`Image records to migrate: ${jobs.length}`);
  console.log(`Unique original files: ${uniqueFiles.size}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN — no changes' : 'EXECUTION'}`);

  if (jobs.length === 0) {
    console.log('No legacy images need migration.');
    return;
  }

  for (const job of jobs) {
        const stats = fs.statSync(job.fullPath);

    if (stats.size > 10 * 1024 * 1024) {
      throw new Error(`Image exceeds Cloudinary's 10 MB limit: ${job.filename}`);
    }

    const metadata = await sharp(job.fullPath).metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error(`Could not read image dimensions: ${job.filename}`);
    }

    if (metadata.width * metadata.height > 25_000_000) {
      throw new Error(`Image exceeds Cloudinary's 25 MP limit: ${job.filename}`);
    }
    if (job.thumbFilename) {
      const thumbPath = path.join(IMAGE_DIR, job.thumbFilename);
      if (!fs.existsSync(thumbPath)) {
        throw new Error(`Thumbnail file is missing: ${job.thumbFilename}`);
      }
    }
  }

  const state = readMigrationState();

  if (DRY_RUN) {
    for (const job of jobs) {
      console.log(`${job.filename} -> ${job.publicId}`);
    }
    console.log('Dry run passed. No uploads or database changes were made.');
    return;
  }

  const uploaded = new Map();

  for (const filename of uniqueFiles) {
    const job = jobs.find((item) => item.filename === filename);
    const existing = await cloudinary.api.resource(job.publicId, {
      resource_type: 'image'
    }).catch((error) => {
      const statusCode =
        error?.http_code ??
        error?.error?.http_code ??
        error?.statusCode;

      if (statusCode === 404) return null;
      throw error;
    });

    let result = existing;

    if (!result) {
      result = await uploadImage(filename, job.publicId);
      await sleep(150);
    }

    uploaded.set(filename, {
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      format: result.format
    });

    state[filename] = uploaded.get(filename);
    writeMigrationState(state);

    console.log(`Uploaded/verified: ${filename}`);
  }

  let updated = 0;

  for (const product of rows) {
    const nextImages = (product.images || []).map((image) => {
      const filename = imageFilename(image.url);
      if (!filename) return image;

      const asset = uploaded.get(filename);
      if (!asset) throw new Error(`Missing Cloudinary result: ${filename}`);

      const urls = cloudinaryUrls(asset.publicId);

      return {
        ...image,
        url: urls.url,
        thumb: urls.thumb,
        publicId: asset.publicId,
        width: asset.width,
        height: asset.height,
        bytes: asset.bytes
      };
    });

    const result = await products.updateOne(
      { _id: product._id },
      { $set: { images: nextImages } }
    );

    if (result.modifiedCount !== 1) {
      throw new Error(`Could not update product ${product.id}`);
    }

    updated++;
    console.log(`Updated product: ${product.id}`);
  }

  console.log('Migration completed.');
  console.log(`Unique files uploaded or verified: ${uploaded.size}`);
  console.log(`Products updated: ${updated}`);
  console.log('Original local files and MongoDB backup were preserved.');
}

try {
  await main();
} finally {
  await client.close();
}
