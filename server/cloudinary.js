
import { v2 as cloudinary } from 'cloudinary';
import crypto from 'crypto';

const ALLOWED_FORMATS = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif']);

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_PIXELS = 25_000_000;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export function assertCloudinaryConfig() {
  const { cloud_name, api_key, api_secret } = cloudinary.config();

  if (!cloud_name || !api_key || !api_secret) {
    throw new Error('Cloudinary credentials are not configured.');
  }
}

/**
 * Generate server-side authorization for one product image.
 */
export function createImageUploadSignature(productId) {
  assertCloudinaryConfig();

  const timestamp = Math.floor(Date.now() / 1000);
  const publicId =
    `stashify/products/${productId}/${crypto.randomUUID()}`;

  const params = {
    timestamp,
    public_id: publicId,
    overwrite: false
  };

  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    timestamp,
    publicId,
    overwrite: false,
    signature: cloudinary.utils.api_sign_request(
      params,
      process.env.CLOUDINARY_API_SECRET
    )
  };
}

/**
 * Verify Cloudinary's response and independently retrieve
 * the asset metadata before accepting it.
 */
export async function verifyUploadedImage(result, expectedPublicId) {
  assertCloudinaryConfig();

  if (!result || !result.public_id || !result.version || !result.signature) {
    throw new Error('Cloudinary returned an incomplete upload response.');
  }

  const expectedSignature = cloudinary.utils.api_sign_request(
    {
      public_id: result.public_id,
      version: result.version
    },
    process.env.CLOUDINARY_API_SECRET
  );

  const received = Buffer.from(String(result.signature));
  const expected = Buffer.from(expectedSignature);

  if (
    received.length !== expected.length ||
    !crypto.timingSafeEqual(received, expected)
  ) {
    throw new Error('Cloudinary upload signature verification failed.');
  }

  if (result.public_id !== expectedPublicId) {
    throw new Error('Uploaded image does not match the authorized upload.');
  }

  // Retrieve trusted metadata directly from Cloudinary.
  const resource = await cloudinary.api.resource(expectedPublicId, {
    resource_type: 'image'
  });

  if (resource.public_id !== expectedPublicId) {
    throw new Error('Cloudinary asset identity could not be verified.');
  }

  if (resource.resource_type !== 'image') {
    throw new Error('Only image uploads are accepted.');
  }

  if (!ALLOWED_FORMATS.has(String(resource.format).toLowerCase())) {
    throw new Error('Unsupported image format.');
  }

  if (
    !Number.isInteger(resource.width) ||
    !Number.isInteger(resource.height) ||
    resource.width < 200 ||
    resource.height < 200
  ) {
    throw new Error('Image must be at least 200 × 200 pixels.');
  }

  if (resource.width * resource.height > MAX_PIXELS) {
    throw new Error('Image resolution exceeds 60 megapixels.');
  }

  if (
    !Number.isFinite(resource.bytes) ||
    resource.bytes > MAX_BYTES
  ) {
    throw new Error('Image must be under 8 MB.');
  }

  return {
    id: resource.public_id,
    publicId: resource.public_id,

    url: cloudinary.url(resource.public_id, {
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

    thumb: cloudinary.url(resource.public_id, {
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
    }),

    width: resource.width,
    height: resource.height,
    bytes: resource.bytes,
    uploadedAt: Date.now()
  };
}

/**
 * Delete only assets stored in Stashify's product-image namespace.
 */
export async function deleteCloudinaryImage(image) {
  const publicId = image?.publicId;

  if (
    typeof publicId !== 'string' ||
    !/^stashify\/products\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/.test(publicId)
  ) {
    return;
  }

  await cloudinary.uploader.destroy(publicId, {
    resource_type: 'image',
    invalidate: true
  });
}

