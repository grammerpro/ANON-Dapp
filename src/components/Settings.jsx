import React, { useState } from "react";
import { Key, ShieldAlert, Cpu, Eye, EyeOff, Save, Trash, HelpCircle } from "lucide-react";

export default function Settings({ pinataJwt, setPinataJwt, onClearDb }) {
  const [jwtInput, setJwtInput] = useState(pinataJwt || "");
  const [showJwt, setShowJwt] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const handleSave = () => {
    setPinataJwt(jwtInput);
    localStorage.setItem("anon_pinata_jwt", jwtInput);
    setStatusMsg("PROVIDER GATEWAY CREDENTIALS CONFIGURATION SAVED.");
    setTimeout(() => setStatusMsg(""), 3000);
  };

  const handleClearJwt = () => {
    setJwtInput("");
    setPinataJwt("");
    localStorage.removeItem("anon_pinata_jwt");
    setStatusMsg("PROVIDER GATEWAY CREDENTIALS REMOVED.");
    setTimeout(() => setStatusMsg(""), 3000);
  };

  const handleClearDatabase = () => {
    if (window.confirm("WARNING: Are you sure you want to purge local IndexedDB nodes? All locally encrypted files, chat history, and blockchain blocks will be permanently deleted.")) {
      onClearDb();
      setStatusMsg("LOCAL GATEWAY NODE PURGED.");
      setTimeout(() => setStatusMsg(""), 3000);
    }
  };

  return (
    <div className="hud-panel" style={{ padding: "32px", maxWidth: "680px", margin: "0 auto" }}>
      <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "24px", display: "flex", alignItems: "center", gap: "10px" }}>
        <Cpu size={18} style={{ color: "var(--accent-indigo)" }} /> Gateway Settings
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
        {/* IPFS Provider Card */}
        <div style={{ 
          background: "rgba(255,255,255,0.01)", 
          padding: "20px", 
          borderRadius: "10px", 
          border: "1px solid var(--border-color)",
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Key size={16} style={{ color: "var(--accent-indigo)" }} />
            <h3 style={{ fontSize: "14px", fontWeight: "600" }}>IPFS Storage Gateway</h3>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px", lineHeight: "1.6" }}>
            By default, encrypted shards are written to your local sandbox acting as a private peer node.
            Add your <strong>Pinata IPFS JWT token</strong> to bridge files onto the public IPFS gateway networks.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <label style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
              API GATEWAY JWT CREDENTIAL
            </label>
            <div style={{ position: "relative", display: "flex", gap: "10px" }}>
              <input
                type={showJwt ? "text" : "password"}
                className="input-neon"
                placeholder="eyJhbGciOi..."
                value={jwtInput}
                onChange={(e) => setJwtInput(e.target.value)}
                style={{ paddingRight: "40px" }}
              />
              <button
                type="button"
                onClick={() => setShowJwt(!showJwt)}
                style={{
                  position: "absolute",
                  right: "110px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer"
                }}
              >
                {showJwt ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              
              <button onClick={handleSave} className="btn-neon" style={{ minWidth: "90px" }}>
                Save
              </button>
            </div>
            {jwtInput && (
              <button 
                onClick={handleClearJwt} 
                className="btn-neon pink" 
                style={{ width: "max-content", padding: "6px 12px", fontSize: "11px", marginTop: "5px" }}
              >
                Disconnect Provider
              </button>
            )}
          </div>
        </div>

        {/* Danger zone */}
        <div style={{ 
          background: "rgba(244, 63, 94, 0.01)", 
          padding: "20px", 
          borderRadius: "10px", 
          border: "1px solid rgba(244, 63, 94, 0.15)",
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldAlert size={16} style={{ color: "var(--accent-rose)" }} />
            <h3 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>Danger Zone</h3>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px", lineHeight: "1.6" }}>
            Purging your local cache deletes all stored encrypted payloads, transaction indexes, and blockchain blocks.
          </p>
          <button onClick={handleClearDatabase} className="btn-neon pink" style={{ width: "max-content" }}>
            Purge Local Gateway Node
          </button>
        </div>

        {/* Info label */}
        <div style={{ color: "var(--text-secondary)", fontSize: "12.5px", display: "flex", gap: "8px", lineHeight: "1.5" }}>
          <HelpCircle size={15} style={{ flexShrink: 0, color: "var(--accent-indigo)", marginTop: "2px" }} />
          <span>
            ANON cloud protocols operate client-side. Cryptographic key derivation and file encryption buffers are processed strictly in-memory and are never uploaded in unencrypted form.
          </span>
        </div>

        {statusMsg && (
          <div 
            style={{ 
              fontFamily: "var(--font-mono)", 
              fontSize: "12px", 
              background: "rgba(99, 102, 241, 0.05)", 
              padding: "12px", 
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              textAlign: "center",
              color: "var(--accent-indigo)"
            }}
          >
            {statusMsg}
          </div>
        )}
      </div>
    </div>
  );
}
