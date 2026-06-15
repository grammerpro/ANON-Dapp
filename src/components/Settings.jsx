import React, { useState } from "react";
import { Key, ShieldAlert, Cpu, Eye, EyeOff, Save, Trash, HelpCircle } from "lucide-react";

export default function Settings({ pinataJwt, setPinataJwt, onClearDb }) {
  const [jwtInput, setJwtInput] = useState(pinataJwt || "");
  const [showJwt, setShowJwt] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const handleSave = () => {
    setPinataJwt(jwtInput);
    localStorage.setItem("anon_pinata_jwt", jwtInput);
    setStatusMsg("CREDENTIALS INITIALIZED");
    setTimeout(() => setStatusMsg(""), 3000);
  };

  const handleClearJwt = () => {
    setJwtInput("");
    setPinataJwt("");
    localStorage.removeItem("anon_pinata_jwt");
    setStatusMsg("CREDENTIALS REMOVED");
    setTimeout(() => setStatusMsg(""), 3000);
  };

  const handleClearDatabase = () => {
    if (window.confirm("WARNING: Are you sure you want to wipe local IndexedDB node? All locally encrypted files, chat history, and simulated blockchain blocks will be permanently deleted.")) {
      onClearDb();
      setStatusMsg("LOCAL LEDGER PURGED");
      setTimeout(() => setStatusMsg(""), 3000);
    }
  };

  return (
    <div className="hud-panel" style={{ padding: "24px", minHeight: "450px" }}>
      <div className="hud-corner-tag">settings // config</div>
      
      <h2 className="led-text" style={{ fontSize: "20px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
        <Cpu size={22} /> SYSTEM GATEWAY CONFIGURATION
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Section: Web3 Pinata API */}
        <div style={{ background: "rgba(0,0,0,0.2)", padding: "16px", borderRadius: "6px", borderLeft: "3px solid var(--neon-cyan)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <Key size={18} className="led-text" />
            <h3 style={{ fontSize: "16px", letterSpacing: "0.5px" }}>Decentralized IPFS Storage Provider</h3>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px", lineHeight: "1.6", marginBottom: "15px" }}>
            By default, all files are stored encrypted in your browser's local sandbox (IndexedDB) acting as an isolated peer node. 
            To upload files to the global public IPFS network, enter your <strong>Pinata API JWT</strong>.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <label style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
              PINATA JWT TOKEN
            </label>
            <div style={{ position: "relative", display: "flex", gap: "10px" }}>
              <input
                type={showJwt ? "text" : "password"}
                className="input-neon"
                placeholder="eyJh..."
                value={jwtInput}
                onChange={(e) => setJwtInput(e.target.value)}
                style={{ paddingRight: "40px" }}
              />
              <button
                type="button"
                onClick={() => setShowJwt(!showJwt)}
                style={{
                  position: "absolute",
                  right: "105px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer"
                }}
              >
                {showJwt ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              
              <button onClick={handleSave} className="btn-neon" style={{ minWidth: "90px" }}>
                <Save size={16} /> SAVE
              </button>
            </div>
            {jwtInput && (
              <button 
                onClick={handleClearJwt} 
                className="btn-neon pink" 
                style={{ width: "max-content", padding: "6px 12px", fontSize: "11px", marginTop: "5px" }}
              >
                DISCONNECT PINATA
              </button>
            )}
          </div>
        </div>

        {/* Section: Local storage purge */}
        <div style={{ background: "rgba(0,0,0,0.2)", padding: "16px", borderRadius: "6px", borderLeft: "3px solid var(--neon-pink)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <ShieldAlert size={18} className="led-text pink" />
            <h3 style={{ fontSize: "16px", letterSpacing: "0.5px" }}>Danger Zone</h3>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px", lineHeight: "1.6", marginBottom: "15px" }}>
            Purging the local sandbox deletes all records in the simulated blockchain, local files, and chat messages. This cannot be undone.
          </p>
          <button onClick={handleClearDatabase} className="btn-neon pink">
            <Trash size={16} /> PURGE LOCAL DATABASE
          </button>
        </div>

        {/* Help Banner */}
        <div style={{ color: "var(--text-muted)", fontSize: "12px", display: "flex", gap: "8px" }}>
          <HelpCircle size={16} style={{ flexShrink: 0 }} />
          <span>
            ANON-Dapp operates entirely client-side. Your private encryption keys and file payloads are processed in-memory and are never uploaded to any centralized system.
          </span>
        </div>

        {statusMsg && (
          <div 
            className="led-text" 
            style={{ 
              fontFamily: "var(--font-mono)", 
              fontSize: "14px", 
              background: "rgba(0, 243, 255, 0.1)", 
              padding: "10px", 
              border: "1px dashed var(--neon-cyan)",
              textAlign: "center",
              marginTop: "10px"
            }}
          >
            {statusMsg}
          </div>
        )}
      </div>
    </div>
  );
}
