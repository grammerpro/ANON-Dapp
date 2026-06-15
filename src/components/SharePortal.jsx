import React, { useState, useEffect } from "react";
import { ShieldAlert, Download, RefreshCw, CheckCircle2, FileUp } from "lucide-react";
import confetti from "canvas-confetti";
import { fetchFromIpfs } from "../utils/ipfsHelper.js";
import { importKey, decryptData, base64UrlToIv } from "../utils/cryptoHelper.js";

export default function SharePortal({ pinataJwt, onGoHome }) {
  const [shareData, setShareData] = useState(null);
  const [downloadState, setDownloadState] = useState("ready"); // ready | downloading | success | error
  const [progressMsg, setProgressMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const parseUrl = () => {
      const hashStr = window.location.hash;
      
      const match = hashStr.match(/#\/share\/([a-zA-Z0-9]+)/);
      if (!match) {
        setDownloadState("error");
        setErrorMsg("Failed to resolve secure route parameters. Invalid or incomplete CID.");
        return;
      }
      const cid = match[1];

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
        setErrorMsg("Symmetric decryption credentials not found in URL hash parameters. Decryption aborted.");
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
    setProgressMsg("Resolving decentralized storage node paths...");
    await new Promise((r) => setTimeout(r, 800));

    try {
      setProgressMsg("Pulling encrypted payload segments...");
      const result = await fetchFromIpfs(shareData.cid, pinataJwt);
      await new Promise((r) => setTimeout(r, 800));

      setProgressMsg("Sensing encryption cipher vectors...");
      const key = await importKey(shareData.key);
      const ivBuf = base64UrlToIv(shareData.iv);
      await new Promise((r) => setTimeout(r, 600));

      setProgressMsg("Executing client-side AES-GCM-256 decryption...");
      const decrypted = await decryptData(result.ciphertext, key, ivBuf);
      await new Promise((r) => setTimeout(r, 600));

      setProgressMsg("Releasing asset stream buffer to system...");
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

      // Confetti celebration
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 },
        colors: ["#6366F1", "#60A5FA", "#10B981"]
      });

    } catch (e) {
      console.error("Zero-knowledge link resolve failure:", e);
      setDownloadState("error");
      setErrorMsg("Decentralized handshake timed out or AES-GCM tag verification failed. Verify details.");
    }
  };

  return (
    <div style={{ maxWidth: "560px", margin: "40px auto 0 auto" }}>
      <div className="hud-panel" style={{ padding: "36px", textAlign: "center" }}>
        
        {downloadState === "ready" && shareData && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>
                Zero-Knowledge Decryption Gateway
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "13.5px", marginTop: "6px" }}>
                A secure file segment has been shared with you via the decentralized network.
              </p>
            </div>

            {/* Details Card */}
            <div style={{ 
              background: "rgba(255,255,255,0.01)", 
              padding: "20px", 
              borderRadius: "10px", 
              textAlign: "left", 
              fontSize: "13px", 
              border: "1px solid var(--border-color)",
              display: "flex",
              flexDirection: "column",
              gap: "10px"
            }}>
              <div>
                <span style={{ color: "var(--text-secondary)", fontWeight: "500", marginRight: "8px" }}>File Name:</span>
                <span style={{ color: "white", fontWeight: "600" }}>{shareData.name}</span>
              </div>
              <div>
                <span style={{ color: "var(--text-secondary)", fontWeight: "500", marginRight: "8px" }}>IPFS CID:</span>
                <span className="hash-pill">{shareData.cid}</span>
              </div>
              <div>
                <span style={{ color: "var(--text-secondary)", fontWeight: "500", marginRight: "8px" }}>Security Suite:</span>
                <span style={{ color: "var(--accent-indigo)", fontWeight: "600" }}>AES-GCM-256</span>
              </div>
            </div>

            <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.6" }}>
              The decryption process executes dynamically inside your local browser tab. The decryption key remains securely contained within the URL hash segment and is never shared with external services.
            </p>

            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={triggerDecryptDownload} className="btn-neon" style={{ flex: 1, justifyContent: "center" }}>
                Decrypt & Download File
              </button>
              <button onClick={onGoHome} className="btn-neon purple">
                Enter Network Portal
              </button>
            </div>
          </div>
        )}

        {downloadState === "downloading" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "20px 0" }}>
            <RefreshCw className="led-text" size={32} style={{ margin: "0 auto", animation: "spin-slow 2s linear infinite" }} />
            <h3 style={{ fontSize: "15px", fontWeight: "600" }}>Retrieving Secure Stream...</h3>
            <p style={{ fontSize: "12.5px", color: "var(--text-secondary)" }}>
              {progressMsg}
            </p>
            <div style={{ height: "2px", background: "rgba(255,255,255,0.04)", position: "relative", overflow: "hidden", borderRadius: "99px" }}>
              <div style={{ height: "100%", width: "60%", background: "var(--accent-indigo)", animation: "scan-highlight 1.5s infinite" }} />
            </div>
          </div>
        )}

        {downloadState === "success" && shareData && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <CheckCircle2 size={40} style={{ color: "var(--accent-emerald)", margin: "0 auto" }} />
            <div>
              <h3 style={{ fontSize: "18px", fontWeight: "700", color: "white" }}>Decryption Successful</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "13.5px", marginTop: "4px" }}>
                The cryptographic stream has been decrypted and saved to your device.
              </p>
            </div>

            <div style={{ 
              background: "rgba(255,255,255,0.01)", 
              padding: "16px", 
              borderRadius: "8px", 
              textAlign: "left", 
              fontSize: "13px",
              border: "1px solid var(--border-color)"
            }}>
              <span style={{ color: "var(--text-secondary)", marginRight: "10px" }}>File Downloaded:</span>
              <strong style={{ color: "white" }}>{shareData.name}</strong>
            </div>

            <button onClick={onGoHome} className="btn-neon" style={{ width: "100%", justifyContent: "center" }}>
              Return to Storage Portal
            </button>
          </div>
        )}

        {downloadState === "error" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <ShieldAlert size={40} style={{ color: "var(--accent-rose)", margin: "0 auto" }} />
            <div>
              <h3 style={{ fontSize: "18px", fontWeight: "700", color: "white" }}>Decryption Aborted</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "13.5px", marginTop: "4px" }}>
                The storage gateway encountered a verification error.
              </p>
            </div>

            <div 
              style={{ 
                background: "rgba(244, 63, 94, 0.04)", 
                border: "1px dashed var(--accent-rose)", 
                padding: "16px", 
                borderRadius: "8px", 
                fontSize: "12.5px", 
                color: "var(--text-primary)",
                textAlign: "left",
                lineHeight: "1.5"
              }}
            >
              <strong>Error Details:</strong> {errorMsg}
            </div>

            <button onClick={onGoHome} className="btn-neon pink" style={{ width: "100%", justifyContent: "center" }}>
              Return to Safe Portal
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
