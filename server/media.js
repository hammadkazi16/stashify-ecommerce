import multer from 'multer';
import sharp from 'sharp';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
export const PRODUCT_DIR = path.join(UPLOAD_ROOT, 'products');

export const MAX_FILES = 8;
export const MAX_BYTES = 8 * 1024 * 1024; // 8 MB per file

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

export async function ensureDirs() {
  await fs.mkdir(PRODUCT_DIR, { recursive: true });
}

/** Memory storage so we can validate + re-encode before anything touches disk. */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: MAX_FILES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      return cb(new Error(`Unsupported type "${file.mimetype}". Use JPG, PNG, WebP or AVIF.`));
    }
    cb(null, true);
  }
});

/**
 * Re-encodes an uploaded buffer to a clean JPEG plus a square thumbnail.
 * Re-encoding strips EXIF (incl. GPS) and any embedded payload, and proves the
 * file really is a decodable image rather than a renamed script.
 */
export async function storeImage(buffer, { prefix = 'img' } = {}) {
  let meta;
  try {
    meta = await sharp(buffer, { failOn: 'error' }).metadata();
  } catch {
    throw new Error('That file could not be read as an image.');
  }
  if (!meta.width || !meta.height) throw new Error('Image has no dimensions.');
  if (meta.width < 200 || meta.height < 200) {
    throw new Error(`Image is too small (${meta.width}×${meta.height}). Minimum 200×200.`);
  }
  if (meta.width * meta.height > 60_000_000) {
    throw new Error('Image resolution is too large. Please upload under 60 megapixels.');
  }

  const id = `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(5).toString('hex')}`;
  const full = path.join(PRODUCT_DIR, `${id}.jpg`);
  const thumb = path.join(PRODUCT_DIR, `${id}-thumb.jpg`);

  const pipeline = sharp(buffer, { failOn: 'error' }).rotate();
  await pipeline.clone()
    .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(full);
  await pipeline.clone()
    .resize(480, 480, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(thumb);

  const out = await sharp(full).metadata();
  return {
    id,
    url: `/uploads/products/${id}.jpg`,
    thumb: `/uploads/products/${id}-thumb.jpg`,
    width: out.width,
    height: out.height,
    bytes: (await fs.stat(full)).size,
    uploadedAt: Date.now()
  };
}

export async function deleteImage(image) {
  if (!image?.url?.startsWith('/uploads/products/')) return; // never touch seed assets by path traversal
  const base = path.basename(image.url, '.jpg');
  if (!/^[a-zA-Z0-9_-]+$/.test(base)) return;
  await Promise.allSettled([
    fs.unlink(path.join(PRODUCT_DIR, `${base}.jpg`)),
    fs.unlink(path.join(PRODUCT_DIR, `${base}-thumb.jpg`))
  ]);
}

/** Maps multer/Sharp failures to friendly API errors. */
export function uploadErrorHandler(err, req, res, next) {
  if (!err) return next();
  if (err instanceof multer.MulterError) {
    const map = {
      LIMIT_FILE_SIZE: `Each image must be under ${MAX_BYTES / 1024 / 1024} MB.`,
      LIMIT_FILE_COUNT: `Upload at most ${MAX_FILES} images at a time.`,
      LIMIT_UNEXPECTED_FILE: 'Unexpected upload field. Use "images".'
    };
    return res.status(400).json({ error: map[err.code] || err.message });
  }
  return res.status(400).json({ error: err.message || 'Upload failed.' });
}
