
import { safeStorage } from './storage.js';

const BASE = '/api';
const TOKEN_KEY = 'stashify.token';
let tokenProvider = null;

export const getToken = () => safeStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? safeStorage.setItem(TOKEN_KEY, t) : safeStorage.removeItem(TOKEN_KEY));

/** In Clerk mode the backend receives a short-lived Clerk session token, not a legacy JWT. */
export const setTokenProvider = (fn) => { tokenProvider = fn; };
export const hasAuth = () => Boolean(tokenProvider || getToken());

async function resolveToken() {
  if (tokenProvider) return tokenProvider();
  return getToken();
}

export async function api(path, { method = 'GET', body, auth = true, signal, retryAuth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = auth ? await resolveToken() : null;

  if (token) headers.Authorization = `Bearer ${token}`;

  let res;

  try {
    res = await fetch(BASE + path, {
      method, headers, signal,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new Error('Cannot reach the Stashify server. Check your connection and retry.');
  }

  const text = await res.text();
  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text };
  }

  if (!res.ok) {
    if (res.status === 401 && auth && tokenProvider && retryAuth) {
      return api(path, { method, body, auth, signal, retryAuth: false });
    }

    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const inr = (n) =>
  '₹' + Number(Math.round(n || 0)).toLocaleString('en-IN');

export const pct = (p) => Math.round((1 - p.price / p.mrp) * 100);

export const dateFmt = (ts) =>
  new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const timeFmt = (ts) =>
  new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export const STATUS_LABEL = {
  confirmed: 'Confirmed',
  packed: 'Packed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};

export const ORDER_FLOW = ['confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered'];

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif'
]);

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/**
 * Upload one file directly to Cloudinary.
 * The signed parameters come from our authenticated backend.
 */
function uploadToCloudinary(signed, file, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData();

    form.append('file', file, file.name);
    form.append('api_key', signed.apiKey);
    form.append('timestamp', String(signed.timestamp));
    form.append('public_id', signed.publicId);
    form.append('overwrite', String(signed.overwrite));
    form.append('signature', signed.signature);

    const xhr = new XMLHttpRequest();

    xhr.open(
      'POST',
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(signed.cloudName)}/image/upload`
    );

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(event.loaded / event.total);
      }
    };

    xhr.onload = () => {
      let data;

      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = {};
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
      } else {
        reject(new Error(
          data.error?.message || `Cloudinary upload failed (${xhr.status}).`
        ));
      }
    };

    xhr.onerror = () => reject(
      new Error('Image upload failed. Check your internet connection.')
    );

    xhr.onabort = () => reject(new Error('Image upload was cancelled.'));

    xhr.send(form);
  });
}

/**
 * Upload product images directly to Cloudinary.
 * Each upload is authorized and confirmed through our backend.
 * Progress is reported across the complete batch.
 */
export async function uploadFiles(path, files, { onProgress } = {}) {
  const list = Array.from(files);
  const added = [];
  const failed = [];
  let product = null;

  if (!list.length) {
    throw new Error('Choose at least one image.');
  }

  for (let index = 0; index < list.length; index++) {
    const file = list[index];

    try {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        throw new Error('Use JPG, PNG, WebP or AVIF images.');
      }

      if (file.size > MAX_IMAGE_BYTES) {
        throw new Error('Each image must be under 8 MB.');
      }

      // Request a unique, authenticated upload signature.
      const signed = await api(`${path}/sign`, {
        method: 'POST',
        body: {}
      });

      // Upload the file directly to Cloudinary.
      const result = await uploadToCloudinary(
        signed,
        file,
        (fraction) => {
          const overall = ((index + fraction) / list.length) * 100;
          if (onProgress) onProgress(Math.round(overall));
        }
      );

      // Ask the backend to verify the asset and save its metadata.
      const confirmed = await api(`${path}/confirm`, {
        method: 'POST',
        body: {
          result,
          publicId: signed.publicId
        }
      });

      product = confirmed.product;
      added.push(...confirmed.added);
      failed.push(...(confirmed.failed || []));

    } catch (error) {
      failed.push({
        name: file.name,
        error: error.message || 'Upload failed.'
      });
    }
  }

  if (!added.length) {
    throw new Error(
      failed[0]?.error || 'None of the images could be uploaded.'
    );
  }

  if (onProgress) onProgress(100);

  return { product, added, failed };
}
