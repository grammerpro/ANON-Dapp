import React, { useState, useEffect } from "react";
import { Shield, Download, Disc, CheckCircle, AlertTriangle, Key, ExternalLink } from "lucide-react";
import confetti from "canvas-confetti";
import { fetchFromIpfs } from "../utils/ipfsHelper.js";
import { importKey, decryptData, base64UrlToIv } from "../utils/cryptoHelper.js";

export default function SharePortal({ pinataJwt, onGoHome }) {
  const [shareData, setShareData] = useState(null);
  const [downloadState, setDownloadState] = useState("ready"); // ready | downloading | success | error
  const [progressMsg, setProgressMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Parse cryptographic values from URL hash fragment
  useEffect(() => {
    const parseUrl = () => {
      const hashStr = window.location.hash; // e.g. #/share/Qm...#key=...&iv=...&name=...&mime=...
      
      const match = hashStr.match(/#\/share\/([a-zA-Z0-9]+)/);
      if (!match) {
        setDownloadState("error");
        setErrorMsg("INVALID SECURE ROUTE OR MISSING CID SPECIFIER.");
        return;
      }
      const cid = match[1];

      // Extract params from hash suffix (separated by second hash or query symbol)
      let paramStr = "";
      const lastHashIdx = hashStr.indexOf("#", 3);
      const queryIdx = hashStr.indexOf("?");

      if (lastHashIdx !== -1) {
        paramStr = hashStr.substring(lastHashIdx + 1);
      } else if (queryIdx !== -1) {
        paramStr = hashStr.substring(queryIdx + 1);
      } else {
        const parts = hashStr.split("#");
        if (parts.length > 2) {
          paramStr = parts[parts.length - 1];
        }
      }

      const params = new URLSearchParams(paramStr);
      const key = params.get("key");
      const iv = params.get("iv");
      const name = params.get("name") ? decodeURIComponent(params.get("name")) : "encrypted_file";
      const mime = params.get("mime") ? decodeURIComponent(params.get("mime")) : "application/octet-stream";

      if (!key || !iv) {
        setDownloadState("error");
        setErrorMsg("CRYPTOGRAPHIC SECURE KEYS MISSING FROM URL HASH. DECRYPTION IMPOSSIBLE.");
        return;
      }

      setShareData({ cid, key, iv, name, mime });
      setDownloadState("ready");
    };

    parseUrl();
    window.addEventListener("hashchange", parseUrl);
    return () => window.removeEventListener("hashchange", parseUrl);
  }, []);

  const triggerDecryptDownload = async () => {
    if (!shareData) return;

    setDownloadState("downloading");
    setProgressMsg("CONNECTING TO DECENTRALIZED NODE WEB...");
    await new Promise((r) => setTimeout(r, 800));

    try {
      // 1. Fetch Ciphertext from local node OR public IPFS gateways
      setProgressMsg("ACQUIRING CRYPTOGRAPHIC DATA CHUNKS...");
      const result = await fetchFromIpfs(shareData.cid, pinataJwt);
      await new Promise((r) => setTimeout(r, 800));

      // 2. Re-import Crypto Key
      setProgressMsg("SENSING CLIENT-SIDE SYMMETRIC ENCRYPTION CIPHER...");
      const key = await importKey(shareData.key);
      const ivBuf = base64UrlToIv(shareData.iv);
      await new Promise((r) => setTimeout(r, 600));

      // 3. Decrypt Array Buffer
      setProgressMsg("PERFORMING ZERO-KNOWLEDGE AES DECRYPTION...");
      const decrypted = await decryptData(result.ciphertext, key, ivBuf);
      await new Promise((r) => setTimeout(r, 600));

      // 4. Trigger Save
      setProgressMsg("DESERIALIZING DECRYPTED BLOCK STREAM TO DISK...");
      const blob = new Blob([decrypted], { type: shareData.mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = shareData.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloadState("success");
      setProgressMsg("");

      // Play success confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.8 },
        colors: ["#00f3ff", "#bd00ff", "#ff0080"]
      });

    } catch (e) {
      console.error("Link decryption download error:", e);
      setDownloadState("error");
      setErrorMsg("DECENTRALIZED NODE HANDSHAKE TIMED OUT OR CIPHER DECRYPTION FAILED.");
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "40px auto 0 auto" }}>
      <div className="hud-panel" style={{ padding: "30px", textAlign: "center" }}>
        <div className="hud-corner-tag">zk share portal // anonymous decrypt</div>

        {downloadState === "ready" && shareData && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Header */}
            <div>
              <Shield size={48} className="led-text animate-pulse-cyan" style={{ margin: "0 auto 16px auto" }} />
              <h2 className="led-text" style={{ fontSize: "20px" }}>SECURE ZERO-KNOWLEDGE DECRYPTION</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "4px" }}>
                A peer has shared an encrypted file stored on the decentralized network.
              </p>
            </div>

            {/* File Info */}
            <div style={{ background: "rgba(0,0,0,0.25)", padding: "16px", borderRadius: "6px", textAlign: "left", fontSize: "13px", fontFamily: "var(--font-mono)", borderLeft: "3px solid var(--neon-cyan)" }}>
              <div style={{ marginBottom: "8px" }}>
                <span style={{ color: "var(--text-muted)" }}>TARGET FILE:</span>{" "}
                <span className="led-text">{shareData.name}</span>
              </div>
              <div style={{ marginBottom: "8px" }}>
                <span style={{ color: "var(--text-muted)" }}>IPFS ADDRESS:</span>{" "}
                <span style={{ color: "var(--text-secondary)", wordBreak: "break-all" }}>{shareData.cid}</span>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>CIPHER:</span>{" "}
                <span className="led-text pink">AES-GCM-256</span>
              </div>
            </div>

            <p style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.5" }}>
              Decryption is completed purely inside your browser client. The decryption key is contained in the URL hash fragment and has not been transmitted over the internet.
            </p>

            {/* Buttons */}
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={triggerDecryptDownload} className="btn-neon" style={{ flex: 1, justifyContent: "center", padding: "12px" }}>
                <Download size={16} /> DECRYPT & DOWNLOAD
              </button>
              <button onClick={onGoHome} className="btn-neon purple" style={{ padding: "12px" }}>
                GOTO PORTAL
              </button>
            </div>
          </div>
        )}

        {downloadState === "downloading" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "20px 0" }}>
            <Disc className="animate-spin-slow led-text" size={48} style={{ margin: "0 auto" }} />
            <h3 className="led-text">FETCHING DECENTRALIZED ASSETS...</h3>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-secondary)" }}>
              {progressMsg}
            </p>
            <div style={{ height: "2px", background: "rgba(255,255,255,0.05)", position: "relative", overflow: "hidden" }}>
              <div style={{ height: "100%", width: "60%", background: "var(--neon-cyan)", animation: "scan-highlight 1.5s infinite" }} />
            </div>
          </div>
        )}

        {downloadState === "success" && shareData && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <CheckCircle size={48} className="led-text green" style={{ margin: "0 auto" }} />
            <div>
              <h3 className="led-text green" style={{ fontSize: "20px" }}>DECRYPTION SUCCESSFUL</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "4px" }}>
                The decrypted file stream has been successfully assembled and downloaded.
              </p>
            </div>

            <div style={{ background: "rgba(0,0,0,0.25)", padding: "16px", borderRadius: "6px", textAlign: "left", fontSize: "13px", fontFamily: "var(--font-mono)" }}>
              <div>
                <span style={{ color: "var(--text-muted)" }}>FILE NAME:</span>{" "}
                <span className="led-text">{shareData.name}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={onGoHome} className="btn-neon" style={{ flex: 1, justifyContent: "center" }}>
                ENTER ANON DAPP PORTAL
              </button>
            </div>
          </div>
        )}

        {downloadState === "error" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <AlertTriangle size={48} className="led-text pink" style={{ margin: "0 auto" }} />
            <div>
              <h3 className="led-text pink" style={{ fontSize: "20px" }}>TRANSACTION TERMINATED</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "4px" }}>
                The cryptographic request could not be processed.
              </p>
            </div>

            <div 
              style={{ 
                background: "rgba(255, 0, 128, 0.05)", 
                border: "1px dashed var(--neon-pink)", 
                padding: "16px", 
                borderRadius: "6px", 
                fontFamily: "var(--font-mono)", 
                fontSize: "12px", 
                color: "var(--text-primary)",
                textAlign: "left"
              }}
            >
              ERROR: {errorMsg}
            </div>

            <button onClick={onGoHome} className="btn-neon pink" style={{ width: "100%", justifyContent: "center" }}>
              RETURN TO CORE INTERFACE
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
