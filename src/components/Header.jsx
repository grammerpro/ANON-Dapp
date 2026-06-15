import React from "react";
import { Shield, Wifi, Cpu, Layers } from "lucide-react";

export default function Header({ activeTab, onTabChange, wallet, onConnectWallet, blockchainLength }) {
  const formatAddress = (addr) => {
    if (!addr) return "";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <header 
      className="hud-panel" 
      style={{ 
        padding: "12px 24px", 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        flexWrap: "wrap",
        gap: "15px",
        marginBottom: "25px",
        background: "rgba(6, 11, 28, 0.95)",
        zIndex: 10
      }}
    >
      <div className="hud-corner-tag">node connection active</div>

      {/* Brand Logo */}
      <div 
        onClick={() => onTabChange("dashboard")}
        style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
      >
        <Shield size={24} className="led-text animate-pulse-cyan" />
        <span className="led-text animate-glitch" style={{ fontSize: "18px", fontWeight: "800", letterSpacing: "2px", fontFamily: "var(--font-mono)" }}>
          ANON_DAPP //
        </span>
      </div>

      {/* Center Navigation Tabs */}
      <nav style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {[
          { id: "dashboard", label: "DASHBOARD" },
          { id: "upload", label: "UPLOAD PORTAL" },
          { id: "vault", label: "FILE VAULT" },
          { id: "chat", label: "ANON CHAT" },
          { id: "settings", label: "GATEWAY CFG" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              background: activeTab === tab.id ? "rgba(0, 243, 255, 0.12)" : "transparent",
              color: activeTab === tab.id ? "var(--neon-cyan)" : "var(--text-secondary)",
              border: "none",
              borderBottom: activeTab === tab.id ? "2px solid var(--neon-cyan)" : "2px solid transparent",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              fontWeight: "600",
              letterSpacing: "0.5px",
              padding: "8px 16px",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
            onMouseOver={(e) => {
              if (activeTab !== tab.id) e.currentTarget.style.color = "var(--neon-cyan)";
            }}
            onMouseOut={(e) => {
              if (activeTab !== tab.id) e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Web3 status details */}
      <div style={{ display: "flex", alignItems: "center", gap: "15px", flexWrap: "wrap" }}>
        
        {/* Ledger Sync Status */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
          <Layers size={13} className="led-text purple" />
          <span>LEDGER: <span className="led-text purple">#{blockchainLength - 1}</span></span>
        </div>

        {/* Node Active Status */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
          <Wifi size={13} className="led-text green" />
          <span>NET: <span className="led-text green">ONLINE</span></span>
        </div>

        {/* Connect Button */}
        {wallet.connected ? (
          <div 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "8px", 
              background: "rgba(0, 243, 255, 0.08)", 
              border: "1px solid rgba(0, 243, 255, 0.3)", 
              borderRadius: "4px",
              padding: "6px 12px",
              fontFamily: "var(--font-mono)",
              fontSize: "12px"
            }}
          >
            <Cpu size={14} className="led-text" />
            <span className="led-text">{formatAddress(wallet.address)}</span>
            <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>({wallet.balance} ETH)</span>
          </div>
        ) : (
          <button onClick={onConnectWallet} className="btn-neon" style={{ padding: "6px 14px", fontSize: "11px" }}>
            CONNECT WALLET
          </button>
        )}
      </div>
    </header>
  );
}
