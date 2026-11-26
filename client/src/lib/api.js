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
  } catch (e) {
    throw new Error('Cannot reach the Stashify server. Check your connection and retry.');
  }
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text }; }
  if (!res.ok) {
    // Clerk session tokens can expire mid-request; refresh once before surfacing 401.
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

/** Multipart upload with progress. Returns parsed JSON or throws Error. */
export function uploadFiles(path, files, { onProgress, fieldName = 'images' } = {}) {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    for (const f of files) fd.append(fieldName, f, f.name);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', BASE + path);
    resolveToken().then((token) => {
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(fd);
    }).catch(reject);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      let data; try { data = JSON.parse(xhr.responseText); } catch { data = { error: xhr.responseText }; }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else { const err = new Error(data.error || `Upload failed (${xhr.status})`); err.status = xhr.status; reject(err); }
    };
    xhr.onerror = () => reject(new Error('Upload failed — check your connection.'));
  });
}
