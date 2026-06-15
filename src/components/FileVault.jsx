import React, { useState, useEffect } from "react";
import { 
  Folder, FileText, Image, Video, File, Download, 
  Trash2, Share2, Globe, Clock, Lock, Key, Disc 
} from "lucide-react";
import confetti from "canvas-confetti";
import { getLocalFile, getAllLocalFiles, deleteLocalFile } from "../utils/ipfsHelper.js";
import { importKey, decryptData, base64UrlToIv } from "../utils/cryptoHelper.js";

// Helper to format file sizes
const formatBytes = (bytes, decimals = 1) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

export default function FileVault({ files, setFiles, pinataJwt }) {
  const [filter, setFilter] = useState("ALL");
  const [downloadingCid, setDownloadingCid] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(""); // text explaining decrypt stage

  // Refresh files list
  const refreshFiles = async () => {
    try {
      const allFiles = await getAllLocalFiles();
      setFiles(allFiles.sort((a, b) => b.uploadedAt - a.uploadedAt));
    } catch (e) {
      console.error("Failed to load vault files:", e);
    }
  };

  useEffect(() => {
    refreshFiles();
  }, []);

  const handleDelete = async (cid) => {
    if (window.confirm("Are you sure you want to unpin/delete this file from your local node?")) {
      await deleteLocalFile(cid);
      refreshFiles();
    }
  };

  const handleCopyShare = (file) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}#/share/${file.cid}#key=${file.key}&iv=${file.iv}&name=${encodeURIComponent(file.name)}&mime=${encodeURIComponent(file.mimeType)}`;
    
    navigator.clipboard.writeText(shareUrl);
    alert("Zero-Knowledge Secure Link Copied!\n\nThis link contains the decryption key in the hash fragment. It is parsed completely client-side. The key is never transmitted over HTTP.");
  };

  const handleDownload = async (file) => {
    setDownloadingCid(file.cid);
    setDownloadProgress("LOCATING ENCRYPTED PEER SHARDS...");
    await new Promise((r) => setTimeout(r, 600));

    try {
      // 1. Fetch file from local node store
      setDownloadProgress("PULLING SHARDS & RECONSTRUCTING BUFFER...");
      const localRecord = await getLocalFile(file.cid);
      if (!localRecord) {
        throw new Error("File not found on local node");
      }
      await new Promise((r) => setTimeout(r, 600));

      // 2. Import Key
      setDownloadProgress("IMPORTING AES SYMMETRIC CRYPTO-KEY...");
      const cryptoKey = await importKey(file.key);
      const ivBuf = base64UrlToIv(file.iv);
      await new Promise((r) => setTimeout(r, 500));

      // 3. Decrypt
      setDownloadProgress("DECRYPTING PAYLOAD WITH AES-GCM-256...");
      const decryptedBuffer = await decryptData(localRecord.ciphertext, cryptoKey, ivBuf);
      await new Promise((r) => setTimeout(r, 400));

      // 4. Download Trigger
      setDownloadProgress("ASSEMBLING FILE BLOB & RELEASING TO SYSTEM...");
      const blob = new Blob([decryptedBuffer], { type: file.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Trigger Confetti Celebration!
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 },
        colors: ["#00f3ff", "#bd00ff", "#ff0080"]
      });

    } catch (e) {
      console.error("Decrypt download error:", e);
      alert("Decrypt download failed. Review console logs.");
    } finally {
      setDownloadingCid(null);
      setDownloadProgress("");
    }
  };

  // Filter categorization logic
  const getFileIcon = (mimeType) => {
    if (!mimeType) return <File size={18} />;
    if (mimeType.startsWith("image/")) return <Image size={18} />;
    if (mimeType.startsWith("video/")) return <Video size={18} />;
    if (mimeType.startsWith("text/") || mimeType.includes("pdf") || mimeType.includes("word")) return <FileText size={18} />;
    return <File size={18} />;
  };

  const getCategory = (mimeType) => {
    if (!mimeType) return "OTHER";
    if (mimeType.startsWith("image/")) return "IMAGES";
    if (mimeType.startsWith("video/")) return "VIDEOS";
    if (mimeType.startsWith("text/") || mimeType.includes("pdf") || mimeType.includes("word") || mimeType.includes("zip") || mimeType.includes("json")) return "DOCUMENTS";
    return "OTHER";
  };

  const filteredFiles = files.filter(f => {
    if (filter === "ALL") return true;
    return getCategory(f.mimeType) === filter;
  });

  return (
    <div className="hud-panel" style={{ padding: "24px", minHeight: "450px" }}>
      <div className="hud-corner-tag">secure vault // local peer store</div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
        <h2 className="led-text" style={{ fontSize: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
          <Folder size={22} /> DECENTRALIZED FILE VAULT
        </h2>

        {/* Tab Filters */}
        <div style={{ display: "flex", gap: "8px", background: "rgba(0,0,0,0.3)", padding: "4px", borderRadius: "6px", border: "1px solid rgba(0, 243, 255, 0.1)" }}>
          {["ALL", "DOCUMENTS", "IMAGES", "VIDEOS", "OTHER"].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                background: filter === cat ? "var(--neon-cyan)" : "transparent",
                color: filter === cat ? "var(--bg-primary)" : "var(--text-secondary)",
                border: "none",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                padding: "6px 12px",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: filter === cat ? "600" : "400",
                transition: "all 0.2s"
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Vault Grid */}
      {filteredFiles.length === 0 ? (
        <div style={{ padding: "80px 0", textAlign: "center", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          NO VAULT ENTRIES FOUND FOR CATEGORY: {filter}.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
          {filteredFiles.map((file) => (
            <div 
              key={file.cid} 
              className="hud-panel" 
              style={{ 
                background: "rgba(5, 8, 20, 0.7)", 
                border: "1px solid rgba(0, 243, 255, 0.15)",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                position: "relative"
              }}
            >
              {/* Type Icon & Name */}
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <div style={{ 
                  background: "rgba(0, 243, 255, 0.1)", 
                  padding: "8px", 
                  borderRadius: "4px", 
                  color: "var(--neon-cyan)",
                  border: "1px solid rgba(0, 243, 255, 0.2)"
                }}>
                  {getFileIcon(file.mimeType)}
                </div>
                <div style={{ overflow: "hidden", flex: 1 }}>
                  <h4 style={{ 
                    fontSize: "14px", 
                    fontWeight: "600", 
                    whiteSpace: "nowrap", 
                    overflow: "hidden", 
                    textOverflow: "ellipsis",
                    color: "var(--text-primary)" 
                  }} title={file.name}>
                    {file.name}
                  </h4>
                  <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                    {formatBytes(file.size)}
                  </span>
                </div>
              </div>

              {/* Meta information tags */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Globe size={12} className="led-text" />
                  <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                    CID: <span className="led-text yellow">{file.cid}</span>
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Clock size={12} />
                  <span>DATE: {new Date(file.uploadedAt).toLocaleDateString()}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Lock size={12} className="led-text pink" />
                  <span>CIPHER: AES-GCM-256</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                {downloadingCid === file.cid ? (
                  <div 
                    style={{ 
                      flex: 1, 
                      fontSize: "10px", 
                      fontFamily: "var(--font-mono)", 
                      background: "rgba(0,0,0,0.3)", 
                      padding: "8px", 
                      borderRadius: "4px", 
                      border: "1px dashed var(--neon-cyan)",
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    <Disc className="animate-spin-slow led-text" size={14} />
                    <span className="led-text">{downloadProgress}</span>
                  </div>
                ) : (
                  <>
                    <button 
                      onClick={() => handleDownload(file)} 
                      className="btn-neon" 
                      style={{ flex: 1, padding: "8px", fontSize: "11px", justifyContent: "center" }}
                    >
                      <Download size={13} /> DECRYPT
                    </button>
                    <button 
                      onClick={() => handleCopyShare(file)} 
                      className="btn-neon purple" 
                      style={{ padding: "8px", justifyContent: "center" }}
                      title="Copy Share Link"
                    >
                      <Share2 size={13} />
                    </button>
                    <button 
                      onClick={() => handleDelete(file.cid)} 
                      className="btn-neon pink" 
                      style={{ padding: "8px", justifyContent: "center" }}
                      title="Delete local copy"
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
