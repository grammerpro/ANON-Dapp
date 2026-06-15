// Web Crypto API helper for client-side file encryption/decryption (AES-GCM 256)

/**
 * Generate a random AES-GCM 256-bit symmetric key
 */
export async function generateKey() {
  return await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true, // extractable
    ["encrypt", "decrypt"]
  );
}

/**
 * Export a CryptoKey object to a base64url string
 */
export async function exportKey(key) {
  const exported = await window.crypto.subtle.exportKey("raw", key);
  return arrayBufferToBase64Url(exported);
}

/**
 * Import a base64url string into a CryptoKey object
 */
export async function importKey(keyStr) {
  const keyBuf = base64UrlToArrayBuffer(keyStr);
  return await window.crypto.subtle.importKey(
    "raw",
    keyBuf,
    "AES-GCM",
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt an ArrayBuffer with AES-GCM
 * @returns {Promise<{ciphertext: Uint8Array, iv: Uint8Array}>}
 */
export async function encryptData(arrayBuffer, key) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // Recommended 12 bytes IV
  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    arrayBuffer
  );

  return {
    ciphertext: new Uint8Array(ciphertext),
    iv: iv,
  };
}

/**
 * Decrypt an ArrayBuffer/Uint8Array ciphertext with AES-GCM
 */
export async function decryptData(ciphertext, key, iv) {
  return await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    ciphertext
  );
}

/**
 * Helper to convert ArrayBuffer to Base64Url string
 */
export function arrayBufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Helper to convert Base64Url string to ArrayBuffer
 */
export function base64UrlToArrayBuffer(base64Url) {
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = 4 - (base64.length % 4);
  if (pad < 4) {
    base64 += "=".repeat(pad);
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Convert base64 url-safe back and forth for IV
 */
export function ivToBase64Url(iv) {
  return arrayBufferToBase64Url(iv.buffer || iv);
}

export function base64UrlToIv(base64Url) {
  return new Uint8Array(base64UrlToArrayBuffer(base64Url));
}
