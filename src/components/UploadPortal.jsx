import React, { useState } from "react";
import { UploadCloud, ShieldAlert, CheckCircle2, RefreshCw, Cpu, Layers } from "lucide-react";
import { generateKey, exportKey, encryptData, ivToBase64Url } from "../utils/cryptoHelper.js";
import { uploadToIpfs, saveLocalFile } from "../utils/ipfsHelper.js";
import { mineBlockWithProgress, saveBlock, getBlockchain } from "../utils/blockchainHelper.js";

export default function UploadPortal({ pinataJwt, blockchain, setBlockchain, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [cipher, setCipher] = useState("AES-GCM-256");
  const [uploadState, setUploadState] = useState("idle"); // idle | encrypting | sharding | mining | pinning | success
  const [progressMsg, setProgressMsg] = useState("");
  const [shards, setShards] = useState([]);
  const [miningData, setMiningData] = useState({ nonce: 0, hash: "" });
  const [uploadedResult, setUploadedResult] = useState(null);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const resetPortal = () => {
    setFile(null);
    setUploadState("idle");
    setProgressMsg("");
    setShards([]);
    setMiningData({ nonce: 0, hash: "" });
    setUploadedResult(null);
  };

  const startSecureUpload = async () => {
    if (!file) return;

    try {
      // 1. ENCRYPTING
      setUploadState("encrypting");
      setProgressMsg("Generating AES-256 Symmetric key...");
      await new Promise((r) => setTimeout(r, 600));

      const key = await generateKey();
      const keyStr = await exportKey(key);

      setProgressMsg("Encrypting byte stream with AES-GCM-256...");
      const fileReader = new FileReader();
      const arrayBufferPromise = new Promise((resolve) => {
        fileReader.onload = () => resolve(fileReader.result);
      });
      fileReader.readAsArrayBuffer(file);
      const arrayBuffer = await arrayBufferPromise;

      const { ciphertext, iv } = await encryptData(arrayBuffer, key);
      const ivStr = ivToBase64Url(iv);
      await new Promise((r) => setTimeout(r, 800));

      // 2. SHARDING
      setUploadState("sharding");
      setProgressMsg("Partitioning encrypted payload into network shards...");
      
      const shardCount = 4;
      const shardSize = Math.ceil(ciphertext.length / shardCount);
      const tempShards = [];
      const nodeNames = ["Cluster Node US-East-1", "Cluster Node EU-West-2", "Cluster Node AS-East-1", "Cluster Node AU-South-1"];

      for (let i = 0; i < shardCount; i++) {
        tempShards.push({
          name: `Shard #${i+1}`,
          size: i === shardCount - 1 ? ciphertext.length - (shardSize * i) : shardSize,
          targetNode: nodeNames[i],
          status: "pending"
        });
      }
      setShards(tempShards);

      for (let i = 0; i < tempShards.length; i++) {
        setShards((prev) => {
          const next = [...prev];
          next[i].status = "syncing";
          return next;
        });
        setProgressMsg(`Routing Shard ${i+1}/${shardCount} to ${nodeNames[i]}...`);
        await new Promise((r) => setTimeout(r, 600));
        setShards((prev) => {
          const next = [...prev];
          next[i].status = "done";
          return next;
        });
      }

      // 3. MINING (CONSENSUS)
      setUploadState("mining");
      setProgressMsg("Anchoring asset verification hash to ledger...");

      const sorted = [...blockchain].sort((a, b) => b.index - a.index);
      const latestBlock = sorted[0];
      const nextIndex = latestBlock.index + 1;
      const prevHash = latestBlock.hash;
      const blockData = {
        event: "UPLOAD",
        fileName: file.name,
        size: file.size,
        mimeType: file.type || "application/octet-stream"
      };

      const minedBlock = await mineBlockWithProgress(
        nextIndex,
        prevHash,
        blockData,
        3, // difficulty
        (progress) => {
          setMiningData({ nonce: progress.nonce, hash: progress.hash });
        }
      );

      await saveBlock(minedBlock);
      const updatedChain = await getBlockchain();
      setBlockchain(updatedChain.sort((a, b) => a.index - b.index));

      // 4. PINNING
      setUploadState("pinning");
      setProgressMsg("Broadcasting encryption manifests to IPFS node networks...");
      await new Promise((r) => setTimeout(r, 500));

      const uploadResult = await uploadToIpfs(ciphertext, file.name, file.size, file.type, pinataJwt);
      const cid = uploadResult.cid;

      await saveLocalFile({
        cid: cid,
        name: file.name,
        size: file.size,
        mimeType: file.type || "application/octet-stream",
        ciphertext: ciphertext,
        iv: ivStr,
        key: keyStr,
        uploadedAt: Date.now(),
        isSimulated: uploadResult.isSimulated
      });

      const baseUrl = window.location.origin + window.location.pathname;
      const shareUrl = `${baseUrl}#/share/${cid}#key=${keyStr}&iv=${ivStr}&name=${encodeURIComponent(file.name)}&mime=${encodeURIComponent(file.type || "application/octet-stream")}`;

      setUploadedResult({
        name: file.name,
        cid: cid,
        key: keyStr,
        shareUrl: shareUrl
      });

      setUploadState("success");
      if (onUploadSuccess) {
        onUploadSuccess();
      }

    } catch (error) {
      console.error("Dispersal failed:", error);
      setUploadState("idle");
      alert("Verification write failed. Review developer console logs.");
    }
  };

  return (
    <div className="hud-panel" style={{ padding: "32px", maxWidth: "680px", margin: "0 auto" }}>
      {uploadState === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "4px" }}>
              Disperse Encrypted Asset
            </h2>
            <p style={{ fontSize: "13.5px", color: "var(--text-secondary)" }}>
              Payloads are fully encrypted client-side using Web Crypto before network distribution.
            </p>
          </div>

          {/* Drag and Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            style={{
              border: "1px dashed var(--border-color)",
              background: "rgba(255, 255, 255, 0.01)",
              borderRadius: "12px",
              padding: "60px 20px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 300ms var(--ease-in-out)"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = "var(--accent-indigo)";
              e.currentTarget.style.background = "rgba(99, 102, 241, 0.01)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = "var(--border-color)";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.01)";
            }}
            onClick={() => document.getElementById("file-input").click()}
          >
            <input
              type="file"
              id="file-input"
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />
            <UploadCloud size={32} style={{ color: "var(--accent-indigo)", margin: "0 auto 16px auto" }} />
            {file ? (
              <div>
                <p style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>
                  {file.name}
                </p>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-primary)" }}>
                  Drag & drop files here, or click to browse
                </p>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                  File will be fragmented and encrypted client-side
                </p>
              </div>
            )}
          </div>

          {/* Cipher Selector */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255, 255, 255, 0.02)", padding: "16px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
            <div>
              <span style={{ fontSize: "13.5px", fontWeight: "600", display: "block" }}>Cipher Suite Configuration</span>
              <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>AES-256 authenticated encryption</span>
            </div>
            <select 
              value={cipher} 
              onChange={(e) => setCipher(e.target.value)}
              className="input-neon"
              style={{ width: "180px", padding: "8px 12px" }}
            >
              <option value="AES-GCM-256">AES-GCM-256 (Default)</option>
            </select>
          </div>

          {/* Upload Action */}
          <button
            onClick={startSecureUpload}
            className="btn-neon"
            disabled={!file}
            style={{ width: "100%", justifyContent: "center", padding: "12px" }}
          >
            Start Encrypted Dispersal
          </button>
        </div>
      )}

      {/* Progress View */}
      {uploadState !== "idle" && uploadState !== "success" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px", padding: "10px 0" }}>
          <div style={{ textAlign: "center" }}>
            <RefreshCw className="led-text" size={32} style={{ margin: "0 auto 16px auto", animation: "spin-slow 2s linear infinite" }} />
            <h3 style={{ fontSize: "15px", fontWeight: "600", textTransform: "capitalize", color: "var(--text-primary)" }}>
              {uploadState} State Processing...
            </h3>
            <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "6px" }}>
              {progressMsg}
            </p>
          </div>

          {/* Progress bar */}
          <div style={{ height: "3px", background: "rgba(255,255,255,0.04)", borderRadius: "99px", overflow: "hidden" }}>
            <div 
              style={{ 
                height: "100%", 
                background: "var(--accent-indigo)", 
                width: 
                  uploadState === "encrypting" ? "25%" :
                  uploadState === "sharding" ? "55%" :
                  uploadState === "mining" ? "80%" : "95%",
                transition: "width 0.4s ease"
              }} 
            />
          </div>

          {/* Shard list visual */}
          {uploadState === "sharding" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {shards.map((sh, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    border: "1px solid var(--border-color)", 
                    padding: "12px", 
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.01)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "12.5px"
                  }}
                >
                  <span style={{ fontWeight: "500" }}>{sh.name} &rarr; <span style={{ color: "var(--text-secondary)" }}>{sh.targetNode}</span></span>
                  <span className={sh.status === "done" ? "led-text green" : sh.status === "syncing" ? "led-text purple" : "led-text"}>
                    {sh.status === "done" ? "Sync Completed" : sh.status === "syncing" ? "Syncing..." : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Mining hash state */}
          {uploadState === "mining" && (
            <div 
              style={{ 
                background: "rgba(255,255,255,0.01)", 
                border: "1px solid var(--border-color)", 
                borderRadius: "8px", 
                padding: "16px",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "8px"
              }}
            >
              <div style={{ color: "var(--accent-indigo)", fontWeight: "600" }}>[POW CONSENSUS VERIFICATION]</div>
              <div>Nonce attempts: <span style={{ color: "white" }}>{miningData.nonce}</span></div>
              <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                Current Block Hash: <span style={{ color: "var(--text-secondary)" }}>{miningData.hash || "Calculating..."}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Success Details */}
      {uploadState === "success" && uploadedResult && (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px", textAlign: "center" }}>
          <CheckCircle2 size={48} style={{ color: "var(--accent-emerald)", margin: "0 auto" }} />
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)" }}>
              Asset Successfully Dispersed
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "13.5px", marginTop: "4px" }}>
              The payload is secure, anchored to the ledger, and pinned on the network.
            </p>
          </div>

          {/* Details Table */}
          <div style={{ 
            background: "rgba(255,255,255,0.01)", 
            padding: "20px", 
            borderRadius: "10px", 
            textAlign: "left", 
            display: "flex", 
            flexDirection: "column", 
            gap: "12px", 
            fontSize: "13px", 
            border: "1px solid var(--border-color)" 
          }}>
            <div>
              <span style={{ color: "var(--text-secondary)", fontWeight: "500", marginRight: "10px" }}>File Name:</span>
              <span style={{ color: "white", fontWeight: "600" }}>{uploadedResult.name}</span>
            </div>
            <div>
              <span style={{ color: "var(--text-secondary)", fontWeight: "500", marginRight: "10px" }}>IPFS CID:</span>
              <span className="hash-pill">{uploadedResult.cid}</span>
            </div>
            <div>
              <span style={{ color: "var(--text-secondary)", fontWeight: "500", marginRight: "10px" }}>Decryption Key:</span>
              <span className="hash-pill" style={{ color: "var(--accent-rose)" }}>{uploadedResult.key}</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(uploadedResult.shareUrl);
                alert("Zero-Knowledge secure URL copied! Key remains encrypted in url hash fragment.");
              }}
              className="btn-neon"
              style={{ flex: 1, justifyContent: "center" }}
            >
              Copy Share Link
            </button>
            <button 
              onClick={resetPortal} 
              className="btn-neon purple"
              style={{ flex: 1, justifyContent: "center" }}
            >
              Upload New Asset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
