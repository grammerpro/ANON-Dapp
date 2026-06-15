import React, { useState, useEffect } from "react";
import { 
  FolderIcon, FileIcon, ImageIcon, VideoIcon, 
  Download, Trash2, Share2, Calendar, Lock, Database 
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
  const [downloadProgress, setDownloadProgress] = useState("");

  const refreshFiles = async () => {
    try {
      const allFiles = await getAllLocalFiles();
      setFiles(allFiles.sort((a, b) => b.uploadedAt - a.uploadedAt));
    } catch (e) {
      console.error("Vault retrieval error:", e);
    }
  };

  useEffect(() => {
    refreshFiles();
  }, []);

  const handleDelete = async (cid) => {
    if (window.confirm("Delete this encrypted asset from local peer cache?")) {
      await deleteLocalFile(cid);
      refreshFiles();
    }
  };

  const handleCopyShare = (file) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}#/share/${file.cid}#key=${file.key}&iv=${file.iv}&name=${encodeURIComponent(file.name)}&mime=${encodeURIComponent(file.mimeType)}`;
    
    navigator.clipboard.writeText(shareUrl);
    alert("Zero-knowledge link copied. Decryption metadata is contained in the hash fragment and never travels over HTTP.");
  };

  const handleDownload = async (file) => {
    setDownloadingCid(file.cid);
    setDownloadProgress("Locating encrypted shards...");
    await new Promise((r) => setTimeout(r, 600));

    try {
      setDownloadProgress("Fetching segments from node mesh...");
      const localRecord = await getLocalFile(file.cid);
      if (!localRecord) {
        throw new Error("File not indexed on this node");
      }
      await new Promise((r) => setTimeout(r, 600));

      setDownloadProgress("Synthesizing AES decryption cipher...");
      const cryptoKey = await importKey(file.key);
      const ivBuf = base64UrlToIv(file.iv);
      await new Promise((r) => setTimeout(r, 500));

      setDownloadProgress("Executing client-side AES-GCM-256 decryption...");
      const decryptedBuffer = await decryptData(localRecord.ciphertext, cryptoKey, ivBuf);
      await new Promise((r) => setTimeout(r, 400));

      setDownloadProgress("Releasing decrypted data to browser...");
      const blob = new Blob([decryptedBuffer], { type: file.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Trigger Confetti
      confetti({
        particleCount: 60,
        spread: 50,
        origin: { y: 0.8 },
        colors: ["#6366F1", "#60A5FA", "#10B981"]
      });

    } catch (e) {
      console.error("Link assembly error:", e);
      alert("Decryption stream failure. Verify key parameters.");
    } finally {
      setDownloadingCid(null);
      setDownloadProgress("");
    }
  };

  const getFileIcon = (mimeType) => {
    if (!mimeType) return <FileIcon size={16} />;
    if (mimeType.startsWith("image/")) return <ImageIcon size={16} />;
    if (mimeType.startsWith("video/")) return <VideoIcon size={16} />;
    return <FileIcon size={16} />;
  };

  const getCategory = (mimeType) => {
    if (!mimeType) return "OTHER";
    if (mimeType.startsWith("image/")) return "IMAGES";
    if (mimeType.startsWith("video/")) return "VIDEOS";
    if (mimeType.startsWith("text/") || mimeType.includes("pdf") || mimeType.includes("word") || mimeType.includes("zip")) return "DOCUMENTS";
    return "OTHER";
  };

  const filteredFiles = files.filter(f => {
    if (filter === "ALL") return true;
    return getCategory(f.mimeType) === filter;
  });

  return (
    <div className="hud-panel" style={{ padding: "32px", minHeight: "480px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "15px" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px" }}>
            <FolderIcon size={20} style={{ color: "var(--accent-indigo)" }} /> File Vault Directory
          </h2>
          <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
            Encrypted file index registered to the local gateway client.
          </p>
        </div>

        {/* Categories Tabs */}
        <div style={{ display: "flex", gap: "4px", background: "rgba(255,255,255,0.03)", padding: "4px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
          {["ALL", "DOCUMENTS", "IMAGES", "VIDEOS", "OTHER"].map((cat) => {
            const isActive = filter === cat;
            return (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                style={{
                  background: isActive ? "rgba(255, 255, 255, 0.05)" : "transparent",
                  color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                  border: "none",
                  fontFamily: "var(--font-main)",
                  fontSize: "11px",
                  fontWeight: isActive ? "600" : "400",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "all 150ms"
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Directory Grid */}
      {filteredFiles.length === 0 ? (
        <div style={{ padding: "80px 0", textAlign: "center", color: "var(--text-secondary)", fontSize: "13.5px", fontFamily: "var(--font-mono)" }}>
          NO VAULT ASSETS CLASSIFIED UNDER {filter}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
          {filteredFiles.map((file) => (
            <div 
              key={file.cid} 
              className="hud-panel" 
              style={{ 
                background: "rgba(15, 22, 42, 0.2)", 
                borderColor: "var(--border-color)",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "16px"
              }}
            >
              {/* Type and Title */}
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <div style={{ 
                  background: "rgba(99, 102, 241, 0.08)", 
                  padding: "8px", 
                  borderRadius: "8px", 
                  color: "var(--accent-indigo)",
                  border: "1px solid rgba(99, 102, 241, 0.15)"
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
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    {formatBytes(file.size)}
                  </span>
                </div>
              </div>

              {/* Stats Metadata */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "11px", color: "var(--text-secondary)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Database size={12} style={{ color: "var(--accent-blue)" }} />
                  <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                    CID: <span className="hash-pill" style={{ padding: "2px 6px" }}>{file.cid}</span>
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Calendar size={12} />
                  <span>Indexed: {new Date(file.uploadedAt).toLocaleDateString()}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Lock size={12} style={{ color: "var(--accent-rose)" }} />
                  <span>Cipher: AES-GCM-256</span>
                </div>
              </div>

              {/* Actions row */}
              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                {downloadingCid === file.cid ? (
                  <div 
                    style={{ 
                      flex: 1, 
                      fontSize: "11px", 
                      background: "rgba(255, 255, 255, 0.02)", 
                      padding: "10px", 
                      borderRadius: "6px", 
                      border: "1px dashed var(--border-color)",
                      textAlign: "center",
                      color: "var(--text-secondary)"
                    }}
                  >
                    {downloadProgress}
                  </div>
                ) : (
                  <>
                    <button 
                      onClick={() => handleDownload(file)} 
                      className="btn-neon" 
                      style={{ flex: 1, padding: "8px 12px", fontSize: "12px", justifyContent: "center" }}
                    >
                      <Download size={13} /> Download
                    </button>
                    <button 
                      onClick={() => handleCopyShare(file)} 
                      className="btn-neon purple" 
                      style={{ padding: "8px 10px", justifyContent: "center" }}
                      title="Copy share link"
                    >
                      <Share2 size={13} />
                    </button>
                    <button 
                      onClick={() => handleDelete(file.cid)} 
                      className="btn-neon pink" 
                      style={{ padding: "8px 10px", justifyContent: "center" }}
                      title="Purge"
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
