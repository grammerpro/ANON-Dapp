// Blockchain Ledger Simulation using SHA-256 Proof of Work & IndexedDB persistence
import { initDB } from "./ipfsHelper.js";

/**
 * Native cryptographic hashing helper for SHA-256
 */
export async function calculateHash(index, timestamp, prevHash, data, nonce) {
  const dataString = JSON.stringify(data);
  const blockString = `${index}${timestamp}${prevHash}${dataString}${nonce}`;
  const msgBuffer = new TextEncoder().encode(blockString);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Mines a block by iterating nonces until the hash meets the difficulty target (e.g. starts with "00")
 */
export async function mineBlockSync(index, prevHash, data, difficulty = 2) {
  const timestamp = Date.now();
  let nonce = 0;
  let hash = "";
  const target = "0".repeat(difficulty);
  
  // A small difficulty (2 hex digits = 8 bits of zero) mines instantly (<5ms)
  // while still running a genuine Proof-of-Work loop.
  while (true) {
    hash = await calculateHash(index, timestamp, prevHash, data, nonce);
    if (hash.startsWith(target)) {
      break;
    }
    nonce++;
  }

  return {
    index,
    timestamp,
    prevHash,
    data,
    nonce,
    hash
  };
}

/**
 * Retrieve all blocks in the local chain from IndexedDB
 */
export async function getBlockchain() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["blockchain"], "readonly");
    const store = transaction.objectStore("blockchain");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save a block to IndexedDB
 */
export async function saveBlock(block) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["blockchain"], "readwrite");
    const store = transaction.objectStore("blockchain");
    const request = store.put(block);
    request.onsuccess = () => resolve(block);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Initialize blockchain ledger. Mines a genesis block if empty.
 */
export async function initBlockchain() {
  const blocks = await getBlockchain();
  if (blocks.length === 0) {
    const genesisData = { 
      event: "GENESIS", 
      message: "ANON Decentralized File Management Network Protocol Initiated." 
    };
    const genesisBlock = await mineBlockSync(
      0, 
      "0000000000000000000000000000000000000000000000000000000000000000", 
      genesisData, 
      2
    );
    await saveBlock(genesisBlock);
    return [genesisBlock];
  }
  return blocks.sort((a, b) => a.index - b.index);
}

/**
 * Mine and append a new block to the blockchain ledger
 */
export async function addBlockToLedger(data) {
  const blocks = await getBlockchain();
  const sorted = blocks.sort((a, b) => b.index - a.index);
  const latestBlock = sorted[0];
  
  const nextIndex = latestBlock.index + 1;
  const prevHash = latestBlock.hash;
  
  const minedBlock = await mineBlockSync(nextIndex, prevHash, data, 2);
  await saveBlock(minedBlock);
  return minedBlock;
}

/**
 * Simulates mining a block with a callback progress to show hashes spinning in real-time
 */
export async function mineBlockWithProgress(index, prevHash, data, difficulty, onProgress) {
  const timestamp = Date.now();
  let nonce = 0;
  let hash = "";
  const target = "0".repeat(difficulty);
  
  // We chunk the mining loop to allow UI to update and spin hashes
  return new Promise((resolve) => {
    const chunk = async () => {
      for (let i = 0; i < 50; i++) { // Process 50 attempts per microtask
        hash = await calculateHash(index, timestamp, prevHash, data, nonce);
        if (nonce % 10 === 0) {
          onProgress({ nonce, hash });
        }
        if (hash.startsWith(target)) {
          resolve({
            index,
            timestamp,
            prevHash,
            data,
            nonce,
            hash
          });
          return;
        }
        nonce++;
      }
      setTimeout(chunk, 0); // Defer next chunk to keep browser responsive
    };
    chunk();
  });
}
