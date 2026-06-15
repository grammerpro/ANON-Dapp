// IPFS Helper with local IndexedDB client-side database fallback & live Pinata IPFS API support

const DB_NAME = "AnonDappDB";
const DB_VERSION = 1;

/**
 * Initialize IndexedDB stores for local node simulation
 */
export function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB connection error:", event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Store for encrypted files (simulating local IPFS pinning)
      if (!db.objectStoreNames.contains("files")) {
        db.createObjectStore("files", { keyPath: "cid" });
      }
      
      // Store for simulated blockchain blocks
      if (!db.objectStoreNames.contains("blockchain")) {
        db.createObjectStore("blockchain", { keyPath: "index" });
      }

      // Store for anon chat messages
      if (!db.objectStoreNames.contains("chat")) {
        db.createObjectStore("chat", { keyPath: "id", autoIncrement: true });
      }
    };
  });
}

/**
 * Save encrypted file details to local IndexedDB (simulated peer pin)
 */
export async function saveLocalFile(fileData) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["files"], "readwrite");
    const store = transaction.objectStore("files");
    const request = store.put(fileData);

    request.onsuccess = () => resolve(fileData);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Fetch file from local IndexedDB
 */
export async function getLocalFile(cid) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["files"], "readonly");
    const store = transaction.objectStore("files");
    const request = store.get(cid);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get list of all locally pinned files
 */
export async function getAllLocalFiles() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["files"], "readonly");
    const store = transaction.objectStore("files");
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Unpin/delete file from local IndexedDB
 */
export async function deleteLocalFile(cid) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["files"], "readwrite");
    const store = transaction.objectStore("files");
    const request = store.delete(cid);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generate a realistic IPFS CID (v0 format, starts with Qm)
 */
export function generateMockCid() {
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let result = "Qm";
  for (let i = 0; i < 44; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Upload encrypted data to IPFS (via Pinata JWT or Local database simulation)
 */
export async function uploadToIpfs(encryptedUint8Array, filename, size, mimeType, pinataJwt = null) {
  if (pinataJwt && pinataJwt.trim() !== "") {
    try {
      const blob = new Blob([encryptedUint8Array], { type: "application/octet-stream" });
      const formData = new FormData();
      formData.append("file", blob, filename);
      
      const metadata = JSON.stringify({
        name: filename,
        keyvalues: {
          mimeType: mimeType,
          size: size.toString(),
          app: "AnonDapp"
        }
      });
      formData.append("pinataMetadata", metadata);

      const options = JSON.stringify({
        cidVersion: 0,
      });
      formData.append("pinataOptions", options);

      const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${pinataJwt}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Pinata API returned error status: ${response.status}`);
      }

      const data = await response.json();
      return {
        cid: data.IpfsHash,
        isSimulated: false,
        gatewayUrl: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`
      };
    } catch (error) {
      console.error("Pinata upload failed, falling back to local simulation:", error);
    }
  }

  // Local simulated upload
  const cid = generateMockCid();
  return {
    cid,
    isSimulated: true,
    gatewayUrl: `https://ipfs.io/ipfs/${cid}`
  };
}

/**
 * Download file ciphertext from IPFS (Local DB check first, then Cloudflare Gateway)
 */
export async function fetchFromIpfs(cid, pinataJwt = null) {
  // Try local db node
  const localFile = await getLocalFile(cid);
  if (localFile) {
    return {
      ciphertext: localFile.ciphertext,
      iv: localFile.iv,
      name: localFile.name,
      size: localFile.size,
      mimeType: localFile.mimeType,
      isSimulated: true
    };
  }

  // Try fetching from public gateways
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    const response = await fetch(`https://cloudflare-ipfs.com/ipfs/${cid}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      return {
        ciphertext: new Uint8Array(arrayBuffer),
        isSimulated: false
      };
    }
  } catch (error) {
    console.warn("Public IPFS gateway fetch timed out or failed:", error);
  }

  // Backup Pinata gateway if JWT is set
  if (pinataJwt && pinataJwt.trim() !== "") {
    try {
      const response = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`, {
        headers: {
          Authorization: `Bearer ${pinataJwt}`
        }
      });
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        return {
          ciphertext: new Uint8Array(arrayBuffer),
          isSimulated: false
        };
      }
    } catch (error) {
      console.error("Pinata gateway download failed:", error);
    }
  }

  throw new Error("Unable to retrieve file: Not found on local node or public gateways.");
}
