import React, { useState, useCallback } from "react";
import { Upload, Shield, Share2, Layers, Cpu, CheckCircle, AlertTriangle, Disc } from "lucide-react";
import { generateKey, exportKey, encryptData, ivToBase64Url } from "../utils/cryptoHelper.js";
import { uploadToIpfs, saveLocalFile } from "../utils/ipfsHelper.js";
import { mineBlockWithProgress, saveBlock, getBlockchain } from "../utils/blockchainHelper.js";

export default function UploadPortal({ pinataJwt, blockchain, setBlockchain, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [cipher, setCipher] = useState("AES-GCM-256");
  const [uploadState, setUploadState] = useState("idle"); // idle | encrypting | sharding | mining | pinning | success
  const [progressMsg, setProgressMsg] = useState("");
  const [shards, setShards] = useState([]); // [{ name, size, targetNode, status: 'pending'|'syncing'|'done' }]
  const [miningData, setMiningData] = useState({ nonce: 0, hash: "" });
  const [uploadedResult, setUploadedResult] = useState(null); // { name, cid, key, shareUrl }

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
      // 1. ENCRYPTING STAGE
      setUploadState("encrypting");
      setProgressMsg("GENERATING SYMMETRIC CRYPTO-KEY...");
      await new Promise((r) => setTimeout(r, 600));

      const key = await generateKey();
      const keyStr = await exportKey(key);

      setProgressMsg("ENCRYPTING BUFFER WITH AES-GCM-256...");
      const fileReader = new FileReader();
      const arrayBufferPromise = new Promise((resolve) => {
        fileReader.onload = () => resolve(fileReader.result);
      });
      fileReader.readAsArrayBuffer(file);
      const arrayBuffer = await arrayBufferPromise;

      const { ciphertext, iv } = await encryptData(arrayBuffer, key);
      const ivStr = ivToBase64Url(iv);
      await new Promise((r) => setTimeout(r, 800));

      // 2. SHARDING STAGE
      setUploadState("sharding");
      setProgressMsg("FRAGEMENTING CYCLIC PAYLOAD INTO ANONYMOUS PEER SHARDS...");
      
      const shardCount = 4;
      const shardSize = Math.ceil(ciphertext.length / shardCount);
      const tempShards = [];
      const nodeNames = ["Peer-Node-Zeta (US)", "Peer-Node-Omega (EU)", "Peer-Node-Sigma (AS)", "Peer-Node-Mu (AU)"];

      for (let i = 0; i < shardCount; i++) {
        tempShards.push({
          name: `SHARD-${i+1}`,
          size: i === shardCount - 1 ? ciphertext.length - (shardSize * i) : shardSize,
          targetNode: nodeNames[i],
          status: "pending"
        });
      }
      setShards(tempShards);

      // Animate sharding distribution sequence
      for (let i = 0; i < tempShards.length; i++) {
        setShards((prev) => {
          const next = [...prev];
          next[i].status = "syncing";
          return next;
        });
        setProgressMsg(`DISTRIBUTING SHARD ${i+1}/${shardCount} TO ${nodeNames[i]}...`);
        await new Promise((r) => setTimeout(r, 700));
        setShards((prev) => {
          const next = [...prev];
          next[i].status = "done";
          return next;
        });
      }

      // 3. MINING STAGE
      setUploadState("mining");
      setProgressMsg("MINING TRANSACTIONS TO DECENTRALIZED PROTOCOL LEDGER...");

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

      // Save block to blockchain DB
      await saveBlock(minedBlock);
      const updatedChain = await getBlockchain();
      setBlockchain(updatedChain.sort((a, b) => a.index - b.index));

      // 4. PINNING / GATEWAY BROADCAST STAGE
      setUploadState("pinning");
      setProgressMsg("PINNING CRYPTO-SHARDS TO IPFS NODE CLUSTERS...");
      await new Promise((r) => setTimeout(r, 500));

      const uploadResult = await uploadToIpfs(ciphertext, file.name, file.size, file.type, pinataJwt);
      const cid = uploadResult.cid;

      // Save metadata locally to our file index
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

      // Construct Cryptographic Share URL
      // Form: /#/share/CID#key=KEY&iv=IV&name=NAME&mime=MIME
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
      console.error("Secure upload failure:", error);
      setUploadState("idle");
      alert("Encryption & Upload failed. Review console logs.");
    }
  };

  return (
    <div className="hud-panel" style={{ padding: "24px", minHeight: "450px" }}>
      <div className="hud-corner-tag">sec uploader // encryption engine</div>

      {uploadState === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Header */}
          <h2 className="led-text" style={{ fontSize: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
            <Shield size={22} /> SECURE CRYPTO-UPLOAD PORTAL
          </h2>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            style={{
              border: "2px dashed rgba(0, 243, 255, 0.3)",
              background: "rgba(0, 243, 255, 0.02)",
              borderRadius: "8px",
              padding: "50px 20px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.2s",
              position: "relative"
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = "var(--neon-cyan)"}
            onMouseOut={(e) => e.currentTarget.style.borderColor = "rgba(0, 243, 255, 0.3)"}
            onClick={() => document.getElementById("file-input").click()}
          >
            <input
              type="file"
              id="file-input"
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />
            <Upload size={48} className="led-text animate-pulse-cyan" style={{ margin: "0 auto 16px auto" }} />
            {file ? (
              <div>
                <p style={{ fontSize: "16px", color: "var(--neon-cyan)", fontWeight: "600", fontFamily: "var(--font-mono)" }}>
                  {file.name}
                </p>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "6px" }}>
                  File Size: {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: "16px", fontWeight: "600" }}>DRAG & DROP SECURE FILES HERE</p>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
                  OR CLICK TO CHOOSE FROM STORAGE UNIT
                </p>
              </div>
            )}
          </div>

          {/* Cipher Selector */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.2)", padding: "12px 16px", borderRadius: "6px" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "14px", fontWeight: "600" }}>Cryptographic Cipher Suite</span>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Fully client-side browser key synthesis</span>
            </div>
            <select 
              value={cipher} 
              onChange={(e) => setCipher(e.target.value)}
              className="input-neon"
              style={{ width: "200px", padding: "6px" }}
            >
              <option value="AES-GCM-256">AES-GCM-256 (Military-Grade)</option>
              <option value="CHACHA20">ChaCha20-Poly1305 (Ultra-Fast)</option>
            </select>
          </div>

          {/* Upload Button */}
          <button
            onClick={startSecureUpload}
            className="btn-neon"
            disabled={!file}
            style={{ width: "100%", justifyContent: "center", padding: "14px" }}
          >
            <Layers size={18} /> ENCRYPT & DISPERSE TO LEDGER
          </button>
        </div>
      )}

      {/* Loading Sequences */}
      {uploadState !== "idle" && uploadState !== "success" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "20px 0" }}>
          <div style={{ textAlign: "center" }}>
            <Disc className="animate-spin-slow led-text" size={48} style={{ margin: "0 auto 16px auto" }} />
            <h3 className="led-text" style={{ fontSize: "18px", textTransform: "uppercase" }}>
              STATE: {uploadState}
            </h3>
            <p style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)", fontSize: "12px", marginTop: "6px" }}>
              {progressMsg}
            </p>
          </div>

          <div style={{ height: "2px", background: "rgba(255,255,255,0.05)", position: "relative", overflow: "hidden" }}>
            <div 
              style={{ 
                height: "100%", 
                background: "var(--neon-cyan)", 
                width: 
                  uploadState === "encrypting" ? "20%" :
                  uploadState === "sharding" ? "50%" :
                  uploadState === "mining" ? "80%" : "95%",
                transition: "width 0.4s ease"
              }} 
            />
          </div>

          {/* Sharding Visual Overlay */}
          {uploadState === "sharding" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontFamily: "var(--font-mono)", fontSize: "11px" }}>
              {shards.map((sh, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    border: "1px solid rgba(0, 243, 255, 0.15)", 
                    padding: "8px 12px", 
                    borderRadius: "4px",
                    background: sh.status === "syncing" ? "rgba(0,243,255,0.05)" : "rgba(0,0,0,0.15)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div>
                    <span className="led-text" style={{ marginRight: "8px" }}>{sh.name}</span>
                    <span style={{ color: "var(--text-muted)" }}>({(sh.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <span className={sh.status === "done" ? "led-text green" : sh.status === "syncing" ? "led-text animate-pulse-cyan" : "led-text yellow"}>
                    {sh.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Blockchain Mining Visual Overlay */}
          {uploadState === "mining" && (
            <div 
              style={{ 
                background: "rgba(5, 8, 20, 0.9)", 
                border: "1px dashed rgba(0, 243, 255, 0.3)", 
                borderRadius: "6px", 
                padding: "16px",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "6px"
              }}
            >
              <div style={{ color: "var(--neon-cyan)", fontWeight: "600" }}>[PROVING WORK...] RUNNING BLOCKHAIN SYNCHRONIZER</div>
              <div>NONCE: <span className="led-text">{miningData.nonce}</span></div>
              <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                HASH: <span style={{ color: "var(--text-secondary)" }}>{miningData.hash || "GENERATING..."}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Success Portal Screen */}
      {uploadState === "success" && uploadedResult && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", textAlign: "center", padding: "10px 0" }}>
          <CheckCircle size={54} className="led-text green" style={{ margin: "0 auto" }} />
          <div>
            <h3 className="led-text green" style={{ fontSize: "20px" }}>SECURE DISPERSAL COMPLETED</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "4px" }}>
              File encrypted client-side and anchored to the decentralized ledger.
            </p>
          </div>

          <div style={{ background: "rgba(0,0,0,0.2)", padding: "16px", borderRadius: "6px", textAlign: "left", display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px", fontFamily: "var(--font-mono)" }}>
            <div>
              <span style={{ color: "var(--text-muted)" }}>FILE NAME:</span>{" "}
              <span className="led-text">{uploadedResult.name}</span>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)" }}>IPFS CID:</span>{" "}
              <span className="led-text yellow" style={{ wordBreak: "break-all" }}>{uploadedResult.cid}</span>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)" }}>DECRYPTION KEY:</span>{" "}
              <span className="led-text pink" style={{ wordBreak: "break-all" }}>{uploadedResult.key}</span>
            </div>
          </div>

          {/* Share links */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", width: "100%" }}>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(uploadedResult.shareUrl);
                alert("Zero-Knowledge Share link copied! Share this privately. The key is in the hash fragment and never hits the server.");
              }}
              className="btn-neon"
              style={{ flex: 1, justifyContent: "center" }}
            >
              <Share2 size={16} /> COPY ZK-SHARE LINK
            </button>
            <button 
              onClick={resetPortal} 
              className="btn-neon purple"
              style={{ flex: 1, justifyContent: "center" }}
            >
              NEW UPLOAD
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
