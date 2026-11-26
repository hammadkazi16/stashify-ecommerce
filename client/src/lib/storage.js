/* Browser storage that never throws.
 * Embedded previews can sandbox the page (opaque origin) or block third-party
 * storage. In that case we keep state in memory for the session instead of
 * crashing the whole React tree. */
const memory = new Map();
let usable = null;

export function storageAvailable() {
  if (usable !== null) return usable;
  try {
    const k = '__stashify_storage_probe__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    usable = true;
  } catch {
    usable = false;
  }
  return usable;
}

export const safeStorage = {
  getItem(key) {
    try {
      if (storageAvailable()) return window.localStorage.getItem(key);
    } catch { /* fall through to memory */ }
    return memory.has(key) ? memory.get(key) : null;
  },
  setItem(key, value) {
    const v = String(value);
    memory.set(key, v);
    try {
      if (storageAvailable()) window.localStorage.setItem(key, v);
    } catch { /* memory-only session */ }
  },
  removeItem(key) {
    memory.delete(key);
    try {
      if (storageAvailable()) window.localStorage.removeItem(key);
    } catch { /* memory-only session */ }
  }
};
